import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

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
    // For 8hrs, show all data, for others limit to 100
    if (minutes === 480) {
      query += ' ORDER BY timestamp DESC'
    } else {
      query += ' ORDER BY timestamp DESC LIMIT 100'
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

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Database file: ${dbPath}`)

  // Simulate live trend data for all 6 parameters so Data Logs and Live Trends show every parameter
  const PARAMETERS = ['vibration', 'temperature', 'power-consumption', 'belt-tension', 'speed', 'torque']
  const SIM_CONFIG = {
    vibration: { hl: 80, ll: 30, min: 25, max: 75 },
    temperature: { hl: 85, ll: 35, min: 38, max: 82 },
    'power-consumption': { hl: 75, ll: 25, min: 28, max: 72 },
    'belt-tension': { hl: 90, ll: 40, min: 45, max: 85 },
    speed: { hl: 95, ll: 20, min: 25, max: 90 },
    torque: { hl: 90, ll: 25, min: 28, max: 85 }
  }
  const randBetween = (min, max) => min + Math.random() * (max - min)
  setInterval(() => {
    try {
      const ts = getLocalTimestamp()
      for (const param of PARAMETERS) {
        const cfg = SIM_CONFIG[param]
        const value = Math.round(randBetween(cfg.min, cfg.max) * 100) / 100
        liveTrendInsert.run(param, cfg.hl, cfg.ll, value, ts)
      }
    } catch (e) {
      console.error('Live trend simulator error:', e.message)
    }
  }, 5000)
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
