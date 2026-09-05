const { query } = require('../config/db');

/**
 * Get customer dashboard summary (Action Required, Payment Summary, Quick Stats)
 */
async function getCustomerDashboard(req, res) {
  try {
    const customerId = req.user.customer_id;
    const userId = req.user.id;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'User is not linked to a customer account.' });
    }

    // 1. Customer Profile info
    const customers = await query(
      `SELECT c.*, u.name as salesperson_name, u.email as salesperson_email
       FROM customers c
       LEFT JOIN users u ON c.assigned_salesperson_id = u.id
       WHERE c.id = ?`,
      [customerId]
    );
    const customer = customers[0] || {};

    // 2. Pending Actions (Action Required)
    const actionRequired = [];

    // Quotations waiting for review/confirmation
    const pendingQuotes = await query(
      `SELECT id, quotation_number, total_amount, status, approval_status, updated_at
       FROM quotations
       WHERE customer_id = ? AND status IN ('SENT', 'UNDER_NEGOTIATION', 'APPROVED', 'RETURNED_FOR_REVISION')
       ORDER BY updated_at DESC`,
      [customerId]
    );

    for (const q of pendingQuotes) {
      if (q.status === 'SENT' || q.status === 'RETURNED_FOR_REVISION') {
        actionRequired.push({
          id: `quote-${q.id}`,
          type: 'QUOTATION',
          title: `Quotation ${q.quotation_number}`,
          message: 'Revised quotation is waiting for your review & confirmation.',
          actionText: 'Review Quote',
          linkUrl: `/customer/quotations/${q.id}`,
          severity: 'HIGH',
        });
      } else if (q.status === 'APPROVED') {
        actionRequired.push({
          id: `quote-${q.id}`,
          type: 'QUOTATION',
          title: `Quotation ${q.quotation_number}`,
          message: 'Quotation approved! Click to confirm and convert to order.',
          actionText: 'Confirm Quote',
          linkUrl: `/customer/quotations/${q.id}`,
          severity: 'SUCCESS',
        });
      }
    }

    // Unpaid Invoices
    const unpaidInvoices = await query(
      `SELECT id, invoice_number, total_amount, due_amount, due_date
       FROM invoices
       WHERE customer_id = ? AND payment_status IN ('UNPAID', 'PARTIALLY_PAID')
       ORDER BY due_date ASC`,
      [customerId]
    );

    for (const inv of unpaidInvoices) {
      actionRequired.push({
        id: `inv-${inv.id}`,
        type: 'INVOICE',
        title: `Invoice ${inv.invoice_number}`,
        message: `Payment pending ₹${parseFloat(inv.due_amount).toLocaleString('en-IN')}. Due date: ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Immediate'}.`,
        actionText: 'Pay Now',
        linkUrl: `/customer/invoices`,
        severity: 'WARNING',
      });
    }

    // Upcoming Subscription Renewals
    const subscriptions = await query(
      `SELECT s.*, p.plan_name
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.customer_id = ? AND s.status = 'ACTIVE'`,
      [customerId]
    );

    for (const sub of subscriptions) {
      if (sub.next_billing_date) {
        actionRequired.push({
          id: `sub-${sub.id}`,
          type: 'SUBSCRIPTION',
          title: `Subscription: ${sub.plan_name}`,
          message: `Next billing date: ${new Date(sub.next_billing_date).toLocaleDateString()} (₹${parseFloat(sub.recurring_amount).toLocaleString('en-IN')}/${sub.billing_interval.toLowerCase()}).`,
          actionText: 'View Plan',
          linkUrl: `/customer/subscriptions`,
          severity: 'INFO',
        });
      }
    }

    // 3. Payment Summary
    const paymentSummaryRaw = await query(
      `SELECT 
         COALESCE(SUM(total_amount), 0) as total_invoiced,
         COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE (total_amount - due_amount) END), 0) as paid,
         COALESCE(SUM(due_amount), 0) as outstanding
       FROM invoices
       WHERE customer_id = ? AND invoice_status != 'CANCELLED'`,
      [customerId]
    );
    const paymentSummary = paymentSummaryRaw[0] || { total_invoiced: 0, paid: 0, outstanding: 0 };

    // 4. Counts
    const quotesCount = await query(`SELECT COUNT(*) as cnt FROM quotations WHERE customer_id = ?`, [customerId]);
    const ordersCount = await query(`SELECT COUNT(*) as cnt FROM fulfillment_orders WHERE customer_id = ?`, [customerId]);
    const invoicesCount = await query(`SELECT COUNT(*) as cnt FROM invoices WHERE customer_id = ?`, [customerId]);
    const unreadNotifCount = await query(`SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = FALSE`, [userId]);

    res.json({
      success: true,
      customer,
      actionRequired,
      paymentSummary: {
        totalInvoiced: parseFloat(paymentSummary.total_invoiced || 0),
        paid: parseFloat(paymentSummary.paid || 0),
        outstanding: parseFloat(paymentSummary.outstanding || 0),
      },
      stats: {
        totalQuotes: quotesCount[0].cnt,
        activeOrders: ordersCount[0].cnt,
        totalInvoices: invoicesCount[0].cnt,
        unreadNotifications: unreadNotifCount[0].cnt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get products with customer tier pricing, search, filters & obfuscated stock availability
 */
async function getCustomerProducts(req, res) {
  try {
    const { category, search, minPrice, maxPrice, productType, sort } = req.query;
    const customerId = req.user.customer_id;

    // Get customer's tier
    let tier = 'GOLD';
    if (customerId) {
      const cust = await query(`SELECT customer_tier FROM customers WHERE id = ?`, [customerId]);
      if (cust.length > 0) tier = cust[0].customer_tier;
    }

    // Get price list items for this tier
    const priceListItems = await query(
      `SELECT pli.product_id, pli.special_price, pli.discount_pct
       FROM price_list_items pli
       JOIN price_lists pl ON pli.price_list_id = pl.id
       WHERE pl.customer_tier = ? AND pl.active = TRUE`,
      [tier]
    );
    const priceMap = {};
    priceListItems.forEach((item) => {
      priceMap[item.product_id] = item;
    });

    let sql = `
      SELECT p.*, c.name as category_name, c.code as category_code,
             COALESCE(SUM(i.available_quantity), 0) as stock_qty
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.active = TRUE
    `;
    const params = [];

    if (category) {
      sql += ` AND (c.name = ? OR c.code = ?)`;
      params.push(category, category);
    }

    if (search) {
      sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ? OR c.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (productType) {
      sql += ` AND p.product_type = ?`;
      params.push(productType);
    }

    sql += ` GROUP BY p.id`;

    let products = await query(sql, params);

    // Process customer-specific prices & availability
    products = products.map((p) => {
      let customerPrice = parseFloat(p.selling_price);
      let originalPrice = parseFloat(p.selling_price);
      let tierDiscountApplied = 0;

      // Tier price logic
      if (priceMap[p.id]) {
        const itemRule = priceMap[p.id];
        if (itemRule.special_price !== null && itemRule.special_price !== undefined) {
          customerPrice = parseFloat(itemRule.special_price);
        } else if (itemRule.discount_pct > 0) {
          tierDiscountApplied = parseFloat(itemRule.discount_pct);
          customerPrice = originalPrice * (1 - tierDiscountApplied / 100);
        }
      } else {
        // Tier default discount: GOLD = 5%, SILVER = 3%
        if (tier === 'GOLD') {
          tierDiscountApplied = 5;
          customerPrice = originalPrice * 0.95;
        } else if (tier === 'SILVER') {
          tierDiscountApplied = 3;
          customerPrice = originalPrice * 0.97;
        }
      }

      // Customer friendly stock label (Obfuscated internal warehouse numbers)
      let availability = 'In Stock';
      const totalStock = parseInt(p.stock_qty || 0, 10);
      if (totalStock <= 0) {
        availability = 'Available on Backorder';
      } else if (totalStock < 5) {
        availability = 'Low Stock';
      } else {
        availability = 'In Stock';
      }

      return {
        ...p,
        selling_price: customerPrice,
        standard_price: originalPrice,
        customer_price: customerPrice,
        has_tier_discount: customerPrice < originalPrice,
        customer_tier: tier,
        availability,
      };
    });

    // Min / Max price filtering after tier calculation
    if (minPrice) {
      products = products.filter((p) => p.customer_price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      products = products.filter((p) => p.customer_price <= parseFloat(maxPrice));
    }

    // Sort products
    if (sort === 'price_asc') {
      products.sort((a, b) => a.customer_price - b.customer_price);
    } else if (sort === 'price_desc') {
      products.sort((a, b) => b.customer_price - a.customer_price);
    } else if (sort === 'newest') {
      products.sort((a, b) => b.id - a.id);
    }

    res.json({ success: true, count: products.length, products, customerTier: tier });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get product detail by ID with specifications and tier pricing
 */
async function getCustomerProductById(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.user.customer_id;

    const products = await query(
      `SELECT p.*, c.name as category_name, c.code as category_code,
              COALESCE(SUM(i.available_quantity), 0) as stock_qty
       FROM products p
       JOIN categories c ON p.category_id = c.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    let p = products[0];

    // Customer tier check
    let tier = 'GOLD';
    if (customerId) {
      const cust = await query(`SELECT customer_tier FROM customers WHERE id = ?`, [customerId]);
      if (cust.length > 0) tier = cust[0].customer_tier;
    }

    const priceListItems = await query(
      `SELECT pli.special_price, pli.discount_pct
       FROM price_list_items pli
       JOIN price_lists pl ON pli.price_list_id = pl.id
       WHERE pl.customer_tier = ? AND pli.product_id = ? AND pl.active = TRUE`,
      [tier, id]
    );

    let customerPrice = parseFloat(p.selling_price);
    let originalPrice = parseFloat(p.selling_price);

    if (priceListItems.length > 0) {
      const rule = priceListItems[0];
      if (rule.special_price !== null && rule.special_price !== undefined) {
        customerPrice = parseFloat(rule.special_price);
      } else if (rule.discount_pct > 0) {
        customerPrice = originalPrice * (1 - rule.discount_pct / 100);
      }
    } else {
      if (tier === 'GOLD') customerPrice = originalPrice * 0.95;
      else if (tier === 'SILVER') customerPrice = originalPrice * 0.97;
    }

    const totalStock = parseInt(p.stock_qty || 0, 10);
    let availability = totalStock > 5 ? 'In Stock' : totalStock > 0 ? 'Low Stock' : 'Available on Backorder';

    const variants = await query(`SELECT * FROM product_variants WHERE product_id = ?`, [id]);

    res.json({
      success: true,
      product: {
        ...p,
        customer_price: customerPrice,
        selling_price: customerPrice,
        standard_price: originalPrice,
        has_tier_discount: customerPrice < originalPrice,
        availability,
        variants,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Customer Cart persistence
 */
async function getCustomerCart(req, res) {
  try {
    const userId = req.user.id;
    const customerId = req.user.customer_id;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'User is not associated with a customer.' });
    }

    // Ensure cart exists
    let cart = await query(`SELECT * FROM carts WHERE user_id = ?`, [userId]);
    let cartId;
    if (cart.length === 0) {
      const result = await query(`INSERT INTO carts (user_id, customer_id) VALUES (?, ?)`, [userId, customerId]);
      cartId = result.insertId;
    } else {
      cartId = cart[0].id;
    }

    // Get cart items with current product info
    const cartItemsRaw = await query(
      `SELECT ci.*, p.name as product_name, p.sku, p.selling_price, p.tax_percentage, p.image_url,
              p.product_type, c.name as category_name, pv.variant_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.cart_id = ?
       ORDER BY ci.id DESC`,
      [cartId]
    );

    // Get Customer Tier
    const cust = await query(`SELECT customer_tier FROM customers WHERE id = ?`, [customerId]);
    const tier = cust.length > 0 ? cust[0].customer_tier : 'GOLD';

    let subtotal = 0;
    let taxAmount = 0;

    const items = cartItemsRaw.map((ci) => {
      let unitPrice = parseFloat(ci.selling_price);
      if (tier === 'GOLD') unitPrice = unitPrice * 0.95;
      else if (tier === 'SILVER') unitPrice = unitPrice * 0.97;

      const lineSubtotal = unitPrice * ci.quantity;
      const lineTax = lineSubtotal * (parseFloat(ci.tax_percentage || 18) / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        id: ci.id,
        productId: ci.product_id,
        variantId: ci.variant_id,
        name: ci.product_name,
        sku: ci.sku,
        category: ci.category_name,
        variantName: ci.variant_name,
        imageUrl: ci.image_url,
        quantity: ci.quantity,
        unitPrice,
        lineSubtotal,
        lineTax,
        lineTotal,
      };
    });

    const total = subtotal + taxAmount;

    res.json({
      success: true,
      cartId,
      items,
      summary: {
        subtotal,
        taxAmount,
        total,
        itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Add item to customer cart persistence
 */
async function addToCart(req, res) {
  try {
    const userId = req.user.id;
    const customerId = req.user.customer_id;
    const { productId, variantId = null, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId is required.' });
    }

    // Find or create cart
    let cart = await query(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
    let cartId;
    if (cart.length === 0) {
      const result = await query(`INSERT INTO carts (user_id, customer_id) VALUES (?, ?)`, [userId, customerId]);
      cartId = result.insertId;
    } else {
      cartId = cart[0].id;
    }

    // Check if item already exists in cart
    const existing = await query(
      `SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))`,
      [cartId, productId, variantId, variantId]
    );

    if (existing.length > 0) {
      const newQty = existing[0].quantity + parseInt(quantity, 10);
      await query(`UPDATE cart_items SET quantity = ? WHERE id = ?`, [newQty, existing[0].id]);
    } else {
      await query(
        `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)`,
        [cartId, productId, variantId, parseInt(quantity, 10)]
      );
    }

    res.json({ success: true, message: 'Product added to cart successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update Cart Item Quantity
 */
async function updateCartItem(req, res) {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (parseInt(quantity, 10) <= 0) {
      await query(`DELETE FROM cart_items WHERE id = ?`, [itemId]);
      return res.json({ success: true, message: 'Item removed from cart.' });
    }

    await query(`UPDATE cart_items SET quantity = ? WHERE id = ?`, [parseInt(quantity, 10), itemId]);
    res.json({ success: true, message: 'Cart item updated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Delete Cart Item
 */
async function deleteCartItem(req, res) {
  try {
    const { itemId } = req.params;
    await query(`DELETE FROM cart_items WHERE id = ?`, [itemId]);
    res.json({ success: true, message: 'Item removed from cart.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GENERATE QUOTATION FROM CART (Core B2B Workflow)
 */
async function generateQuotationFromCart(req, res) {
  try {
    const userId = req.user.id;
    const customerId = req.user.customer_id;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'User is not linked to a customer account.' });
    }

    // 1. Get Cart
    const carts = await query(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
    if (carts.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty.' });
    }

    const cartId = carts[0].id;
    const cartItems = await query(
      `SELECT ci.*, p.name, p.selling_price, p.cost_price, p.tax_percentage, p.product_type
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty. Please add items before generating a quotation.' });
    }

    // 2. Customer & Sales Rep Details
    const customers = await query(
      `SELECT c.*, u.id as salesperson_id, u.name as salesperson_name
       FROM customers c
       LEFT JOIN users u ON c.assigned_salesperson_id = u.id
       WHERE c.id = ?`,
      [customerId]
    );
    if (customers.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }
    const customer = customers[0];
    const salespersonId = customer.salesperson_id || 4; // Default to Bhagha (ID 4)

    // 3. Calculate Totals
    let subtotal = 0;
    let totalCost = 0;
    let taxAmount = 0;

    const itemsToInsert = cartItems.map((ci) => {
      let unitPrice = parseFloat(ci.selling_price);
      if (customer.customer_tier === 'GOLD') unitPrice = unitPrice * 0.95;
      else if (customer.customer_tier === 'SILVER') unitPrice = unitPrice * 0.97;

      const costPrice = parseFloat(ci.cost_price);
      const lineSubtotal = unitPrice * ci.quantity;
      const lineTax = lineSubtotal * (parseFloat(ci.tax_percentage || 18) / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      totalCost += costPrice * ci.quantity;
      taxAmount += lineTax;

      return {
        product_id: ci.product_id,
        variant_id: ci.variant_id,
        item_type: ci.product_type || 'ONE_TIME',
        quantity: ci.quantity,
        unit_price: unitPrice,
        cost_price: costPrice,
        tax_pct: parseFloat(ci.tax_percentage || 18),
        tax_amount: lineTax,
        line_total: lineTotal,
      };
    });

    const totalAmount = subtotal + taxAmount;
    const marginAmount = subtotal - totalCost;
    const marginPct = subtotal > 0 ? (marginAmount / subtotal) * 100 : 0;
    const quotationNumber = `Q-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Create Quotation in MySQL
    const quoteResult = await query(
      `INSERT INTO quotations 
       (quotation_number, customer_id, salesperson_id, status, approval_status, subtotal, total_discount, tax_amount, total_amount, total_cost, margin_amount, margin_pct, valid_until)
       VALUES (?, ?, ?, 'REQUESTED', 'NOT_REQUIRED', ?, 0.00, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY))`,
      [quotationNumber, customerId, salespersonId, subtotal, taxAmount, totalAmount, totalCost, marginAmount, marginPct]
    );

    const quotationId = quoteResult.insertId;

    // 5. Create Quotation Items
    for (const item of itemsToInsert) {
      await query(
        `INSERT INTO quotation_items 
         (quotation_id, product_id, variant_id, item_type, quantity, unit_price, cost_price, discount_pct, discount_amount, tax_pct, tax_amount, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, 0.00, ?, ?, ?)`,
        [quotationId, item.product_id, item.variant_id, item.item_type, item.quantity, item.unit_price, item.cost_price, item.tax_pct, item.tax_amount, item.line_total]
      );
    }

    // 6. Create Version Snapshot
    await query(
      `INSERT INTO quotation_versions (quotation_id, version_number, total_discount, subtotal, tax_amount, total_amount, status, changed_by, change_summary)
       VALUES (?, 1, 0.00, ?, ?, ?, 'REQUESTED', ?, 'Initial quotation request generated from customer cart.')`,
      [quotationId, subtotal, taxAmount, totalAmount, req.user.name || 'Krish']
    );

    // 7. Create Audit Log
    await query(
      `INSERT INTO audit_logs (quotation_id, user_id, user_role, action, new_value, reason)
       VALUES (?, ?, 'CUSTOMER', 'CUSTOMER_QUOTATION_REQUESTED', ?, 'Generated B2B quotation from cart items')`,
      [quotationId, userId, JSON.stringify({ quotationNumber, totalAmount })]
    );

    // 8. Create Notification for Sales Rep (Bhagha)
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link_url)
       VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
      [
        salespersonId,
        `New Quotation Request ${quotationNumber}`,
        `Customer ${customer.contact_person} (${customer.company_name}) generated a quotation request for ₹${totalAmount.toLocaleString('en-IN')}.`,
        `/sales/quotations/${quotationId}`,
      ]
    );

    // 9. Clear Cart
    await query(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);

    res.status(201).json({
      success: true,
      quotationId,
      quotationNumber,
      message: 'Quotation request submitted successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Customer Quotations list
 */
async function getCustomerQuotations(req, res) {
  try {
    const customerId = req.user.customer_id;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'Customer ID not found for current user.' });
    }

    const quotations = await query(
      `SELECT q.*, u.name as salesperson_name,
              (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) as item_count
       FROM quotations q
       LEFT JOIN users u ON q.salesperson_id = u.id
       WHERE q.customer_id = ?
       ORDER BY q.created_at DESC`,
      [customerId]
    );

    res.json({ success: true, quotations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Detailed Customer Quotation (with items, versions, timeline, comments)
 */
async function getCustomerQuotationById(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.user.customer_id;

    const quotations = await query(
      `SELECT q.*, c.company_name, c.contact_person, c.email as customer_email, c.phone as customer_phone,
              c.billing_address, c.shipping_address, c.customer_tier,
              rep.name as salesperson_name, rep.email as salesperson_email,
              mgr.name as manager_name
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       LEFT JOIN users rep ON q.salesperson_id = rep.id
       LEFT JOIN users mgr ON rep.sales_team_id = mgr.id
       WHERE q.id = ? AND q.customer_id = ?`,
      [id, customerId]
    );

    if (quotations.length === 0) {
      return res.status(404).json({ success: false, error: 'Quotation not found or unauthorized.' });
    }

    const quotation = quotations[0];

    // Items
    const items = await query(
      `SELECT qi.*, p.name as product_name, p.sku, p.image_url, c.name as category_name
       FROM quotation_items qi
       JOIN products p ON qi.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       WHERE qi.quotation_id = ?`,
      [id]
    );

    const formattedItems = items.map(item => {
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

    // Line Comments
    const comments = await query(
      `SELECT nc.*, u.name as author_name
       FROM negotiation_comments nc
       JOIN users u ON nc.user_id = u.id
       WHERE nc.quotation_id = ?
       ORDER BY nc.created_at ASC`,
      [id]
    );

    // Version History
    const versions = await query(
      `SELECT * FROM quotation_versions WHERE quotation_id = ? ORDER BY version_number DESC`,
      [id]
    );

    // Status / Timeline History
    const statusHistory = await query(
      `SELECT qsh.*, u.name as changed_by_name
       FROM quotation_status_history qsh
       LEFT JOIN users u ON qsh.changed_by = u.id
       WHERE qsh.quotation_id = ?
       ORDER BY qsh.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      quotation,
      items: formattedItems,
      comments,
      versions,
      statusHistory,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Add line comment or general quotation comment
 */
async function addQuotationComment(req, res) {
  try {
    const { id } = req.params;
    const { quotationItemId, commentText } = req.body;
    const userId = req.user.id;

    if (!commentText || !commentText.trim()) {
      return res.status(400).json({ success: false, error: 'Comment text is required.' });
    }

    // Get active negotiation or create one
    let neg = await query(`SELECT id FROM negotiations WHERE quotation_id = ? AND status = 'OPEN'`, [id]);
    let negId;
    if (neg.length === 0) {
      const q = await query(`SELECT customer_id, salesperson_id, total_amount FROM quotations WHERE id = ?`, [id]);
      if (q.length === 0) return res.status(404).json({ success: false, error: 'Quotation not found.' });

      const newNeg = await query(
        `INSERT INTO negotiations (quotation_id, customer_id, salesperson_id, status, previous_total, counter_total)
         VALUES (?, ?, ?, 'OPEN', ?, ?)`,
        [id, q[0].customer_id, q[0].salesperson_id, q[0].total_amount, q[0].total_amount]
      );
      negId = newNeg.insertId;
    } else {
      negId = neg[0].id;
    }

    await query(
      `INSERT INTO negotiation_comments (negotiation_id, quotation_id, quotation_item_id, user_id, author_role, comment_text)
       VALUES (?, ?, ?, ?, 'CUSTOMER', ?)`,
      [negId, id, quotationItemId || null, userId, commentText.trim()]
    );

    await query(`UPDATE quotations SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);

    res.json({ success: true, message: 'Comment added successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Submit Counter Offer for Quotation
 */
async function submitCustomerCounterOffer(req, res) {
  try {
    const { id } = req.params;
    const { requestedDiscountPct, reason } = req.body;
    const userId = req.user.id;
    const customerId = req.user.customer_id;

    const quotes = await query(`SELECT * FROM quotations WHERE id = ? AND customer_id = ?`, [id, customerId]);
    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Quotation not found.' });
    }

    const quote = quotes[0];
    const discount = parseFloat(requestedDiscountPct || 0);

    const subtotal = parseFloat(quote.subtotal);
    const newDiscountAmount = subtotal * (discount / 100);
    const newSubtotal = subtotal - newDiscountAmount;
    const newTax = newSubtotal * 0.18;
    const counterTotal = newSubtotal + newTax;

    // Save Negotiation record
    await query(
      `INSERT INTO negotiations (quotation_id, customer_id, salesperson_id, status, requested_discount_pct, previous_total, counter_total, notes)
       VALUES (?, ?, ?, 'OPEN', ?, ?, ?, ?)`,
      [id, customerId, quote.salesperson_id, discount, quote.total_amount, counterTotal, reason || 'Customer counter-offer']
    );

    // Check discount governance rules: if requested discount > 10%, set PENDING_MANAGER
    const requiresApproval = discount > 10.0;
    const approvalStatus = requiresApproval ? 'PENDING_MANAGER' : 'NOT_REQUIRED';

    // Update Quotation Status
    await query(
      `UPDATE quotations 
       SET status = 'UNDER_NEGOTIATION', approval_status = ?, total_discount = ?, tax_amount = ?, total_amount = ?, last_activity_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [approvalStatus, newDiscountAmount, newTax, counterTotal, id]
    );

    // If approval required, create approval request for Sales Manager (Natu Kaka)
    if (requiresApproval) {
      await query(
        `INSERT INTO approval_requests (quotation_id, requested_by, level, status, risk_score, risk_summary)
         VALUES (?, ?, 'MANAGER', 'PENDING', ?, ?)`,
        [id, userId, Math.min(100, discount * 4), `Customer requested ${discount}% discount. Manager approval required.`]
      );
    }

    // Insert Version Snapshot
    const verCount = await query(`SELECT COUNT(*) as count FROM quotation_versions WHERE quotation_id = ?`, [id]);
    const nextVer = (verCount[0].count || 0) + 1;
    await query(
      `INSERT INTO quotation_versions (quotation_id, version_number, total_discount, subtotal, tax_amount, total_amount, status, changed_by, change_summary)
       VALUES (?, ?, ?, ?, ?, ?, 'UNDER_NEGOTIATION', ?, ?)`,
      [id, nextVer, newDiscountAmount, newSubtotal, newTax, counterTotal, req.user.name || 'Krish', `Counter-offer submitted: ${discount}% requested discount (${reason || 'Bulk order counter'})`]
    );

    // Audit Log
    await query(
      `INSERT INTO audit_logs (quotation_id, user_id, user_role, action, old_value, new_value, reason)
       VALUES (?, ?, 'CUSTOMER', 'CUSTOMER_COUNTER_OFFER_SUBMITTED', ?, ?, ?)`,
      [id, userId, JSON.stringify({ totalAmount: quote.total_amount }), JSON.stringify({ counterTotal, discount, approvalStatus }), reason]
    );

    // Notify Rep (Bhagaha)
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link_url)
       VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
      [
        quote.salesperson_id,
        `Counter Offer on ${quote.quotation_number}`,
        `Customer Krish requested ${discount}% discount. ${requiresApproval ? 'Sent to Manager Natu Kaka for approval.' : 'Auto-approved.'}`,
        `/sales/quotations/${id}`,
      ]
    );

    // Send transactional email to Rep
    const { sendTransactionalEmail } = require('../services/emailService');
    const reps = await query(`SELECT email FROM users WHERE id = ?`, [quote.salesperson_id]);
    if (reps.length > 0) {
      sendTransactionalEmail({
        recipientEmail: reps[0].email,
        subject: `Counter Offer Received: ${quote.quotation_number}`,
        message: `Customer Krish (Metro Office Systems) requested ${discount}% discount on proposal ${quote.quotation_number}. Rationale: "${reason || 'Bulk procurement'}"`,
      }).catch((e) => console.error('Email error:', e));
    }

    res.json({
      success: true,
      message: requiresApproval
        ? 'Your requested terms have been submitted for approval by Sales Manager Natu Kaka.'
        : 'Counter offer updated successfully.',
      counterTotal,
      approvalStatus,
    });
  } catch (error) {
    console.error('Counter Offer Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Counter offer failed', errorCode: 'COUNTER_OFFER_FAILED' });
  }
}

/**
 * Customer Quote Confirmation -> Converts to Order & Invoice
 */
async function confirmCustomerQuotation(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.user.customer_id;

    const quotes = await query(`SELECT * FROM quotations WHERE id = ? AND customer_id = ?`, [id, customerId]);
    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Quotation not found.' });
    }

    const quote = quotes[0];

    // Update Quotation Status to APPROVED / FULFILLMENT
    await query(
      `UPDATE quotations SET status = 'FULFILLMENT', approval_status = 'APPROVED', last_activity_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    // Create Fulfillment Order (My Orders)
    const fulfillmentNumber = `FO-${Math.floor(10000 + Math.random() * 90000)}`;
    await query(
      `INSERT INTO fulfillment_orders (fulfillment_number, quotation_id, customer_id, status, expected_delivery_date)
       VALUES (?, ?, ?, 'PENDING', DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY))`,
      [fulfillmentNumber, id, customerId]
    );

    // Create Invoice (My Invoices)
    const invoiceNumber = `INV-${Math.floor(10000 + Math.random() * 90000)}`;
    await query(
      `INSERT INTO invoices (invoice_number, quotation_id, customer_id, subtotal, discount_amount, tax_amount, total_amount, due_amount, payment_status, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNPAID', DATE_ADD(CURRENT_DATE, INTERVAL 15 DAY))`,
      [invoiceNumber, id, customerId, quote.subtotal, quote.total_discount, quote.tax_amount, quote.total_amount, quote.total_amount]
    );

    // Audit Log
    await query(
      `INSERT INTO audit_logs (quotation_id, user_id, user_role, action, new_value, reason)
       VALUES (?, ?, 'CUSTOMER', 'CUSTOMER_QUOTATION_CONFIRMED', ?, 'Customer officially confirmed quotation')`,
      [id, req.user.id, JSON.stringify({ fulfillmentNumber, invoiceNumber })]
    );

    res.json({
      success: true,
      message: 'Quotation confirmed! Order and Invoice generated successfully.',
      fulfillmentNumber,
      invoiceNumber,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Customer Orders
 */
async function getCustomerOrders(req, res) {
  try {
    const customerId = req.user.customer_id;
    const orders = await query(
      `SELECT fo.*, q.quotation_number, q.total_amount,
              (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = fo.quotation_id) as item_count,
              inv.payment_status
       FROM fulfillment_orders fo
       JOIN quotations q ON fo.quotation_id = q.id
       LEFT JOIN invoices inv ON inv.quotation_id = q.id
       WHERE fo.customer_id = ?
       ORDER BY fo.created_at DESC`,
      [customerId]
    );
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Customer Invoices
 */
async function getCustomerInvoices(req, res) {
  try {
    const customerId = req.user.customer_id;
    const invoices = await query(
      `SELECT inv.*, q.quotation_number
       FROM invoices inv
       JOIN quotations q ON inv.quotation_id = q.id
       WHERE inv.customer_id = ?
       ORDER BY inv.created_at DESC`,
      [customerId]
    );
    const formattedInvoices = invoices.map(inv => {
      const tax = parseFloat(inv.tax_amount || 0);
      return {
        ...inv,
        cgst_amount: (tax / 2).toFixed(2),
        sgst_amount: (tax / 2).toFixed(2),
      };
    });
    res.json({ success: true, invoices: formattedInvoices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Customer Subscriptions
 */
async function getCustomerSubscriptions(req, res) {
  try {
    const customerId = req.user.customer_id;
    const subscriptions = await query(
      `SELECT s.*, p.plan_name, pr.name as product_name
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       JOIN products pr ON p.product_id = pr.id
       WHERE s.customer_id = ?
       ORDER BY s.id DESC`,
      [customerId]
    );
    res.json({ success: true, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Customer Notifications
 */
async function getCustomerNotifications(req, res) {
  try {
    const userId = req.user.id;
    const notifications = await query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Mark notification as read
 */
async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    if (id === 'all') {
      await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = ?`, [userId]);
    } else {
      await query(`UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`, [id, userId]);
    }
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Customer Profile (Read-only tier & assigned sales rep Bhagha)
 */
async function getCustomerProfile(req, res) {
  try {
    const customerId = req.user.customer_id;
    const customers = await query(
      `SELECT c.*, rep.name as sales_rep_name, rep.email as sales_rep_email
       FROM customers c
       LEFT JOIN users rep ON c.assigned_salesperson_id = rep.id
       WHERE c.id = ?`,
      [customerId]
    );

    if (customers.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer profile not found.' });
    }

    res.json({ success: true, profile: customers[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update Customer Profile (editable fields: contact_person, phone, billing_address, shipping_address)
 */
async function updateCustomerProfile(req, res) {
  try {
    const customerId = req.user.customer_id;
    if (!customerId) {
      return res.status(400).json({ success: false, error: 'User is not linked to a customer account.' });
    }

    const contactPerson = req.body.contactPerson || req.body.contact_person;
    const phone = req.body.phone;
    const billingAddress = req.body.billingAddress || req.body.billing_address;
    const shippingAddress = req.body.shippingAddress || req.body.shipping_address;

    await query(
      `UPDATE customers
       SET contact_person = COALESCE(?, contact_person),
           phone = COALESCE(?, phone),
           billing_address = COALESCE(?, billing_address),
           shipping_address = COALESCE(?, shipping_address),
           updated_at = NOW()
       WHERE id = ?`,
      [
        contactPerson || null,
        phone || null,
        billingAddress || null,
        shippingAddress || null,
        customerId,
      ]
    );

    const updatedCustomers = await query(
      `SELECT c.*, rep.name as sales_rep_name FROM customers c
       LEFT JOIN users rep ON c.assigned_salesperson_id = rep.id
       WHERE c.id = ?`,
      [customerId]
    );

    res.json({ success: true, profile: updatedCustomers[0], message: 'Profile updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getCustomerDashboard,
  getCustomerProducts,
  getCustomerProductById,
  getCustomerCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
  generateQuotationFromCart,
  getCustomerQuotations,
  getCustomerQuotationById,
  addQuotationComment,
  submitCustomerCounterOffer,
  confirmCustomerQuotation,
  getCustomerOrders,
  getCustomerInvoices,
  getCustomerSubscriptions,
  getCustomerNotifications,
  markNotificationRead,
  getCustomerProfile,
  updateCustomerProfile,
};
