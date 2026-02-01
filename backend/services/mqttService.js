import mqtt from 'mqtt';
import dotenv from 'dotenv';
import { SensorData } from '../models/SensorData.js';
import { Alert } from '../models/Alert.js';
import { calculateHealthScore, checkThresholds } from '../services/predictiveMaintenance.js';

dotenv.config();

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'servo-motor';
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'backend-server';

let mqttClient = null;
let io = null; // Socket.IO instance

export function setSocketIO(socketIO) {
  io = socketIO;
}

export async function connectMQTT() {
  try {
    mqttClient = mqtt.connect(MQTT_BROKER_URL, {
      clientId: MQTT_CLIENT_ID,
      clean: true,
      reconnectPeriod: 1000,
    });

    mqttClient.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      const topic = `${MQTT_TOPIC_PREFIX}/+/data`;
      mqttClient.subscribe(topic, (err) => {
        if (err) {
          console.error('❌ MQTT subscription error:', err);
        } else {
          console.log(`📡 Subscribed to topic: ${topic}`);
        }
      });
    });

    mqttClient.on('error', (error) => {
      console.error('❌ MQTT error:', error);
    });

    mqttClient.on('message', async (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        await processSensorData(payload);
      } catch (error) {
        console.error('❌ Error processing MQTT message:', error);
      }
    });

    mqttClient.on('reconnect', () => {
      console.log('🔄 Reconnecting to MQTT broker...');
    });

    mqttClient.on('close', () => {
      console.log('🔌 MQTT connection closed');
    });

    return mqttClient;
  } catch (error) {
    console.error('❌ MQTT connection error:', error);
    throw error;
  }
}

async function processSensorData(payload) {
  try {
    // Validate payload
    if (!payload.deviceId || 
        payload.temperature === undefined || 
        payload.vibration === undefined || 
        payload.current === undefined || 
        payload.rpm === undefined) {
      console.warn('⚠️ Invalid payload received:', payload);
      return;
    }

    // Calculate health score
    const healthScore = calculateHealthScore(payload);

    // Store sensor data
    const sensorData = {
      ...payload,
      timestamp: payload.timestamp || new Date(),
      healthScore
    };

    await SensorData.insert(sensorData);

    // Check thresholds and create alerts if needed
    const alerts = await checkThresholds(payload, healthScore);

    // Emit real-time data via Socket.IO
    if (io) {
      io.emit('sensor-data', {
        ...sensorData,
        alerts: alerts.map(a => ({
          type: a.type,
          severity: a.severity,
          message: a.message
        }))
      });

      // Emit alerts separately
      if (alerts.length > 0) {
        alerts.forEach(alert => {
          io.emit('alert', {
            deviceId: payload.deviceId,
            ...alert
          });
        });
      }
    }

    console.log(`📊 Processed data from device: ${payload.deviceId}, Health: ${healthScore.toFixed(2)}%`);
  } catch (error) {
    console.error('❌ Error processing sensor data:', error);
  }
}

export function getMQTTClient() {
  return mqttClient;
}

export function disconnectMQTT() {
  if (mqttClient) {
    mqttClient.end();
    mqttClient = null;
  }
}
