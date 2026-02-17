import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { getHealthIndex } from '../services/healthIndexApi'
import './Page.css'
import './HealthIndexing.css'

export default function HealthIndexing() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getHealthIndex()
        setData(res)
        setError(null)
      } catch (err) {
        setError(err.message || 'Failed to load health index')
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  const getMhiColor = (mhi) => {
    if (mhi == null) return '#6b7280'
    if (mhi >= 0.8) return '#10b981'
    if (mhi >= 0.5) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="page-container health-indexing-page">
      <div className="health-indexing-container">
        <h1 className="health-indexing-title">
          <Heart size={28} className="health-indexing-title-icon" />
          Health Indexing
        </h1>
        {loading && <p className="health-indexing-loading">Loading…</p>}
        {error && <p className="health-indexing-error">{error}</p>}
        {!loading && !error && data && (
          <div className="health-indexing-card">
            <div className="health-indexing-mhi-row">
              <span className="health-indexing-mhi-label">MHI (Motor Health Index)</span>
              <span
                className="health-indexing-mhi-value"
                style={{ color: getMhiColor(data.mhi) }}
              >
                {data.mhi != null ? Number(data.mhi).toFixed(2) : '—'}
              </span>
            </div>
            {data.updatedAt && (
              <p className="health-indexing-updated">
                Last updated: {new Date(data.updatedAt).toLocaleString()}
              </p>
            )}
            {data.fault != null && String(data.fault).trim() !== '' && (
              <div className="health-indexing-fault">
                <span className="health-indexing-fault-label">Current fault:</span>
                <span className="health-indexing-fault-value">{data.fault}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
