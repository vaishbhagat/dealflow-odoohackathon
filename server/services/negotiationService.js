const { query, withTransaction } = require('../config/db');
const { calculateQuotationFinancials } = require('./discountRiskService');
const { logAudit } = require('./auditService');

/**
 * Handle customer line negotiation comment or counter-offer
 */
async function submitCustomerCounterOffer({
  quotationId,
  customerUser,
  requestedDiscountPct,
  commentText,
  targetItemId = null,
}) {
  return await withTransaction(async (conn) => {
    // 1. Fetch quotation ensuring customer isolation
    const [quotes] = await conn.execute(
      `SELECT q.*, c.id as cust_id, c.company_name as customer_name, c.customer_tier,
              u.id as salesperson_id, u.name as salesperson_name
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       JOIN users u ON q.salesperson_id = u.id
       WHERE q.id = ?`,
      [quotationId]
    );

    if (quotes.length === 0) throw new Error('Quotation not found');
    const quote = quotes[0];

    if (customerUser.customer_id && quote.customer_id !== customerUser.customer_id) {
      throw new Error('Unauthorized: You cannot negotiate on another customer\'s quotation');
    }

    const previousTotal = parseFloat(quote.total_amount);

    // 2. If targetItemId provided, update that line's discount
    if (targetItemId && requestedDiscountPct !== undefined) {
      await conn.execute(
        `UPDATE quotation_items 
         SET discount_pct = ? 
         WHERE id = ? AND quotation_id = ?`,
        [requestedDiscountPct, targetItemId, quotationId]
      );
    } else if (requestedDiscountPct !== undefined) {
      // Apply requested discount proportionally or to all lines
      await conn.execute(
        `UPDATE quotation_items 
         SET discount_pct = ? 
         WHERE quotation_id = ?`,
        [requestedDiscountPct, quotationId]
      );
    }

    // 3. Recalculate quotation financials and risk
    const fin = await calculateQuotationFinancials(quotationId, conn);

    // 4. Create negotiation master record
    const [negResult] = await conn.execute(
      `INSERT INTO negotiations 
       (quotation_id, customer_id, salesperson_id, status, requested_discount_pct, previous_total, counter_total, notes)
       VALUES (?, ?, ?, 'OPEN', ?, ?, ?, ?)`,
      [
        quotationId,
        quote.customer_id,
        quote.salesperson_id,
        requestedDiscountPct || 0,
        previousTotal,
        fin.totalAmount,
        commentText || 'Customer proposed revised commercial terms.',
      ]
    );
    const negotiationId = negResult.insertId;

    // 5. Create line comment record
    await conn.execute(
      `INSERT INTO negotiation_comments 
       (negotiation_id, quotation_id, quotation_item_id, user_id, author_role, comment_text, proposed_discount_pct)
       VALUES (?, ?, ?, ?, 'CUSTOMER', ?, ?)`,
      [
        negotiationId,
        quotationId,
        targetItemId,
        customerUser.id,
        commentText || `Requested discount adjusted to ${requestedDiscountPct}%`,
        requestedDiscountPct,
      ]
    );

    // 6. Check if approval is triggered by customer's new requested discount!
    let newQuotationStatus = 'UNDER_NEGOTIATION';
    let newApprovalStatus = quote.approval_status;
    let routingMessage = 'Your counter-offer has been sent to your Gada Electronics sales representative.';

    if (fin.requiredApprovalStatus !== 'NOT_REQUIRED') {
      newQuotationStatus = 'PENDING_APPROVAL';
      newApprovalStatus = 'PENDING_MANAGER';
      routingMessage = 'Your requested counter terms exceed standard policy ceilings and are now undergoing managerial review.';

      // Create new approval request for Manager
      await conn.execute(
        `INSERT INTO approval_requests 
         (quotation_id, requested_by, level, status, risk_score, risk_summary)
         VALUES (?, ?, 'MANAGER', 'PENDING', ?, ?)`,
        [
          quotationId,
          quote.salesperson_id,
          fin.blendedRiskScore,
          `Customer Counter-Offer: ${customerUser.name} requested ${requestedDiscountPct}% discount. Exceeds ceiling: ${fin.riskReason}`,
        ]
      );

      // Notify Sales Manager
      const [managers] = await conn.execute(
        `SELECT id FROM users WHERE role = 'SALES_MANAGER' AND active = TRUE LIMIT 1`
      );
      if (managers.length > 0) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, type, link_url)
           VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
          [
            managers[0].id,
            `Customer Counter-Offer Requires Approval: ${quote.quotation_number}`,
            `${quote.customer_name} countered with ${requestedDiscountPct}% discount. Recalculated risk: ${fin.blendedRiskScore.toFixed(1)}%.`,
            `/manager/approvals`,
          ]
        );
      }
    }

    // Update quotation status
    await conn.execute(
      `UPDATE quotations 
       SET status = ?, approval_status = ?, last_activity_at = NOW() 
       WHERE id = ?`,
      [newQuotationStatus, newApprovalStatus, quotationId]
    );

    // Notify Salesperson
    await conn.execute(
      `INSERT INTO notifications (user_id, title, message, type, link_url)
       VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
      [
        quote.salesperson_id,
        `Customer Counter-Offer Received: ${quote.quotation_number}`,
        `${quote.customer_name} submitted a counter-proposal: "${commentText || requestedDiscountPct + '% requested'}"`,
        `/sales/quotations/${quotationId}`,
      ]
    );

    // Audit log
    await logAudit({
      quotationId,
      userId: customerUser.id,
      userRole: 'CUSTOMER',
      action: 'CUSTOMER_COUNTERED',
      oldValue: `Total: ₹${previousTotal.toFixed(2)}`,
      newValue: `Counter Total: ₹${fin.totalAmount.toFixed(2)} (Req Discount: ${requestedDiscountPct}%)`,
      reason: commentText,
      connection: conn,
    });

    return {
      success: true,
      quotationId,
      newQuotationStatus,
      newApprovalStatus,
      previousTotal,
      counterTotal: fin.totalAmount,
      blendedRiskScore: fin.blendedRiskScore,
      riskReason: fin.riskReason,
      message: routingMessage,
    };
  });
}

/**
 * Customer confirms the quotation terms
 */
async function confirmQuotationByCustomer(quotationId, customerUser) {
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

    if (customerUser.customer_id && quote.customer_id !== customerUser.customer_id) {
      throw new Error('Unauthorized');
    }

    // Verify financials
    const fin = await calculateQuotationFinancials(quotationId, conn);

    let nextStatus = 'FULFILLMENT';
    if (fin.requiredApprovalStatus !== 'NOT_REQUIRED' && quote.approval_status !== 'APPROVED') {
      nextStatus = 'PENDING_APPROVAL';
    }

    await conn.execute(
      `UPDATE quotations 
       SET status = ?, last_activity_at = NOW() 
       WHERE id = ?`,
      [nextStatus, quotationId]
    );

    // Notify salesperson
    await conn.execute(
      `INSERT INTO notifications (user_id, title, message, type, link_url)
       VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
      [
        quote.salesperson_id,
        `Quotation Confirmed: ${quote.quotation_number}`,
        `${quote.customer_name} has officially accepted and confirmed the quotation.`,
        `/sales/quotations/${quotationId}`,
      ]
    );

    await logAudit({
      quotationId,
      userId: customerUser.id,
      userRole: 'CUSTOMER',
      action: 'CUSTOMER_CONFIRMED',
      oldValue: quote.status,
      newValue: nextStatus,
      reason: 'Customer agreed to commercial terms and confirmed the order.',
      connection: conn,
    });

    return {
      success: true,
      quotationId,
      status: nextStatus,
      message:
        nextStatus === 'FULFILLMENT'
          ? 'Quotation confirmed! Order has moved to fulfillment.'
          : 'Quotation confirmed! Final managerial approval required before fulfillment.',
    };
  });
}

module.exports = {
  submitCustomerCounterOffer,
  confirmQuotationByCustomer,
};
