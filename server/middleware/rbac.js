/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access to specific roles and enforces ownership
 */

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden. Role '${req.user.role}' is not authorized to access this resource. Requires one of: [${allowedRoles.join(', ')}].`,
      });
    }

    next;
    next();
  };
}

/**
 * Customer isolation middleware
 * Ensures customer users can only access records matching their customer_id
 */
function enforceCustomerIsolation(getCustomerIdFromReq) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    // Admins, managers, reps, finance can access internal operations
    if (req.user.role !== 'CUSTOMER') {
      return next();
    }

    const targetCustomerId = getCustomerIdFromReq(req);
    if (!targetCustomerId || parseInt(targetCustomerId, 10) !== parseInt(req.user.customer_id, 10)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Access denied. You can only view and manage your own customer records.',
      });
    }

    next();
  };
}

module.exports = {
  authorizeRoles,
  enforceCustomerIsolation,
};
