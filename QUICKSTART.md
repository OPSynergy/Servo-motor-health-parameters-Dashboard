# 🚀 Quick Start Guide

Get the Servo Motor Dashboard up and running in 5 minutes!

## Option 1: Local Setup (Recommended - No Docker Required)

### Prerequisites
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **MongoDB** - Install locally or use MongoDB Atlas (free cloud option)
- **Mosquitto MQTT Broker** - Install locally

### Install MongoDB Locally

**Ubuntu/Debian:**
```bash
# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb  # Auto-start on boot
```

**macOS:**
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

**Windows:**
- Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
- Install and start MongoDB service from Services panel

**OR use MongoDB Atlas (Cloud - Free):**
- Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Create a free cluster
- Get connection string and use it in `backend/.env` as `MONGODB_URI`

### Install Mosquitto MQTT Broker

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y mosquitto mosquitto-clients

# Start Mosquitto service
sudo systemctl start mosquitto
sudo systemctl enable mosquitto  # Auto-start on boot

# Test it works
mosquitto_sub -h localhost -t test -v
# In another terminal: mosquitto_pub -h localhost -t test -m "hello"
```

**macOS:**
```bash
brew install mosquitto
brew services start mosquitto
```

**Windows:**
- Download from [mosquitto.org/download](https://mosquitto.org/download/)
- Install and start as Windows service

### Setup Steps

1. **Install Backend Dependencies:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env if needed (defaults work for local setup)
cd ..
```

2. **Install Frontend Dependencies:**
```bash
cd frontend
npm install
cd ..
```

3. **Install MQTT Publisher Dependencies:**
```bash
cd mqtt-publisher
npm install
cp .env.example .env
# Edit .env if needed (defaults work for local setup)
cd ..
```

4. **Start Backend (Terminal 1):**
```bash
cd backend
npm start
```
You should see:
```
✅ Connected to MongoDB
✅ Connected to MQTT broker
🚀 Server running on http://localhost:3001
```

5. **Start Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```
Frontend will be available at: http://localhost:5173

6. **Start MQTT Publisher (Terminal 3):**
```bash
cd mqtt-publisher
npm start
```
You should see sensor data being published every 5 seconds.

7. **Open Browser:**
Navigate to http://localhost:5173 and you should see the dashboard!

## Option 2: Using Docker (Optional - If you prefer containers)

### Prerequisites
- Docker and Docker Compose installed

### Steps

1. **Start MongoDB and MQTT Broker:**
```bash
docker-compose up -d
```

2. **Follow steps 1-7 from Option 1 above**

## Verify Setup

1. **Check MongoDB:**
```bash
mongosh
# Should connect successfully
```

2. **Check MQTT:**
```bash
mosquitto_sub -h localhost -t servo-motor/+/data -v
# Should wait for messages (start publisher to see data)
```

3. **Check Backend:**
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok",...}
```

## Troubleshooting

- **Port already in use?** Change ports in `.env` files
- **MongoDB connection failed?** Ensure MongoDB is running and accessible
- **MQTT connection failed?** Ensure Mosquitto is running on port 1883
- **No data in dashboard?** Ensure MQTT publisher is running and publishing

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize thresholds in `backend/.env`
- Add more devices in `mqtt-publisher/.env`
