const { query } = require('../config/db');
const {
  generateInvoiceFromQuotation,
  calculateProration,
} = require('../services/subscriptionService');

/**
 * List all active subscriptions and recurring schedules
 */
async function getSubscriptions(req, res) {
  try {
    let sql = `
      SELECT s.*, sp.plan_name, p.name as product_name, p.sku,
             c.company_name as customer_name, q.quotation_number
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      JOIN products p ON sp.product_id = p.id
      JOIN customers c ON s.customer_id = c.id
      JOIN quotations q ON s.quotation_id = q.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'CUSTOMER') {
      sql += ' AND s.customer_id = ?';
      params.push(req.user.customer_id);
    }

    sql += ' ORDER BY s.next_billing_date ASC';
    const subscriptions = await query(sql, params);

    // Fetch billing schedules
    for (const sub of subscriptions) {
      const schedules = await query(
        `SELECT * FROM subscription_billing_schedule WHERE subscription_id = ? ORDER BY billing_date ASC`,
        [sub.id]
      );
      sub.schedules = schedules;
    }

    res.json({ success: true, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Trigger invoice generation and recurring schedule creation from confirmed quotation
 */
async function generateInvoice(req, res) {
  try {
    const { quotationId } = req.params;
    const result = await generateInvoiceFromQuotation(quotationId, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Compute proration adjustment preview
 */
function getProrationPreview(req, res) {
  try {
    const { currentPlanPrice, newPlanPrice, cycleTotalDays, daysRemaining } = req.body;
    const proration = calculateProration({
      currentPlanPrice: parseFloat(currentPlanPrice),
      newPlanPrice: parseFloat(newPlanPrice),
      cycleTotalDays: parseInt(cycleTotalDays || 30, 10),
      daysRemaining: parseInt(daysRemaining || 15, 10),
    });
    res.json({ success: true, proration });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get configured subscription plans
 */
async function getPlans(req, res) {
  try {
    const plans = await query(
      `SELECT sp.*, p.name as product_name, p.sku as product_sku
       FROM subscription_plans sp
       JOIN products p ON sp.product_id = p.id
       ORDER BY sp.id ASC`
    );
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Save (create or update) subscription plan
 */
async function savePlan(req, res) {
  try {
    const productId = req.body.productId || req.body.product_id || 1;
    const planName = req.body.planName || req.body.plan_name || req.body.name;
    const billingInterval = req.body.billingInterval || req.body.billing_interval || 'YEARLY';
    const price = req.body.price;
    const cancellationRule = req.body.cancellationRule || req.body.cancellation_rule || 'PRORATED';
    const refundRule = req.body.refundRule || req.body.refund_rule || 'WALLET_CREDIT';
    const id = req.body.id;

    if (!planName || !billingInterval || price === undefined || price === '') {
      return res.status(400).json({ success: false, error: 'Plan name, interval, and price are required.' });
    }

    const { saveSubscriptionPlan } = require('../services/subscriptionService');
    const result = await saveSubscriptionPlan({
      id,
      productId,
      planName,
      billingInterval,
      price: parseFloat(price),
      cancellationRule,
      refundRule,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Cancel subscription with automatic refund / credit note
 */
async function cancelSub(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { cancelSubscription } = require('../services/subscriptionService');
    const result = await cancelSubscription(id, reason, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Modify active subscription plan / pricing mid-cycle
 */
async function modifySub(req, res) {
  try {
    const { id } = req.params;
    const { newPlanId, newAmount } = req.body;
    const { modifySubscription } = require('../services/subscriptionService');
    const result = await modifySubscription({
      subscriptionId: id,
      newPlanId,
      newAmount,
      userId: req.user.id,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get billing adjustments / credit notes
 */
async function getAdjustments(req, res) {
  try {
    const adjustments = await query(
      `SELECT ba.*, c.company_name as customer_name, sp.plan_name
       FROM billing_adjustments ba
       JOIN customers c ON ba.customer_id = c.id
       LEFT JOIN subscriptions s ON ba.subscription_id = s.id
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
       ORDER BY ba.created_at DESC`
    );
    res.json({ success: true, adjustments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getSubscriptions,
  generateInvoice,
  getProrationPreview,
  getPlans,
  savePlan,
  cancelSub,
  modifySub,
  getAdjustments,
};
