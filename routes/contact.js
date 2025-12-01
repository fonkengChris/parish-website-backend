import express from 'express';
import { body, validationResult } from 'express-validator';
import notificationService from '../services/notificationService.js';
import emailService from '../services/emailService.js';
import { errorLogger } from '../utils/logger.js';

const router = express.Router();

// Check email service status (public - for debugging)
router.get('/status', async (req, res) => {
  try {
    const status = await notificationService.getServiceStatus();
    res.json({
      email: {
        configured: emailService.isConfigured,
        status: status.email,
        available: status.available.email
      },
      sms: {
        configured: status.available.sms,
        status: status.sms
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error checking service status',
      error: error.message 
    });
  }
});

// Contact form submission (public)
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      const { name, email, subject, message } = req.body;

      // Get parish contact email from environment or use default
      const parishEmail = process.env.PARISH_CONTACT_EMAIL || process.env.SMTP_FROM_EMAIL || 'info@parishlimbe.cm';
      const parishName = process.env.PARISH_NAME || 'Parish Website';

      // Check if email service is configured
      if (!emailService.isConfigured) {
        errorLogger.warn('Email service is not configured. Contact form submission will not send emails.');
        console.warn('⚠️  Email service is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in your .env file.');
      }

      // Send confirmation email to the user
      try {
        await notificationService.sendNotification({
          type: 'email',
          recipient: {
            email,
            name
          },
          subject: `Thank you for contacting ${parishName}`,
          message: `Dear ${name},\n\nThank you for contacting us. We have received your message and will get back to you soon.\n\nYour message:\n"${message}"\n\nBest regards,\n${parishName} Team`,
          htmlMessage: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a365d;">Thank you for contacting ${parishName}</h2>
              <p>Dear ${name},</p>
              <p>Thank you for contacting us. We have received your message and will get back to you soon.</p>
              <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #2d3748; margin: 20px 0;">
                <p style="margin: 0;"><strong>Your message:</strong></p>
                <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${message}</p>
              </div>
              <p>Best regards,<br>${parishName} Team</p>
            </div>
          `,
          metadata: {
            source: 'contact_form',
            userEmail: email,
            userSubject: subject
          }
        });
      } catch (emailError) {
        errorLogger.error({ err: emailError, email, stack: emailError.stack }, 'Failed to send confirmation email to user');
        console.error('❌ Failed to send confirmation email:', emailError.message);
        // Continue even if confirmation email fails
      }

      // Send notification to parish admin
      try {
        const subjectMap = {
          'general': 'General Inquiry',
          'sacraments': 'Sacraments Inquiry',
          'ministries': 'Ministries Inquiry',
          'events': 'Events Inquiry',
          'other': 'Other Inquiry'
        };

        const displaySubject = subjectMap[subject] || subject;

        await notificationService.sendNotification({
          type: 'email',
          recipient: {
            email: parishEmail,
            name: parishName
          },
          subject: `New Contact Form Submission: ${displaySubject}`,
          message: `A new contact form submission has been received:\n\nName: ${name}\nEmail: ${email}\nSubject: ${displaySubject}\n\nMessage:\n${message}\n\n---\nPlease respond to: ${email}`,
          htmlMessage: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a365d;">New Contact Form Submission</h2>
              <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Subject:</strong> ${displaySubject}</p>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                  <p><strong>Message:</strong></p>
                  <p style="white-space: pre-wrap; margin-top: 10px;">${message}</p>
                </div>
              </div>
              <p style="color: #718096; font-size: 14px;">---<br>Please respond to: <a href="mailto:${email}">${email}</a></p>
            </div>
          `,
          metadata: {
            source: 'contact_form',
            userEmail: email,
            userName: name,
            userSubject: subject
          }
        });
      } catch (adminEmailError) {
        errorLogger.error({ err: adminEmailError, stack: adminEmailError.stack }, 'Failed to send notification email to parish admin');
        console.error('❌ Failed to send admin notification email:', adminEmailError.message);
        // Log but don't fail the request
      }

      // Log success (even if emails failed, the form submission was successful)
      console.log('✅ Contact form submitted successfully:', { name, email, subject });
      
      res.status(200).json({ 
        message: 'Thank you for your message. We will get back to you soon.',
        success: true
      });
    } catch (error) {
      errorLogger.error({ err: error, body: req.body }, 'Contact form submission error');
      res.status(500).json({ 
        message: 'Error processing your message. Please try again later.',
        error: error.message 
      });
    }
  }
);

export default router;

