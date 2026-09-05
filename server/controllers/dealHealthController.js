const { query } = require('../config/db');
const { evaluateDealHealth } = require('../services/dealHealthService');

/**
 * Get Deal Health for a specific quotation
 */
async function getHealthByQuotation(req, res) {
  try {
    const { quotationId } = req.params;
    const health = await evaluateDealHealth(quotationId);
    res.json({ success: true, health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get overall deal health summary across active pipeline
 */
async function getHealthOverview(req, res) {
  try {
    const atRiskDeals = await query(
      `SELECT dh.*, q.quotation_number, q.total_amount, q.status as quotation_status,
              c.company_name as customer_name, u.name as salesperson_name,
              DATEDIFF(NOW(), q.last_activity_at) as days_idle
       FROM deal_health dh
       JOIN quotations q ON dh.quotation_id = q.id
       JOIN customers c ON q.customer_id = c.id
       JOIN users u ON q.salesperson_id = u.id
       WHERE dh.status IN ('AT_RISK', 'CRITICAL')
       ORDER BY dh.health_score ASC`
    );

    const [stats] = await query(
      `SELECT 
         COUNT(*) as total_deals,
         SUM(CASE WHEN dh.status = 'HEALTHY' THEN 1 ELSE 0 END) as healthy_count,
         SUM(CASE WHEN dh.status = 'AT_RISK' THEN 1 ELSE 0 END) as at_risk_count,
         SUM(CASE WHEN dh.status = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
         AVG(dh.health_score) as average_health_score
       FROM deal_health dh
       JOIN quotations q ON dh.quotation_id = q.id`
    );

    res.json({
      success: true,
      stats: stats[0],
      atRiskDeals,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get detected discount anomalies
 */
async function getAnomalies(req, res) {
  try {
    const anomalies = await query(
      `SELECT a.*, q.quotation_number, q.total_amount, u.name as salesperson_name,
              c.company_name as customer_name
       FROM anomalies a
       JOIN quotations q ON a.quotation_id = q.id
       JOIN users u ON a.salesperson_id = u.id
       JOIN customers c ON q.customer_id = c.id
       ORDER BY a.created_at DESC`
    );
    res.json({ success: true, anomalies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Send an automated nudge to the salesperson for stalled or anomalous deals
 */
async function triggerNudge(req, res) {
  try {
    const { quotationId, message } = req.body;
    const [quotes] = await query(
      `SELECT q.*, c.company_name as customer_name, u.name as salesperson_name 
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       JOIN users u ON q.salesperson_id = u.id
       WHERE q.id = ?`,
      [quotationId]
    );

    if (quotes.length === 0) return res.status(404).json({ success: false, error: 'Quotation not found.' });
    const quote = quotes[0];

    const nudgeText = message || `Managerial Nudge: Please follow up promptly on stalled quotation ${quote.quotation_number} with ${quote.customer_name}.`;

    // 1. Create notification for rep
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link_url)
       VALUES (?, ?, ?, 'DEAL_AT_RISK', ?)`,
      [
        quote.salesperson_id,
        `Deal Nudge: ${quote.quotation_number}`,
        nudgeText,
        `/sales/quotations/${quotationId}`,
      ]
    );

    // 2. Create urgent follow-up task
    await query(
      `INSERT INTO follow_ups (quotation_id, customer_id, salesperson_id, title, reason, priority, due_date, status)
       VALUES (?, ?, ?, ?, ?, 'URGENT', CURDATE(), 'PENDING')`,
      [
        quotationId,
        quote.customer_id,
        quote.salesperson_id,
        `Nudge Action: Follow up with ${quote.customer_name}`,
        nudgeText,
      ]
    );

    res.json({
      success: true,
      message: `Automated nudge sent to sales rep ${quote.salesperson_name}. Priority follow-up created.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Escalate a high-risk or stalled deal directly to management
 */
async function escalateDeal(req, res) {
  try {
    const { quotationId, reason } = req.body;
    const [quotes] = await query(
      `SELECT q.*, c.company_name as customer_name, u.name as salesperson_name 
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       JOIN users u ON q.salesperson_id = u.id
       WHERE q.id = ?`,
      [quotationId]
    );

    if (quotes.length === 0) return res.status(404).json({ success: false, error: 'Quotation not found.' });
    const quote = quotes[0];

    const escalationReason = reason || 'Deal health is critical; immediate management intervention required.';

    // Notify all Sales Managers
    const managers = await query(`SELECT id FROM users WHERE role IN ('SALES_MANAGER', 'ADMIN') AND active = TRUE`);
    for (const m of managers) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES (?, ?, ?, 'DEAL_AT_RISK', ?)`,
        [
          m.id,
          `Deal Escalation: ${quote.quotation_number} (${quote.customer_name})`,
          `High-risk deal escalated by ${req.user.name}: ${escalationReason}`,
          `/sales/quotations/${quotationId}`,
        ]
      );
    }

    res.json({
      success: true,
      message: `Deal ${quote.quotation_number} escalated to sales leadership.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getHealthByQuotation,
  getHealthOverview,
  getAnomalies,
  triggerNudge,
  escalateDeal,
};
