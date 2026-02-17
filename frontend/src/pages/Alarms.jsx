import { useState, useEffect } from 'react'
import { getAlarms } from '../services/alarmsApi'
import './Page.css'
import './Alarms.css'

const Alarms = () => {
  const [alarms, setAlarms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAlarms = async () => {
      try {
        setLoading(true)
        const data = await getAlarms()
        setAlarms(data)
        setError(null)
      } catch (err) {
        setError(err.message || 'Failed to load alarms')
        setAlarms([])
      } finally {
        setLoading(false)
      }
    }
    fetchAlarms()
  }, [])

  const formatDate = (value) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString()
    } catch {
      return value
    }
  }

  return (
    <div
      className="page-container alarms-page alarms-page-with-table"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#ffffff',
        zIndex: 1,
        pointerEvents: 'auto'
      }}
    >
      <div className="alarms-container">
        <h1 className="alarms-title">Alarms</h1>
        {loading && <p className="alarms-loading">Loading alarms...</p>}
        {error && <p className="alarms-error">{error}</p>}
        {!loading && !error && (
          <div className="alarms-table-container">
            <table className="alarms-table">
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Resolved At</th>
                </tr>
              </thead>
              <tbody>
                {alarms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="alarms-empty">No alarms</td>
                  </tr>
                ) : (
                  alarms.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.type}</td>
                      <td>{row.message}</td>
                      <td>{row.status}</td>
                      <td>{formatDate(row.createdAt)}</td>
                      <td>{formatDate(row.resolvedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Alarms
