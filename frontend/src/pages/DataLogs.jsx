import { useState, useEffect } from 'react'
import { getLiveTrends, deleteAllTrendsForParameter } from '../services/liveTrendsApi'
import { FaTrash, FaFilter, FaDownload } from 'react-icons/fa'
import './DataLogs.css'

const DataLogs = () => {
  const [allData, setAllData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedParameter, setSelectedParameter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' })

  const parameters = [
    { id: 'all', label: 'All Parameters' },
    { id: 'vibration', label: 'Vibration' },
    { id: 'temperature', label: 'Temperature' },
    { id: 'current-consumption', label: 'Current Consumption' },
    { id: 'belt-tension', label: 'Belt Tension' }
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

    // Filter by search term (search in timestamp, parameter, or values)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item => {
        const timestamp = new Date(item.timestamp).toLocaleString().toLowerCase()
        const parameter = item.parameter?.toLowerCase() || ''
        const currentValue = item.currentValue?.toString() || ''
        const highLevel = item.highLevel?.toString() || ''
        const lowLevel = item.lowLevel?.toString() || ''
        
        return timestamp.includes(term) || 
               parameter.includes(term) || 
               currentValue.includes(term) ||
               highLevel.includes(term) ||
               lowLevel.includes(term)
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
  }, [allData, selectedParameter, searchTerm, sortConfig])

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
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

          <div className="search-group">
            <input
              type="text"
              className="search-input"
              placeholder="Search by timestamp, parameter, or value..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
              : 'No data matches your filter criteria.'}
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
                  const status = row.currentValue > row.highLevel ? 'critical' : 
                                row.currentValue < row.lowLevel ? 'warning' : 'normal'
                  
                  return (
                    <tr key={index} className={`data-row ${status}`}>
                      <td className="parameter-cell">
                        <span className="parameter-badge">{getParameterLabel(row.parameter)}</span>
                      </td>
                      <td>{parseFloat(row.highLevel || 0).toFixed(2)}</td>
                      <td>{parseFloat(row.lowLevel || 0).toFixed(2)}</td>
                      <td className="value-cell">
                        <span className={`value-badge ${status}`}>
                          {parseFloat(row.currentValue || 0).toFixed(2)}
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
