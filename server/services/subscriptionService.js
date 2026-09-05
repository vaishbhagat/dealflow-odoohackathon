const { query, withTransaction } = require('../config/db');
const { logAudit } = require('./auditService');

/**
 * Generate invoice and activate subscriptions from confirmed quotation
 */
async function generateInvoiceFromQuotation(quotationId, userId) {
  return await withTransaction(async (conn) => {
    // 1. Fetch quotation
    const [quotes] = await conn.execute(
      `SELECT q.*, c.id as customer_id, c.company_name as customer_name 
       FROM quotations q 
       JOIN customers c ON q.customer_id = c.id 
       WHERE q.id = ?`,
      [quotationId]
    );
    if (quotes.length === 0) throw new Error('Quotation not found');
    const quote = quotes[0];

    // Check if invoice already exists
    const [existingInvoices] = await conn.execute(
      `SELECT * FROM invoices WHERE quotation_id = ?`,
      [quotationId]
    );
    if (existingInvoices.length > 0) {
      return {
        invoiceId: existingInvoices[0].id,
        invoiceNumber: existingInvoices[0].invoice_number,
        totalAmount: existingInvoices[0].total_amount,
        status: existingInvoices[0].payment_status,
        message: 'Invoice already generated for this quotation.',
      };
    }

    // 2. Fetch quotation items
    const [items] = await conn.execute(
      `SELECT qi.*, p.name as product_name, p.product_type 
       FROM quotation_items qi 
       JOIN products p ON qi.product_id = p.id 
       WHERE qi.quotation_id = ?`,
      [quotationId]
    );

    // 3. Create Invoice
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    const [invResult] = await conn.execute(
      `INSERT INTO invoices 
       (invoice_number, quotation_id, customer_id, subtotal, discount_amount, tax_amount, total_amount, due_amount, payment_status, invoice_status, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNPAID', 'ISSUED', ?)`,
      [
        invoiceNumber,
        quotationId,
        quote.customer_id,
        quote.subtotal,
        quote.total_discount,
        quote.tax_amount,
        quote.total_amount,
        quote.total_amount,
        dueDate,
      ]
    );
    const invoiceId = invResult.insertId;

    // 4. Create Invoice Items
    for (const item of items) {
      await conn.execute(
        `INSERT INTO invoice_items 
         (invoice_id, quotation_item_id, description, quantity, unit_price, discount_amount, tax_amount, total_amount, item_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          item.id,
          `${item.product_name} (${item.billing_interval || 'ONE_TIME'})`,
          item.quantity,
          item.unit_price,
          item.discount_amount,
          item.tax_amount,
          item.line_total,
          item.item_type,
        ]
      );

      // 5. If item is a recurring subscription, activate subscription and generate schedule
      if (item.item_type === 'SUBSCRIPTION') {
        const interval = item.billing_interval || 'YEARLY';
        const startDate = new Date();
        const periodEnd = new Date(startDate);

        if (interval === 'MONTHLY') {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else if (interval === 'QUARTERLY') {
          periodEnd.setMonth(periodEnd.getMonth() + 3);
        } else {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }

        // Find or associate subscription plan
        const [plans] = await conn.execute(
          `SELECT id FROM subscription_plans WHERE product_id = ? AND billing_interval = ? LIMIT 1`,
          [item.product_id, interval]
        );
        const planId = plans.length > 0 ? plans[0].id : 3; // Fallback to yearly plan

        const [subResult] = await conn.execute(
          `INSERT INTO subscriptions 
           (quotation_id, customer_id, plan_id, status, billing_interval, recurring_amount, start_date, current_period_start, current_period_end, next_billing_date)
           VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?)`,
          [
            quotationId,
            quote.customer_id,
            planId,
            interval,
            item.line_total,
            startDate,
            startDate,
            periodEnd,
            periodEnd,
          ]
        );
        const subId = subResult.insertId;

        // Generate upcoming billing schedule records (e.g. Next 3 cycles)
        const cyclesToGenerate = interval === 'MONTHLY' ? 6 : interval === 'QUARTERLY' ? 4 : 2;
        let scheduleDate = new Date(periodEnd);

        for (let c = 1; c <= cyclesToGenerate; c++) {
          await conn.execute(
            `INSERT INTO subscription_billing_schedule 
             (subscription_id, quotation_id, billing_date, amount, status)
             VALUES (?, ?, ?, ?, 'SCHEDULED')`,
            [subId, quotationId, scheduleDate, item.line_total]
          );

          // Advance date
          if (interval === 'MONTHLY') {
            scheduleDate.setMonth(scheduleDate.getMonth() + 1);
          } else if (interval === 'QUARTERLY') {
            scheduleDate.setMonth(scheduleDate.getMonth() + 3);
          } else {
            scheduleDate.setFullYear(scheduleDate.getFullYear() + 1);
          }
        }
      }
    }

    // 6. Update quotation status to INVOICED
    await conn.execute(
      `UPDATE quotations 
       SET status = 'INVOICED', last_activity_at = NOW() 
       WHERE id = ?`,
      [quotationId]
    );

    // 7. Audit log
    await logAudit({
      quotationId,
      userId,
      userRole: 'FINANCE_OPERATIONS',
      action: 'INVOICE_GENERATED',
      oldValue: quote.status,
      newValue: 'INVOICED',
      reason: `Invoice ${invoiceNumber} issued for amount ₹${quote.total_amount}. Subscriptions scheduled.`,
      connection: conn,
    });

    return {
      success: true,
      invoiceId,
      invoiceNumber,
      totalAmount: quote.total_amount,
      dueDate,
      message: `Invoice ${invoiceNumber} created and recurring schedules activated.`,
    };
  });
}

/**
 * Calculate mid-cycle proration adjustment for subscription upgrade/downgrade
 */
function calculateProration({
  currentPlanPrice,
  newPlanPrice,
  cycleTotalDays = 30,
  daysRemaining = 15,
}) {
  const unusedCredit = (currentPlanPrice / cycleTotalDays) * daysRemaining;
  const newPlanProratedCost = (newPlanPrice / cycleTotalDays) * daysRemaining;
  const netAdjustment = newPlanProratedCost - unusedCredit;

  return {
    unusedCredit: Math.round(unusedCredit * 100) / 100,
    newPlanProratedCost: Math.round(newPlanProratedCost * 100) / 100,
    netAdjustment: Math.round(netAdjustment * 100) / 100,
    adjustmentType: netAdjustment >= 0 ? 'PRORATION_DEBIT' : 'PRORATION_CREDIT',
  };
}

/**
 * Cancel an active subscription and automatically compute/issue a proration credit note or refund
 */
async function cancelSubscription(subscriptionId, reason = 'Customer requested cancellation', userId) {
  return await withTransaction(async (conn) => {
    const [subs] = await conn.execute(
      `SELECT s.*, sp.plan_name, sp.refund_rule, sp.cancellation_rule, c.company_name as customer_name
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       JOIN customers c ON s.customer_id = c.id
       WHERE s.id = ?`,
      [subscriptionId]
    );

    if (subs.length === 0) throw new Error('Subscription not found');
    const sub = subs[0];

    if (sub.status === 'CANCELLED') {
      return { success: false, message: 'Subscription is already cancelled.' };
    }

    // Calculate prorated unused amount based on billing interval
    const cycleTotalDays = sub.billing_interval === 'MONTHLY' ? 30 : sub.billing_interval === 'QUARTERLY' ? 90 : 365;
    const now = new Date();
    const periodEnd = new Date(sub.current_period_end);
    const msRemaining = periodEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    const refundAmount = Math.round(((parseFloat(sub.recurring_amount) / cycleTotalDays) * daysRemaining) * 100) / 100;

    // 1. Update subscription status
    await conn.execute(
      `UPDATE subscriptions SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?`,
      [subscriptionId]
    );

    // 2. Cancel all future scheduled billing cycles
    await conn.execute(
      `UPDATE subscription_billing_schedule SET status = 'CANCELLED' WHERE subscription_id = ? AND status = 'SCHEDULED'`,
      [subscriptionId]
    );

    // 3. Issue credit note / refund record in billing_adjustments
    let adjustmentId = null;
    if (refundAmount > 0) {
      const [adjResult] = await conn.execute(
        `INSERT INTO billing_adjustments (subscription_id, customer_id, adjustment_type, amount, reason)
         VALUES (?, ?, 'REFUND', ?, ?)`,
        [
          subscriptionId,
          sub.customer_id,
          refundAmount,
          `Cancellation Proration Credit Note: ${daysRemaining} unused days remaining in ${sub.billing_interval} cycle. (${reason})`,
        ]
      );
      adjustmentId = adjResult.insertId;
    }

    // 4. Log audit trail
    await logAudit({
      quotationId: sub.quotation_id,
      userId,
      userRole: 'FINANCE_OPERATIONS',
      action: 'SUBSCRIPTION_CANCELLED',
      oldValue: `ACTIVE (${sub.plan_name})`,
      newValue: 'CANCELLED',
      reason: `Cancelled ${sub.plan_name}. Issued credit note / refund of ₹${refundAmount} for ${daysRemaining} unused days. Reason: ${reason}`,
      connection: conn,
    });

    return {
      success: true,
      subscriptionId,
      refundAmount,
      daysRemaining,
      adjustmentId,
      message: `Subscription cancelled. Automatic proration refund / credit note of ₹${refundAmount.toLocaleString()} generated.`,
    };
  });
}

/**
 * Modify subscription plan / quantity mid-cycle with proration
 */
async function modifySubscription({ subscriptionId, newPlanId, newAmount, userId }) {
  return await withTransaction(async (conn) => {
    const [subs] = await conn.execute(
      `SELECT s.*, sp.plan_name, sp.price as old_price, c.company_name as customer_name
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       JOIN customers c ON s.customer_id = c.id
       WHERE s.id = ?`,
      [subscriptionId]
    );

    if (subs.length === 0) throw new Error('Subscription not found');
    const sub = subs[0];

    const [newPlans] = await conn.execute(`SELECT * FROM subscription_plans WHERE id = ?`, [newPlanId]);
    if (newPlans.length === 0) throw new Error('Target plan not found');
    const newPlan = newPlans[0];

    const newRecurringAmount = newAmount !== undefined ? parseFloat(newAmount) : parseFloat(newPlan.price);

    const proration = calculateProration({
      currentPlanPrice: parseFloat(sub.recurring_amount),
      newPlanPrice: newRecurringAmount,
      cycleTotalDays: sub.billing_interval === 'MONTHLY' ? 30 : 90,
      daysRemaining: 15,
    });

    // 1. Update subscription
    await conn.execute(
      `UPDATE subscriptions 
       SET plan_id = ?, billing_interval = ?, recurring_amount = ?, status = 'UPGRADED', updated_at = NOW() 
       WHERE id = ?`,
      [newPlan.id, newPlan.billing_interval, newRecurringAmount, subscriptionId]
    );

    // 2. Insert adjustment
    await conn.execute(
      `INSERT INTO billing_adjustments (subscription_id, customer_id, adjustment_type, amount, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [
        subscriptionId,
        sub.customer_id,
        proration.adjustmentType,
        Math.abs(proration.netAdjustment),
        `Plan adjustment from ${sub.plan_name} to ${newPlan.plan_name} (Prorated net adjustment: ₹${proration.netAdjustment})`,
      ]
    );

    // 3. Update scheduled cycles with new amount
    await conn.execute(
      `UPDATE subscription_billing_schedule SET amount = ? WHERE subscription_id = ? AND status = 'SCHEDULED'`,
      [newRecurringAmount, subscriptionId]
    );

    // 4. Audit
    await logAudit({
      quotationId: sub.quotation_id,
      userId,
      userRole: 'FINANCE_OPERATIONS',
      action: 'SUBSCRIPTION_MODIFIED',
      oldValue: `${sub.plan_name} (₹${sub.recurring_amount})`,
      newValue: `${newPlan.plan_name} (₹${newRecurringAmount})`,
      reason: `Mid-cycle plan adjustment. Prorated net difference: ₹${proration.netAdjustment}`,
      connection: conn,
    });

    return {
      success: true,
      subscriptionId,
      proration,
      newRecurringAmount,
      message: `Subscription successfully updated to ${newPlan.plan_name}. Proration adjustment recorded.`,
    };
  });
}

/**
 * Get all configured subscription plans
 */
async function getSubscriptionPlans() {
  return await query(
    `SELECT sp.*, p.name as product_name, p.sku as product_sku
     FROM subscription_plans sp
     JOIN products p ON sp.product_id = p.id
     ORDER BY sp.id ASC`
  );
}

/**
 * Save subscription plan
 */
async function saveSubscriptionPlan(plan) {
  const { id, productId, planName, billingInterval, price, cancellationRule, refundRule } = plan;

  if (id) {
    await query(
      `UPDATE subscription_plans 
       SET product_id = ?, plan_name = ?, billing_interval = ?, price = ?,
           cancellation_rule = ?, refund_rule = ?
       WHERE id = ?`,
      [productId, planName, billingInterval, parseFloat(price), cancellationRule, refundRule, id]
    );
    return { success: true, message: 'Subscription plan updated.' };
  }

  const result = await query(
    `INSERT INTO subscription_plans (product_id, plan_name, billing_interval, price, cancellation_rule, refund_rule, active)
     VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
    [productId, planName, billingInterval, parseFloat(price), cancellationRule || 'Standard notice', refundRule || 'Prorated refund']
  );

  return { success: true, planId: result.insertId, message: 'Subscription plan created.' };
}

module.exports = {
  generateInvoiceFromQuotation,
  calculateProration,
  cancelSubscription,
  modifySubscription,
  getSubscriptionPlans,
  saveSubscriptionPlan,
};
