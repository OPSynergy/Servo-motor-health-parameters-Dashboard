import dotenv from 'dotenv';
import { Alert } from '../models/Alert.js';

dotenv.config();

// Thresholds from environment variables
const TEMP_MAX = parseFloat(process.env.TEMP_MAX_THRESHOLD) || 80;
const TEMP_WARNING = parseFloat(process.env.TEMP_WARNING_THRESHOLD) || 70;
const VIBRATION_MAX = parseFloat(process.env.VIBRATION_MAX_THRESHOLD) || 5.0;
const VIBRATION_WARNING = parseFloat(process.env.VIBRATION_WARNING_THRESHOLD) || 3.5;
const CURRENT_MAX = parseFloat(process.env.CURRENT_MAX_THRESHOLD) || 10.0;
const CURRENT_WARNING = parseFloat(process.env.CURRENT_WARNING_THRESHOLD) || 8.0;
const RPM_MAX = parseFloat(process.env.RPM_MAX_THRESHOLD) || 3000;
const RPM_WARNING = parseFloat(process.env.RPM_WARNING_THRESHOLD) || 2800;

// Health score weights
const WEIGHT_TEMP = parseFloat(process.env.HEALTH_WEIGHT_TEMP) || 0.25;
const WEIGHT_VIBRATION = parseFloat(process.env.HEALTH_WEIGHT_VIBRATION) || 0.25;
const WEIGHT_CURRENT = parseFloat(process.env.HEALTH_WEIGHT_CURRENT) || 0.25;
const WEIGHT_RPM = parseFloat(process.env.HEALTH_WEIGHT_RPM) || 0.25;

/**
 * Calculate health score based on sensor readings
 * Returns a value between 0-100 (100 = perfect health)
 */
export function calculateHealthScore(sensorData) {
  const { temperature, vibration, current, rpm } = sensorData;

  // Normalize each parameter to 0-100 scale
  // Lower values are better for temperature, vibration, and current
  // RPM should be within optimal range
  
  // Temperature score (0-100, lower temp = higher score)
  const tempScore = Math.max(0, Math.min(100, 
    ((TEMP_MAX - temperature) / TEMP_MAX) * 100
  ));

  // Vibration score (0-100, lower vibration = higher score)
  const vibrationScore = Math.max(0, Math.min(100,
    ((VIBRATION_MAX - vibration) / VIBRATION_MAX) * 100
  ));

  // Current score (0-100, lower current = higher score)
  const currentScore = Math.max(0, Math.min(100,
    ((CURRENT_MAX - current) / CURRENT_MAX) * 100
  ));

  // RPM score (optimal around mid-range, penalize extremes)
  const rpmOptimal = (RPM_MAX + RPM_WARNING) / 2;
  const rpmDeviation = Math.abs(rpm - rpmOptimal);
  const rpmMaxDeviation = RPM_MAX - rpmOptimal;
  const rpmScore = Math.max(0, Math.min(100,
    ((rpmMaxDeviation - rpmDeviation) / rpmMaxDeviation) * 100
  ));

  // Weighted average
  const healthScore = 
    (tempScore * WEIGHT_TEMP) +
    (vibrationScore * WEIGHT_VIBRATION) +
    (currentScore * WEIGHT_CURRENT) +
    (rpmScore * WEIGHT_RPM);

  return Math.round(healthScore * 100) / 100;
}

/**
 * Check thresholds and create alerts if necessary
 */
