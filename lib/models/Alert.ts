import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mining', 'vehicle', 'system'],
    required: true
  },
  severity: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  acknowledged: {
    type: Boolean,
    default: false
  }
});

export const Alert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
