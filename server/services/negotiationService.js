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

/**
 * Sales Rep responds to a customer counter-offer / negotiation request
 */
async function respondToCustomerNegotiation({
  quotationId,
  negotiationId = null,
  salesUser,
  action, // 'ACCEPT' | 'COUNTER' | 'REJECT'
  counterDiscountPct = null,
  responseMessage = '',
}) {
  return await withTransaction(async (conn) => {
    // 1. Fetch quotation
    const [quotes] = await conn.execute(
      `SELECT q.*, c.id as cust_id, c.company_name as customer_name, c.email as customer_email,
              u.id as salesperson_id, u.name as salesperson_name
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       JOIN users u ON q.salesperson_id = u.id
       WHERE q.id = ?`,
      [quotationId]
    );
    if (quotes.length === 0) throw new Error('Quotation not found');
    const quote = quotes[0];

    // 2. Fetch negotiation record
    let neg = null;
    if (negotiationId) {
      const [negs] = await conn.execute(`SELECT * FROM negotiations WHERE id = ? AND quotation_id = ?`, [negotiationId, quotationId]);
      if (negs.length > 0) neg = negs[0];
    }
    if (!neg) {
      const [negs] = await conn.execute(
        `SELECT * FROM negotiations WHERE quotation_id = ? ORDER BY created_at DESC LIMIT 1`,
        [quotationId]
      );
      if (negs.length > 0) neg = negs[0];
    }

    const previousTotal = parseFloat(quote.total_amount || 0);

    if (!neg) {
      const [ins] = await conn.execute(
        `INSERT INTO negotiations 
         (quotation_id, customer_id, salesperson_id, status, requested_discount_pct, previous_total, counter_total, notes)
         VALUES (?, ?, ?, 'OPEN', 0.00, ?, ?, 'Customer Negotiation Thread')`,
        [quotationId, quote.customer_id, quote.salesperson_id || 4, previousTotal, previousTotal]
      );
      const [newNegs] = await conn.execute(`SELECT * FROM negotiations WHERE id = ?`, [ins.insertId]);
      neg = newNegs[0];
    }
    let newQuotationStatus = quote.status;
    let newApprovalStatus = quote.approval_status;
    let commentText = responseMessage;

    if (action === 'ACCEPT') {
      const acceptedDiscount = neg ? parseFloat(neg.requested_discount_pct) : 0;

      // Apply customer's requested discount across items
      await conn.execute(
        `UPDATE quotation_items SET discount_pct = ? WHERE quotation_id = ?`,
        [acceptedDiscount, quotationId]
      );

      // Recalculate financials
      const fin = await calculateQuotationFinancials(quotationId, conn);

      // Mark negotiation ACCEPTED
      if (neg) {
        await conn.execute(
          `UPDATE negotiations SET status = 'ACCEPTED', updated_at = NOW() WHERE id = ?`,
          [neg.id]
        );
      }

      if (fin.requiredApprovalStatus !== 'NOT_REQUIRED') {
        newQuotationStatus = 'PENDING_APPROVAL';
        newApprovalStatus = 'PENDING_MANAGER';
      } else {
        newQuotationStatus = 'APPROVED';
        newApprovalStatus = 'APPROVED';
      }

      commentText = responseMessage || `Sales Rep ${salesUser.name || 'Bhagha'} accepted the customer's counter-offer of ${acceptedDiscount}% discount.`;

      // Log comment
      await conn.execute(
        `INSERT INTO negotiation_comments 
         (negotiation_id, quotation_id, user_id, author_role, comment_text, proposed_discount_pct)
         VALUES (?, ?, ?, 'SALES_REP', ?, ?)`,
        [neg ? neg.id : null, quotationId, salesUser.id, commentText, acceptedDiscount]
      );

      // Notify customer
      const [custUsers] = await conn.execute(
        `SELECT id FROM users WHERE customer_id = ? AND role = 'CUSTOMER' LIMIT 1`,
        [quote.customer_id]
      );
      if (custUsers.length > 0) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, type, link_url)
           VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
          [
            custUsers[0].id,
            `Counter-Offer Accepted: ${quote.quotation_number}`,
            `Gada Electronics has accepted your proposal! New total is ₹${fin.totalAmount.toLocaleString('en-IN')}.`,
            `/customer/quotations/${quotationId}`,
          ]
        );
      }
    } else if (action === 'COUNTER') {
      const discount = counterDiscountPct !== null ? parseFloat(counterDiscountPct) : 5;

      // Apply counter discount
      await conn.execute(
        `UPDATE quotation_items SET discount_pct = ? WHERE quotation_id = ?`,
        [discount, quotationId]
      );

      const fin = await calculateQuotationFinancials(quotationId, conn);

      // Mark previous negotiation as SUPERSEDED
      if (neg) {
        await conn.execute(
          `UPDATE negotiations SET status = 'SUPERSEDED', updated_at = NOW() WHERE id = ?`,
          [neg.id]
        );
      }

      // Create new negotiation entry
      const [newNeg] = await conn.execute(
        `INSERT INTO negotiations 
         (quotation_id, customer_id, salesperson_id, status, requested_discount_pct, previous_total, counter_total, notes)
         VALUES (?, ?, ?, 'OPEN', ?, ?, ?, ?)`,
        [
          quotationId,
          quote.customer_id,
          salesUser.id,
          discount,
          previousTotal,
          fin.totalAmount,
          responseMessage || `Sales Rep proposed revised terms of ${discount}% discount.`,
        ]
      );

      newQuotationStatus = 'UNDER_NEGOTIATION';
      commentText = responseMessage || `Sales Rep proposed a revised discount of ${discount}%. Total: ₹${fin.totalAmount.toLocaleString('en-IN')}.`;

      // Log comment
      await conn.execute(
        `INSERT INTO negotiation_comments 
         (negotiation_id, quotation_id, user_id, author_role, comment_text, proposed_discount_pct)
         VALUES (?, ?, ?, 'SALES_REP', ?, ?)`,
        [newNeg.insertId, quotationId, salesUser.id, commentText, discount]
      );

      // Notify customer
      const [custUsers] = await conn.execute(
        `SELECT id FROM users WHERE customer_id = ? AND role = 'CUSTOMER' LIMIT 1`,
        [quote.customer_id]
      );
      if (custUsers.length > 0) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, type, link_url)
           VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
          [
            custUsers[0].id,
            `Revised Offer from Gada Electronics: ${quote.quotation_number}`,
            `Sales Rep proposed ${discount}% discount. Review revised commercial terms now.`,
            `/customer/quotations/${quotationId}`,
          ]
        );
      }
    } else if (action === 'REJECT') {
      if (neg) {
        await conn.execute(
          `UPDATE negotiations SET status = 'REJECTED', updated_at = NOW() WHERE id = ?`,
          [neg.id]
        );
      }

      newQuotationStatus = 'SENT';
      commentText = responseMessage || `Sales Rep declined the counter-offer. Original commercial terms apply.`;

      // Log comment
      await conn.execute(
        `INSERT INTO negotiation_comments 
         (negotiation_id, quotation_id, user_id, author_role, comment_text)
         VALUES (?, ?, ?, 'SALES_REP', ?)`,
        [neg ? neg.id : null, quotationId, salesUser.id, commentText]
      );

      // Notify customer
      const [custUsers] = await conn.execute(
        `SELECT id FROM users WHERE customer_id = ? AND role = 'CUSTOMER' LIMIT 1`,
        [quote.customer_id]
      );
      if (custUsers.length > 0) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, type, link_url)
           VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
          [
            custUsers[0].id,
            `Counter-Offer Declined: ${quote.quotation_number}`,
            `Sales Rep was unable to accept requested discount: "${commentText}"`,
            `/customer/quotations/${quotationId}`,
          ]
        );
      }
    }

    // Update quotation
    await conn.execute(
      `UPDATE quotations SET status = ?, approval_status = ?, last_activity_at = NOW() WHERE id = ?`,
      [newQuotationStatus, newApprovalStatus, quotationId]
    );

    // Audit log
    await logAudit({
      quotationId,
      userId: salesUser.id,
      userRole: salesUser.role || 'SALES_REP',
      action: `SALES_REP_NEGOTIATION_${action}`,
      oldValue: quote.status,
      newValue: newQuotationStatus,
      reason: commentText,
      connection: conn,
    });

    return {
      success: true,
      action,
      quotationId,
      newQuotationStatus,
      newApprovalStatus,
      message: `Negotiation ${action.toLowerCase()}ed successfully. Customer notified.`,
    };
  });
}

