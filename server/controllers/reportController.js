const { query } = require('../config/db');

/**
 * Executive reporting dashboard metrics calculated via real SQL aggregations
 */
async function getDashboardMetrics(req, res) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isSalesRep = userRole === 'SALES_REP';

    // Build WHERE clause — SALES_REP sees only their own quotes, others see all
    const quoteWhere = isSalesRep ? 'WHERE q.salesperson_id = ?' : '';
    const quoteParams = isSalesRep ? [userId] : [];

    // 1. Overall Revenue from PAID Invoices (scoped for rep)
    const revRows = await query(
      isSalesRep
        ? `SELECT COALESCE(SUM(p.amount), 0) as total_revenue, COUNT(*) as paid_transactions
           FROM payments p
           JOIN invoices i ON p.invoice_id = i.id
           JOIN quotations q ON i.quotation_id = q.id
           WHERE p.status = 'SUCCESS' AND q.salesperson_id = ?`
        : `SELECT COALESCE(SUM(amount), 0) as total_revenue, COUNT(*) as paid_transactions
           FROM payments WHERE status = 'SUCCESS'`,
      quoteParams
    );
    const rev = revRows[0] || { total_revenue: 0, paid_transactions: 0 };

    // 2. Pipeline Quotation Metrics
    const quoteRows = await query(
      `SELECT 
         COUNT(*) as total_quotes,
         COALESCE(SUM(q.total_amount), 0) as pipeline_value,
         COALESCE(AVG(CASE WHEN q.subtotal > 0 THEN q.total_discount / q.subtotal * 100 ELSE 0 END), 0) as average_discount_pct,
         COALESCE(AVG(q.margin_pct), 0) as average_margin_pct,
         COALESCE(SUM(CASE WHEN q.status IN ('PAID', 'COMPLETED', 'INVOICED') THEN q.total_amount ELSE 0 END), 0) as won_revenue,
         SUM(CASE WHEN q.status IN ('PAID', 'COMPLETED', 'INVOICED') THEN 1 ELSE 0 END) as won_quotes,
         SUM(CASE WHEN q.status = 'REJECTED' THEN 1 ELSE 0 END) as lost_quotes,
         SUM(CASE WHEN q.status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) as pending_approval_quotes
       FROM quotations q ${quoteWhere}`,
      quoteParams
    );
    const quotes = quoteRows[0] || {};

    const totalDeals = parseInt(quotes.total_quotes || 0, 10);
    const wonDeals = parseInt(quotes.won_quotes || 0, 10);
    const lostDeals = parseInt(quotes.lost_quotes || 0, 10);
    const closedDeals = wonDeals + lostDeals;
    const winRatePct = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : (totalDeals > 0 ? 100 : 0);

    // Use won_revenue if actual payment revenue is 0 (seed data may not have payments yet)
    const totalRevenue = parseFloat(rev.total_revenue || 0);
    const wonRevenue = parseFloat(quotes.won_revenue || 0);
    const displayRevenue = totalRevenue > 0 ? totalRevenue : wonRevenue;

    // 3. Stage breakdown
    const stageDistribution = await query(
      `SELECT q.status, COUNT(*) as count, COALESCE(SUM(q.total_amount), 0) as value 
       FROM quotations q ${quoteWhere} GROUP BY q.status ORDER BY count DESC`,
      quoteParams
    );

    // 4. Deal Health breakdown
    const healthRows = await query(
      isSalesRep
        ? `SELECT 
             COALESCE(AVG(dh.health_score), 100) as avg_health,
             SUM(CASE WHEN dh.status = 'HEALTHY' THEN 1 ELSE 0 END) as healthy,
             SUM(CASE WHEN dh.status = 'AT_RISK' THEN 1 ELSE 0 END) as at_risk,
             SUM(CASE WHEN dh.status = 'CRITICAL' THEN 1 ELSE 0 END) as critical
           FROM deal_health dh
           JOIN quotations q ON dh.quotation_id = q.id
           WHERE q.salesperson_id = ?`
        : `SELECT 
             COALESCE(AVG(health_score), 100) as avg_health,
             SUM(CASE WHEN status = 'HEALTHY' THEN 1 ELSE 0 END) as healthy,
             SUM(CASE WHEN status = 'AT_RISK' THEN 1 ELSE 0 END) as at_risk,
             SUM(CASE WHEN status = 'CRITICAL' THEN 1 ELSE 0 END) as critical
           FROM deal_health`,
      quoteParams
    );
    const health = healthRows[0] || { avg_health: 100, healthy: 0, at_risk: 0, critical: 0 };

    res.json({
      success: true,
      metrics: {
        totalRevenue: displayRevenue,
        pipelineValue: parseFloat(quotes.pipeline_value || 0),
        totalQuotes: totalDeals,
        wonQuotes: wonDeals,
        winRatePct: Math.round(winRatePct * 10) / 10,
        averageDiscountPct: Math.round(parseFloat(quotes.average_discount_pct || 0) * 10) / 10,
        averageMarginPct: Math.round(parseFloat(quotes.average_margin_pct || 0) * 10) / 10,
        pendingApprovalCount: parseInt(quotes.pending_approval_quotes || 0, 10),
        dealHealthSummary: health,
        stageDistribution,
      },
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Sales Performance Report by Sales Rep with filters
 */
async function getSalesPerformance(req, res) {
  try {
    const { period, salesTeamId, salespersonId, approvalStatus } = req.query;

    let quoteFilter = '1=1';
    const params = [];

    const periodNorm = (period || '').toUpperCase();
    if (periodNorm === 'TODAY') {
      quoteFilter += ' AND DATE(q.created_at) = CURDATE()';
    } else if (periodNorm === 'THIS_WEEK') {
      quoteFilter += ' AND q.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (periodNorm === 'THIS_MONTH') {
      quoteFilter += ' AND q.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (periodNorm === 'THIS_QUARTER') {
      quoteFilter += ' AND q.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    } else if (periodNorm === 'THIS_YEAR') {
      quoteFilter += ' AND YEAR(q.created_at) = YEAR(CURDATE())';
    }

    if (approvalStatus) {
      quoteFilter += ' AND q.approval_status = ?';
      params.push(approvalStatus);
    }

    let repFilter = "u.role = 'SALES_REP' AND u.active = TRUE";
    if (salesTeamId) {
      repFilter += ' AND u.sales_team_id = ?';
      params.push(salesTeamId);
    }
    if (salespersonId) {
      repFilter += ' AND u.id = ?';
      params.push(salespersonId);
    }

    const performance = await query(
      `SELECT 
         u.id as rep_id, u.name as rep_name, u.email as rep_email, st.name as sales_team_name,
         COUNT(q.id) as total_quotes,
         COALESCE(SUM(CASE WHEN q.status IN ('PAID', 'COMPLETED') THEN q.total_amount ELSE 0 END), 0) as won_value,
         COALESCE(SUM(q.total_amount), 0) as total_pipeline,
         COALESCE(AVG(q.total_discount / NULLIF(q.subtotal, 0) * 100), 0) as avg_discount_pct,
         COALESCE(AVG(q.margin_pct), 0) as avg_margin_pct,
         SUM(CASE WHEN q.status IN ('PAID', 'COMPLETED') THEN 1 ELSE 0 END) as won_count,
         SUM(CASE WHEN q.status = 'REJECTED' THEN 1 ELSE 0 END) as lost_count
       FROM users u
       LEFT JOIN sales_teams st ON u.sales_team_id = st.id
       LEFT JOIN quotations q ON u.id = q.salesperson_id AND (${quoteFilter})
       WHERE ${repFilter}
       GROUP BY u.id, u.name, u.email, st.name
       ORDER BY won_value DESC`,
      params
    );

    res.json({ success: true, performance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Product Sales & Margin Performance Report with category and period filters
 */
async function getProductPerformance(req, res) {
  try {
    const { categoryId, period, minDiscount } = req.query;

    let itemFilter = '1=1';
    const params = [];

    const periodNorm2 = (period || '').toUpperCase();
    if (periodNorm2 === 'TODAY') {
      itemFilter += ' AND DATE(qi.created_at) = CURDATE()';
    } else if (periodNorm2 === 'THIS_WEEK') {
      itemFilter += ' AND qi.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (periodNorm2 === 'THIS_MONTH') {
      itemFilter += ' AND qi.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (periodNorm2 === 'THIS_QUARTER') {
      itemFilter += ' AND qi.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    } else if (periodNorm2 === 'THIS_YEAR') {
      itemFilter += ' AND YEAR(qi.created_at) = YEAR(CURDATE())';
    }

    if (minDiscount) {
      itemFilter += ' AND qi.discount_pct >= ?';
      params.push(parseFloat(minDiscount));
    }

    let prodFilter = 'p.active = TRUE';
    if (categoryId) {
      prodFilter += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    const products = await query(
      `SELECT 
         p.id, p.name, p.sku, p.product_type, c.name as category_name,
         c.discount_ceiling_pct as category_ceiling,
         COALESCE(SUM(qi.quantity), 0) as units_sold,
         COALESCE(SUM(qi.line_total), 0) as total_sales,
         COALESCE(AVG(qi.discount_pct), 0) as avg_discount,
         COALESCE(SUM(qi.line_total - (qi.quantity * qi.cost_price)), 0) as gross_margin
       FROM products p
       JOIN categories c ON p.category_id = c.id
       LEFT JOIN quotation_items qi ON p.id = qi.product_id AND (${itemFilter})
       WHERE ${prodFilter}
       GROUP BY p.id, p.name, p.sku, p.product_type, c.name, c.discount_ceiling_pct
       ORDER BY units_sold DESC, total_sales DESC
       LIMIT 30`,
      params
    );

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get comprehensive export data for XLS/CSV and printable PDF
 */
async function getExportData(req, res) {
  try {
    const { reportType = 'quotations', period } = req.query;

    let dateClause = '1=1';
    if (period === 'today') dateClause = 'DATE(created_at) = CURDATE()';
    else if (period === 'week') dateClause = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    else if (period === 'month') dateClause = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

    if (reportType === 'products') {
      const rows = await query(
        `SELECT p.sku, p.name, c.name as category, p.product_type, p.selling_price, p.cost_price,
                COALESCE(SUM(qi.quantity), 0) as units_sold, COALESCE(SUM(qi.line_total), 0) as revenue
         FROM products p
         JOIN categories c ON p.category_id = c.id
         LEFT JOIN quotation_items qi ON p.id = qi.product_id
         GROUP BY p.id, p.sku, p.name, c.name, p.product_type, p.selling_price, p.cost_price
         ORDER BY units_sold DESC`
      );
      return res.json({ success: true, filename: `DealFlow360_Products_${Date.now()}.csv`, rows });
    }

    const rows = await query(
      `SELECT q.quotation_number, c.company_name as customer_name, c.customer_tier,
              u.name as salesperson, q.status, q.approval_status,
              q.subtotal, q.total_discount, q.tax_amount, q.total_amount, q.margin_pct,
              q.risk_score, q.created_at
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       JOIN users u ON q.salesperson_id = u.id
       WHERE ${dateClause}
       ORDER BY q.created_at DESC`
    );

    res.json({ success: true, filename: `DealFlow360_Quotations_${Date.now()}.csv`, rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getDashboardMetrics,
  getSalesPerformance,
  getProductPerformance,
  getExportData,
};
