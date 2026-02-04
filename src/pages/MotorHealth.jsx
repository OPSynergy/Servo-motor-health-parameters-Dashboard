import { useState, useEffect } from 'react'
import { 
  FaTemperatureHigh, 
  FaTachometerAlt, 
  FaBolt, 
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaCog
} from 'react-icons/fa'
import './Page.css'

const MotorHealth = () => {
  const [healthData, setHealthData] = useState({
    overall: 87,
    temperature: { value: 45.2, status: 'normal', trend: 'stable' },
    vibration: { value: 2.3, status: 'normal', trend: 'improving' },
    current: { value: 2.48, status: 'normal', trend: 'stable' },
    voltage: { value: 230.5, status: 'normal', trend: 'stable' },
    speed: { value: 1520, status: 'normal', trend: 'stable' },
    efficiency: { value: 94.2, status: 'excellent', trend: 'improving' }
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setHealthData(prev => ({
        ...prev,
        overall: Math.min(100, prev.overall + (Math.random() - 0.5) * 0.5),
        temperature: {
          ...prev.temperature,
          value: prev.temperature.value + (Math.random() - 0.5) * 0.3
        },
        vibration: {
          ...prev.vibration,
          value: Math.max(0, prev.vibration.value + (Math.random() - 0.5) * 0.1)
        }
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getHealthColor = (percentage) => {
    if (percentage >= 80) return '#10b981'
    if (percentage >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getStatusBadge = (status) => {
    const badges = {
      excellent: { color: '#10b981', bg: '#f0fdf4', icon: FaCheckCircle },
      normal: { color: '#3b82f6', bg: '#eff6ff', icon: FaCheckCircle },
      warning: { color: '#f59e0b', bg: '#fffbeb', icon: FaExclamationTriangle },
      critical: { color: '#ef4444', bg: '#fef2f2', icon: FaExclamationTriangle }
    }
    return badges[status] || badges.normal
  }

  const CircularProgress = ({ percentage, size = 180, strokeWidth = 12, color }) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (percentage / 100) * circumference

    return (
      <div className="circular-progress-container" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="circular-progress">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="progress-circle"
          />
        </svg>
        <div className="circular-progress-text">
          <span className="progress-value">{percentage.toFixed(0)}%</span>
          <span className="progress-label">Health</span>
        </div>
      </div>
    )
  }

  const ParameterCard = ({ icon: Icon, label, value, unit, status, trend, color }) => {
    const badge = getStatusBadge(status)
    const BadgeIcon = badge.icon

    return (
      <div className="parameter-card-modern">
        <div className="parameter-card-header">
          <div className="parameter-icon" style={{ backgroundColor: `${color}15`, color }}>
            <Icon />
          </div>
          <div className="parameter-status-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>
            <BadgeIcon className="status-icon-small" />
            <span>{status}</span>
          </div>
        </div>
        <div className="parameter-card-body">
          <div className="parameter-value-large">
            {value}
            <span className="parameter-unit-large">{unit}</span>
          </div>
          <div className="parameter-label-large">{label}</div>
          <div className="parameter-trend">
            <span className={`trend-indicator ${trend === 'improving' ? 'trend-up' : trend === 'degrading' ? 'trend-down' : ''}`}>
              {trend === 'improving' ? '↗' : trend === 'degrading' ? '↘' : '→'}
            </span>
            <span className="trend-text">{trend}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container modern-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Motor Health Analysis</h1>
          <p className="page-subtitle">Comprehensive monitoring of motor performance metrics</p>
        </div>
        <div className="header-actions">
          <div className="status-badge online">
            <span className="status-dot"></span>
            All Systems Operational
          </div>
        </div>
      </div>

      <div className="health-overview-section">
        <div className="health-main-card">
          <div className="health-header">
            <div className="health-title-section">
              <FaShieldAlt className="health-shield-icon" />
              <div>
                <h2>Overall Health Status</h2>
                <p>System performance indicator</p>
              </div>
            </div>
          </div>
          <div className="health-visualization">
            <CircularProgress 
              percentage={healthData.overall} 
              color={getHealthColor(healthData.overall)}
            />
            <div className="health-details">
              <div className="health-detail-item">
                <span className="health-detail-label">Last Check</span>
                <span className="health-detail-value">Just now</span>
              </div>
              <div className="health-detail-item">
                <span className="health-detail-label">Uptime</span>
                <span className="health-detail-value">98.5%</span>
              </div>
              <div className="health-detail-item">
                <span className="health-detail-label">Maintenance</span>
                <span className="health-detail-value">Due in 45 days</span>
              </div>
            </div>
          </div>
        </div>

        <div className="health-metrics-grid">
          <ParameterCard
            icon={FaTemperatureHigh}
            label="Temperature"
            value={healthData.temperature.value.toFixed(1)}
            unit="°C"
            status={healthData.temperature.status}
            trend={healthData.temperature.trend}
            color="#ef4444"
          />
          <ParameterCard
            icon={FaTachometerAlt}
            label="Vibration"
            value={healthData.vibration.value.toFixed(1)}
            unit="mm/s"
            status={healthData.vibration.status}
            trend={healthData.vibration.trend}
            color="#3b82f6"
          />
          <ParameterCard
            icon={FaBolt}
            label="Current"
            value={healthData.current.value.toFixed(2)}
            unit="A"
            status={healthData.current.status}
            trend={healthData.current.trend}
            color="#f59e0b"
          />
          <ParameterCard
            icon={FaChartLine}
            label="Efficiency"
            value={healthData.efficiency.value.toFixed(1)}
            unit="%"
            status={healthData.efficiency.status}
            trend={healthData.efficiency.trend}
            color="#10b981"
          />
        </div>
      </div>

      <div className="detailed-parameters-section">
        <h3 className="section-title">Detailed Parameters</h3>
        <div className="parameters-grid">
          <div className="detailed-param-card">
            <div className="param-header">
              <FaCog className="param-icon" />
              <span className="param-name">Voltage</span>
            </div>
            <div className="param-value-display">
              <span className="param-value-main">{healthData.voltage.value.toFixed(1)}</span>
              <span className="param-value-unit">V</span>
            </div>
            <div className="param-bar">
              <div 
                className="param-bar-fill" 
                style={{ 
                  width: `${(healthData.voltage.value / 240) * 100}%`,
                  backgroundColor: getHealthColor((healthData.voltage.value / 240) * 100)
                }}
              ></div>
            </div>
            <div className="param-footer">
              <span className="param-status">Optimal Range: 220-240V</span>
            </div>
          </div>

          <div className="detailed-param-card">
            <div className="param-header">
              <FaTachometerAlt className="param-icon" />
              <span className="param-name">Speed</span>
            </div>
            <div className="param-value-display">
              <span className="param-value-main">{healthData.speed.value.toFixed(0)}</span>
              <span className="param-value-unit">RPM</span>
            </div>
            <div className="param-bar">
              <div 
                className="param-bar-fill" 
                style={{ 
                  width: `${(healthData.speed.value / 2000) * 100}%`,
                  backgroundColor: getHealthColor((healthData.speed.value / 2000) * 100)
                }}
              ></div>
            </div>
            <div className="param-footer">
              <span className="param-status">Target: 1500-1800 RPM</span>
            </div>
          </div>

          <div className="detailed-param-card">
            <div className="param-header">
              <FaChartLine className="param-icon" />
              <span className="param-name">Power Factor</span>
            </div>
            <div className="param-value-display">
              <span className="param-value-main">0.94</span>
              <span className="param-value-unit"></span>
            </div>
            <div className="param-bar">
              <div 
                className="param-bar-fill" 
                style={{ 
                  width: '94%',
                  backgroundColor: '#10b981'
                }}
              ></div>
            </div>
            <div className="param-footer">
              <span className="param-status">Excellent</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MotorHealth
