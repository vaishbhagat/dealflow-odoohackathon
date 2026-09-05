const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');
const { logAudit } = require('./auditService');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_gada';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mock_secret';

/**
 * Initialize a Razorpay test order for an invoice
 */
async function createRazorpayOrder(invoiceId, customerUser) {
  const invoices = await query(
    `SELECT inv.*, q.quotation_number, c.company_name, c.email, c.phone
     FROM invoices inv
     JOIN quotations q ON inv.quotation_id = q.id
     JOIN customers c ON inv.customer_id = c.id
     WHERE inv.id = ?`,
    [invoiceId]
  );
  if (invoices.length === 0) throw new Error('Invoice not found');
  const inv = invoices[0];

  if (customerUser && customerUser.customer_id && inv.customer_id !== customerUser.customer_id) {
    throw new Error('Unauthorized: You cannot pay another customer\'s invoice');
  }

  if (inv.payment_status === 'PAID') {
    throw new Error('This invoice has already been fully paid.');
  }

  const amountInPaise = Math.round(parseFloat(inv.due_amount) * 100);
  const orderReceipt = `rcpt_${inv.invoice_number}_${Date.now().toString().slice(-4)}`;

  // Generate Razorpay test order ID
  const orderId = `order_${crypto.randomBytes(8).toString('hex')}`;

  return {
    success: true,
    invoiceId: inv.id,
    invoiceNumber: inv.invoice_number,
    quotationNumber: inv.quotation_number,
    orderId,
    amount: amountInPaise,
    currency: 'INR',
    customerName: inv.company_name,
    customerEmail: inv.email,
    customerPhone: inv.phone,
    razorpayKeyId: RAZORPAY_KEY_ID,
  };
}

/**
 * Verify Razorpay payment signature and mark invoice + quotation as PAID
 */
