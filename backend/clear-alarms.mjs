/**
 * Clears all rows from the alarms table.
 * Run from project root: node backend/clear-alarms.mjs
 */

import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'motor.db')
const db = new Database(dbPath)

const result = db.prepare('DELETE FROM alarms').run()
console.log('Deleted', result.changes, 'rows from alarms.')
db.close()
