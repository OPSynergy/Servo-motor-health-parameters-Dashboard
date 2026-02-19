import { useState, useEffect } from 'react'
import { 
  FaTemperatureHigh, 
  FaTachometerAlt, 
  FaBolt, 
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaCog,
  FaLink,
  FaPencilAlt
} from 'react-icons/fa'
import { getHealthIndex } from '../services/healthIndexApi'
import { getLatestTrends } from '../services/liveTrendsApi'
import './Page.css'

// Same 6 parameters as Live Trends: vibration, temperature, power-consumption, belt-tension, speed, torque
const LIVE_PARAMS = [
  { id: 'vibration', label: 'Vibration', unit: 'mm/s', icon: FaTachometerAlt, color: '#3b82f6' },
  { id: 'temperature', label: 'Temperature', unit: '°C', icon: FaTemperatureHigh, color: '#ef4444' },
  { id: 'power-consumption', label: 'Power Consumption', unit: 'W', icon: FaBolt, color: '#10b981' },
  { id: 'belt-tension', label: 'Belt Tension', unit: '', icon: FaLink, color: '#f59e0b' },
  { id: 'speed', label: 'Speed', unit: 'RPM', icon: FaTachometerAlt, color: '#8b5cf6' },
  { id: 'torque', label: 'Torque', unit: 'Nm', icon: FaCog, color: '#06b6d4' }
]

const MHI_SET_VALUE_KEY = 'mhi-set-value'
const getInitialMhiSetValue = () => {
  try {
    const saved = localStorage.getItem(MHI_SET_VALUE_KEY)
    if (saved != null) {
      const v = parseFloat(saved)
      if (!Number.isNaN(v) && v >= 1 && v <= 100) return v
    }
  } catch (e) {}
  return 85
}

