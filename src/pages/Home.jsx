import { useState, useEffect } from 'react'
import { 
  FaTemperatureHigh, 
  FaTachometerAlt, 
  FaBolt, 
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa'
import './Page.css'

const Home = () => {
  const [metrics, setMetrics] = useState({
    temperature: 45.2,
    speed: 1520,
    current: 2.48,
    voltage: 230.5,
    efficiency: 94.2,
    power: 5.7
  })

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        temperature: prev.temperature + (Math.random() - 0.5) * 0.5,
        speed: prev.speed + (Math.random() - 0.5) * 10,
        current: prev.current + (Math.random() - 0.5) * 0.05,
        voltage: prev.voltage + (Math.random() - 0.5) * 0.5,
        efficiency: prev.efficiency + (Math.random() - 0.5) * 0.3,
        power: prev.power + (Math.random() - 0.5) * 0.1
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Generate chart data
  const generateChartData = (count = 24) => {
    return Array.from({ length: count }, (_, i) => ({
      time: i,
      value: 40 + Math.sin(i / 4) * 5 + Math.random() * 3
    }))
  }

  const tempData = generateChartData()
  const speedData = generateChartData().map(d => ({ ...d, value: 1500 + Math.sin(d.time / 3) * 50 + Math.random() * 20 }))
  const currentData = generateChartData().map(d => ({ ...d, value: 2.5 + Math.sin(d.time / 5) * 0.3 + Math.random() * 0.1 }))

  const getStatusColor = (value, min, max) => {
    const percentage = ((value - min) / (max - min)) * 100
    if (percentage < 30) return '#10b981' // green
    if (percentage < 70) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const MetricCard = ({ icon: Icon, title, value, unit, trend, status, color }) => (
    <div className="modern-metric-card">
      <div className="metric-header">
        <div className="metric-icon" style={{ backgroundColor: `${color}15`, color }}>
          <Icon />
        </div>
        <div className="metric-trend">
          {trend > 0 ? <FaArrowUp className="trend-up" /> : <FaArrowDown className="trend-down" />}
          <span className={trend > 0 ? 'trend-up' : 'trend-down'}>{Math.abs(trend)}%</span>
        </div>
      </div>
      <div className="metric-content">
        <div className="metric-value">
          {value}
          <span className="metric-unit">{unit}</span>
        </div>
        <div className="metric-title">{title}</div>
        <div className="metric-status">
          {status === 'normal' ? (
            <><FaCheckCircle className="status-icon normal" /> Normal</>
          ) : (
            <><FaExclamationTriangle className="status-icon warning" /> Warning</>
          )}
        </div>
      </div>
    </div>
  )

  const MiniChart = ({ data, color, height = 60 }) => {
    const max = Math.max(...data.map(d => d.value))
    const min = Math.min(...data.map(d => d.value))
    const range = max - min || 1
    const width = 200
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((d.value - min) / range) * height
      return `${x},${y}`
    }).join(' ')

    return (
      <svg width={width} height={height} className="mini-chart">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#gradient-${color})`}
        />
      </svg>
    )
  }

  return (
    <div className="page-container modern-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Real-time monitoring of servo motor parameters</p>
        </div>
        <div className="header-actions">
          <div className="status-badge online">
            <span className="status-dot"></span>
            System Online
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          icon={FaTemperatureHigh}
          title="Temperature"
          value={metrics.temperature.toFixed(1)}
          unit="°C"
          trend={2.3}
          status="normal"
          color="#ef4444"
        />
        <MetricCard
          icon={FaTachometerAlt}
          title="Speed"
          value={metrics.speed.toFixed(0)}
          unit="RPM"
          trend={-1.2}
          status="normal"
          color="#3b82f6"
        />
        <MetricCard
          icon={FaBolt}
          title="Current"
          value={metrics.current.toFixed(2)}
          unit="A"
          trend={0.5}
          status="normal"
          color="#f59e0b"
        />
        <MetricCard
          icon={FaChartLine}
          title="Efficiency"
          value={metrics.efficiency.toFixed(1)}
          unit="%"
          trend={1.8}
          status="normal"
          color="#10b981"
        />
      </div>

      <div className="charts-section">
        <div className="modern-chart-card">
          <div className="chart-header">
            <h3>Temperature Trend (24h)</h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span>
                Temperature
              </span>
            </div>
          </div>
          <div className="chart-container">
            <MiniChart data={tempData} color="#ef4444" height={120} />
          </div>
        </div>

        <div className="modern-chart-card">
          <div className="chart-header">
            <h3>Speed Profile</h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></span>
                RPM
              </span>
            </div>
          </div>
          <div className="chart-container">
            <MiniChart data={speedData} color="#3b82f6" height={120} />
          </div>
        </div>

        <div className="modern-chart-card">
          <div className="chart-header">
            <h3>Current Consumption</h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                Amperage
              </span>
            </div>
          </div>
          <div className="chart-container">
            <MiniChart data={currentData} color="#f59e0b" height={120} />
          </div>
        </div>
      </div>

      <div className="quick-stats-grid">
        <div className="quick-stat-card">
          <div className="quick-stat-icon" style={{ backgroundColor: '#10b98115', color: '#10b981' }}>
            <FaCheckCircle />
          </div>
          <div className="quick-stat-content">
            <div className="quick-stat-value">98.5%</div>
            <div className="quick-stat-label">Uptime</div>
          </div>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon" style={{ backgroundColor: '#3b82f615', color: '#3b82f6' }}>
            <FaBolt />
          </div>
          <div className="quick-stat-content">
            <div className="quick-stat-value">{metrics.power.toFixed(1)} kW</div>
            <div className="quick-stat-label">Power Consumption</div>
          </div>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}>
            <FaTachometerAlt />
          </div>
          <div className="quick-stat-content">
            <div className="quick-stat-value">{metrics.voltage.toFixed(1)} V</div>
            <div className="quick-stat-label">Voltage</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