/**
 * Add comment to negotiation thread
 */
async function addNegotiationComment({
  quotationId,
  negotiationId = null,
  user,
  commentText,
  quotationItemId = null,
}) {
  return await withTransaction(async (conn) => {
    const [quotes] = await conn.execute(
      `SELECT q.*, c.company_name FROM quotations q JOIN customers c ON q.customer_id = c.id WHERE q.id = ?`,
      [quotationId]
    );
    if (quotes.length === 0) throw new Error('Quotation not found');
    const quote = quotes[0];

    let negId = negotiationId;
    if (!negId) {
      const [negs] = await conn.execute(
        `SELECT id FROM negotiations WHERE quotation_id = ? ORDER BY created_at DESC LIMIT 1`,
        [quotationId]
      );
      if (negs.length > 0) {
        negId = negs[0].id;
      } else {
        const [ins] = await conn.execute(
          `INSERT INTO negotiations 
           (quotation_id, customer_id, salesperson_id, status, requested_discount_pct, previous_total, counter_total, notes)
           VALUES (?, ?, ?, 'OPEN', 0.00, ?, ?, 'Comment Thread')`,
          [quotationId, quote.customer_id, quote.salesperson_id || 4, parseFloat(quote.total_amount || 0), parseFloat(quote.total_amount || 0)]
        );
        negId = ins.insertId;
      }
    }

    const [commentRes] = await conn.execute(
      `INSERT INTO negotiation_comments 
       (negotiation_id, quotation_id, quotation_item_id, user_id, author_role, comment_text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [negId, quotationId, quotationItemId || null, user.id, user.role, commentText]
    );

    // Notify opposite party
    if (user.role === 'CUSTOMER') {
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
        [
          quote.salesperson_id,
          `New Comment on ${quote.quotation_number}`,
          `${quote.company_name}: "${commentText.slice(0, 100)}"`,
          `/sales/quotations/${quotationId}`,
        ]
      );
    } else {
      const [custUsers] = await conn.execute(
        `SELECT id FROM users WHERE customer_id = ? AND role = 'CUSTOMER' LIMIT 1`,
        [quote.customer_id]
      );
      if (custUsers.length > 0) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, type, link_url)
           VALUES (?, ?, ?, 'COUNTER_OFFER', ?)`,
          [
            custUsers[0].id,
            `Message from Sales Rep: ${quote.quotation_number}`,
            `${user.name || 'Sales Rep'}: "${commentText.slice(0, 100)}"`,
            `/customer/quotations/${quotationId}`,
          ]
        );
      }
    }

    return {
      success: true,
      commentId: commentRes.insertId,
      message: 'Comment posted.',
    };
  });
}

module.exports = {
  submitCustomerCounterOffer,
  confirmQuotationByCustomer,
  respondToCustomerNegotiation,
  addNegotiationComment,
};
