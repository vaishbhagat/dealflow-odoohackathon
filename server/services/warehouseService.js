const { query, withTransaction } = require('../config/db');
const { logAudit } = require('./auditService');

/**
 * Calculate multi-warehouse availability and recommended split plan for a quotation
 */
async function getQuotationFulfillmentPlan(quotationId) {
  // 1. Fetch physical items in the quotation (ONE_TIME products)
  const items = await query(
    `SELECT qi.*, p.name as product_name, p.sku, p.product_type
     FROM quotation_items qi
     JOIN products p ON qi.product_id = p.id
     WHERE qi.quotation_id = ? AND p.product_type = 'ONE_TIME'`,
    [quotationId]
  );

  // 2. Fetch all active warehouses
  const warehouses = await query(`SELECT * FROM warehouses WHERE active = TRUE ORDER BY id ASC`);

  // 3. For each physical item, check warehouse inventory levels
  const planItems = [];
  const warehouseShipmentSet = new Set();
  let totalEstimatedShipping = 0;
  let hasBackorder = false;

  for (const item of items) {
    const requiredQty = parseInt(item.quantity, 10);

    // Get stock across warehouses
    const stockRows = await query(
      `SELECT inv.*, w.name as warehouse_name, w.code as warehouse_code, w.shipping_cost
       FROM inventory inv
       JOIN warehouses w ON inv.warehouse_id = w.id
       WHERE inv.product_id = ? AND w.active = TRUE
       ORDER BY inv.available_quantity DESC, w.id ASC`,
      [item.product_id]
    );

    let remainingQty = requiredQty;
    const itemSplits = [];

    // Attempt fulfillment from available warehouses
    for (const stock of stockRows) {
      if (remainingQty <= 0) break;

      const available = parseInt(stock.available_quantity, 10);
      if (available > 0) {
        const allocateQty = Math.min(available, remainingQty);
        itemSplits.push({
          warehouseId: stock.warehouse_id,
          warehouseName: stock.warehouse_name,
          warehouseCode: stock.warehouse_code,
          availableQuantity: available,
          allocatedQuantity: allocateQty,
          shippingCost: parseFloat(stock.shipping_cost),
        });
        warehouseShipmentSet.add(stock.warehouse_id);
        remainingQty -= allocateQty;
      }
    }

    let backorderQty = 0;
    if (remainingQty > 0) {
      backorderQty = remainingQty;
      hasBackorder = true;
    }

    planItems.push({
      quotationItemId: item.id,
      productId: item.product_id,
      productName: item.product_name,
      sku: item.sku,
      requiredQuantity: requiredQty,
      splits: itemSplits,
      backorderQuantity: backorderQty,
      isSplitRequired: itemSplits.length > 1,
      stockShortage: backorderQty > 0,
    });
  }

  // Calculate total shipping based on unique warehouses involved
  warehouseShipmentSet.forEach((whId) => {
    const wh = warehouses.find((w) => w.id === whId);
    if (wh) {
      totalEstimatedShipping += parseFloat(wh.shipping_cost);
    }
  });

  return {
    quotationId,
    totalPhysicalItems: items.length,
    planItems,
    shipmentCount: warehouseShipmentSet.size || 1,
    estimatedShippingCost: totalEstimatedShipping,
    hasBackorder,
    warehouses,
  };
}

/**
 * Execute inventory allocation and create fulfillment order using strict DB transactions
 */
