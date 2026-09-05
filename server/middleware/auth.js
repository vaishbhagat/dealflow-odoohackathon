const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dealflow360_super_secret_jwt_key_gada_electronics_2026';

/**
 * Authentication Middleware
 * Validates JWT token and hydrates user from MySQL
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Support demo role header in development if no token is provided for instant testing
    const demoRole = req.headers['x-demo-role'];
    if (!token && demoRole) {
      const users = await query('SELECT * FROM users WHERE role = ? AND active = TRUE LIMIT 1', [demoRole]);
      if (users.length > 0) {
        req.user = users[0];
        return next();
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token is missing. Please log in.',
      });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token.',
      });
    }

    // Handle GUEST user session
    if (decoded.role === 'GUEST' || decoded.id === 999999) {
      req.user = {
        id: 999999,
        name: 'Guest User',
        email: 'guest@gadaelectronics.com',
        role: 'GUEST',
        active: true,
      };
      return next();
    }

    // Hydrate fresh user details from MySQL
    const users = await query('SELECT * FROM users WHERE id = ? AND active = TRUE', [decoded.id]);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or deactivated.',
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed due to internal server error.',
    });
  }
}

/**
 * Generate a signed JWT for a user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      customer_id: user.customer_id,
      sales_team_id: user.sales_team_id,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  authenticate,
  generateToken,
};
