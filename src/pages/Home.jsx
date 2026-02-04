import { useState, useEffect } from 'react'
import { 
  FaWaveSquare,
  FaCog,
  FaTemperatureHigh,
  FaHeartbeat,
  FaBolt,
  FaLink,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaTimes,
  FaExpand
} from 'react-icons/fa'
import './Page.css'

const Home = () => {
  const [metrics, setMetrics] = useState({
    vibration: 2.4,
    torque: 15.8,
    temperature: 45.2,
    motorHealth: 92.5,
    powerConsumption: 1250,
    beltTension: 850
  })

  const [expandedChart, setExpandedChart] = useState(null)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        vibration: Math.max(1.5, Math.min(3.5, prev.vibration + (Math.random() - 0.5) * 0.2)),
        torque: Math.max(12, Math.min(18, prev.torque + (Math.random() - 0.5) * 0.5)),
        temperature: Math.max(35, Math.min(55, prev.temperature + (Math.random() - 0.5) * 0.8)),
        motorHealth: Math.max(85, Math.min(98, prev.motorHealth + (Math.random() - 0.5) * 0.5)),
        powerConsumption: Math.max(1000, Math.min(1500, prev.powerConsumption + (Math.random() - 0.5) * 30)),
        beltTension: Math.max(700, Math.min(1000, prev.beltTension + (Math.random() - 0.5) * 20))
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Generate chart data with more realistic patterns
  const generateChartData = (baseValue, variance, count = 50) => {
    return Array.from({ length: count }, (_, i) => ({
      time: i,
      value: baseValue + Math.sin(i / 8) * variance + (Math.random() - 0.5) * variance * 0.3
    }))
  }

  const chartConfigs = [
    {
      id: 'vibration',
      title: 'Vibration',
      unit: 'mm/s²',
      icon: FaWaveSquare,
      color: '#8b5cf6',
      data: generateChartData(2.5, 0.4),
      nominal: 2.5,
      currentValue: metrics.vibration
    },
    {
      id: 'torque',
      title: 'Torque',
      unit: 'Nm',
      icon: FaCog,
      color: '#06b6d4',
      data: generateChartData(15, 1.5),
      nominal: 15,
      currentValue: metrics.torque
    },
    {
      id: 'temperature',
      title: 'Temperature',
      unit: '°C',
      icon: FaTemperatureHigh,
      color: '#ef4444',
      data: generateChartData(45, 4),
      nominal: 45,
      currentValue: metrics.temperature
    },
    {
      id: 'motorHealth',
      title: 'Motor Health',
      unit: '%',
      icon: FaHeartbeat,
      color: '#10b981',
      data: generateChartData(92, 3),
      nominal: 92,
      currentValue: metrics.motorHealth
    },
    {
      id: 'powerConsumption',
      title: 'Power Consumption',
      unit: 'Wh',
      icon: FaBolt,
      color: '#f59e0b',
      data: generateChartData(1250, 100),
      nominal: 1250,
      currentValue: metrics.powerConsumption
    },
    {
      id: 'beltTension',
      title: 'Belt Tension',
      unit: 'N',
      icon: FaLink,
      color: '#ec4899',
      data: generateChartData(850, 60),
      nominal: 850,
      currentValue: metrics.beltTension
    }
  ]

  const getHealthStatus = (value, nominal) => {
    const deviation = Math.abs(((value - nominal) / nominal) * 100)
    if (deviation < 5) return { status: 'optimal', icon: FaCheckCircle, color: '#10b981', label: 'Optimal' }
    if (deviation < 10) return { status: 'warning', icon: FaExclamationTriangle, color: '#f59e0b', label: 'Warning' }
    return { status: 'critical', icon: FaTimesCircle, color: '#ef4444', label: 'Critical' }
  }

  const ProfessionalChart = ({ config, isExpanded = false }) => {
    const { data, color, nominal, currentValue, title, unit, icon: Icon } = config
    const max = Math.max(...data.map(d => d.value))
    const min = Math.min(...data.map(d => d.value))
    const range = max - min || 1
    const height = isExpanded ? 400 : 180
    const padding = { top: 20, bottom: 30, left: 10, right: 10 }
    
    // Calculate HL and LL (±10%)
    const HL = nominal * 1.1
    const LL = nominal * 0.9

    const getY = (value) => {
      return padding.top + (height - padding.top - padding.bottom) * (1 - (value - min) / range)
    }

    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * (100 - padding.left - padding.right)
      const y = getY(d.value)
      return `${x},${y}`
    }).join(' ')

    const healthStatus = getHealthStatus(currentValue, nominal)
    const HealthIcon = healthStatus.icon

    return (
      <div 
        className={`professional-chart-card ${isExpanded ? 'expanded' : ''}`}
        onClick={() => !isExpanded && setExpandedChart(config)}
        style={{ cursor: isExpanded ? 'default' : 'pointer' }}
      >
        <div className="chart-card-header">
          <div className="chart-title-group">
            <div className="chart-icon" style={{ backgroundColor: `${color}15`, color }}>
              <Icon />
            </div>
            <div>
              <h3 className="chart-title">{title}</h3>
              <div className="chart-status">
                <HealthIcon style={{ color: healthStatus.color }} />
                <span style={{ color: healthStatus.color }}>{healthStatus.label}</span>
              </div>
            </div>
          </div>
          <div className="chart-value-display">
            <div className="current-value" style={{ color }}>
              {currentValue.toFixed(title === 'Motor Health' ? 1 : title === 'Power Consumption' || title === 'Belt Tension' ? 0 : 2)}
            </div>
            <div className="value-unit">{unit}</div>
          </div>
        </div>

        <div className="chart-svg-container" style={{ height: `${height}px` }}>
          <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="professional-svg">
            <defs>
              <linearGradient id={`gradient-${config.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0.05" />
              </linearGradient>
              <filter id={`glow-${config.id}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
              const y = padding.top + (height - padding.top - padding.bottom) * percent
              return (
                <line
                  key={i}
                  x1={padding.left}
                  y1={y}
                  x2={100 - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.3"
                  strokeDasharray="2,2"
                />
              )
            })}

            {/* HL line (High Limit +10%) */}
            <line
              x1={padding.left}
              y1={getY(HL)}
              x2={100 - padding.right}
              y2={getY(HL)}
              stroke="#ef4444"
              strokeWidth="0.5"
              strokeDasharray="3,3"
              opacity="0.6"
            />
            <text
              x={100 - padding.right + 1}
              y={getY(HL)}
              fontSize="3"
              fill="#ef4444"
              dominantBaseline="middle"
            >
              HL
            </text>

            {/* Nominal line */}
            <line
              x1={padding.left}
              y1={getY(nominal)}
              x2={100 - padding.right}
              y2={getY(nominal)}
              stroke={color}
              strokeWidth="0.4"
              strokeDasharray="2,2"
              opacity="0.4"
            />

            {/* LL line (Low Limit -10%) */}
            <line
              x1={padding.left}
              y1={getY(LL)}
              x2={100 - padding.right}
              y2={getY(LL)}
              stroke="#f59e0b"
              strokeWidth="0.5"
              strokeDasharray="3,3"
              opacity="0.6"
            />
            <text
              x={100 - padding.right + 1}
              y={getY(LL)}
              fontSize="3"
              fill="#f59e0b"
              dominantBaseline="middle"
            >
              LL
            </text>

            {/* Area under curve */}
            <polygon
              points={`${padding.left},${height - padding.bottom} ${points} ${100 - padding.right},${height - padding.bottom}`}
              fill={`url(#gradient-${config.id})`}
            />

            {/* Main line */}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#glow-${config.id})`}
            />

            {/* Current value indicator */}
            <circle
              cx={100 - padding.right}
              cy={getY(currentValue)}
              r="1.5"
              fill={color}
              stroke="white"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        <div className="chart-legend-container">
          <div className="legend-item-inline">
            <span className="legend-dot-inline" style={{ backgroundColor: color }}></span>
            <span className="legend-text">Current</span>
          </div>
          <div className="legend-item-inline">
            <span className="legend-line-inline" style={{ borderColor: '#ef4444' }}></span>
            <span className="legend-text">HL (+10%)</span>
          </div>
          <div className="legend-item-inline">
            <span className="legend-line-inline" style={{ borderColor: '#f59e0b' }}></span>
            <span className="legend-text">LL (-10%)</span>
          </div>
        </div>

        {!isExpanded && (
          <div className="chart-expand-hint">
            <FaExpand /> Click to expand
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-container modern-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard Home</h1>
          <p className="page-subtitle">Real-time monitoring of servo motor parameters</p>
        </div>
        <div className="header-actions">
          <div className="status-badge online">
            <span className="status-dot"></span>
            System Online
          </div>
        </div>
      </div>

      <div className="charts-grid-professional">
        {chartConfigs.map((config) => (
          <ProfessionalChart key={config.id} config={config} />
        ))}
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="chart-modal-overlay" onClick={() => setExpandedChart(null)}>
          <div className="chart-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="chart-modal-close" onClick={() => setExpandedChart(null)}>
              <FaTimes />
            </button>
            <ProfessionalChart config={expandedChart} isExpanded={true} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Home