export async function checkThresholds(sensorData, healthScore) {
  const { deviceId, temperature, vibration, current, rpm } = sensorData;
  const alerts = [];

  // Check temperature
  if (temperature >= TEMP_MAX) {
    const alert = await Alert.create({
      deviceId,
      type: 'temperature',
      severity: 'critical',
      message: `Critical: Temperature ${temperature.toFixed(2)}°C exceeds maximum threshold (${TEMP_MAX}°C)`,
      value: temperature,
      threshold: TEMP_MAX,
      timestamp: new Date()
    });
    alerts.push(alert);
  } else if (temperature >= TEMP_WARNING) {
    const alert = await Alert.create({
      deviceId,
      type: 'temperature',
      severity: 'warning',
      message: `Warning: Temperature ${temperature.toFixed(2)}°C approaching threshold (${TEMP_MAX}°C)`,
      value: temperature,
      threshold: TEMP_MAX,
      timestamp: new Date()
    });
    alerts.push(alert);
  }

  // Check vibration
  if (vibration >= VIBRATION_MAX) {
    const alert = await Alert.create({
      deviceId,
      type: 'vibration',
      severity: 'critical',
      message: `Critical: Vibration ${vibration.toFixed(2)} exceeds maximum threshold (${VIBRATION_MAX})`,
      value: vibration,
      threshold: VIBRATION_MAX,
      timestamp: new Date()
    });
    alerts.push(alert);
  } else if (vibration >= VIBRATION_WARNING) {
    const alert = await Alert.create({
      deviceId,
      type: 'vibration',
      severity: 'warning',
      message: `Warning: Vibration ${vibration.toFixed(2)} approaching threshold (${VIBRATION_MAX})`,
      value: vibration,
      threshold: VIBRATION_MAX,
      timestamp: new Date()
    });
    alerts.push(alert);
  }

  // Check current
  if (current >= CURRENT_MAX) {
    const alert = await Alert.create({
      deviceId,
      type: 'current',
      severity: 'critical',
      message: `Critical: Current ${current.toFixed(2)}A exceeds maximum threshold (${CURRENT_MAX}A)`,
      value: current,
      threshold: CURRENT_MAX,
      timestamp: new Date()
    });
    alerts.push(alert);
  } else if (current >= CURRENT_WARNING) {
    const alert = await Alert.create({
      deviceId,
      type: 'current',
      severity: 'warning',
      message: `Warning: Current ${current.toFixed(2)}A approaching threshold (${CURRENT_MAX}A)`,
      value: current,
      threshold: CURRENT_MAX,
      timestamp: new Date()
    });
    alerts.push(alert);
  }

  // Check RPM
  if (rpm >= RPM_MAX) {
    const alert = await Alert.create({
      deviceId,
      type: 'rpm',
      severity: 'critical',
      message: `Critical: RPM ${rpm} exceeds maximum threshold (${RPM_MAX})`,
      value: rpm,
      threshold: RPM_MAX,
      timestamp: new Date()
    });
    alerts.push(alert);
  } else if (rpm >= RPM_WARNING) {
    const alert = await Alert.create({
      deviceId,
      type: 'rpm',
      severity: 'warning',
      message: `Warning: RPM ${rpm} approaching threshold (${RPM_MAX})`,
      value: rpm,
      threshold: RPM_MAX,
      timestamp: new Date()
    });
    alerts.push(alert);
  }

  // Check health score
  if (healthScore < 50) {
    const alert = await Alert.create({
      deviceId,
      type: 'health',
      severity: 'critical',
      message: `Critical: Health score ${healthScore.toFixed(2)}% is below critical threshold`,
      value: healthScore,
      threshold: 50,
      timestamp: new Date()
    });
    alerts.push(alert);
  } else if (healthScore < 70) {
    const alert = await Alert.create({
      deviceId,
      type: 'health',
      severity: 'warning',
      message: `Warning: Health score ${healthScore.toFixed(2)}% is below optimal threshold`,
      value: healthScore,
      threshold: 70,
      timestamp: new Date()
    });
    alerts.push(alert);
  }

  return alerts;
}

/**
 * Calculate moving average for a parameter
 */
export function calculateMovingAverage(values, windowSize = 10) {
  if (values.length === 0) return 0;
  if (values.length < windowSize) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  const recentValues = values.slice(-windowSize);
  return recentValues.reduce((sum, val) => sum + val, 0) / windowSize;
}

/**
 * Predict potential failure based on trends
 */
export function predictFailure(historicalData) {
  if (historicalData.length < 5) {
    return { risk: 'low', confidence: 0 };
  }

  const recent = historicalData.slice(-5);
  const healthScores = recent.map(d => d.healthScore || 0);
  
  // Check if health score is declining
  const trend = healthScores[healthScores.length - 1] - healthScores[0];
  
  if (trend < -10 && healthScores[healthScores.length - 1] < 60) {
    return { risk: 'high', confidence: 0.7 };
  } else if (trend < -5 && healthScores[healthScores.length - 1] < 70) {
    return { risk: 'medium', confidence: 0.5 };
  }
  
  return { risk: 'low', confidence: 0.3 };
}
