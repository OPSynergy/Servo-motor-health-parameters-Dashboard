# Database Setup - Motor Setup Application

## Overview
The application now uses SQLite database (`motor.db`) instead of localStorage for storing motor data.

## Database Structure

### Database File
- **Location**: `server/motor.db`
- **Type**: SQLite3

### Table: `motor_setup`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-increment |
| name | TEXT | Motor name (required) |
| type | TEXT | Motor type (Servo, Stepper, DC, Brushless) |
| voltage | TEXT | Motor voltage (required) |
| image_url | TEXT | Image URL or data URL (required) |
| is_default | INTEGER | 1 for default motors, 0 for user-added |
| created_at | DATETIME | Timestamp when motor was created |
| updated_at | DATETIME | Timestamp when motor was last updated |

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `express` - Web server framework
- `better-sqlite3` - SQLite database driver
- `cors` - Cross-origin resource sharing
- `concurrently` - Run multiple commands simultaneously

### 2. Start the Application

#### Option A: Run Both Server and Frontend Together
```bash
npm run dev:full
```

#### Option B: Run Separately

**Terminal 1 - Start Backend Server:**
```bash
npm run server
```

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```

### 3. Database Initialization

The database is automatically created and initialized when the server starts:
- Database file: `server/motor.db`
- Table `motor_setup` is created automatically
- Default motors are inserted if the table is empty

## API Endpoints

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### GET `/api/motors`
Get all motors
- **Response**: Array of motor objects

#### GET `/api/motors/:id`
Get single motor by ID
- **Response**: Motor object

#### POST `/api/motors`
Create new motor
- **Body**: `{ name, type, voltage, imageUrl }`
- **Response**: Created motor object

#### PUT `/api/motors/:id`
Update existing motor
- **Body**: `{ name, type, voltage, imageUrl }`
- **Response**: Updated motor object

#### DELETE `/api/motors/:id`
Delete motor
- **Response**: Success message
- **Note**: Cannot delete default motors (is_default = 1)

## Frontend Changes

### Removed
- ❌ localStorage usage
- ❌ Default motors hardcoded in component

### Added
- ✅ API service (`src/services/motorApi.js`)
- ✅ Database integration
- ✅ Loading and error states
- ✅ Async/await for API calls

## Data Flow

1. **Load Motors**: Component fetches from `/api/motors` on mount
2. **Add Motor**: POST to `/api/motors` → Updates local state
3. **Edit Motor**: PUT to `/api/motors/:id` → Updates local state
4. **Delete Motor**: DELETE to `/api/motors/:id` → Removes from local state

## Database File Location

The database file is created at:
```
server/motor.db
```

You can inspect the database using SQLite tools:
```bash
sqlite3 server/motor.db
.tables
SELECT * FROM motor_setup;
```

## Troubleshooting

### Server not starting
- Check if port 3001 is available
- Ensure all dependencies are installed: `npm install`

### Database errors
- Check if `server/` directory exists
- Verify write permissions in the project directory

### CORS errors
- Ensure backend server is running on port 3001
- Check that CORS is enabled in server configuration

### Frontend can't connect
- Verify server is running: `http://localhost:3001/api/motors`
- Check browser console for errors
- Ensure API_BASE_URL in `motorApi.js` matches server port
