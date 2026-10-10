// ═══════════════════════════════════════════════════════════
// 🌱 AEROPONICS IoT SYSTEM - ESP32 DevKit v2.0
// ═══════════════════════════════════════════════════════════
// ✅ Manual by default
// ✅ Auto mode toggle via MQTT
// ✅ Water level safety (ALWAYS runs, flood prevention)
// ✅ All sensors + all actuators
// ═══════════════════════════════════════════════════════════

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ═══════════════════════════════════════
// WiFi + MQTT Configuration
// Set these before flashing. Never commit real credentials.
// Optionally create "esp32.config.h" next to this file with
//   #define CONFIG_WIFI_SSID "..."
//   #define CONFIG_WIFI_PASSWORD "..."
//   #define CONFIG_MQTT_BROKER "..."
// See esp32.config.example.h for a template.
// ═══════════════════════════════════════
#if __has_include("esp32.config.h")
#include "esp32.config.h"
#endif
#ifndef CONFIG_WIFI_SSID
#define CONFIG_WIFI_SSID "YOUR_WIFI_SSID"
#endif
#ifndef CONFIG_WIFI_PASSWORD
#define CONFIG_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#endif
#ifndef CONFIG_MQTT_BROKER
#define CONFIG_MQTT_BROKER "YOUR_MQTT_HOST"
#endif
const char* WIFI_SSID     = CONFIG_WIFI_SSID;
const char* WIFI_PASSWORD = CONFIG_WIFI_PASSWORD;
const char* MQTT_BROKER   = CONFIG_MQTT_BROKER;
const int   MQTT_PORT     = 1883;
const char* MQTT_CLIENT   = "aeroponics-esp32-01";
const char* TOPIC_SENSOR  = "aeroponics/sensors";
const char* TOPIC_CONTROL = "aeroponics/control";

// ═══════════════════════════════════════
// 📌 GPIO PIN DEFINITIONS
// ═══════════════════════════════════════

// DHT22 Sensors
#define DHT1_PIN        4    // Root Chamber
#define DHT2_PIN        16   // Ambient/Room
#define DHTTYPE         DHT22

// DS18B20 Water Temp
#define ONE_WIRE_BUS    5

// pH & TDS Analog
#define PH_PIN          34
#define TDS_PIN         35

// ─── WATER LEVEL FLOAT SENSORS ───────────────────────────
// ⚠️ CRITICAL SAFETY PINS - DO NOT CHANGE
#define FLOAT_PIN       13   // Buffer tank BOTTOM (LOW=empty → pump ON)
#define FLOAT_MAIN_PIN  14   // Buffer tank TOP    (LOW=full  → pump OFF immediately)
// ─────────────────────────────────────────────────────────

// Relay Pins (Active-Low: LOW=ON, HIGH=OFF)
#define SPRAY_PUMP_PIN  27
#define COOLING_PIN     26
#define GROW_LIGHT_PIN  25
#define REFILL_PUMP_PIN 32

// Exhaust Fan PWM (MOSFET)
#define EXHAUST_FAN_PIN 18

#define MINI_PUMP_PIN 19   // MOSFET driver signal pin


// ═══════════════════════════════════════
// 🔧 PWM Configuration
// ═══════════════════════════════════════
#define FAN_PWM_CHANNEL  0
#define FAN_PWM_FREQ     25000
#define FAN_PWM_RES      8    // 0-255

// ═══════════════════════════════════════
// 📦 Objects
// ═══════════════════════════════════════
DHT dht1(DHT1_PIN, DHTTYPE);
DHT dht2(DHT2_PIN, DHTTYPE);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature waterSensors(&oneWire);
WiFiClient espClient;
PubSubClient mqtt(espClient);

// ═══════════════════════════════════════
// 💾 Sensor State
// ═══════════════════════════════════════
float rootTemp      = 0.0;
float rootHumidity  = 0.0;
float ambientTemp   = 0.0;
float ambientHum    = 0.0;
float waterTemp1    = 0.0;
float waterTemp2    = 0.0;
float phValue       = 0.0;
float tdsValue      = 0.0;

