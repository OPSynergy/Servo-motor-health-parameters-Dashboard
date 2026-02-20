import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import mqtt from 'mqtt'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

// In-memory state for MQTT payload (Health Indexing MHI + fault, etc.)
let mqttState = {
  mhi: null,
  fault: null,
  torque: null,
  speed: null,
  unit_power: null,
  vibration: null,
  temperature: null,
  belt_tension: null,
  updatedAt: null
}
let lastFaultForAlarm = null

// Current "Set MHI Value" (1-100) for motor_health table; updated by frontend or default 85
let setMhiValueBackend = 85

// In-memory buffer for predictive_data topic (plant/line1/servo01/predictive_data)
const PREDICTIVE_BUFFER_MAX = 500
const predictiveDataBuffer = []

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' })) // Increased limit for image data
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Database setup
const dbPath = path.join(__dirname, 'motor.db')
const db = new Database(dbPath)

// Initialize database and create table if it doesn't exist
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS motor_setup (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT,
      type TEXT NOT NULL,
      voltage TEXT NOT NULL,
      high_level REAL,
      low_level REAL,
      image_url TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Add new columns if they don't exist (migration for existing databases)
  try {
    db.exec(`ALTER TABLE motor_setup ADD COLUMN model TEXT`)
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE motor_setup ADD COLUMN high_level REAL`)
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE motor_setup ADD COLUMN low_level REAL`)
  } catch (e) {
    // Column already exists, ignore
  }
  
  // live_trends: one row per MQTT message, columns match MQTT payload
  db.exec(`
    CREATE TABLE IF NOT EXISTS live_trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      torque REAL,
      speed REAL,
      power REAL,
      vibration REAL,
      temperature REAL,
      belt REAL,
      mhi REAL,
      fault TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Migration: if old schema (parameter column) exists, replace with new schema and clear
  try {
    const tableInfo = db.prepare("PRAGMA table_info(live_trends)").all()
    const hasParameter = tableInfo.some(c => c.name === 'parameter')
    if (hasParameter) {
      db.exec(`DROP TABLE IF EXISTS live_trends`)
      db.exec(`
        CREATE TABLE live_trends (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          torque REAL,
          speed REAL,
          power REAL,
          vibration REAL,
          temperature REAL,
          belt REAL,
          mhi REAL,
          fault TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('Migrated live_trends: new schema (torque, speed, power, vibration, temperature, belt, mhi, fault, timestamp)')
    }
  } catch (e) {
    console.warn('live_trends migration check:', e.message)
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_live_trends_timestamp ON live_trends(timestamp DESC)`)
  const liveTrendsCols = db.prepare("PRAGMA table_info(live_trends)").all().map(c => c.name)
  console.log('live_trends table columns:', liveTrendsCols.join(', '))

  db.exec(`
    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    )
  `)
  const alarmCols = db.prepare('PRAGMA table_info(alarms)').all().map(c => c.name)
  if (alarmCols.includes('type')) {
    db.exec('ALTER TABLE alarms DROP COLUMN type')
    console.log('Migrated alarms: dropped type column')
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_alarms_status_created
    ON alarms(status, created_at DESC)
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS motor_health (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_mhi_value REAL NOT NULL,
      current_mhi_value REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      date TEXT DEFAULT (date('now'))
    )
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_motor_health_timestamp
    ON motor_health(timestamp DESC)
  `)

  try {
    db.exec(`ALTER TABLE motor_health ADD COLUMN status TEXT`)
    console.log('motor_health: added column status')
  } catch (e) {
    // Column already exists
  }

  // Default motors insertion removed - start with empty database

  console.log('Database initialized successfully')
}

// Initialize database
initializeDatabase()

// API Routes

// Get all motors
app.get('/api/motors', (req, res) => {
  try {
    const motors = db.prepare('SELECT * FROM motor_setup ORDER BY created_at DESC').all()
    res.json(motors.map(motor => ({
      id: motor.id.toString(),
      name: motor.name,
      model: motor.model || '',
      type: motor.type,
      voltage: motor.voltage,
      highLevel: motor.high_level || null,
      lowLevel: motor.low_level || null,
      imageUrl: motor.image_url,
      isDefault: motor.is_default === 1,
      createdAt: motor.created_at || null
    })))
  } catch (error) {
    console.error('Error fetching motors:', error)
    res.status(500).json({ error: 'Failed to fetch motors' })
  }
})

