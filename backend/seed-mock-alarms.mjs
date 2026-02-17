/**
 * Seed the alarms table with mock data for display.
 * Run from project root: node backend/seed-mock-alarms.mjs
 * Or from backend: node seed-mock-alarms.mjs
 */

import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'motor.db')
const db = new Database(dbPath)

function getLocalTimestamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

const insert = db.prepare(`
  INSERT INTO alarms (type, message, status, created_at, resolved_at)
  VALUES (?, ?, ?, ?, ?)
`)

const mockAlarms = [
  { type: 'Critical', message: 'High vibration detected on motor M1', status: 'resolved', resolved: true },
  { type: 'Critical', message: 'Temperature threshold exceeded', status: 'active', resolved: false },
  { type: 'Warning', message: 'Power consumption approaching limit', status: 'active', resolved: false },
  { type: 'Warning', message: 'Belt tension below recommended range', status: 'resolved', resolved: true },
  { type: 'Warning', message: 'Speed fluctuation detected', status: 'active', resolved: false },
  { type: 'Info', message: 'Scheduled maintenance due in 5 days', status: 'active', resolved: false },
  { type: 'Info', message: 'Motor health check completed', status: 'resolved', resolved: true },
  { type: 'Critical', message: 'Torque limit exceeded', status: 'active', resolved: false },
  { type: 'Info', message: 'Calibration cycle finished successfully', status: 'resolved', resolved: true }
]

// Optional: offset timestamps so they're not all the same second
function insertMockAlarms() {
  let count = 0
  const now = new Date()
  for (let i = 0; i < mockAlarms.length; i++) {
    const m = mockAlarms[i]
    const created = new Date(now.getTime() - (mockAlarms.length - i) * 60000) // spread over last N minutes
    const createdStr = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')} ${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}:${String(created.getSeconds()).padStart(2, '0')}`
    const resolvedStr = m.resolved ? getLocalTimestamp() : null
    insert.run(m.type, m.message, m.status, createdStr, resolvedStr)
    count++
  }
  return count
}

try {
  const count = insertMockAlarms()
  console.log(`Inserted ${count} mock alarms. Open the Alarms page in the dashboard to view them.`)
} catch (e) {
  console.error('Error seeding alarms:', e.message)
  process.exit(1)
} finally {
  db.close()
}
