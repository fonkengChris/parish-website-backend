import axios from 'axios';
import { errorLogger } from '../utils/logger.js';

class PaymentService {
  constructor() {
    this.paypalClientId = process.env.PAYPAL_CLIENT_ID;
    this.paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.paypalMode = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'
    this.paypalBaseUrl = this.paypalMode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    
    // MTN Mobile Money API credentials (Cameroon)
    // Note: We read from process.env dynamically in methods to ensure fresh values
    this.mtnEnvironment = process.env.MTN_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'
    this.mtnBaseUrl = this.mtnEnvironment === 'production'
      ? 'https://api.mtn.cm'
      : 'https://sandbox.momodeveloper.mtn.com';
    // MTN requires an API User UUID - this should be created in the MTN developer portal
    // The API user UUID is used in the token endpoint path
    
    this.paypalAccessToken = null;
    this.paypalTokenExpiry = null;
  }

  // PayPal Methods
  async getPayPalAccessToken() {
    try {
      // Check if we have a valid token
      if (this.paypalAccessToken && this.paypalTokenExpiry && Date.now() < this.paypalTokenExpiry) {
        return this.paypalAccessToken;
      }

      // Read from process.env dynamically
      const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
      
      if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials not configured');
      }

      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.paypalBaseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (!response.data.access_token) {
        throw new Error('PayPal API did not return an access token');
      }

      this.paypalAccessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.paypalTokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      
      return this.paypalAccessToken;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      };
      errorLogger.error({ err: error, details: errorDetails }, 'Failed to get PayPal access token');
      
