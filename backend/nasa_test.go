package main

import (
	"encoding/json"
	"testing"
)

func TestNASAPowerResponseParsing(t *testing.T) {
	// Simulate NASA POWER API response structure
	rawJSON := `{
		"type": "Feature",
		"geometry": {
			"type": "Point",
			"coordinates": [90.4074, 23.8103, 0]
		},
		"properties": {
			"parameter": {
				"T2M": {
					"2026100500": 28.5,
					"2026100501": 31.2,
					"2026100502": 36.8,
					"2026100503": 33.1,
					"2026100504": 29.7
				}
			}
		}
	}`

	var resp nasaPowerResponse
	if err := json.Unmarshal([]byte(rawJSON), &resp); err != nil {
		t.Fatalf("Failed to parse NASA response: %v", err)
	}

	params := resp.Properties.Parameter.T2M
	if len(params) != 5 {
		t.Errorf("Expected 5 readings, got %d", len(params))
	}

	// Check specific values
	if params["2026100502"] != 36.8 {
		t.Errorf("Expected 36.8 for 2026100502, got %f", params["2026100502"])
	}

	// Verify max temp detection
	maxTemp := -999.0
	for _, temp := range params {
		if temp > maxTemp {
			maxTemp = temp
		}
	}
	if maxTemp != 36.8 {
		t.Errorf("Expected max temp 36.8, got %f", maxTemp)
	}

	// Verify threshold logic
	threshold := 35.0
	if maxTemp <= threshold {
		t.Errorf("Expected alert (maxTemp=%.1f > threshold=%.1f)", maxTemp, threshold)
	}
}

func TestNASAServiceCreation(t *testing.T) {
	service := NewNASAService()
	if service == nil {
		t.Fatal("NewNASAService returned nil")
	}
	if service.Latitude != 23.8103 {
		t.Errorf("Expected default lat 23.8103, got %f", service.Latitude)
	}
	if service.Longitude != 90.4074 {
		t.Errorf("Expected default lon 90.4074, got %f", service.Longitude)
	}
	if service.Threshold != 35.0 {
		t.Errorf("Expected default threshold 35.0, got %f", service.Threshold)
	}
}
