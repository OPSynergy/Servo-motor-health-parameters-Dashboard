import { useState, useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getAlarms } from '../services/alarmsApi'
import { createPortal } from 'react-dom'
import './CriticalSpeedDropPopup.css'

const FAULT_MESSAGE = 'CRITICAL_SPEED_DROP'
const POLL_INTERVAL_MS = 3000

export default function CriticalSpeedDropPopup() {
  const [visible, setVisible] = useState(false)
  const [alarm, setAlarm] = useState(null)
  const lastShownIdRef = useRef(null)
  const maxAlarmIdAtLoadRef = useRef(null)

  useEffect(() => {
    const checkAlarms = async () => {
      try {
        const list = await getAlarms()
        const maxId = list.length > 0 ? Math.max(...list.map((a) => a.id || 0)) : 0
        if (maxAlarmIdAtLoadRef.current === null) {
          maxAlarmIdAtLoadRef.current = maxId
          return
        }
        const criticalSpeedDrop = list.find(
          (a) => a.message && String(a.message).trim().toUpperCase() === FAULT_MESSAGE
        )
        const isNewSinceLoad = criticalSpeedDrop && criticalSpeedDrop.id > maxAlarmIdAtLoadRef.current
        if (isNewSinceLoad && criticalSpeedDrop.id !== lastShownIdRef.current) {
          setAlarm(criticalSpeedDrop)
          setVisible(true)
          lastShownIdRef.current = criticalSpeedDrop.id
        }
      } catch {
        // ignore
      }
    }
    const intervalId = setInterval(checkAlarms, POLL_INTERVAL_MS)
    checkAlarms()
    return () => clearInterval(intervalId)
  }, [])

  const handleClose = () => {
    setVisible(false)
  }

  if (!visible) return null

  return createPortal(
    <div className="critical-speed-drop-overlay" onClick={handleClose} role="presentation">
      <div
        className="critical-speed-drop-card"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="critical-speed-drop-title"
        aria-modal="true"
      >
        <div className="critical-speed-drop-header">
          <span className="critical-speed-drop-icon" aria-hidden>
            <AlertTriangle size={32} strokeWidth={2} />
          </span>
          <h2 id="critical-speed-drop-title" className="critical-speed-drop-title">
            CRITICAL SPEED DROP
          </h2>
        </div>
        <p className="critical-speed-drop-message">
          A critical speed drop has been detected from the motor. This event has been logged to the Alarms.
        </p>
        {alarm?.topic && (
          <p className="critical-speed-drop-topic" aria-label="Alarm topic">
            <strong>Topic:</strong> {alarm.topic}
          </p>
        )}
        <div className="critical-speed-drop-actions">
          <button type="button" className="critical-speed-drop-btn critical-speed-drop-btn-mark" onClick={handleClose}>
            Mark &amp; keep monitoring
          </button>
          <button type="button" className="critical-speed-drop-btn" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
