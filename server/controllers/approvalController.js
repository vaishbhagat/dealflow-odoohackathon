const { query } = require('../config/db');
const { processManagerDecision, processFinanceDecision } = require('../services/approvalService');

/**
 * Get pending approvals queue based on user role (Manager vs Finance)
 */
async function getPendingApprovals(req, res) {
  try {
    const role = req.user.role;
    let levelFilter = 'MANAGER';

    if (role === 'FINANCE_OPERATIONS') {
      levelFilter = 'FINANCE';
    }

    const requests = await query(
      `SELECT ar.*, q.quotation_number, q.total_amount, q.subtotal, q.total_discount,
              q.margin_pct, q.risk_score as quote_risk_score, q.risk_reason,
              c.company_name as customer_name, c.customer_tier,
              u.name as salesperson_name
       FROM approval_requests ar
       JOIN quotations q ON ar.quotation_id = q.id
       JOIN customers c ON q.customer_id = c.id
       JOIN users u ON q.salesperson_id = u.id
       WHERE ar.level = ? AND ar.status = 'PENDING'
       ORDER BY ar.created_at DESC`,
      [levelFilter]
    );

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle Sales Manager approval/rejection/return
 */
async function managerDecision(req, res) {
  try {
    const { quotationId, decision, comments } = req.body;

    if (!quotationId || !decision) {
      return res.status(400).json({ success: false, error: 'quotationId and decision are required.' });
    }

    const result = await processManagerDecision(quotationId, req.user, decision, comments);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle Finance Operations second-level sign-off
 */
async function financeDecision(req, res) {
  try {
    const { quotationId, decision, comments } = req.body;

    if (!quotationId || !decision) {
      return res.status(400).json({ success: false, error: 'quotationId and decision are required.' });
    }

    const result = await processFinanceDecision(quotationId, req.user, decision, comments);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getPendingApprovals,
  managerDecision,
  financeDecision,
};
