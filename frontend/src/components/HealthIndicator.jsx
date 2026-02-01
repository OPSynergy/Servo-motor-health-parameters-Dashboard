import React from 'react';
import './HealthIndicator.css';

function HealthIndicator({ healthScore, prediction }) {
  const getHealthColor = (score) => {
    if (!score) return '#999';
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const getHealthStatus = (score) => {
    if (!score) return 'Unknown';
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Poor';
    return 'Critical';
  };

  const getRiskColor = (risk) => {
    const colors = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336'
    };
    return colors[risk] || '#999';
  };

  return (
    <div className="health-indicator">
      <h3>Health Status</h3>
      
      <div className="health-score-circle">
        <div
          className="score-circle"
          style={{
            background: `conic-gradient(${getHealthColor(healthScore)} 0deg ${(healthScore || 0) * 3.6}deg, #e0e0e0 ${(healthScore || 0) * 3.6}deg 360deg)`
          }}
        >
          <div className="score-inner">
            <div className="score-value">{healthScore?.toFixed(0) || 'N/A'}</div>
            <div className="score-label">%</div>
          </div>
        </div>
      </div>

      <div className="health-status">
        <span
          className="status-badge"
          style={{ backgroundColor: getHealthColor(healthScore) }}
        >
          {getHealthStatus(healthScore)}
        </span>
      </div>

      {prediction && (
        <div className="prediction-section">
          <h4>Failure Prediction</h4>
          <div className="prediction-info">
            <div className="prediction-risk">
              <span className="risk-label">Risk Level:</span>
              <span
                className="risk-badge"
                style={{ backgroundColor: getRiskColor(prediction.prediction?.risk) }}
              >
                {prediction.prediction?.risk?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="prediction-confidence">
              <span className="confidence-label">Confidence:</span>
              <span className="confidence-value">
                {(prediction.prediction?.confidence * 100 || 0).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthIndicator;
