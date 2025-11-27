import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // For admin/editor users
  username: {
    type: String,
    sparse: true, // Allows null/undefined, but must be unique when present
    unique: true,
    trim: true
  },
  // For parishioner users (email-based)
  email: {
    type: String,
    sparse: true, // Allows null/undefined, but must be unique when present
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'parishioner'],
    required: true
  },
  // One-to-one relationship with Parishioner (only for parishioner role)
  parishioner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parishioner',
    default: null
  }
}, {
  timestamps: true
});

// Validation: either username or email must be provided
userSchema.pre('validate', function(next) {
  if (!this.username && !this.email) {
    next(new Error('Either username or email is required'));
  } else {
    next();
  }
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model('User', userSchema);


