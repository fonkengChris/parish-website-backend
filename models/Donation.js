import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema({
  donor: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'XAF', // Central African CFA franc (Cameroon)
    enum: ['XAF', 'USD', 'EUR']
  },
  purpose: {
    type: String,
    required: true,
    enum: [
      'general',
      'building',
      'charity',
      'education',
      'maintenance',
      'events',
      'sacraments',
      'other'
    ]
  },
  purposeDescription: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['paypal', 'mtn-mobile-money']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentId: {
    type: String, // PayPal transaction ID or MTN transaction reference
    trim: true
  },
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed // Store payment-specific details
  },
  notes: {
    type: String,
    trim: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  receiptSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
donationSchema.index({ status: 1, createdAt: -1 });
donationSchema.index({ 'donor.email': 1 });
donationSchema.index({ paymentId: 1 });

export default mongoose.model('Donation', donationSchema);

