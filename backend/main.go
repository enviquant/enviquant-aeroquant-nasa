package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

// ============================================================
// 📦 DATA STRUCTURES
// ============================================================

type SensorData struct {
	RootTemp       float64 `json:"root_temp"`
	RootHumidity   float64 `json:"root_humidity"`
	AmbientTemp    float64 `json:"ambient_temp"`
	AmbientHum     float64 `json:"ambient_humidity"`
	WaterTemp1     float64 `json:"water_temp1"` // Buffer tank → Peltier এর জন্য
	WaterTemp2     float64 `json:"water_temp2"` // Main tank → monitoring only
	PH             float64 `json:"ph"`
	TDS            float64 `json:"tds"`
	WaterLevel     int     `json:"water_level"`
	MainWaterLevel int     `json:"main_water_level"`
	SprayPump      int     `json:"spray_pump"`
	Cooling        int     `json:"cooling"`
	GrowLight      int     `json:"grow_light"`
	ExhaustFan     int     `json:"exhaust_fan"`
	RefillPump     int     `json:"refill_pump"`
	AutoMode       int     `json:"auto_mode"`
	Timestamp      string  `json:"timestamp"`
}

type ControlCommand struct {
	Device string `json:"device"`
	Action int    `json:"action"`
}

type DashboardMessage struct {
	Type   string      `json:"type"`
	Device string      `json:"device,omitempty"`
	Action int         `json:"action,omitempty"`
	Config *AutoConfig `json:"config,omitempty"`
}

type AutoConfig struct {
	AutoMode         bool    `json:"auto_mode"`
	SprayIntervalSec int64   `json:"spray_interval_sec"` // default: 600
	SprayDurationSec int64   `json:"spray_duration_sec"` // default: 30
	// Peltier thresholds — waterTemp1 (buffer tank) ব্যবহার করে
	WaterTempMax float64 `json:"water_temp_max"` // default: 25.0
	WaterTempMin float64 `json:"water_temp_min"` // default: 20.0
	// Fan thresholds
	RootTempMax float64 `json:"root_temp_max"` // default: 28.0
	HumidityMax float64 `json:"humidity_max"`  // default: 80.0
	// LED: auto mode start থেকে 16hr ON, 8hr OFF cycle
	LightOnHours  int `json:"light_on_hours"`  // default: 16
	LightOffHours int `json:"light_off_hours"` // default: 8
}

type autoState struct {
	autoStartTime  time.Time
	sprayingActive bool
	sprayEndTime   time.Time
	lastSprayTime  time.Time
	lastFanSpeed   int
	lastCooling    int
	lastLight      int
	peltierOn      bool
}

// ============================================================
// 🌐 GLOBAL STATE
// ============================================================

var (
	latestData   SensorData
	dataMutex    sync.RWMutex
	wsClients    = make(map[*websocket.Conn]bool)
	clientsMutex sync.Mutex
	mqttClient   mqtt.Client
	autoConfig   AutoConfig
	autoMutex    sync.RWMutex
	upgrader     = websocket.Upgrader{
		CheckOrigin:     func(r *http.Request) bool { return true },
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
	nasaService *NASAService
)

func defaultAutoConfig() AutoConfig {
	return AutoConfig{
		AutoMode:         false,
		SprayIntervalSec: 600,
		SprayDurationSec: 30,
		WaterTempMax:     25.0,
		WaterTempMin:     20.0,
		RootTempMax:      28.0,
		HumidityMax:      80.0,
		LightOnHours:     16,
		LightOffHours:    8,
	}
}

// ============================================================
// 🔧 HELPERS
// ============================================================

func sendCommand(device string, action int) {
	cmdJSON, _ := json.Marshal(ControlCommand{Device: device, Action: action})
	controlTopic := os.Getenv("MQTT_TOPIC_CONTROL")
	if controlTopic == "" {
		controlTopic = "aeroponics/control"
	}
	token := mqttClient.Publish(controlTopic, 1, false, cmdJSON)
	token.Wait()
	if token.Error() != nil {
		log.Printf("❌ MQTT publish error: %v", token.Error())
	} else {
		log.Printf("🤖 CMD → %s: %d", device, action)
	}
}

func broadcastJSON(payload interface{}) {
	clientsMutex.Lock()
	defer clientsMutex.Unlock()
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return
	}
	for client := range wsClients {
		if err := client.WriteMessage(websocket.TextMessage, jsonData); err != nil {
			client.Close()
			delete(wsClients, client)
		}
	}
}

