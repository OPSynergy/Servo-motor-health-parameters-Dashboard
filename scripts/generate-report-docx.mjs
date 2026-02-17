/**
 * Generates PROJECT_REPORT.docx from the project report content.
 * Run from repo root: node scripts/generate-report-docx.mjs
 * Requires: npm install docx (in project root)
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

const normal = (text) => new Paragraph({ children: [new TextRun({ text })] })
const heading1 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } })
const heading2 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { after: 160 } })
const heading3 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { after: 120 } })
const bold = (text) => new Paragraph({ children: [new TextRun({ text, bold: true })] })

function tableFromRows(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE },
      bottom: { style: BorderStyle.SINGLE },
      left: { style: BorderStyle.SINGLE },
      right: { style: BorderStyle.SINGLE },
    },
    rows: rows.map((cells) => new TableRow({
      children: cells.map((text) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(text) })] })],
      })),
    })),
  })
}

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({ text: 'Servo Motor Health Parameters Dashboard', heading: HeadingLevel.TITLE, alignment: 'center' }),
      new Paragraph({ text: 'Project Report', heading: HeadingLevel.HEADING_1, alignment: 'center' }),
      new Paragraph({ text: 'Document Version: 1.0', alignment: 'center' }),
      new Paragraph({ text: 'Date: February 14, 2026', alignment: 'center' }),
      new Paragraph({ text: '' }),

      heading1('1. Executive Summary'),
      normal('The Servo Motor Health Parameters Dashboard is a full-stack web application for monitoring and visualizing servo motor health metrics in real time. It provides motor setup management, live parameter trends (vibration, temperature, power consumption, belt tension, speed, torque), and historical data logs with status highlighting.'),
      normal('Real-time data is displayed using MQTT (Message Queuing Telemetry Transport), enabling live updates from sensors and equipment to the dashboard. The system uses a React frontend, Node.js/Express backend, and SQLite database, with a modern UI including a 3D background and collapsible sidebar.'),

      heading1('2. Technology Stack'),
      heading2('2.1 Frontend'),
      tableFromRows([
        ['Technology', 'Version / Purpose'],
        ['React', '18.2.0 – UI framework'],
        ['Vite', '7.x – Build tool and dev server'],
        ['Chart.js', '4.5.x – Charts and graphs'],
        ['react-chartjs-2', '5.3.x – React bindings for Chart.js'],
        ['chartjs-plugin-zoom', '2.2.x – Zoom and pan on charts'],
        ['Three.js', '0.182.x – 3D background (Hero3D)'],
        ['@react-three/fiber', '8.15.x – React renderer for Three.js'],
        ['@react-three/drei', '9.122.x – Three.js helpers'],
        ['react-icons', '4.12.x – Icon set'],
        ['Lucide React', '0.563.x – Additional icons'],
      ]),
      heading2('2.2 Backend'),
      tableFromRows([
        ['Technology', 'Version / Purpose'],
        ['Node.js', 'Runtime'],
        ['Express', '4.21.x – HTTP API server'],
        ['better-sqlite3', '11.7.x – SQLite database driver'],
        ['cors', '2.8.x – Cross-origin resource sharing'],
      ]),
      heading2('2.3 Database'),
      tableFromRows([
        ['Component', 'Description'],
        ['SQLite', 'File-based database (motor.db)'],
        ['Tables', 'motor_setup, live_trends (with indexes)'],
      ]),
      heading2('2.4 Development & Tooling'),
      tableFromRows([
        ['Tool', 'Purpose'],
        ['concurrently', 'Run frontend and backend (npm run dev:full)'],
      ]),

      heading1('3. Real-Time Data: MQTT'),
      bold('MQTT is used for displaying real-time data on the dashboard.'),
      normal('Sensor and motor data are published to an MQTT broker; the backend or a dedicated service subscribes to these topics and persists or forwards the data. The dashboard shows live parameter values (vibration, temperature, power consumption, belt tension, speed, torque) and updates the Live Trends graphs as new MQTT messages arrive. This design ensures low-latency, scalable real-time monitoring suitable for industrial environments.'),

      heading1('4. Features of the Dashboard'),
      heading2('4.1 Navigation & Layout'),
      normal('• Collapsible sidebar – Transparent sidebar that collapses to icons only.'),
      normal('• 3D background (Hero3D) – Three.js-based background.'),
      normal('• Live status indicator – Top-right connection/live state.'),
      heading2('4.2 Motor Setup'),
      normal('• Motor model dropdown – HK, HG, HF, HF-KP, LM-F, TM-RB series.'),
      normal('• Motor name and rating – Name and High Level / Low Level.'),
      normal('• Model-based images – Each model has an associated image from assets.'),
      normal('• CRUD operations – Create, read, update, delete motor configurations; data in SQLite motor_setup.'),
      heading2('4.3 Live Data Trends'),
      normal('• Parameter types – Vibration, Temperature, Power Consumption, Belt Tension, Speed, Torque.'),
      normal('• Time scaling – 15 min, 30 min, 1 hr, 4 hr, 8 hr.'),
      normal('• Time window filter – Start/end date-time and "Today".'),
      normal('• Search and Clear – Apply filters and clear.'),
      normal('• Zoom and pan – Chart.js zoom plugin on time-series.'),
      normal('• Graph-only view – No data table; focus on visualization.'),
      heading2('4.4 Data Logs'),
      normal('• Tabular view – Table with solid borders, center-aligned values.'),
      normal('• Parameter filter and date/time pickers.'),
      normal('• Status column – Critical / Warning / Normal; only near-high and above-high values highlighted (e.g. dark red/orange).'),
      heading2('4.5 Other Pages'),
      normal('• Home – Overview and quick stats. Motor Health – Detailed metrics. Alarms – Real-time alarms. Maintenance – Schedule and tasks. Settings – Configuration.'),

      heading1('5. System Architecture Diagram'),
      normal('The following is a text representation of the system architecture. For visual Mermaid diagrams, see PROJECT_REPORT.md.'),
      normal(''),
      normal('• Client (Browser): React Frontend → Sidebar, Live Trends Graph, Data Logs, Motor Setup.'),
      normal('• Backend (Node.js): Express API → Motors CRUD, Live Trends API, Data Logs API.'),
      normal('• Data Layer: SQLite (motor.db) → motor_setup, live_trends.'),
      normal('• External: Sensors publish to MQTT Broker; Backend subscribes. Frontend communicates with API via REST/polling.'),

      heading1('6. Data Flow (Real-Time Path)'),
      normal('Sensors/Motors → publish → MQTT Broker → subscribe → Backend/MQTT Client → persist → SQLite (live_trends). Frontend fetches via REST from Express API and displays Charts / Live Trends.'),

      heading1('7. User Flow: Live Trends'),
      normal('User opens Live Data Trends → Select parameter type → Choose time scale (15m–8h) → Optionally set time window (start/end or Today) → Click Search → API returns historical trends → Graph renders with zoom/pan → User can Clear or change filters.'),

      heading1('8. Database Schema'),
      heading2('8.1 motor_setup'),
      normal('id (PK), name, model, type, voltage, high_level, low_level, image_url, is_default, created_at, updated_at.'),
      heading2('8.2 live_trends'),
      normal('id (PK), parameter, high_level, low_level, current_value, timestamp. Index on (parameter, timestamp).'),

      heading1('9. API Overview'),
      tableFromRows([
        ['Method', 'Endpoint', 'Description'],
        ['GET', '/api/motors', 'List all motors'],
        ['GET', '/api/motors/:id', 'Get one motor'],
        ['POST', '/api/motors', 'Create motor'],
        ['PUT', '/api/motors/:id', 'Update motor'],
        ['DELETE', '/api/motors/:id', 'Delete motor (non-default only)'],
        ['POST', '/api/live-trends', 'Save one live trend sample'],
        ['GET', '/api/live-trends', 'Get live trends (parameter, limit)'],
        ['GET', '/api/live-trends/latest', 'Latest value per parameter'],
        ['GET', '/api/live-trends/historical', 'Historical by minutesAgo, parameter, afterTimestamp'],
        ['DELETE', '/api/live-trends', 'Delete trends for a parameter'],
      ]),

      heading1('10. Conclusion'),
      normal('The Servo Motor Health Parameters Dashboard delivers motor setup management, real-time data display via MQTT, live trend visualization with time scaling and zoom/pan, and data logs with status highlighting. The tech stack (React, Vite, Chart.js, Three.js, Node.js, Express, SQLite) supports a modern, responsive UI and scalable backend.'),
      new Paragraph({ text: 'End of Report', alignment: 'center' }),
    ],
  }],
})

const buffer = await Packer.toBuffer(doc)
const outPath = path.join(rootDir, 'PROJECT_REPORT.docx')
fs.writeFileSync(outPath, buffer)
console.log('Written:', outPath)
