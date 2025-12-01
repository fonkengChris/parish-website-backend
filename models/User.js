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
    enum: ['admin', 'editor', 'priest', 'parish-priest', 'parishioner'],
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

// Permission helper methods
// Editor permissions: MassSchedule, Announcements, Events, Ministries, Gallery
// Priest permissions: All editor permissions + Prayers, Sermons, LiturgicalColors
// Parish-priest and Admin: All privileges (highest level)

userSchema.methods.canAccess = function(resource) {
  const role = this.role;
  
  // Highest level roles have access to everything
  if (role === 'admin' || role === 'parish-priest') {
    return true;
  }
  
  // Editor permissions
  const editorResources = ['MassSchedule', 'Announcements', 'Events', 'Ministries', 'Gallery'];
  if (editorResources.includes(resource)) {
    return role === 'editor' || role === 'priest' || role === 'parish-priest' || role === 'admin';
  }
  
  // Priest-only permissions (in addition to editor permissions)
  const priestResources = ['Prayers', 'Sermons', 'LiturgicalColors'];
  if (priestResources.includes(resource)) {
    return role === 'priest' || role === 'parish-priest' || role === 'admin';
  }
  
  return false;
};

userSchema.methods.hasRole = function(...roles) {
  return roles.includes(this.role);
};

export default mongoose.model('User', userSchema);


