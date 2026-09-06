const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const customerController = require('../controllers/customerController');
const quotationController = require('../controllers/quotationController');
const approvalController = require('../controllers/approvalController');
const fulfillmentController = require('../controllers/fulfillmentController');
const negotiationController = require('../controllers/negotiationController');
const paymentController = require('../controllers/paymentController');
const dealHealthController = require('../controllers/dealHealthController');

const subscriptionController = require('../controllers/subscriptionController');
const reportController = require('../controllers/reportController');
const notificationController = require('../controllers/notificationController');
const adminController = require('../controllers/adminController');

// ==========================================
// 1. Auth Routes
// ==========================================
router.post('/auth/login', authController.login);
router.post('/auth/signup', authController.signup);
router.post('/auth/google', authController.googleLogin);
router.post('/auth/magic-link-login', authController.magicLinkLogin);
router.get('/auth/me', authenticate, authController.getMe);
router.get('/auth/demo-users', authController.getDemoUsers);
router.post('/auth/guest', authController.guestLogin);

// ==========================================
// 2. Products & Categories
// ==========================================
router.get('/products', authenticate, productController.getProducts);
router.get('/products/:id', authenticate, productController.getProductById);
router.get('/categories', authenticate, productController.getCategories);

// ==========================================
// 3. Customers
// ==========================================
router.get('/customers', authenticate, customerController.getCustomers);
router.get('/customers/:id', authenticate, customerController.getCustomerById);

// ==========================================
// 4. Quotations & Upsells
// ==========================================
router.get('/quotations', authenticate, quotationController.getQuotations);
router.get('/quotations/:id', authenticate, quotationController.getQuotationById);
router.post(
  '/quotations',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'),
  quotationController.createQuotation
);
router.post(
  '/quotations/:id/items',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_REP', 'SALES_MANAGER'),
  quotationController.addQuotationItem
);
router.put(
  '/quotations/:id/items/:itemId',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_REP', 'SALES_MANAGER'),
  quotationController.updateQuotationItem
);
router.delete(
  '/quotations/:id/items/:itemId',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_REP', 'SALES_MANAGER'),
  quotationController.deleteQuotationItem
);
router.post(
  '/quotations/:id/submit',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_REP'),
  quotationController.submitQuotation
);
router.post(
  '/quotations/:id/send',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_REP', 'SALES_MANAGER'),
  quotationController.sendQuotation
);
router.post(
  '/quotations/:id/order-discount',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_REP', 'SALES_MANAGER'),
  quotationController.applyOrderDiscount
);
router.get('/recommendations/:id', authenticate, quotationController.getRecommendations);

// ==========================================
// 5. Approvals (Manager & Finance)
// ==========================================
router.get(
  '/approvals',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER', 'FINANCE_OPERATIONS'),
  approvalController.getPendingApprovals
);
router.post(
  '/approvals/manager-decide',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER'),
  approvalController.managerDecision
);
router.post(
  '/approvals/finance-decide',
  authenticate,
  authorizeRoles('ADMIN', 'FINANCE_OPERATIONS'),
  approvalController.financeDecision
);

// ==========================================
// 6. Fulfillment & Warehouse Splitting
// ==========================================
router.get(
  '/fulfillment/:quotationId/plan',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'SALES_REP'),
  fulfillmentController.getFulfillmentPlan
);
router.post(
  '/fulfillment/:quotationId/allocate',
  authenticate,
  authorizeRoles('ADMIN', 'FINANCE_OPERATIONS', 'SALES_MANAGER'),
  fulfillmentController.allocateFulfillment
);
router.get(
  '/fulfillment/orders',
  authenticate,
  authorizeRoles('ADMIN', 'FINANCE_OPERATIONS', 'SALES_MANAGER', 'SALES_REP'),
  fulfillmentController.getFulfillmentOrders
);
router.get(
  '/fulfillment/backorders',
  authenticate,
  authorizeRoles('ADMIN', 'FINANCE_OPERATIONS'),
  fulfillmentController.getBackorders
);
router.post(
  '/fulfillment/backorders/:id/consolidate',
  authenticate,
  authorizeRoles('ADMIN', 'FINANCE_OPERATIONS'),
  fulfillmentController.consolidateBackorder
);

// ==========================================
// 7. Customer Negotiation & Confirmation
// ==========================================
router.get('/negotiations/:quotationId', authenticate, negotiationController.getNegotiations);
router.post('/negotiations', authenticate, negotiationController.submitCounterOffer);
router.post('/negotiations/:quotationId/respond', authenticate, authorizeRoles('SALES_REP', 'SALES_MANAGER', 'ADMIN'), negotiationController.respondToNegotiation);
router.post('/negotiations/:quotationId/comment', authenticate, authorizeRoles('SALES_REP', 'SALES_MANAGER', 'ADMIN', 'CUSTOMER'), negotiationController.addComment);
router.post('/quotations/:id/confirm', authenticate, negotiationController.confirmQuotation);

