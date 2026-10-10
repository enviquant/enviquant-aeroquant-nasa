# AeroQuant — IoT Aeroponic Farming with NASA-Powered Heatwave Defense

AeroQuant is an IoT-integrated aeroponic farming system that uses NASA POWER API satellite data to predict extreme heat events **before they arrive**, automatically triggering root-zone micro-cooling to protect crops.

## How it works

Aeroponic roots suspended in air are efficient but vulnerable to heat stress: root zones overheat within minutes, nutrient solution breeds pathogens, and a single hot afternoon can destroy a crop. Most IoT systems react **after** sensors detect heat — too late.

AeroQuant queries NASA's POWER API for the 72-hour temperature forecast for the farm's GPS coordinates. When extreme heat is predicted, it engages Peltier-based root-zone cooling **hours before the heatwave arrives**, holding the nutrient buffer tank at 20–25 °C while ambient temperatures climb.

```
NASA POWER API (satellite + reanalysis data)
    ↓ HTTP (every 30 min)
Go backend (fetch → threshold analysis, T2M > 35 °C = heat alert)
    ↓ MQTT command → ESP32 (preemptive cooling ON)
    ↓ WebSocket broadcast → dashboard (alert banner)
```

**NASA POWER endpoint used:**

```
https://power.larc.nasa.gov/api/temporal/hourly/point
  ?parameters=T2M
  &community=AG
  &longitude=<NASA_LON>
  &latitude=<NASA_LAT>
  &start=<today>&end=<today+72h>
  &format=JSON
```

Why NASA POWER: global coverage for any farm location, satellite-derived regional trends, free with no API key, hourly resolution for preemptive action.

## System architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NASA POWER API                           │
└──────────────────────────┬──────────────────────────────────────┘
                            │ HTTP (every 30 min)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GO BACKEND (v3.0.0)                         │
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
│   ESP32 EDGE    │  │   MOSQUITTO     │  │  REACT DASHBOARD    │
│  (Sensors +     │  │  (local MQTT    │  │  (Real-time UI +    │
│   Relays)       │  │   broker)       │  │   NASA Forecast     │
│                 │  │                 │  │   + Alerts)         │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

| Layer | Technology |
|---|---|
| Edge | ESP32 DevKit, Arduino C++, PubSubClient (MQTT) |
| Backend | Go 1.25, Eclipse Paho MQTT, Gorilla WebSocket |
| Frontend | React 19, Tailwind CSS, WebSocket API |
| NASA Data | POWER API (hourly T2M, AG community) |
| Messaging | MQTT (IoT commands, self-hosted Mosquitto), WebSocket (dashboard) |

## Production deploy (single VPS, recommended)

Prerequisites: Docker + Docker Compose plugin, a VPS with ports 80/1883 reachable by your ESP32.

```bash
# 1. Configure
cp .env.example .env            # set REACT_APP_DASHBOARD_PASSWORD
cp backend/.env.example backend/.env   # defaults work for compose; set NASA_LAT/LON
cp frontend/.env.example frontend/.env # same password as above

# 2. Build + run (mosquitto + backend + frontend)
docker compose up --build -d

# 3. Verify
curl http://localhost/api/health
```

- Frontend: `http://<vps-host>/` (nginx serves the React build, proxies `/ws` + `/api` to the backend).
- Backend health: `GET /api/health` → `{ status, mqtt, clients, auto_mode, nasa_alert, nasa_max_temp, version }`.
- MQTT: `mosquitto` service on port 1883. Point the ESP32 at your VPS host (see firmware section).
- HTTPS: terminate TLS in front of this compose stack (reverse proxy / load balancer) and set `REACT_APP_WS_URL=wss://<host>/ws` + `REACT_APP_API_URL=https://<host>` at frontend build time if the frontend is served elsewhere.

## Local development

Prerequisites: Go 1.25+, Node.js 18+, Arduino IDE, local Mosquitto (or any reachable MQTT broker).

### Backend

```bash
cd backend
cp .env.example .env   # set MQTT_BROKER=localhost for local Mosquitto
go mod download
go run .
```

Listens on `WS_PORT` (default `8071`).

| Variable | Default | Description |
|---|---|---|
| `MQTT_BROKER` | `localhost` | MQTT broker host (compose sets `mosquitto`) |
| `MQTT_PORT` | `1883` | MQTT broker port |
| `MQTT_CLIENT_ID` | `aeroponics-server-01` | MQTT client ID |
| `MQTT_TOPIC_SENSOR` | `aeroponics/sensors` | Sensor data topic |
| `MQTT_TOPIC_CONTROL` | `aeroponics/control` | Control command topic |
| `MQTT_TOPIC_ACK` | `aeroponics/ack` | ESP32 acknowledgment topic |
| `WS_PORT` | `8071` | WebSocket/HTTP server port |
| `NASA_LAT` | `23.8103` | Farm latitude |
| `NASA_LON` | `90.4074` | Farm longitude |
| `NASA_THRESHOLD` | `35.0` | Heat alert threshold (°C) |
| `NASA_FETCH_INTERVAL_MIN` | `30` | NASA API fetch interval (minutes) |

### Frontend

```bash
cd frontend
cp .env.example .env   # set REACT_APP_DASHBOARD_PASSWORD
npm install
npm start
```

Opens `http://localhost:3000`. The dev server proxies nothing by itself — point it at a running backend via `REACT_APP_WS_URL` / `REACT_APP_API_URL`, or run the full compose stack.

The dashboard gate password comes from `REACT_APP_DASHBOARD_PASSWORD` (no default is committed). Camera vision and cultivation-map panels are disabled Roadmap placeholders until a live vision model is connected — they never render simulated alerts.

### ESP32

1. Copy `esp32.config.example.h` to `esp32.config.h` (git-ignored) and set `CONFIG_WIFI_SSID`, `CONFIG_WIFI_PASSWORD`, `CONFIG_MQTT_BROKER` (your VPS host or local broker IP).
2. Open `esp32.cpp` in Arduino IDE, install libraries: `PubSubClient`, `ArduinoJson`, `DHT sensor library`, `OneWire` + `DallasTemperature`, `ArduinoOTA`.
3. Select board `ESP32 Dev Module` and flash.

Pin map:

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

All relays are active-low. Float sensors use `INPUT_PULLUP`. DS18B20 needs a 4.7 kΩ pull-up. Telemetry is published exactly as measured — no offsets or fixed values.

## API endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/ws` | WebSocket | Real-time sensor data + NASA alerts + control channel |
| `/api/data` | GET | Latest sensor readings |
| `/api/control` | POST | Send control command to ESP32 (`{ device, action }`) |
| `/api/auto` | GET/POST | Auto mode configuration |
| `/api/health` | GET | System health + NASA status |
| `/api/nasa/forecast` | GET | Current NASA POWER forecast |

## Security checklist

- Never commit `.env`, `esp32.config.h`, or credentials. Templates only (`*.example`).
- Set a strong `REACT_APP_DASHBOARD_PASSWORD` for every deployment.
- The previously committed WiFi credential, dashboard password, and broker IP in git history must be rotated — treat them as compromised.
- Restrict MQTT (firewall / authentication) if the broker is exposed beyond your devices.
- Prefer HTTPS/WSS in production (TLS-terminating reverse proxy in front of compose).

## License

MIT — see [LICENSE](LICENSE).