const MotorHealth = () => {
  const [mhiData, setMhiData] = useState({ mhi: null, updatedAt: null, isFallback: false })
  const [mhiError, setMhiError] = useState(null)
  const [liveParams, setLiveParams] = useState({}) // { [paramId]: { currentValue, highLevel, lowLevel, timestamp } }
  const [mhiSetValue, setMhiSetValue] = useState(getInitialMhiSetValue)
  const [tempMhiSetValue, setTempMhiSetValue] = useState(mhiSetValue)
  const [isEditingMhiValue, setIsEditingMhiValue] = useState(false)

  // Real-time MHI from health-index API (updated by MQTT: main topic or predictive topic)
  useEffect(() => {
    const fetchMhi = async () => {
      try {
        setMhiError(null)
        const res = await getHealthIndex()
        const mhiNum = res.mhi != null && res.mhi !== '' ? Number(res.mhi) : null
        setMhiData({
          mhi: mhiNum,
          updatedAt: res.updatedAt || null,
          isFallback: res.isFallback === true
        })
      } catch (err) {
        setMhiError(err.message || 'Failed to load MHI')
      }
    }
    fetchMhi()
    const interval = setInterval(fetchMhi, 1000)
    return () => clearInterval(interval)
  }, [])

  // Live data for the 6 parameters (same source as Live Trends)
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const list = await getLatestTrends()
        const byParam = {}
        list.forEach((item) => {
          byParam[item.parameter] = {
            currentValue: item.currentValue,
            highLevel: item.highLevel,
            lowLevel: item.lowLevel,
            timestamp: item.timestamp
          }
        })
        setLiveParams(byParam)
      } catch (_) {
        // keep previous values
      }
    }
    fetchLatest()
    const interval = setInterval(fetchLatest, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setTempMhiSetValue(mhiSetValue)
  }, [mhiSetValue])

  useEffect(() => {
    localStorage.setItem(MHI_SET_VALUE_KEY, String(mhiSetValue))
  }, [mhiSetValue])

  // Sync Set MHI Value to backend on load and when it changes so motor_health rows use it
  useEffect(() => {
    const v = Number(mhiSetValue)
    if (Number.isNaN(v) || v < 1 || v > 100) return
    fetch('http://localhost:3001/api/motor-health/set-value', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setMhiValue: v })
    }).catch(() => {})
  }, [mhiSetValue])

  const handleSetMhiValue = () => {
    const value = parseFloat(tempMhiSetValue)
    if (!Number.isNaN(value) && value >= 1 && value <= 100) {
      setMhiSetValue(value)
      setIsEditingMhiValue(false)
      fetch('http://localhost:3001/api/motor-health/set-value', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setMhiValue: value })
      }).catch(() => {})
    } else {
      alert('MHI value must be between 1 and 100')
      setTempMhiSetValue(mhiSetValue)
    }
  }

  // Overall health %: MHI from MQTT can be 0–1 or 0–100; normalize to 0–100 for display
  const rawMhi = mhiData.mhi != null && !Number.isNaN(mhiData.mhi) ? Number(mhiData.mhi) : null
  const overallPercent = rawMhi != null ? (rawMhi <= 1 ? Math.round(rawMhi * 100) : Math.round(rawMhi)) : null
  const displayPercent = overallPercent != null ? overallPercent : 87

  const getHealthColor = (percentage) => {
    if (percentage == null) return '#6b7280'
    if (percentage >= 80) return '#10b981'
    if (percentage >= 60) return '#f59e0b'
    return '#ef4444'
  }

  // MHI color from user-set MHI value (1-100). Live MHI from API can be 0-1 or 0-100.
  const getMhiColorFromSetValue = (mhi) => {
    if (mhi == null || Number.isNaN(mhi)) return '#6b7280'
    const mhiPercent = mhi <= 1 ? mhi * 100 : mhi
    const threshold = mhiSetValue
    if (mhiPercent >= threshold) return '#10b981'
    if (mhiPercent >= threshold * 0.7) return '#f59e0b'
    return '#ef4444'
  }

  const mhiColor = mhiData.mhi != null ? getMhiColorFromSetValue(mhiData.mhi) : getHealthColor(overallPercent)

  // Motor health status label from MHI (0–100): 90–100 Excellent, 60–89 Good, 50–59 Fair, <50 Poor
  const getMotorHealthStatus = (percent) => {
    if (percent == null || Number.isNaN(percent)) return { label: '—', color: '#6b7280' }
    const p = percent <= 1 ? percent * 100 : percent
    if (p >= 90) return { label: 'Excellent', color: '#059669' }
    if (p >= 60) return { label: 'Good', color: '#10b981' }
    if (p >= 50) return { label: 'Fair', color: '#f59e0b' }
    return { label: 'Poor', color: '#ef4444' }
  }
  const motorHealthStatus = getMotorHealthStatus(overallPercent)

  const getStatusBadge = (status) => {
    const badges = {
      excellent: { color: '#10b981', bg: '#f0fdf4', icon: FaCheckCircle },
      normal: { color: '#3b82f6', bg: '#eff6ff', icon: FaCheckCircle },
      warning: { color: '#f59e0b', bg: '#fffbeb', icon: FaExclamationTriangle },
      critical: { color: '#ef4444', bg: '#fef2f2', icon: FaExclamationTriangle }
    }
    return badges[status] || badges.normal
  }

  const getParamStatus = (value, highLevel, lowLevel) => {
    if (value == null || Number.isNaN(value)) return 'normal'
    const hl = Number(highLevel)
    const ll = Number(lowLevel)
    if (hl != null && !Number.isNaN(hl) && value >= hl) return 'warning'
    if (ll != null && !Number.isNaN(ll) && value <= ll) return 'warning'
    return 'normal'
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
    <div className="page-container modern-dashboard motor-health-page">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Motor Health Analysis</h1>
          <p className="page-subtitle">Comprehensive monitoring of motor performance metrics</p>
        </div>
      </div>

      <div className="health-overview-section">
        <div className="health-overview-left">
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
                percentage={displayPercent} 
                size={160}
                strokeWidth={12}
                color={mhiColor}
              />
              <div className="health-details">
                <div className="health-detail-item">
                  <span className="health-detail-label">Last Check</span>
                  <span className="health-detail-value">
                    {mhiData.updatedAt
                      ? new Date(mhiData.updatedAt).toLocaleString()
                      : '—'}
                  </span>
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

          <div className="mhi-cards-row">
            <div className="mhi-value-card">
              {mhiError && (
                <p className="mhi-value-card-error">{mhiError}</p>
              )}
              <div className="mhi-value-card-header">
                <span className="mhi-value-card-label">Motor Health Index (MHI)</span>
                <span
                  className="mhi-value-card-value"
                  style={{ color: mhiColor }}
                >
                  {overallPercent != null
                    ? `${overallPercent}%`
                    : '—'}
                </span>
              </div>
              <p className="mhi-value-card-updated">
                {mhiData.updatedAt
                  ? new Date(mhiData.updatedAt).toLocaleString()
                  : mhiData.isFallback ? 'Default' : 'Waiting…'}
              </p>
              <div className="mhi-levels-row">
                <div className="mhi-level-item mhi-level-editable">
                  <span className="mhi-level-label">Set MHI:</span>
                  <div className="mhi-level-value-wrap">
                    {isEditingMhiValue ? (
                      <>
                        <input
                          type="number"
                          className="mhi-level-input"
                          min="1"
                          max="100"
                          step="1"
                          value={tempMhiSetValue}
                          onChange={(e) => setTempMhiSetValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSetMhiValue()}
                          autoFocus
                        />
                        <button type="button" className="mhi-set-btn" onClick={handleSetMhiValue}>Set</button>
                        <button
                          type="button"
                          className="mhi-cancel-btn"
                          onClick={() => { setTempMhiSetValue(mhiSetValue); setIsEditingMhiValue(false) }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className="mhi-level-value">{Number(mhiSetValue) % 1 === 0 ? mhiSetValue : mhiSetValue.toFixed(1)}</span>
                    )}
                  </div>
                  {!isEditingMhiValue && (
                    <button
                      type="button"
                      className="mhi-edit-btn"
                      onClick={() => setIsEditingMhiValue(true)}
                      title="Edit MHI Value"
                    >
                      <FaPencilAlt />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="mhi-status-card">
              <span className="mhi-status-card-label">Status</span>
              <span
                className="mhi-status-card-value"
                style={{ color: motorHealthStatus.color }}
              >
                {motorHealthStatus.label}
              </span>
              <p className="mhi-status-card-hint">
                90–100 Excellent, 60–89 Good, 50–59 Fair, &lt;50 Poor
              </p>
            </div>
          </div>
        </div>

        <div className="health-metrics-grid health-metrics-grid-6">
          {LIVE_PARAMS.map((param) => {
            const data = liveParams[param.id]
            const value = data?.currentValue
            const status = getParamStatus(value, data?.highLevel, data?.lowLevel)
            const displayValue = value != null && !Number.isNaN(value)
              ? (Number(value) % 1 === 0 ? String(Number(value)) : Number(value).toFixed(2))
              : '—'
            const Icon = param.icon
            return (
              <ParameterCard
                key={param.id}
                icon={Icon}
                label={param.label}
                value={displayValue}
                unit={param.unit}
                status={status}
                trend="stable"
                color={param.color}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MotorHealth
