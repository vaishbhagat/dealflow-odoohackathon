const { query, withTransaction } = require('../config/db');
const { calculateQuotationFinancials } = require('./discountRiskService');
const { logAudit } = require('./auditService');

/**
 * Submit quotation into the governance approval pipeline
 */
async function submitForApproval(quotationId, requestedByUserId) {
  return await withTransaction(async (conn) => {
    // 1. Recalculate financials to guarantee fresh risk score
    const fin = await calculateQuotationFinancials(quotationId, conn);

    // 2. Fetch quotation and salesperson details
    const [quotes] = await conn.execute(
      `SELECT q.*, u.name as salesperson_name 
       FROM quotations q 
       JOIN users u ON q.salesperson_id = u.id 
       WHERE q.id = ?`,
      [quotationId]
    );
    const quote = quotes[0];

    // If risk requires no approval
    if (fin.requiredApprovalStatus === 'NOT_REQUIRED') {
      await conn.execute(
        `UPDATE quotations 
         SET status = 'APPROVED', approval_status = 'NOT_REQUIRED', last_activity_at = NOW() 
         WHERE id = ?`,
        [quotationId]
      );

      await logAudit({
        quotationId,
        userId: requestedByUserId,
        userRole: 'SALES_REP',
        action: 'AUTO_APPROVED',
        oldValue: quote.status,
        newValue: 'APPROVED',
        reason: 'Approval not required. Deal terms are within standard discount governance limits.',
        connection: conn,
      });

      return {
        quotationId,
        status: 'APPROVED',
        approvalStatus: 'NOT_REQUIRED',
        message: 'Quotation auto-approved within governance thresholds.',
      };
    }

    // Determine starting approval level: Manager first
    const approvalLevel = 'MANAGER';
    const approvalStatus = 'PENDING_MANAGER';

    // Update quotation status
    await conn.execute(
      `UPDATE quotations 
       SET status = 'PENDING_APPROVAL', approval_status = ?, last_activity_at = NOW() 
       WHERE id = ?`,
      [approvalStatus, quotationId]
    );

    // Create approval request record
    const [reqResult] = await conn.execute(
      `INSERT INTO approval_requests 
       (quotation_id, requested_by, level, status, risk_score, risk_summary)
       VALUES (?, ?, ?, 'PENDING', ?, ?)`,
      [quotationId, requestedByUserId, approvalLevel, fin.blendedRiskScore, fin.riskReason]
    );
    const approvalRequestId = reqResult.insertId;

    // Create approval history entry
    await conn.execute(
      `INSERT INTO approval_history 
       (approval_request_id, quotation_id, action_by, action, comments, previous_status, new_status)
       VALUES (?, ?, ?, 'SUBMIT', ?, ?, ?)`,
      [
        approvalRequestId,
        quotationId,
        requestedByUserId,
        `Submitted for review. Blended risk: ${fin.blendedRiskScore.toFixed(1)}%. ${fin.riskReason}`,
        quote.status,
        'PENDING_APPROVAL',
      ]
    );

    // Create notification for Sales Manager (Role: SALES_MANAGER, id: 2)
    const [managers] = await conn.execute(
      `SELECT id FROM users WHERE role = 'SALES_MANAGER' AND active = TRUE LIMIT 1`
    );
    if (managers.length > 0) {
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES (?, ?, ?, 'APPROVAL_REQUIRED', ?)`,
        [
          managers[0].id,
          `Quotation ${quote.quotation_number} Requires Approval`,
          `High-risk deal submitted by ${quote.salesperson_name}. Risk score: ${fin.blendedRiskScore.toFixed(1)}%. ${fin.riskReason}`,
          `/manager/approvals`,
        ]
      );
    }

    // Audit log
    await logAudit({
      quotationId,
      userId: requestedByUserId,
      userRole: 'SALES_REP',
      action: 'SUBMITTED_FOR_APPROVAL',
      oldValue: quote.status,
      newValue: 'PENDING_APPROVAL',
      reason: fin.riskReason,
      connection: conn,
    });

    return {
      quotationId,
      status: 'PENDING_APPROVAL',
      approvalStatus,
      riskScore: fin.blendedRiskScore,
      riskReason: fin.riskReason,
      message: `Quotation routed to Sales Manager for review (${fin.riskReason})`,
    };
  });
}

/**
 * Handle manager approval/rejection/return
 */
async function processManagerDecision(quotationId, managerUser, decision, comments) {
  return await withTransaction(async (conn) => {
    const [quotes] = await conn.execute(
      `SELECT q.*, c.company_name as customer_name 
       FROM quotations q 
       JOIN customers c ON q.customer_id = c.id 
       WHERE q.id = ?`,
      [quotationId]
    );
    if (quotes.length === 0) throw new Error('Quotation not found');
    const quote = quotes[0];

    const [requests] = await conn.execute(
      `SELECT * FROM approval_requests 
       WHERE quotation_id = ? AND level = 'MANAGER' AND status = 'PENDING' 
       ORDER BY created_at DESC LIMIT 1`,
      [quotationId]
    );
    const approvalReq = requests[0];
    const reqId = approvalReq ? approvalReq.id : null;

    if (decision === 'APPROVE') {
      // Check if dual-approval with finance is required (>10% risk score)
      const needsFinance = parseFloat(quote.risk_score) > 10.0;

      if (needsFinance) {
        // Shift to Finance approval
        await conn.execute(
          `UPDATE quotations 
           SET approval_status = 'PENDING_FINANCE', last_activity_at = NOW() 
           WHERE id = ?`,
          [quotationId]
        );

        if (reqId) {
          await conn.execute(
            `UPDATE approval_requests 
             SET status = 'APPROVED', resolved_at = NOW() 
             WHERE id = ?`,
            [reqId]
          );
        }

        // Create Finance approval request
        const [finReqResult] = await conn.execute(
          `INSERT INTO approval_requests 
           (quotation_id, requested_by, level, status, risk_score, risk_summary)
           VALUES (?, ?, 'FINANCE', 'PENDING', ?, ?)`,
          [
            quotationId,
            managerUser.id,
            quote.risk_score,
            `Manager approved; escalated to Finance due to risk score ${quote.risk_score}% exceeding 10% threshold.`,
          ]
        );

        if (reqId) {
          await conn.execute(
            `INSERT INTO approval_history 
             (approval_request_id, quotation_id, action_by, action, comments, previous_status, new_status)
             VALUES (?, ?, ?, 'APPROVE', ?, 'PENDING_MANAGER', 'PENDING_FINANCE')`,
            [reqId, quotationId, managerUser.id, comments || 'Manager endorsed. Escalated to Finance.']
          );
        }

        // Notify Finance user (Role: FINANCE_OPERATIONS)
        const [financeUsers] = await conn.execute(
          `SELECT id FROM users WHERE role = 'FINANCE_OPERATIONS' AND active = TRUE LIMIT 1`
        );
        if (financeUsers.length > 0) {
          await conn.execute(
            `INSERT INTO notifications (user_id, title, message, type, link_url)
             VALUES (?, ?, ?, 'APPROVAL_REQUIRED', ?)`,
            [
              financeUsers[0].id,
              `Finance Approval Required: ${quote.quotation_number}`,
              `Manager approved quotation with high risk score (${quote.risk_score}%). Awaiting finance sign-off.`,
              `/finance/approvals`,
            ]
          );
        }

        await logAudit({
          quotationId,
          userId: managerUser.id,
          userRole: managerUser.role,
          action: 'MANAGER_APPROVED_ESCALATED',
          oldValue: 'PENDING_MANAGER',
          newValue: 'PENDING_FINANCE',
          reason: comments,
          connection: conn,
        });

        return {
          quotationId,
          status: 'PENDING_APPROVAL',
          approvalStatus: 'PENDING_FINANCE',
          message: 'Manager approved. Deal forwarded to Finance Operations for second-level sign-off.',
        };
      } else {
        // Fully approved
        await conn.execute(
          `UPDATE quotations 
           SET status = 'APPROVED', approval_status = 'APPROVED', last_activity_at = NOW() 
           WHERE id = ?`,
          [quotationId]
        );

        if (reqId) {
          await conn.execute(
            `UPDATE approval_requests 
             SET status = 'APPROVED', resolved_at = NOW() 
             WHERE id = ?`,
            [reqId]
          );

          await conn.execute(
            `INSERT INTO approval_history 
             (approval_request_id, quotation_id, action_by, action, comments, previous_status, new_status)
             VALUES (?, ?, ?, 'APPROVE', ?, 'PENDING_MANAGER', 'APPROVED')`,
            [reqId, quotationId, managerUser.id, comments || 'Approved by Sales Manager.']
          );
        }

        // Notify Sales Rep
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, type, link_url)
           VALUES (?, ?, ?, 'APPROVAL_REQUIRED', ?)`,
          [
            quote.salesperson_id,
            `Quotation ${quote.quotation_number} Approved`,
            `Sales Manager approved your quotation for ${quote.customer_name}. Ready to send or fulfill.`,
            `/sales/quotations/${quotationId}`,
          ]
        );

        await logAudit({
          quotationId,
          userId: managerUser.id,
          userRole: managerUser.role,
          action: 'MANAGER_APPROVED',
          oldValue: 'PENDING_MANAGER',
          newValue: 'APPROVED',
          reason: comments,
          connection: conn,
        });

        return {
          quotationId,
          status: 'APPROVED',
          approvalStatus: 'APPROVED',
          message: 'Quotation approved successfully by Sales Manager.',
        };
      }
    } else if (decision === 'REJECT') {
      await conn.execute(
        `UPDATE quotations 
         SET status = 'REJECTED', approval_status = 'REJECTED', last_activity_at = NOW() 
         WHERE id = ?`,
        [quotationId]
      );

      if (reqId) {
        await conn.execute(
          `UPDATE approval_requests 
           SET status = 'REJECTED', resolved_at = NOW() 
           WHERE id = ?`,
          [reqId]
        );

        await conn.execute(
          `INSERT INTO approval_history 
           (approval_request_id, quotation_id, action_by, action, comments, previous_status, new_status)
           VALUES (?, ?, ?, 'REJECT', ?, 'PENDING_MANAGER', 'REJECTED')`,
          [reqId, quotationId, managerUser.id, comments || 'Rejected by Sales Manager.']
        );
      }

      // Notify Sales Rep
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES (?, ?, ?, 'APPROVAL_REQUIRED', ?)`,
        [
          quote.salesperson_id,
          `Quotation ${quote.quotation_number} Rejected`,
          `Sales Manager rejected the quotation. Reason: ${comments}`,
          `/sales/quotations/${quotationId}`,
        ]
      );

      await logAudit({
        quotationId,
        userId: managerUser.id,
        userRole: managerUser.role,
        action: 'MANAGER_REJECTED',
        oldValue: 'PENDING_MANAGER',
        newValue: 'REJECTED',
        reason: comments,
        connection: conn,
      });

      return {
        quotationId,
        status: 'REJECTED',
        approvalStatus: 'REJECTED',
        message: 'Quotation rejected by Sales Manager.',
      };
    } else if (decision === 'RETURN') {
      await conn.execute(
        `UPDATE quotations 
         SET status = 'RETURNED_FOR_REVISION', approval_status = 'RETURNED_FOR_REVISION', last_activity_at = NOW() 
         WHERE id = ?`,
        [quotationId]
      );

      if (reqId) {
        await conn.execute(
          `UPDATE approval_requests 
           SET status = 'RETURNED', resolved_at = NOW() 
           WHERE id = ?`,
          [reqId]
        );

        await conn.execute(
          `INSERT INTO approval_history 
           (approval_request_id, quotation_id, action_by, action, comments, previous_status, new_status)
           VALUES (?, ?, ?, 'RETURN', ?, 'PENDING_MANAGER', 'RETURNED_FOR_REVISION')`,
          [reqId, quotationId, managerUser.id, comments || 'Returned for revision.']
        );
      }

      // Notify Sales Rep
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES (?, ?, ?, 'APPROVAL_REQUIRED', ?)`,
        [
          quote.salesperson_id,
          `Quotation ${quote.quotation_number} Returned for Revision`,
          `Sales Manager requested adjustments: ${comments}`,
          `/sales/quotations/${quotationId}`,
        ]
      );

      await logAudit({
        quotationId,
        userId: managerUser.id,
        userRole: managerUser.role,
        action: 'RETURNED_FOR_REVISION',
        oldValue: 'PENDING_MANAGER',
        newValue: 'RETURNED_FOR_REVISION',
        reason: comments,
        connection: conn,
      });

      return {
        quotationId,
        status: 'RETURNED_FOR_REVISION',
        approvalStatus: 'RETURNED_FOR_REVISION',
        message: 'Quotation returned for revision.',
      };
    }

    throw new Error(`Unsupported manager decision '${decision}'`);
  });
}