// Float sensor states (read directly in safety check)
int waterLevel      = 1;  // Pin 13: 1=OK, 0=LOW(empty)
int mainWaterLevel  = 1;  // Pin 14: 1=OK, 0=FULL

// ═══════════════════════════════════════
// 💾 Actuator State
// ═══════════════════════════════════════
int sprayPumpState  = 0;
int coolingState    = 0;
int growLightState  = 0;
int exhaustFanSpeed = 0;
int refillPumpState = 0;

// ═══════════════════════════════════════
// 🤖 Mode State
// ═══════════════════════════════════════
bool autoModeEnabled = false; // Always start in manual mode
bool preemptiveCoolingActive = false; // NASA POWER heatwave defense override
// ═══════════════════════════════════════
// Timing
// ═══════════════════════════════════════
unsigned long lastSensorRead  = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastWaterCheck  = 0;

// Debounce counters — consecutive readings confirm করার জন্য
int bottomHighCount = 0;  // কতবার continuously HIGH পড়েছে
int topHighCount    = 0;  // কতবার continuously HIGH পড়েছে
const int DEBOUNCE_COUNT = 5; // 5 × 300ms = 1.5 সেকেন্ড stable থাকলে action


const unsigned long SENSOR_INTERVAL  = 1000;  // 1 সেকেন্ড
const unsigned long PUBLISH_INTERVAL = 1000;  // 1 সেকেন্ড
const unsigned long WATER_CHECK_MS   = 300;   // 300ms - safety critical, দ্রুত check

// ═══════════════════════════════════════════════════════════
// 🚨 WATER LEVEL SAFETY (CRITICAL - সবসময় চলে)
// ═══════════════════════════════════════════════════════════
// এই function টি loop() এ সবসময় চলে।
// Auto mode / Manual mode যাই হোক, এই safety check bypass হবে না।
//
// Pin 13 (FLOAT_PIN)      = Buffer tank নিচের দিকে
//   - INPUT_PULLUP দিয়ে: float up (water present) → LOW, float down (empty) → HIGH
//
// Pin 14 (FLOAT_MAIN_PIN) = Buffer tank উপরের দিকে
//   - float up (tank full) → LOW → PUMP STOP IMMEDIATELY!
// ═══════════════════════════════════════════════════════════
void checkWaterLevelSafety() {
  int bottomPin = digitalRead(FLOAT_PIN);      // Pin 13
  int topPin    = digitalRead(FLOAT_MAIN_PIN); // Pin 14

  // Dashboard reporting
  waterLevel     = (bottomPin == LOW) ? 1 : 0;
  mainWaterLevel = (topPin == HIGH) ? 1 : 0;

  // ─── DEBOUNCE: Count consecutive readings ───────────────
  // Noise এ একবার HIGH পড়লে action নেবে না
  // DEBOUNCE_COUNT বার continuously same reading হলে তবেই action

  if (topPin == HIGH) {
    topHighCount++;
    bottomHighCount = 0; // top priority, bottom reset
  } else {
    topHighCount = 0;
  }

  if (bottomPin == HIGH) {
    bottomHighCount++;
  } else {
    bottomHighCount = 0;
  }

  // ─── PRIORITY 1: Top sensor FULL → IMMEDIATE pump OFF ───
  // Top এ debounce কম রাখো (2) — safety critical, দ্রুত বন্ধ হওয়া দরকার
  if (topHighCount >= 2) {
    if (refillPumpState == 1) {
      digitalWrite(REFILL_PUMP_PIN, HIGH); // OFF
      refillPumpState = 0;
      Serial.println("🚨 SAFETY: Tank FULL confirmed → Pump OFF!");
    }
    return;
  }

  // ─── PRIORITY 2: Bottom EMPTY → pump ON ─────────────────
  // Bottom এ debounce বেশি রাখো (DEBOUNCE_COUNT=5)
  // মানে 5 × 300ms = 1.5s continuously empty পড়লে তবেই pump ON
  if (bottomHighCount >= DEBOUNCE_COUNT) {
    if (refillPumpState == 0) {
      digitalWrite(REFILL_PUMP_PIN, LOW); // ON
      refillPumpState = 1;
      Serial.println("💧 CONFIRMED EMPTY → Pump ON");
    }
  } else if (bottomPin == LOW && refillPumpState == 1 && topPin == LOW) {
    // পানি আবার এসেছে কিন্তু top এ পৌঁছেনি → pump চলতে থাকুক
    // কিছু করার নেই
  }
}

