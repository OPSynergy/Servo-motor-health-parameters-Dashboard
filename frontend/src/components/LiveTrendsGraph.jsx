import { useState, useEffect, useMemo, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import { FaPencilAlt, FaSearch, FaTimes } from 'react-icons/fa'
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
import zoomPlugin from 'chartjs-plugin-zoom'
import { saveLiveTrend, getHistoricalTrends, getLiveTrends, deleteAllTrendsForParameter } from '../services/liveTrendsApi'
import { getHealthIndex } from '../services/healthIndexApi'
import './LiveTrendsGraph.css'

ChartJS.register(
  CategoryScale, 
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
)

const LiveTrendsGraph = ({ type }) => {
  const chartRef = useRef(null)
  
  // Initial configuration for colors, titles, and units
  const config = {
    vibration: {
      title: 'Vibration Analysis',
      unit: 'mm/s²',
      color: '#3b82f6',
      defaultHL: 80,
      defaultLL: 30
    },
    temperature: {
      title: 'Temperature Monitoring',
      unit: '°C',
      color: '#ef4444',
      defaultHL: 85,
      defaultLL: 35
    },
    'power-consumption': {
      title: 'Power Consumption',
      unit: 'Watts',
      color: '#10b981',
      defaultHL: 75,
      defaultLL: 25
    },
    'belt-tension': {
      title: 'Belt Tension',
      unit: 'Newton',
      color: '#f59e0b',
      defaultHL: 90,
      defaultLL: 40
    },
    speed: {
      title: 'Speed',
      unit: 'RPM',
      color: '#8b5cf6',
      defaultHL: 95,
      defaultLL: 20
    },
    torque: {
      title: 'Torque',
      unit: '%',
      color: '#06b6d4',
      defaultHL: 90,
      defaultLL: 25
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
  const [chartKey, setChartKey] = useState(0)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

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

  // Live MQTT state from backend (last received message) – used for real-time Current Value
  const [mqttLive, setMqttLive] = useState(null)
  useEffect(() => {
    const fetchMqtt = async () => {
      try {
        const state = await getHealthIndex()
        setMqttLive(state)
      } catch {
        setMqttLive(null)
      }
    }
    fetchMqtt()
    const interval = setInterval(fetchMqtt, 500)
    return () => clearInterval(interval)
  }, [])

  // Live data from live_trends (same as Data Logs) – poll when in live mode (no time option, no time window)
  const [liveApiData, setLiveApiData] = useState([])
  useEffect(() => {
    if (selectedTimeOption || startTime || endTime) return
    const fetchLive = async () => {
      try {
        const result = await getLiveTrends(type, 500)
        setLiveApiData(Array.isArray(result) ? result : [])
      } catch {
        setLiveApiData([])
      }
    }
    fetchLive()
    const interval = setInterval(fetchLive, 2000)
    return () => clearInterval(interval)
  }, [type, selectedTimeOption, startTime, endTime])

  // Derive data array from live API for backwards compatibility (current value, etc.)
  useEffect(() => {
    if (selectedTimeOption || startTime || endTime) return
    if (liveApiData.length === 0) {
      setData([])
      return
    }
    const values = liveApiData.map((item) => {
      let v = item.currentValue !== undefined ? item.currentValue : item.current_value
      if (typeof v === 'string') v = parseFloat(v)
      return typeof v === 'number' && !isNaN(v) ? v : 0
    })
    setData(values)
  }, [liveApiData, selectedTimeOption, startTime, endTime])

  // Update graph data based on selected time option or live data, with optional time window filtering
  useEffect(() => {
    let sourceData = []
    let useHistorical = false
    
    if (selectedTimeOption) {
      // When time option is selected, use historical data
      useHistorical = true
      sourceData = historicalData
    } else if (startTime || endTime) {
      // When time window is set but no time option, use historical data if available
      if (historicalData.length > 0) {
        useHistorical = true
        sourceData = historicalData
      } else if (loadingHistorical) {
        // If loading, don't process yet - wait for data
        return
      } else {
        // If time window is set but no historical data and not loading, show live data as fallback
        if (data.length > 0) {
          setGraphData(data)
          setGraphLabels(Array.from({ length: data.length }, (_, i) => `Sample ${i + 1}`))
          return
        }
        // If no data at all, clear
        setGraphData([])
        setGraphLabels([])
        return
      }
    } else {
      // When no time option is selected and no time window, use live data from MQTT (API)
      if (liveApiData.length > 0) {
        const sorted = [...liveApiData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        const sortedValues = []
        const labels = []
        sorted.forEach((item) => {
          let value = item.currentValue !== undefined ? item.currentValue : item.current_value
          if (typeof value === 'string') value = parseFloat(value)
          if (typeof value === 'number' && !isNaN(value)) {
            sortedValues.push(value)
            const date = new Date(item.timestamp)
            labels.push(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`)
          }
        })
        const minLen = Math.min(sortedValues.length, labels.length)
        if (minLen > 0) {
          setGraphData(sortedValues.slice(0, minLen))
          setGraphLabels(labels.slice(0, minLen))
        } else {
          setGraphData([])
          setGraphLabels([])
        }
        return
      }
      setGraphData([])
      setGraphLabels([])
      return
    }
    
    // Filter by time window if startTime or endTime is set
    let filteredData = [...sourceData]
    
    if (startTime || endTime) {
      // Get today's date
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      
      // Combine today's date with selected time
      const startDateTime = startTime ? `${todayStr}T${startTime}:00` : null
      const endDateTime = endTime ? `${todayStr}T${endTime}:00` : null
      
      const startDate = startDateTime ? new Date(startDateTime) : null
      const endDate = endDateTime ? new Date(endDateTime) : null
      
      filteredData = sourceData.filter(item => {
        const itemDate = new Date(item.timestamp)
        
        // Extract time components from item date
        const itemHours = itemDate.getHours()
        const itemMinutes = itemDate.getMinutes()
        const itemSeconds = itemDate.getSeconds()
        const itemTimeInMinutes = itemHours * 60 + itemMinutes + itemSeconds / 60
        
        // Extract time components from start/end times
        if (startDate) {
          const startHours = startDate.getHours()
          const startMinutes = startDate.getMinutes()
          const startTimeInMinutes = startHours * 60 + startMinutes
          if (itemTimeInMinutes < startTimeInMinutes) return false
        }
        
        if (endDate) {
          const endHours = endDate.getHours()
          const endMinutes = endDate.getMinutes()
          const endTimeInMinutes = endHours * 60 + endMinutes
          if (itemTimeInMinutes > endTimeInMinutes) return false
        }
        
        return true
      })
    }
    
    if (filteredData.length > 0) {
      // Sort by timestamp to ensure chronological order
      const sortedData = [...filteredData].sort((a, b) => {
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
    } else if (useHistorical && !loadingHistorical) {
      // If we're using historical data but have no results after filtering, clear
      setGraphData([])
      setGraphLabels([])
    }
    // If useHistorical is false, live data will be handled in the else block above
  }, [selectedTimeOption, historicalData, data, liveApiData, loadingHistorical, startTime, endTime])

  // Fetch all historical data when time window is set but no time option is selected
  useEffect(() => {
    if ((startTime || endTime) && !selectedTimeOption && historicalData.length === 0 && !loadingHistorical) {
      const fetchAllData = async () => {
        setLoadingHistorical(true)
        try {
          const clearTimeKey = `lastClearTime-${type}`
          const lastClear = localStorage.getItem(clearTimeKey)
          const afterTimestamp = lastClear || null
          // Fetch last 24 hours of data for time window filtering
          const data = await getHistoricalTrends(type, 1440, afterTimestamp) // 24 hours = 1440 minutes
          setHistoricalData(data)
        } catch (error) {
          console.error('Error fetching data for time window:', error)
        } finally {
          setLoadingHistorical(false)
        }
      }
      fetchAllData()
    }
  }, [startTime, endTime, selectedTimeOption, type])

  // Update chart key when graphData changes for historical data to force re-render
  useEffect(() => {
    if ((selectedTimeOption || startTime || endTime) && graphData.length > 0 && !loadingHistorical) {
      // Use a small delay to ensure graphData has been fully processed
      const timeoutId = setTimeout(() => {
        setChartKey(prev => prev + 1)
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [graphData.length, selectedTimeOption, loadingHistorical, historicalData.length, startTime, endTime])

  const handleSetHL = async () => {
    const value = parseFloat(tempHL)
    if (!isNaN(value) && value > levels.LL) {
      setLevels({ HL: value, LL: levels.LL })
      setIsEditingHL(false)
      
      // Save to database when HL changes
      if (data.length > 0) {
        const currentValue = data[0]
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
        const currentValue = data[0]
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
      return { min: 0, max: 50 }
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
      return { min: Math.max(0, center - 10), max: Math.min(center + 10, 50) }
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
    
    max = Math.min(max, 50)
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
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1
          },
          pinch: {
            enabled: true
          },
          mode: 'xy',
          drag: {
            enabled: true,
            modifierKey: 'ctrl',
            threshold: 10
          }
        },
        pan: {
          enabled: true,
          modifierKey: null,
          threshold: 10,
          mode: 'xy'
        },
        limits: {
          x: {
            min: 'original',
            max: 'original'
          },
          y: {
            min: 'original',
            max: 'original'
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

  // Prefer real-time MQTT state for Current Value so it matches terminal; fallback to latest from live_trends
  const mqttKey = type === 'power-consumption' ? 'unit_power' : type === 'belt-tension' ? 'belt_tension' : type
  const mqttVal = mqttLive != null && mqttLive[mqttKey] != null ? Number(mqttLive[mqttKey]) : null
  const currentValue = mqttVal !== null && !Number.isNaN(mqttVal) ? mqttVal : (data.length > 0 ? data[0] : 0)
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
              {currentConfig.unit && (
                <span className="stat-value-unit"> {currentConfig.unit}</span>
              )}
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
              onClick={() => {
                if (selectedTimeOption) {
                  // If a time option is selected, clicking clears it and returns to live mode
                  setSelectedTimeOption(null)
                  setHistoricalData([])
                  setGraphData([])
                  setGraphLabels([])
                  setChartKey(prev => prev + 1)
                } else {
                  // Otherwise, toggle the time options menu
                  setShowTimeOptions(!showTimeOptions)
                }
              }}
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
                      // Clear previous data and reset graph
                      setGraphData([])
                      setGraphLabels([])
                      setSelectedTimeOption(option)
                      setShowTimeOptions(false)
                      setLoadingHistorical(true)
                      setChartKey(prev => prev + 1) // Force chart re-render
                      
                      try {
                        // Get the last clear time for this parameter from localStorage
                        const clearTimeKey = `lastClearTime-${type}`
                        const lastClear = localStorage.getItem(clearTimeKey)
                        const afterTimestamp = lastClear || null
                        
                        console.log(`[Frontend] Fetching historical data for ${option} (${minutesMap[option]} minutes), parameter: ${type}, afterTimestamp: ${afterTimestamp}`)
                        
                        // Fetch historical data for the selected time period
                        const data = await getHistoricalTrends(type, minutesMap[option], afterTimestamp)
                        
                        console.log(`[Frontend] Received ${data.length} records from backend`)
                        if (data.length > 0) {
                          console.log(`[Frontend] First record:`, data[0])
                          console.log(`[Frontend] Last record:`, data[data.length - 1])
                        }
                        
                        setHistoricalData(data)
                        // Force chart re-render after data is loaded
                        setChartKey(prev => prev + 1)
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
      
      <div className="graph-container" style={{ position: 'relative' }}>
        {finalData.length > 0 && (
          <button
            onClick={() => {
              if (chartRef.current) {
                chartRef.current.resetZoom()
              }
            }}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 10,
              padding: '8px 16px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#5568d3'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#667eea'
            }}
            title="Reset Zoom"
          >
            Reset Zoom
          </button>
        )}
        {finalData.length > 0 ? (
          <Line 
            ref={chartRef}
            key={`${type}-${selectedTimeOption || 'live'}-${finalData.length}-${graphData.length}-${yAxisRange.min.toFixed(2)}-${yAxisRange.max.toFixed(2)}-${chartKey}`}
            data={chartData} 
            options={options} 
            redraw={true}
            updateMode="default"
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
            {loadingHistorical 
              ? 'Loading historical data...' 
              : (selectedTimeOption || (startTime || endTime))
                ? 'No data available for the selected time period' 
                : 'Waiting for data… Plot shows the same data as Data Logs (updates every 2 s).'}
          </div>
        )}
      </div>

      {/* Time Window Filter */}
      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: '#111827',
          textAlign: 'center'
        }}>
          Time Window Filter
        </h3>
        <div style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
            <label style={{
              fontSize: '13px',
              fontWeight: '500',
              color: '#6b7280'
            }}>
              Start Time (Today)
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                backgroundColor: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
            <label style={{
              fontSize: '13px',
              fontWeight: '500',
              color: '#6b7280'
            }}>
              End Time (Today)
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                backgroundColor: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
            <button
              onClick={async () => {
                // If time window is set but no historical data, fetch it
                if ((startTime || endTime) && historicalData.length === 0 && !loadingHistorical) {
                  setLoadingHistorical(true)
                  try {
                    const clearTimeKey = `lastClearTime-${type}`
                    const lastClear = localStorage.getItem(clearTimeKey)
                    const afterTimestamp = lastClear || null
                    // Fetch last 24 hours of data for time window filtering
                    const data = await getHistoricalTrends(type, 1440, afterTimestamp) // 24 hours = 1440 minutes
                    setHistoricalData(data)
                  } catch (error) {
                    console.error('Error fetching data for time window:', error)
                  } finally {
                    setLoadingHistorical(false)
                  }
                }
                // Force chart update
                setChartKey(prev => prev + 1)
              }}
              disabled={!startTime && !endTime}
              title="Search"
              style={{
                padding: '10px',
                backgroundColor: (!startTime && !endTime) ? '#9ca3af' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: (!startTime && !endTime) ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                height: '42px',
                width: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (!startTime && !endTime) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (startTime || endTime) {
                  e.target.style.backgroundColor = '#5568d3'
                }
              }}
              onMouseLeave={(e) => {
                if (startTime || endTime) {
                  e.target.style.backgroundColor = '#667eea'
                }
              }}
            >
              <FaSearch />
            </button>
            <button
              onClick={() => {
                setStartTime('')
                setEndTime('')
                setChartKey(prev => prev + 1)
              }}
              title="Clear Filter"
              style={{
                padding: '10px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                height: '42px',
                width: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              <FaTimes />
            </button>
          </div>
        </div>
        {(startTime || endTime) && (
          <div style={{
            marginTop: '12px',
            padding: '10px',
            backgroundColor: '#dbeafe',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1e40af',
            textAlign: 'center'
          }}>
            Showing data from {startTime ? `${new Date().toLocaleDateString()} ${startTime}` : 'beginning'} to {endTime ? `${new Date().toLocaleDateString()} ${endTime}` : 'end'}
          </div>
        )}
      </div>

    </div>
  )
}

export default LiveTrendsGraph