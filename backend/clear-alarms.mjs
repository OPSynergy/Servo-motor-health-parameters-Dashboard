/**
 * Clears all rows from the alarms table and drops the type column if present.
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

const cols = db.prepare('PRAGMA table_info(alarms)').all().map((c) => c.name)
if (cols.includes('type')) {
  db.exec('ALTER TABLE alarms DROP COLUMN type')
  console.log('Dropped type column from alarms.')
}

db.close()
