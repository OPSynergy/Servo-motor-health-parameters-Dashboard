# Troubleshooting Guide

## Common Issues and Solutions

### Port Already in Use Error (EADDRINUSE)

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**

1. **Find and kill the process using port 3001:**
   ```bash
   lsof -ti:3001 | xargs kill -9
   ```

2. **Or find the process manually:**
   ```bash
   lsof -i:3001
   # Then kill the process using: kill -9 <PID>
   ```

3. **Or use a different port:**
   ```bash
   PORT=3002 npm run dev
   ```

### Backend Server Not Starting

**Check:**
- Ensure dependencies are installed: `cd backend && npm install`
- Check if port 3001 is available
- Verify database file permissions

**Solution:**
```bash
cd backend
npm install
npm run dev
```

### Frontend Can't Connect to Backend

**Error:**
```
Failed to fetch
ERR_CONNECTION_REFUSED
```

**Solution:**
1. Make sure backend is running first
2. Check backend is on port 3001: `curl http://localhost:3001/api/motors`
3. Verify API URL in `frontend/src/services/motorApi.js`

### Database Errors

**Check:**
- Database file exists: `backend/motor.db`
- File permissions are correct
- Server has write access to backend directory

**Solution:**
```bash
cd backend
# Database will be created automatically on first run
npm run dev
```

### Module Not Found Errors

**Solution:**
```bash
# Install all dependencies
npm run install:all

# Or install separately
cd frontend && npm install
cd ../backend && npm install
```

### Concurrently Not Found

**Solution:**
```bash
npm install
```

This installs concurrently in the root directory for the `dev:full` script.
