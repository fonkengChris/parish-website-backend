import express from 'express';
import { body, validationResult } from 'express-validator';
import notificationService from '../services/notificationService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get service status
router.get('/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const status = await notificationService.getServiceStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get notification history
router.get('/history', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      limit = 50,
      skip = 0,
      status,
      type,
      email,
      phone
    } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (email) filters['recipient.email'] = email;
    if (phone) filters['recipient.phone'] = phone;

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      sort: { createdAt: -1 }
    };

    const history = await notificationService.getNotificationHistory(filters, options);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single notification
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send notification
router.post('/send', 
  authenticate, 
  requireAdmin,
  [
    body('type').isIn(['email', 'sms', 'both']).withMessage('Type must be email, sms, or both'),
    body('recipient').isObject().withMessage('Recipient is required'),
    body('recipient.email').optional().isEmail().withMessage('Invalid email'),
    body('recipient.phone').optional().isString().withMessage('Phone must be a string'),
    body('message').notEmpty().withMessage('Message is required'),
    body('htmlMessage').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, recipient, subject, message, htmlMessage, metadata } = req.body;

      // Validate subject for email notifications
      if ((type === 'email' || type === 'both') && !subject) {
        return res.status(400).json({ message: 'Subject is required for email notifications' });
      }

      // Validate recipient has at least email or phone based on type
      if ((type === 'email' || type === 'both') && !recipient.email) {
        return res.status(400).json({ message: 'Email is required for email notifications' });
      }
      if ((type === 'sms' || type === 'both') && !recipient.phone) {
        return res.status(400).json({ message: 'Phone is required for SMS notifications' });
      }

      const result = await notificationService.sendNotification({
        type,
        recipient,
        subject,
        message,
        htmlMessage,
        metadata
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Send bulk notifications
router.post('/send-bulk',
  authenticate,
  requireAdmin,
  [
    body('recipients').isArray().notEmpty().withMessage('Recipients array is required'),
    body('type').isIn(['email', 'sms', 'both']).withMessage('Type must be email, sms, or both'),
    body('message').notEmpty().withMessage('Message is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { recipients, type, subject, message, htmlMessage, metadata } = req.body;

      // Validate subject for email notifications
      if ((type === 'email' || type === 'both') && !subject) {
        return res.status(400).json({ message: 'Subject is required for email notifications' });
      }

      // Validate recipients
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: 'Recipients must be a non-empty array' });
      }

      // Validate each recipient has required fields
      for (const recipient of recipients) {
        if ((type === 'email' || type === 'both') && !recipient.email) {
          return res.status(400).json({ message: 'All recipients must have email for email notifications' });
        }
        if ((type === 'sms' || type === 'both') && !recipient.phone) {
          return res.status(400).json({ message: 'All recipients must have phone for SMS notifications' });
        }
      }

      const result = await notificationService.sendBulkNotifications(recipients, {
        type,
        subject,
        message,
        htmlMessage,
        metadata
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

export default router;

