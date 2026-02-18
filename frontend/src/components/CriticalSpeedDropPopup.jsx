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

  useEffect(() => {
    const checkAlarms = async () => {
      try {
        const list = await getAlarms()
        const criticalSpeedDrop = list.find(
          (a) => a.message && String(a.message).trim().toUpperCase() === FAULT_MESSAGE
        )
        if (criticalSpeedDrop && criticalSpeedDrop.id !== lastShownIdRef.current) {
          setAlarm(criticalSpeedDrop)
          setVisible(true)
          lastShownIdRef.current = criticalSpeedDrop.id
        }
      } catch {
        // ignore
      }
    }
    checkAlarms()
    const intervalId = setInterval(checkAlarms, POLL_INTERVAL_MS)
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
