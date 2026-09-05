const { query } = require('../config/db');

/**
 * List products with filtering by category, search query, and product type
 */
async function getProducts(req, res) {
  try {
    const { categoryId, search, productType, active } = req.query;

    let sql = `
      SELECT p.*, c.name as category_name, c.discount_ceiling_pct as category_ceiling_pct,
             COALESCE(SUM(inv.available_quantity), 0) as total_stock
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory inv ON p.id = inv.product_id
      WHERE 1=1
    `;
    const params = [];

    if (categoryId) {
      sql += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    if (productType) {
      sql += ' AND p.product_type = ?';
      params.push(productType);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (active !== undefined) {
      sql += ' AND p.active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    sql += ' GROUP BY p.id ORDER BY p.id ASC';

    const products = await query(sql, params);

    // Attach variants
    const variants = await query(`SELECT * FROM product_variants ORDER BY id ASC`);
    for (const p of products) {
      p.variants = variants.filter((v) => v.product_id === p.id);
    }

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get product detail by ID with variants and inventory across warehouses
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const products = await query(
      `SELECT p.*, c.name as category_name, c.discount_ceiling_pct as category_ceiling_pct
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const product = products[0];

    // Variants
    const variants = await query(`SELECT * FROM product_variants WHERE product_id = ?`, [id]);
    product.variants = variants;

    // Stock across warehouses
    const stock = await query(
      `SELECT inv.*, w.name as warehouse_name, w.code as warehouse_code 
       FROM inventory inv 
       JOIN warehouses w ON inv.warehouse_id = w.id 
       WHERE inv.product_id = ?`,
      [id]
    );
    product.inventory = stock;

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get all product categories
 */
async function getCategories(req, res) {
  try {
    const categories = await query(`SELECT * FROM categories ORDER BY id ASC`);
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getProducts,
  getProductById,
  getCategories,
};
