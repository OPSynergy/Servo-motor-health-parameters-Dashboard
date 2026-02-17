/**
 * Clears all rows from live_trends table. Run from backend dir: node clear-live-trends.mjs
 */
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'motor.db')
const db = new Database(dbPath)

const result = db.prepare('DELETE FROM live_trends').run()
console.log('Deleted', result.changes, 'rows from live_trends. Database is ready for fresh entries from today.')
db.close()
