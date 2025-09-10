const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/mining';

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
  title: String,
  description: String,
  location: String,
  coordinates: [Number],
  timestamp: {
    type: Date,
    default: Date.now
  },
  acknowledged: {
    type: Boolean,
    default: false
  }
});

const Alert = mongoose.model('Alert', AlertSchema);

async function seedAlerts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing alerts
    await Alert.deleteMany({});
    console.log('Cleared existing alerts');
    
    // Create sample alerts
    const alerts = [
      {
        type: 'mining',
        severity: 'high',
        title: 'Illegal Mining Activity Detected',
        description: 'Large-scale mining operation detected in restricted area',
        location: 'Zone A-1',
        coordinates: [28.5, 77.3],
        timestamp: new Date(),
        acknowledged: false
      },
      {
        type: 'vehicle',
        severity: 'medium',
        title: 'Suspicious Vehicle Movement',
        description: 'Multiple heavy vehicles detected entering mining area',
        location: 'Zone B-2',
        coordinates: [28.6, 77.4],
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        acknowledged: true
      },
      {
        type: 'mining',
        severity: 'low',
        title: 'Minor Ground Disturbance',
        description: 'Small-scale activity detected in monitoring zone',
        location: 'Zone C-3',
        coordinates: [28.7, 77.5],
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
        acknowledged: false
      }
    ];
    
    await Alert.insertMany(alerts);
    console.log('Sample alerts created successfully');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error seeding alerts:', error);
    process.exit(1);
  }
}

seedAlerts();
