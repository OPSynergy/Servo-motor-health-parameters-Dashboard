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
  const [data, setData] = useState([])
  
  // Simple configuration for colors and titles only
  const config = {
    vibration: {
      title: 'Vibration Analysis',
      color: '#3b82f6' // Blue
    },
    temperature: {
      title: 'Temperature Monitoring',
      color: '#ef4444' // Red
    },
    'current-consumption': {
      title: 'Current Consumption',
      color: '#10b981' // Green
    },
    'belt-tension': {
      title: 'Belt Tension',
      color: '#f59e0b' // Orange
    }
  }

  const currentConfig = config[type] || config.vibration

  // Common values for all graphs
  const HL = 80
  const LL = 30
  const mid = (HL + LL) / 2
  const amplitude = (HL - LL) / 3

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
  }, [type])

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
        data: Array(data.length).fill(HL),
        borderColor: '#dc2626',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [10, 5],
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'Low Level (LL)',
        data: Array(data.length).fill(LL),
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
  const status = currentValue > HL ? 'critical' : 
                 currentValue < LL ? 'warning' : 'normal'

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
          <div className="stat-card">
            <span className="stat-label">High Level (HL)</span>
            <span className="stat-value critical">
              {HL}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Low Level (LL)</span>
            <span className="stat-value warning">
              {LL}
            </span>
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