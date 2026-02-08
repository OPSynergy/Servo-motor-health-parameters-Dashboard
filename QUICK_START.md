# Quick Start Guide

## Project Structure

The project is now organized into separate `frontend` and `backend` directories:

```
├── frontend/     # React + Vite application
├── backend/      # Node.js + Express API server
└── package.json  # Root convenience scripts
```

## First Time Setup

```bash
# Install all dependencies
npm run install:all
```

## Running the Application

### Option 1: Run Both Together (Single Terminal)
```bash
npm run dev:full
```

### Option 2: Run Separately (Different Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Option 3: Using Root Scripts (Different Terminals)

**Terminal 1:**
```bash
npm run dev:backend
```

**Terminal 2:**
```bash
npm run dev:frontend
```

## Ports

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Important Notes

⚠️ **Always start the backend server first** before starting the frontend, or use `npm run dev:full` to start both together.

The frontend will show connection errors if the backend is not running.

## Troubleshooting

### Backend not starting
- Check if port 3001 is available
- Ensure dependencies are installed: `cd backend && npm install`

### Frontend not starting
- Check if port 5173 is available
- Ensure dependencies are installed: `cd frontend && npm install`

### Connection refused errors
- Make sure backend is running on port 3001
- Check `frontend/src/services/motorApi.js` has correct API URL