// Get single motor by ID
app.get('/api/motors/:id', (req, res) => {
  try {
    const motor = db.prepare('SELECT * FROM motor_setup WHERE id = ?').get(req.params.id)
    if (!motor) {
      return res.status(404).json({ error: 'Motor not found' })
    }
    res.json({
      id: motor.id.toString(),
      name: motor.name,
      model: motor.model || '',
      type: motor.type,
      voltage: motor.voltage,
      highLevel: motor.high_level || null,
      lowLevel: motor.low_level || null,
      imageUrl: motor.image_url,
      isDefault: motor.is_default === 1,
      createdAt: motor.created_at || null
    })
  } catch (error) {
    console.error('Error fetching motor:', error)
    res.status(500).json({ error: 'Failed to fetch motor' })
  }
})

// Create new motor
app.post('/api/motors', (req, res) => {
  try {
    const { name, model, type, voltage, highLevel, lowLevel, imageUrl } = req.body
    
    if (!name || !type || !voltage || !imageUrl) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const insert = db.prepare(`
      INSERT INTO motor_setup (name, model, type, voltage, high_level, low_level, image_url, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `)
    
    const result = insert.run(name, model || null, type, voltage, highLevel || null, lowLevel || null, imageUrl)
    
    // Fetch the created motor
    const motor = db.prepare('SELECT * FROM motor_setup WHERE id = ?').get(result.lastInsertRowid)
    
    res.status(201).json({
      id: motor.id.toString(),
      name: motor.name,
      model: motor.model || '',
      type: motor.type,
      voltage: motor.voltage,
      highLevel: motor.high_level || null,
      lowLevel: motor.low_level || null,
      imageUrl: motor.image_url,
      isDefault: motor.is_default === 1,
      createdAt: motor.created_at || null
    })
  } catch (error) {
    console.error('Error creating motor:', error)
    res.status(500).json({ error: 'Failed to create motor' })
  }
})