// ============================================================
// 🤖 AI AUTO CONTROL LOOP
// ============================================================
func autoControlLoop() {
	state := autoState{
		lastFanSpeed: -1,
		lastCooling:  -1,
		lastLight:    -1,
		peltierOn:    false,
	}

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for now := range ticker.C {
		autoMutex.RLock()
		if !autoConfig.AutoMode {
			autoMutex.RUnlock()
			// Reset state যাতে পরেরবার fresh start হয়
			state = autoState{lastFanSpeed: -1, lastCooling: -1, lastLight: -1}
			continue
		}
		cfg := autoConfig
		autoMutex.RUnlock()

		// Auto mode এইমাত্র শুরু হলে → start time set করো
		if state.autoStartTime.IsZero() {
			state.autoStartTime = now
			// প্রথম spray: auto mode on হওয়ার 30 সেকেন্ড পরে
			state.lastSprayTime = now.Add(-time.Duration(cfg.SprayIntervalSec-30) * time.Second)
			log.Println("🤖 AI Auto started. LED ON for 16hr. First spray in ~30s.")
		}

		dataMutex.RLock()
		data := latestData
		dataMutex.RUnlock()

		// ══════════════════════════════════════════
		// 💦 SPRAY PUMP — 10 min interval, 30s ON
		// ══════════════════════════════════════════
		if state.sprayingActive {
			if now.After(state.sprayEndTime) {
				sendCommand("spray_pump", 0)
				state.sprayingActive = false
				state.lastSprayTime = now
				log.Printf("🤖 Spray OFF | Next in %ds", cfg.SprayIntervalSec)
			}
		} else {
			if now.Sub(state.lastSprayTime) >= time.Duration(cfg.SprayIntervalSec)*time.Second {
				sendCommand("spray_pump", 1)
				state.sprayingActive = true
				state.sprayEndTime = now.Add(time.Duration(cfg.SprayDurationSec) * time.Second)
				log.Printf("🤖 Spray ON for %ds", cfg.SprayDurationSec)
			}
		}

		// ══════════════════════════════════════════
		// 🌀 EXHAUST FAN — Proportional PWM
		// Root temp ও humidity এর উপর ভিত্তি করে
		// ══════════════════════════════════════════
		fanSpeed := 0
		tempOver := data.RootTemp - cfg.RootTempMax
		humOver := data.RootHumidity - cfg.HumidityMax

		if tempOver > 3 || humOver > 10 {
			fanSpeed = 255
		} else if tempOver > 0 || humOver > 0 {
			excess := tempOver
			if humOver > excess {
				excess = humOver
			}
			fanSpeed = int(100.0 + (excess/5.0)*130.0)
			if fanSpeed > 230 { fanSpeed = 230 }
			if fanSpeed < 100 { fanSpeed = 100 }
		}

		if fanSpeed != state.lastFanSpeed {
			sendCommand("exhaust_fan", fanSpeed)
			state.lastFanSpeed = fanSpeed
			log.Printf("🤖 Fan %d/255 (root=%.1f°C hum=%.1f%%)", fanSpeed, data.RootTemp, data.RootHumidity)
		}

		// ══════════════════════════════════════════
		// ❄️ PELTIER — Buffer tank temp (waterTemp1)
		//
		// WHY waterTemp1: Peltier সরাসরি buffer tank cool করে।
		// waterTemp2 = main tank, শুধু monitoring।
		//
		// Hysteresis: ON at >25°C, OFF at <20°C, মাঝে কিছু করে না।
		// এতে relay wear কমে ও unnecessary cooling এড়ানো যায়।
		// ══════════════════════════════════════════
		bufferTemp := data.WaterTemp1

		newCooling := state.lastCooling
		if state.lastCooling == -1 {
			// Initial state: temperature অনুযায়ী সেট করো
			if bufferTemp > cfg.WaterTempMax {
				newCooling = 1
				state.peltierOn = true
			} else {
				newCooling = 0
				state.peltierOn = false
			}
		} else {
			if !state.peltierOn && bufferTemp > cfg.WaterTempMax {
				newCooling = 1
				state.peltierOn = true
				log.Printf("🤖 Peltier ON (buffer=%.1f°C > max=%.1f°C)", bufferTemp, cfg.WaterTempMax)
			} else if state.peltierOn && bufferTemp < cfg.WaterTempMin {
				newCooling = 0
				state.peltierOn = false
				log.Printf("🤖 Peltier OFF (buffer=%.1f°C < min=%.1f°C)", bufferTemp, cfg.WaterTempMin)
			}
			// Hysteresis zone (20-25°C): কোনো action নেই
		}

		if newCooling != state.lastCooling {
			sendCommand("cooling", newCooling)
			state.lastCooling = newCooling
		}

		// ══════════════════════════════════════════
		// 💡 GROW LIGHT — 16hr ON / 8hr OFF
		//
		// WHY cycle-based (not clock-based):
		// Clock-based হলে রাতে বা যেকোনো "off-hour" এ
		// exhibition চললে light বন্ধ থাকত। তাই auto mode
		// শুরু হওয়ার time থেকে 16hr count করা সবচেয়ে reliable।
		//
		// No database needed — time.Since(autoStartTime) দিয়েই হয়।
		// ══════════════════════════════════════════
		cycleDuration := time.Duration(cfg.LightOnHours+cfg.LightOffHours) * time.Hour
		cyclePos := now.Sub(state.autoStartTime) % cycleDuration

		lightOn := 0
		if cyclePos < time.Duration(cfg.LightOnHours)*time.Hour {
			lightOn = 1 // প্রথম 16 ঘণ্টা ON
		}
		// পরের 8 ঘণ্টা OFF (dark period)

		if lightOn != state.lastLight {
			sendCommand("grow_light", lightOn)
			state.lastLight = lightOn
			if lightOn == 1 {
				remaining := time.Duration(cfg.LightOnHours)*time.Hour - cyclePos
				log.Printf("🤖 Light ON | %v remaining", remaining.Round(time.Minute))
			} else {
				log.Println("🤖 Light OFF (dark period 8hr)")
			}
		}
	}
}

