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
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS live_trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parameter TEXT NOT NULL,
      high_level REAL NOT NULL,
      low_level REAL NOT NULL,
      current_value REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Create index on parameter and timestamp for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_live_trends_parameter_timestamp 
    ON live_trends(parameter, timestamp DESC)
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    )
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_alarms_status_created
    ON alarms(status, created_at DESC)
  `)

  // Migration: rename current-consumption to power-consumption in existing data
  try {
    const update = db.prepare(`UPDATE live_trends SET parameter = 'power-consumption' WHERE parameter = 'current-consumption'`)
    const result = update.run()
    if (result.changes > 0) {
      console.log('Migrated live_trends: current-consumption -> power-consumption, rows updated:', result.changes)
    }
  } catch (e) {
    console.warn('Migration current-consumption -> power-consumption:', e.message)
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
      isDefault: motor.is_default === 1
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
      isDefault: motor.is_default === 1
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
      isDefault: motor.is_default === 1
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
      isDefault: motor.is_default === 1
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

const liveTrendInsert = db.prepare(`
  INSERT INTO live_trends (parameter, high_level, low_level, current_value, timestamp)
  VALUES (?, ?, ?, ?, ?)
`)

const alarmInsert = db.prepare(`
  INSERT INTO alarms (type, message, status, created_at)
  VALUES (?, ?, ?, ?)
