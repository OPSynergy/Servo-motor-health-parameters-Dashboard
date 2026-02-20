import { useState, useEffect, useRef } from 'react'
import { getLiveTrends, deleteAllTrendsForParameter } from '../services/liveTrendsApi'
import { FaTrash, FaDownload, FaCalendarAlt, FaClock, FaSearch } from 'react-icons/fa'
import './DataLogs.css'

// One row per MQTT message: { id, torque, speed, power, vibration, temperature, belt, mhi, fault, timestamp }
const DATA_LOG_COLUMNS = [
  { key: 'timestamp', label: 'Timestamp', type: 'date' },
  { key: 'torque', label: 'Torque', type: 'number' },
  { key: 'speed', label: 'Speed', type: 'number' },
  { key: 'power', label: 'Power', type: 'number' },
  { key: 'vibration', label: 'Vibration', type: 'number' },
  { key: 'temperature', label: 'Temperature', type: 'number' },
  { key: 'belt', label: 'Belt', type: 'number' },
  { key: 'mhi', label: 'MHI', type: 'number' },
  { key: 'fault', label: 'Fault', type: 'string' }
]

const DataLogs = () => {
  const [allData, setAllData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState({ hours: '', minutes: '', period: 'AM' })
  const [activeDateFilter, setActiveDateFilter] = useState('')
  const [activeTimeFilter, setActiveTimeFilter] = useState({ hours: '', minutes: '', period: 'AM' })
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' })
  const initialLoadRef = useRef(true)

  // Fetch data logs on mount and refresh every 4s so new MQTT data appears (smooth in-place update, no loading flash)
  useEffect(() => {
    fetchDataLogs()
    const interval = setInterval(fetchDataLogs, 4000)
    return () => clearInterval(interval)
  }, [])

  const fetchDataLogs = async () => {
    const isInitial = initialLoadRef.current
    if (isInitial) {
      initialLoadRef.current = false
      setLoading(true)
    }
    try {
      const data = await getLiveTrends(null, -1)
      setAllData(data)
      setFilteredData(data)
    } catch (error) {
      console.error('Error fetching data logs:', error)
      if (isInitial) alert('Failed to fetch data logs. Please try again.')
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  // Filter and sort data
  useEffect(() => {
    let filtered = [...allData]

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
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]
      if (sortConfig.key === 'timestamp' || sortConfig.key === 'fault') {
        aVal = sortConfig.key === 'timestamp' ? new Date(aVal).getTime() : (aVal || '')
        bVal = sortConfig.key === 'timestamp' ? new Date(bVal).getTime() : (bVal || '')
      } else {
        aVal = parseFloat(aVal) || 0
        bVal = parseFloat(bVal) || 0
      }
      if (sortConfig.direction === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
    })

    setFilteredData(filtered)
  }, [allData, activeDateFilter, activeTimeFilter, sortConfig])

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

  const handleDeleteAll = async () => {
    if (window.confirm('Delete all data from live trends? This cannot be undone.')) {
      try {
        await deleteAllTrendsForParameter('vibration') // backend clears entire table
        await fetchDataLogs()
        alert('All data deleted successfully')
      } catch (error) {
        console.error('Error deleting data:', error)
        alert('Failed to delete data. Please try again.')
      }
    }
  }

  const handleExportCSV = () => {
    const headers = DATA_LOG_COLUMNS.map(c => c.label)
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item =>
        DATA_LOG_COLUMNS.map(col => {
          const v = item[col.key]
          if (col.type === 'date') return v ? new Date(v).toLocaleString() : ''
          return v != null && v !== '' ? v : ''
        }).join(','))
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

  return (
    <div className="data-logs-container">
      <div className="data-logs-header">
        <h1 className="data-logs-title">Data Logs</h1>
        <p className="data-logs-subtitle">View and manage all historical data records</p>
      </div>

      <div className="data-logs-controls">
        <div className="controls-left">
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
              <button
                className="delete-parameter-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  handleDeleteAll()
                }}
                type="button"
                title="Delete all live trends data"
              >
                <FaTrash />
                Delete All Data
              </button>
            </div>

            <table className="data-logs-table">
              <thead>
                <tr>
                  {DATA_LOG_COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSort(col.key)
                      }}
                      className="sortable"
                    >
                      {col.label}
                      {sortConfig.key === col.key && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                    <tr key={row.id ?? index} className="data-row">
                      {DATA_LOG_COLUMNS.map(col => {
                        const v = row[col.key]
                        if (col.type === 'date') {
                          return (
                            <td key={col.key}>
                              {v ? new Date(v).toLocaleString() : '—'}
                            </td>
                          )
                        }
                        if (col.type === 'number') {
                          const num = parseFloat(v)
                          const display = Number.isNaN(num) ? '—' : num.toFixed(2)
                          return <td key={col.key} className="value-cell">{display}</td>
                        }
                        return <td key={col.key}>{v != null && v !== '' ? String(v) : '—'}</td>
                      })}
                    </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}

export default DataLogs