// ============================================================
// 📡 MQTT HANDLERS
// ============================================================

var onConnect mqtt.OnConnectHandler = func(client mqtt.Client) {
	log.Println("✅ MQTT Connected!")
	sensorTopic := os.Getenv("MQTT_TOPIC_SENSOR")
	if sensorTopic == "" {
		sensorTopic = "aeroponics/sensors"
	}
	token := client.Subscribe(sensorTopic, 1, onSensorMessage)
	token.Wait()
	if token.Error() != nil {
		log.Printf("❌ Subscribe error: %v", token.Error())
	} else {
		log.Printf("📡 Subscribed: %s", sensorTopic)
	}
}

var onConnectionLost mqtt.ConnectionLostHandler = func(client mqtt.Client, err error) {
	log.Printf("⚠️ MQTT connection lost: %v", err)
}

var onSensorMessage mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	var data SensorData
	if err := json.Unmarshal(msg.Payload(), &data); err != nil {
		log.Printf("❌ JSON parse error: %v", err)
		return
	}
	data.Timestamp = time.Now().Format(time.RFC3339)
	dataMutex.Lock()
	latestData = data
	dataMutex.Unlock()
	broadcastJSON(map[string]interface{}{"type": "sensor_data", "data": data})
}

// ============================================================
// 🔌 WEBSOCKET HANDLER
// ============================================================

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ WS upgrade error: %v", err)
		return
	}

	clientsMutex.Lock()
	wsClients[conn] = true
	clientsMutex.Unlock()
	log.Printf("🔌 Dashboard connected! Total: %d", len(wsClients))

	dataMutex.RLock()
	initData, _ := json.Marshal(map[string]interface{}{"type": "sensor_data", "data": latestData})
	dataMutex.RUnlock()
	conn.WriteMessage(websocket.TextMessage, initData)

	autoMutex.RLock()
	initCfg, _ := json.Marshal(map[string]interface{}{"type": "auto_config", "config": autoConfig})
	autoMutex.RUnlock()
	conn.WriteMessage(websocket.TextMessage, initCfg)

	go func() {
		defer func() {
			clientsMutex.Lock()
			delete(wsClients, conn)
			clientsMutex.Unlock()
			conn.Close()
			log.Println("🔌 Dashboard disconnected")
		}()

		for {
			_, rawMsg, err := conn.ReadMessage()
			if err != nil {
				break
			}

			var msg DashboardMessage
			if err := json.Unmarshal(rawMsg, &msg); err != nil {
				log.Printf("❌ Invalid message: %v", err)
				continue
			}

			switch msg.Type {

			case "auto_mode":
				enabled := msg.Action == 1
				autoMutex.Lock()
				autoConfig.AutoMode = enabled
				autoMutex.Unlock()

				sendCommand("auto_mode", msg.Action)

				if !enabled {
					// Manual mode এ ফিরলে spray ও fan বন্ধ করো
					// Light: user নিজে control করবে manual mode এ
					sendCommand("spray_pump", 0)
					sendCommand("exhaust_fan", 0)
					log.Println("🔴 Auto OFF → Manual. Spray+Fan stopped.")
				} else {
					log.Println("🟢 Auto ON → AI starting...")
				}

				autoMutex.RLock()
				broadcastJSON(map[string]interface{}{"type": "auto_config", "config": autoConfig})
				autoMutex.RUnlock()

			case "auto_config":
				if msg.Config != nil {
					autoMutex.Lock()
					wasOn := autoConfig.AutoMode
					autoConfig = *msg.Config
					autoConfig.AutoMode = wasOn
					autoMutex.Unlock()
					log.Printf("🔧 Config updated")
					autoMutex.RLock()
					broadcastJSON(map[string]interface{}{"type": "auto_config", "config": autoConfig})
					autoMutex.RUnlock()
				}

			case "control", "":
				autoMutex.RLock()
				isAuto := autoConfig.AutoMode
				autoMutex.RUnlock()

				if isAuto && msg.Device != "refill_pump" {
					errMsg, _ := json.Marshal(map[string]string{
						"type":    "error",
						"message": "Auto mode চালু। Manual control এর জন্য Auto mode বন্ধ করুন।",
					})
					conn.WriteMessage(websocket.TextMessage, errMsg)
					continue
				}

				log.Printf("🎮 Manual: %s → %d", msg.Device, msg.Action)
				controlTopic := os.Getenv("MQTT_TOPIC_CONTROL")
				if controlTopic == "" {
					controlTopic = "aeroponics/control"
				}
				cmdJSON, _ := json.Marshal(ControlCommand{Device: msg.Device, Action: msg.Action})
				token := mqttClient.Publish(controlTopic, 1, false, cmdJSON)
				token.Wait()
			}
		}
	}()
}

