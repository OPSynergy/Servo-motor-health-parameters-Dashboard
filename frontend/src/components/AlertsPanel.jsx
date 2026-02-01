import React from 'react';
import './AlertsPanel.css';

function AlertsPanel({ alerts }) {
  const getSeverityColor = (severity) => {
    return severity === 'critical' ? '#f44336' : '#ff9800';
  };

  const getSeverityIcon = (severity) => {
    return severity === 'critical' ? '🚨' : '⚠️';
  };

  return (
    <div className="alerts-panel">
      <h2>Alerts ({alerts.length})</h2>
      {alerts.length === 0 ? (
        <div className="no-alerts">
          <p>No active alerts</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.slice(0, 5).map((alert, index) => (
            <div
              key={index}
              className="alert-item"
              style={{ borderLeftColor: getSeverityColor(alert.severity) }}
            >
              <div className="alert-header">
                <span className="alert-icon">{getSeverityIcon(alert.severity)}</span>
                <span className="alert-severity">{alert.severity.toUpperCase()}</span>
              </div>
              <div className="alert-device">{alert.deviceId}</div>
              <div className="alert-message">{alert.message}</div>
              <div className="alert-time">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {alerts.length > 5 && (
            <div className="more-alerts">
              +{alerts.length - 5} more alerts
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AlertsPanel;