`)

// Default HL/LL for Live Trends when inserting from MQTT (same as frontend defaults)
const MQTT_PARAM_CONFIG = {
  vibration: { hl: 80, ll: 30 },
  temperature: { hl: 85, ll: 35 },
  'power-consumption': { hl: 75, ll: 25 },
  'belt-tension': { hl: 90, ll: 40 },
  speed: { hl: 95, ll: 20 },
  torque: { hl: 90, ll: 25 }
}

// Save live trend data
app.post('/api/live-trends', (req, res) => {
  try {
    const { parameter, highLevel, lowLevel, currentValue } = req.body
    
    if (!parameter || highLevel === undefined || lowLevel === undefined || currentValue === undefined) {
      return res.status(400).json({ error: 'Missing required fields: parameter, highLevel, lowLevel, currentValue' })
    }
    
    // Validate parameter
    const validParameters = ['vibration', 'temperature', 'power-consumption', 'belt-tension', 'speed', 'torque']
    if (!validParameters.includes(parameter)) {
      return res.status(400).json({ error: `Invalid parameter. Must be one of: ${validParameters.join(', ')}` })
    }
    
    const localTimestamp = getLocalTimestamp()
    const result = liveTrendInsert.run(parameter, highLevel, lowLevel, currentValue, localTimestamp)
    
    res.status(201).json({
      id: result.lastInsertRowid,
      parameter,
      highLevel,
      lowLevel,
      currentValue,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error saving live trend:', error)
    res.status(500).json({ error: 'Failed to save live trend data' })
  }
})

// Get live trend data (latest or history)
app.get('/api/live-trends', (req, res) => {
  try {
    const { parameter, limit = 100 } = req.query
    const limitNum = parseInt(limit)
    
    let query = 'SELECT * FROM live_trends'
    let params = []
    
    if (parameter) {
      query += ' WHERE parameter = ?'
      params.push(parameter)
    }
    
    // Only apply LIMIT if limit is greater than 0
    if (limitNum > 0) {
      query += ' ORDER BY timestamp DESC LIMIT ?'
      params.push(limitNum)
    } else {
      query += ' ORDER BY timestamp DESC'
    }
    
    const trends = db.prepare(query).all(...params)
    
    res.json(trends.map(trend => {
      // Convert SQLite timestamp to ISO string for consistent handling
      const timestamp = trend.timestamp ? new Date(trend.timestamp).toISOString() : new Date().toISOString()
      return {
        id: trend.id,
        parameter: trend.parameter,
        highLevel: trend.high_level,
        lowLevel: trend.low_level,
        currentValue: trend.current_value,
        timestamp: timestamp
      }
    }))
  } catch (error) {
    console.error('Error fetching live trends:', error)
    res.status(500).json({ error: 'Failed to fetch live trend data' })
  }
})

// Get latest values for all parameters
app.get('/api/live-trends/latest', (req, res) => {
  try {
    const latest = db.prepare(`
      SELECT parameter, high_level, low_level, current_value, timestamp
      FROM live_trends
      WHERE id IN (
        SELECT MAX(id) 
        FROM live_trends 
        GROUP BY parameter
      )
      ORDER BY parameter
    `).all()
    
    res.json(latest.map(trend => {
      // Convert SQLite timestamp to ISO string for consistent handling
      const timestamp = trend.timestamp ? new Date(trend.timestamp).toISOString() : new Date().toISOString()
      return {
        parameter: trend.parameter,
        highLevel: trend.high_level,
        lowLevel: trend.low_level,
        currentValue: trend.current_value,
        timestamp: timestamp
      }
    }))
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
    
    // For 8 hours (480 minutes), show all data in the database
    // For other time periods, show data up to that time
    let query = `
      SELECT parameter, high_level, low_level, current_value, timestamp
      FROM live_trends
    `
    let params = []
    let hasWhere = false
    
    // Filter by afterTimestamp if provided (data after last clear)
    if (afterTimestamp) {
      // Convert ISO timestamp to local datetime format
      const afterDate = new Date(afterTimestamp)
      const year = afterDate.getFullYear()
      const month = String(afterDate.getMonth() + 1).padStart(2, '0')
      const day = String(afterDate.getDate()).padStart(2, '0')
      const hours = String(afterDate.getHours()).padStart(2, '0')
      const mins = String(afterDate.getMinutes()).padStart(2, '0')
      const secs = String(afterDate.getSeconds()).padStart(2, '0')
      const afterTimestampFormatted = `${year}-${month}-${day} ${hours}:${mins}:${secs}`
      
      query += ' WHERE timestamp > ?'
      params.push(afterTimestampFormatted)
      hasWhere = true
    }
    
    // Only filter by time if not 8 hours (480 minutes)
    if (minutes !== 480) {
      // Calculate target time (start time) in local timezone - data FROM this time TO NOW
      const targetTime = new Date(Date.now() - minutes * 60 * 1000)
      const year = targetTime.getFullYear()
      const month = String(targetTime.getMonth() + 1).padStart(2, '0')
      const day = String(targetTime.getDate()).padStart(2, '0')
      const hours = String(targetTime.getHours()).padStart(2, '0')
      const mins = String(targetTime.getMinutes()).padStart(2, '0')
      const secs = String(targetTime.getSeconds()).padStart(2, '0')
      const targetTimestamp = `${year}-${month}-${day} ${hours}:${mins}:${secs}`
      
      // Get data FROM target time onwards (timestamp >= targetTimestamp)
      // Use datetime() function for proper comparison in SQLite
      query += hasWhere ? ' AND datetime(timestamp) >= datetime(?)' : ' WHERE datetime(timestamp) >= datetime(?)'
      params.push(targetTimestamp)
      hasWhere = true
      
      console.log(`[Historical Query] Fetching data for ${minutes} minutes ago. Target time: ${targetTimestamp}, Parameter: ${parameter || 'all'}`)
      console.log(`[Historical Query] Full query: ${query}`)
      console.log(`[Historical Query] Params:`, params)
    }
    
    if (parameter) {
      query += hasWhere ? ' AND parameter = ?' : ' WHERE parameter = ?'
      params.push(parameter)
    }
    
    // Order by timestamp DESC to get the most recent data first
    // For 8hrs, show all data; for others limit to 500 so live graph has enough points
    if (minutes === 480) {
      query += ' ORDER BY timestamp DESC'
    } else {
      query += ' ORDER BY timestamp DESC LIMIT 500'
    }
    
    const data = db.prepare(query).all(...params)
    
    console.log(`[Historical Query] Found ${data.length} records for ${minutes} minutes ago, parameter: ${parameter || 'all'}`)
    if (data.length > 0) {
      console.log(`[Historical Query] First record timestamp: ${data[0].timestamp}, Last record timestamp: ${data[data.length - 1].timestamp}`)
    }
    
    res.json(data.map(trend => {
      // Convert SQLite timestamp to ISO string for consistent handling
      const timestamp = trend.timestamp ? new Date(trend.timestamp).toISOString() : new Date().toISOString()
      return {
        parameter: trend.parameter,
        highLevel: trend.high_level,
        lowLevel: trend.low_level,
        currentValue: trend.current_value,
        timestamp: timestamp
      }
    }))
  } catch (error) {
    console.error('Error fetching historical trends:', error)
    res.status(500).json({ error: 'Failed to fetch historical trend data' })
  }
})

// Delete all data for a specific parameter
app.delete('/api/live-trends', (req, res) => {
  try {
    const { parameter } = req.query
    
    if (!parameter) {
      return res.status(400).json({ error: 'parameter is required' })
    }
    
    // Validate parameter
    const validParameters = ['vibration', 'temperature', 'power-consumption', 'belt-tension', 'speed', 'torque']
    if (!validParameters.includes(parameter)) {
      return res.status(400).json({ error: `Invalid parameter. Must be one of: ${validParameters.join(', ')}` })
    }
    
    const deleteStmt = db.prepare('DELETE FROM live_trends WHERE parameter = ?')
    const result = deleteStmt.run(parameter)
    
    res.json({ 
      message: `All data for ${parameter} deleted successfully`,
      deletedCount: result.changes
    })
  } catch (error) {
    console.error('Error deleting live trends:', error)
    res.status(500).json({ error: 'Failed to delete live trend data' })
  }
})

// Alarms API
app.get('/api/alarms/count', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM alarms').get()
    res.json({ count: row.count })
  } catch (error) {
    console.error('Error fetching alarm count:', error)
    res.status(500).json({ error: 'Failed to fetch alarm count' })
  }
})

app.get('/api/alarms', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT id, type, message, status, created_at, resolved_at FROM alarms ORDER BY created_at DESC'
    ).all()
    res.json(rows.map(row => ({
      id: row.id,
      type: row.type,
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

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Database file: ${dbPath}`)

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
    client.on('message', (topic, payload) => {
      try {
        const raw = payload.toString()
        const data = JSON.parse(raw)
        const ts = getLocalTimestamp()

        const mhiRaw = data.MHI ?? data.mhi
        mqttState.mhi = mhiRaw != null ? Number(mhiRaw) : mqttState.mhi
        mqttState.fault = data.fault != null ? String(data.fault) : mqttState.fault
        mqttState.torque = data.torque != null ? Number(data.torque) : mqttState.torque
        mqttState.speed = data.speed != null ? Number(data.speed) : mqttState.speed
        mqttState.unit_power = data.unit_power != null ? Number(data.unit_power) : mqttState.unit_power
        mqttState.vibration = data.vibration != null ? Number(data.vibration) : mqttState.vibration
        mqttState.temperature = data.temperature != null ? Number(data.temperature) : mqttState.temperature
        mqttState.belt_tension = data.belt_tension != null ? Number(data.belt_tension) : mqttState.belt_tension
        mqttState.updatedAt = ts

        const paramMap = [
          ['vibration', data.vibration],
          ['temperature', data.temperature],
          ['power-consumption', data.unit_power],
          ['belt-tension', data.belt_tension],
          ['speed', data.speed],
          ['torque', data.torque]
        ]
        for (const [param, value] of paramMap) {
          if (value == null || typeof value !== 'number') continue
          const cfg = MQTT_PARAM_CONFIG[param]
          if (cfg) {
            const v = Math.round(Number(value) * 100) / 100
            liveTrendInsert.run(param, cfg.hl, cfg.ll, v, ts)
          }
        }

        if (data.fault != null && String(data.fault).trim() !== '' && data.fault !== lastFaultForAlarm) {
          lastFaultForAlarm = String(data.fault)
          alarmInsert.run('Critical', lastFaultForAlarm, 'active', ts)
        }
      } catch (e) {
        console.error('MQTT message parse error:', e.message)
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
    predClient.on('message', (topic, payload) => {
      try {
        const raw = payload.toString()
        const data = typeof raw === 'string' && raw.trim().startsWith('{') ? JSON.parse(raw) : { value: parseFloat(raw) || 0 }
        const ts = getLocalTimestamp()
        const iso = new Date().toISOString()
        predictiveDataBuffer.push({ timestamp: ts, iso, ...data })
        if (predictiveDataBuffer.length > PREDICTIVE_BUFFER_MAX) predictiveDataBuffer.shift()

        // Store numeric fields in live_trends only if NOT one of the main MQTT params.
        // Main topic (esp/live) is the single source for: vibration, temperature, power-consumption, belt-tension, speed, torque.
        const MAIN_MQTT_PARAMS = new Set(['vibration', 'temperature', 'power-consumption', 'belt-tension', 'speed', 'torque'])
        const skipKeys = new Set(['timestamp', 'iso'])
        for (const [key, val] of Object.entries(data)) {
          if (skipKeys.has(key)) continue
          let num = typeof val === 'number' ? val : parseFloat(val)
          if (Number.isNaN(num)) continue
          num = Math.round(num * 100) / 100
          const param = PREDICTIVE_PARAM_MAP[key] || key.replace(/_/g, '-')
          if (MAIN_MQTT_PARAMS.has(param)) continue
          const cfg = MQTT_PARAM_CONFIG[param]
          const hl = cfg ? cfg.hl : PREDICTIVE_DEFAULT_HL
          const ll = cfg ? cfg.ll : PREDICTIVE_DEFAULT_LL
          liveTrendInsert.run(param, hl, ll, num, ts)
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
