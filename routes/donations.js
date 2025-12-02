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
          await notificationService.sendNotification({
            type: 'email',
            recipient: {
              email: donation.donor.email,
              name: donation.donor.name
            },
            subject: `Thank you for your donation - Receipt #${donation._id}`,
            message: `Dear ${donation.donor.name},\n\nThank you for your generous donation of ${donation.amount} ${donation.currency}.\n\nPurpose: ${donation.purpose}\nTransaction ID: ${captureResult.transactionId}\n\nGod bless you!\n\n${process.env.PARISH_NAME || 'Parish'}`,
            htmlMessage: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a365d;">Thank you for your donation!</h2>
                <p>Dear ${donation.donor.name},</p>
                <p>Thank you for your generous donation of <strong>${donation.amount} ${donation.currency}</strong>.</p>
                <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #2d3748; margin: 20px 0;">
                  <p><strong>Purpose:</strong> ${donation.purpose}</p>
                  <p><strong>Transaction ID:</strong> ${captureResult.transactionId}</p>
                  <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                <p>God bless you!</p>
                <p>${process.env.PARISH_NAME || 'Parish'} Team</p>
              </div>
            `,
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
          await notificationService.sendNotification({
            type: 'email',
            recipient: {
              email: donation.donor.email,
              name: donation.donor.name
            },
            subject: `Thank you for your donation - Receipt #${donation._id}`,
            message: `Dear ${donation.donor.name},\n\nThank you for your generous donation of ${donation.amount} ${donation.currency}.\n\nPurpose: ${donation.purpose}\nTransaction Reference: ${statusResult.financialTransactionId}\n\nGod bless you!\n\n${process.env.PARISH_NAME || 'Parish'}`,
            htmlMessage: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a365d;">Thank you for your donation!</h2>
                <p>Dear ${donation.donor.name},</p>
                <p>Thank you for your generous donation of <strong>${donation.amount} ${donation.currency}</strong>.</p>
                <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #2d3748; margin: 20px 0;">
                  <p><strong>Purpose:</strong> ${donation.purpose}</p>
                  <p><strong>Transaction Reference:</strong> ${statusResult.financialTransactionId}</p>
                  <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                <p>God bless you!</p>
                <p>${process.env.PARISH_NAME || 'Parish'} Team</p>
              </div>
            `,
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
        await notificationService.sendNotification({
          type: 'email',
          recipient: {
            email: donation.donor.email,
            name: donation.donor.name
          },
          subject: `Thank you for your donation - Receipt #${donation._id}`,
          message: `Dear ${donation.donor.name},\n\nThank you for your generous donation of ${donation.amount} ${donation.currency}.\n\nPurpose: ${donation.purpose}\nTransaction Reference: ${financialTransactionId}\n\nGod bless you!\n\n${process.env.PARISH_NAME || 'Parish'}`,
          htmlMessage: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a365d;">Thank you for your donation!</h2>
              <p>Dear ${donation.donor.name},</p>
              <p>Thank you for your generous donation of <strong>${donation.amount} ${donation.currency}</strong>.</p>
              <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #2d3748; margin: 20px 0;">
                <p><strong>Purpose:</strong> ${donation.purpose}</p>
                <p><strong>Transaction Reference:</strong> ${financialTransactionId}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>God bless you!</p>
              <p>${process.env.PARISH_NAME || 'Parish'} Team</p>
            </div>
          `,
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

