const { query } = require('../config/db');
const { 
  createRazorpayOrder, 
  verifyPaymentSignature, 
  createSubscriptionRazorpayOrder, 
  verifySubscriptionPaymentSignature 
} = require('../services/paymentService');

/**
 * Create Razorpay test order
 */
async function createOrder(req, res) {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ success: false, error: 'invoiceId is required.' });
    }

    const order = await createRazorpayOrder(invoiceId, req.user);
    res.json(order);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Verify Razorpay payment signature & update database
 */
async function verifyPayment(req, res) {
  try {
    const { invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!invoiceId || !razorpayPaymentId) {
      return res.status(400).json({ success: false, error: 'invoiceId and razorpayPaymentId are required.' });
    }

    const result = await verifyPaymentSignature({
      invoiceId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      userId: req.user ? req.user.id : null,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List invoices
 */
async function getInvoices(req, res) {
  try {
    let sql = `
      SELECT inv.*, q.quotation_number, c.company_name as customer_name, c.email as customer_email
      FROM invoices inv
      JOIN quotations q ON inv.quotation_id = q.id
      JOIN customers c ON inv.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'CUSTOMER') {
      sql += ' AND inv.customer_id = ?';
      params.push(req.user.customer_id);
    }

    sql += ' ORDER BY inv.created_at DESC';
    const invoices = await query(sql, params);
    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get invoice detail with line items and payments
 */
async function getInvoiceById(req, res) {
  try {
    const { id } = req.params;

    const invoices = await query(
      `SELECT inv.*, q.quotation_number, c.company_name as customer_name, c.contact_person,
              c.email as customer_email, c.phone as customer_phone, c.billing_address,
              comp.name as company_name_legal, comp.gstin, comp.pan
       FROM invoices inv
       JOIN quotations q ON inv.quotation_id = q.id
       JOIN customers c ON inv.customer_id = c.id
       JOIN companies comp ON c.company_id = comp.id
       WHERE inv.id = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }
    const invoice = invoices[0];

    // Customer isolation
    if (req.user.role === 'CUSTOMER' && parseInt(invoice.customer_id, 10) !== parseInt(req.user.customer_id, 10)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Access denied to other customer invoices.' });
    }

    // Invoice items
    const items = await query(`SELECT * FROM invoice_items WHERE invoice_id = ?`, [id]);
    invoice.items = items.map(item => {
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

    const totalTax = parseFloat(invoice.tax_amount || 0);
    invoice.cgst_total = (totalTax / 2).toFixed(2);
    invoice.sgst_total = (totalTax / 2).toFixed(2);

    // Payments recorded
    const payments = await query(`SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC`, [id]);
    invoice.payments = payments;

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
  * Create Razorpay test order for subscription plan
  */
async function createSubscriptionOrder(req, res) {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, error: 'planId is required.' });
    }

    const order = await createSubscriptionRazorpayOrder(planId, req.user);
    res.json(order);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
  * Verify Razorpay subscription payment signature
  */
async function verifySubscriptionPayment(req, res) {
  try {
    const { planId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!planId || !razorpayPaymentId) {
      return res.status(400).json({ success: false, error: 'planId and razorpayPaymentId are required.' });
    }

    const customerId = req.user?.customer_id;
    if (!customerId) {
      return res.status(400).json({ success: false, error: 'Customer ID required for subscription activation.' });
    }

    const result = await verifySubscriptionPaymentSignature({
      planId,
      customerId,
      userId: req.user ? req.user.id : null,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  getInvoices,
  getInvoiceById,
  createSubscriptionOrder,
  verifySubscriptionPayment,
};
