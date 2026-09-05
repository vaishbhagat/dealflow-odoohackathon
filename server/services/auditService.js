const { query } = require('../config/db');

/**
 * Record an immutable audit log entry in MySQL
 */
async function logAudit({
  quotationId = null,
  userId = null,
  userRole = 'SYSTEM',
  action,
  oldValue = null,
  newValue = null,
  reason = null,
  ipAddress = '127.0.0.1',
  connection = null,
}) {
  const sql = `
    INSERT INTO audit_logs 
    (quotation_id, user_id, user_role, action, old_value, new_value, reason, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    quotationId,
    userId,
    userRole,
    action,
    typeof oldValue === 'object' && oldValue !== null ? JSON.stringify(oldValue) : oldValue,
    typeof newValue === 'object' && newValue !== null ? JSON.stringify(newValue) : newValue,
    reason,
    ipAddress,
  ];

  if (connection) {
    await connection.execute(sql, params);
  } else {
    await query(sql, params);
  }
}

/**
 * Fetch audit logs for a specific quotation
 */
async function getAuditLogsByQuotation(quotationId) {
  const sql = `
    SELECT al.*, u.name as user_name, u.email as user_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.quotation_id = ?
    ORDER BY al.created_at ASC
  `;
  return await query(sql, [quotationId]);
}

module.exports = {
  logAudit,
  getAuditLogsByQuotation,
};
