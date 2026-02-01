import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'servo_motor_db';

let client = null;
let db = null;

export async function connectDatabase() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(DB_NAME);
      console.log('✅ Connected to MongoDB');
      
      // Create indexes for better query performance
      await db.collection('sensor_data').createIndex({ deviceId: 1, timestamp: -1 });
      await db.collection('sensor_data').createIndex({ timestamp: -1 });
      await db.collection('alerts').createIndex({ deviceId: 1, timestamp: -1 });
      await db.collection('alerts').createIndex({ resolved: 1 });
    }
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function getDatabase() {
  if (!db) {
    await connectDatabase();
  }
  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}
