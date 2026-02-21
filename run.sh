#!/bin/bash

# Servo Motor Health Parameters Dashboard - Startup Script

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Servo Motor Health Parameters Dashboard..."
echo "Project directory: $PROJECT_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "$PROJECT_DIR/backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd "$PROJECT_DIR/backend" && npm install
fi

if [ ! -d "$PROJECT_DIR/frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd "$PROJECT_DIR/frontend" && npm install
fi

# Start backend server in background
echo "Starting backend server..."
cd "$PROJECT_DIR/backend" && node index.js &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start frontend dev server
echo "Starting frontend dev server..."
cd "$PROJECT_DIR/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "Dashboard is starting up!"
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:5000"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C to kill both processes
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for processes
wait