// ==========================================
// 8. Invoices & Razorpay Test Payment
// ==========================================
router.get('/invoices', authenticate, authorizeRoles('ADMIN', 'FINANCE_OPERATIONS', 'SALES_MANAGER', 'SALES_REP', 'CUSTOMER'), paymentController.getInvoices);
router.get('/invoices/:id', authenticate, authorizeRoles('ADMIN', 'FINANCE_OPERATIONS', 'SALES_MANAGER', 'SALES_REP', 'CUSTOMER'), paymentController.getInvoiceById);
router.post('/payments/create-order', authenticate, authorizeRoles('ADMIN', 'FINANCE_OPERATIONS', 'CUSTOMER'), paymentController.createOrder);
router.post('/payments/verify', authenticate, authorizeRoles('ADMIN', 'FINANCE_OPERATIONS', 'CUSTOMER'), paymentController.verifyPayment);
router.post('/payments/subscription/order', authenticate, authorizeRoles('ADMIN', 'CUSTOMER'), paymentController.createSubscriptionOrder);
router.post('/payments/subscription/verify', authenticate, authorizeRoles('ADMIN', 'CUSTOMER'), paymentController.verifySubscriptionPayment);

// ==========================================
// 9. Subscriptions & Hybrid Billing
// ==========================================
router.get('/subscriptions', authenticate, subscriptionController.getSubscriptions);
router.get('/subscriptions/plans', authenticate, subscriptionController.getPlans);
router.post(
  '/subscriptions/plans',
  authenticate,
  authorizeRoles('ADMIN', 'FINANCE_OPERATIONS'),
  subscriptionController.savePlan
);
router.post(
  '/subscriptions/:id/cancel',
  authenticate,
  authorizeRoles('ADMIN', 'FINANCE_OPERATIONS', 'SALES_MANAGER'),
  subscriptionController.cancelSub
);
router.post(
  '/subscriptions/:id/modify',
  authenticate,
  authorizeRoles('ADMIN', 'FINANCE_OPERATIONS'),
  subscriptionController.modifySub
);
router.get('/subscriptions/adjustments', authenticate, subscriptionController.getAdjustments);
router.post(
  '/subscriptions/generate-invoice/:quotationId',
  authenticate,
  authorizeRoles('ADMIN', 'FINANCE_OPERATIONS', 'CUSTOMER'),
  subscriptionController.generateInvoice
);
router.post('/subscriptions/prorate', authenticate, subscriptionController.getProrationPreview);

// ==========================================
// 10. Deal Health & Anomaly Detection
// ==========================================
router.get('/deals/health/:quotationId', authenticate, dealHealthController.getHealthByQuotation);
router.get(
  '/deals/overview',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER', 'SALES_REP'),
  dealHealthController.getHealthOverview
);
router.get(
  '/deals/anomalies',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER'),
  dealHealthController.getAnomalies
);
router.post(
  '/deals/nudge',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER'),
  dealHealthController.triggerNudge
);
router.post(
  '/deals/escalate',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER', 'SALES_REP'),
  dealHealthController.escalateDeal
);


// ==========================================
// 12. Reports & Analytics
// ==========================================
router.get(
  '/reports/dashboard',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'SALES_REP'),
  reportController.getDashboardMetrics
);
router.get(
  '/reports/sales-performance',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER'),
  reportController.getSalesPerformance
);
router.get(
  '/reports/product-performance',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER', 'FINANCE_OPERATIONS'),
  reportController.getProductPerformance
);
router.get(
  '/reports/export',
  authenticate,
  authorizeRoles('ADMIN', 'SALES_MANAGER', 'FINANCE_OPERATIONS'),
  reportController.getExportData
);

// ==========================================
// 13. Notifications
// ==========================================
router.get('/notifications', authenticate, notificationController.getNotifications);
router.put('/notifications/:id/read', authenticate, notificationController.markAsRead);
router.put('/notifications/mark-all-read', authenticate, notificationController.markAllAsRead);

const customerPortalController = require('../controllers/customerPortalController');

