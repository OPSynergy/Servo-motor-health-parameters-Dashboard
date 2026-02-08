# Project Structure

This project is organized into separate `frontend` and `backend` directories for better organization and independent development.

## Directory Structure

```
Servo-motor-health-parameters-Dashboard/
├── frontend/              # React + Vite frontend application
│   ├── src/              # Source code
│   ├── public/             # Public assets
│   ├── index.html         # HTML entry point
│   ├── vite.config.js     # Vite configuration
│   └── package.json       # Frontend dependencies
│
├── backend/               # Node.js + Express backend
│   ├── index.js           # Server entry point
│   ├── motor.db           # SQLite database
│   └── package.json       # Backend dependencies
│
└── package.json           # Root package.json (convenience scripts)
```

## Setup Instructions

### 1. Install All Dependencies

From the root directory:
```bash
npm run install:all
```

Or install separately:
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Running the Application

#### Option 1: Run Both Together (Recommended)
From the root directory:
```bash
npm run dev:full
```

This starts both backend (port 3001) and frontend (port 5173) simultaneously.

#### Option 2: Run Separately (Different Terminals)

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

#### Option 3: Using Root Scripts

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

## Available Scripts

### Root Level
- `npm run install:all` - Install all dependencies (root, frontend, backend)
- `npm run dev:frontend` - Start frontend development server
- `npm run dev:backend` - Start backend server
- `npm run dev:full` - Start both frontend and backend together
- `npm run build` - Build frontend for production

### Frontend (`frontend/` directory)
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend (`backend/` directory)
- `npm run dev` - Start Express server
- `npm start` - Start Express server (production)

## Ports

- **Frontend**: http://localhost:5173 (Vite default)
- **Backend API**: http://localhost:3001

## Development Workflow

1. **First Time Setup:**
   ```bash
   npm run install:all
   ```

2. **Daily Development:**
   - Option A: `npm run dev:full` (single terminal)
   - Option B: Run `npm run dev:backend` and `npm run dev:frontend` in separate terminals

3. **Building for Production:**
   ```bash
   npm run build
   ```

## Notes

- Each directory has its own `package.json` and `node_modules`
- Database file (`motor.db`) is stored in `backend/` directory
- Frontend API calls are configured to connect to `http://localhost:3001`
- Make sure backend is running before frontend tries to connect
