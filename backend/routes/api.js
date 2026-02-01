import express from 'express';
import { SensorData } from '../models/SensorData.js';
import { Alert } from '../models/Alert.js';
import { predictFailure } from '../services/predictiveMaintenance.js';

const router = express.Router();

// Get all devices
router.get('/devices', async (req, res) => {
  try {
    const devices = await SensorData.getAllDevices();
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest data for a device
router.get('/devices/:deviceId/latest', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const data = await SensorData.getLatest(deviceId);
    if (!data) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical data for a device
router.get('/devices/:deviceId/data', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 100, startTime, endTime } = req.query;
    
    const data = await SensorData.findByDeviceId(
      deviceId,
      parseInt(limit),
      startTime || null,
      endTime || null
    );
    
    res.json({ data, count: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get aggregated data for charts
router.get('/devices/:deviceId/aggregated', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { 
      interval = '1h', 
      startTime, 
      endTime 
    } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({ 
        error: 'startTime and endTime query parameters are required' 
      });
    }

    const data = await SensorData.getAggregatedData(
      deviceId,
      interval,
      startTime,
      endTime
    );

    res.json({ data, count: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get alerts for a device
router.get('/devices/:deviceId/alerts', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, unresolvedOnly = false } = req.query;
    
    const alerts = await Alert.findByDeviceId(
      deviceId,
      parseInt(limit),
      unresolvedOnly === 'true'
    );
    
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all unresolved alerts
router.get('/alerts/unresolved', async (req, res) => {
  try {
    const alerts = await Alert.getUnresolved();
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve an alert
router.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    // MongoDB ObjectId conversion would be needed here in production
    const result = await Alert.resolve(alertId);
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ message: 'Alert resolved', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get failure prediction for a device
router.get('/devices/:deviceId/prediction', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 20 } = req.query;
    
    const historicalData = await SensorData.findByDeviceId(
      deviceId,
      parseInt(limit)
    );
    
    const prediction = predictFailure(historicalData);
    res.json({ prediction, historicalCount: historicalData.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'servo-motor-backend'
  });
});

export default router;
