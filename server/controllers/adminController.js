const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

/**
 * List all users with company, sales team & customer assignments
 */
async function getUsers(req, res) {
  try {
    const users = await query(
      `SELECT u.id, u.name, u.email, u.role, u.active, u.created_at,
              c.company_name as customer_name, st.name as sales_team_name
       FROM users u
       LEFT JOIN customers c ON u.customer_id = c.id
       LEFT JOIN sales_teams st ON u.sales_team_id = st.id
       ORDER BY u.id ASC`
    );
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Create a new user account
 */
async function createUser(req, res) {
  try {
    const { name, email, password = 'password123', role, customerId, salesTeamId } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ success: false, error: 'Name, email, and role are required.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (company_id, name, email, password_hash, role, customer_id, sales_team_id)
       VALUES (1, ?, ?, ?, ?, ?, ?)`,
      [name, email.toLowerCase().trim(), passwordHash, role, customerId || null, salesTeamId || null]
    );

    res.status(201).json({
      success: true,
      userId: result.insertId,
      message: 'User created successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Create a new catalog product
 */
async function createProduct(req, res) {
  try {
    const {
      sku,
      name,
      categoryId,
      description,
      sellingPrice,
      costPrice,
      taxPercentage = 18.00,
      unit = 'Unit',
      productType = 'ONE_TIME',
      imageUrl,
    } = req.body;

    if (!sku || !name || !categoryId || !sellingPrice || !costPrice) {
      return res.status(400).json({ success: false, error: 'SKU, name, category, selling price, and cost price are required.' });
    }

    const result = await query(
      `INSERT INTO products 
       (sku, name, category_id, description, selling_price, cost_price, tax_percentage, unit, product_type, image_url, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        sku.trim(),
        name.trim(),
        categoryId,
        description || '',
        parseFloat(sellingPrice),
        parseFloat(costPrice),
        parseFloat(taxPercentage),
        unit,
        productType,
        imageUrl || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400',
      ]
    );

    const productId = result.insertId;

    // Initialize stock at Main Warehouse (wh id 1) with 10 units by default
    await query(
      `INSERT INTO inventory (product_id, warehouse_id, available_quantity, reserved_quantity, reorder_level)
       VALUES (?, 1, 10, 0, 5)`,
      [productId]
    );

    res.status(201).json({ success: true, productId, message: 'Product created successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update an existing catalog product
 */
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      categoryId,
      description,
      sellingPrice,
      costPrice,
      taxPercentage,
      unit,
      productType,
      imageUrl,
      active,
    } = req.body;

    await query(
      `UPDATE products 
       SET name = COALESCE(?, name),
           category_id = COALESCE(?, category_id),
           description = COALESCE(?, description),
           selling_price = COALESCE(?, selling_price),
           cost_price = COALESCE(?, cost_price),
           tax_percentage = COALESCE(?, tax_percentage),
           unit = COALESCE(?, unit),
           product_type = COALESCE(?, product_type),
           image_url = COALESCE(?, image_url),
           active = COALESCE(?, active)
       WHERE id = ?`,
      [
        name,
        categoryId,
        description,
        sellingPrice !== undefined ? parseFloat(sellingPrice) : null,
        costPrice !== undefined ? parseFloat(costPrice) : null,
        taxPercentage !== undefined ? parseFloat(taxPercentage) : null,
        unit,
        productType,
        imageUrl,
        active,
        id,
      ]
    );

    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Deactivate / Soft-delete product
 */
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    await query(`UPDATE products SET active = FALSE WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Product deactivated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get all product variants across catalog
 */
async function getProductVariants(req, res) {
  try {
    const variants = await query(
      `SELECT pv.*, p.name as product_name, p.sku as product_sku, p.selling_price as base_price
       FROM product_variants pv
       JOIN products p ON pv.product_id = p.id
       ORDER BY pv.product_id ASC, pv.id ASC`
    );
    res.json({ success: true, variants });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Save (create or update) product variant
 */
async function saveProductVariant(req, res) {
  try {
    const { id, productId, variantName, attributeType, attributeValue, priceDelta = 0, sku } = req.body;

    if (!productId || !variantName || !attributeType || !attributeValue) {
      return res.status(400).json({ success: false, error: 'Product, variant name, attribute type, and value are required.' });
    }

    if (id) {
      await query(
        `UPDATE product_variants 
         SET variant_name = ?, attribute_type = ?, attribute_value = ?, price_delta = ?, sku = ?
         WHERE id = ?`,
        [variantName, attributeType, attributeValue, parseFloat(priceDelta), sku, id]
      );
      return res.json({ success: true, message: 'Variant updated successfully.' });
    }

    const result = await query(
      `INSERT INTO product_variants (product_id, variant_name, attribute_type, attribute_value, price_delta, sku)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [productId, variantName, attributeType, attributeValue, parseFloat(priceDelta), sku || `${productId}-${Date.now().toString().slice(-4)}`]
    );

    res.status(201).json({ success: true, variantId: result.insertId, message: 'Variant created successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get discount governance rules
 */
async function getDiscountRules(req, res) {
  try {
    const rules = await query(`SELECT dr.*, c.name as category_name FROM discount_rules dr LEFT JOIN categories c ON dr.target_id = c.id ORDER BY dr.id ASC`);
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Create discount rule
 */
async function createDiscountRule(req, res) {
  try {
    const ruleType = req.body.ruleType || req.body.rule_type;
    const targetId = req.body.targetId !== undefined ? req.body.targetId : req.body.target_id;
    const targetTier = req.body.targetTier || req.body.target_tier;
    const maxDiscountPct = req.body.maxDiscountPct !== undefined ? req.body.maxDiscountPct : req.body.max_discount_pct;
    const description = req.body.description;

    if (!ruleType || maxDiscountPct === undefined || isNaN(parseFloat(maxDiscountPct))) {
      return res.status(400).json({ success: false, error: 'Rule type and max discount are required.' });
    }

    const result = await query(
      `INSERT INTO discount_rules (rule_type, target_id, target_tier, max_discount_pct, description, active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [ruleType, targetId || null, targetTier || null, parseFloat(maxDiscountPct), description || '']
    );

    res.status(201).json({ success: true, ruleId: result.insertId, message: 'Discount rule created.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update discount rule
 */
async function updateDiscountRule(req, res) {
  try {
    const { id } = req.params;
    const maxDiscountPct = req.body.maxDiscountPct !== undefined ? req.body.maxDiscountPct : req.body.max_discount_pct;
    const description = req.body.description;
    const active = req.body.active;

    await query(
      `UPDATE discount_rules 
       SET max_discount_pct = COALESCE(?, max_discount_pct),
           description = COALESCE(?, description),
           active = COALESCE(?, active)
       WHERE id = ?`,
      [maxDiscountPct !== undefined ? parseFloat(maxDiscountPct) : null, description, active, id]
    );

    res.json({ success: true, message: 'Discount rule updated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get approval rules
 */
async function getApprovalRules(req, res) {
  try {
    const rules = await query(`SELECT * FROM approval_rules ORDER BY min_risk_pct ASC`);
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update approval rule
 */
async function updateApprovalRule(req, res) {
  try {
    const { id } = req.params;
    const { minRiskPct, maxRiskPct, requiredLevel, description } = req.body;

    await query(
      `UPDATE approval_rules 
       SET min_risk_pct = COALESCE(?, min_risk_pct),
           max_risk_pct = COALESCE(?, max_risk_pct),
           required_level = COALESCE(?, required_level),
           description = COALESCE(?, description)
       WHERE id = ?`,
      [
        minRiskPct !== undefined ? parseFloat(minRiskPct) : null,
        maxRiskPct !== undefined ? parseFloat(maxRiskPct) : null,
        requiredLevel,
        description,
        id,
      ]
    );

    res.json({ success: true, message: 'Approval rule updated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get all warehouses and stock counts
 */
async function getWarehouses(req, res) {
  try {
    const warehouses = await query(
      `SELECT w.*, 
              (SELECT COUNT(DISTINCT product_id) FROM inventory inv WHERE inv.warehouse_id = w.id) as product_count,
              (SELECT COALESCE(SUM(available_quantity), 0) FROM inventory inv WHERE inv.warehouse_id = w.id) as total_stock
       FROM warehouses w
       ORDER BY w.id ASC`
    );
    res.json({ success: true, warehouses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Create a new warehouse
 */
async function createWarehouse(req, res) {
  try {
    const { name, code, location, shippingCost = 500.00 } = req.body;
    if (!name || !code || !location) {
      return res.status(400).json({ success: false, error: 'Name, code, and location are required.' });
    }

    const result = await query(
      `INSERT INTO warehouses (name, code, location, shipping_cost, active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [name.trim(), code.toUpperCase().trim(), location.trim(), parseFloat(shippingCost)]
    );

    res.status(201).json({ success: true, warehouseId: result.insertId, message: 'Warehouse created successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update warehouse details & shipping weighting
 */
async function updateWarehouse(req, res) {
  try {
    const { id } = req.params;
    const { name, location, shippingCost, active } = req.body;

    await query(
      `UPDATE warehouses 
       SET name = COALESCE(?, name),
           location = COALESCE(?, location),
           shipping_cost = COALESCE(?, shipping_cost),
           active = COALESCE(?, active)
       WHERE id = ?`,
      [name, location, shippingCost !== undefined ? parseFloat(shippingCost) : null, active, id]
    );

    res.json({ success: true, message: 'Warehouse details updated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get inventory and replenishment levels for a warehouse
 */
async function getWarehouseInventory(req, res) {
  try {
    const { id } = req.params;
    const inventory = await query(
      `SELECT inv.*, p.name as product_name, p.sku, p.selling_price, c.name as category_name
       FROM inventory inv
       JOIN products p ON inv.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       WHERE inv.warehouse_id = ?
       ORDER BY inv.product_id ASC`,
      [id]
    );
    res.json({ success: true, inventory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update stock level and replenishment reorder_level
 */
async function updateWarehouseStock(req, res) {
  try {
    const { warehouseId, productId, availableQuantity, reorderLevel } = req.body;

    if (!warehouseId || !productId) {
      return res.status(400).json({ success: false, error: 'warehouseId and productId are required.' });
    }

    await query(
      `INSERT INTO inventory (product_id, warehouse_id, available_quantity, reserved_quantity, reorder_level)
       VALUES (?, ?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE 
         available_quantity = VALUES(available_quantity),
         reorder_level = VALUES(reorder_level)`,
      [productId, warehouseId, parseInt(availableQuantity || 0, 10), parseInt(reorderLevel || 5, 10)]
    );

    res.json({ success: true, message: 'Inventory and replenishment rules updated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get price lists with preferential items
 */
async function getPriceLists(req, res) {
  try {
    const priceLists = await query(`SELECT * FROM price_lists ORDER BY id ASC`);
    const priceListItems = await query(
      `SELECT pli.*, p.name as product_name, p.sku, p.selling_price as standard_price
       FROM price_list_items pli
       JOIN products p ON pli.product_id = p.id
       ORDER BY pli.price_list_id ASC`
    );

    for (const pl of priceLists) {
      pl.items = priceListItems.filter((i) => i.price_list_id === pl.id);
    }

    res.json({ success: true, priceLists });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Save or update price list item rule
 */
async function savePriceListItem(req, res) {
  try {
    const { priceListId, productId, specialPrice, discountPct = 0 } = req.body;

    if (!priceListId || !productId) {
      return res.status(400).json({ success: false, error: 'priceListId and productId are required.' });
    }

    await query(
      `INSERT INTO price_list_items (price_list_id, product_id, special_price, discount_pct)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         special_price = VALUES(special_price),
         discount_pct = VALUES(discount_pct)`,
      [priceListId, productId, specialPrice ? parseFloat(specialPrice) : null, parseFloat(discountPct)]
    );

    res.json({ success: true, message: 'Price list item rule saved.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Upsell & Cross-Sell rules
 */
async function getUpsellRules(req, res) {
  try {
    const rules = await query(
      `SELECT ur.*, 
              trig.name as trigger_product_name, trig.sku as trigger_sku,
              rec.name as recommended_product_name, rec.sku as recommended_sku, rec.selling_price as recommended_price
       FROM upsell_rules ur
       JOIN products trig ON ur.trigger_product_id = trig.id
       JOIN products rec ON ur.recommended_product_id = rec.id
       ORDER BY ur.id DESC`
    );
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Save (create or update) Upsell rule
 */
async function saveUpsellRule(req, res) {
  try {
    const {
      id,
      triggerProductId,
      recommendedProductId,
      recommendationType = 'UPSELL',
      reason,
      marginDelta = 0,
      isPromoted = false,
      promoTag,
    } = req.body;

    if (!triggerProductId || !recommendedProductId || !reason) {
      return res.status(400).json({ success: false, error: 'Trigger product, recommended product, and reason are required.' });
    }

    if (id) {
      await query(
        `UPDATE upsell_rules 
         SET trigger_product_id = ?, recommended_product_id = ?, recommendation_type = ?,
             reason = ?, margin_delta = ?, is_promoted = ?, promo_tag = ?
         WHERE id = ?`,
        [triggerProductId, recommendedProductId, recommendationType, reason, parseFloat(marginDelta), isPromoted ? 1 : 0, promoTag, id]
      );
      return res.json({ success: true, message: 'Upsell pairing updated successfully.' });
    }

    const result = await query(
      `INSERT INTO upsell_rules (trigger_product_id, recommended_product_id, recommendation_type, reason, margin_delta, is_promoted, promo_tag, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [triggerProductId, recommendedProductId, recommendationType, reason, parseFloat(marginDelta), isPromoted ? 1 : 0, promoTag]
    );

    res.status(201).json({ success: true, ruleId: result.insertId, message: 'Upsell pairing created successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Delete Upsell rule
 */
async function deleteUpsellRule(req, res) {
  try {
    const { id } = req.params;
    await query(`DELETE FROM upsell_rules WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Upsell pairing removed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getUsers,
  createUser,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductVariants,
  saveProductVariant,
  getDiscountRules,
  createDiscountRule,
  updateDiscountRule,
  getApprovalRules,
  updateApprovalRule,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  getWarehouseInventory,
  updateWarehouseStock,
  getPriceLists,
  savePriceListItem,
  getUpsellRules,
  saveUpsellRule,
  deleteUpsellRule,
};
