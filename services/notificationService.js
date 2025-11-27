import Notification from '../models/Notification.js';
import emailService from './emailService.js';
import smsService from './smsService.js';

class NotificationService {
  /**
   * Send notification via email, WhatsApp (Twilio), or both
   * @param {Object} options
   * @param {string} options.type - 'email', 'sms', or 'both'
   * @param {Object} options.recipient - { email?, phone?, name? }
   * @param {string} options.subject - Notification subject
   * @param {string} options.message - Notification message
   * @param {string} options.htmlMessage - Optional HTML message for email
   * @param {Object} options.metadata - Optional metadata
   * @returns {Promise<Object>} Notification result
   */
  async sendNotification({ type, recipient, subject, message, htmlMessage, metadata = {} }) {
    // Validate inputs
    if (!type || !['email', 'sms', 'both'].includes(type)) {
      throw new Error('Invalid notification type. Must be "email", "sms", or "both"');
    }

    if (!recipient || (!recipient.email && !recipient.phone)) {
      throw new Error('Recipient must have at least email or phone');
    }

    if (!subject && type !== 'sms') {
      throw new Error('Subject is required for email notifications');
    }

    if (!message) {
      throw new Error('Message is required');
    }

    // Create notification record
    const notification = new Notification({
      type,
      recipient: {
        email: recipient.email,
        phone: recipient.phone,
        name: recipient.name
      },
      subject: subject || '',
      message,
      status: 'pending',
      emailStatus: (type === 'email' || type === 'both') ? 'pending' : undefined,
      smsStatus: (type === 'sms' || type === 'both') ? 'pending' : undefined,
      metadata
    });

    const results = {
      email: null,
      sms: null,
      notificationId: notification._id
    };

    try {
      // Send email if needed
      if (type === 'email' || type === 'both') {
        if (recipient.email) {
          try {
            const emailResult = await emailService.sendEmail({
              to: recipient.email,
              subject,
              text: message,
              html: htmlMessage
            });
            
            notification.emailStatus = 'sent';
            results.email = { success: true, ...emailResult };
          } catch (error) {
            notification.emailStatus = 'failed';
            results.email = { success: false, error: error.message };
          }
        } else {
          notification.emailStatus = 'failed';
          results.email = { success: false, error: 'No email provided' };
        }
      }

      // Send WhatsApp if needed
      if (type === 'sms' || type === 'both') {
        if (recipient.phone) {
          try {
            const smsResult = await smsService.sendSMS({
              to: recipient.phone,
              message
            });
            
            notification.smsStatus = 'sent';
            results.sms = { success: true, ...smsResult };
          } catch (error) {
            notification.smsStatus = 'failed';
            results.sms = { success: false, error: error.message };
          }
        } else {
          notification.smsStatus = 'failed';
          results.sms = { success: false, error: 'No phone number provided' };
        }
      }

      // Determine overall status
      if (type === 'email') {
        notification.status = notification.emailStatus;
      } else if (type === 'sms') {
        notification.status = notification.smsStatus;
      } else {
        // both
        if (notification.emailStatus === 'sent' && notification.smsStatus === 'sent') {
          notification.status = 'sent';
        } else if (notification.emailStatus === 'failed' && notification.smsStatus === 'failed') {
          notification.status = 'failed';
        } else {
          notification.status = 'partially_sent';
        }
      }

      // Store error if any failed
      const errors = [];
      if (results.email && !results.email.success) {
        errors.push(`Email: ${results.email.error}`);
      }
      if (results.sms && !results.sms.success) {
        errors.push(`WhatsApp: ${results.sms.error}`);
      }
      if (errors.length > 0) {
        notification.error = errors.join('; ');
      }

      await notification.save();

      return {
        success: notification.status === 'sent' || notification.status === 'partially_sent',
        notificationId: notification._id,
        status: notification.status,
        email: results.email,
        sms: results.sms
      };
    } catch (error) {
      notification.status = 'failed';
      notification.error = error.message;
      await notification.save();
      throw error;
    }
  }

  /**
   * Send bulk notifications
   * @param {Array} recipients - Array of recipient objects
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} Bulk notification results
   */
  async sendBulkNotifications(recipients, { type, subject, message, htmlMessage, metadata = {} }) {
    const results = {
      total: recipients.length,
      successful: 0,
      failed: 0,
      notifications: []
    };

    for (const recipient of recipients) {
      try {
        const result = await this.sendNotification({
          type,
          recipient,
          subject,
          message,
          htmlMessage,
          metadata
        });
        results.successful++;
        results.notifications.push(result);
      } catch (error) {
        results.failed++;
        results.notifications.push({
          success: false,
          recipient,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get notification history
   * @param {Object} filters - Query filters
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Notification history
   */
  async getNotificationHistory(filters = {}, options = {}) {
    const {
      limit = 50,
      skip = 0,
      sort = { createdAt: -1 }
    } = options;

    const query = Notification.find(filters)
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .lean();

    const [notifications, total] = await Promise.all([
      query.exec(),
      Notification.countDocuments(filters)
    ]);

    return {
      notifications,
      total,
      limit,
      skip,
      hasMore: skip + limit < total
    };
  }

  /**
   * Get notification by ID
   * @param {string} notificationId
   * @returns {Promise<Object>} Notification
   */
  async getNotificationById(notificationId) {
    return Notification.findById(notificationId);
  }

  /**
   * Check service availability
   * @returns {Promise<Object>} Service status
   */
  async getServiceStatus() {
    const [emailStatus, smsStatus] = await Promise.all([
      emailService.verifyConnection(),
      smsService.verifyConnection()
    ]);

    return {
      email: emailStatus,
      sms: smsStatus,
      available: {
        email: emailService.isConfigured,
        sms: smsService.isConfigured
      }
    };
  }
}

export default new NotificationService();