/**
 * Handle finance second-level approval
 */
async function processFinanceDecision(quotationId, financeUser, decision, comments) {
  return await withTransaction(async (conn) => {
    const [quotes] = await conn.execute(
      `SELECT q.*, c.company_name as customer_name 
       FROM quotations q 
       JOIN customers c ON q.customer_id = c.id 
       WHERE q.id = ?`,
      [quotationId]
    );
    if (quotes.length === 0) throw new Error('Quotation not found');
    const quote = quotes[0];

    const [requests] = await conn.execute(
      `SELECT * FROM approval_requests 
       WHERE quotation_id = ? AND level = 'FINANCE' AND status = 'PENDING' 
       ORDER BY created_at DESC LIMIT 1`,
      [quotationId]
    );
    const reqId = requests.length > 0 ? requests[0].id : null;

    if (decision === 'APPROVE') {
      await conn.execute(
        `UPDATE quotations 
         SET status = 'APPROVED', approval_status = 'APPROVED', last_activity_at = NOW() 
         WHERE id = ?`,
        [quotationId]
      );

      if (reqId) {
        await conn.execute(
          `UPDATE approval_requests 
           SET status = 'APPROVED', resolved_at = NOW() 
           WHERE id = ?`,
          [reqId]
        );

        await conn.execute(
          `INSERT INTO approval_history 
           (approval_request_id, quotation_id, action_by, action, comments, previous_status, new_status)
           VALUES (?, ?, ?, 'APPROVE', ?, 'PENDING_FINANCE', 'APPROVED')`,
          [reqId, quotationId, financeUser.id, comments || 'Finance sign-off granted.']
        );
      }

      // Notify Rep
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES (?, ?, ?, 'APPROVAL_REQUIRED', ?)`,
        [
          quote.salesperson_id,
          `Finance Sign-off Approved: ${quote.quotation_number}`,
          `Finance Operations granted final approval for quotation. Deal can now proceed.`,
          `/sales/quotations/${quotationId}`,
        ]
      );

      await logAudit({
        quotationId,
        userId: financeUser.id,
        userRole: financeUser.role,
        action: 'FINANCE_APPROVED',
        oldValue: 'PENDING_FINANCE',
        newValue: 'APPROVED',
        reason: comments,
        connection: conn,
      });

      return {
        quotationId,
        status: 'APPROVED',
        approvalStatus: 'APPROVED',
        message: 'Finance sign-off complete. Quotation approved.',
      };
    } else {
      await conn.execute(
        `UPDATE quotations 
         SET status = 'REJECTED', approval_status = 'REJECTED', last_activity_at = NOW() 
         WHERE id = ?`,
        [quotationId]
      );

      if (reqId) {
        await conn.execute(
          `UPDATE approval_requests 
           SET status = 'REJECTED', resolved_at = NOW() 
           WHERE id = ?`,
          [reqId]
        );

        await conn.execute(
          `INSERT INTO approval_history 
           (approval_request_id, quotation_id, action_by, action, comments, previous_status, new_status)
           VALUES (?, ?, ?, 'REJECT', ?, 'PENDING_FINANCE', 'REJECTED')`,
          [reqId, quotationId, financeUser.id, comments || 'Finance sign-off rejected.']
        );
      }

      await logAudit({
        quotationId,
        userId: financeUser.id,
        userRole: financeUser.role,
        action: 'FINANCE_REJECTED',
        oldValue: 'PENDING_FINANCE',
        newValue: 'REJECTED',
        reason: comments,
        connection: conn,
      });

      return {
        quotationId,
        status: 'REJECTED',
        approvalStatus: 'REJECTED',
        message: 'Quotation rejected by Finance Operations.',
      };
    }
  });
}

module.exports = {
  submitForApproval,
  processManagerDecision,
  processFinanceDecision,
};
