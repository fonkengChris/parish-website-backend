import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired tokens
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster lookups
refreshTokenSchema.index({ userId: 1, token: 1 });

export default mongoose.model('RefreshToken', refreshTokenSchema);

