import twilio from 'twilio';

class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER
    } = process.env;

    // Check if SMS is configured
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.warn('SMS service not configured. Missing Twilio credentials.');
      this.isConfigured = false;
      return;
    }

    try {
      this.client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      this.fromNumber = TWILIO_PHONE_NUMBER;
      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to initialize SMS service:', error.message);
      this.isConfigured = false;
    }
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // If already in E.164 format, return as is
    if (phone.startsWith('+') && /^\+[1-9]\d{1,14}$/.test(phone)) {
      return phone;
    }
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 0) {
      return null;
    }
    
    // If it's 10 digits, assume US number and add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    // If it's 11 digits and starts with 1, add +
    else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    // For other lengths, try to add + if not present
    else if (cleaned.length > 0) {
      return `+${cleaned}`;
    }
    
    return phone;
  }

  async sendSMS({ to, message }) {
    if (!this.isConfigured || !this.client) {
      throw new Error('SMS service is not configured');
    }

    if (!to) {
      throw new Error('Recipient phone number is required');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Message is required');
    }

    // Check message length (SMS limit is 1600 characters for Twilio)
    if (message.length > 1600) {
      throw new Error('Message exceeds SMS character limit (1600 characters)');
    }

    try {
      const formattedPhone = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedPhone
      });

      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('SMS send error:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  async verifyConnection() {
    if (!this.isConfigured || !this.client) {
      return { success: false, message: 'SMS service is not configured' };
    }

    try {
      // Try to fetch account info to verify credentials
      const account = await this.client.api.accounts(this.client.username).fetch();
      return { 
        success: true, 
        message: 'SMS service is ready',
        accountStatus: account.status
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

export default new SMSService();

