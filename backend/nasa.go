package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"sync"
	"time"
)

// ============================================================
// 🛰️ NASA POWER API SERVICE
// ============================================================

const (
	nasaPowerBaseURL = "https://power.larc.nasa.gov/api/temporal/hourly/point"
)

// NASAForecast represents a single hourly temperature reading
type NASAForecast struct {
	Timestamp string  `json:"timestamp"`
	TempC     float64 `json:"temp_c"`
}

// NASAService holds configuration and cached forecast state
type NASAService struct {
	Latitude  float64
	Longitude float64
	Threshold float64
	Interval  time.Duration

	mu              sync.RWMutex
	latestForecast  []NASAForecast
	maxTemp         float64
	alertActive     bool
	lastFetch       time.Time
	esp32Acked      bool
	esp32AckTime    time.Time
	preemptiveCount int
}

// nasaPowerResponse matches the NASA POWER API JSON structure
type nasaPowerResponse struct {
	Properties struct {
		Parameter struct {
			T2M map[string]float64 `json:"T2M"`
		} `json:"parameter"`
	} `json:"properties"`
}

// NewNASAService creates a NASA POWER service with env-configurable settings
func NewNASAService() *NASAService {
	lat := envFloat("NASA_LAT", 23.8103)     // Dhaka, Bangladesh
	lon := envFloat("NASA_LON", 90.4074)
	threshold := envFloat("NASA_THRESHOLD", 35.0)
	intervalMin := envInt("NASA_FETCH_INTERVAL_MIN", 30)

	return &NASAService{
		Latitude:  lat,
		Longitude: lon,
		Threshold: threshold,
		Interval:  time.Duration(intervalMin) * time.Minute,
	}
}

func envFloat(key string, defaultVal float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return defaultVal
}

func envInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultVal
}

// FetchForecast retrieves hourly T2M data from NASA POWER API
func (s *NASAService) FetchForecast() error {
	now := time.Now().UTC()
	start := now.Format("20060102")
	end := now.Add(72 * time.Hour).Format("20060102")

	url := fmt.Sprintf("%s?parameters=T2M&community=AG&longitude=%.4f&latitude=%.4f&start=%s&end=%s&format=JSON",
		nasaPowerBaseURL, s.Longitude, s.Latitude, start, end)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("NASA POWER API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("NASA POWER API returned %d: %s", resp.StatusCode, string(body))
	}

	var nasaResp nasaPowerResponse
	if err := json.NewDecoder(resp.Body).Decode(&nasaResp); err != nil {
		return fmt.Errorf("failed to parse NASA POWER response: %w", err)
	}

	// Parse and sort timestamps
	var forecasts []NASAForecast
	for ts, temp := range nasaResp.Properties.Parameter.T2M {
		// Hourly format: YYYYMMDDHH
		t, err := time.Parse("2006010215", ts)
		if err != nil {
			continue
		}
		forecasts = append(forecasts, NASAForecast{
			Timestamp: t.Format(time.RFC3339),
			TempC:     temp,
		})
	}

	if len(forecasts) == 0 {
		return fmt.Errorf("no forecast data returned from NASA POWER API")
	}

	sort.Slice(forecasts, func(i, j int) bool {
		return forecasts[i].Timestamp < forecasts[j].Timestamp
	})

	// Find max temperature in forecast window
	maxTemp := -999.0
	for _, f := range forecasts {
		if f.TempC > maxTemp {
			maxTemp = f.TempC
		}
	}

	s.mu.Lock()
	s.latestForecast = forecasts
	s.maxTemp = maxTemp
	s.lastFetch = time.Now()
	s.alertActive = maxTemp > s.Threshold
	s.mu.Unlock()

	log.Printf("🛰️ NASA POWER: %d hourly readings | Max: %.1f°C | Threshold: %.1f°C | Alert: %v",
		len(forecasts), maxTemp, s.Threshold, s.alertActive)

	return nil
}

// MonitorLoop runs continuously, fetching forecasts and triggering alerts
func (s *NASAService) MonitorLoop() {
	log.Printf("🛰️ NASA POWER Monitor started (interval: %v, threshold: %.1f°C)", s.Interval, s.Threshold)

	// Initial fetch
	if err := s.FetchForecast(); err != nil {
		log.Printf("⚠️ Initial NASA POWER fetch failed: %v", err)
	}

	ticker := time.NewTicker(s.Interval)
	defer ticker.Stop()

	for range ticker.C {
		if err := s.FetchForecast(); err != nil {
			log.Printf("⚠️ NASA POWER fetch error: %v", err)
			continue
		}

		s.mu.RLock()
		alert := s.alertActive
		maxTemp := s.maxTemp
		s.mu.RUnlock()

		if alert {
			log.Printf("🚨 NASA ALERT: Max temp %.1f°C exceeds threshold %.1f°C — triggering preemptive cooling", maxTemp, s.Threshold)
			s.triggerPreemptiveCooling(true)
		} else {
			log.Printf("✅ NASA: Max temp %.1f°C below threshold %.1f°C — conditions normal", maxTemp, s.Threshold)
			s.triggerPreemptiveCooling(false)
		}
	}
}

// triggerPreemptiveCooling sends MQTT command and broadcasts WebSocket alert
func (s *NASAService) triggerPreemptiveCooling(alert bool) {
	action := 0
	if alert {
		action = 1
	}

	s.mu.Lock()
	s.preemptiveCount++
	s.esp32Acked = false
	s.mu.Unlock()

	// Send MQTT command to ESP32
	sendCommand("preemptive_cooling", action)

	// Broadcast to WebSocket clients
	s.mu.RLock()
	maxTemp := s.maxTemp
	forecast := make([]NASAForecast, len(s.latestForecast))
	copy(forecast, s.latestForecast)
	s.mu.RUnlock()

	broadcastJSON(map[string]interface{}{
		"type":       "nasa_alert",
		"alert":      alert,
		"max_temp":   maxTemp,
		"threshold":  s.Threshold,
		"forecast":   forecast,
		"timestamp":  time.Now().Format(time.RFC3339),
		"source":     "NASA POWER API",
		"location":   fmt.Sprintf("%.4f, %.4f", s.Latitude, s.Longitude),
	})
}

// HandleESP32Ack processes acknowledgment from ESP32
func (s *NASAService) HandleESP32Ack(acked bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.esp32Acked = acked
	s.esp32AckTime = time.Now()
	if acked {
		log.Println("✅ ESP32 acknowledged preemptive cooling command")
	}
}

// GetAckState returns ESP32 acknowledgment status
func (s *NASAService) GetAckState() (bool, time.Time) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.esp32Acked, s.esp32AckTime
}

// HandleForecast serves the current forecast via REST API
func (s *NASAService) HandleForecast(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	s.mu.RLock()
	defer s.mu.RUnlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":        "ok",
		"source":        "NASA POWER API",
		"location":      fmt.Sprintf("%.4f, %.4f", s.Latitude, s.Longitude),
		"threshold":     s.Threshold,
		"max_temp":      s.maxTemp,
		"alert_active":  s.alertActive,
		"last_fetch":    s.lastFetch.Format(time.RFC3339),
		"forecast":      s.latestForecast,
	})
}

// GetAlertState returns current alert status (for health endpoint)
func (s *NASAService) GetAlertState() (bool, float64) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.alertActive, s.maxTemp
}
