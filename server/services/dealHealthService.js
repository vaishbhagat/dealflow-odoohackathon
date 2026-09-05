const { query, withTransaction } = require('../config/db');

/**
 * Recalculate Deal Health score (0-100) and identify stalled deals / anomalies
 */
async function evaluateDealHealth(quotationId) {
  const [quotes] = await query(
    `SELECT q.*, c.company_name as customer_name,
            DATEDIFF(NOW(), q.last_activity_at) as days_inactive,
            DATEDIFF(NOW(), q.created_at) as quotation_age_days
     FROM quotations q
     JOIN customers c ON q.customer_id = c.id
     WHERE q.id = ?`,
    [quotationId]
  );
  if (quotes.length === 0) throw new Error('Quotation not found');
  const quote = quotes[0];

  let healthScore = 100;
  let inactivityDeduction = 0;
  let discountRiskDeduction = 0;
  let approvalDelayDeduction = 0;
  let deliverySlippageDeduction = 0;
  let negotiationDeduction = 0;
  const reasons = [];

  // 1. Inactivity Deduction
  const daysInactive = quote.days_inactive || 0;
  if (daysInactive >= 7) {
    inactivityDeduction = 25;
    reasons.push(`High customer inactivity (${daysInactive} days without interaction, -25 pts)`);
  } else if (daysInactive >= 3) {
    inactivityDeduction = 15;
    reasons.push(`Inactivity detected (${daysInactive} days idle, -15 pts)`);
  }
  healthScore -= inactivityDeduction;

  // 2. Discount Risk Deduction
  const riskScore = parseFloat(quote.risk_score || 0);
  if (riskScore > 10.0) {
    discountRiskDeduction = 20;
    reasons.push(`Severe discount margin compression (Risk score: ${riskScore.toFixed(1)}%, -20 pts)`);
  } else if (riskScore > 5.0) {
    discountRiskDeduction = 10;
    reasons.push(`Discount overage ceiling breach (Risk score: ${riskScore.toFixed(1)}%, -10 pts)`);
  }
  healthScore -= discountRiskDeduction;

  // 3. Approval Delay Deduction
  if (quote.status === 'PENDING_APPROVAL' && daysInactive >= 2) {
    approvalDelayDeduction = 10;
    reasons.push(`Approval turnaround delayed (${daysInactive} days in queue, -10 pts)`);
  }
  healthScore -= approvalDelayDeduction;

  // 4. Negotiation frequency
  const [negCountRows] = await query(
    `SELECT COUNT(*) as count FROM negotiations WHERE quotation_id = ?`,
    [quotationId]
  );
  const negCount = negCountRows[0].count;
  if (negCount >= 2) {
    negotiationDeduction = 10;
    reasons.push(`Repeated counter-negotiation rounds (${negCount} cycles, -10 pts)`);
  }
  healthScore -= negotiationDeduction;

  // 5. Delivery promise slippage check
  const [fOrders] = await query(
    `SELECT * FROM fulfillment_orders WHERE quotation_id = ?`,
    [quotationId]
  );
  if (fOrders.length > 0) {
    const fo = fOrders[0];
    if (fo.expected_delivery_date && new Date(fo.expected_delivery_date) < new Date() && fo.status !== 'DELIVERED') {
      deliverySlippageDeduction = 20;
      reasons.push('Fulfillment delivery promise has slipped past expected date (-20 pts)');
      healthScore -= deliverySlippageDeduction;
    }
  }

  // Bound health score between 0 and 100
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Determine Status
  let healthStatus = 'HEALTHY';
  if (healthScore < 40) {
    healthStatus = 'CRITICAL';
  } else if (healthScore < 70) {
    healthStatus = 'AT_RISK';
  }

  const explanation = reasons.length > 0 ? reasons.join('; ') : 'Deal is progressing smoothly on standard timelines.';

  // Upsert into deal_health table
  await query(
    `INSERT INTO deal_health 
     (quotation_id, health_score, status, inactivity_deduction, discount_risk_deduction, approval_delay_deduction, delivery_slippage_deduction, negotiation_deduction, explanation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       health_score = VALUES(health_score),
       status = VALUES(status),
       inactivity_deduction = VALUES(inactivity_deduction),
       discount_risk_deduction = VALUES(discount_risk_deduction),
       approval_delay_deduction = VALUES(approval_delay_deduction),
       delivery_slippage_deduction = VALUES(delivery_slippage_deduction),
       negotiation_deduction = VALUES(negotiation_deduction),
       explanation = VALUES(explanation),
       calculated_at = NOW()`,
    [
      quotationId,
      healthScore,
      healthStatus,
      inactivityDeduction,
      discountRiskDeduction,
      approvalDelayDeduction,
      deliverySlippageDeduction,
      negotiationDeduction,
      explanation,
    ]
  );

  // Check for Discount Anomaly against salesperson's historical average
  await checkDiscountAnomaly(quote);

  // Auto-generate follow-up if deal health is poor
  if (healthScore < 50) {
    await autoTriggerHealthFollowUp(quote, healthScore, explanation);
  }

  return {
    quotationId,
    healthScore,
    healthStatus,
    inactivityDeduction,
    discountRiskDeduction,
    approvalDelayDeduction,
    deliverySlippageDeduction,
    negotiationDeduction,
    explanation,
    daysInactive,
  };
}

/**
 * Check if quotation discount deviates significantly from sales rep's historical average
 */
async function checkDiscountAnomaly(quote) {
  const [historical] = await query(
    `SELECT AVG(qi.discount_pct) as avg_rep_discount
     FROM quotations q
     JOIN quotation_items qi ON q.id = qi.quotation_id
     WHERE q.salesperson_id = ? AND q.id != ?`,
    [quote.salesperson_id, quote.id]
  );

  const repAvg = parseFloat(historical[0].avg_rep_discount || 7.0);

  // Current quote average discount
  const [currentQuoteDiscount] = await query(
    `SELECT AVG(discount_pct) as current_avg_discount FROM quotation_items WHERE quotation_id = ?`,
    [quote.id]
  );
  const currentAvg = parseFloat(currentQuoteDiscount[0].current_avg_discount || 0);

  if (currentAvg > repAvg + 5.0) {
    const desc = `Quotation average discount (${currentAvg.toFixed(1)}%) significantly exceeds salesperson historical baseline (${repAvg.toFixed(1)}%). Possible anomaly.`;
    await query(
      `INSERT INTO anomalies (quotation_id, salesperson_id, anomaly_type, description, severity)
       VALUES (?, ?, 'HIGH_DISCOUNT', ?, 'HIGH')
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [quote.id, quote.salesperson_id, desc]
    );
  }
}

/**
 * Automatically schedule urgent follow-up when deal health is degraded
 */
async function autoTriggerHealthFollowUp(quote, healthScore, explanation) {
  const [existingFollowUps] = await query(
    `SELECT id FROM follow_ups 
     WHERE quotation_id = ? AND status = 'PENDING' AND reason LIKE '%Deal health%'`,
    [quote.id]
  );

  if (existingFollowUps.length === 0) {
    await query(
      `INSERT INTO follow_ups 
       (quotation_id, customer_id, salesperson_id, title, reason, priority, due_date, status)
       VALUES (?, ?, ?, ?, ?, 'URGENT', CURDATE(), 'PENDING')`,
      [
        quote.id,
        quote.customer_id,
        quote.salesperson_id,
        `Urgent Customer Contact: ${quote.quotation_number}`,
        `Deal health dropped to ${healthScore}/100. ${explanation}`,
      ]
    );
  }
}

module.exports = {
  evaluateDealHealth,
};
