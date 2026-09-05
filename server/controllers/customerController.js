const { query } = require('../config/db');

/**
 * List all customers (supports search and tier filtering)
 */
async function getCustomers(req, res) {
  try {
    const { search, tier } = req.query;

    let sql = `
      SELECT c.*, u.name as salesperson_name,
             (SELECT COUNT(*) FROM quotations q WHERE q.customer_id = c.id) as total_quotes
      FROM customers c
      LEFT JOIN users u ON c.assigned_salesperson_id = u.id
      WHERE c.active = TRUE
    `;
    const params = [];

    // If customer role, only return their own record
    if (req.user && req.user.role === 'CUSTOMER' && req.user.customer_id) {
      sql += ' AND c.id = ?';
      params.push(req.user.customer_id);
    } else {
      if (tier) {
        sql += ' AND c.customer_tier = ?';
        params.push(tier);
      }
      if (search) {
        sql += ' AND (c.company_name LIKE ? OR c.contact_person LIKE ? OR c.email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    }

    sql += ' ORDER BY c.company_name ASC';
    const customers = await query(sql, params);
    res.json({ success: true, customers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get customer by ID
 */
async function getCustomerById(req, res) {
  try {
    const { id } = req.params;

    // Customer isolation
    if (req.user && req.user.role === 'CUSTOMER' && parseInt(id, 10) !== parseInt(req.user.customer_id, 10)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Access denied to other customer records.' });
    }

    const customers = await query(
      `SELECT c.*, u.name as salesperson_name 
       FROM customers c 
       LEFT JOIN users u ON c.assigned_salesperson_id = u.id 
       WHERE c.id = ?`,
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    res.json({ success: true, customer: customers[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getCustomers,
  getCustomerById,
};
