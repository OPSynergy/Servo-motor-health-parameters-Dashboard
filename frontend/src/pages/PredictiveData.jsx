import { useState, useEffect, useMemo } from 'react'
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
import { getPredictiveData } from '../services/predictiveDataApi'
import './Page.css'
import './PredictiveData.css'

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

const SERIES_COLORS = ['#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#65a30d']

function getNumericKeys(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return []
  const keys = new Set()
  const skip = new Set(['timestamp', 'iso'])
  rows.forEach((row) => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => {
        if (skip.has(k)) return
        const v = row[k]
        if (typeof v === 'number' && !Number.isNaN(v)) keys.add(k)
        if (typeof v === 'string' && !Number.isNaN(parseFloat(v))) keys.add(k)
      })
    }
  })
  return Array.from(keys)
}

export default function PredictiveData() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getPredictiveData(400)
        setRows(Array.isArray(data) ? data : [])
        setError(null)
      } catch (err) {
        setError(err.message || 'Failed to load predictive data')
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 1500)
    return () => clearInterval(interval)
  }, [])

  const { chartData, options } = useMemo(() => {
    const numericKeys = getNumericKeys(rows)
    const labels = rows.map((r) => r.timestamp || r.iso || '')
    const datasets = numericKeys.map((key, i) => {
      const color = SERIES_COLORS[i % SERIES_COLORS.length]
      const values = rows.map((r) => {
        const v = r[key]
        return typeof v === 'number' ? v : parseFloat(v)
      })
      return {
        label: key,
        data: values,
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: false,
        tension: 0.2,
        pointRadius: 1,
        pointHoverRadius: 4
      }
    })

    return {
      chartData: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Predictive Data (plant/line1/servo01/predictive_data)' }
        },
        scales: {
          x: {
            display: true,
            title: { display: true, text: 'Time' },
            ticks: { maxTicksLimit: 12, maxRotation: 45 }
          },
          y: {
            display: true,
            type: 'linear',
            title: { display: true, text: 'Value' }
          }
        }
      }
    }
  }, [rows])

  return (
    <div className="page-container predictive-data-page">
      <div className="predictive-data-container">
        <h1 className="predictive-data-title">Predictive Data (Real-Time)</h1>
        <p className="predictive-data-subtitle">Topic: plant/line1/servo01/predictive_data · Broker: 192.168.137.1</p>
        {loading && rows.length === 0 && <p className="predictive-data-loading">Connecting to MQTT…</p>}
        {error && <p className="predictive-data-error">{error}</p>}
        <div className="predictive-data-chart-wrap">
          {chartData.datasets.length > 0 ? (
            <Line data={chartData} options={options} />
          ) : (
            <p className="predictive-data-empty">No numeric data yet. Publish to plant/line1/servo01/predictive_data to see graphs.</p>
          )}
        </div>
      </div>
    </div>
  )
}
