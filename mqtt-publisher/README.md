# MQTT Publisher Simulator

This is a Node.js-based MQTT publisher that simulates ESP NodeMCU devices publishing servo motor sensor data.

## Usage

1. Install dependencies:
```bash
npm install
```

2. Configure environment (copy `.env.example` to `.env` and edit)

3. Start the publisher:
```bash
npm start
```

## Features

- Simulates realistic sensor data with gradual variations
- Supports multiple devices
- Configurable publish interval
- Simulates anomalies (10% chance)
- Realistic value ranges for servo motors

## Sample Payload

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

## ESP NodeMCU Code

For actual ESP NodeMCU implementation, you would use the Arduino IDE with the following libraries:
- `WiFi.h` - WiFi connectivity
- `PubSubClient.h` - MQTT client
- Sensor libraries (temperature, vibration, current sensors)

The MQTT payload format remains the same as shown above.
