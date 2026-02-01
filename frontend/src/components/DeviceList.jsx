import React from 'react';
import './DeviceList.css';

function DeviceList({ devices, selectedDevice, latestData, onSelect }) {
  const getHealthColor = (healthScore) => {
    if (!healthScore) return '#999';
    if (healthScore >= 80) return '#4caf50';
    if (healthScore >= 60) return '#ff9800';
    return '#f44336';
  };

  const getHealthStatus = (healthScore) => {
    if (!healthScore) return 'Unknown';
    if (healthScore >= 80) return 'Healthy';
    if (healthScore >= 60) return 'Warning';
    return 'Critical';
  };

  return (
    <div className="device-list">
      <h2>Devices</h2>
      {devices.length === 0 ? (
        <div className="no-devices">
          <p>No devices found</p>
          <p className="hint">Start the MQTT publisher to see devices</p>
        </div>
      ) : (
        <div className="device-cards">
          {devices.map(deviceId => {
            const data = latestData[deviceId];
            const healthScore = data?.healthScore || 0;
            const isSelected = selectedDevice === deviceId;

            return (
              <div
                key={deviceId}
                className={`device-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(deviceId)}
              >
                <div className="device-header">
                  <h3>{deviceId}</h3>
                  <div
                    className="health-indicator"
                    style={{ backgroundColor: getHealthColor(healthScore) }}
                  >
                    {healthScore.toFixed(0)}%
                  </div>
                </div>
                <div className="device-status">
                  <span className={`status-badge ${getHealthStatus(healthScore).toLowerCase()}`}>
                    {getHealthStatus(healthScore)}
                  </span>
                </div>
                {data && (
                  <div className="device-metrics">
                    <div className="metric">
                      <span className="metric-label">Temp:</span>
                      <span className="metric-value">{data.temperature?.toFixed(1)}°C</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">RPM:</span>
                      <span className="metric-value">{data.rpm}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DeviceList;
