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
      type TEXT NOT NULL,
      voltage TEXT NOT NULL,
      image_url TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
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
      type: motor.type,
      voltage: motor.voltage,
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
      type: motor.type,
      voltage: motor.voltage,
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
    const { name, type, voltage, imageUrl } = req.body
    
    if (!name || !type || !voltage || !imageUrl) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const insert = db.prepare(`
      INSERT INTO motor_setup (name, type, voltage, image_url, is_default)
      VALUES (?, ?, ?, ?, 0)
    `)
    
    const result = insert.run(name, type, voltage, imageUrl)
    
    // Fetch the created motor
    const motor = db.prepare('SELECT * FROM motor_setup WHERE id = ?').get(result.lastInsertRowid)
    
    res.status(201).json({
      id: motor.id.toString(),
      name: motor.name,
      type: motor.type,
      voltage: motor.voltage,
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
    const { name, type, voltage, imageUrl } = req.body
    const motorId = req.params.id
    
    if (!name || !type || !voltage || !imageUrl) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const update = db.prepare(`
      UPDATE motor_setup 
      SET name = ?, type = ?, voltage = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    
    const result = update.run(name, type, voltage, imageUrl, motorId)
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Motor not found' })
    }
    
    // Fetch the updated motor
    const motor = db.prepare('SELECT * FROM motor_setup WHERE id = ?').get(motorId)
    
    res.json({
      id: motor.id.toString(),
      name: motor.name,
      type: motor.type,
      voltage: motor.voltage,
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

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Database file: ${dbPath}`)
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
