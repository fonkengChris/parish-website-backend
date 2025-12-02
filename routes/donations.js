import express from 'express';
import { body, validationResult } from 'express-validator';
import Donation from '../models/Donation.js';
import paymentService from '../services/paymentService.js';
import notificationService from '../services/notificationService.js';
import { errorLogger } from '../utils/logger.js';
import { authenticate, requireAdminOrParishPriest } from '../middleware/auth.js';

const router = express.Router();

// Get payment methods status (public)
router.get('/payment-methods/status', async (req, res) => {
  try {
    res.json({
      paypal: {
        available: paymentService.isPayPalConfigured(),
        configured: !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET
      },
      mtnMobileMoney: {
        available: paymentService.isMTNConfigured(),
        configured: !!process.env.MTN_API_KEY && !!process.env.MTN_API_SECRET && !!process.env.MTN_SUBSCRIPTION_KEY
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error checking payment methods status');
    res.status(500).json({ message: 'Error checking payment methods status', error: error.message });
  }
});

// Test MTN API connection (for debugging - remove in production or add auth)
router.get('/mtn/test-connection', async (req, res) => {
  try {
    if (!paymentService.isMTNConfigured()) {
      return res.status(503).json({ 
        message: 'MTN Mobile Money is not configured',
        error: 'MTN_MOBILE_MONEY_NOT_CONFIGURED',
        configured: {
          apiKey: !!process.env.MTN_API_KEY,
          apiSecret: !!process.env.MTN_API_SECRET,
          subscriptionKey: !!process.env.MTN_SUBSCRIPTION_KEY,
          apiUserUuid: !!process.env.MTN_API_USER_UUID
        }
      });
    }

    // Try to get access token
    try {
      const accessToken = await paymentService.getMTNAccessToken();
      res.json({
        success: true,
        message: 'MTN API connection successful',
        hasAccessToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        environment: process.env.MTN_ENVIRONMENT || 'sandbox',
        baseUrl: process.env.MTN_ENVIRONMENT === 'production' 
          ? 'https://api.mtn.cm' 
          : 'https://sandbox.momodeveloper.mtn.com',
        hasApiUserUuid: !!process.env.MTN_API_USER_UUID
      });
    } catch (tokenError) {
      const errorResponse = {
        success: false,
        message: 'Failed to get MTN access token',
        error: tokenError.message,
        environment: process.env.MTN_ENVIRONMENT || 'sandbox',
        baseUrl: process.env.MTN_ENVIRONMENT === 'production' 
          ? 'https://api.mtn.cm' 
          : 'https://sandbox.momodeveloper.mtn.com',
        hasApiUserUuid: !!process.env.MTN_API_USER_UUID,
        configured: {
          apiKey: !!process.env.MTN_API_KEY,
          apiSecret: !!process.env.MTN_API_SECRET,
          subscriptionKey: !!process.env.MTN_SUBSCRIPTION_KEY,
          apiUserUuid: !!process.env.MTN_API_USER_UUID
        }
      };

      // Include detailed error in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.details = {
          status: tokenError.response?.status,
          statusText: tokenError.response?.statusText,
          data: tokenError.response?.data,
          url: tokenError.config?.url
        };
      }

      res.status(tokenError.response?.status || 500).json(errorResponse);
    }
  } catch (error) {
    errorLogger.error({ err: error }, 'Error testing MTN connection');
    res.status(500).json({ 
      message: 'Error testing MTN connection', 
      error: error.message 
    });
  }
});

// Get all donations (admin/parish-priest only)
router.get('/', authenticate, requireAdminOrParishPriest, async (req, res) => {
  try {
    const { status, paymentMethod, purpose, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (purpose) query.purpose = purpose;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const donations = await Donation.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Donation.countDocuments(query);

    res.json({
      donations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching donations');
    res.status(500).json({ message: 'Error fetching donations', error: error.message });
  }
});

// Get donation by ID (admin/parish-priest only)
router.get('/:id', authenticate, requireAdminOrParishPriest, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    res.json(donation);
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching donation');
    res.status(500).json({ message: 'Error fetching donation', error: error.message });
  }
});

// Create PayPal donation order
router.post(
  '/paypal/create-order',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('currency').optional().isIn(['USD', 'EUR', 'XAF']).withMessage('Invalid currency'),
    body('purpose').isIn(['general', 'building', 'charity', 'education', 'maintenance', 'events', 'sacraments', 'other']).withMessage('Invalid purpose'),
    body('donor.name').trim().notEmpty().withMessage('Donor name is required'),
    body('donor.email').isEmail().withMessage('Valid email is required'),
    body('donor.phone').optional().trim(),
    body('purposeDescription').optional().trim(),
    body('notes').optional().trim(),
    body('isAnonymous').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      if (!paymentService.isPayPalConfigured()) {
        return res.status(503).json({ 
          message: 'PayPal payment is not configured',
          error: 'PAYPAL_NOT_CONFIGURED',
          details: 'Please contact the administrator. PayPal payment method is not available at this time.'
        });
      }

      const { amount, currency = 'USD', purpose, donor, purposeDescription, notes, isAnonymous } = req.body;

      // Create PayPal order
      const paypalOrder = await paymentService.createPayPalOrder(
        parseFloat(amount),
        currency,
        purpose,
        donor
      );

      // Create donation record
      const donation = new Donation({
        donor: {
          name: donor.name,
          email: donor.email,
          phone: donor.phone || ''
        },
        amount: parseFloat(amount),
        currency,
        purpose,
        purposeDescription: purposeDescription || '',
        paymentMethod: 'paypal',
        status: 'pending',
        paymentId: paypalOrder.orderId,
        paymentDetails: {
          approvalUrl: paypalOrder.approvalUrl,
          orderStatus: paypalOrder.status
        },
        notes: notes || '',
        isAnonymous: isAnonymous || false
      });

      await donation.save();

      res.json({
        donationId: donation._id,
        orderId: paypalOrder.orderId,
        approvalUrl: paypalOrder.approvalUrl,
        status: 'pending'
      });
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
      errorLogger.error({ err: error, body: req.body, details: errorDetails, stack: error.stack }, 'Error creating PayPal order');
      
      // Provide more detailed error information
      const errorResponse = {
        message: 'Error creating PayPal order',
        error: error.message
      };

      // Include additional error details in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.details = errorDetails;
      }

      res.status(error.response?.status || 500).json(errorResponse);
    }
  }
);

