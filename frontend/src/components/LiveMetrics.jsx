import React from 'react';
import './LiveMetrics.css';

function LiveMetrics({ data }) {
  if (!data) {
    return (
      <div className="live-metrics">
        <h3>Live Metrics</h3>
        <div className="no-data">No data available</div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Temperature',
      value: data.temperature?.toFixed(2) || 'N/A',
      unit: '°C',
      icon: '🌡️',
      color: data.temperature > 70 ? '#f44336' : data.temperature > 60 ? '#ff9800' : '#4caf50'
    },
    {
      label: 'Vibration',
      value: data.vibration?.toFixed(2) || 'N/A',
      unit: 'g',
      icon: '📳',
      color: data.vibration > 3.5 ? '#f44336' : data.vibration > 2.5 ? '#ff9800' : '#4caf50'
    },
    {
      label: 'Current',
      value: data.current?.toFixed(2) || 'N/A',
      unit: 'A',
      icon: '⚡',
      color: data.current > 8.0 ? '#f44336' : data.current > 6.0 ? '#ff9800' : '#4caf50'
    },
    {
      label: 'RPM',
      value: data.rpm || 'N/A',
      unit: '',
      icon: '🌀',
      color: data.rpm > 2800 ? '#f44336' : data.rpm > 2500 ? '#ff9800' : '#4caf50'
    }
  ];

  return (
    <div className="live-metrics">
      <h3>Live Metrics</h3>
      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="metric-icon">{metric.icon}</div>
            <div className="metric-content">
              <div className="metric-label">{metric.label}</div>
              <div className="metric-value-wrapper">
                <span className="metric-value" style={{ color: metric.color }}>
                  {metric.value}
                </span>
                <span className="metric-unit">{metric.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {data.timestamp && (
        <div className="last-update">
          Last update: {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

export default LiveMetrics;
