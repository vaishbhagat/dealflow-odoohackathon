const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Create transport with fallback for local demo mode
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_USER !== 'your_email_username') {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
} else {
  // Simulated Transporter logging emails cleanly to server console
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('📧 [SIMULATED EMAIL SENT]');
      console.log(`   To: ${mailOptions.to}`);
      console.log(`   Subject: ${mailOptions.subject}`);
      console.log(`   From: ${mailOptions.from || process.env.EMAIL_FROM || 'Gada Electronics <notifications@gadaelectronics.com>'}`);
      console.log(`   Body Snippet: ${mailOptions.text ? mailOptions.text.slice(0, 150) : mailOptions.html.slice(0, 150)}...`);
      return { messageId: `sim_${Date.now()}` };
    },
  };
}

/**
 * Send Welcome Email to newly registered customer
 */
async function sendWelcomeEmail({ recipientEmail, customerName }) {
  try {
    const from = process.env.EMAIL_FROM || 'Gada Electronics <notifications@gadaelectronics.com>';
    const subject = 'Welcome to Gada Electronics – DealFlow360';
    const text = `Hello ${customerName || 'Valued Partner'},

Welcome to Gada Electronics!

Your DealFlow360 account has been created successfully.

You can now:
- View commercial electronics products
- Request B2B quotations
- Negotiate quotation discounts with your account manager
- Track order fulfillment
- Manage tax invoices and make payments securely

Regards,
Gada Electronics Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0;">Gada Electronics</h2>
          <p style="color: #2563eb; margin: 4px 0 0 0; font-weight: bold; font-size: 14px;">DealFlow360 B2B Enterprise Platform</p>
        </div>
        <h3 style="color: #0f172a;">Welcome, ${customerName || 'Valued Customer'}!</h3>
        <p style="color: #475569; line-height: 1.6;">
          Your DealFlow360 account has been created successfully. You can now access our complete electronics catalog, generate B2B quotations, negotiate pricing terms directly with account managers, and track order fulfillment.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #1e293b;">Key Features Available in Your Portal:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #334155;">
            <li>Product Catalog with customer-tier discounts</li>
            <li>B2B Cart to Quotation request creation</li>
            <li>Direct counter-offer negotiation channel</li>
            <li>Razorpay integrated online invoice payments</li>
          </ul>
        </div>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px; border-top: 1px solid #f1f5f9; pt: 16px;">
          Regards,<br /><strong>Gada Electronics Sales Operations Team</strong>
        </p>
      </div>
    `;

    return await transporter.sendMail({ from, to: recipientEmail, subject, text, html });
  } catch (err) {
    console.error('Failed to send welcome email:', err.message);
  }
}

/**
 * Send Transactional Email for Quotations, Payments, Orders
 */
async function sendTransactionalEmail({ recipientEmail, subject, message, actionUrl }) {
  try {
    const from = process.env.EMAIL_FROM || 'Gada Electronics <notifications@gadaelectronics.com>';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0;">Gada Electronics</h2>
          <p style="color: #2563eb; margin: 4px 0 0 0; font-weight: bold; font-size: 14px;">DealFlow360 Notification</p>
        </div>
        <h3 style="color: #0f172a;">${subject}</h3>
        <p style="color: #475569; line-height: 1.6;">${message}</p>
        ${actionUrl ? `
          <div style="margin: 24px 0;">
            <a href="${actionUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View in Workspace</a>
          </div>
        ` : ''}
        <p style="color: #64748b; font-size: 13px; margin-top: 24px; border-top: 1px solid #f1f5f9; pt: 16px;">
          Gada Electronics Enterprise Sales Platform
        </p>
      </div>
    `;

    return await transporter.sendMail({ from, to: recipientEmail, subject, text: message, html });
  } catch (err) {
    console.error('Failed to send transactional email:', err.message);
  }
}

module.exports = {
  sendWelcomeEmail,
  sendTransactionalEmail,
};
