import { getDatabase } from '../config/database.js';

const COLLECTION_NAME = 'sensor_data';

export class SensorData {
  constructor(data) {
    this.deviceId = data.deviceId;
    this.temperature = parseFloat(data.temperature);
    this.vibration = parseFloat(data.vibration);
    this.current = parseFloat(data.current);
    this.rpm = parseFloat(data.rpm);
    this.timestamp = data.timestamp || new Date();
    this.healthScore = data.healthScore || null;
  }

  static async insert(data) {
    const db = await getDatabase();
    const sensorData = new SensorData(data);
    const result = await db.collection(COLLECTION_NAME).insertOne({
      ...sensorData,
      timestamp: new Date(sensorData.timestamp)
    });
    return result;
  }

  static async findByDeviceId(deviceId, limit = 100, startTime = null, endTime = null) {
    const db = await getDatabase();
    const query = { deviceId };
    
    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) query.timestamp.$gte = new Date(startTime);
      if (endTime) query.timestamp.$lte = new Date(endTime);
    }

    return await db.collection(COLLECTION_NAME)
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  static async getLatest(deviceId) {
    const db = await getDatabase();
    return await db.collection(COLLECTION_NAME)
      .findOne({ deviceId }, { sort: { timestamp: -1 } });
  }

  static async getAggregatedData(deviceId, interval = '1h', startTime, endTime) {
    const db = await getDatabase();
    
    const matchStage = {
      deviceId,
      timestamp: {
        $gte: new Date(startTime),
        $lte: new Date(endTime)
      }
    };

    // Determine grouping interval in milliseconds
    let intervalMs;
    switch (interval) {
      case '1m': intervalMs = 60 * 1000; break;
      case '5m': intervalMs = 5 * 60 * 1000; break;
      case '15m': intervalMs = 15 * 60 * 1000; break;
      case '1h': intervalMs = 60 * 60 * 1000; break;
      case '1d': intervalMs = 24 * 60 * 60 * 1000; break;
      default: intervalMs = 60 * 60 * 1000;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            $toDate: {
              $subtract: [
                { $toLong: '$timestamp' },
                { $mod: [{ $toLong: '$timestamp' }, intervalMs] }
              ]
            }
          },
          avgTemperature: { $avg: '$temperature' },
          avgVibration: { $avg: '$vibration' },
          avgCurrent: { $avg: '$current' },
          avgRpm: { $avg: '$rpm' },
          avgHealthScore: { $avg: '$healthScore' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    return await db.collection(COLLECTION_NAME).aggregate(pipeline).toArray();
  }

  static async getAllDevices() {
    const db = await getDatabase();
    return await db.collection(COLLECTION_NAME)
      .distinct('deviceId');
  }
}
