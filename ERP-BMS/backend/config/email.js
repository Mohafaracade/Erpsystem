const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendMail(to, subject, html) {
    try {
      const info = await this.transporter.sendMail({
        from: `"IMS System" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html
      });
      
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendPasswordReset(email, resetToken, userName) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p>
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated message from IMS System.
        </p>
      </div>
    `;

    return await this.sendMail(email, 'Password Reset Request', html);
  }

  async sendInvoice(email, customerName, invoiceNumber, invoiceUrl) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Invoice</h2>
        <p>Dear ${customerName},</p>
        <p>A new invoice has been generated for you.</p>
        <p>
          <strong>Invoice Number:</strong> ${invoiceNumber}<br>
          <strong>Date:</strong> ${new Date().toLocaleDateString()}
        </p>
        <p>
          <a href="${invoiceUrl}" style="background-color: #2196F3; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px;">
            View Invoice
          </a>
        </p>
        <p>Thank you for your business!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated message from IMS System.
        </p>
      </div>
    `;

    return await this.sendMail(email, `Invoice ${invoiceNumber}`, html);
  }
}

module.exports = new EmailService();