async function executeFulfillmentAllocation(quotationId, userId, allocationPlan = null) {
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

    // 2. Generate or use plan
    const plan = allocationPlan || (await getQuotationFulfillmentPlan(quotationId));

    // 3. Create fulfillment_orders record
    const fulfillmentNumber = `FUL-${Date.now().toString().slice(-6)}`;
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + 4);

    const [fOrderResult] = await conn.execute(
      `INSERT INTO fulfillment_orders 
       (fulfillment_number, quotation_id, customer_id, status, total_shipments, estimated_shipping_cost, expected_delivery_date)
       VALUES (?, ?, ?, 'ALLOCATED', ?, ?, ?)`,
      [
        fulfillmentNumber,
        quotationId,
        quote.customer_id,
        plan.shipmentCount,
        plan.estimatedShippingCost,
        expectedDelivery,
      ]
    );
    const fulfillmentOrderId = fOrderResult.insertId;

    // 4. Reserve stock and record fulfillment items
    for (const itemPlan of plan.planItems) {
      let batchCounter = 1;
      for (const split of itemPlan.splits) {
        if (split.allocatedQuantity > 0) {
          // Lock row with FOR UPDATE
          const [invRows] = await conn.execute(
            `SELECT * FROM inventory 
             WHERE product_id = ? AND warehouse_id = ? 
             FOR UPDATE`,
            [itemPlan.productId, split.warehouseId]
          );

          if (invRows.length === 0) {
            throw new Error(`Inventory row missing for product ${itemPlan.productId} in warehouse ${split.warehouseId}`);
          }

          const currentStock = invRows[0];
          if (currentStock.available_quantity < split.allocatedQuantity) {
            throw new Error(
              `Insufficient stock during lock for ${itemPlan.productName}. Available: ${currentStock.available_quantity}, Needed: ${split.allocatedQuantity}`
            );
          }

          // Decrement available, increment reserved
          await conn.execute(
            `UPDATE inventory 
             SET available_quantity = available_quantity - ?,
                 reserved_quantity = reserved_quantity + ?
             WHERE id = ?`,
            [split.allocatedQuantity, split.allocatedQuantity, currentStock.id]
          );

          // Create inventory reservation record
          await conn.execute(
            `INSERT INTO inventory_reservations 
             (quotation_id, product_id, warehouse_id, quantity, status)
             VALUES (?, ?, ?, ?, 'RESERVED')`,
            [quotationId, itemPlan.productId, split.warehouseId, split.allocatedQuantity]
          );

          // Create fulfillment_items record
          await conn.execute(
            `INSERT INTO fulfillment_items 
             (fulfillment_order_id, quotation_item_id, product_id, warehouse_id, quantity, shipment_batch, status)
             VALUES (?, ?, ?, ?, ?, ?, 'ALLOCATED')`,
            [
              fulfillmentOrderId,
              itemPlan.quotationItemId,
              itemPlan.productId,
              split.warehouseId,
              split.allocatedQuantity,
              batchCounter++,
            ]
          );
        }
      }

      // If backorder is required
      if (itemPlan.backorderQuantity > 0) {
        await conn.execute(
          `INSERT INTO backorders 
           (quotation_id, product_id, quantity_needed, quantity_allocated, status)
           VALUES (?, ?, ?, 0, 'PENDING')`,
          [quotationId, itemPlan.productId, itemPlan.backorderQuantity]
        );

        // Notify Operations
        const [financeOps] = await conn.execute(
          `SELECT id FROM users WHERE role = 'FINANCE_OPERATIONS' AND active = TRUE LIMIT 1`
        );
        if (financeOps.length > 0) {
          await conn.execute(
            `INSERT INTO notifications (user_id, title, message, type, link_url)
             VALUES (?, ?, ?, 'BACKORDER_READY', ?)`,
            [
              financeOps[0].id,
              `Backorder Created: ${itemPlan.productName}`,
              `${itemPlan.backorderQuantity} units required for Quotation ${quote.quotation_number}`,
              `/finance/fulfillment`,
            ]
          );
        }
      }
    }

    // 5. Update quotation status to FULFILLMENT
    await conn.execute(
      `UPDATE quotations 
       SET status = 'FULFILLMENT', last_activity_at = NOW() 
       WHERE id = ?`,
      [quotationId]
    );

    // 6. Audit log
    await logAudit({
      quotationId,
      userId,
      userRole: 'FINANCE_OPERATIONS',
      action: 'WAREHOUSE_SPLIT_CREATED',
      oldValue: quote.status,
      newValue: 'FULFILLMENT',
      reason: `Allocated inventory across ${plan.shipmentCount} shipments. Estimated shipping: ₹${plan.estimatedShippingCost}. Backorders: ${plan.hasBackorder ? 'YES' : 'NO'}`,
      connection: conn,
    });

    return {
      success: true,
      fulfillmentOrderId,
      fulfillmentNumber,
      shipmentCount: plan.shipmentCount,
      estimatedShippingCost: plan.estimatedShippingCost,
      hasBackorder: plan.hasBackorder,
      message: 'Warehouse fulfillment split confirmed and inventory successfully reserved.',
    };
  });
}

/**
 * Consolidate pending backorder when fresh stock arrives
 */
async function consolidatePendingBackorder(backorderId, warehouseId, quantityToAdd, userId) {
  return await withTransaction(async (conn) => {
    const [backorders] = await conn.execute(
      `SELECT b.*, p.name as product_name, q.quotation_number 
       FROM backorders b
       JOIN products p ON b.product_id = p.id
       JOIN quotations q ON b.quotation_id = q.id
       WHERE b.id = ? AND b.status != 'RESOLVED'`,
      [backorderId]
    );
    if (backorders.length === 0) throw new Error('Pending backorder not found or already resolved');
    const bo = backorders[0];

    const qtyToAllocate = Math.min(quantityToAdd, bo.quantity_needed - bo.quantity_allocated);
    const newAllocated = bo.quantity_allocated + qtyToAllocate;
    const isFullyResolved = newAllocated >= bo.quantity_needed;

    // Update backorder record
    await conn.execute(
      `UPDATE backorders 
       SET quantity_allocated = ?, status = ?, resolved_at = ? 
       WHERE id = ?`,
      [
        newAllocated,
        isFullyResolved ? 'RESOLVED' : 'PARTIALLY_FULFILLED',
        isFullyResolved ? new Date() : null,
        backorderId,
      ]
    );

    // Reserve newly arrived stock
    await conn.execute(
      `INSERT INTO inventory_reservations 
       (quotation_id, product_id, warehouse_id, quantity, status)
       VALUES (?, ?, ?, ?, 'RESERVED')`,
      [bo.quotation_id, bo.product_id, warehouseId, qtyToAllocate]
    );

    await logAudit({
      quotationId: bo.quotation_id,
      userId,
      userRole: 'FINANCE_OPERATIONS',
      action: 'BACKORDER_CONSOLIDATED',
      oldValue: `Backorder needed: ${bo.quantity_needed}`,
      newValue: `Allocated +${qtyToAllocate} from warehouse ${warehouseId}`,
      reason: isFullyResolved ? 'Backorder fully satisfied' : 'Partial backorder fulfillment',
      connection: conn,
    });

    return {
      success: true,
      backorderId,
      allocated: qtyToAllocate,
      isFullyResolved,
      message: `Successfully allocated ${qtyToAllocate} units to pending backorder.`,
    };
  });
}

module.exports = {
  getQuotationFulfillmentPlan,
  executeFulfillmentAllocation,
  consolidatePendingBackorder,
};
