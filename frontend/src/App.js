import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

// ═══════════════════════════════════════
// 🔐 PASSWORD GATE
// ═══════════════════════════════════════
const DASHBOARD_PASSWORD = 'envi999';
const SESSION_DURATION   = 60 * 60 * 1000; // 1 ঘণ্টা (milliseconds)
const SESSION_KEY        = 'aeroquant_auth';

function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    // Page load এ check করো — session আছে কিনা
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return false;
      const { expiry } = JSON.parse(stored);
      if (Date.now() < expiry) return true; // এখনো valid
      localStorage.removeItem(SESSION_KEY); // expired, clear করো
      return false;
    } catch {
      return false;
    }
  });

  const [input, setInput]     = useState('');
  const [error, setError]     = useState('');
  const [shake, setShake]     = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = () => {
    if (input === DASHBOARD_PASSWORD) {
      // 1 ঘণ্টার session save করো
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        expiry: Date.now() + SESSION_DURATION
      }));
      setUnlocked(true);
    } else {
      setError('Wrong password. Try again.');
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (unlocked) return children;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#050510',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute', width: '400px', height: '400px',
        borderRadius: '50%', background: 'radial-gradient(circle, #34d399, transparent)',
        filter: 'blur(80px)', opacity: 0.2, top: '-100px', left: '-100px'
      }} />
      <div style={{
        position: 'absolute', width: '350px', height: '350px',
        borderRadius: '50%', background: 'radial-gradient(circle, #60a5fa, transparent)',
        filter: 'blur(80px)', opacity: 0.2, bottom: '-100px', right: '-100px'
      }} />

      {/* Login Card */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '40px',
        width: '360px',
        backdropFilter: 'blur(20px)',
        textAlign: 'center',
        animation: shake ? 'gateShake 0.5s ease' : 'none',
        position: 'relative', zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌱</div>
        <div style={{
          fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px',
          background: 'linear-gradient(135deg, #34d399, #60a5fa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: '4px'
        }}>
          AeroQuant
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '32px' }}>
          by EnviQuant · Secure Access
        </div>

        {/* Password Input */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Enter dashboard password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            autoFocus
            style={{
              width: '100%', padding: '14px 44px 14px 16px',
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '12px', color: 'white', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
          {/* Show/Hide toggle */}
          <button
            onClick={() => setShowPass(!showPass)}
            style={{
              position: 'absolute', right: '12px', top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '16px', opacity: 0.5
            }}
          >
            {showPass ? '🙈' : '👁️'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            fontSize: '12px', color: '#f87171',
            marginBottom: '12px', fontWeight: 500
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleSubmit}
          style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, #059669, #0891b2)',
            border: 'none', borderRadius: '12px',
            color: 'white', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: '0 0 20px rgba(52,211,153,0.3)'
          }}
        >
          🔓 Access Dashboard
        </button>

        <div style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.2)',
          marginTop: '20px'
        }}>
          Session expires after 1 hour
        </div>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes gateShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-10px); }
          40%      { transform: translateX(10px); }
          60%      { transform: translateX(-8px); }
          80%      { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔧 CONFIGURATION
// ═══════════════════════════════════════════════════════════
const WS_URL  = 'ws://198.195.239.38:8071/ws';
const API_URL = 'http://198.195.239.38:8071';

// ═══════════════════════════════════════════════════════════
// 🎨 GAUGE COMPONENT
// ═══════════════════════════════════════════════════════════
function GaugeRing({ value, max, color, size = 100, strokeWidth = 8, label, unit }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="gauge-ring">
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="gauge-text">
        <span className="g-value" style={{ color }}>
          {value}<span style={{ fontSize: '14px', opacity: 0.6 }}>{unit}</span>
        </span>
        <span className="g-label">{label}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔘 TOGGLE SWITCH COMPONENT
// ═══════════════════════════════════════════════════════════
function ToggleSwitch({ icon, name, isOn, onToggle, color, disabled }) {
  return (
    <div className={`toggle-row ${disabled ? 'toggle-disabled' : ''}`}>
      <div className="toggle-info">
        <span className="toggle-icon">{icon}</span>
        <div>
          <div className="toggle-name">{name}</div>
          <div className={`toggle-status ${isOn ? 'on' : 'off'}`}>
            {disabled ? '🤖 AI Controlled' : isOn ? '● Active' : '○ Inactive'}
          </div>
        </div>
      </div>
      <button
        className={`toggle-switch ${isOn ? 'on' : ''}`}
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        style={isOn ? { background: color || 'var(--on-color)' } : {}}
      >
        <div className="toggle-knob" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ⏱️ MISTING COUNTDOWN COMPONENT
// ═══════════════════════════════════════════════════════════
function MistingTimer({ countdown, interval, sprayActive }) {
  const progress = sprayActive ? 1 : Math.max(0, 1 - countdown / interval);
  const size = 64;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const mm = Math.floor(countdown / 60);
  const ss = countdown % 60;

  return (
    <div className="misting-timer">
      <div className="misting-ring">
        <svg width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none"
            stroke="rgba(34,211,238,0.1)" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={sprayActive ? '#34d399' : '#22d3ee'} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <div className="misting-ring-text">
          {sprayActive
            ? <span style={{ fontSize: '10px', color: '#34d399' }}>💦</span>
            : <span style={{ fontSize: '11px', fontWeight: 800, color: '#22d3ee', fontVariantNumeric: 'tabular-nums' }}>
                {mm}:{ss.toString().padStart(2, '0')}
              </span>
          }
        </div>
      </div>
      <div className="misting-info">
        <div className="misting-label">
          {sprayActive ? 'Misting Now...' : 'Next Mist'}
        </div>
        <div className="misting-sub">
          {sprayActive ? 'Spray active' : `Every ${Math.round(interval / 60)}min cycle`}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🌱 CULTIVATION MAP COMPONENT (2 rows × 3 cols)
// ═══════════════════════════════════════════════════════════
function CultivationMap() {
  const plants = [
    { id: 'A1', status: 'healthy', label: 'Lettuce' },
    { id: 'A2', status: 'healthy', label: 'Basil' },
    { id: 'A3', status: 'healthy', label: 'Mint' },
    { id: 'B1', status: 'healthy', label: 'Spinach' },
    { id: 'B2', status: 'healthy', label: 'Kale' },
    { id: 'B3', status: 'healthy', label: 'Arugula' },
  ];

  return (
    <div className="cultivation-map" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 🚀 Mini 'Coming Soon' Badge (Top Right Corner) */}
      <div className="mini-coming-soon">
        <span style={{ fontSize: '12px' }}>🚀</span> COMING SOON
      </div>

      <div className="plant-grid" style={{ marginTop: '10px' }}>
        {plants.map(p => (
          <div key={p.id} className={`plant-cell plant-${p.status}`}>
            <span className="plant-icon">🌿</span>
            <span className="plant-id">{p.id}</span>
            <div className="plant-health-dot" />
          </div>
        ))}
      </div>
      <div className="map-legend" style={{ marginTop: 'auto' }}>
        <span className="legend-dot healthy" />
        <span className="legend-text">Healthy (6/6)</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔬 DISEASE CARD (2x3 Grid with Alert Demo)
// ═══════════════════════════════════════════════════════════
function DiseasePanel() {
  // Demo grid for disease detection (matches the 2x3 cultivation map)
  const cells = [
    { id: 'A1', risk: 'Clear', color: 'var(--accent-green)', icon: '🌿' },
    { id: 'A2', risk: 'Clear', color: 'var(--accent-green)', icon: '🌿' },
    { id: 'A3', risk: 'Clear', color: 'var(--accent-green)', icon: '🌿' },
    { id: 'B1', risk: 'Alert', color: 'var(--accent-red)', icon: '🦠', alert: true }, // Demo infection
    { id: 'B2', risk: 'Clear', color: 'var(--accent-green)', icon: '🌿' },
    { id: 'B3', risk: 'Clear', color: 'var(--accent-green)', icon: '🌿' },
  ];

  return (
    <div className="disease-panel" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 🔬 Mini 'Coming Soon' Badge */}
      <div className="mini-coming-soon">
        <span style={{ fontSize: '12px' }}>🔬</span> COMING SOON
      </div>

      <div className="plant-grid" style={{ marginTop: '10px' }}>
        {cells.map(c => (
          <div key={c.id} className="plant-cell" style={{ borderColor: c.color, background: `${c.color}15`, position: 'relative' }}>
            <span className="plant-icon" style={{ opacity: c.alert ? 1 : 0.6 }}>{c.icon}</span>
            <span className="plant-id" style={{ color: c.color }}>{c.risk}</span>
            
            {/* Cool glowing radar pulse for the infected cell */}
            {c.alert && <div className="pulse-alert-ring" />}
          </div>
        ))}
      </div>
      <div className="map-legend" style={{ marginTop: 'auto' }}>
        <span className="legend-dot" style={{ background: 'var(--accent-red)', boxShadow: '0 0 8px var(--accent-red)' }} />
        <span className="legend-text" style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Pathogen Detected (B1)</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ❤️ SYSTEM HEALTH MODAL
// ═══════════════════════════════════════════════════════════
function SystemHealthModal({ isOpen, onClose, data, connected, autoMode }) {
  if (!isOpen) return null;

  const checks = [
    { label: 'WebSocket Backend', ok: connected, detail: connected ? 'Connected' : 'Disconnected' },
    { label: 'MQTT Broker', ok: connected, detail: 'broker.hivemq.com:1883' },
    { label: 'Root DHT22 (Pin 4)', ok: data.root_temp > 0, detail: `${data.root_temp}°C / ${data.root_humidity}%` },
    { label: 'Ambient DHT22 (Pin 16)', ok: data.ambient_temp > 0, detail: `${data.ambient_temp}°C / ${data.ambient_humidity}%` },
    { label: 'Buffer Water Temp (DS18B20)', ok: data.water_temp1 > 0, detail: `${data.water_temp1}°C` },
    { label: 'Main Water Temp (DS18B20)', ok: data.water_temp2 > 0, detail: `${data.water_temp2}°C` },
    { label: 'pH Sensor (Pin 34)', ok: data.ph > 0, detail: `${data.ph.toFixed(1)} pH` },
    { label: 'TDS Sensor (Pin 35)', ok: data.tds > 0, detail: `${Math.round(data.tds)} ppm` },
    { label: 'Buffer Float (Pin 13)', ok: true, detail: data.water_level === 1 ? 'OK Level' : '⚠ LOW' },
    { label: 'Main Float Safety (Pin 14)', ok: true, detail: data.main_water_level === 1 ? 'Not Full' : '⚠ FULL / Pump Stop' },
    { label: 'Spray Pump Relay (Pin 27)', ok: true, detail: data.spray_pump ? 'ON' : 'Standby' },
    { label: 'Peltier Cooling (Pin 26)', ok: true, detail: data.cooling ? 'Cooling' : 'Standby' },
    { label: 'Grow Light (Pin 25)', ok: true, detail: data.grow_light ? 'ON' : 'Standby' },
    { label: 'Exhaust Fan PWM (Pin 18)', ok: true, detail: `${Math.round((data.exhaust_fan/255)*100)}% Speed` },
    { label: 'Refill Pump (Pin 32)', ok: true, detail: data.refill_pump ? 'Pumping' : 'Standby' },
    { label: 'AI Auto Mode', ok: autoMode, detail: autoMode ? '🤖 Active' : 'Manual' },
  ];

  const healthScore = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content health-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>❤️</span>
            <div>
              <div className="modal-title">System Health</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>AeroQuant v2.0 — EnviQuant</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: healthScore > 80 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                {healthScore}%
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Health Score</div>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="health-list">
          {checks.map((c, i) => (
            <div key={i} className="health-row">
              <span className={`health-dot ${c.ok ? 'ok' : 'fail'}`} />
              <span className="health-label">{c.label}</span>
              <span className="health-detail" style={{ color: c.ok ? 'var(--text-secondary)' : 'var(--accent-red)' }}>
                {c.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📷 CAMERA MODAL
// ═══════════════════════════════════════════════════════════
function CameraModal({ isOpen, onClose }) {
  const [camUrl, setCamUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const cells = [
    { id: 0, label: 'Row A — Col 1', pos: 'A1' },
    { id: 1, label: 'Row A — Col 2', pos: 'A2' },
    { id: 2, label: 'Row A — Col 3', pos: 'A3' },
    { id: 3, label: 'Row B — Col 1', pos: 'B1' },
    { id: 4, label: 'Row B — Col 2', pos: 'B2' },
    { id: 5, label: 'Row B — Col 3', pos: 'B3' },
  ];

  const toggleConnection = () => {
    if (!camUrl) return;
    setIsConnected(!isConnected);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cam-modal-main" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📷</span>
            <div>
              <div className="modal-title">Cultivation Camera Vision</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>1 Main Feed + 6 Overlay Layers</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ─── Main Video Container ─── */}
        <div className="cam-vision-container">
          {/* Main Video Background */}
          {isConnected ? (
            <img
              src={`http://${camUrl}:81/stream`}
              alt="Main Feed"
              className="cam-main-video"
            />
          ) : (
            <div className="cam-main-placeholder">
              <span style={{ fontSize: '32px', marginBottom: '8px' }}>🌿</span>
              <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>No Video Feed</span>
              <span style={{ fontSize: '11px', color: 'var(--accent-green)', marginTop: '4px' }}>● Enter IP to connect</span>
            </div>
          )}

          {/* 6 Grid Layers ON TOP of the video */}
          <div className="cam-overlay-grid">
            {cells.map(cell => (
              <div key={cell.id} className="cam-overlay-cell">
                {/* Status badge */}
                <div className="cam-cell-badge">
                  <span className="cam-ok-dot" />
                  OK
                </div>
                {/* Position label */}
                <div className="cam-cell-pos">{cell.pos}</div>
                {/* Center Label Overlay */}
                <div className="cam-cell-label-overlay">{cell.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Connect row */}
        <div className="cam-input-row">
          <input
            className="cam-input"
            placeholder="ESP32-CAM IP (e.g. 192.168.1.200)"
            value={camUrl}
            onChange={e => setCamUrl(e.target.value)}
          />
          <button className="cam-connect-btn" onClick={toggleConnection}>
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════
// 🛰️ NASA ALERT BANNER COMPONENT
// ═══════════════════════════════════════════════════════════
function NASAAlertBanner({ alert, forecast }) {
  if (!alert) return null;

  return (
    <div className="nasa-alert-banner">
      <div className="nasa-banner-content">
        <span className="nasa-banner-icon">🛰️</span>
        <div className="nasa-banner-text">
          <span className="nasa-banner-title">NASA Alert: Extreme Heat Predicted</span>
          <span className="nasa-banner-subtitle">
            Preemptive Root-Cooling Activated — Max forecast: {forecast?.max_temp?.toFixed(1)}°C
          </span>
        </div>
        <span className="nasa-banner-pulse" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🛰️ NASA FORECAST WIDGET COMPONENT
// ═══════════════════════════════════════════════════════════
function NASAForecastWidget({ forecast, alert }) {
  const maxTemp = forecast?.max_temp || 0;
  const threshold = forecast?.threshold || 35;
  const location = forecast?.location || '—';
  const lastFetch = forecast?.last_fetch
    ? new Date(forecast.last_fetch).toLocaleTimeString()
    : '—';

  return (
    <div className="glass-card nasa-widget">
      <div className="card-header">
        <div className="card-header-left">
          <span className="card-icon">🛰️</span>
          <span className="card-title">NASA Forecast</span>
        </div>
        <span className={`card-badge ${alert ? 'nasa-badge-alert' : 'nasa-badge-ok'}`}>
          {alert ? '⚠ HEAT ALERT' : '✓ NORMAL'}
        </span>
      </div>
      <div className="nasa-widget-body">
        <div className="nasa-temp-row">
          <div className="nasa-temp-main">
            <span className="nasa-temp-value" style={{ color: alert ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {maxTemp.toFixed(1)}°C
            </span>
            <span className="nasa-temp-label">Max Forecast (72h)</span>
          </div>
          <div className="nasa-threshold">
            <span className="nasa-threshold-value">{threshold}°C</span>
            <span className="nasa-threshold-label">Threshold</span>
          </div>
        </div>
        <div className="nasa-forecast-details">
          <div className="nasa-detail-row">
            <span className="nasa-detail-label">📍 Location</span>
            <span className="nasa-detail-value">{location}</span>
          </div>
          <div className="nasa-detail-row">
            <span className="nasa-detail-label">🕐 Last Fetch</span>
            <span className="nasa-detail-value">{lastFetch}</span>
          </div>
          <div className="nasa-detail-row">
            <span className="nasa-detail-label">📡 Source</span>
            <span className="nasa-detail-value">NASA POWER API</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🌱 MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════
function App() {
  // ─── Sensor Data State ───
  const [data, setData] = useState({
    root_temp: 0, root_humidity: 0,
    ambient_temp: 0, ambient_humidity: 0,
    water_temp1: 0, water_temp2: 0,
    ph: 0, tds: 0, water_level: 1, main_water_level: 1,
    spray_pump: 0, cooling: 0, grow_light: 0,
    exhaust_fan: 0, refill_pump: 0, auto_mode: 0,
    timestamp: ''
  });

  // ─── UI State ───
  const [connected, setConnected] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // ─── AI Auto Mode State ───
  const [autoMode, setAutoMode] = useState(false);
  const [autoConfig, setAutoConfig] = useState({ spray_interval_sec: 600, spray_duration_sec: 5 });
  const [sprayCountdown, setSprayCountdown] = useState(600);
  const [sprayActive, setSprayActive] = useState(false);
  const lastSprayRef = useRef(Date.now());
  const sprayEndRef = useRef(0);

  // ─── 🛰️ NASA POWER State ───
  const [nasaAlert, setNasaAlert] = useState(false);
  const [nasaForecast, setNasaForecast] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  // ─── WebSocket Connection ───
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('✅ WebSocket Connected');
      setConnected(true);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'sensor_data' && msg.data) {
          setData(prev => ({ ...prev, ...msg.data }));
        } else if (msg.type === 'auto_config' && msg.config) {
          // Backend থেকে auto config sync হলে update করো
          setAutoConfig(msg.config);
          setAutoMode(msg.config.auto_mode);
          if (!msg.config.auto_mode) {
            setSprayActive(false);
          }
        } else if (msg.type === 'nasa_alert') {
          setNasaAlert(msg.alert);
          setNasaForecast(msg);
        } else if (msg.type === 'error') {
          console.warn('⚠️ Backend:', msg.message);
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('❌ WebSocket Disconnected');
      setConnected(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connectWebSocket]);

  // ─── Clock ───
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── AI Misting Countdown Timer ───
  useEffect(() => {
    if (!autoMode) return;

    const tick = setInterval(() => {
      const now = Date.now();
      const interval = autoConfig.spray_interval_sec * 1000;
      const duration = autoConfig.spray_duration_sec * 1000;

      if (sprayActive) {
        if (now > sprayEndRef.current) {
          setSprayActive(false);
          lastSprayRef.current = now;
          setSprayCountdown(autoConfig.spray_interval_sec);
        }
      } else {
        const elapsed = now - lastSprayRef.current;
        const remaining = Math.max(0, Math.ceil((interval - elapsed) / 1000));
        setSprayCountdown(remaining);
        if (elapsed >= interval) {
          setSprayActive(true);
          sprayEndRef.current = now + duration;
        }
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [autoMode, autoConfig, sprayActive]);

  // ─── Sync auto mode state from ESP32 echo ───
  useEffect(() => {
    if (data.auto_mode !== undefined) {
      // Only update if different (avoid loop)
      const espSaysAuto = data.auto_mode === 1;
      if (espSaysAuto !== autoMode && data.timestamp) {
        // Don't auto-update from ESP32 echo; backend auto_config is authoritative
      }
    }
  }, [data.auto_mode]);

  // ─── Send Manual Control Command ───
  const sendCommand = useCallback((device, action) => {
    // New backend format: {type: "control", device, action}
    const cmd = JSON.stringify({ type: 'control', device, action });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd);
    } else {
      fetch(`${API_URL}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device, action })
      }).catch(err => console.error('API Error:', err));
    }

    setData(prev => ({ ...prev, [device]: action }));
  }, []);

  // ─── Send Auto Mode Toggle ───
  const sendAutoMode = useCallback((enable) => {
    const cmd = JSON.stringify({ type: 'auto_mode', action: enable ? 1 : 0 });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd);
    }

    setAutoMode(enable);
    if (enable) {
      lastSprayRef.current = Date.now() - (autoConfig.spray_interval_sec * 1000); // spray soon
      setSprayCountdown(0);
    } else {
      setSprayActive(false);
    }
  }, [autoConfig.spray_interval_sec]);

  // ─── Helpers ───
  const toggle = (device) => {
    if (autoMode) return; // block manual in auto mode
    const newVal = data[device] === 1 ? 0 : 1;
    sendCommand(device, newVal);
  };

  const setFanSpeed = (speed) => {
    if (autoMode) return;
    sendCommand('exhaust_fan', parseInt(speed));
  };

  const fanPercent = Math.round((data.exhaust_fan / 255) * 100);

  // ═══════════════════════════════════════════════════════
  // 🖥️ RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <PasswordGate>
    <div className={`dashboard ${autoMode ? 'auto-mode-active' : ''}`}>
      {/* AI Mode Scan Line */}
      {autoMode && <div className="ai-scan-line" />}

      {/* Background Orbs */}
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        {autoMode && <div className="orb orb-ai" />}
      </div>

      {/* ─── TOP BAR ─── */}
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-logo">🌱</span>
          <div>
            <div className="topbar-title">AeroQuant</div>
            <div className="topbar-subtitle">by EnviQuant · Intelligent Aeroponic OS</div>
          </div>
        </div>

        {/* ─── AI MODE TOGGLE (Center) ─── */}
        <div className="ai-mode-toggle-wrap">
          <span className="ai-mode-label">{autoMode ? '🤖 AI AUTO' : '🖐 MANUAL'}</span>
          <button
            className={`ai-mode-toggle ${autoMode ? 'ai-on' : ''}`}
            onClick={() => sendAutoMode(!autoMode)}
            title={autoMode ? 'Switch to Manual' : 'Switch to AI Auto Mode'}
          >
            <div className="ai-toggle-knob">
              {autoMode ? '✦' : '○'}
            </div>
          </button>
          {autoMode && (
            <span className="ai-active-pulse">
              <span className="ai-pulse-dot" />
              ACTIVE
            </span>
          )}
        </div>

        <div className="topbar-right">
          <div className={`status-badge ${connected ? 'online' : 'offline'}`}>
            <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <span className="topbar-time">{currentTime}</span>
          <button className="health-btn" onClick={() => setHealthOpen(true)} title="System Health">
            ❤️ Health
          </button>
          <button className="cam-btn" onClick={() => setCamOpen(true)}>
            📷 Camera
          </button>
        </div>
      </div>

      {/* ─── 🛰️ NASA ALERT BANNER ─── */}
      <NASAAlertBanner alert={nasaAlert} forecast={nasaForecast} />

      {/* ─── MAIN GRID ─── */}
      <div className="main-grid">

        {/* ══ CARD 1: Root Chamber ══ */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-icon">🌿</span>
              <span className="card-title">Root Chamber</span>
            </div>
            <span className="card-badge" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--accent-green)' }}>Root Zone</span>
          </div>
          <div className="gauge-container">
            <GaugeRing value={data.root_temp} max={50}
              color="var(--accent-green)" size={110} label="Temperature" unit="°C" />
          </div>
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>💧 {data.root_humidity}% RH</span>
          </div>
        </div>

        {/* ══ CARD 2: Ambient ══ */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-icon">🏠</span>
              <span className="card-title">Ambient</span>
            </div>
            <span className="card-badge" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--accent-blue)' }}>Room Zone</span>
          </div>
          <div className="gauge-container">
            <GaugeRing value={data.ambient_temp} max={50}
              color="var(--accent-blue)" size={110} label="Temperature" unit="°C" />
          </div>
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>💧 {data.ambient_humidity}% RH</span>
          </div>
        </div>

        {/* ══ CARD 3: Water Temperature ══ */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-icon">🌊</span>
              <span className="card-title">Water Temp</span>
            </div>
            <span className="card-badge" style={{ background: 'rgba(34,211,238,0.15)', color: 'var(--accent-cyan)' }}>Water Tanks</span>
          </div>
          <div className="dual-metric">
            <div className="dual-row">
              <div className="dual-icon" style={{ background: 'rgba(34,211,238,0.1)' }}>🧪</div>
              <div className="dual-info">
                <div className="dual-value" style={{ color: 'var(--accent-cyan)' }}>{data.water_temp1}°C</div>
                <div className="dual-label">Buffer Tank</div>
              </div>
            </div>
            <div className="dual-row">
              <div className="dual-icon" style={{ background: 'rgba(96,165,250,0.1)' }}>💧</div>
              <div className="dual-info">
                <div className="dual-value" style={{ color: 'var(--accent-blue)' }}>{data.water_temp2}°C</div>
                <div className="dual-label">Main Tank</div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ CARD 3.5: NASA FORECAST WIDGET ══ */}
        <NASAForecastWidget forecast={nasaForecast} alert={nasaAlert} />

        {/* ══ CARD 4: CONTROLS (Span 2 rows) ══ */}
        <div className={`glass-card card-controls ${autoMode ? 'card-ai-active' : ''}`}>
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-icon">{autoMode ? '🤖' : '🎮'}</span>
              <span className="card-title">{autoMode ? 'AI Control' : 'Controls'}</span>
            </div>
            <span className="card-badge" style={{
              background: autoMode ? 'rgba(52,211,153,0.2)' : 'rgba(251,146,60,0.15)',
              color: autoMode ? 'var(--accent-green)' : 'var(--accent-orange)',
              border: autoMode ? '1px solid rgba(52,211,153,0.4)' : 'none'
            }}>
              {autoMode ? '✦ AUTO' : 'MANUAL'}
            </span>
          </div>

          {/* Misting Timer - only in auto mode */}
          {autoMode && (
            <MistingTimer
              countdown={sprayCountdown}
              interval={autoConfig.spray_interval_sec}
              sprayActive={sprayActive}
            />
          )}

          <div className="controls-list">
            <ToggleSwitch icon="💦" name="Spray Pump"
              isOn={data.spray_pump === 1} onToggle={() => toggle('spray_pump')}
              color="var(--accent-blue)" disabled={autoMode} />
            <ToggleSwitch icon="❄️" name="Cooling"
              isOn={data.cooling === 1} onToggle={() => toggle('cooling')}
              color="var(--accent-cyan)" disabled={autoMode} />
            <ToggleSwitch icon="💡" name="Grow Light"
              isOn={data.grow_light === 1} onToggle={() => toggle('grow_light')}
              color="var(--accent-yellow)" disabled={autoMode} />
            <ToggleSwitch icon="🚰" name="Refill Pump"
              isOn={data.refill_pump === 1} onToggle={() => toggle('refill_pump')}
              color="var(--accent-purple)" disabled={false}
            />

            {/* Fan Slider */}
            <div className="fan-control">
              <div className="fan-header">
                <div className="fan-info">
                  <span className={`fan-icon ${data.exhaust_fan > 0 ? 'spinning' : ''}`}>🌀</span>
                  <div>
                    <div className="fan-name">Exhaust Fan</div>
                    <div className={`toggle-status ${data.exhaust_fan > 0 ? 'on' : 'off'}`}>
                      {autoMode ? '🤖 AI Controlled' : data.exhaust_fan > 0 ? `● ${fanPercent}% Speed` : '○ Inactive'}
                    </div>
                  </div>
                </div>
                <span className="fan-speed-value">{fanPercent}%</span>
              </div>
              <div className="fan-slider-track">
                <input type="range" min="0" max="255" step="1"
                  value={data.exhaust_fan}
                  onChange={e => setFanSpeed(e.target.value)}
                  disabled={autoMode}
                  style={{ opacity: autoMode ? 0.4 : 1 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ══ CARD 5: pH Level ══ */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-icon">⚗️</span>
              <span className="card-title">pH Level</span>
            </div>
            <span className="card-badge" style={{ background: 'rgba(244,114,182,0.15)', color: 'var(--accent-pink)' }}>Main Tank</span>
          </div>
          <div className="gauge-container">
            <GaugeRing value={data.ph} max={14}
              color="var(--accent-pink)" size={110} label="Acidity" unit="" />
          </div>
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: data.ph >= 5.5 && data.ph <= 6.5 ? 'var(--accent-green)' : 'var(--accent-red)'
            }}>
              {data.ph >= 5.5 && data.ph <= 6.5 ? '✓ Optimal Range' : '⚠ Out of Range'}
            </span>
          </div>
        </div>

        {/* ══ CARD 6: TDS ══ */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-icon">📊</span>
              <span className="card-title">TDS / Nutrients</span>
            </div>
            <span className="card-badge" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--accent-yellow)' }}>Main Tank</span>
          </div>
          <div className="gauge-container">
            <GaugeRing value={Math.round(data.tds)} max={1500}
              color="var(--accent-yellow)" size={110} label="Nutrients" unit=" ppm" />
          </div>
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: data.tds >= 400 && data.tds <= 1200 ? 'var(--accent-green)' : 'var(--accent-orange)'
            }}>
              {data.tds >= 400 && data.tds <= 1200 ? '✓ Good Level' : '⚠ Check Nutrients'}
            </span>
          </div>
        </div>

        {/* ══ CARD 7: Water Levels ══ */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-icon">🪣</span>
              <span className="card-title">Water Levels</span>
            </div>
            <span className="card-badge" style={{
              background: (data.water_level === 0 && data.main_water_level === 0) ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
              color: (data.water_level === 0 && data.main_water_level === 0) ? 'var(--accent-green)' : 'var(--accent-red)'
            }}>Buffer Tank</span>
          </div>
          <div className="water-level-container" style={{ gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div className="water-tank" style={{ width: '40px', height: '60px' }}>
                <div className="water-fill" style={{
                 height: data.water_level === 0 ? '75%' : '15%',
                 background: data.water_level === 0
  ? 'linear-gradient(to top, var(--accent-blue), var(--accent-cyan))'
  : 'linear-gradient(to top, var(--accent-red), var(--accent-orange))'
                }} />
              </div>
              <div className="water-status-text" style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: data.water_level === 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {data.water_level === 0 ? 'OK' : 'LOW'}
                </div>
                <div className="water-label">Buffer Bottom</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div className="water-tank" style={{ width: '40px', height: '60px' }}>
                <div className="water-fill" style={{
                  height: data.main_water_level === 0 ? '75%' : '15%',
                 background: data.main_water_level === 0
                    ? 'linear-gradient(to top, var(--accent-blue), var(--accent-cyan))'
                    : 'linear-gradient(to top, var(--accent-red), var(--accent-orange))'
                }} />
              </div>
              <div className="water-status-text" style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: data.main_water_level === 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {data.main_water_level === 0 ? 'OK' : 'LOW'}
                </div>
                <div className="water-label">Buffer Top</div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ CARD 8: Disease + Cultivation (Wide) ══ */}
        <div className="glass-card card-wide card-future">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-icon">🧬</span>
              <span className="card-title">Smart Cultivation — 2R × 3C</span>
            </div>
            <span className="card-badge" style={{ background: 'rgba(162,139,250,0.15)', color: 'var(--accent-purple)' }}>
              AI VISION
            </span>
          </div>
          <div className="future-split">
            {/* Left: Cultivation Map */}
            <div className="future-section">
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.8px', marginBottom: '8px' }}>
                CULTIVATION MAP
              </div>
              <CultivationMap />
            </div>
            {/* Right: Disease Detection */}
            <div className="future-section" style={{ borderLeft: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.8px', marginBottom: '8px' }}>
                DISEASE DETECTION
              </div>
              <DiseasePanel />
            </div>
          </div>
        </div>

        {/* ══ CARD 9: Humidity ══ */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-icon">💧</span>
              <span className="card-title">Humidity</span>
            </div>
          </div>
          <div className="dual-metric">
            <div className="dual-row">
              <div className="dual-icon" style={{ background: 'rgba(52,211,153,0.1)' }}>🌿</div>
              <div className="dual-info">
                <div className="dual-value" style={{ color: 'var(--accent-green)' }}>{data.root_humidity}%</div>
                <div className="dual-label">Root Chamber RH</div>
              </div>
            </div>
            <div className="dual-row">
              <div className="dual-icon" style={{ background: 'rgba(96,165,250,0.1)' }}>🏠</div>
              <div className="dual-info">
                <div className="dual-value" style={{ color: 'var(--accent-blue)' }}>{data.ambient_humidity}%</div>
                <div className="dual-label">Ambient RH</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Modals ─── */}
      <CameraModal isOpen={camOpen} onClose={() => setCamOpen(false)} />
      <SystemHealthModal
        isOpen={healthOpen}
        onClose={() => setHealthOpen(false)}
        data={data}
        connected={connected}
        autoMode={autoMode}
      />
    </div>
     </PasswordGate>
  );
}

export default App;