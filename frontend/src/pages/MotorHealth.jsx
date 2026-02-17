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
  FaLink
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

const MotorHealth = () => {
  const [mhiData, setMhiData] = useState({ mhi: null, updatedAt: null, isFallback: false })
  const [mhiError, setMhiError] = useState(null)
  const [liveParams, setLiveParams] = useState({}) // { [paramId]: { currentValue, highLevel, lowLevel, timestamp } }

  // Real-time MHI from health-index API (same source as MQTT)
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
    const interval = setInterval(fetchMhi, 2000)
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

  // Overall health %: MHI is 0–1, display as 0–100%
  const overallPercent = mhiData.mhi != null && !Number.isNaN(mhiData.mhi) ? Math.round(mhiData.mhi * 100) : null
  const displayPercent = overallPercent != null ? overallPercent : 87

  const getHealthColor = (percentage) => {
    if (percentage == null) return '#6b7280'
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

  const getParamStatus = (value, highLevel, lowLevel) => {
    if (value == null || Number.isNaN(value)) return 'normal'
    const hl = Number(highLevel)
    const ll = Number(lowLevel)
    if (hl != null && !Number.isNaN(hl) && value >= hl) return 'warning'
    if (ll != null && !Number.isNaN(ll) && value <= ll) return 'warning'
    return 'normal'
  }

  const getBarPercent = (value, highLevel, lowLevel) => {
    if (value == null || Number.isNaN(value)) return 50
    const hl = Number(highLevel)
    const ll = Number(lowLevel)
    if (hl != null && ll != null && !Number.isNaN(hl) && !Number.isNaN(ll) && hl > ll) {
      const p = ((value - ll) / (hl - ll)) * 100
      return Math.min(100, Math.max(0, p))
    }
    return 50
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
                color={getHealthColor(overallPercent != null ? overallPercent : displayPercent)}
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

          <div className="mhi-value-card">
            {mhiError && (
              <p className="mhi-value-card-error">{mhiError}</p>
            )}
            <div className="mhi-value-card-header">
              <span className="mhi-value-card-label">Motor Health Index (MHI)</span>
              <span
                className="mhi-value-card-value"
                style={{ color: getHealthColor(overallPercent != null ? overallPercent : null) }}
              >
                {mhiData.mhi != null && !Number.isNaN(mhiData.mhi)
                  ? Number(mhiData.mhi).toFixed(3)
                  : '—'}
              </span>
            </div>
            <p className="mhi-value-card-updated">
              {mhiData.updatedAt
                ? `Updated ${new Date(mhiData.updatedAt).toLocaleString()}`
                : mhiData.isFallback
                  ? 'Using default until MQTT sends MHI'
                  : 'Waiting for data…'}
            </p>
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

      <div className="detailed-parameters-section">
        <h3 className="section-title">Detailed Parameters (Live)</h3>
        <div className="parameters-grid">
          {LIVE_PARAMS.map((param) => {
            const data = liveParams[param.id]
            const value = data?.currentValue
            const displayValue = value != null && !Number.isNaN(value)
              ? (Number(value) % 1 === 0 ? String(Number(value)) : Number(value).toFixed(2))
              : '—'
            const barPct = getBarPercent(value, data?.highLevel, data?.lowLevel)
            const Icon = param.icon
            const rangeText = data?.lowLevel != null && data?.highLevel != null
              ? `Range: ${data.lowLevel} – ${data.highLevel} ${param.unit}`.trim()
              : 'Live data'
            return (
              <div key={param.id} className="detailed-param-card">
                <div className="param-header">
                  <Icon className="param-icon" style={{ color: param.color }} />
                  <span className="param-name">{param.label}</span>
                </div>
                <div className="param-value-display">
                  <span className="param-value-main">{displayValue}</span>
                  <span className="param-value-unit">{param.unit}</span>
                </div>
                <div className="param-bar">
                  <div
                    className="param-bar-fill"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: getHealthColor(barPct)
                    }}
                  />
                </div>
                <div className="param-footer">
                  <span className="param-status">{rangeText}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MotorHealth
