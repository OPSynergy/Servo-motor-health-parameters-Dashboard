import { getDatabase } from '../config/database.js';

const COLLECTION_NAME = 'alerts';

export class Alert {
  constructor(data) {
    this.deviceId = data.deviceId;
    this.type = data.type; // 'temperature', 'vibration', 'current', 'rpm', 'health'
    this.severity = data.severity; // 'warning', 'critical'
    this.message = data.message;
    this.value = data.value;
    this.threshold = data.threshold;
    this.timestamp = data.timestamp || new Date();
    this.resolved = data.resolved || false;
    this.resolvedAt = data.resolvedAt || null;
  }

  static async create(alertData) {
    const db = await getDatabase();
    const alert = new Alert(alertData);
    const result = await db.collection(COLLECTION_NAME).insertOne({
      ...alert,
      timestamp: new Date(alert.timestamp)
    });
    return result;
  }

  static async findByDeviceId(deviceId, limit = 50, unresolvedOnly = false) {
    const db = await getDatabase();
    const query = { deviceId };
    if (unresolvedOnly) {
      query.resolved = false;
    }
    
    return await db.collection(COLLECTION_NAME)
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  static async getUnresolved() {
    const db = await getDatabase();
    return await db.collection(COLLECTION_NAME)
      .find({ resolved: false })
      .sort({ timestamp: -1 })
      .toArray();
  }

  static async resolve(alertId) {
    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    const id = typeof alertId === 'string' ? new ObjectId(alertId) : alertId;
    return await db.collection(COLLECTION_NAME).updateOne(
      { _id: id },
      { 
        $set: { 
          resolved: true, 
          resolvedAt: new Date() 
        } 
      }
    );
  }

  static async resolveByDeviceId(deviceId, type = null) {
    const db = await getDatabase();
    const query = { deviceId, resolved: false };
    if (type) {
      query.type = type;
    }
    
    return await db.collection(COLLECTION_NAME).updateMany(
      query,
      { 
        $set: { 
          resolved: true, 
          resolvedAt: new Date() 
        } 
      }
    );
  }
}
