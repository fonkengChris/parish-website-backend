import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env from the backend directory (parent of scripts)
const envPath = join(__dirname, '..', '.env');
console.log('📁 Looking for .env file at:', envPath);
console.log('   File exists:', existsSync(envPath) ? '✅ Yes' : '❌ No');
console.log('');

// Load environment variables FIRST, before importing the service
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.log('⚠️  Error loading .env file:', result.error.message);
  console.log('');
} else {
  console.log('✅ .env file loaded successfully');
  console.log('');
}

// Import payment service after env vars are loaded
import paymentService from '../services/paymentService.js';

console.log('🔍 Checking Payment Configuration...\n');

// Check PayPal Configuration
const paypalClientId = process.env.PAYPAL_CLIENT_ID?.trim();
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

console.log('📋 PayPal Configuration:');
console.log('  Client ID:', paypalClientId ? `✅ Set (${paypalClientId.length} chars)` : '❌ Missing or empty');
console.log('  Client Secret:', paypalClientSecret ? `✅ Set (${paypalClientSecret.length} chars)` : '❌ Missing or empty');
console.log('  Mode:', process.env.PAYPAL_MODE || 'sandbox (default)');
console.log('  Configured:', paymentService.isPayPalConfigured() ? '✅ Yes' : '❌ No');

if (!paymentService.isPayPalConfigured()) {
  console.log('');
  console.log('  ⚠️  Issue detected:');
  if (!paypalClientId) console.log('    - PAYPAL_CLIENT_ID is missing or empty');
  if (!paypalClientSecret) console.log('    - PAYPAL_CLIENT_SECRET is missing or empty');
}
console.log('');

// Check MTN Mobile Money Configuration
const mtnApiKey = process.env.MTN_API_KEY?.trim();
const mtnApiSecret = process.env.MTN_API_SECRET?.trim();
const mtnSubscriptionKey = process.env.MTN_SUBSCRIPTION_KEY?.trim();

console.log('📋 MTN Mobile Money Configuration:');
console.log('  API Key:', mtnApiKey ? `✅ Set (${mtnApiKey.length} chars)` : '❌ Missing or empty');
console.log('  API Secret:', mtnApiSecret ? `✅ Set (${mtnApiSecret.length} chars)` : '❌ Missing or empty');
console.log('  Subscription Key:', mtnSubscriptionKey ? `✅ Set (${mtnSubscriptionKey.length} chars)` : '❌ Missing or empty');
console.log('  Environment:', process.env.MTN_ENVIRONMENT || 'sandbox (default)');
console.log('  Configured:', paymentService.isMTNConfigured() ? '✅ Yes' : '❌ No');

if (!paymentService.isMTNConfigured()) {
  console.log('');
  console.log('  ⚠️  Issue detected:');
  if (!mtnApiKey) console.log('    - MTN_API_KEY is missing or empty');
  if (!mtnApiSecret) console.log('    - MTN_API_SECRET is missing or empty');
  if (!mtnSubscriptionKey) console.log('    - MTN_SUBSCRIPTION_KEY is missing or empty');
  
  // Check what the service actually sees
  console.log('');
  console.log('  🔍 Service internal values:');
  console.log('    - Service sees API Key:', paymentService.mtnApiKey ? `Yes (${paymentService.mtnApiKey.length} chars)` : 'No');
  console.log('    - Service sees API Secret:', paymentService.mtnApiSecret ? `Yes (${paymentService.mtnApiSecret.length} chars)` : 'No');
  console.log('    - Service sees Subscription Key:', paymentService.mtnSubscriptionKey ? `Yes (${paymentService.mtnSubscriptionKey.length} chars)` : 'No');
}
console.log('');

// Check Other Required Settings
console.log('📋 Other Settings:');
console.log('  Backend URL:', process.env.BACKEND_URL || '❌ Not set (defaults to http://localhost:5000)');
console.log('  Frontend URL:', process.env.FRONTEND_URL || '❌ Not set (defaults to http://localhost:3000)');
console.log('  Parish Name:', process.env.PARISH_NAME || '❌ Not set');
console.log('');

// Summary
console.log('📊 Summary:');
const paypalOk = paymentService.isPayPalConfigured();
const mtnOk = paymentService.isMTNConfigured();

if (paypalOk && mtnOk) {
  console.log('  ✅ Both payment methods are configured!');
} else if (paypalOk) {
  console.log('  ⚠️  Only PayPal is configured');
} else if (mtnOk) {
  console.log('  ⚠️  Only MTN Mobile Money is configured');
} else {
  console.log('  ❌ No payment methods are configured');
  console.log('');
  console.log('  Please set the following environment variables:');
  if (!paypalOk) {
    console.log('    - PAYPAL_CLIENT_ID');
    console.log('    - PAYPAL_CLIENT_SECRET');
  }
  if (!mtnOk) {
    console.log('    - MTN_API_KEY');
    console.log('    - MTN_API_SECRET');
    console.log('    - MTN_SUBSCRIPTION_KEY');
  }
}

console.log('');

