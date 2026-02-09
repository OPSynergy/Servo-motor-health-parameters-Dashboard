import { useState, useEffect, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { FaPencilAlt } from 'react-icons/fa'
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
import { saveLiveTrend, getHistoricalTrends, deleteAllTrendsForParameter } from '../services/liveTrendsApi'
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
  const [showTimeOptions, setShowTimeOptions] = useState(false)
  const [selectedTimeOption, setSelectedTimeOption] = useState(null)
  const [historicalData, setHistoricalData] = useState([])
  const [loadingHistorical, setLoadingHistorical] = useState(false)
  const [graphData, setGraphData] = useState([])
  const [graphLabels, setGraphLabels] = useState([])
  const [lastClearTime, setLastClearTime] = useState(null)

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
    
    // Clear historical data when parameter type changes
    setSelectedTimeOption(null)
    setHistoricalData([])
    setLoadingHistorical(false)
    setGraphData([])
    setGraphLabels([])
  }, [type]) // Remove currentConfig from dependencies to avoid circular updates

  // Save levels to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`levels-${type}`, JSON.stringify(levels))
  }, [levels, type])

  const mid = (levels.HL + levels.LL) / 2
  const amplitude = (levels.HL - levels.LL) / 3

  // Generate sample data (only when no time option is selected)
  useEffect(() => {
    if (selectedTimeOption) {
      // Don't generate live data when viewing historical data
      return
    }
    
    const generateData = () => {
      const points = 50
      const newData = []

      for (let i = 0; i < points; i++) {
        const noise = (Math.random() - 0.5) * amplitude
        const trend = Math.sin(i / 8) * amplitude * 0.5
        newData.push(mid + trend + noise)
      }
      setData(newData)
      // Immediately update graph data for live mode
      if (!selectedTimeOption) {
        setGraphData(newData)
        setGraphLabels(Array.from({ length: newData.length }, (_, i) => i))
      }
    }

    // Generate initial data immediately
    generateData()
    const interval = setInterval(generateData, 3000)
    return () => clearInterval(interval)
  }, [mid, amplitude, selectedTimeOption]) // Use mid and amplitude instead of levels

  // Save current value to database periodically (only when not viewing historical data)
  useEffect(() => {
    if (selectedTimeOption || data.length === 0) return
    
    const currentValue = data[data.length - 1]
    
    const saveData = async () => {
      try {
        await saveLiveTrend(type, levels.HL, levels.LL, currentValue)
      } catch (error) {
        // Silently fail - don't interrupt the UI
        console.error('Failed to save live trend data:', error)
      }
    }
    
    // Save immediately and then every 3 seconds
    saveData()
    const saveInterval = setInterval(saveData, 3000)
    
    return () => clearInterval(saveInterval)
  }, [data, levels, type, selectedTimeOption])

  // Update graph data based on selected time option or live data
  useEffect(() => {
    if (selectedTimeOption) {
      // When time option is selected, use historical data
      if (historicalData.length > 0) {
        // Sort by timestamp to ensure chronological order
        const sortedData = [...historicalData].sort((a, b) => {
          const dateA = new Date(a.timestamp)
          const dateB = new Date(b.timestamp)
          return dateA.getTime() - dateB.getTime()
        })
        
        const sortedValues = []
        const labels = []
        
        sortedData.forEach(item => {
          // Parse the current value - handle both number and string
          // Backend returns currentValue (camelCase), not current_value
          let value = item.currentValue !== undefined ? item.currentValue : item.current_value
          if (typeof value === 'string') {
            value = parseFloat(value)
          }
          if (typeof value === 'number' && !isNaN(value)) {
            sortedValues.push(value)
            
            // Create label from timestamp
            const date = new Date(item.timestamp)
            if (!isNaN(date.getTime())) {
              const hours = String(date.getHours()).padStart(2, '0')
              const minutes = String(date.getMinutes()).padStart(2, '0')
              const seconds = String(date.getSeconds()).padStart(2, '0')
              labels.push(`${hours}:${minutes}:${seconds}`)
            }
          }
        })
        
        // Ensure labels and values have the same length
        const minLength = Math.min(sortedValues.length, labels.length)
        if (minLength > 0) {
          setGraphData(sortedValues.slice(0, minLength))
          setGraphLabels(labels.slice(0, minLength))
        } else {
          setGraphData([])
          setGraphLabels([])
        }
      } else if (!loadingHistorical) {
        // Only clear if loading is complete and no data
        setGraphData([])
        setGraphLabels([])
      }
    } else {
      // When no time option is selected, use live data
      if (data.length > 0) {
        setGraphData(data)
        setGraphLabels(Array.from({ length: data.length }, (_, i) => `Sample ${i + 1}`))
      } else {
        setGraphData([])
        setGraphLabels([])
      }
    }
  }, [selectedTimeOption, historicalData, data, loadingHistorical])

  const handleSetHL = async () => {
    const value = parseFloat(tempHL)
    if (!isNaN(value) && value > levels.LL) {
      setLevels({ HL: value, LL: levels.LL })
      setIsEditingHL(false)
      
      // Save to database when HL changes
      if (data.length > 0) {
        const currentValue = data[data.length - 1]
        try {
          await saveLiveTrend(type, value, levels.LL, currentValue)
        } catch (error) {
          console.error('Failed to save HL change:', error)
        }
      }
    } else {
      alert('High Level must be greater than Low Level')
      setTempHL(levels.HL)
    }
  }

  const handleSetLL = async () => {
    const value = parseFloat(tempLL)
    if (!isNaN(value) && value < levels.HL) {
      setLevels({ HL: levels.HL, LL: value })
      setIsEditingLL(false)
      
      // Save to database when LL changes
      if (data.length > 0) {
        const currentValue = data[data.length - 1]
        try {
          await saveLiveTrend(type, levels.HL, value, currentValue)
        } catch (error) {
          console.error('Failed to save LL change:', error)
        }
      }
    } else {
      alert('Low Level must be less than High Level')
      setTempLL(levels.LL)
    }
  }

  // Ensure graphData and graphLabels are always arrays with matching lengths
  const safeGraphData = Array.isArray(graphData) ? graphData.filter(val => val !== null && val !== undefined && !isNaN(val)).map(val => {
    const num = typeof val === 'number' ? val : parseFloat(val)
    return isNaN(num) ? 0 : num
  }) : []
  
  const safeGraphLabels = Array.isArray(graphLabels) && graphLabels.length === safeGraphData.length 
    ? graphLabels 
    : safeGraphData.length > 0
      ? Array.from({ length: safeGraphData.length }, (_, i) => i.toString())
      : []

  // Ensure labels and data have matching lengths
  const finalLabels = safeGraphLabels.length === safeGraphData.length 
    ? safeGraphLabels 
    : safeGraphData.length > 0
      ? Array.from({ length: safeGraphData.length }, (_, i) => i.toString())
      : []
  
  const finalData = safeGraphData.map(val => {
    const num = typeof val === 'number' ? val : parseFloat(val)
    return isNaN(num) ? 0 : num
  })

  // Calculate dynamic Y-axis range based on data values
  const yAxisRange = useMemo(() => {
    if (finalData.length === 0) {
      return { min: 0, max: 100 }
    }

    // Include HL and LL in the range calculation
    const allValues = [...finalData, levels.HL, levels.LL]
    const overallMin = Math.min(...allValues)
    const overallMax = Math.max(...allValues)
    
    // Calculate range
    const range = overallMax - overallMin
    
    // If range is 0 (all values are the same), create a range around that value
    if (range === 0) {
      const center = overallMin
      return { min: Math.max(0, center - 10), max: center + 10 }
    }
    
    // Add 15% padding above and below
    const padding = range * 0.15
    
    let min = overallMin - padding
    let max = overallMax + padding
    
    // Ensure min is not negative if all values are positive
    if (min < 0 && overallMin >= 0) {
      min = Math.max(0, overallMin - padding)
    }
    
    // Round to nice numbers for better readability
    const roundToNiceNumber = (value, isMax) => {
      if (value === 0) return 0
      
      const absValue = Math.abs(value)
      const magnitude = Math.pow(10, Math.floor(Math.log10(absValue)))
      const normalized = value / magnitude
      let rounded
      
      if (isMax) {
        rounded = Math.ceil(normalized) * magnitude
      } else {
        rounded = Math.floor(normalized) * magnitude
      }
      
      // Handle very small numbers
      if (magnitude < 0.01) {
        if (isMax) {
          rounded = Math.ceil(value * 10) / 10
        } else {
          rounded = Math.floor(value * 10) / 10
        }
      }
      
      return rounded
    }
    
    // Round min down and max up to nice numbers
    min = roundToNiceNumber(min, false)
    max = roundToNiceNumber(max, true)
    
    // Ensure we have a minimum range (at least 10% of the max value or 10 units, whichever is smaller)
    const minRange = Math.max(10, overallMax * 0.1)
    if (max - min < minRange) {
      const center = (min + max) / 2
      min = center - minRange / 2
      max = center + minRange / 2
    }
    
    return { min, max }
  }, [finalData, levels.HL, levels.LL])

  const chartData = useMemo(() => ({
    labels: finalLabels,
    datasets: [
      {
        label: currentConfig.title,
        data: finalData,
        borderColor: currentConfig.color,
        backgroundColor: `${currentConfig.color}20`,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: currentConfig.color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: currentConfig.color,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        spanGaps: false,
        showLine: true,
      },
      {
        label: 'High Level (HL)',
        data: Array(finalData.length).fill(levels.HL),
        borderColor: '#dc2626',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [10, 5],
        pointRadius: 0,
        fill: false,
        spanGaps: false,
      },
      {
        label: 'Low Level (LL)',
        data: Array(finalData.length).fill(levels.LL),
        borderColor: '#ea580c',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [10, 5],
        pointRadius: 0,
        fill: false,
        spanGaps: false,
      }
    ]
  }), [finalLabels, finalData, levels.HL, levels.LL, currentConfig])

  const options = useMemo(() => ({
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
        type: 'category',
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
          text: selectedTimeOption ? 'Time' : 'Time (samples)',
          font: {
            size: 13,
            weight: 'bold'
          }
        }
      },
      y: {
        display: true,
        min: yAxisRange.min,
        max: yAxisRange.max,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          },
          maxTicksLimit: 10, // Limit number of ticks for cleaner display
          precision: 1
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
  }), [yAxisRange, selectedTimeOption, currentConfig])

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
            {!isEditingHL && (
              <button 
                className="edit-btn-hover" 
                onClick={() => setIsEditingHL(true)}
                title="Edit High Level"
              >
                <FaPencilAlt />
              </button>
            )}
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
                <span className="stat-value critical">{levels.HL}</span>
              )}
            </div>
          </div>

          <div className="stat-card stat-card-editable">
            {!isEditingLL && (
              <button 
                className="edit-btn-hover" 
                onClick={() => setIsEditingLL(true)}
                title="Edit Low Level"
              >
                <FaPencilAlt />
              </button>
            )}
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
                <span className="stat-value warning">{levels.LL}</span>
              )}
            </div>
          </div>

          <div className="time-scaling-wrapper">
            <div 
              className="stat-card time-scaling-card"
              onClick={() => setShowTimeOptions(!showTimeOptions)}
              style={{ cursor: 'pointer' }}
            >
              <h3 className="time-scaling-title">
                <span>Time</span>
                <span>Scaling</span>
              </h3>
            </div>
            <div className={`time-options-container ${showTimeOptions ? 'show' : 'hide'}`}>
              {['15 Mins.', '30 Mins.', '1 Hr.', '4 Hr.', '8 Hr.'].map((option, index) => {
                const minutesMap = {
                  '15 Mins.': 15,
                  '30 Mins.': 30,
                  '1 Hr.': 60,
                  '4 Hr.': 240,
                  '8 Hr.': 480
                }
                return (
                  <div
                    key={option}
                    className={`time-option-card ${showTimeOptions ? 'roll-in' : 'roll-out'}`}
                    style={{ animationDelay: `${index * 0.08}s` }}
                    onClick={async () => {
                      setSelectedTimeOption(option)
                      setShowTimeOptions(false)
                      setLoadingHistorical(true)
                      try {
                        // Get the last clear time for this parameter from localStorage
                        const clearTimeKey = `lastClearTime-${type}`
                        const lastClear = localStorage.getItem(clearTimeKey)
                        const afterTimestamp = lastClear || null
                        
                        const data = await getHistoricalTrends(type, minutesMap[option], afterTimestamp)
                        setHistoricalData(data)
                      } catch (error) {
                        console.error('Error fetching historical data:', error)
                        setHistoricalData([])
                      } finally {
                        setLoadingHistorical(false)
                      }
                    }}
                  >
                    {option}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      
      <div className="graph-container">
        {finalData.length > 0 ? (
          <Line 
            key={`${type}-${selectedTimeOption || 'live'}-${finalData.length}-${yAxisRange.min.toFixed(2)}-${yAxisRange.max.toFixed(2)}`}
            data={chartData} 
            options={options} 
            redraw={true}
            updateMode="active"
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#666',
            fontSize: '16px'
          }}>
            {selectedTimeOption && loadingHistorical 
              ? 'Loading historical data...' 
              : selectedTimeOption 
                ? 'No data available for the selected time period' 
                : 'Generating live data...'}
          </div>
        )}
      </div>

      {selectedTimeOption && (
        <div className="historical-data-section">
          <div className="historical-data-header">
            <h3 className="historical-data-title">
              {selectedTimeOption} Ago Data Records.
            </h3>
            <button
              className="clear-data-btn"
              onClick={async () => {
                if (window.confirm(`Are you sure you want to delete all data records for ${currentConfig.title}? This action cannot be undone.`)) {
                  try {
                    await deleteAllTrendsForParameter(type)
                    // Store the current timestamp as the last clear time
                    const clearTimeKey = `lastClearTime-${type}`
                    localStorage.setItem(clearTimeKey, new Date().toISOString())
                    setHistoricalData([])
                    setSelectedTimeOption(null)
                    setGraphData([])
                    setGraphLabels([])
                    alert('All data records deleted successfully')
                  } catch (error) {
                    console.error('Error deleting data:', error)
                    alert('Failed to delete data records. Please try again.')
                  }
                }
              }}
              title="Clear all data for this parameter"
            >
              Clear Data
            </button>
          </div>
          {loadingHistorical ? (
            <div className="historical-data-loading">Loading...</div>
          ) : historicalData.length > 0 ? (
            <div className="historical-data-table-container">
              <table className="historical-data-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>High Level</th>
                    <th>Low Level</th>
                    <th>Current Value</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalData.map((row, index) => (
                    <tr key={index}>
                      <td>{row.parameter}</td>
                      <td>{row.highLevel.toFixed(2)}</td>
                      <td>{row.lowLevel.toFixed(2)}</td>
                      <td>{row.currentValue.toFixed(2)}</td>
                      <td>{new Date(row.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="historical-data-empty">
              Data not found in the database
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LiveTrendsGraph