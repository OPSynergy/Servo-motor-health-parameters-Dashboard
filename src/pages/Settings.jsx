import './Page.css'

const Settings = () => {
  return (
    <div className="page-container">
      <h1 className="page-title">Settings</h1>
      <div className="page-content">
        <div className="card">
          <h2>Dashboard Settings</h2>
          <div className="settings-list">
            <div className="setting-item">
              <label>Update Frequency</label>
              <select className="setting-input">
                <option>1 second</option>
                <option>5 seconds</option>
                <option>10 seconds</option>
                <option>30 seconds</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Temperature Unit</label>
              <select className="setting-input">
                <option>Celsius (°C)</option>
                <option>Fahrenheit (°F)</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Alert Threshold</label>
              <input type="number" className="setting-input" placeholder="Enter threshold value" />
            </div>
            <div className="setting-item">
              <label>
                <input type="checkbox" /> Enable Email Notifications
              </label>
            </div>
            <div className="setting-item">
              <label>
                <input type="checkbox" /> Enable Sound Alerts
              </label>
            </div>
          </div>
          <button className="save-btn">Save Settings</button>
        </div>
      </div>
    </div>
  )
}

export default Settings
