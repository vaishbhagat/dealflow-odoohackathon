const { query } = require('../config/db');
const {
  getQuotationFulfillmentPlan,
  executeFulfillmentAllocation,
  consolidatePendingBackorder,
} = require('../services/warehouseService');

/**
 * Get multi-warehouse availability & automated split plan
 */
async function getFulfillmentPlan(req, res) {
  try {
    const { quotationId } = req.params;
    const plan = await getQuotationFulfillmentPlan(quotationId);
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Confirm suggested warehouse split and reserve inventory
 */
async function allocateFulfillment(req, res) {
  try {
    const { quotationId } = req.params;
    const { allocationPlan } = req.body;

    const result = await executeFulfillmentAllocation(quotationId, req.user.id, allocationPlan);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List all fulfillment orders
 */
async function getFulfillmentOrders(req, res) {
  try {
    const orders = await query(
      `SELECT fo.*, q.quotation_number, c.company_name as customer_name
       FROM fulfillment_orders fo
       JOIN quotations q ON fo.quotation_id = q.id
       JOIN customers c ON fo.customer_id = c.id
       ORDER BY fo.created_at DESC`
    );

    // Fetch items per fulfillment order
    for (const order of orders) {
      const items = await query(
        `SELECT fi.*, p.name as product_name, p.sku, w.name as warehouse_name, w.code as warehouse_code
         FROM fulfillment_items fi
         JOIN products p ON fi.product_id = p.id
         JOIN warehouses w ON fi.warehouse_id = w.id
         WHERE fi.fulfillment_order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List pending backorders
 */
async function getBackorders(req, res) {
  try {
    const backorders = await query(
      `SELECT b.*, p.name as product_name, p.sku, p.image_url,
              q.quotation_number, c.company_name as customer_name
       FROM backorders b
       JOIN products p ON b.product_id = p.id
       JOIN quotations q ON b.quotation_id = q.id
       JOIN customers c ON q.customer_id = c.id
       WHERE b.status != 'RESOLVED'
       ORDER BY b.created_at DESC`
    );

    res.json({ success: true, backorders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Consolidate pending backorder when fresh inventory arrives
 */
async function consolidateBackorder(req, res) {
  try {
    const { id } = req.params;
    const { warehouseId, quantity } = req.body;

    if (!warehouseId || !quantity) {
      return res.status(400).json({ success: false, error: 'warehouseId and quantity are required.' });
    }

    const result = await consolidatePendingBackorder(id, warehouseId, parseInt(quantity, 10), req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getFulfillmentPlan,
  allocateFulfillment,
  getFulfillmentOrders,
  getBackorders,
  consolidateBackorder,
};
