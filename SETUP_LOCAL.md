# 🖥️ Local Setup Guide (No Docker Required)

This guide will help you set up the Servo Motor Dashboard **without Docker**, running everything natively on your laptop.

## Step-by-Step Installation

### 1. Install Node.js

Download and install Node.js 18+ from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version  # Should show v18 or higher
npm --version
```

### 2. Install MongoDB

#### Option A: Local Installation

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
- Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
- Run the installer
- MongoDB will start as a Windows service automatically

#### Option B: MongoDB Atlas (Cloud - Recommended for Beginners)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free account
3. Create a free cluster (M0 - Free tier)
4. Create a database user (remember username/password)
5. Add your IP to whitelist (or use 0.0.0.0/0 for development)
6. Click "Connect" → "Connect your application"
7. Copy the connection string (looks like: `mongodb+srv://user:pass@cluster.mongodb.net/`)
8. Use this in `backend/.env` as `MONGODB_URI`

**Advantages of Atlas:**
- No local installation needed
- Free tier available
- Automatic backups
- Works from anywhere

### 3. Install Mosquitto MQTT Broker

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y mosquitto mosquitto-clients

# Start and enable auto-start
sudo systemctl start mosquitto
sudo systemctl enable mosquitto

# Test it works
mosquitto_sub -h localhost -t test -v
# In another terminal: mosquitto_pub -h localhost -t test -m "hello"
# You should see "hello" in the first terminal
```

**macOS:**
```bash
brew install mosquitto
brew services start mosquitto

# Test it works
mosquitto_sub -h localhost -t test -v
```

**Windows:**
1. Download from [mosquitto.org/download](https://mosquitto.org/download/)
2. Run the installer
3. Mosquitto will start as a Windows service
4. Test with: `mosquitto_sub -h localhost -t test -v`

### 4. Clone/Download the Project

```bash
cd ~/your-projects-folder
# If using git:
git clone <repository-url>
cd Servo-motor-health-parameters-Dashboard

# Or extract the downloaded zip file
```

### 5. Install Project Dependencies

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
cd ..
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

**MQTT Publisher:**
```bash
cd mqtt-publisher
npm install
cp .env.example .env
cd ..
```

### 6. Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=3001
NODE_ENV=development

MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_TOPIC_PREFIX=servo-motor
MQTT_CLIENT_ID=backend-server

# If using local MongoDB:
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=servo_motor_db

# If using MongoDB Atlas, replace with your connection string:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/servo_motor_db?retryWrites=true&w=majority

# Thresholds (adjust as needed)
TEMP_MAX_THRESHOLD=80
TEMP_WARNING_THRESHOLD=70
VIBRATION_MAX_THRESHOLD=5.0
VIBRATION_WARNING_THRESHOLD=3.5
CURRENT_MAX_THRESHOLD=10.0
CURRENT_WARNING_THRESHOLD=8.0
RPM_MAX_THRESHOLD=3000
RPM_WARNING_THRESHOLD=2800

HEALTH_WEIGHT_TEMP=0.25
HEALTH_WEIGHT_VIBRATION=0.25
HEALTH_WEIGHT_CURRENT=0.25
HEALTH_WEIGHT_RPM=0.25
```

**MQTT Publisher (`mqtt-publisher/.env`):**
```env
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_TOPIC_PREFIX=servo-motor
PUBLISH_INTERVAL=5000
DEVICE_IDS=MOTOR-001,MOTOR-002
```

### 7. Start the Application

You'll need **3 terminal windows**:

#### Terminal 1: Backend Server
```bash
cd backend
npm start
```

Wait for:
```
✅ Connected to MongoDB
✅ Connected to MQTT broker
🚀 Server running on http://localhost:3001
```

#### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

You'll see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

#### Terminal 3: MQTT Publisher (Simulator)
```bash
cd mqtt-publisher
npm start
```

You'll see sensor data being published:
```
📊 [MOTOR-001] Temp: 45.5°C, Vib: 1.8g, Current: 5.2A, RPM: 2500
```

### 8. Open the Dashboard

Open your browser and go to: **http://localhost:5173**

You should see:
- Device list on the left
- Live metrics and charts in the center
- Alerts panel on the right

## Troubleshooting

### MongoDB Connection Issues

**Local MongoDB:**
```bash
# Check if MongoDB is running
sudo systemctl status mongodb  # Ubuntu/Debian
brew services list | grep mongodb  # macOS

# Check if MongoDB is listening on port 27017
netstat -an | grep 27017  # Linux/macOS
```

**MongoDB Atlas:**
- Verify your IP is whitelisted
- Check username/password in connection string
- Ensure cluster is running (not paused)

### Mosquitto Connection Issues

```bash
# Check if Mosquitto is running
sudo systemctl status mosquitto  # Ubuntu/Debian
brew services list | grep mosquitto  # macOS

# Test MQTT connection
mosquitto_sub -h localhost -t servo-motor/+/data -v
# Should wait without errors
```

### Port Already in Use

If port 3001 (backend) or 5173 (frontend) is in use:

**Backend:** Change `PORT` in `backend/.env`

**Frontend:** Vite will automatically use next available port, or change in `frontend/vite.config.js`

### No Data in Dashboard

1. Verify MQTT publisher is running and publishing
2. Check backend terminal for "📊 Processed data" messages
3. Check browser console (F12) for errors
4. Verify Socket.IO connection (should see "Connected" in browser console)

## Quick Verification Checklist

- [ ] Node.js installed (`node --version`)
- [ ] MongoDB running (local or Atlas)
- [ ] Mosquitto running (`mosquitto_sub -h localhost -t test -v` works)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Frontend dependencies installed (`cd frontend && npm install`)
- [ ] MQTT publisher dependencies installed (`cd mqtt-publisher && npm install`)
- [ ] Backend `.env` configured
- [ ] MQTT publisher `.env` configured
- [ ] Backend server running (Terminal 1)
- [ ] Frontend dev server running (Terminal 2)
- [ ] MQTT publisher running (Terminal 3)
- [ ] Dashboard opens at http://localhost:5173

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize thresholds in `backend/.env` for your specific motors
- Add more devices in `mqtt-publisher/.env`
- Explore the API endpoints at http://localhost:3001/api

---

**That's it! You're running everything locally without Docker! 🎉**