      if (error.response?.status === 401) {
        throw new Error('PayPal API authentication failed. Please check your Client ID and Client Secret.');
      } else if (error.response?.data?.error_description) {
        throw new Error(`PayPal API error: ${error.response.data.error_description}`);
      } else if (error.response?.data?.error) {
        throw new Error(`PayPal API error: ${error.response.data.error}`);
      }
      throw new Error(`Failed to authenticate with PayPal: ${error.message}`);
    }
  }

  async createPayPalOrder(amount, currency, purpose, donorInfo) {
    try {
      // Read from process.env dynamically
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials not configured');
      }

      const accessToken = await this.getPayPalAccessToken();
      
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency || 'USD',
            value: amount.toFixed(2)
          },
          description: `Donation for ${purpose}`,
          custom_id: `donation_${Date.now()}`,
          soft_descriptor: 'Parish Donation'
        }],
        application_context: {
          brand_name: process.env.PARISH_NAME || 'Parish Website',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/donations/success`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/donations`
        },
        payer: {
          name: {
            given_name: donorInfo.name?.split(' ')[0] || donorInfo.name,
            surname: donorInfo.name?.split(' ').slice(1).join(' ') || ''
          },
          email_address: donorInfo.email
        }
      };

      const response = await axios.post(
        `${this.paypalBaseUrl}/v2/checkout/orders`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );

      if (!response.data.id) {
        throw new Error('PayPal order creation failed: No order ID returned');
      }

      const approvalUrl = response.data.links?.find(link => link.rel === 'approve')?.href;
      if (!approvalUrl) {
        throw new Error('PayPal order creation failed: No approval URL returned');
      }

      return {
        orderId: response.data.id,
        approvalUrl: approvalUrl,
        status: response.data.status
      };
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        requestData: {
          amount,
          currency,
          purpose
        }
      };
      errorLogger.error({ err: error, details: errorDetails }, 'Failed to create PayPal order');
      
      // Provide more specific error messages
      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || error.response?.data?.details?.[0]?.description || 'Invalid request data';
        throw new Error(`PayPal API validation error: ${errorMsg}`);
      } else if (error.response?.status === 401) {
        throw new Error('PayPal API authentication failed. Please check your PayPal credentials.');
      } else if (error.response?.status === 403) {
        throw new Error('PayPal API access forbidden. Please check your PayPal account permissions.');
      } else if (error.response?.data?.message) {
        throw new Error(`PayPal API error: ${error.response.data.message}`);
      } else if (error.response?.data?.details) {
        const details = error.response.data.details;
        const errorMsg = Array.isArray(details) ? details.map(d => d.description || d.issue).join(', ') : details;
        throw new Error(`PayPal API error: ${errorMsg}`);
      }
      throw new Error(`Failed to create PayPal order: ${error.message}`);
    }
  }

  async capturePayPalOrder(orderId) {
    try {
      const accessToken = await this.getPayPalAccessToken();
      
      const response = await axios.post(
        `${this.paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );

      const capture = response.data.purchase_units[0].payments.captures[0];
      
      return {
        transactionId: capture.id,
        status: capture.status,
        amount: parseFloat(capture.amount.value),
        currency: capture.amount.currency_code,
        payerEmail: response.data.payer?.email_address,
        payerName: response.data.payer?.name?.given_name + ' ' + response.data.payer?.name?.surname
      };
    } catch (error) {
      errorLogger.error({ err: error, orderId }, 'Failed to capture PayPal order');
      throw new Error('Failed to capture PayPal payment');
    }
  }

  // MTN Mobile Money Methods
  async getMTNAccessToken() {
    let lastEndpoint = null; // Declare in outer scope for error handling
    
    try {
      // Read from process.env dynamically
      const apiKey = process.env.MTN_API_KEY?.trim();
      const apiSecret = process.env.MTN_API_SECRET?.trim();
      const subscriptionKey = process.env.MTN_SUBSCRIPTION_KEY?.trim();
      const apiUserUuid = process.env.MTN_API_USER_UUID?.trim(); // API User UUID from MTN developer portal
      
      if (!apiKey || !apiSecret) {
        throw new Error('MTN Mobile Money credentials not configured');
      }

      if (!subscriptionKey) {
        throw new Error('MTN Subscription Key is required');
      }

      // MTN API uses Basic authentication with API Key and Secret
      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      
      // MTN API token endpoint - try different formats
      // Format 1: /collection/token/?{apiUserUuid} (if API User UUID is provided)
      // Format 2: /collection/token/ (standard endpoint)
      const endpoints = [];
      if (apiUserUuid) {
        // API User UUID format: /collection/token/?{apiUserUuid}
        endpoints.push(`/collection/token/?${apiUserUuid}`);
      }
      // Standard collection token endpoint
      endpoints.push('/collection/token/');
      
      let lastError = null;
      
      for (const tokenEndpoint of endpoints) {
        try {
          lastEndpoint = `${this.mtnBaseUrl}${tokenEndpoint}`;
          
          // Try with subscription key in Ocp-Apim-Subscription-Key header
          const headers = {
            'Authorization': `Basic ${auth}`,
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Content-Type': 'application/json'
          };

          const response = await axios.post(
            lastEndpoint,
            {},
            {
              headers,
              validateStatus: (status) => status < 500 // Don't throw on 4xx errors
            }
          );

          if (response.status === 200 && response.data.access_token) {
            return response.data.access_token;
          } else if (response.status === 401) {
            // Authentication failed - don't try other endpoints
            const errorMsg = response.data?.message || response.data?.error || 'Authentication failed';
            throw new Error(`MTN API authentication failed: ${errorMsg}`);
          } else if (response.status === 403) {
            // Forbidden - subscription key issue
            const errorMsg = response.data?.message || response.data?.error || 'Access forbidden';
            if (errorMsg.includes('subscription key') || errorMsg.includes('subscription')) {
              throw new Error(`MTN API subscription key error: ${errorMsg}. Please verify:\n1. Your subscription key is correct\n2. The subscription key matches the API product (Collection API)\n3. The subscription is active in the MTN developer portal`);
            }
            throw new Error(`MTN API access forbidden: ${errorMsg}. Check your subscription key and API User permissions.`);
          } else if (response.status === 404) {
            // Resource not found - try next endpoint
            lastError = new Error(`Endpoint not found: ${tokenEndpoint}`);
            continue;
          } else {
            // Other error
            const errorMsg = response.data?.message || response.data?.error || `HTTP ${response.status}`;
            throw new Error(`MTN API error: ${errorMsg}`);
          }
        } catch (error) {
          // If it's an axios error with response, handle it
          if (error.response) {
            if (error.response.status === 404) {
              lastError = error;
              continue; // Try next endpoint
            } else {
              // Other HTTP error - don't try other endpoints
              throw error;
            }
          } else if (error.message && !error.message.includes('Endpoint not found')) {
            // Non-HTTP error or specific error message
            throw error;
          } else {
            lastError = error;
          }
        }
      }
      
      // If all endpoints failed, throw the last error
      if (lastError) {
        throw lastError;
      }
      throw new Error('Failed to get access token from any endpoint');
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        endpoint: lastEndpoint
      };
      errorLogger.error({ err: error, details: errorDetails }, 'Failed to get MTN access token');
      
      // Re-throw if it's already a formatted error
      if (error.message.includes('MTN API')) {
        throw error;
      }
      
      if (error.response?.status === 401) {
        throw new Error('MTN API authentication failed. Please verify your API Key and API Secret are correct.');
      } else if (error.response?.status === 403) {
        throw new Error('MTN API access forbidden. Please check your Subscription Key and API User permissions.');
      } else if (error.response?.data?.message) {
        throw new Error(`MTN API error: ${error.response.data.message}`);
      } else if (error.response?.data?.error) {
        throw new Error(`MTN API error: ${error.response.data.error}`);
      }
      throw new Error(`Failed to authenticate with MTN Mobile Money: ${error.message}`);
    }
  }

  async createMTNPaymentRequest(amount, phoneNumber, purpose, donorInfo) {
    // MTN Mobile Money currency - use environment variable or default
    // Note: Sandbox might not support XAF, check MTN documentation for supported currencies
    // For Cameroon production, use 'XAF'. For sandbox, might need different currency
    // Declare in outer scope so it's accessible in catch block
    const currency = process.env.MTN_CURRENCY || 'XAF';
    
    try {
      const accessToken = await this.getMTNAccessToken();
      
      // Generate UUID v4 for reference ID (MTN requires UUID v4 format)
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      const referenceId = generateUUID();
      
      // Format phone number (ensure it starts with 237 for Cameroon)
      let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
      
      // Handle different phone number formats
      if (formattedPhone.startsWith('237')) {
        // Already has country code
        formattedPhone = formattedPhone;
      } else if (formattedPhone.startsWith('0')) {
        // Remove leading 0 and add country code (e.g., 0678123456 -> 237678123456)
        formattedPhone = '237' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('6') || formattedPhone.startsWith('7')) {
        // Starts with 6 or 7 (common Cameroon mobile prefixes), add country code
        formattedPhone = '237' + formattedPhone;
      } else {
        // Try to add country code anyway
        formattedPhone = '237' + formattedPhone;
      }

      // Validate phone number format
      // Cameroon mobile numbers: 237 + 9 digits (usually starts with 6 or 7)
      // Total should be 12 digits: 237XXXXXXXXX
      if (formattedPhone.length < 12) {
        throw new Error(`Invalid phone number format. Phone number too short. Expected format: 237XXXXXXXXX (12 digits total). Got: ${formattedPhone.length} digits.`);
      } else if (formattedPhone.length > 12) {
        throw new Error(`Invalid phone number format. Phone number too long. Expected format: 237XXXXXXXXX (12 digits total). Got: ${formattedPhone.length} digits.`);
      }
      
      // Additional validation: Cameroon mobile numbers typically start with 2376 or 2377
      if (!formattedPhone.match(/^237[67]\d{8}$/)) {
        // Warn but don't fail - some numbers might be valid even if they don't match the pattern
        errorLogger.warn({ phoneNumber, formattedPhone }, 'Phone number format warning: May not be a valid Cameroon mobile number');
      }
      
      const paymentData = {
        amount: amount.toString(),
        currency: currency,
        externalId: referenceId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: formattedPhone
        },
        payerMessage: `Donation for ${purpose}`,
        payeeNote: `Thank you for your donation to ${process.env.PARISH_NAME || 'Parish'}`,
        callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/donations/mtn/callback`
      };

      const subscriptionKey = process.env.MTN_SUBSCRIPTION_KEY;
      const targetEnvironment = this.mtnEnvironment === 'production' ? 'production' : 'sandbox';

      const response = await axios.post(
        `${this.mtnBaseUrl}/collection/v1_0/requesttopay`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Target-Environment': targetEnvironment,
            'X-Reference-Id': referenceId,
            'Ocp-Apim-Subscription-Key': subscriptionKey || '',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        referenceId,
        status: 'PENDING',
        phoneNumber: formattedPhone
      };
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        requestData: {
          amount,
          phoneNumber,
          purpose
        }
      };
      errorLogger.error({ err: error, details: errorDetails }, 'Failed to create MTN payment request');
      
      // Provide more specific error messages
      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Invalid request data';
        
        // Check for currency-related errors
        if (errorMsg.toLowerCase().includes('currency') || errorMsg.toLowerCase().includes('not supported')) {
          throw new Error(`MTN API currency error: ${errorMsg}. The currency '${currency}' may not be supported. For sandbox testing, you might need to use a different currency code. Check your MTN developer portal or set MTN_CURRENCY environment variable.`);
        }
        
        throw new Error(`MTN API validation error: ${errorMsg}`);
      } else if (error.response?.status === 401) {
        throw new Error('MTN API authentication failed. Please check your access token.');
      } else if (error.response?.status === 403) {
        throw new Error('MTN API access forbidden. Please check your subscription key and permissions.');
      } else if (error.response?.status === 409) {
        throw new Error('A payment request with this reference already exists. Please try again.');
      } else if (error.response?.data?.message) {
        const errorMsg = error.response.data.message;
        
        // Check for currency-related errors
        if (errorMsg.toLowerCase().includes('currency') || errorMsg.toLowerCase().includes('not supported')) {
          throw new Error(`MTN API currency error: ${errorMsg}. The currency '${currency}' may not be supported. For sandbox testing, you might need to use a different currency code. Check your MTN developer portal or set MTN_CURRENCY environment variable.`);
        }
        
        throw new Error(`MTN API error: ${errorMsg}`);
      } else if (error.message.includes('Invalid phone number')) {
        throw error; // Re-throw validation errors as-is
      }
      throw new Error(`Failed to create MTN Mobile Money payment request: ${error.message}`);
    }
  }

  async checkMTNPaymentStatus(referenceId) {
    try {
      // Read from process.env dynamically
      const subscriptionKey = process.env.MTN_SUBSCRIPTION_KEY?.trim();
      const mtnEnvironment = process.env.MTN_ENVIRONMENT || 'sandbox';
      
      if (!subscriptionKey) {
        throw new Error('MTN Subscription Key is required');
      }
      
      const accessToken = await this.getMTNAccessToken();
      
      const response = await axios.get(
        `${this.mtnBaseUrl}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Target-Environment': mtnEnvironment === 'production' ? 'production' : 'sandbox',
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        status: response.data.status,
        amount: parseFloat(response.data.amount),
        currency: response.data.currency,
        financialTransactionId: response.data.financialTransactionId,
        externalId: response.data.externalId
      };
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        referenceId
      };
      errorLogger.error({ err: error, details: errorDetails }, 'Failed to check MTN payment status');
      
      if (error.response?.status === 401) {
        throw new Error('MTN API authentication failed when checking payment status. Please verify your credentials.');
      } else if (error.response?.status === 404) {
        throw new Error('Payment request not found. The reference ID may be invalid or the payment may not have been created.');
      } else if (error.response?.data?.message) {
        throw new Error(`MTN API error: ${error.response.data.message}`);
      }
      throw new Error(`Failed to check MTN payment status: ${error.message}`);
    }
  }

  // Check if services are configured (read from process.env dynamically)
  isPayPalConfigured() {
    return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  }

  isMTNConfigured() {
    return !!(process.env.MTN_API_KEY && process.env.MTN_API_SECRET && process.env.MTN_SUBSCRIPTION_KEY);
  }
}

export default new PaymentService();

