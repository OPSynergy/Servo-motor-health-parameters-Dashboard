import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { getAlarmsCount } from '../services/alarmsApi'
import { createPortal } from 'react-dom'
import './NewAlarmsPopup.css'

const POLL_INTERVAL_MS = 8000

export default function NewAlarmsPopup() {
  const [visible, setVisible] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const lastCountRef = useRef(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    let intervalId

    const checkAlarms = async () => {
      try {
        const count = await getAlarmsCount()
        if (initializedRef.current && lastCountRef.current !== null && count > lastCountRef.current) {
          setNewCount(count - lastCountRef.current)
          setVisible(true)
        }
        lastCountRef.current = count
        initializedRef.current = true
      } catch {
        // ignore
      }
    }

    checkAlarms()
    intervalId = setInterval(checkAlarms, POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [])

  const handleCancel = () => {
    setVisible(false)
  }

  if (!visible) return null

  return createPortal(
    <div className="new-alarms-popup-overlay" onClick={handleCancel} role="presentation">
      <div
        className="new-alarms-popup-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="new-alarms-title"
        aria-modal="true"
      >
        <div className="new-alarms-popup-accent" />
        <div className="new-alarms-popup-icon-wrap">
          <span className="new-alarms-popup-icon" aria-hidden>
            <Bell size={26} strokeWidth={2} />
          </span>
        </div>
        <h2 id="new-alarms-title" className="new-alarms-popup-title">New Alarms</h2>
        <p className="new-alarms-popup-message">
          {newCount === 1
            ? '1 new alarm has been added to the system.'
            : `${newCount} new alarms have been added to the system.`}
        </p>
        <p className="new-alarms-popup-hint">View them on the Alarms page.</p>
        <button
          type="button"
          className="new-alarms-popup-cancel"
          onClick={handleCancel}
          autoFocus
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  )
}
