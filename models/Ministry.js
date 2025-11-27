import mongoose from 'mongoose';

const ministrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  leader: {
    type: String,
    default: ''
  },
  photo: {
    type: String,
    default: ''
  },
  contactInfo: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Ministry', ministrySchema);