// Capture PayPal payment
router.post(
  '/paypal/capture',
  [
    body('orderId').trim().notEmpty().withMessage('Order ID is required'),
    body('donationId').trim().notEmpty().withMessage('Donation ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const { orderId, donationId } = req.body;

      // Find donation
      const donation = await Donation.findById(donationId);
      if (!donation) {
        return res.status(404).json({ message: 'Donation not found' });
      }

      if (donation.paymentMethod !== 'paypal') {
        return res.status(400).json({ message: 'Invalid payment method' });
      }

      if (donation.status !== 'pending') {
        return res.status(400).json({ message: 'Donation already processed' });
      }

      // Capture PayPal payment
      const captureResult = await paymentService.capturePayPalOrder(orderId);

      if (captureResult.status === 'COMPLETED') {
        // Update donation
        donation.status = 'completed';
        donation.paymentId = captureResult.transactionId;
        donation.paymentDetails = {
          ...donation.paymentDetails,
          captureStatus: captureResult.status,
          transactionId: captureResult.transactionId,
          payerEmail: captureResult.payerEmail,
          payerName: captureResult.payerName
        };
        await donation.save();

        // Send receipt email
        try {
          const donationDate = new Date(donation.createdAt || Date.now());
          const formattedDate = donationDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          const formattedTime = donationDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });

          const purposeLabels = {
            'general': 'General Donation',
            'building': 'Building Fund',
            'charity': 'Charity',
            'education': 'Education',
            'maintenance': 'Maintenance',
            'events': 'Events',
            'sacraments': 'Sacraments',
            'other': donation.purposeDescription || 'Other'
          };

          const purposeLabel = purposeLabels[donation.purpose] || donation.purpose;

          const plainText = `Dear ${donation.donor.name},

Thank you for your generous donation to ${process.env.PARISH_NAME || 'our Parish'}!

DONATION RECEIPT
================

Receipt Number: ${donation._id}
Date: ${formattedDate} at ${formattedTime}
Amount: ${donation.amount} ${donation.currency}
Payment Method: PayPal
Transaction ID: ${captureResult.transactionId}
Purpose: ${purposeLabel}${donation.purposeDescription ? ` - ${donation.purposeDescription}` : ''}${donation.notes ? `\nNotes: ${donation.notes}` : ''}

Your donation will help us continue our mission and serve our community. We are truly grateful for your support.

May God bless you abundantly!

With gratitude,
${process.env.PARISH_NAME || 'Parish'} Team
${process.env.PARISH_CONTACT_EMAIL ? `\nContact: ${process.env.PARISH_CONTACT_EMAIL}` : ''}

---
This is an automated receipt. Please keep this email for your records.`;

          const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Thank You!</h1>
              <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Your donation receipt</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${donation.donor.name}</strong>,
              </p>
              <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                Thank you for your generous donation to <strong>${process.env.PARISH_NAME || 'our Parish'}</strong>! Your support helps us continue our mission and serve our community.
              </p>
              
              <!-- Receipt Box -->
              <div style="background-color: #f7fafc; border-left: 4px solid #2d3748; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h2 style="color: #1a365d; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">DONATION RECEIPT</h2>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px; width: 40%;"><strong>Receipt Number:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-family: monospace;">${donation._id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Date:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">${formattedDate} at ${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Amount:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 16px; font-weight: bold;">${donation.amount} ${donation.currency}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Payment Method:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">PayPal</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Transaction ID:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-family: monospace; word-break: break-all;">${captureResult.transactionId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Purpose:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">${purposeLabel}${donation.purposeDescription ? ` - ${donation.purposeDescription}` : ''}</td>
                  </tr>
                  ${donation.notes ? `
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Notes:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">${donation.notes}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 25px 0;">
                We are truly grateful for your support. May God bless you abundantly!
              </p>
              
              <p style="color: #2d3748; font-size: 15px; margin: 30px 0 10px 0;">
                With gratitude,<br>
                <strong>${process.env.PARISH_NAME || 'Parish'} Team</strong>
              </p>
              ${process.env.PARISH_CONTACT_EMAIL ? `
              <p style="color: #718096; font-size: 13px; margin: 10px 0 0 0;">
                Contact: <a href="mailto:${process.env.PARISH_CONTACT_EMAIL}" style="color: #2d3748; text-decoration: none;">${process.env.PARISH_CONTACT_EMAIL}</a>
              </p>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 12px; margin: 0; line-height: 1.5;">
                This is an automated receipt. Please keep this email for your records.<br>
                If you have any questions, please contact us at ${process.env.PARISH_CONTACT_EMAIL || 'the parish office'}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

          await notificationService.sendNotification({
            type: 'email',
            recipient: {
              email: donation.donor.email,
              name: donation.donor.name
            },
            subject: `Thank you for your donation - Receipt #${donation._id.toString().substring(0, 8)}`,
            message: plainText,
            htmlMessage: htmlMessage,
            metadata: {
              source: 'donation_receipt',
              donationId: donation._id.toString()
            }
          });
          donation.receiptSent = true;
          await donation.save();
        } catch (emailError) {
          errorLogger.error({ err: emailError }, 'Failed to send donation receipt email');
        }

        res.json({
          success: true,
          donation: donation,
          transactionId: captureResult.transactionId
        });
      } else {
        donation.status = 'failed';
        await donation.save();
        res.status(400).json({ message: 'Payment capture failed', status: captureResult.status });
      }
    } catch (error) {
      errorLogger.error({ err: error, body: req.body }, 'Error capturing PayPal payment');
      res.status(500).json({ message: 'Error capturing payment', error: error.message });
    }
  }
);