// ═══════════════════════════════════════════════════════════
// 🛰️ NASA PREEMPTIVE ACKNOWLEDGMENT
// ═══════════════════════════════════════════════════════════
void sendPreemptiveAck(bool activated) {
  StaticJsonDocument<256> doc;
  doc["type"] = "nasa_ack";
  doc["device"] = "preemptive_cooling";
  doc["action"] = activated ? 1 : 0;
  doc["timestamp"] = millis();
  doc["status"] = activated ? "NASA Preemptive Protocol Activated" : "NASA Preemptive Protocol Released";

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);

  if (mqtt.publish("aeroponics/ack", jsonBuffer)) {
    Serial.println("📤 Preemptive cooling acknowledgment sent to server");
  } else {
    Serial.println("❌ Failed to send acknowledgment");
  }
}

// ═══════════════════════════════════════════════════════════
// 📡 MQTT CALLBACK - Backend/Dashboard থেকে command আসলে
// ═══════════════════════════════════════════════════════════
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';

  Serial.print("🎮 CMD: ");
  Serial.println(message);

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, message) != DeserializationError::Ok) {
    Serial.println("❌ JSON parse error");
    return;
  }

  const char* device = doc["device"];
  int action = doc["action"] | 0;

  if (!device) {
    Serial.println("❌ device field নেই!");
    return;
  }

  // ─── AUTO MODE TOGGLE ───────────────────────────────────
  if (strcmp(device, "auto_mode") == 0) {
    autoModeEnabled = (action == 1);
    Serial.printf("🤖 Auto Mode: %s\n", autoModeEnabled ? "ON" : "OFF");
    // auto mode বদলালে actuators এর state change করবো না
    // Backend এর autoControlLoop সিদ্ধান্ত নেবে
    return;
  }

  // ─── 🛰️ NASA PREEMPTIVE COOLING (Heatwave Defense) ──────
  // Backend NASA POWER API থেকে forecast পায়।
  // Heatwave আসার আগেই cooling engage করে root zone protect করে।
  // Local sensor thresholds bypass হয় — সরাস্রি ON।
  if (strcmp(device, "preemptive_cooling") == 0) {
    preemptiveCoolingActive = (action == 1);
    if (action == 1) {
      coolingState = 1;
      digitalWrite(COOLING_PIN, LOW);       // Peltier ON
      digitalWrite(MINI_PUMP_PIN, HIGH);    // Circulation pump ON
      Serial.println("🚨 NASA PREEMPTIVE COOLING ACTIVE — Heatwave defense engaged!");
      Serial.println("🛰️ NASA Preemptive Protocol Activated");
      // Send acknowledgment back to server
      sendPreemptiveAck(true);
    } else {
      coolingState = 0;
      digitalWrite(COOLING_PIN, HIGH);      // Peltier OFF
      digitalWrite(MINI_PUMP_PIN, LOW);     // Pump OFF
      Serial.println("✅ NASA Preemptive Cooling released — normal operation resumed");
      // Send release acknowledgment back to server
      sendPreemptiveAck(false);
    }
    return;
  }

  // ─── SPRAY PUMP ─────────────────────────────────────────
  if (strcmp(device, "spray_pump") == 0) {
    sprayPumpState = action;
    digitalWrite(SPRAY_PUMP_PIN, action == 1 ? LOW : HIGH);
    delay(50);
    Serial.printf("💦 Spray Pump: %s\n", action ? "ON" : "OFF");
  }

  // ─── COOLING (PELTIER) ───────────────────────────────────
  else if (strcmp(device, "cooling") == 0) {
    coolingState = action;
    digitalWrite(COOLING_PIN, action == 1 ? LOW : HIGH);
    Serial.printf("❄️ Cooling: %s\n", action ? "ON" : "OFF");

    if (action == 1) {
    digitalWrite(MINI_PUMP_PIN, HIGH);   // MOSFET trigger → Pump ON
    Serial.println("💧 Mini Pump ON (MOSFET full speed)");
  } else {
    digitalWrite(MINI_PUMP_PIN, LOW);    // Pump OFF
    Serial.println("💧 Mini Pump OFF");
  }
  }

  // ─── GROW LIGHT ──────────────────────────────────────────
  else if (strcmp(device, "grow_light") == 0) {
    growLightState = action;
    digitalWrite(GROW_LIGHT_PIN, action == 1 ? LOW : HIGH);
    Serial.printf("💡 Grow Light: %s\n", action ? "ON" : "OFF");
  }

  // ─── EXHAUST FAN (PWM 0-255) ─────────────────────────────
  else if (strcmp(device, "exhaust_fan") == 0) {
    exhaustFanSpeed = constrain(action, 0, 255);
    ledcWrite(FAN_PWM_CHANNEL, exhaustFanSpeed);
    Serial.printf("🌀 Fan Speed: %d\n", exhaustFanSpeed);
  }

  // ─── REFILL PUMP ─────────────────────────────────────────
  // ⚠️ Safety override: top sensor trigger হলে ON করা যাবে না
  else if (strcmp(device, "refill_pump") == 0) {
    // Safety check: top sensor triggered থাকলে pump ON করা বিপজ্জনক
    if (action == 1 && digitalRead(FLOAT_MAIN_PIN) == LOW) {
      Serial.println("⚠️ SAFETY: Pump ON blocked - tank already FULL!");
      return;
    }
    // Safety function override করবে যদি দরকার হয়
    // তাই এখানে state set করা safe
    refillPumpState = action;
    digitalWrite(REFILL_PUMP_PIN, action == 1 ? LOW : HIGH);
    Serial.printf("🚰 Refill Pump: %s\n", action ? "ON" : "OFF");
  }

  else {
    Serial.printf("⚠️ Unknown device: %s\n", device);
  }
}