// ============================================================
// 🌐 REST API
// ============================================================

func handleGetData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	dataMutex.RLock()
	defer dataMutex.RUnlock()
	json.NewEncoder(w).Encode(map[string]interface{}{"type": "sensor_data", "data": latestData})
}

func handleControl(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == "OPTIONS" { w.WriteHeader(http.StatusOK); return }
	if r.Method != "POST" { http.Error(w, "Method not allowed", http.StatusMethodNotAllowed); return }

	var cmd ControlCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	cmdJSON, _ := json.Marshal(cmd)
	controlTopic := os.Getenv("MQTT_TOPIC_CONTROL")
	if controlTopic == "" { controlTopic = "aeroponics/control" }
	token := mqttClient.Publish(controlTopic, 1, false, cmdJSON)
	token.Wait()
	if token.Error() != nil { http.Error(w, "MQTT publish failed", http.StatusInternalServerError); return }
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": fmt.Sprintf("%s → %d", cmd.Device, cmd.Action)})
}

func handleAutoConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == "OPTIONS" { w.WriteHeader(http.StatusOK); return }
	if r.Method == "GET" {
		autoMutex.RLock()
		defer autoMutex.RUnlock()
		json.NewEncoder(w).Encode(map[string]interface{}{"status": "ok", "config": autoConfig})
		return
	}
	if r.Method == "POST" {
		var cfg AutoConfig
		if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil { http.Error(w, "Invalid JSON", http.StatusBadRequest); return }
		autoMutex.Lock()
		wasOn := autoConfig.AutoMode
		autoConfig = cfg
		autoConfig.AutoMode = wasOn
		autoMutex.Unlock()
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	autoMutex.RLock()
	isAuto := autoConfig.AutoMode
	autoMutex.RUnlock()
	nasaAlert, nasaMaxTemp := nasaService.GetAlertState()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":            "running",
		"mqtt":              mqttClient.IsConnected(),
		"clients":           len(wsClients),
		"auto_mode":         isAuto,
		"peltier_uses":      "waterTemp1 (buffer tank)",
		"monitoring_only":   "waterTemp2 (main tank)",
		"nasa_alert":        nasaAlert,
		"nasa_max_temp":     nasaMaxTemp,
		"server":            "AeroQuant — EnviQuant",
		"version":           "3.0.0",
	})
}

