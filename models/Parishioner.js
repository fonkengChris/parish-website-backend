import mongoose from 'mongoose';

const parishionerSchema = new mongoose.Schema({
  // One-to-one relationship with User
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  missionStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MissionStation'
  },
  familyMembers: [{
    name: String,
    relationship: String,
    dateOfBirth: Date
  }],
  sacraments: {
    baptism: { date: Date, location: String },
    firstCommunion: { date: Date, location: String },
    confirmation: { date: Date, location: String },
    marriage: { date: Date, location: String }
  },
  ministries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ministry'
  }],
  notes: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Parishioner', parishionerSchema);