// Update motor
app.put('/api/motors/:id', (req, res) => {
  try {
    const { name, model, type, voltage, highLevel, lowLevel, imageUrl } = req.body
    const motorId = req.params.id
    
    if (!name || !type || !voltage || !imageUrl) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const update = db.prepare(`
      UPDATE motor_setup 
      SET name = ?, model = ?, type = ?, voltage = ?, high_level = ?, low_level = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    
    const result = update.run(name, model || null, type, voltage, highLevel || null, lowLevel || null, imageUrl, motorId)
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Motor not found' })
    }
    
    // Fetch the updated motor
    const motor = db.prepare('SELECT * FROM motor_setup WHERE id = ?').get(motorId)
    
    res.json({
      id: motor.id.toString(),
      name: motor.name,
      model: motor.model || '',
      type: motor.type,
      voltage: motor.voltage,
      highLevel: motor.high_level || null,
      lowLevel: motor.low_level || null,
      imageUrl: motor.image_url,
      isDefault: motor.is_default === 1,
      createdAt: motor.created_at || null
    })
  } catch (error) {
    console.error('Error updating motor:', error)
    res.status(500).json({ error: 'Failed to update motor' })
  }
})

// Delete motor
app.delete('/api/motors/:id', (req, res) => {
  try {
    const motorId = req.params.id
    
    // Check if motor is default (prevent deletion of default motors)
    const motor = db.prepare('SELECT is_default FROM motor_setup WHERE id = ?').get(motorId)
    
    if (!motor) {
      return res.status(404).json({ error: 'Motor not found' })
    }
    
    if (motor.is_default === 1) {
      return res.status(400).json({ error: 'Cannot delete default motor' })
    }
    
    const deleteStmt = db.prepare('DELETE FROM motor_setup WHERE id = ?')
    const result = deleteStmt.run(motorId)
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Motor not found' })
    }
    
    res.json({ message: 'Motor deleted successfully' })
  } catch (error) {
    console.error('Error deleting motor:', error)
    res.status(500).json({ error: 'Failed to delete motor' })
  }
})

// Live Trends API Routes

// Helper: get local timestamp string for SQLite
function getLocalTimestamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function getLocalDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Try multiple keys (and lowercase) so MQTT payload works with different naming (MHI, mhi, etc.)
function getPayloadNumber(obj, ...keys) {
  if (obj == null || typeof obj !== 'object') return undefined
  for (const k of keys) {
    let v = obj[k]
    if (v !== undefined && v !== null) {
      const n = Number(v)
      if (!Number.isNaN(n)) return n
    }
    const lower = k.toLowerCase?.()
    if (lower && lower !== k) {
      v = obj[lower]
      if (v !== undefined && v !== null) {
        const n = Number(v)
        if (!Number.isNaN(n)) return n
      }
    }
  }
  return undefined
}
function getPayloadString(obj, ...keys) {
  if (obj == null || typeof obj !== 'object') return undefined
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null) return String(v)
    const lower = k.toLowerCase?.()
    if (lower && lower !== k) {
      const v2 = obj[lower]
      if (v2 !== undefined && v2 !== null) return String(v2)
    }
  }
  return undefined
}

const liveTrendInsert = db.prepare(`
  INSERT INTO live_trends (torque, speed, power, vibration, temperature, belt, mhi, fault, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const alarmInsert = db.prepare(`
  INSERT INTO alarms (message, status, created_at)
  VALUES (?, ?, ?)
`)

const motorHealthInsert = db.prepare(`
  INSERT INTO motor_health (set_mhi_value, current_mhi_value, timestamp, date, status)
  VALUES (?, ?, ?, ?, ?)
`)

// Map API parameter names to live_trends column names (new schema)
const LIVE_TRENDS_PARAM_COLUMN = {
  'vibration': 'vibration',
  'temperature': 'temperature',
  'power-consumption': 'power',
  'belt-tension': 'belt',
  'speed': 'speed',
  'torque': 'torque'
}

// Default HL/LL for Live Trends (for API responses)
const MQTT_PARAM_CONFIG = {
  vibration: { hl: 80, ll: 30 },
  temperature: { hl: 85, ll: 35 },
  'power-consumption': { hl: 75, ll: 25 },
  'belt-tension': { hl: 90, ll: 40 },
  speed: { hl: 95, ll: 20 },
  torque: { hl: 90, ll: 25 }
}

// Save live trend data (inserts one row with all columns; requested parameter set to currentValue, others from mqttState or 0)
app.post('/api/live-trends', (req, res) => {
  try {
    const { parameter, highLevel, lowLevel, currentValue } = req.body
    
    if (!parameter || highLevel === undefined || lowLevel === undefined || currentValue === undefined) {
      return res.status(400).json({ error: 'Missing required fields: parameter, highLevel, lowLevel, currentValue' })
    }
    
    const validParameters = ['vibration', 'temperature', 'power-consumption', 'belt-tension', 'speed', 'torque']
    if (!validParameters.includes(parameter)) {
      return res.status(400).json({ error: `Invalid parameter. Must be one of: ${validParameters.join(', ')}` })
    }
    
    const ts = getLocalTimestamp()
    const num = Number(currentValue)
    const torque = parameter === 'torque' ? num : (mqttState.torque ?? 0)
    const speed = parameter === 'speed' ? num : (mqttState.speed ?? 0)
    const power = parameter === 'power-consumption' ? num : (mqttState.unit_power ?? 0)
    const vibration = parameter === 'vibration' ? num : (mqttState.vibration ?? 0)
    const temperature = parameter === 'temperature' ? num : (mqttState.temperature ?? 0)
    const belt = parameter === 'belt-tension' ? num : (mqttState.belt_tension ?? 0)
    const mhi = mqttState.mhi ?? 0
    const fault = (mqttState.fault != null ? String(mqttState.fault) : '') || ''
    const result = liveTrendInsert.run(torque, speed, power, vibration, temperature, belt, mhi, fault, ts)
    
    res.status(201).json({
      id: result.lastInsertRowid,
      parameter,
      highLevel,
      lowLevel,
      currentValue: Number.isNaN(num) ? currentValue : num,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error saving live trend:', error)
    res.status(500).json({ error: 'Failed to save live trend data' })
  }
})

// Get live trend data (latest or history). Parameter filters by column (vibration, torque, etc.)
app.get('/api/live-trends', (req, res) => {
  try {
    const { parameter, limit = 100 } = req.query
    const limitNum = parseInt(limit)
    const col = parameter ? LIVE_TRENDS_PARAM_COLUMN[parameter] : null
    const cfg = parameter ? MQTT_PARAM_CONFIG[parameter] : null

    if (parameter && !col) {
      return res.status(400).json({ error: `Invalid parameter. Must be one of: ${Object.keys(LIVE_TRENDS_PARAM_COLUMN).join(', ')}` })
    }

    let query, params
    if (col) {
      query = `SELECT id, ${col} as current_value, timestamp FROM live_trends ORDER BY timestamp DESC`
      if (limitNum > 0) query += ' LIMIT ?'
      params = limitNum > 0 ? [limitNum] : []
    } else {
      query = 'SELECT * FROM live_trends ORDER BY timestamp DESC'
      if (limitNum > 0) query += ' LIMIT ?'
      params = limitNum > 0 ? [limitNum] : []
    }
    const trends = db.prepare(query).all(...params)

    if (col) {
      res.json(trends.map(trend => {
        const timestamp = trend.timestamp ? new Date(trend.timestamp).toISOString() : new Date().toISOString()
        return {
          id: trend.id,
          parameter,
          highLevel: cfg ? cfg.hl : null,
          lowLevel: cfg ? cfg.ll : null,
          currentValue: trend.current_value,
          timestamp
        }
      }))
    } else {
      res.json(trends.map(trend => {
        const timestamp = trend.timestamp ? new Date(trend.timestamp).toISOString() : new Date().toISOString()
        return { ...trend, timestamp }
      }))
    }
  } catch (error) {
    console.error('Error fetching live trends:', error)
    res.status(500).json({ error: 'Failed to fetch live trend data' })
  }
})

// Get latest values for all parameters (from most recent row)
app.get('/api/live-trends/latest', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM live_trends ORDER BY timestamp DESC LIMIT 1').get()
    if (!row) {
      return res.json([])
    }
    const timestamp = row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString()
    const out = []
    for (const param of Object.keys(LIVE_TRENDS_PARAM_COLUMN)) {
      const col = LIVE_TRENDS_PARAM_COLUMN[param]
      const cfg = MQTT_PARAM_CONFIG[param]
      out.push({
        parameter: param,
        highLevel: cfg ? cfg.hl : null,
        lowLevel: cfg ? cfg.ll : null,
        currentValue: row[col] != null ? row[col] : 0,
        timestamp
      })
    }
    res.json(out)
  } catch (error) {
    console.error('Error fetching latest trends:', error)
    res.status(500).json({ error: 'Failed to fetch latest trend data' })
  }
})

// Get data from a specific time period ago
app.get('/api/live-trends/historical', (req, res) => {
  try {
    const { parameter, minutesAgo, afterTimestamp } = req.query
    
    if (!minutesAgo) {
      return res.status(400).json({ error: 'minutesAgo parameter is required' })
    }
    
    const minutes = parseInt(minutesAgo)
    if (isNaN(minutes) || minutes < 0) {
      return res.status(400).json({ error: 'Invalid minutesAgo value' })
    }
    
    const col = parameter ? LIVE_TRENDS_PARAM_COLUMN[parameter] : null
    const cfg = parameter ? MQTT_PARAM_CONFIG[parameter] : null
    const selectCols = col ? `${col} as current_value, timestamp` : 'torque, speed, power, vibration, temperature, belt, mhi, fault, timestamp'
    let query = `SELECT ${selectCols} FROM live_trends`
    let params = []
    let hasWhere = false
    
    if (afterTimestamp) {
      const afterDate = new Date(afterTimestamp)
      const afterTimestampFormatted = `${afterDate.getFullYear()}-${String(afterDate.getMonth() + 1).padStart(2, '0')}-${String(afterDate.getDate()).padStart(2, '0')} ${String(afterDate.getHours()).padStart(2, '0')}:${String(afterDate.getMinutes()).padStart(2, '0')}:${String(afterDate.getSeconds()).padStart(2, '0')}`
      query += ' WHERE timestamp > ?'
      params.push(afterTimestampFormatted)
      hasWhere = true
    }
    
    if (minutes !== 480) {
      const targetTime = new Date(Date.now() - minutes * 60 * 1000)
      const targetTimestamp = `${targetTime.getFullYear()}-${String(targetTime.getMonth() + 1).padStart(2, '0')}-${String(targetTime.getDate()).padStart(2, '0')} ${String(targetTime.getHours()).padStart(2, '0')}:${String(targetTime.getMinutes()).padStart(2, '0')}:${String(targetTime.getSeconds()).padStart(2, '0')}`
      query += hasWhere ? ' AND datetime(timestamp) >= datetime(?)' : ' WHERE datetime(timestamp) >= datetime(?)'
      params.push(targetTimestamp)
      hasWhere = true
    }
    
    query += minutes === 480 ? ' ORDER BY timestamp DESC' : ' ORDER BY timestamp DESC LIMIT 500'
    const data = db.prepare(query).all(...params)
    
    if (col) {
      res.json(data.map(trend => {
        const timestamp = trend.timestamp ? new Date(trend.timestamp).toISOString() : new Date().toISOString()
        return {
          parameter,
          highLevel: cfg ? cfg.hl : null,
          lowLevel: cfg ? cfg.ll : null,
          currentValue: trend.current_value,
          timestamp
        }
      }))
    } else {
      res.json(data.map(trend => {
        const timestamp = trend.timestamp ? new Date(trend.timestamp).toISOString() : new Date().toISOString()
        return { ...trend, timestamp }
      }))
    }
  } catch (error) {
    console.error('Error fetching historical trends:', error)
    res.status(500).json({ error: 'Failed to fetch historical trend data' })
  }
})

// Delete all rows from live_trends (parameter required for API compatibility but clears entire table)
app.delete('/api/live-trends', (req, res) => {
  try {
    const { parameter } = req.query
    if (!parameter) {
      return res.status(400).json({ error: 'parameter is required' })
    }
    const validParameters = ['vibration', 'temperature', 'power-consumption', 'belt-tension', 'speed', 'torque']
    if (!validParameters.includes(parameter)) {
      return res.status(400).json({ error: `Invalid parameter. Must be one of: ${validParameters.join(', ')}` })
    }
    const result = db.prepare('DELETE FROM live_trends').run()
    res.json({ message: 'All live trends data deleted successfully', deletedCount: result.changes })
  } catch (error) {
    console.error('Error deleting live trends:', error)
    res.status(500).json({ error: 'Failed to delete live trend data' })
  }
})

// Alarms API
app.get('/api/alarms/count', (req, res) => {
  try {
    const row = db.prepare(
      "SELECT COUNT(*) as count FROM alarms WHERE COALESCE(UPPER(TRIM(message)), '') <> 'NORMAL'"
    ).get()
    res.json({ count: row.count })
  } catch (error) {
    console.error('Error fetching alarm count:', error)
    res.status(500).json({ error: 'Failed to fetch alarm count' })
  }
})

app.get('/api/alarms', (req, res) => {
  try {
    const rows = db.prepare(
      "SELECT id, message, status, created_at, resolved_at FROM alarms WHERE COALESCE(UPPER(TRIM(message)), '') <> 'NORMAL' ORDER BY created_at DESC"
    ).all()
    res.json(rows.map(row => ({
      id: row.id,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at
    })))
  } catch (error) {
    console.error('Error fetching alarms:', error)
    res.status(500).json({ error: 'Failed to fetch alarms' })
  }
})

// Predictive data API (real-time from MQTT plant/line1/servo01/predictive_data)
app.get('/api/predictive-data', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || PREDICTIVE_BUFFER_MAX, 1000)
    const slice = predictiveDataBuffer.slice(-limit)
    res.json(slice)
  } catch (error) {
    console.error('Error fetching predictive data:', error)
    res.status(500).json({ error: 'Failed to fetch predictive data' })
  }
})

// Health Indexing API (MHI + latest MQTT state)
// When MQTT has not sent MHI yet, return a fallback so the dashboard can display a value until real data arrives
app.get('/api/health-index', (req, res) => {
  try {
    const mhiFallback = process.env.MHI_DEFAULT != null ? parseFloat(process.env.MHI_DEFAULT) : 0.85
    const mhi = mqttState.mhi != null ? mqttState.mhi : mhiFallback
    res.json({
      mhi,
      fault: mqttState.fault,
      updatedAt: mqttState.updatedAt,
      torque: mqttState.torque,
      speed: mqttState.speed,
      unit_power: mqttState.unit_power,
      vibration: mqttState.vibration,
      temperature: mqttState.temperature,
      belt_tension: mqttState.belt_tension,
      isFallback: mqttState.mhi == null
    })
  } catch (error) {
    console.error('Error fetching health index:', error)
    res.status(500).json({ error: 'Failed to fetch health index' })
  }
})

// Motor health: get/update set MHI value (1-100) for motor_health table logging
app.get('/api/motor-health/set-value', (req, res) => {
  res.json({ setMhiValue: setMhiValueBackend })
})
app.put('/api/motor-health/set-value', express.json(), (req, res) => {
  const v = req.body?.setMhiValue != null ? Number(req.body.setMhiValue) : NaN
  if (!Number.isNaN(v) && v >= 1 && v <= 100) {
    setMhiValueBackend = v
    res.json({ setMhiValue: setMhiValueBackend })
  } else {
    res.status(400).json({ error: 'setMhiValue must be a number between 1 and 100' })
  }
})

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Database file: ${dbPath}`)

  // Log motor_health every second (uses current setMhiValueBackend + mqttState.mhi so UI "Set MHI Value" is reflected)
  setInterval(() => {
    try {
      const currentMhi = mqttState.mhi != null ? Number(mqttState.mhi) : 0
      const ts = getLocalTimestamp()
      const date = getLocalDate()
      const currentPercent = currentMhi * 100
      const status = currentPercent >= setMhiValueBackend ? 'good' : currentPercent >= setMhiValueBackend * 0.7 ? 'warning' : 'critical'
      motorHealthInsert.run(setMhiValueBackend, currentMhi, ts, date, status)
    } catch (e) {
      console.error('motor_health insert error:', e.message)
    }
  }, 1000)
  console.log('motor_health: logging every 1s')

  const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883'
  const MQTT_TOPIC = process.env.MQTT_TOPIC || 'esp/live'

  try {
    const client = mqtt.connect(MQTT_URL, { reconnectPeriod: 5000 })
    client.on('connect', () => {
      console.log(`MQTT connected to ${MQTT_URL}`)
      client.subscribe(MQTT_TOPIC, (err) => {
        if (err) console.error('MQTT subscribe error:', err)
        else console.log(`MQTT subscribed to topic: ${MQTT_TOPIC}`)
      })
    })
    let mqttMessageCount = 0
    client.on('message', (topic, payload) => {
      mqttMessageCount++
      if (process.env.DEBUG_MQTT === '1' || mqttMessageCount <= 3) {
        console.log('[MQTT] message #' + mqttMessageCount + ' on topic:', topic, 'length:', payload?.length ?? 0)
      }
      const raw = (payload && typeof payload.toString === 'function') ? payload.toString() : String(payload || '')
      if (process.env.DEBUG_MQTT === '1') console.log('[MQTT] raw:', raw.slice(0, 200))
      let data
      try {
        data = typeof raw === 'string' && raw.trim().startsWith('{') ? JSON.parse(raw) : {}
      } catch (e) {
        const num = parseFloat(raw)
        if (!Number.isNaN(num)) data = { MHI: num, mhi: num }
        else {
          console.error('MQTT message parse error:', e.message, 'raw:', raw.slice(0, 200))
          return
        }
      }
      try {
        const ts = getLocalTimestamp()

        const mhiVal = getPayloadNumber(data, 'MHI', 'mhi', 'MotorHealthIndex', 'motor_health_index')
        if (mhiVal !== undefined) mqttState.mhi = mhiVal
        const faultVal = getPayloadString(data, 'fault', 'Fault', 'FAULT')
        if (faultVal !== undefined) mqttState.fault = faultVal
        const torqueVal = getPayloadNumber(data, 'torque', 'Torque', 'TORQUE')
        if (torqueVal !== undefined) mqttState.torque = torqueVal
        const speedVal = getPayloadNumber(data, 'speed', 'Speed', 'SPEED')
        if (speedVal !== undefined) mqttState.speed = speedVal
        // Payload may use "power" and "belt" (your device) or "unit_power" and "belt_tension"
        const unitPowerVal = getPayloadNumber(data, 'power', 'Power', 'unit_power', 'unitPower', 'Unit_Power')
        if (unitPowerVal !== undefined) mqttState.unit_power = unitPowerVal
        const vibrationVal = getPayloadNumber(data, 'vibration', 'Vibration', 'VIBRATION')
        if (vibrationVal !== undefined) mqttState.vibration = vibrationVal
        const temperatureVal = getPayloadNumber(data, 'temperature', 'Temperature', 'TEMPERATURE', 'temp', 'Temp')
        if (temperatureVal !== undefined) mqttState.temperature = temperatureVal
        const beltTensionVal = getPayloadNumber(data, 'belt', 'Belt', 'belt_tension', 'beltTension', 'Belt_Tension')
        if (beltTensionVal !== undefined) mqttState.belt_tension = beltTensionVal
        mqttState.updatedAt = ts

        // Log one row per MQTT message with columns matching payload: torque, speed, power, vibration, temperature, belt, mhi, fault
        const round = (v) => (v != null && !Number.isNaN(Number(v))) ? Math.round(Number(v) * 100) / 100 : 0
        const torqueR = round(torqueVal ?? data.torque)
        const speedR = round(speedVal ?? data.speed)
        const powerR = round(unitPowerVal ?? data.power ?? data.unit_power)
        const vibrationR = round(vibrationVal ?? data.vibration)
        const temperatureR = round(temperatureVal ?? data.temperature)
        const beltR = round(beltTensionVal ?? data.belt ?? data.belt_tension)
        const mhiR = round(mhiVal ?? data.MHI ?? data.mhi)
        const faultStr = mqttState.fault != null ? String(mqttState.fault).trim() : ''
        try {
          const result = liveTrendInsert.run(torqueR, speedR, powerR, vibrationR, temperatureR, beltR, mhiR, faultStr, ts)
          if (mqttMessageCount <= 5 || process.env.DEBUG_MQTT === '1') {
            console.log('[MQTT] live_trends insert ok, row id:', result.lastInsertRowid)
          }
        } catch (insertErr) {
          console.error('[MQTT] live_trends INSERT failed:', insertErr.message, insertErr.stack)
        }

        if (faultStr !== '' && faultStr.toUpperCase().trim() !== 'NORMAL' && faultStr !== lastFaultForAlarm) {
          lastFaultForAlarm = faultStr
          alarmInsert.run(lastFaultForAlarm, 'active', ts)
        }
      } catch (e) {
        console.error('MQTT message handle error:', e.message, 'raw:', raw.slice(0, 200))
      }
    })
    client.on('error', (err) => console.error('MQTT error:', err.message))
  } catch (e) {
    console.warn('MQTT not started:', e.message)
    console.warn('Set MQTT_URL and optionally MQTT_TOPIC to connect to your ESP broker.')
  }

  // Predictive data: subscribe to 192.168.137.1, topic plant/line1/servo01/predictive_data
  // Store all numeric fields in live_trends and in-memory buffer for graphs
  const PREDICTIVE_MQTT_URL = process.env.PREDICTIVE_MQTT_URL || 'mqtt://192.168.137.1:1883'
  const PREDICTIVE_MQTT_TOPIC = process.env.PREDICTIVE_MQTT_TOPIC || 'plant/line1/servo01/predictive_data'
  const PREDICTIVE_PARAM_MAP = { unit_power: 'power-consumption', belt_tension: 'belt-tension' }
  const PREDICTIVE_DEFAULT_HL = 100
  const PREDICTIVE_DEFAULT_LL = 0
  try {
    const predClient = mqtt.connect(PREDICTIVE_MQTT_URL, { reconnectPeriod: 5000 })
    predClient.on('connect', () => {
      console.log(`Predictive MQTT connected to ${PREDICTIVE_MQTT_URL}`)
      predClient.subscribe(PREDICTIVE_MQTT_TOPIC, (err) => {
        if (err) console.error('Predictive MQTT subscribe error:', err)
        else console.log(`Predictive MQTT subscribed to: ${PREDICTIVE_MQTT_TOPIC}`)
      })
    })
    let predictiveMessageCount = 0
    predClient.on('message', (topic, payload) => {
      try {
        const raw = (payload && typeof payload.toString === 'function') ? payload.toString() : String(payload || '')
        const data = typeof raw === 'string' && raw.trim().startsWith('{') ? JSON.parse(raw) : { value: parseFloat(raw) || 0 }
        const ts = getLocalTimestamp()
        const iso = new Date().toISOString()
        predictiveDataBuffer.push({ timestamp: ts, iso, ...data })
        if (predictiveDataBuffer.length > PREDICTIVE_BUFFER_MAX) predictiveDataBuffer.shift()

        // Update mqttState so /api/health-index and Motor Health page show real-time MHI and other params from this topic
        const mhiVal = data.MHI != null ? Number(data.MHI) : data.mhi != null ? Number(data.mhi) : undefined
        if (mhiVal !== undefined && !Number.isNaN(mhiVal)) mqttState.mhi = mhiVal
        if (data.fault != null) mqttState.fault = String(data.fault).trim()
        if (data.torque != null) mqttState.torque = Number(data.torque)
        if (data.speed != null) mqttState.speed = Number(data.speed)
        if (data.power != null) mqttState.unit_power = Number(data.power)
        if (data.vibration != null) mqttState.vibration = Number(data.vibration)
        if (data.temperature != null) mqttState.temperature = Number(data.temperature)
        if (data.belt != null) mqttState.belt_tension = Number(data.belt)
        mqttState.updatedAt = ts

        // Save to live_trends (same columns as main MQTT: torque, speed, power, vibration, temperature, belt, mhi, fault)
        const round = (v) => (v != null && !Number.isNaN(Number(v))) ? Math.round(Number(v) * 100) / 100 : 0
        const torqueR = round(data.torque)
        const speedR = round(data.speed)
        const powerR = round(data.power ?? data.unit_power)
        const vibrationR = round(data.vibration)
        const temperatureR = round(data.temperature)
        const beltR = round(data.belt ?? data.belt_tension)
        const mhiR = round(data.MHI ?? data.mhi)
        const faultStr = (data.fault != null ? String(data.fault).trim() : '') || ''
        if (faultStr !== '' && faultStr.toUpperCase().trim() !== 'NORMAL' && faultStr !== lastFaultForAlarm) {
          lastFaultForAlarm = faultStr
          try {
            alarmInsert.run(faultStr, 'active', ts)
          } catch (alarmErr) {
            console.error('[Predictive MQTT] alarm INSERT failed:', alarmErr.message)
          }
        }
        try {
          liveTrendInsert.run(torqueR, speedR, powerR, vibrationR, temperatureR, beltR, mhiR, faultStr, ts)
          predictiveMessageCount++
          if (predictiveMessageCount <= 5) {
            console.log('[Predictive MQTT] live_trends row saved #' + predictiveMessageCount)
          }
        } catch (insertErr) {
          console.error('[Predictive MQTT] live_trends INSERT failed:', insertErr.message)
        }
      } catch (e) {
        console.error('Predictive MQTT parse error:', e.message)
      }
    })
    predClient.on('error', (err) => console.error('Predictive MQTT error:', err.message))
  } catch (e) {
    console.warn('Predictive MQTT not started:', e.message)
  }
})

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use!`)
    console.error(`\nTo fix this, either:`)
    console.error(`1. Kill the process using port ${PORT}:`)
    console.error(`   lsof -ti:${PORT} | xargs kill -9`)
    console.error(`\n2. Or use a different port by setting PORT environment variable`)
    process.exit(1)
  } else {
    console.error('Server error:', error)
    process.exit(1)
  }
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...')
  db.close()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