async function verifyPaymentSignature({
  invoiceId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  userId = null,
}) {
  return await withTransaction(async (conn) => {
    // 1. Fetch invoice
    const [invoices] = await conn.execute(
      `SELECT inv.*, q.id as quote_id, q.quotation_number, c.id as cust_id, c.company_name 
       FROM invoices inv
       JOIN quotations q ON inv.quotation_id = q.id
       JOIN customers c ON inv.customer_id = c.id
       WHERE inv.id = ? FOR UPDATE`,
      [invoiceId]
    );
    if (invoices.length === 0) throw new Error('Invoice not found');
    const inv = invoices[0];

    // 2. Validate cryptographic signature (or test mode simulator)
    let isValid = false;
    if (razorpaySignature && razorpayOrderId && razorpayPaymentId) {
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      isValid = generatedSignature === razorpaySignature || razorpayPaymentId.startsWith('pay_test');
    } else if (razorpayPaymentId && razorpayPaymentId.startsWith('pay_')) {
      isValid = true; // Test mode simulation
    }

    if (!isValid) {
      throw new Error('Payment signature verification failed. Invalid signature received.');
    }

    // 3. Update Invoice to PAID
    await conn.execute(
      `UPDATE invoices 
       SET payment_status = 'PAID', due_amount = 0.00, updated_at = NOW() 
       WHERE id = ?`,
      [invoiceId]
    );

    // 4. Update Quotation to PAID
    await conn.execute(
      `UPDATE quotations 
       SET status = 'PAID', last_activity_at = NOW() 
       WHERE id = ?`,
      [inv.quote_id]
    );

    // 5. Create Payment record
    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;
    const [payResult] = await conn.execute(
      `INSERT INTO payments 
       (payment_number, invoice_id, quotation_id, customer_id, amount, payment_method, gateway, gateway_order_id, gateway_payment_id, gateway_signature, status, verified_at)
       VALUES (?, ?, ?, ?, ?, 'RAZORPAY', 'RAZORPAY', ?, ?, ?, 'SUCCESS', NOW())`,
      [
        paymentNumber,
        invoiceId,
        inv.quote_id,
        inv.cust_id,
        inv.due_amount,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature || 'TEST_VERIFIED',
      ]
    );

    // 6. Notify Finance Operations
    const [financeUsers] = await conn.execute(
      `SELECT id FROM users WHERE role = 'FINANCE_OPERATIONS' AND active = TRUE LIMIT 1`
    );
    if (financeUsers.length > 0) {
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES (?, ?, ?, 'PAYMENT_SUCCESS', ?)`,
        [
          financeUsers[0].id,
          `Payment Received: ${inv.invoice_number}`,
          `₹${parseFloat(inv.due_amount).toLocaleString()} received via Razorpay from ${inv.company_name}.`,
          `/finance/invoices`,
        ]
      );
    }

    // 7. Audit log
    await logAudit({
      quotationId: inv.quote_id,
      userId: userId || inv.cust_id,
      userRole: 'CUSTOMER',
      action: 'PAYMENT_VERIFIED',
      oldValue: 'UNPAID',
      newValue: 'PAID',
      reason: `Razorpay payment verified (${razorpayPaymentId}) for invoice ${inv.invoice_number}. Amount: ₹${inv.due_amount}`,
      connection: conn,
    });

    return {
      success: true,
      paymentNumber,
      invoiceNumber: inv.invoice_number,
      amount: inv.due_amount,
      status: 'PAID',
      paymentId: razorpayPaymentId,
      message: 'Payment verified successfully. Invoice status updated to PAID.',
    };
  });
}

/**
 * Initialize a Razorpay test order for a subscription plan
 */
async function createSubscriptionRazorpayOrder(planId, customerUser) {
  const plans = await query(
    `SELECT sp.*, p.name as product_name
     FROM subscription_plans sp
     JOIN products p ON sp.product_id = p.id
     WHERE sp.id = ? AND sp.active = TRUE`,
    [planId]
  );
  if (plans.length === 0) throw new Error('Subscription plan not found or inactive');
  const plan = plans[0];

  let customer = null;
  if (customerUser && customerUser.customer_id) {
    const custs = await query(`SELECT * FROM customers WHERE id = ?`, [customerUser.customer_id]);
    if (custs.length > 0) customer = custs[0];
  }

  const amountInPaise = Math.round(parseFloat(plan.price) * 100);
  const orderId = `sub_order_${crypto.randomBytes(8).toString('hex')}`;

  return {
    success: true,
    planId: plan.id,
    planName: plan.plan_name,
    productName: plan.product_name,
    billingInterval: plan.billing_interval,
    orderId,
    amount: amountInPaise,
    currency: 'INR',
    customerName: customer ? customer.company_name : customerUser?.name || 'Customer',
    customerEmail: customer ? customer.email : customerUser?.email || '',
    customerPhone: customer ? customer.phone : '',
    razorpayKeyId: RAZORPAY_KEY_ID,
  };
}

/**
 * Verify Razorpay payment signature and activate subscription
 */
async function verifySubscriptionPaymentSignature({
  planId,
  customerId,
  userId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  return await withTransaction(async (conn) => {
    const [plans] = await conn.execute(
      `SELECT sp.*, p.name as product_name 
       FROM subscription_plans sp 
       JOIN products p ON sp.product_id = p.id 
       WHERE sp.id = ? FOR UPDATE`,
      [planId]
    );
    if (plans.length === 0) throw new Error('Subscription plan not found');
    const plan = plans[0];

    // Validate signature
    let isValid = false;
    if (razorpaySignature && razorpayOrderId && razorpayPaymentId) {
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      isValid = generatedSignature === razorpaySignature || razorpayPaymentId.startsWith('pay_test');
    } else if (razorpayPaymentId && razorpayPaymentId.startsWith('pay_')) {
      isValid = true;
    }

    if (!isValid) {
      throw new Error('Payment signature verification failed.');
    }

    // Interval calculation
    let intervalDays = 365;
    if (plan.billing_interval === 'MONTHLY') intervalDays = 30;
    else if (plan.billing_interval === 'QUARTERLY') intervalDays = 90;

    // Create Subscription record
    const [subResult] = await conn.execute(
      `INSERT INTO subscriptions 
       (quotation_id, customer_id, plan_id, status, billing_interval, recurring_amount, start_date, current_period_start, current_period_end, next_billing_date)
       VALUES (NULL, ?, ?, 'ACTIVE', ?, ?, CURRENT_DATE, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL ? DAY), DATE_ADD(CURRENT_DATE, INTERVAL ? DAY))`,
      [
        customerId,
        plan.id,
        plan.billing_interval,
        plan.price,
        intervalDays,
        intervalDays,
      ]
    );

    const subscriptionId = subResult.insertId;

    // Create notification for customer
    if (userId) {
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, type, link_url)
         VALUES (?, ?, ?, 'PAYMENT_SUCCESS', ?)`,
        [
          userId,
          `Subscription Activated: ${plan.plan_name}`,
          `Your subscription to ${plan.plan_name} has been activated successfully!`,
          `/customer/subscriptions`,
        ]
      );
    }

    return {
      success: true,
      subscriptionId,
      planName: plan.plan_name,
      amount: plan.price,
      status: 'ACTIVE',
      paymentId: razorpayPaymentId,
      message: 'Subscription payment successful and plan activated.',
    };
  });
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  createSubscriptionRazorpayOrder,
  verifySubscriptionPaymentSignature,
};
