import mongoose from 'mongoose';

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

const Alert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);

async function seedAlerts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing alerts
    await Alert.deleteMany({});
    console.log('Cleared existing alerts');
    
    // Create sample alerts with different dates
    const alerts = Array.from({ length: 20 }, (_, i) => ({
      type: Math.random() > 0.5 ? 'mining' : 'vehicle',
      severity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      title: `Alert ${i + 1}`,
      description: `Sample alert description ${i + 1}`,
      location: `Zone ${String.fromCharCode(65 + Math.floor(i / 5))}-${i % 5 + 1}`,
      coordinates: [28.5 + Math.random() * 0.5, 77.3 + Math.random() * 0.5],
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
      acknowledged: Math.random() > 0.7
    }));
    
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