// Create MTN Mobile Money payment request
router.post(
  '/mtn/create-request',
  [
    body('amount').isFloat({ min: 100 }).withMessage('Amount must be at least 100 XAF'),
    body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
    body('purpose').isIn(['general', 'building', 'charity', 'education', 'maintenance', 'events', 'sacraments', 'other']).withMessage('Invalid purpose'),
    body('donor.name').trim().notEmpty().withMessage('Donor name is required'),
    body('donor.email').isEmail().withMessage('Valid email is required'),
    body('purposeDescription').optional().trim(),
    body('notes').optional().trim(),
    body('isAnonymous').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      if (!paymentService.isMTNConfigured()) {
        return res.status(503).json({ 
          message: 'MTN Mobile Money payment is not configured',
          error: 'MTN_MOBILE_MONEY_NOT_CONFIGURED',
          details: 'Please contact the administrator. MTN Mobile Money payment method is not available at this time.'
        });
      }

      const { amount, phoneNumber, purpose, donor, purposeDescription, notes, isAnonymous } = req.body;

      // Create MTN payment request
      const mtnPayment = await paymentService.createMTNPaymentRequest(
        parseFloat(amount),
        phoneNumber,
        purpose,
        donor
      );

      // Create donation record
      const donation = new Donation({
        donor: {
          name: donor.name,
          email: donor.email,
          phone: phoneNumber
        },
        amount: parseFloat(amount),
        currency: 'XAF',
        purpose,
        purposeDescription: purposeDescription || '',
        paymentMethod: 'mtn-mobile-money',
        status: 'pending',
        paymentId: mtnPayment.referenceId,
        paymentDetails: {
          referenceId: mtnPayment.referenceId,
          phoneNumber: mtnPayment.phoneNumber,
          status: mtnPayment.status
        },
        notes: notes || '',
        isAnonymous: isAnonymous || false
      });

      await donation.save();

      res.json({
        donationId: donation._id,
        referenceId: mtnPayment.referenceId,
        phoneNumber: mtnPayment.phoneNumber,
        status: 'pending',
        message: 'Payment request created. Please approve the payment on your phone.'
      });
    } catch (error) {
      errorLogger.error({ err: error, body: req.body, stack: error.stack }, 'Error creating MTN payment request');
      
      // Provide more detailed error information
      const errorResponse = {
        message: 'Error creating MTN payment request',
        error: error.message
      };

      // Include additional error details in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.details = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        };
      }

      res.status(error.response?.status || 500).json(errorResponse);
    }
  }
);

