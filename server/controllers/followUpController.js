const { query } = require('../config/db');
const { scanAndGenerateSmartFollowUps, completeFollowUp } = require('../services/followUpService');

/**
 * Get follow-ups list with role filtering (Rep sees their tasks, Managers see team tasks)
 */
async function getFollowUps(req, res) {
  try {
    let sql = `
      SELECT f.*, q.quotation_number, q.total_amount,
             c.company_name as customer_name, c.contact_person, c.phone as customer_phone,
             u.name as salesperson_name
      FROM follow_ups f
      JOIN quotations q ON f.quotation_id = q.id
      JOIN customers c ON f.customer_id = c.id
      JOIN users u ON f.salesperson_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'SALES_REP') {
      sql += ' AND f.salesperson_id = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY CASE WHEN f.status = "PENDING" THEN 0 ELSE 1 END, f.due_date ASC, f.id DESC';

    const tasks = await query(sql, params);
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Run follow-up automation scanner (EVENT -> RULE -> ACTION)
 */
async function scanFollowUps(req, res) {
  try {
    const result = await scanAndGenerateSmartFollowUps();
    res.json({
      success: true,
      message: `Automation completed: Checked active deals. Created ${result.count || 0} smart follow-up task(s).`,
      count: result.count || 0,
      quotations: result.quotations || [],
    });
  } catch (error) {
    console.error('Follow-up Automation Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Automation execution failed.',
      errorCode: 'AUTOMATION_SCAN_FAILED',
    });
  }
}

/**
 * Mark follow-up task complete with sales rep notes
 */
async function completeTask(req, res) {
  try {
    const { id } = req.params;
    const { actionTaken } = req.body;

    const result = await completeFollowUp(id, req.user.id, actionTaken);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getFollowUps,
  scanFollowUps,
  completeTask,
};
