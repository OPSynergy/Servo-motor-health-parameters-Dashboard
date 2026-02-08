import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import './LiveTrendsGraph.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const LiveTrendsGraph = ({ type }) => {
  // Initial configuration for colors and titles
  const config = {
    vibration: {
      title: 'Vibration Analysis',
      color: '#3b82f6',
      defaultHL: 80,
      defaultLL: 30
    },
    temperature: {
      title: 'Temperature Monitoring',
      color: '#ef4444',
      defaultHL: 85,
      defaultLL: 35
    },
    'current-consumption': {
      title: 'Current Consumption',
      color: '#10b981',
      defaultHL: 75,
      defaultLL: 25
    },
    'belt-tension': {
      title: 'Belt Tension',
      color: '#f59e0b',
      defaultHL: 90,
      defaultLL: 40
    }
  }

  const currentConfig = config[type] || config.vibration

  // Initialize levels from localStorage or defaults
  const getInitialLevels = () => {
    const savedLevels = localStorage.getItem(`levels-${type}`)
    if (savedLevels) {
      try {
        return JSON.parse(savedLevels)
      } catch (e) {
        console.error('Error parsing saved levels:', e)
      }
    }
    return {
      HL: currentConfig.defaultHL,
      LL: currentConfig.defaultLL
    }
  }

  const [levels, setLevels] = useState(getInitialLevels)
  const [data, setData] = useState([])
  const [tempHL, setTempHL] = useState(levels.HL)
  const [tempLL, setTempLL] = useState(levels.LL)
  const [isEditingHL, setIsEditingHL] = useState(false)
  const [isEditingLL, setIsEditingLL] = useState(false)

  // Update levels when type changes
  useEffect(() => {
    const savedLevels = localStorage.getItem(`levels-${type}`)
    let newLevels
    
    if (savedLevels) {
      try {
        newLevels = JSON.parse(savedLevels)
      } catch (e) {
        newLevels = {
          HL: currentConfig.defaultHL,
          LL: currentConfig.defaultLL
        }
      }
    } else {
      newLevels = {
        HL: currentConfig.defaultHL,
        LL: currentConfig.defaultLL
      }
    }
    
    setLevels(newLevels)
    setTempHL(newLevels.HL)
    setTempLL(newLevels.LL)
    setIsEditingHL(false)
    setIsEditingLL(false)
  }, [type]) // Remove currentConfig from dependencies to avoid circular updates

  // Save levels to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`levels-${type}`, JSON.stringify(levels))
  }, [levels, type])

  const mid = (levels.HL + levels.LL) / 2
  const amplitude = (levels.HL - levels.LL) / 3

  // Generate sample data
  useEffect(() => {
    const generateData = () => {
      const points = 50
      const newData = []

      for (let i = 0; i < points; i++) {
        const noise = (Math.random() - 0.5) * amplitude
        const trend = Math.sin(i / 8) * amplitude * 0.5
        newData.push(mid + trend + noise)
      }
      setData(newData)
    }

    generateData()
    const interval = setInterval(generateData, 3000)
    return () => clearInterval(interval)
  }, [mid, amplitude]) // Use mid and amplitude instead of levels

  const handleSetHL = () => {
    const value = parseFloat(tempHL)
    if (!isNaN(value) && value > levels.LL) {
      setLevels({ HL: value, LL: levels.LL })
      setIsEditingHL(false)
    } else {
      alert('High Level must be greater than Low Level')
      setTempHL(levels.HL)
    }
  }

  const handleSetLL = () => {
    const value = parseFloat(tempLL)
    if (!isNaN(value) && value < levels.HL) {
      setLevels({ HL: levels.HL, LL: value })
      setIsEditingLL(false)
    } else {
      alert('Low Level must be less than High Level')
      setTempLL(levels.LL)
    }
  }

  const labels = Array.from({ length: data.length }, (_, i) => i)

  const chartData = {
    labels,
    datasets: [
      {
        label: currentConfig.title,
        data: data,
        borderColor: currentConfig.color,
        backgroundColor: `${currentConfig.color}20`,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: currentConfig.color,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      },
      {
        label: 'High Level (HL)',
        data: Array(data.length).fill(levels.HL),
        borderColor: '#dc2626',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [10, 5],
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'Low Level (LL)',
        data: Array(data.length).fill(levels.LL),
        borderColor: '#ea580c',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [10, 5],
        pointRadius: 0,
        fill: false,
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            family: "'Inter', sans-serif"
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 10,
          font: {
            size: 11
          }
        },
        title: {
          display: true,
          text: 'Time (samples)',
          font: {
            size: 13,
            weight: 'bold'
          }
        }
      },
      y: {
        display: true,
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          }
        },
        title: {
          display: true,
          text: 'Value',
          font: {
            size: 13,
            weight: 'bold'
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }

  const currentValue = data[data.length - 1] || 0
  const status = currentValue > levels.HL ? 'critical' : 
                 currentValue < levels.LL ? 'warning' : 'normal'

  return (
    <div className="live-trends-container">
      <div className="trends-header">
        <h1 className="trends-title">{currentConfig.title}</h1>
        <div className="trends-stats">
          <div className="stat-card">
            <span className="stat-label">Current Value</span>
            <span 
              className={`stat-value ${status}`}
              style={{ color: currentConfig.color }}
            >
              {currentValue.toFixed(2)}
            </span>
          </div>

          <div className="stat-card stat-card-editable">
            <span className="stat-label">High Level (HL)</span>
            <div className="stat-value-container">
              {isEditingHL ? (
                <>
                  <input
                    type="number"
                    className="level-input"
                    value={tempHL}
                    onChange={(e) => setTempHL(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSetHL()}
                    autoFocus
                  />
                  <button className="set-btn" onClick={handleSetHL}>
                    Set
                  </button>
                  <button 
                    className="cancel-btn" 
                    onClick={() => {
                      setTempHL(levels.HL)
                      setIsEditingHL(false)
                    }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span className="stat-value critical">{levels.HL}</span>
                  <button 
                    className="edit-btn" 
                    onClick={() => setIsEditingHL(true)}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="stat-card stat-card-editable">
            <span className="stat-label">Low Level (LL)</span>
            <div className="stat-value-container">
              {isEditingLL ? (
                <>
                  <input
                    type="number"
                    className="level-input"
                    value={tempLL}
                    onChange={(e) => setTempLL(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSetLL()}
                    autoFocus
                  />
                  <button className="set-btn" onClick={handleSetLL}>
                    Set
                  </button>
                  <button 
                    className="cancel-btn" 
                    onClick={() => {
                      setTempLL(levels.LL)
                      setIsEditingLL(false)
                    }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span className="stat-value warning">{levels.LL}</span>
                  <button 
                    className="edit-btn" 
                    onClick={() => setIsEditingLL(true)}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="graph-container">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}

export default LiveTrendsGraph