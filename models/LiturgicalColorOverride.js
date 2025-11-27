import mongoose from 'mongoose';

const liturgicalColorOverrideSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  color: {
    type: String,
    required: true,
    enum: ['white', 'red', 'green', 'purple', 'rose', 'gold']
  },
  reason: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Ensure date is stored as date only (no time)
liturgicalColorOverrideSchema.pre('save', function(next) {
  if (this.date) {
    const dateOnly = new Date(this.date);
    dateOnly.setHours(0, 0, 0, 0);
    this.date = dateOnly;
  }
  next();
});

export default mongoose.model('LiturgicalColorOverride', liturgicalColorOverrideSchema);