// Check MTN payment status
router.post(
  '/mtn/check-status',
  [
    body('donationId').trim().notEmpty().withMessage('Donation ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const { donationId } = req.body;

      const donation = await Donation.findById(donationId);
      if (!donation) {
        return res.status(404).json({ message: 'Donation not found' });
      }

      if (donation.paymentMethod !== 'mtn-mobile-money') {
        return res.status(400).json({ message: 'Invalid payment method' });
      }

      if (donation.status !== 'pending') {
        return res.json({
          status: donation.status,
          donation: donation
        });
      }

      // Check payment status
      const statusResult = await paymentService.checkMTNPaymentStatus(donation.paymentId);

      // Update donation based on status
      if (statusResult.status === 'SUCCESSFUL') {
        donation.status = 'completed';
        donation.paymentDetails = {
          ...donation.paymentDetails,
          ...statusResult
        };
        await donation.save();

        // Send receipt email
        try {
          const donationDate = new Date(donation.createdAt || Date.now());
          const formattedDate = donationDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          const formattedTime = donationDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });

          const purposeLabels = {
            'general': 'General Donation',
            'building': 'Building Fund',
            'charity': 'Charity',
            'education': 'Education',
            'maintenance': 'Maintenance',
            'events': 'Events',
            'sacraments': 'Sacraments',
            'other': donation.purposeDescription || 'Other'
          };

          const purposeLabel = purposeLabels[donation.purpose] || donation.purpose;

          const plainText = `Dear ${donation.donor.name},

Thank you for your generous donation to ${process.env.PARISH_NAME || 'our Parish'}!

DONATION RECEIPT
================

Receipt Number: ${donation._id}
Date: ${formattedDate} at ${formattedTime}
Amount: ${donation.amount} ${donation.currency}
Payment Method: MTN Mobile Money
Transaction Reference: ${statusResult.financialTransactionId}
Purpose: ${purposeLabel}${donation.purposeDescription ? ` - ${donation.purposeDescription}` : ''}${donation.notes ? `\nNotes: ${donation.notes}` : ''}

Your donation will help us continue our mission and serve our community. We are truly grateful for your support.

May God bless you abundantly!

With gratitude,
${process.env.PARISH_NAME || 'Parish'} Team
${process.env.PARISH_CONTACT_EMAIL ? `\nContact: ${process.env.PARISH_CONTACT_EMAIL}` : ''}

---
This is an automated receipt. Please keep this email for your records.`;

          const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Thank You!</h1>
              <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Your donation receipt</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${donation.donor.name}</strong>,
              </p>
              <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                Thank you for your generous donation to <strong>${process.env.PARISH_NAME || 'our Parish'}</strong>! Your support helps us continue our mission and serve our community.
              </p>
              
              <!-- Receipt Box -->
              <div style="background-color: #f7fafc; border-left: 4px solid #2d3748; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h2 style="color: #1a365d; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">DONATION RECEIPT</h2>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px; width: 40%;"><strong>Receipt Number:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-family: monospace;">${donation._id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Date:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">${formattedDate} at ${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Amount:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 16px; font-weight: bold;">${donation.amount} ${donation.currency}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Payment Method:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">MTN Mobile Money</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Transaction Reference:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-family: monospace; word-break: break-all;">${statusResult.financialTransactionId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Purpose:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">${purposeLabel}${donation.purposeDescription ? ` - ${donation.purposeDescription}` : ''}</td>
                  </tr>
                  ${donation.notes ? `
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Notes:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">${donation.notes}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 25px 0;">
                We are truly grateful for your support. May God bless you abundantly!
              </p>
              
              <p style="color: #2d3748; font-size: 15px; margin: 30px 0 10px 0;">
                With gratitude,<br>
                <strong>${process.env.PARISH_NAME || 'Parish'} Team</strong>
              </p>
              ${process.env.PARISH_CONTACT_EMAIL ? `
              <p style="color: #718096; font-size: 13px; margin: 10px 0 0 0;">
                Contact: <a href="mailto:${process.env.PARISH_CONTACT_EMAIL}" style="color: #2d3748; text-decoration: none;">${process.env.PARISH_CONTACT_EMAIL}</a>
              </p>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 12px; margin: 0; line-height: 1.5;">
                This is an automated receipt. Please keep this email for your records.<br>
                If you have any questions, please contact us at ${process.env.PARISH_CONTACT_EMAIL || 'the parish office'}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

          await notificationService.sendNotification({
            type: 'email',
            recipient: {
              email: donation.donor.email,
              name: donation.donor.name
            },
            subject: `Thank you for your donation - Receipt #${donation._id.toString().substring(0, 8)}`,
            message: plainText,
            htmlMessage: htmlMessage,
            metadata: {
              source: 'donation_receipt',
              donationId: donation._id.toString()
            }
          });
          donation.receiptSent = true;
          await donation.save();
        } catch (emailError) {
          errorLogger.error({ err: emailError }, 'Failed to send donation receipt email');
        }
      } else if (statusResult.status === 'FAILED') {
        donation.status = 'failed';
        await donation.save();
      }

      res.json({
        status: donation.status,
        paymentStatus: statusResult.status,
        donation: donation
      });
    } catch (error) {
      errorLogger.error({ err: error, body: req.body }, 'Error checking MTN payment status');
      res.status(500).json({ message: 'Error checking payment status', error: error.message });
    }
  }
);

