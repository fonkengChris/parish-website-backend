import mongoose from 'mongoose';

const massScheduleSchema = new mongoose.Schema({
  missionStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MissionStation',
    required: true
  },
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  },
  time: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Mass', 'Confession', 'Adoration', 'Other']
  },
  description: {
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

export default mongoose.model('MassSchedule', massScheduleSchema);


