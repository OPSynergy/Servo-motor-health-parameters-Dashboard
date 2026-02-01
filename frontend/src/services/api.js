import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getDevices = async () => {
  const response = await api.get('/devices');
  return response.data.devices;
};

export const getLatestData = async (deviceId) => {
  const response = await api.get(`/devices/${deviceId}/latest`);
  return response.data;
};

export const getHistoricalData = async (deviceId, limit = 100, startTime = null, endTime = null) => {
  const params = { limit };
  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;
  const response = await api.get(`/devices/${deviceId}/data`, { params });
  return response.data.data;
};

export const getAggregatedData = async (deviceId, interval = '1h', startTime, endTime) => {
  const response = await api.get(`/devices/${deviceId}/aggregated`, {
    params: { interval, startTime, endTime }
  });
  return response.data.data;
};

export const getAlerts = async (deviceId, limit = 50, unresolvedOnly = false) => {
  const response = await api.get(`/devices/${deviceId}/alerts`, {
    params: { limit, unresolvedOnly }
  });
  return response.data.alerts;
};

export const getUnresolvedAlerts = async () => {
  const response = await api.get('/alerts/unresolved');
  return response.data.alerts;
};

export const resolveAlert = async (alertId) => {
  const response = await api.post(`/alerts/${alertId}/resolve`);
  return response.data;
};

export const getFailurePrediction = async (deviceId, limit = 20) => {
  const response = await api.get(`/devices/${deviceId}/prediction`, {
    params: { limit }
  });
  return response.data;
};

export default api;
