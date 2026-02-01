import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'servo-motor';
const PUBLISH_INTERVAL = parseInt(process.env.PUBLISH_INTERVAL) || 5000; // 5 seconds
const DEVICE_IDS = (process.env.DEVICE_IDS || 'MOTOR-001,MOTOR-002').split(',');

// Sensor value ranges (realistic servo motor values)
const SENSOR_RANGES = {
  temperature: { min: 25, max: 85, normal: 45 }, // °C
  vibration: { min: 0.5, max: 6.0, normal: 1.5 }, // g
  current: { min: 2.0, max: 12.0, normal: 5.0 }, // A
  rpm: { min: 1000, max: 3200, normal: 2500 } // RPM
};

// Track sensor state for each device (for realistic variations)
const deviceStates = {};

// Initialize device states
DEVICE_IDS.forEach(deviceId => {
  deviceStates[deviceId] = {
    temperature: SENSOR_RANGES.temperature.normal,
    vibration: SENSOR_RANGES.vibration.normal,
    current: SENSOR_RANGES.current.normal,
    rpm: SENSOR_RANGES.rpm.normal,
    trend: {
      temperature: Math.random() > 0.5 ? 1 : -1,
      vibration: Math.random() > 0.5 ? 1 : -1,
      current: Math.random() > 0.5 ? 1 : -1,
      rpm: Math.random() > 0.5 ? 1 : -1
    }
  };
});

// Connect to MQTT broker
console.log(`🔌 Connecting to MQTT broker: ${MQTT_BROKER_URL}`);
const client = mqtt.connect(MQTT_BROKER_URL, {
  clientId: `servo-motor-publisher-${Date.now()}`,
  clean: true,
  reconnectPeriod: 1000
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  console.log(`📡 Publishing to topic pattern: ${MQTT_TOPIC_PREFIX}/<deviceId>/data`);
  console.log(`⏱️  Publishing interval: ${PUBLISH_INTERVAL}ms`);
  console.log(`🔧 Simulating ${DEVICE_IDS.length} device(s): ${DEVICE_IDS.join(', ')}`);
  console.log('\n🚀 Starting to publish sensor data...\n');
  
  startPublishing();
});

client.on('error', (error) => {
  console.error('❌ MQTT error:', error);
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT broker...');
});

client.on('close', () => {
  console.log('🔌 MQTT connection closed');
});

// Generate realistic sensor data with gradual changes
function generateSensorData(deviceId) {
  const state = deviceStates[deviceId];
  
  // Add small random variations with trend
  const variation = (range, current, trend) => {
    const change = (Math.random() - 0.5) * 0.1 * range; // ±5% variation
    const trendChange = trend * 0.02 * range; // Gradual trend
    let newValue = current + change + trendChange;
    
    // Keep within bounds
    newValue = Math.max(range.min, Math.min(range.max, newValue));
    
    // Occasionally reverse trend
    if (Math.random() < 0.1) {
      state.trend[Object.keys(SENSOR_RANGES).find(key => SENSOR_RANGES[key] === range)] *= -1;
    }
    
    return newValue;
  };
  
  // Update sensor values
  state.temperature = variation(SENSOR_RANGES.temperature, state.temperature, state.trend.temperature);
  state.vibration = variation(SENSOR_RANGES.vibration, state.vibration, state.trend.vibration);
  state.current = variation(SENSOR_RANGES.current, state.current, state.trend.current);
  state.rpm = variation(SENSOR_RANGES.rpm, state.rpm, state.trend.rpm);
  
  // Occasionally simulate anomalies (10% chance)
  if (Math.random() < 0.1) {
    const anomalyType = ['temperature', 'vibration', 'current', 'rpm'][Math.floor(Math.random() * 4)];
    const anomalyMultiplier = 1.2 + Math.random() * 0.3; // 20-50% increase
    
    if (anomalyType === 'temperature') {
      state.temperature = Math.min(SENSOR_RANGES.temperature.max, state.temperature * anomalyMultiplier);
    } else if (anomalyType === 'vibration') {
      state.vibration = Math.min(SENSOR_RANGES.vibration.max, state.vibration * anomalyMultiplier);
    } else if (anomalyType === 'current') {
      state.current = Math.min(SENSOR_RANGES.current.max, state.current * anomalyMultiplier);
    } else if (anomalyType === 'rpm') {
      state.rpm = Math.min(SENSOR_RANGES.rpm.max, state.rpm * anomalyMultiplier);
    }
    
    console.log(`⚠️  Anomaly detected on ${deviceId}: ${anomalyType} spike`);
  }
  
  return {
    deviceId,
    temperature: parseFloat(state.temperature.toFixed(2)),
    vibration: parseFloat(state.vibration.toFixed(2)),
    current: parseFloat(state.current.toFixed(2)),
    rpm: Math.round(state.rpm),
    timestamp: new Date().toISOString()
  };
}

// Publish sensor data
function publishSensorData(deviceId) {
  const data = generateSensorData(deviceId);
  const topic = `${MQTT_TOPIC_PREFIX}/${deviceId}/data`;
  const payload = JSON.stringify(data);
  
  client.publish(topic, payload, { qos: 1 }, (error) => {
    if (error) {
      console.error(`❌ Error publishing to ${topic}:`, error);
    } else {
      console.log(`📊 [${deviceId}] Temp: ${data.temperature}°C, Vib: ${data.vibration}g, Current: ${data.current}A, RPM: ${data.rpm}`);
    }
  });
}

// Start publishing loop
function startPublishing() {
  setInterval(() => {
    DEVICE_IDS.forEach(deviceId => {
      publishSensorData(deviceId);
    });
  }, PUBLISH_INTERVAL);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down publisher...');
  client.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down publisher...');
  client.end();
  process.exit(0);
});
