import './Page.css'

const Alarms = () => {
  const alarms = [
    { id: 1, type: 'Warning', message: 'Temperature approaching threshold', time: '10:30 AM', status: 'active' },
    { id: 2, type: 'Critical', message: 'High vibration detected', time: '09:15 AM', status: 'resolved' },
    { id: 3, type: 'Info', message: 'Maintenance due in 5 days', time: '08:00 AM', status: 'active' },
  ]

  const getAlarmClass = (type) => {
    switch (type) {
      case 'Critical':
        return 'alarm-critical'
      case 'Warning':
        return 'alarm-warning'
      default:
        return 'alarm-info'
    }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Alarms</h1>
      <div className="page-content">
        <div className="card">
          <h2>Active Alarms</h2>
          <div className="alarms-list">
            {alarms.map((alarm) => (
              <div key={alarm.id} className={`alarm-item ${getAlarmClass(alarm.type)} ${alarm.status}`}>
                <div className="alarm-header">
                  <span className="alarm-type">{alarm.type}</span>
                  <span className="alarm-time">{alarm.time}</span>
                </div>
                <p className="alarm-message">{alarm.message}</p>
                <span className="alarm-status">{alarm.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Alarms