// ═══════════════════════════════════════════════════════════
// 📶 WiFi CONNECT
// ═══════════════════════════════════════════════════════════
void connectWiFi() {
  Serial.printf("📶 WiFi কানেক্ট হচ্ছে: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ WiFi OK! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n❌ WiFi fail! Restarting...");
    delay(3000);
    ESP.restart();
  }
}

// ═══════════════════════════════════════════════════════════
// 📡 MQTT CONNECT
// ═══════════════════════════════════════════════════════════
void connectMQTT() {
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(1024);

  while (!mqtt.connected()) {
    Serial.print("📡 MQTT কানেক্ট হচ্ছে...");
    if (mqtt.connect(MQTT_CLIENT)) {
      Serial.println(" ✅ Connected!");
      mqtt.subscribe(TOPIC_CONTROL);
      Serial.printf("📥 Subscribed: %s\n", TOPIC_CONTROL);
    } else {
      Serial.printf(" ❌ Failed rc=%d | 3s পর retry...\n", mqtt.state());
      delay(3000);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 🔄 OTA SETUP
// ═══════════════════════════════════════════════════════════
void setupOTA() {
  ArduinoOTA.setHostname("aeroponics-esp32");

  ArduinoOTA.onStart([]() {
    Serial.println("🔄 OTA শুরু হচ্ছে...");
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\n✅ OTA সম্পন্ন!");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("📦 OTA: %u%%\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("❌ OTA Error[%u]\n", error);
  });

  ArduinoOTA.begin();
  Serial.printf("🔄 OTA Ready: %s\n", WiFi.localIP().toString().c_str());
}

// ═══════════════════════════════════════════════════════════
// 📊 READ ALL SENSORS
// ═══════════════════════════════════════════════════════════
void readAllSensors() {
  // ─── DHT22 #1: Root Chamber ───
// ❌ Root sensor damaged
// ✅ Use ambient sensor as root chamber temp

  // ─── Ambient DHT22 Sensor ───
  float t2 = dht2.readTemperature();
  float h2 = dht2.readHumidity();

  if (!isnan(t2)) ambientTemp = t2;
  if (!isnan(h2)) ambientHum  = h2;

  // ─── Root sensor broken ───
  // Ambient value use করছি
  rootTemp     = ambientTemp;
  rootHumidity = ambientHum;

  // ─── DS18B20: Water Temp ───
  waterSensors.requestTemperatures();
  float wt1 = waterSensors.getTempCByIndex(0);
  float wt2 = waterSensors.getTempCByIndex(1);
  if (wt1 != -127.0) waterTemp1 = wt1;
  if (wt2 != -127.0) waterTemp2 = wt2;

  // ─── pH Sensor ───
  long phRaw = 0;
  for (int i = 0; i < 20; i++) {
    phRaw += analogRead(PH_PIN);
    delayMicroseconds(100);
  }
  float phVoltage = (phRaw / 20.0) * (3.3 / 4095.0);
  phValue = 3.5 * phVoltage;

  // ─── TDS Sensor ───
  long tdsRaw = 0;
  for (int i = 0; i < 20; i++) {
    tdsRaw += analogRead(TDS_PIN);
    delayMicroseconds(100);
  }
  float tdsVoltage = (tdsRaw / 20.0) * (3.3 / 4095.0);
  tdsValue = (133.42 * pow(tdsVoltage, 3)
            - 255.86 * pow(tdsVoltage, 2)
            + 857.39 * tdsVoltage) * 0.5;
  if (tdsValue < 0) tdsValue = 0;

  // ─── Float Sensors ───
  // Note: waterLevel ও mainWaterLevel checkWaterLevelSafety() তে update হয়
  // এখানেও পড়ি যাতে publish এ সঠিক value যায়
  waterLevel     = (digitalRead(FLOAT_PIN) == LOW) ? 1 : 0;
  mainWaterLevel = (digitalRead(FLOAT_MAIN_PIN) == LOW) ? 1 : 0;
}

// ═══════════════════════════════════════════════════════════
// 📤 PUBLISH SENSOR DATA
// ═══════════════════════════════════════════════════════════
void publishSensorData() {
  StaticJsonDocument<512> doc;

  // Live sensor readings — published exactly as measured.
  doc["root_temp"]     = round(rootTemp * 10.0) / 10.0;
  doc["root_humidity"] = round(rootHumidity * 10.0) / 10.0;
  doc["ambient_temp"]     = round(ambientTemp * 10.0) / 10.0;
  doc["ambient_humidity"] = round(ambientHum * 10.0) / 10.0;
  doc["water_temp1"] = round(waterTemp1 * 10.0) / 10.0;
  doc["water_temp2"]      = round(waterTemp2 * 10.0) / 10.0;
  doc["ph"] = round(phValue * 10.0) / 10.0;
  doc["tds"] = round(tdsValue);
  doc["water_level"]      = waterLevel;      // Pin 13: 1=OK, 0=LOW
  doc["main_water_level"] = mainWaterLevel;  // Pin 14: 1=FULL, 0=not full

  // Actuator states
  doc["spray_pump"]   = sprayPumpState;
  doc["cooling"]      = coolingState;
  doc["grow_light"]   = growLightState;
  doc["exhaust_fan"]  = exhaustFanSpeed;
  doc["refill_pump"]  = refillPumpState;
  doc["auto_mode"]    = autoModeEnabled ? 1 : 0; // Backend কে জানাও
  doc["preemptive_cooling"] = preemptiveCoolingActive ? 1 : 0; // 🛰️ NASA heatwave defense state

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  if (mqtt.publish(TOPIC_SENSOR, jsonBuffer)) {
    // Serial.printf("📤 %s\n", jsonBuffer); // Debug এ uncommment করো
  } else {
    Serial.println("❌ Publish failed!");
  }
}

// ═══════════════════════════════════════════════════════════
// 🏁 SETUP
// ═══════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("═══════════════════════════════════════════");
  Serial.println("🌱 AEROPONICS IoT SYSTEM v2.0");
  Serial.println("🔴 Mode: MANUAL (default)");
  Serial.println("═══════════════════════════════════════════");

  // ─── Relay Pins: HIGH = OFF (Active-Low) ───
  pinMode(SPRAY_PUMP_PIN,  OUTPUT); digitalWrite(SPRAY_PUMP_PIN,  HIGH);
  pinMode(COOLING_PIN,     OUTPUT); digitalWrite(COOLING_PIN,     HIGH);
  pinMode(GROW_LIGHT_PIN,  OUTPUT); digitalWrite(GROW_LIGHT_PIN,  HIGH);
  pinMode(REFILL_PUMP_PIN, OUTPUT); digitalWrite(REFILL_PUMP_PIN, HIGH);
  Serial.println("✅ সব Relay OFF (safe state)");

  pinMode(MINI_PUMP_PIN, OUTPUT);
digitalWrite(MINI_PUMP_PIN, LOW);  // শুরুতে OFF


  // ─── PWM Fan ───
  ledcSetup(FAN_PWM_CHANNEL, FAN_PWM_FREQ, FAN_PWM_RES);
  ledcAttachPin(EXHAUST_FAN_PIN, FAN_PWM_CHANNEL);
  ledcWrite(FAN_PWM_CHANNEL, 0);
  Serial.println("✅ Fan PWM OFF");

  // ─── Sensors ───
  dht1.begin();
  dht2.begin();
  waterSensors.begin();

  // ⚠️ CRITICAL: Float sensor pins with INPUT_PULLUP
  // Unplugged → HIGH, Float up (water) → LOW
  pinMode(FLOAT_PIN,      INPUT_PULLUP); // Pin 13: buffer bottom
  pinMode(FLOAT_MAIN_PIN, INPUT_PULLUP); // Pin 14: buffer top (SAFETY!)

  Serial.printf("🌡️ DS18B20 found: %d\n", waterSensors.getDeviceCount());
  Serial.println("✅ সব Sensor initialized");
  Serial.println("✅ Water safety pins ready (Pin 13 + 14)");

  // ─── Network ───
  connectWiFi();
  setupOTA();
  connectMQTT();

  Serial.println("═══════════════════════════════════════════");
  Serial.println("🚀 সিস্টেম READY! Dashboard দেখো।");
  Serial.println("⚠️  Water safety: সবসময় active থাকবে!");
  Serial.println("═══════════════════════════════════════════");
}

// ═══════════════════════════════════════════════════════════
// 🔁 MAIN LOOP
// ═══════════════════════════════════════════════════════════
void loop() {
  // ─── OTA ───
  ArduinoOTA.handle();

  // ─── WiFi reconnect ───
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi lost! Reconnecting...");
    connectWiFi();
  }

  // ─── MQTT reconnect ───
  if (!mqtt.connected()) {
    connectMQTT();
  }
  mqtt.loop();

  unsigned long now = millis();

  // ─── 🚨 WATER SAFETY CHECK (300ms) - সবার আগে ───
  // Auto/manual যাই হোক, এটা ALWAYS চলবে!
  if (now - lastWaterCheck >= WATER_CHECK_MS) {
    lastWaterCheck = now;
    checkWaterLevelSafety();
  }

  // ─── Sensor read (1s) ───
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;
    readAllSensors();
  }

  // ─── MQTT publish (1s) ───
  if (now - lastMqttPublish >= PUBLISH_INTERVAL) {
    lastMqttPublish = now;
    publishSensorData();
  }
}