// ==========================================
// 14. Admin Configuration
// ==========================================
router.get('/admin/users', authenticate, authorizeRoles('ADMIN'), adminController.getUsers);
router.post('/admin/users', authenticate, authorizeRoles('ADMIN'), adminController.createUser);
router.get('/admin/products', authenticate, authorizeRoles('ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'CUSTOMER', 'GUEST'), productController.getProducts);
router.post('/admin/products', authenticate, authorizeRoles('ADMIN'), adminController.createProduct);
router.put('/admin/products/:id', authenticate, authorizeRoles('ADMIN'), adminController.updateProduct);
router.delete('/admin/products/:id', authenticate, authorizeRoles('ADMIN'), adminController.deleteProduct);
router.get('/admin/variants', authenticate, authorizeRoles('ADMIN', 'SALES_REP', 'SALES_MANAGER'), adminController.getProductVariants);
router.post('/admin/variants', authenticate, authorizeRoles('ADMIN'), adminController.saveProductVariant);

router.get('/admin/discount-rules', authenticate, authorizeRoles('ADMIN', 'SALES_MANAGER'), adminController.getDiscountRules);
router.post('/admin/discount-rules', authenticate, authorizeRoles('ADMIN'), adminController.createDiscountRule);
router.put('/admin/discount-rules/:id', authenticate, authorizeRoles('ADMIN'), adminController.updateDiscountRule);

router.get('/admin/approval-rules', authenticate, authorizeRoles('ADMIN', 'SALES_MANAGER'), adminController.getApprovalRules);
router.put('/admin/approval-rules/:id', authenticate, authorizeRoles('ADMIN'), adminController.updateApprovalRule);

router.get('/admin/warehouses', authenticate, authorizeRoles('ADMIN', 'FINANCE_OPERATIONS', 'SALES_MANAGER'), adminController.getWarehouses);
router.post('/admin/warehouses', authenticate, authorizeRoles('ADMIN'), adminController.createWarehouse);
router.put('/admin/warehouses/:id', authenticate, authorizeRoles('ADMIN'), adminController.updateWarehouse);
router.get('/admin/warehouses/:id/inventory', authenticate, authorizeRoles('ADMIN', 'FINANCE_OPERATIONS'), adminController.getWarehouseInventory);
router.post('/admin/warehouses/stock', authenticate, authorizeRoles('ADMIN', 'FINANCE_OPERATIONS'), adminController.updateWarehouseStock);

router.get('/admin/price-lists', authenticate, authorizeRoles('ADMIN', 'SALES_MANAGER', 'SALES_REP'), adminController.getPriceLists);
router.post('/admin/price-lists/item', authenticate, authorizeRoles('ADMIN'), adminController.savePriceListItem);

router.get('/admin/upsell-rules', authenticate, authorizeRoles('ADMIN', 'SALES_MANAGER'), adminController.getUpsellRules);
router.post('/admin/upsell-rules', authenticate, authorizeRoles('ADMIN'), adminController.saveUpsellRule);
router.delete('/admin/upsell-rules/:id', authenticate, authorizeRoles('ADMIN'), adminController.deleteUpsellRule);

router.get('/admin/audit-logs', authenticate, authorizeRoles('ADMIN', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), async (req, res) => {
  try {
    const { query } = require('../config/db');
    const { quotationId, action, limit = 50 } = req.query;
    let sql = `SELECT al.*, u.name as user_name, u.email as user_email, 
               q.quotation_number
               FROM audit_logs al
               LEFT JOIN users u ON al.user_id = u.id
               LEFT JOIN quotations q ON al.quotation_id = q.id
               WHERE 1=1`;
    const params = [];
    if (quotationId) { sql += ' AND al.quotation_id = ?'; params.push(quotationId); }
    if (action) { sql += ' AND al.action = ?'; params.push(action); }
    sql += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));
    const logs = await query(sql, params);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 15. Dedicated B2B Customer Portal Endpoints
// ==========================================
router.get('/customer/dashboard', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.getCustomerDashboard);
router.get('/customer/products', authenticate, authorizeRoles('CUSTOMER', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'GUEST'), customerPortalController.getCustomerProducts);
router.get('/customer/products/:id', authenticate, authorizeRoles('CUSTOMER', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'GUEST'), customerPortalController.getCustomerProductById);

router.get('/customer/cart', authenticate, authorizeRoles('CUSTOMER', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'GUEST'), customerPortalController.getCustomerCart);
router.post('/customer/cart', authenticate, authorizeRoles('CUSTOMER', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'GUEST'), customerPortalController.addToCart);
router.put('/customer/cart/:itemId', authenticate, authorizeRoles('CUSTOMER', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'GUEST'), customerPortalController.updateCartItem);
router.delete('/customer/cart/:itemId', authenticate, authorizeRoles('CUSTOMER', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'GUEST'), customerPortalController.deleteCartItem);
router.post('/customer/cart/generate-quotation', authenticate, authorizeRoles('CUSTOMER', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'GUEST'), customerPortalController.generateQuotationFromCart);

router.get('/customer/quotations', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.getCustomerQuotations);
router.get('/customer/quotations/:id', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.getCustomerQuotationById);
router.post('/customer/quotations/:id/comments', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.addQuotationComment);
router.post('/customer/quotations/:id/counter-offer', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.submitCustomerCounterOffer);
router.post('/customer/quotations/:id/confirm', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.confirmCustomerQuotation);

router.get('/customer/orders', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.getCustomerOrders);
router.get('/customer/invoices', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.getCustomerInvoices);
router.get('/customer/subscriptions', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.getCustomerSubscriptions);
router.get('/customer/notifications', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.getCustomerNotifications);
router.post('/customer/notifications/:id/read', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.markNotificationRead);
router.get('/customer/profile', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.getCustomerProfile);
router.put('/customer/profile', authenticate, authorizeRoles('CUSTOMER', 'GUEST', 'ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'), customerPortalController.updateCustomerProfile);

module.exports = router;

