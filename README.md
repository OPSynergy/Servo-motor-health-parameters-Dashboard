# 🔧 Servo Motor Predictive Maintenance Dashboard

A complete full-stack IoT solution for monitoring servo motor health parameters in real-time, with predictive maintenance capabilities, built with Node.js, React, MQTT, MongoDB, and Socket.IO.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [MQTT Topic Structure](#mqtt-topic-structure)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Assumptions & Design Decisions](#assumptions--design-decisions)
- [Future Enhancements](#future-enhancements)

> **📖 Quick Links:**
> - [Local Setup Guide (No Docker)](SETUP_LOCAL.md) - Detailed step-by-step instructions
> - [Quick Start Guide](QUICKSTART.md) - Get running in 5 minutes

## ✨ Features

- **Real-time Monitoring**: Live sensor data visualization via Socket.IO
- **Historical Analysis**: Time-series charts with multiple time ranges (15m, 1h, 6h, 24h, 7d)
- **Predictive Maintenance**: 
  - Health score calculation based on multiple parameters
  - Threshold-based alerts (warning & critical)
  - Moving averages and trend analysis
  - Failure prediction with risk assessment
- **Multi-Device Support**: Monitor multiple servo motors simultaneously
- **Alert System**: Real-time alerts for anomalies and threshold violations
- **Modern UI**: Responsive dashboard with beautiful visualizations using Recharts
- **Scalable Architecture**: Modular design ready for ML integration

## 🏗️ Architecture

```
┌─────────────────┐
│  ESP NodeMCU     │  (or MQTT Publisher Simulator)
│  (MQTT Client)   │
└────────┬─────────┘
         │ MQTT
         ▼
┌─────────────────┐
│  MQTT Broker     │  (Mosquitto)
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Node.js Backend                │
│  - MQTT Subscriber              │
│  - Express REST API             │
│  - Socket.IO Server             │
│  - Predictive Maintenance Logic │
└────────┬────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ MongoDB │ │ React Frontend│
│ (Time-  │ │ (Vite + Recharts)│
│ Series) │ └──────────────┘
└─────────┘
```

## 📦 Prerequisites

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v6 or higher) - Install locally OR use MongoDB Atlas (free cloud option)
- **MQTT Broker** (Mosquitto recommended) - Install locally
- **npm** (comes with Node.js)

> **Note:** Docker is **NOT required**. You can run everything natively on your system.

### Installing MongoDB Locally

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb  # Auto-start on boot
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
- Download from [mongodb.com](https://www.mongodb.com/try/download/community)
- Install and start MongoDB service

**OR use MongoDB Atlas (Cloud - Free & Easy):**
1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/`)
4. Use it in `backend/.env` as `MONGODB_URI`

### Installing Mosquitto MQTT Broker

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto  # Auto-start on boot

# Test it works:
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

## 🚀 Installation

> **💡 New to this?** Check out [SETUP_LOCAL.md](SETUP_LOCAL.md) for a detailed step-by-step local setup guide (no Docker required).

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Servo-motor-health-parameters-Dashboard
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Install MQTT Publisher Dependencies

```bash
cd ../mqtt-publisher
npm install
```

## ⚙️ Configuration

### Backend Configuration

1. Copy the example environment file:
```bash
cd backend
cp .env.example .env
```

2. Edit `backend/.env` with your settings:
```env
PORT=3001
NODE_ENV=development

MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_TOPIC_PREFIX=servo-motor
MQTT_CLIENT_ID=backend-server

MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=servo_motor_db

# Thresholds (adjust based on your motor specifications)
TEMP_MAX_THRESHOLD=80
TEMP_WARNING_THRESHOLD=70
VIBRATION_MAX_THRESHOLD=5.0
VIBRATION_WARNING_THRESHOLD=3.5
CURRENT_MAX_THRESHOLD=10.0
CURRENT_WARNING_THRESHOLD=8.0
RPM_MAX_THRESHOLD=3000
RPM_WARNING_THRESHOLD=2800

# Health Score Weights (must sum to 1.0)
HEALTH_WEIGHT_TEMP=0.25
HEALTH_WEIGHT_VIBRATION=0.25
HEALTH_WEIGHT_CURRENT=0.25
HEALTH_WEIGHT_RPM=0.25
```

### Frontend Configuration

Create `frontend/.env` (optional, defaults work for local development):
```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

### MQTT Publisher Configuration

1. Copy the example environment file:
```bash
cd mqtt-publisher
cp .env.example .env
```

2. Edit `mqtt-publisher/.env`:
```env
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_TOPIC_PREFIX=servo-motor
PUBLISH_INTERVAL=5000
DEVICE_IDS=MOTOR-001,MOTOR-002
```

## 🏃 Running the Application

> **Note:** If you installed MongoDB and Mosquitto as services, they should already be running. Skip to Terminal 3.

### Terminal 1: Start MongoDB (if not running as service)

```bash
# Ubuntu/Debian (if not using systemd)
mongod

# macOS (if not using brew services)
mongod --config /usr/local/etc/mongod.conf

# Windows
# MongoDB should run as a service automatically after installation
```

**Verify MongoDB is running:**
```bash
mongosh
# Should connect successfully. Type 'exit' to quit.
```

### Terminal 2: Start MQTT Broker (if not running as service)

```bash
# Ubuntu/Debian (if not using systemd)
mosquitto -c /etc/mosquitto/mosquitto.conf

# macOS (if not using brew services)
mosquitto -c /usr/local/etc/mosquitto/mosquitto.conf

# Windows
# Mosquitto should run as a service automatically after installation
```

**Verify Mosquitto is running:**
```bash
mosquitto_sub -h localhost -t test -v
# If it waits without error, it's working! Press Ctrl+C to exit.
```

### Terminal 3: Start Backend Server

```bash
cd backend
npm start
# or for development with auto-reload:
npm run dev
```

You should see:
```
✅ Connected to MongoDB
✅ Connected to MQTT broker
📡 Subscribed to topic: servo-motor/+/data
🚀 Server running on http://localhost:3001
```

### Terminal 4: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:5173

### Terminal 5: Start MQTT Publisher (Simulator)

```bash
cd mqtt-publisher
npm start
```

You should see sensor data being published every 5 seconds.

## 📡 MQTT Topic Structure

The system uses the following MQTT topic pattern:

```
servo-motor/<deviceId>/data
```

**Example Topics:**
- `servo-motor/MOTOR-001/data`
- `servo-motor/MOTOR-002/data`

### MQTT Payload Format

```json
{
  "deviceId": "MOTOR-001",
  "temperature": 45.5,
  "vibration": 1.8,
  "current": 5.2,
  "rpm": 2500,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Field Descriptions:**
- `deviceId` (string, required): Unique device identifier
- `temperature` (number, required): Temperature in °C
- `vibration` (number, required): Vibration in g (gravitational acceleration)
- `current` (number, required): Current consumption in Amperes
- `rpm` (number, required): Rotations per minute
- `timestamp` (string, optional): ISO 8601 timestamp (defaults to server time if not provided)

## 🔌 API Endpoints

### Device Management

- `GET /api/devices` - Get all registered devices
- `GET /api/devices/:deviceId/latest` - Get latest sensor data for a device
- `GET /api/devices/:deviceId/data` - Get historical data
  - Query params: `limit` (default: 100), `startTime`, `endTime`
- `GET /api/devices/:deviceId/aggregated` - Get aggregated data for charts
  - Query params: `interval` (1m, 5m, 15m, 1h, 1d), `startTime`, `endTime`
- `GET /api/devices/:deviceId/prediction` - Get failure prediction
  - Query params: `limit` (default: 20)

### Alerts

- `GET /api/alerts/unresolved` - Get all unresolved alerts
- `GET /api/devices/:deviceId/alerts` - Get alerts for a device
  - Query params: `limit` (default: 50), `unresolvedOnly` (boolean)
- `POST /api/alerts/:alertId/resolve` - Resolve an alert

### Health Check

- `GET /api/health` - Server health status

## 📁 Project Structure

```
Servo-motor-health-parameters-Dashboard/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── models/
│   │   ├── SensorData.js        # Sensor data model
│   │   └── Alert.js             # Alert model
│   ├── routes/
│   │   └── api.js               # REST API routes
│   ├── services/
│   │   ├── mqttService.js       # MQTT subscriber service
│   │   └── predictiveMaintenance.js  # Health score & alerts
│   ├── server.js                # Express server + Socket.IO
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DeviceList.jsx
│   │   │   ├── DeviceDetail.jsx
│   │   │   ├── LiveMetrics.jsx
│   │   │   ├── HealthIndicator.jsx
│   │   │   ├── HistoricalCharts.jsx
│   │   │   └── AlertsPanel.jsx
│   │   ├── context/
│   │   │   └── SocketContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── mqtt-publisher/
│   ├── publisher.js             # MQTT publisher simulator
│   ├── package.json
│   └── .env.example
├── README.md
└── .gitignore
```

## 🎯 Assumptions & Design Decisions

### Assumptions

1. **MQTT Broker**: Assumes Mosquitto running on `localhost:1883` (configurable)
2. **MongoDB**: Assumes local MongoDB instance (configurable via connection string)
3. **Sensor Ranges**: Default thresholds are generic; should be adjusted for specific motor models
4. **Data Frequency**: Assumes sensor data published every 5 seconds (configurable)
5. **Device IDs**: Assumes device IDs follow the pattern `MOTOR-XXX` (configurable)

### Design Decisions

1. **Health Score Algorithm**: Weighted average of normalized sensor values (0-100 scale)
   - Each parameter normalized to 0-100 based on thresholds
   - Configurable weights allow customization
   - RPM uses optimal range approach (penalizes extremes)

2. **Alert System**: Two-tier (warning & critical) based on configurable thresholds
   - Prevents alert fatigue
   - Allows proactive maintenance

3. **Data Aggregation**: MongoDB aggregation pipeline for efficient time-series queries
   - Supports multiple time intervals
   - Reduces data transfer for charts

4. **Real-time Updates**: Socket.IO for bidirectional communication
   - Low latency updates
   - Device-specific subscriptions

5. **Modular Architecture**: Separation of concerns
   - Easy to extend with ML models
   - Testable components
   - Scalable design

## 🔮 Future Enhancements

### Machine Learning Integration

- **Anomaly Detection**: Train ML models on historical data to detect unusual patterns
- **Predictive Models**: LSTM/RNN for failure prediction based on trends
- **Auto-threshold Tuning**: ML-based dynamic threshold adjustment

### Additional Features

- **User Authentication**: Secure access with role-based permissions
- **Device Management UI**: Add/remove devices, configure thresholds
- **Export Functionality**: CSV/PDF reports for maintenance logs
- **Mobile App**: React Native app for on-the-go monitoring
- **Notification System**: Email/SMS alerts for critical issues
- **Dashboard Customization**: User-configurable widgets and layouts
- **Multi-tenant Support**: Support for multiple organizations
- **Data Retention Policies**: Automatic archival of old data

### Performance Optimizations

- **Redis Caching**: Cache frequently accessed data
- **Time-series Database**: Consider InfluxDB for better time-series performance
- **Horizontal Scaling**: Load balancing for multiple backend instances
- **WebSocket Compression**: Reduce bandwidth usage

## 🐛 Troubleshooting

### Backend won't connect to MQTT

- Verify Mosquitto is running: `mosquitto -v`
- Check MQTT_BROKER_URL in `.env`
- Test connection: `mosquitto_sub -h localhost -t servo-motor/+/data`

### MongoDB connection errors

- Verify MongoDB is running: `mongosh` or `mongo`
- Check MONGODB_URI in `.env`
- Ensure MongoDB is accessible (firewall, network)

### Frontend can't connect to backend

- Verify backend is running on port 3001
- Check CORS settings in `backend/server.js`
- Verify proxy configuration in `frontend/vite.config.js`

### No data appearing in dashboard

- Verify MQTT publisher is running and publishing
- Check MQTT topic matches: `servo-motor/<deviceId>/data`
- Verify backend is subscribed to correct topic
- Check browser console for errors

## 📝 License

ISC

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on the repository.

---

**Built with ❤️ for IoT Predictive Maintenance**
