import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  getHistoricalData,
  getAggregatedData,
  getAlerts,
  getFailurePrediction
} from '../services/api';
import LiveMetrics from './LiveMetrics';
import HistoricalCharts from './HistoricalCharts';
import HealthIndicator from './HealthIndicator';
import './DeviceDetail.css';

function DeviceDetail({ deviceId, latestData, socket, connected }) {
  const [historicalData, setHistoricalData] = useState([]);
  const [aggregatedData, setAggregatedData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (deviceId) {
      loadDeviceData();
      if (socket && connected) {
        socket.emit('subscribe-device', deviceId);
      }
    }

    return () => {
      if (socket && connected) {
        socket.emit('unsubscribe-device', deviceId);
      }
    };
  }, [deviceId, socket, connected]);

  useEffect(() => {
    if (socket && connected) {
      const handleSensorData = (data) => {
        if (data.deviceId === deviceId) {
          // Update historical data with new reading
          setHistoricalData(prev => [data, ...prev.slice(0, 99)]);
        }
      };

      socket.on('sensor-data', handleSensorData);

      return () => {
        socket.off('sensor-data', handleSensorData);
      };
    }
  }, [socket, connected, deviceId]);

  const loadDeviceData = async () => {
    try {
      setLoading(true);
      
      // Load recent historical data
      const recentData = await getHistoricalData(deviceId, 100);
      setHistoricalData(recentData.reverse());

      // Load aggregated data for charts
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - getTimeRangeMs(timeRange));
      const aggData = await getAggregatedData(
        deviceId,
        getIntervalForRange(timeRange),
        startTime.toISOString(),
        endTime.toISOString()
      );
      setAggregatedData(aggData);

      // Load alerts
      const deviceAlerts = await getAlerts(deviceId, 10, true);
      setAlerts(deviceAlerts);

      // Load prediction
      const pred = await getFailurePrediction(deviceId);
      setPrediction(pred);
    } catch (error) {
      console.error('Error loading device data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeMs = (range) => {
    const ranges = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    return ranges[range] || ranges['1h'];
  };

  const getIntervalForRange = (range) => {
    const intervals = {
      '15m': '1m',
      '1h': '5m',
      '6h': '15m',
      '24h': '1h',
      '7d': '1d'
    };
    return intervals[range] || intervals['1h'];
  };

  const handleTimeRangeChange = async (newRange) => {
    setTimeRange(newRange);
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - getTimeRangeMs(newRange));
      const aggData = await getAggregatedData(
        deviceId,
        getIntervalForRange(newRange),
        startTime.toISOString(),
        endTime.toISOString()
      );
      setAggregatedData(aggData);
    } catch (error) {
      console.error('Error loading aggregated data:', error);
    }
  };

  if (!deviceId) {
    return (
      <div className="device-detail-empty">
        <p>Select a device to view details</p>
      </div>
    );
  }

  return (
    <div className="device-detail">
      <div className="device-detail-header">
        <h2>Device: {deviceId}</h2>
        <div className="time-range-selector">
          {['15m', '1h', '6h', '24h', '7d'].map(range => (
            <button
              key={range}
              className={timeRange === range ? 'active' : ''}
              onClick={() => handleTimeRangeChange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner-small"></div>
          <span>Loading data...</span>
        </div>
      )}

      <div className="device-detail-content">
        <div className="metrics-section">
          <LiveMetrics data={latestData} />
          <HealthIndicator
            healthScore={latestData?.healthScore}
            prediction={prediction}
          />
        </div>

        <div className="charts-section">
          <HistoricalCharts
            data={aggregatedData}
            historicalData={historicalData}
            timeRange={timeRange}
          />
        </div>

        {alerts.length > 0 && (
          <div className="alerts-section">
            <h3>Recent Alerts</h3>
            <div className="alerts-list-detailed">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`alert-detail ${alert.severity}`}
                >
                  <div className="alert-detail-header">
                    <span className="alert-type">{alert.type}</span>
                    <span className="alert-severity-badge">{alert.severity}</span>
                  </div>
                  <div className="alert-detail-message">{alert.message}</div>
                  <div className="alert-detail-time">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeviceDetail;