// MTN callback endpoint (webhook)
router.post('/mtn/callback', async (req, res) => {
  try {
    const { externalId, status, financialTransactionId } = req.body;

    if (!externalId) {
      return res.status(400).json({ message: 'Missing externalId' });
    }

    const donation = await Donation.findOne({ paymentId: externalId });
    if (!donation) {
      errorLogger.warn({ externalId }, 'Donation not found for MTN callback');
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (status === 'SUCCESSFUL') {
      donation.status = 'completed';
      donation.paymentDetails = {
        ...donation.paymentDetails,
        financialTransactionId,
        status
      };
      await donation.save();

      // Send receipt email
      try {
        const donationDate = new Date(donation.createdAt || Date.now());
        const formattedDate = donationDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const formattedTime = donationDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        const purposeLabels = {
          'general': 'General Donation',
          'building': 'Building Fund',
          'charity': 'Charity',
          'education': 'Education',
          'maintenance': 'Maintenance',
          'events': 'Events',
          'sacraments': 'Sacraments',
          'other': donation.purposeDescription || 'Other'
        };

        const purposeLabel = purposeLabels[donation.purpose] || donation.purpose;

        const plainText = `Dear ${donation.donor.name},

Thank you for your generous donation to ${process.env.PARISH_NAME || 'our Parish'}!

DONATION RECEIPT
================

Receipt Number: ${donation._id}
Date: ${formattedDate} at ${formattedTime}
Amount: ${donation.amount} ${donation.currency}
Payment Method: MTN Mobile Money
Transaction Reference: ${financialTransactionId}
Purpose: ${purposeLabel}${donation.purposeDescription ? ` - ${donation.purposeDescription}` : ''}${donation.notes ? `\nNotes: ${donation.notes}` : ''}

Your donation will help us continue our mission and serve our community. We are truly grateful for your support.

May God bless you abundantly!

With gratitude,
${process.env.PARISH_NAME || 'Parish'} Team
${process.env.PARISH_CONTACT_EMAIL ? `\nContact: ${process.env.PARISH_CONTACT_EMAIL}` : ''}

---
This is an automated receipt. Please keep this email for your records.`;

        const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Thank You!</h1>
              <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Your donation receipt</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${donation.donor.name}</strong>,
              </p>
              <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                Thank you for your generous donation to <strong>${process.env.PARISH_NAME || 'our Parish'}</strong>! Your support helps us continue our mission and serve our community.
              </p>
              
              <!-- Receipt Box -->
              <div style="background-color: #f7fafc; border-left: 4px solid #2d3748; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h2 style="color: #1a365d; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">DONATION RECEIPT</h2>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px; width: 40%;"><strong>Receipt Number:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-family: monospace;">${donation._id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Date:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">${formattedDate} at ${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Amount:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 16px; font-weight: bold;">${donation.amount} ${donation.currency}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Payment Method:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">MTN Mobile Money</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Transaction Reference:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px; font-family: monospace; word-break: break-all;">${financialTransactionId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Purpose:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">${purposeLabel}${donation.purposeDescription ? ` - ${donation.purposeDescription}` : ''}</td>
                  </tr>
                  ${donation.notes ? `
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;"><strong>Notes:</strong></td>
                    <td style="padding: 8px 0; color: #2d3748; font-size: 14px;">${donation.notes}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 25px 0;">
                We are truly grateful for your support. May God bless you abundantly!
              </p>
              
              <p style="color: #2d3748; font-size: 15px; margin: 30px 0 10px 0;">
                With gratitude,<br>
                <strong>${process.env.PARISH_NAME || 'Parish'} Team</strong>
              </p>
              ${process.env.PARISH_CONTACT_EMAIL ? `
              <p style="color: #718096; font-size: 13px; margin: 10px 0 0 0;">
                Contact: <a href="mailto:${process.env.PARISH_CONTACT_EMAIL}" style="color: #2d3748; text-decoration: none;">${process.env.PARISH_CONTACT_EMAIL}</a>
              </p>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 12px; margin: 0; line-height: 1.5;">
                This is an automated receipt. Please keep this email for your records.<br>
                If you have any questions, please contact us at ${process.env.PARISH_CONTACT_EMAIL || 'the parish office'}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        await notificationService.sendNotification({
          type: 'email',
          recipient: {
            email: donation.donor.email,
            name: donation.donor.name
          },
          subject: `Thank you for your donation - Receipt #${donation._id.toString().substring(0, 8)}`,
          message: plainText,
          htmlMessage: htmlMessage,
          metadata: {
            source: 'donation_receipt',
            donationId: donation._id.toString()
          }
        });
        donation.receiptSent = true;
        await donation.save();
      } catch (emailError) {
        errorLogger.error({ err: emailError }, 'Failed to send donation receipt email');
      }
    } else if (status === 'FAILED') {
      donation.status = 'failed';
      await donation.save();
    }

    res.status(200).json({ message: 'Callback processed' });
  } catch (error) {
    errorLogger.error({ err: error, body: req.body }, 'Error processing MTN callback');
    res.status(500).json({ message: 'Error processing callback', error: error.message });
  }
});

export default router;

