import { connectToDatabase } from '../lib/mongo';
import { Alert } from '../lib/models/Alert';

async function seedAlerts() {
  try {
    await connectToDatabase();
    
    // Clear existing alerts
    await Alert.deleteMany({});
    
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
      // Add more sample alerts here
    ];
    
    await Alert.insertMany(alerts);
    console.log('Sample alerts created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding alerts:', error);
    process.exit(1);
  }
}

seedAlerts();
