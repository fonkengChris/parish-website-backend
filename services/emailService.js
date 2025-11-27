import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASSWORD,
      SMTP_FROM_EMAIL,
      SMTP_FROM_NAME
    } = process.env;

    // Check if email is configured
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      console.warn('Email service not configured. Missing SMTP credentials.');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587'),
        secure: SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASSWORD
        }
      });

      this.fromEmail = SMTP_FROM_EMAIL || SMTP_USER;
      this.fromName = SMTP_FROM_NAME || 'Parish Website';
      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to initialize email service:', error.message);
      this.isConfigured = false;
    }
  }

  async sendEmail({ to, subject, text, html, replyTo }) {
    if (!this.isConfigured || !this.transporter) {
      throw new Error('Email service is not configured');
    }

    if (!to) {
      throw new Error('Recipient email is required');
    }

    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html: html || text
      };

      if (replyTo) {
        mailOptions.replyTo = replyTo;
      }

      const info = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async verifyConnection() {
    if (!this.isConfigured || !this.transporter) {
      return { success: false, message: 'Email service is not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service is ready' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

export default new EmailService();

