import { useState, useEffect } from 'react'
import { getLiveTrends, deleteAllTrendsForParameter } from '../services/liveTrendsApi'
import { FaTrash, FaFilter, FaDownload, FaCalendarAlt, FaClock, FaSearch } from 'react-icons/fa'
import './DataLogs.css'

const DataLogs = () => {
  const [allData, setAllData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedParameter, setSelectedParameter] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState({ hours: '', minutes: '', period: 'AM' })
  const [activeDateFilter, setActiveDateFilter] = useState('')
  const [activeTimeFilter, setActiveTimeFilter] = useState({ hours: '', minutes: '', period: 'AM' })
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' })

  const parameters = [
    { id: 'all', label: 'All Parameters' },
    { id: 'vibration', label: 'Vibration' },
    { id: 'temperature', label: 'Temperature' },
    { id: 'power-consumption', label: 'Power Consumption' },
    { id: 'belt-tension', label: 'Belt Tension' },
    { id: 'speed', label: 'Speed' },
    { id: 'torque', label: 'Torque' }
  ]

  // Fetch all data logs
  useEffect(() => {
    fetchDataLogs()
  }, [])

  const fetchDataLogs = async () => {
    try {
      setLoading(true)
      // Fetch all data (use -1 to indicate no limit)
      const data = await getLiveTrends(null, -1) // -1 means fetch all records
      setAllData(data)
      setFilteredData(data)
    } catch (error) {
      console.error('Error fetching data logs:', error)
      alert('Failed to fetch data logs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort data
  useEffect(() => {
    let filtered = [...allData]

    // Filter by parameter
    if (selectedParameter !== 'all') {
      filtered = filtered.filter(item => item.parameter === selectedParameter)
    }

    // Filter by date and time (use active filters)
    if (activeDateFilter || (activeTimeFilter.hours && activeTimeFilter.minutes)) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.timestamp)
        
        // Check if item date is valid
        if (isNaN(itemDate.getTime())) {
          return false
        }
        
        const itemDateStr = itemDate.toISOString().split('T')[0] // YYYY-MM-DD format
        
        let matchesDate = true
        let matchesTime = true
        
        // Filter by date
        if (activeDateFilter) {
          matchesDate = itemDateStr === activeDateFilter
        }
        
        // Filter by time
        if (activeTimeFilter.hours && activeTimeFilter.minutes) {
          try {
            // Parse hours (remove any leading zeros or whitespace)
            const hoursStr = activeTimeFilter.hours.toString().trim()
            let hour24 = parseInt(hoursStr)
            
            if (isNaN(hour24) || hour24 < 1 || hour24 > 12) {
              matchesTime = false
            } else {
              // Convert to 24-hour format
              if (activeTimeFilter.period === 'PM' && hour24 !== 12) {
                hour24 += 12
              } else if (activeTimeFilter.period === 'AM' && hour24 === 12) {
                hour24 = 0
              }
              
              // Parse minutes (handle both string and number, with or without padding)
              const minutesStr = activeTimeFilter.minutes.toString().trim()
              // Remove leading zeros but keep at least one digit
              const cleanMinutes = minutesStr.replace(/^0+/, '') || '0'
              const selectedMin = parseInt(cleanMinutes)
              
              if (isNaN(selectedMin) || selectedMin < 0 || selectedMin > 59) {
                matchesTime = false
              } else {
                // Compare with item time (use local time, not UTC)
                const itemHour = itemDate.getHours()
                const itemMin = itemDate.getMinutes()
                
                // Calculate total minutes for comparison
                const itemTotalMinutes = itemHour * 60 + itemMin
                const selectedTotalMinutes = hour24 * 60 + selectedMin
                
                // Allow ±30 minutes tolerance for time matching (wider range)
                const timeDiff = Math.abs(itemTotalMinutes - selectedTotalMinutes)
                matchesTime = timeDiff <= 30
              }
            }
          } catch (error) {
            console.error('Error filtering by time:', error)
            matchesTime = false
          }
        }
        
        return matchesDate && matchesTime
      })
    }

    // Sort data
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key]
      let bValue = b[sortConfig.key]

      if (sortConfig.key === 'timestamp') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      }

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredData(filtered)
  }, [allData, selectedParameter, activeDateFilter, activeTimeFilter, sortConfig])

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleSearch = () => {
    // Apply the selected date and time as active filters
    setActiveDateFilter(selectedDate)
    setActiveTimeFilter({ ...selectedTime })
  }

  const handleClearFilters = () => {
    setSelectedDate('')
    setSelectedTime({ hours: '', minutes: '', period: 'AM' })
    setActiveDateFilter('')
    setActiveTimeFilter({ hours: '', minutes: '', period: 'AM' })
  }

  const handleDeleteParameter = async (parameter) => {
    if (window.confirm(`Are you sure you want to delete all data records for ${parameter}? This action cannot be undone.`)) {
      try {
        await deleteAllTrendsForParameter(parameter)
        await fetchDataLogs() // Refresh data
        alert('Data deleted successfully')
      } catch (error) {
        console.error('Error deleting data:', error)
        alert('Failed to delete data. Please try again.')
      }
    }
  }

  const handleExportCSV = () => {
    const headers = ['Parameter', 'High Level', 'Low Level', 'Current Value', 'Timestamp']
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.parameter || '',
        item.highLevel || '',
        item.lowLevel || '',
        item.currentValue || '',
        new Date(item.timestamp).toLocaleString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `data-logs-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getParameterLabel = (param) => {
    const paramObj = parameters.find(p => p.id === param)
    return paramObj ? paramObj.label : param
  }

  return (
    <div className="data-logs-container">
      <div className="data-logs-header">
        <h1 className="data-logs-title">Data Logs</h1>
        <p className="data-logs-subtitle">View and manage all historical data records</p>
      </div>

      <div className="data-logs-controls">
        <div className="controls-left">
          <div className="filter-group">
            <FaFilter className="filter-icon" />
            <select
              className="parameter-filter"
              value={selectedParameter}
              onChange={(e) => setSelectedParameter(e.target.value)}
            >
              {parameters.map(param => (
                <option key={param.id} value={param.id}>
                  {param.label}
                </option>
              ))}
            </select>
          </div>

          <div className="date-time-group">
            <div className="date-picker-group">
              <FaCalendarAlt className="date-icon" />
              <input
                type="date"
                className="date-input"
                value={selectedDate}
                onChange={(e) => {
                  e.stopPropagation()
                  setSelectedDate(e.target.value)
                }}
                title="Select date to filter"
              />
            </div>
            <div className="time-picker-group">
              <FaClock className="time-icon" />
              <div className="time-inputs">
                <input
                  type="number"
                  className="time-hour-input"
                  placeholder="HH"
                  min="1"
                  max="12"
                  value={selectedTime.hours}
                  onChange={(e) => {
                    e.stopPropagation()
                    const value = e.target.value === '' ? '' : Math.min(12, Math.max(1, parseInt(e.target.value) || 1))
                    setSelectedTime(prev => ({ ...prev, hours: value.toString() }))
                  }}
                  title="Hour (1-12)"
                />
                <span className="time-separator">:</span>
                <input
                  type="number"
                  className="time-minute-input"
                  placeholder="MM"
                  min="0"
                  max="59"
                  value={selectedTime.minutes}
                  onChange={(e) => {
                    e.stopPropagation()
                    let value = e.target.value
                    if (value === '') {
                      setSelectedTime(prev => ({ ...prev, minutes: '' }))
                    } else {
                      const numValue = Math.min(59, Math.max(0, parseInt(value) || 0))
                      setSelectedTime(prev => ({ ...prev, minutes: numValue.toString().padStart(2, '0') }))
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value.length === 1) {
                      setSelectedTime(prev => ({ ...prev, minutes: prev.minutes.padStart(2, '0') }))
                    }
                  }}
                  title="Minutes (0-59)"
                />
                <select
                  className="time-period-select"
                  value={selectedTime.period}
                  onChange={(e) => {
                    e.stopPropagation()
                    setSelectedTime(prev => ({ ...prev, period: e.target.value }))
                  }}
                  title="AM/PM"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <button
              className="search-btn"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleSearch()
              }}
              type="button"
              title="Search for data at selected date/time"
              disabled={!selectedDate && !(selectedTime.hours && selectedTime.minutes)}
            >
              <FaSearch />
              Search
            </button>
            {(activeDateFilter || (activeTimeFilter.hours && activeTimeFilter.minutes)) && (
              <button
                className="clear-filter-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  handleClearFilters()
                }}
                type="button"
                title="Clear all filters"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="controls-right">
          <button 
            className="export-btn" 
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleExportCSV()
            }}
            type="button"
          >
            <FaDownload />
            Export CSV
          </button>
        </div>
      </div>

      <div className="data-logs-table-container">
        {loading ? (
          <div className="loading-message">Loading data logs...</div>
        ) : filteredData.length === 0 ? (
          <div className="empty-message">
            {allData.length === 0 
              ? 'No data logs found in the database.' 
              : (
                <div>
                  <p>No data matches your filter criteria.</p>
                  {(selectedDate || (selectedTime.hours && selectedTime.minutes)) && (
                    <p className="filter-info">
                      Active filters:{' '}
                      {activeDateFilter && `Date: ${activeDateFilter}`}
                      {activeDateFilter && (activeTimeFilter.hours && activeTimeFilter.minutes) && ' | '}
                      {(activeTimeFilter.hours && activeTimeFilter.minutes) && 
                        `Time: ${activeTimeFilter.hours}:${activeTimeFilter.minutes} ${activeTimeFilter.period}`}
                    </p>
                  )}
                  <p className="filter-hint">Select a date/time and click Search to filter data, or clear filters to see all data.</p>
                </div>
              )}
          </div>
        ) : (
          <>
            <div className="table-info">
              <span>Showing {filteredData.length} of {allData.length} records</span>
              {selectedParameter !== 'all' && (
                <button
                  className="delete-parameter-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleDeleteParameter(selectedParameter)
                  }}
                  type="button"
                  title={`Delete all ${getParameterLabel(selectedParameter)} records`}
                >
                  <FaTrash />
                  Delete All {getParameterLabel(selectedParameter)} Data
                </button>
              )}
            </div>

            <table className="data-logs-table">
              <thead>
                <tr>
                  <th 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSort('parameter')
                    }} 
                    className="sortable"
                  >
                    Parameter
                    {sortConfig.key === 'parameter' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSort('highLevel')
                    }} 
                    className="sortable"
                  >
                    High Level (HL)
                    {sortConfig.key === 'highLevel' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSort('lowLevel')
                    }} 
                    className="sortable"
                  >
                    Low Level (LL)
                    {sortConfig.key === 'lowLevel' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSort('currentValue')
                    }} 
                    className="sortable"
                  >
                    Current Value
                    {sortConfig.key === 'currentValue' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSort('timestamp')
                    }} 
                    className="sortable"
                  >
                    Timestamp
                    {sortConfig.key === 'timestamp' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => {
                  const currentValue = parseFloat(row.currentValue || 0)
                  const highLevel = parseFloat(row.highLevel || 0)
                  const lowLevel = parseFloat(row.lowLevel || 0)
                  
                  // Determine status: above high level = critical (red), near high level (80-100%) = warning (orange), else normal (no highlight)
                  let status = 'normal'
                  if (currentValue > highLevel) {
                    status = 'critical'
                  } else if (highLevel > 0 && currentValue >= highLevel * 0.8) {
                    // Near high level: within 80-100% of high level
                    status = 'warning'
                  }
                  
                  return (
                    <tr key={index} className={status !== 'normal' ? `data-row ${status}` : 'data-row'}>
                      <td className="parameter-cell">
                        <span className="parameter-badge">{getParameterLabel(row.parameter)}</span>
                      </td>
                      <td>{highLevel.toFixed(2)}</td>
                      <td>{lowLevel.toFixed(2)}</td>
                      <td className="value-cell">
                        <span className={status !== 'normal' ? `value-badge ${status}` : ''}>
                          {currentValue.toFixed(2)}
                        </span>
                      </td>
                      <td>{new Date(row.timestamp).toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${status}`}>
                          {status === 'critical' ? 'Critical' : 
                           status === 'warning' ? 'Warning' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}

export default DataLogs
