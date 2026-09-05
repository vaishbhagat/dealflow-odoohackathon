const { query } = require('../config/db');
const {
  submitCustomerCounterOffer,
  confirmQuotationByCustomer,
  respondToCustomerNegotiation,
  addNegotiationComment,
} = require('../services/negotiationService');

/**
 * Get negotiation thread and line comments for a quotation
 */
async function getNegotiations(req, res) {
  try {
    const { quotationId } = req.params;

    const negotiations = await query(
      `SELECT n.*, u.name as salesperson_name, c.company_name as customer_name
       FROM negotiations n
       JOIN users u ON n.salesperson_id = u.id
       JOIN customers c ON n.customer_id = c.id
       WHERE n.quotation_id = ?
       ORDER BY n.created_at DESC`,
      [quotationId]
    );

    const comments = await query(
      `SELECT nc.*, u.name as author_name, p.name as product_name
       FROM negotiation_comments nc
       JOIN users u ON nc.user_id = u.id
       LEFT JOIN quotation_items qi ON nc.quotation_item_id = qi.id
       LEFT JOIN products p ON qi.product_id = p.id
       WHERE nc.quotation_id = ?
       ORDER BY nc.created_at ASC`,
      [quotationId]
    );

    res.json({ success: true, negotiations, comments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Customer submits counter-offer or line comment
 */
async function submitCounterOffer(req, res) {
  try {
    const { quotationId, requestedDiscountPct, commentText, targetItemId } = req.body;

    if (!quotationId) {
      return res.status(400).json({ success: false, error: 'quotationId is required.' });
    }

    const result = await submitCustomerCounterOffer({
      quotationId,
      customerUser: req.user,
      requestedDiscountPct: requestedDiscountPct !== undefined ? parseFloat(requestedDiscountPct) : undefined,
      commentText,
      targetItemId: targetItemId ? parseInt(targetItemId, 10) : null,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Sales Rep responds to a customer counter-offer (Accept / Counter / Reject)
 */
async function respondToNegotiation(req, res) {
  try {
    const { quotationId } = req.params;
    const { negotiationId, action, counterDiscountPct, responseMessage } = req.body;

    if (!action || !['ACCEPT', 'COUNTER', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Valid action (ACCEPT, COUNTER, REJECT) is required.' });
    }

    const result = await respondToCustomerNegotiation({
      quotationId: parseInt(quotationId, 10),
      negotiationId: negotiationId ? parseInt(negotiationId, 10) : null,
      salesUser: req.user,
      action,
      counterDiscountPct: counterDiscountPct !== undefined ? parseFloat(counterDiscountPct) : null,
      responseMessage,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Add a comment or message to negotiation thread
 */
async function addComment(req, res) {
  try {
    const { quotationId } = req.params;
    const { negotiationId, commentText, quotationItemId } = req.body;

    if (!commentText) {
      return res.status(400).json({ success: false, error: 'commentText is required.' });
    }

    const result = await addNegotiationComment({
      quotationId: parseInt(quotationId, 10),
      negotiationId: negotiationId ? parseInt(negotiationId, 10) : null,
      user: req.user,
      commentText,
      quotationItemId: quotationItemId ? parseInt(quotationItemId, 10) : null,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Customer confirms quotation
 */
async function confirmQuotation(req, res) {
  try {
    const { id } = req.params;
    const result = await confirmQuotationByCustomer(id, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getNegotiations,
  submitCounterOffer,
  respondToNegotiation,
  addComment,
  confirmQuotation,
};
