const { query } = require('../config/db');

/**
 * Recalculate quotation line totals, margins, taxes, discount overages, and blended risk score
 */
async function calculateQuotationFinancials(quotationId, connection = null) {
  const executeQuery = async (sql, params) => {
    if (connection) {
      const [rows] = await connection.execute(sql, params);
      return rows;
    }
    return await query(sql, params);
  };

  // 1. Fetch quotation with customer tier
  const quotes = await executeQuery(
    `SELECT q.*, c.customer_tier, c.company_name as customer_name
     FROM quotations q
     JOIN customers c ON q.customer_id = c.id
     WHERE q.id = ?`,
    [quotationId]
  );

  if (quotes.length === 0) {
    throw new Error(`Quotation with ID ${quotationId} not found`);
  }
  const quote = quotes[0];
  const customerTier = quote.customer_tier || 'BRONZE';

  // 2. Fetch discount rules (Tier limits and Category ceilings)
  const tierRules = await executeQuery(
    `SELECT target_tier, max_discount_pct FROM discount_rules WHERE (rule_type = 'TIER' OR rule_type = 'CUSTOMER_TIER') AND active = TRUE`
  );
  const tierLimitMap = {};
  tierRules.forEach((r) => {
    tierLimitMap[r.target_tier] = parseFloat(r.max_discount_pct);
  });
  const customerTierLimit = tierLimitMap[customerTier] || 5.0;

  // 3. Fetch items with product and category info
  const items = await executeQuery(
    `SELECT qi.*, p.name as product_name, p.selling_price as default_selling_price,
            p.cost_price as default_cost_price, p.tax_percentage as default_tax_pct,
            p.category_id, cat.name as category_name, cat.discount_ceiling_pct as category_ceiling_pct
     FROM quotation_items qi
     JOIN products p ON qi.product_id = p.id
     JOIN categories cat ON p.category_id = cat.id
     WHERE qi.quotation_id = ?`,
    [quotationId]
  );

  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let totalAmount = 0;
  let totalCost = 0;
  let weightedRiskNumerator = 0;
  let worstLineOverage = 0;
  const violationReasons = [];

  for (const item of items) {
    const qty = parseInt(item.quantity, 10);
    const unitPrice = parseFloat(item.unit_price);
    const costPrice = parseFloat(item.cost_price);
    const discountPct = parseFloat(item.discount_pct || 0);
    const taxPct = parseFloat(item.tax_pct !== undefined && item.tax_pct !== null ? item.tax_pct : (item.default_tax_pct || 18.0));
    // Effective allowed discount ceiling: min of customer tier ceiling and product category ceiling
    const allowedDiscountPct = Math.min(customerTierLimit, categoryCeiling);

    // Calculate line overage
    const discountOveragePct = Math.max(0, discountPct - allowedDiscountPct);
    if (discountOveragePct > worstLineOverage) {
      worstLineOverage = discountOveragePct;
    }

    if (discountOveragePct > 0) {
      violationReasons.push(
        `${item.product_name} exceeds ${item.category_name} discount ceiling of ${allowedDiscountPct.toFixed(1)}% by ${discountOveragePct.toFixed(1)}%`
      );
    }

    // Line financial calculations
    const lineGross = qty * unitPrice;
    const lineDiscountAmount = lineGross * (discountPct / 100);
    const lineNet = lineGross - lineDiscountAmount;
    const lineTaxAmount = lineNet * (taxPct / 100);
    const lineTotal = lineNet + lineTaxAmount;
    const lineCost = qty * costPrice;

    subtotal += lineGross;
    totalDiscount += lineDiscountAmount;
    totalTax += lineTaxAmount;
    totalAmount += lineTotal;
    totalCost += lineCost;

    weightedRiskNumerator += discountOveragePct * lineNet;

    // Update item line calculations in DB
    await executeQuery(
      `UPDATE quotation_items 
       SET discount_amount = ?, tax_amount = ?, line_total = ?,
           allowed_discount_pct = ?, discount_overage_pct = ?, line_risk_score = ?
       WHERE id = ?`,
      [
        lineDiscountAmount.toFixed(2),
        lineTaxAmount.toFixed(2),
        lineTotal.toFixed(2),
        allowedDiscountPct.toFixed(2),
        discountOveragePct.toFixed(2),
        discountOveragePct.toFixed(2),
        item.id,
      ]
    );
  }

  // Blended weighted risk calculation
  const totalNetValue = subtotal - totalDiscount;
  let blendedRiskScore = 0;
  if (totalNetValue > 0) {
    blendedRiskScore = weightedRiskNumerator / totalNetValue;
  }

  // Margin calculations
  const marginAmount = totalNetValue - totalCost;
  const marginPct = totalNetValue > 0 ? (marginAmount / totalNetValue) * 100 : 0;

  // Determine Risk Level
  let riskLevel = 'LOW';
  if (blendedRiskScore > 10.0 || worstLineOverage > 10.0) {
    riskLevel = 'HIGH';
  } else if (blendedRiskScore > 5.0 || worstLineOverage > 0) {
    riskLevel = 'MEDIUM';
  }

  // Determine Approval Level Requirement
  let requiredApprovalStatus = 'NOT_REQUIRED';
  if (riskLevel === 'HIGH' || blendedRiskScore > 10.0) {
    requiredApprovalStatus = 'PENDING_FINANCE';
  } else if (riskLevel === 'MEDIUM' || blendedRiskScore > 0 || worstLineOverage > 0) {
    requiredApprovalStatus = 'PENDING_MANAGER';
  }

  // Formulate risk reason
  let riskReason = 'Within normal discount and margin governance thresholds.';
  if (violationReasons.length > 0) {
    riskReason = violationReasons.join('; ');
  } else if (marginPct < 10) {
    riskReason = `Warning: Deal margin is compressed at ${marginPct.toFixed(1)}%.`;
    if (requiredApprovalStatus === 'NOT_REQUIRED') {
      requiredApprovalStatus = 'PENDING_MANAGER';
    }
  }

  // Update Quotation master record
  await executeQuery(
    `UPDATE quotations 
     SET subtotal = ?, total_discount = ?, tax_amount = ?, total_amount = ?,
         total_cost = ?, margin_amount = ?, margin_pct = ?, risk_score = ?,
         risk_level = ?, risk_reason = ?, last_activity_at = NOW()
     WHERE id = ?`,
    [
      subtotal.toFixed(2),
      totalDiscount.toFixed(2),
      totalTax.toFixed(2),
      totalAmount.toFixed(2),
      totalCost.toFixed(2),
      marginAmount.toFixed(2),
      marginPct.toFixed(2),
      blendedRiskScore.toFixed(2),
      riskLevel,
      riskReason,
      quotationId,
    ]
  );

  return {
    quotationId,
    subtotal,
    totalDiscount,
    totalTax,
    totalAmount,
    totalCost,
    marginAmount,
    marginPct,
    blendedRiskScore,
    worstLineOverage,
    riskLevel,
    riskReason,
    requiredApprovalStatus,
    customerTier,
    customerTierLimit,
  };
}

module.exports = {
  calculateQuotationFinancials,
};
