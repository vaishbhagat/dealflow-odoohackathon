const { query, withTransaction } = require('../config/db');
const { logAudit } = require('./auditService');

/**
 * Smart Follow-Up Engine (EVENT -> RULE -> ACTION)
 */
async function scanAndGenerateSmartFollowUps() {
  const generated = [];

  // RULE 1: Stalled Deals (Customer inactive >= 3 days)
  const stalledQuotes = await query(
    `SELECT q.*, c.company_name, DATEDIFF(NOW(), q.last_activity_at) as days_idle
     FROM quotations q
     JOIN customers c ON q.customer_id = c.id
     WHERE q.status IN ('SENT', 'UNDER_NEGOTIATION')
       AND DATEDIFF(NOW(), q.last_activity_at) >= 3`
  );

  for (const q of stalledQuotes) {
    const existing = await query(
      `SELECT id FROM follow_ups WHERE quotation_id = ? AND status = 'PENDING' AND title LIKE '%Idle%'`,
      [q.id]
    );
    if (existing.length === 0) {
      const priority = parseFloat(q.total_amount) > 500000 ? 'HIGH' : 'MEDIUM';
      await query(
        `INSERT INTO follow_ups 
         (quotation_id, customer_id, salesperson_id, title, reason, priority, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'PENDING')`,
        [
          q.id,
          q.customer_id,
          q.salesperson_id,
          `Follow up on Idle Quote ${q.quotation_number}`,
          `Customer ${q.company_name} has not interacted for ${q.days_idle} days. Re-engage to maintain pipeline momentum.`,
          priority,
        ]
      );
      generated.push(q.quotation_number);
    }
  }

  // RULE 2: High Value Deal Follow-up
  const highValueQuotes = await query(
    `SELECT q.*, c.company_name
     FROM quotations q
     JOIN customers c ON q.customer_id = c.id
     WHERE q.total_amount >= 500000 AND q.status = 'SENT'`
  );

  for (const q of highValueQuotes) {
    const existing = await query(
      `SELECT id FROM follow_ups WHERE quotation_id = ? AND status = 'PENDING' AND priority = 'HIGH'`,
      [q.id]
    );
    if (existing.length === 0) {
      await query(
        `INSERT INTO follow_ups 
         (quotation_id, customer_id, salesperson_id, title, reason, priority, due_date, status)
         VALUES (?, ?, ?, ?, ?, 'HIGH', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'PENDING')`,
        [
          q.id,
          q.customer_id,
          q.salesperson_id,
          `High-Value Account Engagement: ${q.quotation_number}`,
          `Strategic deal valued at ₹${parseFloat(q.total_amount).toLocaleString()} with ${q.company_name}. Executive touchpoint recommended.`,
        ]
      );
    }
  }

  return { success: true, count: generated.length, quotations: generated };
}

/**
 * Mark follow-up as completed and update deal health
 */
async function completeFollowUp(followUpId, userId, actionNotes) {
  return await withTransaction(async (conn) => {
    const [tasks] = await conn.execute(
      `SELECT f.*, q.quotation_number 
       FROM follow_ups f
       JOIN quotations q ON f.quotation_id = q.id
       WHERE f.id = ?`,
      [followUpId]
    );
    if (tasks.length === 0) throw new Error('Follow-up task not found');
    const task = tasks[0];

    // Mark as completed
    await conn.execute(
      `UPDATE follow_ups 
       SET status = 'COMPLETED', action_taken = ?, completed_at = NOW() 
       WHERE id = ?`,
      [actionNotes || 'Contacted customer via phone/email and discussed proposal.', followUpId]
    );

    // Refresh quotation last_activity_at to reflect sales touchpoint
    await conn.execute(
      `UPDATE quotations 
       SET last_activity_at = NOW() 
       WHERE id = ?`,
      [task.quotation_id]
    );

    await logAudit({
      quotationId: task.quotation_id,
      userId,
      userRole: 'SALES_REP',
      action: 'FOLLOW_UP_COMPLETED',
      oldValue: task.status,
      newValue: 'COMPLETED',
      reason: actionNotes,
      connection: conn,
    });

    return {
      success: true,
      followUpId,
      message: 'Follow-up task completed successfully. Quotation activity timeline refreshed.',
    };
  });
}

module.exports = {
  scanAndGenerateSmartFollowUps,
  completeFollowUp,
};