// ============================================================
// 🚀 MAIN
// ============================================================

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ .env not found, using env vars")
	}

	autoConfig = defaultAutoConfig()

	broker := os.Getenv("MQTT_BROKER")
	port := os.Getenv("MQTT_PORT")
	clientID := os.Getenv("MQTT_CLIENT_ID")
	wsPort := os.Getenv("WS_PORT")

	if broker == "" { broker = "broker.hivemq.com" }
	if port == "" { port = "1883" }
	if clientID == "" { clientID = "aeroponics-server-01" }
	if wsPort == "" { wsPort = "8080" }

	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("tcp://%s:%s", broker, port))
	opts.SetClientID(clientID)
	opts.SetOnConnectHandler(onConnect)
	opts.SetConnectionLostHandler(onConnectionLost)
	opts.SetAutoReconnect(true)
	opts.SetMaxReconnectInterval(10 * time.Second)
	opts.SetKeepAlive(30 * time.Second)
	opts.SetCleanSession(true)

	mqttClient = mqtt.NewClient(opts)
	token := mqttClient.Connect()
	token.Wait()
	if token.Error() != nil {
		log.Fatalf("❌ MQTT connect failed: %v", token.Error())
	}

	go autoControlLoop()

	nasaService = NewNASAService()
	go nasaService.MonitorLoop()

	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/api/data", handleGetData)
	http.HandleFunc("/api/control", handleControl)
	http.HandleFunc("/api/auto", handleAutoConfig)
	http.HandleFunc("/api/health", handleHealth)
	http.HandleFunc("/api/nasa/forecast", nasaService.HandleForecast)

	log.Println("══════════════════════════════════════════")
	log.Println("🌱 AeroQuant Backend v2.1 — EnviQuant")
	log.Printf("📡 MQTT:      %s:%s", broker, port)
	log.Printf("🌐 WebSocket: ws://0.0.0.0:%s/ws", wsPort)
	log.Printf("🤖 Auto API:  http://0.0.0.0:%s/api/auto", wsPort)
	log.Println("💡 LED:  16hr ON / 8hr OFF from auto start")
	log.Println("❄️  Peltier: waterTemp1 (buffer tank)")
	log.Println("🚰 Refill: ESP32 safety (always active)")
	log.Println("🛰️  NASA:  POWER API heatwave defense")
	log.Println("══════════════════════════════════════════")

	if err := http.ListenAndServe(":"+wsPort, nil); err != nil {
		log.Fatalf("❌ Server failed: %v", err)
	}
}