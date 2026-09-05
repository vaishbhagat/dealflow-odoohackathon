const { query, withTransaction } = require('../config/db');
const { calculateQuotationFinancials } = require('../services/discountRiskService');
const { submitForApproval } = require('../services/approvalService');
const { evaluateDealHealth } = require('../services/dealHealthService');
const { logAudit, getAuditLogsByQuotation } = require('../services/auditService');

/**
 * List quotations with role-based filtering
 */
async function getQuotations(req, res) {
  try {
    const { status, customerId, search } = req.query;

    let sql = `
      SELECT q.*, c.company_name as customer_name, c.customer_tier,
             u.name as salesperson_name,
             (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) as item_count,
             dh.health_score, dh.status as health_status
      FROM quotations q
      JOIN customers c ON q.customer_id = c.id
      JOIN users u ON q.salesperson_id = u.id
      LEFT JOIN deal_health dh ON q.id = dh.quotation_id
      WHERE 1=1
    `;
    const params = [];

    // Role-based isolation
    if (req.user.role === 'CUSTOMER') {
      sql += ' AND q.customer_id = ?';
      params.push(req.user.customer_id);
    } else if (req.user.role === 'SALES_REP') {
      sql += ' AND q.salesperson_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      sql += ' AND q.status = ?';
      params.push(status);
    }
    if (customerId) {
      sql += ' AND q.customer_id = ?';
      params.push(customerId);
    }
    if (search) {
      sql += ' AND (q.quotation_number LIKE ? OR c.company_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY q.created_at DESC';

    const quotations = await query(sql, params);
    res.json({ success: true, quotations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get full quotation detail by ID
 */
async function getQuotationById(req, res) {
  try {
    const { id } = req.params;

    const quotes = await query(
      `SELECT q.*, c.company_name as customer_name, c.contact_person, c.email as customer_email,
              c.phone as customer_phone, c.billing_address, c.shipping_address, c.customer_tier,
              c.credit_limit, u.name as salesperson_name, u.email as salesperson_email
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       JOIN users u ON q.salesperson_id = u.id
       WHERE q.id = ?`,
      [id]
    );

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Quotation not found.' });
    }
    const quotation = quotes[0];

    // Customer isolation check
    if (req.user.role === 'CUSTOMER' && parseInt(quotation.customer_id, 10) !== parseInt(req.user.customer_id, 10)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Access denied to other customer quotations.' });
    }

    // Line items
    const items = await query(
      `SELECT qi.*, p.name as product_name, p.sku, p.image_url, p.product_type,
              c.name as category_name, c.discount_ceiling_pct as category_ceiling_pct,
              pv.variant_name
       FROM quotation_items qi
       JOIN products p ON qi.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_variants pv ON qi.variant_id = pv.id
       WHERE qi.quotation_id = ?
       ORDER BY qi.id ASC`,
      [id]
    );
    quotation.items = items.map(item => {
      const tax = parseFloat(item.tax_amount || 0);
      const taxPct = parseFloat(item.tax_pct || 18);
      return {
        ...item,
        cgst_pct: (taxPct / 2).toFixed(1),
        sgst_pct: (taxPct / 2).toFixed(1),
        cgst_amount: (tax / 2).toFixed(2),
        sgst_amount: (tax / 2).toFixed(2),
      };
    });

    const totalTax = parseFloat(quotation.tax_amount || 0);
    quotation.cgst_total = (totalTax / 2).toFixed(2);
    quotation.sgst_total = (totalTax / 2).toFixed(2);

    // Approval history
    const approvalHistory = await query(
      `SELECT ah.*, u.name as action_by_name, u.role as action_by_role
       FROM approval_history ah
       JOIN users u ON ah.action_by = u.id
       WHERE ah.quotation_id = ?
       ORDER BY ah.created_at ASC`,
      [id]
    );
    quotation.approvalHistory = approvalHistory;

    // Audit logs
    quotation.auditLogs = await getAuditLogsByQuotation(id);

    // Deal Health evaluation
    try {
      quotation.dealHealth = await evaluateDealHealth(id);
    } catch (e) {
      quotation.dealHealth = null;
    }

    // Associated Invoice if exists
    const invoices = await query(`SELECT * FROM invoices WHERE quotation_id = ?`, [id]);
    quotation.invoice = invoices.length > 0 ? invoices[0] : null;

    // Associated Fulfillment order if exists
    const fulfillments = await query(`SELECT * FROM fulfillment_orders WHERE quotation_id = ?`, [id]);
    quotation.fulfillmentOrder = fulfillments.length > 0 ? fulfillments[0] : null;

    res.json({ success: true, quotation });
  } catch (error) {
    console.error('getQuotationById error:', error);
    res.status(500).json({ success: false, error: "Couldn't fetch quotation. Please try again." });
  }
}

/**
 * Create a new quotation draft
 */
async function createQuotation(req, res) {
  try {
    const { customerId, notes, validDays = 14 } = req.body;
    let salespersonId = req.user.role === 'SALES_REP' ? req.user.id : (req.body.salespersonId || req.user.id);

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'Customer ID is required.' });
    }

    if (req.user.role === 'CUSTOMER') {
      const custs = await query(`SELECT assigned_salesperson_id FROM customers WHERE id = ?`, [customerId]);
      salespersonId = custs[0]?.assigned_salesperson_id || 4;
    }

    const quotationNumber = `Q-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + parseInt(validDays, 10));
    const validUntil = validUntilDate.toISOString().slice(0, 10);

    const result = await query(
      `INSERT INTO quotations 
       (quotation_number, customer_id, salesperson_id, status, approval_status, notes, valid_until, created_at, last_activity_at)
       VALUES (?, ?, ?, 'DRAFT', 'NOT_REQUIRED', ?, ?, NOW(), NOW())`,
      [quotationNumber, parseInt(customerId, 10), salespersonId, notes || 'Enterprise Quote Draft', validUntil]
    );

    const quotationId = result.insertId;

    await logAudit({
      quotationId,
      userId: req.user.id,
      userRole: req.user.role,
      action: 'QUOTE_CREATED',
      newValue: `Draft Quote ${quotationNumber}`,
      reason: 'Quotation draft initiated',
    });

    res.status(201).json({
      success: true,
      quotationId,
      quotationNumber,
      message: 'Quotation draft created successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Couldn't create the quotation. Please check the selected products and try again." });
  }
}

/**
 * Add product line item to quotation
 */
async function addQuotationItem(req, res) {
  try {
    const { id } = req.params;
    const { productId, variantId, quantity = 1, discountPct = 0, billingInterval = 'ONE_TIME' } = req.body;

    const products = await query(`SELECT * FROM products WHERE id = ?`, [productId]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    const product = products[0];

    // Variant price delta
    let unitPrice = parseFloat(product.selling_price);
    if (variantId) {
      const variants = await query(`SELECT price_delta FROM product_variants WHERE id = ?`, [variantId]);
      if (variants.length > 0) {
        unitPrice += parseFloat(variants[0].price_delta || 0);
      }
    }

    const costPrice = parseFloat(product.cost_price);
    const taxPct = parseFloat(product.tax_percentage || 18.0);
    const itemType = product.product_type;

    await query(
      `INSERT INTO quotation_items 
       (quotation_id, product_id, variant_id, item_type, quantity, unit_price, cost_price, discount_pct, tax_pct, billing_interval)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        productId,
        variantId || null,
        itemType,
        quantity,
        unitPrice,
        costPrice,
        discountPct,
        taxPct,
        billingInterval,
      ]
    );

    // Recalculate quotation master financials
    const financials = await calculateQuotationFinancials(id);

    await logAudit({
      quotationId: id,
      userId: req.user.id,
      userRole: req.user.role,
      action: 'ITEM_ADDED',
      newValue: `${quantity}x ${product.name}`,
      reason: 'Product added to quotation',
    });

    res.json({
      success: true,
      financials,
      message: `${product.name} added to quotation. Financials updated.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update quotation line item (quantity, discount_pct, interval)
 */
async function updateQuotationItem(req, res) {
  try {
    const { id, itemId } = req.params;
    const { quantity, discountPct, billingInterval } = req.body;

    const items = await query(`SELECT * FROM quotation_items WHERE id = ? AND quotation_id = ?`, [itemId, id]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, error: 'Quotation item not found.' });
    }
    const currentItem = items[0];

    const newQty = quantity !== undefined ? parseInt(quantity, 10) : currentItem.quantity;
    const newDiscount = discountPct !== undefined ? parseFloat(discountPct) : currentItem.discount_pct;
    const newInterval = billingInterval !== undefined ? billingInterval : currentItem.billing_interval;

    await query(
      `UPDATE quotation_items 
       SET quantity = ?, discount_pct = ?, billing_interval = ?
       WHERE id = ?`,
      [newQty, newDiscount, newInterval, itemId]
    );

    // Recalculate
    const financials = await calculateQuotationFinancials(id);

    await logAudit({
      quotationId: id,
      userId: req.user.id,
      userRole: req.user.role,
      action: 'DISCOUNT_CHANGED',
      oldValue: `${currentItem.quantity}x, Discount: ${currentItem.discount_pct}%`,
      newValue: `${newQty}x, Discount: ${newDiscount}%`,
      reason: 'Sales rep modified quantity/discount',
    });

    res.json({
      success: true,
      financials,
      message: 'Item updated and quotation financials recalculated.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Delete quotation line item
 */
async function deleteQuotationItem(req, res) {
  try {
    const { id, itemId } = req.params;

    await query(`DELETE FROM quotation_items WHERE id = ? AND quotation_id = ?`, [itemId, id]);

    // Recalculate
    const financials = await calculateQuotationFinancials(id);

    await logAudit({
      quotationId: id,
      userId: req.user.id,
      userRole: req.user.role,
      action: 'ITEM_REMOVED',
      reason: `Removed line item ${itemId}`,
    });

    res.json({
      success: true,
      financials,
      message: 'Item removed from quotation.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Submit quotation for governance approval
 */
async function submitQuotation(req, res) {
  try {
    const { id } = req.params;
    const result = await submitForApproval(id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Send quotation to customer
 */
async function sendQuotation(req, res) {
  try {
    const { id } = req.params;
    const quotes = await query(`SELECT * FROM quotations WHERE id = ?`, [id]);
    if (!quotes || quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Quotation not found' });
    }
    const quote = quotes[0];

    // Check if approval is still pending
    if (quote.approval_status === 'PENDING_MANAGER' || quote.approval_status === 'PENDING_FINANCE') {
      return res.status(400).json({
        success: false,
        error: 'Cannot send quotation while managerial or finance approval is pending.',
      });
    }

    await query(
      `UPDATE quotations SET status = 'SENT', last_activity_at = NOW() WHERE id = ?`,
      [id]
    );

    // Notify Customer user if exists
    const custUsers = await query(`SELECT id FROM users WHERE customer_id = ? AND active = TRUE`, [quote.customer_id]);
    if (custUsers && custUsers.length > 0) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
        [
          custUsers[0].id,
          `Quotation ${quote.quotation_number} Ready for Review`,
          `Gada Electronics has sent quotation ${quote.quotation_number} for your review and approval.`,
          `/customer/quotations/${id}`,
        ]
      );
    }

    await logAudit({
      quotationId: id,
      userId: req.user.id,
      userRole: req.user.role,
      action: 'SENT_TO_CUSTOMER',
      oldValue: quote.status,
      newValue: 'SENT',
      reason: 'Quotation sent to customer portal for review',
    });

    res.json({ success: true, status: 'SENT', message: 'Quotation sent to customer portal successfully.' });
  } catch (error) {
    console.error('sendQuotation error:', error);
    res.status(500).json({ success: false, error: "Failed to send quotation to customer. Please try again." });
  }
}

/**
 * Fetch Smart Upsell and Cross-Sell recommendations for quotation
 */
async function getRecommendations(req, res) {
  try {
    const { id } = req.params;

    // Get product IDs already in quotation
    const quoteItems = await query(`SELECT product_id FROM quotation_items WHERE quotation_id = ?`, [id]);
    const existingProductIds = quoteItems.map((i) => i.product_id);

    if (existingProductIds.length === 0) {
      return res.json({ success: true, recommendations: [] });
    }

    // Query upsell_rules triggered by existing products
    const placeholders = existingProductIds.map(() => '?').join(',');
    const sql = `
      SELECT ur.*, p.name as product_name, p.selling_price, p.image_url, p.product_type,
             c.name as category_name,
             trig.name as trigger_product_name
      FROM upsell_rules ur
      JOIN products p ON ur.recommended_product_id = p.id
      JOIN products trig ON ur.trigger_product_id = trig.id
      JOIN categories c ON p.category_id = c.id
      WHERE ur.trigger_product_id IN (${placeholders})
        AND ur.active = TRUE
        AND ur.recommended_product_id NOT IN (${placeholders})
      ORDER BY ur.is_promoted DESC, ur.margin_delta DESC
      LIMIT 8
    `;

    const recommendations = await query(sql, [...existingProductIds, ...existingProductIds]);
    res.json({ success: true, recommendations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Apply order-level discount across all line items of the quotation
 */
async function applyOrderDiscount(req, res) {
  try {
    const { id } = req.params;
    const { discountPct } = req.body;

    if (discountPct === undefined || isNaN(discountPct)) {
      return res.status(400).json({ success: false, error: 'Valid discountPct is required.' });
    }

    const pct = Math.max(0, Math.min(100, parseFloat(discountPct)));

    await query(
      `UPDATE quotation_items SET discount_pct = ? WHERE quotation_id = ?`,
      [pct, id]
    );

    const financials = await calculateQuotationFinancials(id);

    await logAudit({
      quotationId: id,
      userId: req.user.id,
      userRole: req.user.role,
      action: 'ORDER_DISCOUNT_APPLIED',
      newValue: `${pct}% order-level discount`,
      reason: `Applied uniform order discount of ${pct}% across all line items`,
    });

    res.json({
      success: true,
      financials,
      message: `Order-level discount of ${pct}% applied across all items.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  addQuotationItem,
  updateQuotationItem,
  deleteQuotationItem,
  submitQuotation,
  sendQuotation,
  getRecommendations,
  applyOrderDiscount,
};
