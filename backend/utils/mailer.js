const nodemailer = require('nodemailer');

/**
 * Create reusable transporter object using Gmail SMTP
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Gmail App Password
    },
  });
};

/**
 * Send verification email to user
 * @param {string} email - User's email address
 * @param {string} token - Verification token
 * @param {string} name - User's name
 * @param {string} [clientUrl] - Optional client base URL (from Origin/Referer header)
 * @returns {Promise<void>}
 */
const sendVerificationEmail = async (email, token, name, clientUrl = null) => {
  try {
    const transporter = createTransporter();

    // Determine base URL based on environment or client request
    let baseUrl;

    // Priority 1: Use client URL if provided (from Origin header)
    if (clientUrl) {
      // Clean up client URL (remove trailing slash)
      baseUrl = clientUrl.endsWith('/') ? clientUrl.slice(0, -1) : clientUrl;
      console.log(`Using client-provided base URL: ${baseUrl}`);
    } else {
      // Priority 2: Fallback to environment configuration or defaults
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const clientPort = process.env.CLIENT_PORT || 8080;
      const defaultBaseUrl = isDev ? `http://localhost:${clientPort}` : 'https://shelfmerch.in';

      baseUrl = process.env.BASE_URL || defaultBaseUrl;
      console.log(`Using default/env base URL: ${baseUrl}`);
    }

    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"ShelfMerch" <${process.env.EMAIL_USER}@gmail.com>`,
      to: email,
      subject: 'Verify your email – ShelfMerch',
      html: ` 
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #2563eb; margin-top: 0;">Welcome to ShelfMerch!</h1>
            
            <p>Hi ${name},</p>
            
            <p>Thank you for signing up! Please verify your email address to complete your registration and start using ShelfMerch.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't create an account with ShelfMerch, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; margin-bottom: 0;">
              © ${new Date().getFullYear()} ShelfMerch. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to ShelfMerch!
        
        Hi ${name},
        
        Thank you for signing up! Please verify your email address by clicking the link below:
        
        ${verificationUrl}
        
        This link will expire in 24 hours. If you didn't create an account with ShelfMerch, please ignore this email.
        
        © ${new Date().getFullYear()} ShelfMerch. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Send password reset OTP email to user
 * @param {string} email - User's email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} name - User's name
 * @param {object} metadata - Device and location info
 * @returns {Promise<void>}
 */
const sendPasswordResetOTP = async (email, otp, name, metadata = {}) => {
  try {
    const transporter = createTransporter();

    // Format date and time in IST
    const now = new Date();
    const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const dateTime = istDate.toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const device = metadata.device || 'Unknown Browser';
    const location = metadata.location || 'Unknown Location';
    const denyUrl = `${process.env.BASE_URL || 'http://shelfmerch.in'}/auth?action=deny-reset`;

    const mailOptions = {
      from: `"ShelfMerch" <shelfmerch@gmail.com>`,
      to: email,
      subject: 'Password Reset Request – ShelfMerch',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #2563eb; margin-top: 0;">Password Reset Request</h1>
            
            <p>Hi ${name},</p>
            
            <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0;">
              <strong>Someone is attempting to reset the password of your account.</strong>
            </p>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;"><strong>Date & Time:</strong> ${dateTime}</p>
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;"><strong>Device:</strong> ${device}</p>
              <p style="margin: 0; color: #666; font-size: 14px;"><strong>Approximate Location:</strong> ${location}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0; padding: 30px; background-color: #f0f9ff; border-radius: 8px; border: 2px solid #2563eb;">
              <p style="margin: 0 0 15px 0; color: #333; font-size: 16px; font-weight: 600;">Your verification code is:</p>
              <div style="font-size: 48px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
              <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            </div>
            
            <p style="color: #dc2626; font-size: 14px; margin: 20px 0;">
              <strong>⚠️ If you didn't request this,</strong> 
              <a href="${denyUrl}" style="color: #dc2626; text-decoration: underline;">click here to deny</a>.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; margin-bottom: 0; text-align: center;">
              <strong>Don't share this code with anyone.</strong><br>
              ShelfMerch will never ask for your password or verification code.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 20px; margin-bottom: 0; text-align: center;">
              © ${new Date().getFullYear()} ShelfMerch. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request - ShelfMerch
        
        Hi ${name},
        
        Someone is attempting to reset the password of your account.
        
        Date & Time: ${dateTime}
        Device: ${device}
        Approximate Location: ${location}
        
        Your verification code is: ${otp}
        
        This code will expire in 10 minutes.
        
        ⚠️ If you didn't request this, please ignore this email or contact support.
        
        Don't share this code with anyone.
        ShelfMerch will never ask for your password or verification code.
        
        © ${new Date().getFullYear()} ShelfMerch. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset OTP email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    throw error;
  }
};

/**
 * Send generic OTP email to user
 * @param {string} email - User's email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} name - User's name
 * @param {string} type - 'login' | 'signup' | 'reset'
 * @returns {Promise<void>}
 */
const sendOTP = async (email, otp, name, type = 'login') => {
  try {
    const transporter = createTransporter();

    let subject, title, instruction;

    if (type === 'signup') {
      subject = 'Verify your email – ShelfMerch';
      title = 'Verify your email';
      instruction = 'Use the following code to complete your registration:';
    } else if (type === 'reset') {
      subject = 'Password Reset Request – ShelfMerch';
      title = 'Password Reset Request';
      instruction = 'Use the following code to reset your password:';
    } else {
      subject = 'Login Verification – ShelfMerch';
      title = 'Login Verification';
      instruction = 'Use the following code to log in to your account:';
    }

    const mailOptions = {
      from: `"ShelfMerch" <${process.env.EMAIL_USER}@gmail.com>`,
      to: email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #2563eb; margin-top: 0;">${title}</h1>
            <p>Hi ${name || 'there'},</p>
            <p>${instruction}</p>
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #ffffff; border-radius: 8px; border: 2px solid #2563eb;">
              <div style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 5px;">
                ${otp}
              </div>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} ShelfMerch. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

/**
 * Send order notification email to merchant
 * @param {string} merchantEmail - Merchant's email address
 * @param {object} order - Order details
 * @param {string} storeName - Name of the store
 * @returns {Promise<void>}
 */
const sendMerchantOrderNotification = async (merchantEmail, order, storeName) => {
  try {
    const transporter = createTransporter();

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount);
    };

    const orderUrl = `${process.env.BASE_URL || 'https://shelfmerch.com'}/orders/${order._id}`;

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <div style="font-weight: bold;">${item.productName}</div>
          <div style="font-size: 12px; color: #666;">
            ${item.variant?.color ? `Color: ${item.variant.color}` : ''} 
            ${item.variant?.size ? ` | Size: ${item.variant.size}` : ''}
          </div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"ShelfMerch" <${process.env.EMAIL_USER}@gmail.com>`,
      to: merchantEmail,
      subject: `New Order Received - ${storeName} (#${order._id.toString().slice(-8).toUpperCase()})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Order Received</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2563eb; margin-top: 0;">New Order!</h1>
              <p style="font-size: 18px; color: #4b5563;">You've received a new order on <strong>${storeName}</strong></p>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
              <h2 style="font-size: 16px; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Order Summary</h2>
              <p style="margin: 10px 0;"><strong>Order ID:</strong> #${order._id.toString().toUpperCase()}</p>
              <p style="margin: 10px 0;"><strong>Customer:</strong> ${order.shippingAddress?.fullName || 'N/A'} (${order.customerEmail})</p>
              <p style="margin: 10px 0;"><strong>Payment Method:</strong> ${order.payment?.method?.toUpperCase() || 'N/A'}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
              <thead style="background-color: #f3f4f6;">
                <tr>
                  <th style="padding: 10px; text-align: left; font-size: 14px;">Item</th>
                  <th style="padding: 10px; text-align: center; font-size: 14px;">Qty</th>
                  <th style="padding: 10px; text-align: right; font-size: 14px;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal:</td>
                  <td style="padding: 10px; text-align: right;">${formatCurrency(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Shipping:</td>
                  <td style="padding: 10px; text-align: right;">${formatCurrency(order.shipping)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Tax:</td>
                  <td style="padding: 10px; text-align: right;">${formatCurrency(order.tax)}</td>
                </tr>
                <tr style="font-size: 18px; background-color: #f9fafb;">
                  <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold; color: #2563eb;">Total:</td>
                  <td style="padding: 10px; text-align: right; font-weight: bold; color: #2563eb;">${formatCurrency(order.total)}</td>
                </tr>
              </tfoot>
            </table>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${orderUrl}" 
                 style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                View Order in Dashboard
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; margin-bottom: 0; text-align: center;">
              © ${new Date().getFullYear()} ShelfMerch. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        New Order Received - ${storeName}
        
        You've received a new order!
        
        Order Details:
        Order ID: #${order._id}
        Customer: ${order.shippingAddress?.fullName || 'N/A'} (${order.customerEmail})
        Total: ${formatCurrency(order.total)}
        
        View order details: ${orderUrl}
        
        © ${new Date().getFullYear()} ShelfMerch. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Merchant order notification sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending merchant order notification:', error);
    // Don't throw error to avoid breaking the checkout flow if email fails
    return null;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetOTP,
  sendOTP,
  sendMerchantOrderNotification,
};

