import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['email', 'sms', 'both'],
    required: true
  },
  recipient: {
    email: String,
    phone: String,
    name: String
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'partially_sent'],
    default: 'pending'
  },
  emailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  smsStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  error: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ 'recipient.email': 1 });
notificationSchema.index({ 'recipient.phone': 1 });

export default mongoose.model('Notification', notificationSchema);

