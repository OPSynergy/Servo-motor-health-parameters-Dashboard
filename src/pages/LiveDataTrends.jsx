import './Page.css'

const LiveDataTrends = () => {
  return (
    <div className="page-container">
      <h1 className="page-title">Live Data Trends</h1>
      <div className="page-content">
        <div className="card">
          <h2>Real-time Monitoring</h2>
          <div className="charts-grid">
            <div className="chart-placeholder">
              <h3>Temperature Trend</h3>
              <div className="chart-content">
                <p>Chart visualization will be displayed here</p>
              </div>
            </div>
            <div className="chart-placeholder">
              <h3>Vibration Trend</h3>
              <div className="chart-content">
                <p>Chart visualization will be displayed here</p>
              </div>
            </div>
            <div className="chart-placeholder">
              <h3>Current Trend</h3>
              <div className="chart-content">
                <p>Chart visualization will be displayed here</p>
              </div>
            </div>
            <div className="chart-placeholder">
              <h3>Speed Trend</h3>
              <div className="chart-content">
                <p>Chart visualization will be displayed here</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <h2>Current Values</h2>
          <div className="live-values">
            <div className="live-value-item">
              <span className="live-label">Temperature:</span>
              <span className="live-value">45°C</span>
            </div>
            <div className="live-value-item">
              <span className="live-label">Vibration:</span>
              <span className="live-value">2.3 mm/s</span>
            </div>
            <div className="live-value-item">
              <span className="live-label">Current:</span>
              <span className="live-value">2.5A</span>
            </div>
            <div className="live-value-item">
              <span className="live-label">Speed:</span>
              <span className="live-value">1500 RPM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveDataTrends
