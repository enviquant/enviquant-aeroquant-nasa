# AeroQuant — IoT Aeroponic Farming with NASA-Powered Heatwave Defense

**NASA Space Apps Challenge 2026** | Category: Field Shift — Adapting Farms with NASA Data

---

## Elevator Pitch

AeroQuant is an IoT-integrated aeroponic farming system that uses NASA POWER API satellite data to predict extreme heat events **before they arrive**, automatically triggering root-zone micro-cooling to protect crops. Reactive cooling is too late — AeroQuant fights heatwaves preemptively.

---

## The Problem

Aeroponic systems suspend plant roots in air and mist them with nutrient solution. This makes them incredibly efficient — but also extremely vulnerable to heat stress. When ambient temperatures spike:

- Root zones overheat within minutes, damaging delicate root hairs
- Nutrient solution becomes a breeding ground for pathogens
- Crop loss can occur in a single afternoon

Traditional IoT farming systems react to heat **after** sensors detect it. By then, the damage is already done. Farmers need **predictive** defense, not reactive.

---

## The Solution: Root-Zone Micro-Cooling

AeroQuant's Root-Zone Micro-Cooling system uses Peltier elements to actively chill the nutrient solution buffer tank. When engaged, it maintains optimal root-zone temperature (20-25°C) regardless of ambient conditions.

**The breakthrough:** Instead of waiting for local sensors to detect heat, AeroQuant queries NASA's POWER API for 72-hour temperature forecasts. When extreme heat is predicted, the system engages cooling **hours before the heatwave arrives** — keeping the root zone in the safe zone while ambient temperatures are still climbing.

---

## How We Use NASA Data

### NASA POWER API Integration

We use the [NASA POWER API](https://power.larc.nasa.gov/) (Prediction Of Worldwide Energy Resources) to fetch hourly temperature forecasts (T2M — Temperature at 2 Meters) for our farm's exact GPS coordinates.

**Data Flow:**

```
NASA POWER API (satellite + reanalysis data)
    ↓
Go Backend (fetch every 30 min)
    ↓
Threshold Analysis (T2M > 35°C = heat alert)
    ↓
MQTT Command → ESP32 (preemptive cooling ON)
    ↓
WebSocket Broadcast → Dashboard (alert banner)
```

**API Endpoint Used:**
```
https://power.larc.nasa.gov/api/temporal/hourly/point
  ?parameters=T2M
  &community=AG
  &longitude=90.4074
  &latitude=23.8103
  &start=20261005
  &end=20261010
  &format=JSON
```

**Why NASA POWER?**
- Global coverage — works for any farm location
- Satellite-derived data — more accurate than ground stations for regional trends
- Free and open — no API key required
- Hourly resolution — precise enough for preemptive action

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NASA POWER API                           │
│                  (Satellite Weather Data)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (every 30 min)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GO BACKEND (v3.0)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ NASA Service │  │ Auto Control │  │  WebSocket + REST    │  │
│  │ (fetch/analyze)│  │   Loop       │  │  API Server          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └────────┬────────┘                      │              │
│                  │                               │              │
│              MQTT Publish              WebSocket Broadcast      │
└──────────────────┼───────────────────────────────┼──────────────┘
                   │                               │
         ┌─────────┴─────────┐           ┌─────────┴─────────┐
         │                   │           │                   │
         ▼                   ▼           ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│   ESP32 EDGE    │  │   ESP32 EDGE    │  │  REACT DASHBOARD    │
│  (Sensors +     │  │  (Actuators +   │  │  (Real-time UI +    │
│   Relays)       │  │   Preemptive    │  │   NASA Forecast     │
│                 │  │   Cooling)      │  │   Widget + Alerts)  │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Edge** | ESP32 DevKit, Arduino C++, PubSubClient (MQTT) |
| **Backend** | Go 1.25, Eclipse Paho MQTT, Gorilla WebSocket |
| **Frontend** | React 18, WebSocket API, CSS Glassmorphism |
| **NASA Data** | POWER API (hourly T2M, AG community) |
| **Communication** | MQTT (IoT commands), WebSocket (real-time dashboard) |

---

## Hardware Setup

### ESP32 Pin Map

| Component | Pin | Type |
|---|---|---|
| DHT22 (Root Chamber) | GPIO 4 | Digital |
| DHT22 (Ambient) | GPIO 16 | Digital |
| DS18B20 (Water Temp) | GPIO 5 | One-Wire |
| pH Sensor | GPIO 34 | Analog |
| TDS Sensor | GPIO 35 | Analog |
| Float Sensor (Bottom) | GPIO 13 | Digital Input |
| Float Sensor (Top/Safety) | GPIO 14 | Digital Input |
| Spray Pump Relay | GPIO 27 | Digital Output |
| Peltier Cooling Relay | GPIO 26 | Digital Output |
| Grow Light Relay | GPIO 25 | Digital Output |
| Refill Pump Relay | GPIO 32 | Digital Output |
| Exhaust Fan PWM | GPIO 18 | PWM Output |
| Mini Pump (MOSFET) | GPIO 19 | Digital Output |

### Wiring Notes

- All relays are **active-low** (LOW = ON, HIGH = OFF)
- Float sensors use `INPUT_PULLUP` — unplugged reads HIGH
- DS18B20 requires 4.7kΩ pull-up resistor on data line
- Peltier module powered via relay + external 12V supply

---

## Local Run Instructions

### Prerequisites

- Go 1.25+
- Node.js 18+
- Arduino IDE (for ESP32 flashing)
- MQTT broker (default: `broker.hivemq.com:1883`)

### 1. Backend

```bash
cd backend

# Install dependencies
go mod download

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run
go run .
```

The backend starts on port `8071` (configurable via `WS_PORT`).

**Environment Variables:**

| Variable | Default | Description |
|---|---|---|
| `MQTT_BROKER` | `broker.hivemq.com` | MQTT broker address |
| `MQTT_PORT` | `1883` | MQTT broker port |
| `MQTT_CLIENT_ID` | `aeroponics-server-01` | MQTT client ID |
| `MQTT_TOPIC_SENSOR` | `aeroponics/sensors` | Sensor data topic |
| `MQTT_TOPIC_CONTROL` | `aeroponics/control` | Control command topic |
| `WS_PORT` | `8071` | WebSocket/HTTP server port |
| `NASA_LAT` | `23.8103` | Farm latitude (Dhaka) |
| `NASA_LON` | `90.4074` | Farm longitude (Dhaka) |
| `NASA_THRESHOLD` | `35.0` | Heat alert threshold (°C) |
| `NASA_FETCH_INTERVAL_MIN` | `30` | NASA API fetch interval (minutes) |

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

Open `http://localhost:3000` in your browser.

**Default password:** `envi999`

### 3. ESP32

1. Open `esp32.cpp` in Arduino IDE
2. Install required libraries:
   - `PubSubClient` (by Nick O'Leary)
   - `ArduinoJson` (by Benoit Blanchon)
   - `DHT sensor library` (by Adafruit)
   - `OneWire` + `DallasTemperature`
   - `ArduinoOTA`
3. Update WiFi credentials (`WIFI_SSID`, `WIFI_PASSWORD`)
4. Update MQTT broker address (`MQTT_BROKER`)
5. Select board: `ESP32 Dev Module`
6. Flash to ESP32

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/ws` | WebSocket | Real-time sensor data + NASA alerts |
| `/api/data` | GET | Latest sensor readings |
| `/api/control` | POST | Send control command to ESP32 |
| `/api/auto` | GET/POST | Auto mode configuration |
| `/api/health` | GET | System health + NASA status |
| `/api/nasa/forecast` | GET | Current NASA POWER forecast |

---

## NASA Space Apps Challenge

**Category:** Field Shift — Adapting Farms with NASA Data

**Team:** EnviQuant

**Submission:** AeroQuant demonstrates how NASA's open satellite data can be directly integrated into IoT farming infrastructure to solve a real-world agricultural problem. By combining NASA POWER API forecasts with edge computing and real-time control, we've created a system that doesn't just monitor the environment — it **anticipates and defends against it**.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [NASA POWER API](https://power.larc.nasa.gov/) — Prediction Of Worldwide Energy Resources
- [NASA Space Apps Challenge](https://www.spaceappschallenge.org/) — for the inspiration and platform
