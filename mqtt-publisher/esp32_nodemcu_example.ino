/*
 * ESP NodeMCU Servo Motor Sensor Data Publisher
 * 
 * This code publishes sensor data from a servo motor to an MQTT broker.
 * 
 * Required Libraries:
 * - WiFi (built-in)
 * - PubSubClient (install via Library Manager)
 * - DHT sensor library (if using DHT temperature sensor)
 * - Wire (built-in, for I2C sensors)
 * 
 * Hardware Connections (example):
 * - Temperature: DHT22 on pin D4
 * - Vibration: ADXL345 accelerometer via I2C (SDA=D2, SCL=D1)
 * - Current: ACS712 current sensor on analog pin A0
 * - RPM: Hall effect sensor on pin D5 (interrupt)
 */

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Configuration
const char* mqtt_server = "YOUR_MQTT_BROKER_IP";  // e.g., "192.168.1.100"
const int mqtt_port = 1883;
const char* mqtt_topic_prefix = "servo-motor";
const char* device_id = "MOTOR-001";  // Change for each device

WiFiClient espClient;
PubSubClient client(espClient);

// Sensor Pins
const int TEMP_PIN = D4;        // DHT22 temperature sensor
const int CURRENT_PIN = A0;     // ACS712 current sensor
const int RPM_PIN = D5;         // Hall effect sensor for RPM

// Sensor Variables
float temperature = 25.0;
float vibration = 1.0;
float current = 5.0;
int rpm = 2500;

// RPM Measurement
volatile int rpmCount = 0;
unsigned long lastRpmTime = 0;

// Timing
unsigned long lastPublish = 0;
const unsigned long publishInterval = 5000;  // Publish every 5 seconds

void setup() {
  Serial.begin(115200);
  delay(100);
  
  // Initialize pins
  pinMode(RPM_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(RPM_PIN), rpmInterrupt, FALLING);
  
  // Connect to WiFi
  setup_wifi();
  
  // Connect to MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  Serial.println("ESP NodeMCU Servo Motor Monitor Ready");
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Read sensors
  readSensors();
  
  // Publish data at interval
  unsigned long now = millis();
  if (now - lastPublish >= publishInterval) {
    publishSensorData();
    lastPublish = now;
  }
  
  delay(100);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Handle incoming MQTT messages if needed
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

void readSensors() {
  // Read Temperature (example with DHT22)
  // Uncomment and configure if using DHT sensor:
  // temperature = dht.readTemperature();
  
  // Simulated temperature reading (replace with actual sensor)
  temperature = 25.0 + random(0, 60);  // 25-85°C
  
  // Read Vibration (example with ADXL345)
  // Uncomment and configure if using accelerometer:
  // vibration = readAccelerometer();
  
  // Simulated vibration reading (replace with actual sensor)
  vibration = 0.5 + (random(0, 550) / 100.0);  // 0.5-6.0 g
  
  // Read Current (ACS712 - 5A version)
  int sensorValue = analogRead(CURRENT_PIN);
  float voltage = (sensorValue / 1024.0) * 5.0;  // Convert to voltage
  current = ((voltage - 2.5) / 0.185);  // ACS712 formula (adjust for your sensor)
  if (current < 0) current = 0;
  
  // Calculate RPM from interrupt count
  unsigned long now = millis();
  if (now - lastRpmTime >= 1000) {  // Calculate every second
    rpm = (rpmCount * 60) / 2;  // Assuming 2 magnets on motor shaft
    rpmCount = 0;
    lastRpmTime = now;
  }
}

void rpmInterrupt() {
  rpmCount++;
}

void publishSensorData() {
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["deviceId"] = device_id;
  doc["temperature"] = temperature;
  doc["vibration"] = vibration;
  doc["current"] = current;
  doc["rpm"] = rpm;
  doc["timestamp"] = getISOTimestamp();
  
  char payload[200];
  serializeJson(doc, payload);
  
  // Publish to MQTT
  String topic = String(mqtt_topic_prefix) + "/" + String(device_id) + "/data";
  client.publish(topic.c_str(), payload);
  
  Serial.print("Published to ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(payload);
}

String getISOTimestamp() {
  // Get current time (requires NTP sync for accurate timestamps)
  // For simplicity, using millis() - in production, use NTP
  unsigned long seconds = millis() / 1000;
  unsigned long days = seconds / 86400;
  seconds = seconds % 86400;
  unsigned long hours = seconds / 3600;
  seconds = seconds % 3600;
  unsigned long minutes = seconds / 60;
  seconds = seconds % 60;
  
  // Simple timestamp (not accurate without NTP)
  // In production, use NTPClient library to get real time
  String timestamp = "2024-01-01T";
  if (hours < 10) timestamp += "0";
  timestamp += String(hours) + ":";
  if (minutes < 10) timestamp += "0";
  timestamp += String(minutes) + ":";
  if (seconds < 10) timestamp += "0";
  timestamp += String(seconds) + ".000Z";
  
  return timestamp;
}
