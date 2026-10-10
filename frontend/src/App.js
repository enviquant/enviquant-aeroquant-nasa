import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

// ─── SVG ICON FAMILY (uniform 1.5px stroke, round caps — no emoji icons) ───
// Note: icon DB lookup ("leaf", "sensor leaf satellite icon" --domain icons)
// returned 0 results twice, so these are hand-built Lucide-style fallbacks.
const Svg = ({ children, size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" {...props}>{children}</svg>
);
const MissionMark = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="AeroQuant mission mark: seedling in orbit">
    <defs>
      <linearGradient id="aq-mark-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#38bdf8" />
      </linearGradient>
    </defs>
    <ellipse cx="24" cy="24" rx="20" ry="8.5" fill="none" stroke="url(#aq-mark-g)" strokeWidth="2" transform="rotate(-24 24 24)" opacity="0.9" />
    <circle cx="24" cy="24" r="14.5" fill="rgba(255,255,255,0.08)" stroke="url(#aq-mark-g)" strokeWidth="2" />
    <path d="M24 32.5v-9" stroke="url(#aq-mark-g)" strokeWidth="2" strokeLinecap="round" />
    <path d="M24 23.5c0-4.5 3.2-7.5 8.5-7.5 0 5.5-3.4 8.3-8.5 7.5z" fill="rgba(52,211,153,0.35)" stroke="url(#aq-mark-g)" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M24 23.5c0-4.5-3.2-7.5-8.5-7.5 0 5.5 3.4 8.3 8.5 7.5z" fill="rgba(56,189,248,0.35)" stroke="url(#aq-mark-g)" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="38.5" cy="12" r="2" fill="#22d3ee" />
  </svg>
);
const LeafIcon = (p) => (<Svg {...p}><path d="M12 21v-8" /><path d="M12 13c0-4.2 3-7.2 8-7.2 0 5-3.2 7.8-8 7.2z" /><path d="M12 13c0-4.2-3-7.2-8-7.2 0 5 3.2 7.8 8 7.2z" /></Svg>);
const HomeIcon = (p) => (<Svg {...p}><path d="M3.5 11 12 3.5 20.5 11" /><path d="M5.5 9.5V20h5v-5.5h3V20h5V9.5" /></Svg>);
const WaveIcon = (p) => (<Svg {...p}><path d="M2 9c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 3.5-2 5-1" /><path d="M2 15c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 3.5-2 5-1" /></Svg>);
const FlaskIcon = (p) => (<Svg {...p}><path d="M9.5 3h5" /><path d="M10 3v5.2L4.8 17a2 2 0 0 0 1.8 3h10.8a2 2 0 0 0 1.8-3L14 8.2V3" /><path d="M7.5 14.5h9" /></Svg>);
const ChartIcon = (p) => (<Svg {...p}><path d="M4 4v15.5h15.5" /><path d="M7.5 14.5l3.5-4 3 2.5 4.5-5.5" /></Svg>);
const BucketIcon = (p) => (<Svg {...p}><path d="M5 9h14l-1.3 10a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8L5 9z" /><path d="M4 9c0-1.7 3.6-3 8-3s8 1.3 8 3" /><path d="M8.5 14c1.1-1 2.3-1 3.5 0s2.4 1 3.5 0" /></Svg>);
const DnaIcon = (p) => (<Svg {...p}><path d="M7 3c0 8 10 8 10 18" /><path d="M17 3c0 8-10 8-10 18" /><path d="M9.3 7h5.4M8.3 12h7.4M9.3 17h5.4" /></Svg>);
const DropIcon = (p) => (<Svg {...p}><path d="M12 3s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11z" /></Svg>);
const SatelliteIcon = (p) => (<Svg {...p}><circle cx="12" cy="14" r="2.2" /><path d="M10.5 12.5 5 7" /><path d="M13.5 12.5 19 7" /><rect x="3" y="4" width="6" height="4" rx="1" /><rect x="15" y="4" width="6" height="4" rx="1" /><path d="M18 16.5a5 5 0 0 1 3 3" /></Svg>);
const CpuIcon = (p) => (<Svg {...p}><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M10 2v3M14 2v3M10 19v3M14 19v3M2 10h3M2 14h3M19 10h3M19 14h3" /><circle cx="12" cy="12" r="1" fill="currentColor" /></Svg>);
const HeartIcon = (p) => (<Svg {...p}><path d="M12 20.5s-7.2-4.7-9.3-8.7C1.2 8.6 3 5.2 6.2 5.2c1.9 0 3.2 1 3.8 2.1.6-1.1 1.9-2.1 3.8-2.1 3.2 0 5 3.4 3.5 6.6-2.1 4-9.3 8.7-9.3 8.7z" transform="translate(2 0) scale(0.85)" /></Svg>);
const CameraIcon = (p) => (<Svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13.5" r="3.5" /><path d="M8.5 7 10 4.5h4L15.5 7" /></Svg>);
const SnowIcon = (p) => (<Svg {...p}><path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" /><path d="M12 2 10 4.5M12 2l2 2.5M12 22l-2-2.5M12 22l2-2.5" /></Svg>);
const BulbIcon = (p) => (<Svg {...p}><path d="M9.5 18h5M10.5 21h3" /><path d="M12 3a6 6 0 0 0-3.4 10.9c.7.6 1.1 1.3 1.3 2.1h4.2c.2-.8.6-1.5 1.3-2.1A6 6 0 0 0 12 3z" /></Svg>);
const PumpIcon = (p) => (<Svg {...p}><path d="M2.5 12h19" /><path d="M12 12V6" /><circle cx="12" cy="4.8" r="1.4" /><path d="M8 12v7.5h8V12" /><path d="M8 15.5h8" /></Svg>);
const FanIcon = ({ spin = false, ...p }) => (
  <span className={spin ? 'animate-spin inline-flex' : 'inline-flex'} aria-hidden="true">
    <Svg {...p}><circle cx="12" cy="12" r="1.6" /><path d="M12 10.4C10.5 7 10.8 4 12.5 2.5 14 4 13.7 7 12 10.4z" /><path d="M12 10.4C10.5 7 10.8 4 12.5 2.5 14 4 13.7 7 12 10.4z" transform="rotate(120 12 12)" /><path d="M12 10.4C10.5 7 10.8 4 12.5 2.5 14 4 13.7 7 12 10.4z" transform="rotate(240 12 12)" /></Svg>
  </span>
);
const AlertIcon = (p) => (<Svg {...p}><path d="M12 3.5 2.5 20h19L12 3.5z" /><path d="M12 9.5V14" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></Svg>);
const EyeIcon = (p) => (<Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></Svg>);
const EyeOffIcon = (p) => (<Svg {...p}><path d="M4 4l16 16" /><path d="M10.6 6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-3 3.3M6.2 8.2A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.2 0 2.3-.3 3.3-.7" /></Svg>);
const LockIcon = (p) => (<Svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" /></Svg>);
const RocketIcon = (p) => (<Svg {...p}><path d="M12 2.5c3.5 2 5 6 4.5 10.5L12 17.5 7.5 13C7 8.5 8.5 4.5 12 2.5z" /><circle cx="12" cy="9" r="1.6" /><path d="M7.5 13 4 16.5M16.5 13l3.5 3.5M12 17.5V21" /></Svg>);

const DASHBOARD_PASSWORD = process.env.REACT_APP_DASHBOARD_PASSWORD || '';
const SESSION_DURATION = 60 * 60 * 1000;
const SESSION_KEY = 'aeroquant_auth';

function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return false;
      const { expiry } = JSON.parse(stored);
      if (Date.now() < expiry) return true;
      localStorage.removeItem(SESSION_KEY);
      return false;
    } catch {
      return false;
    }
  });

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = () => {
    if (input === DASHBOARD_PASSWORD) {
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

  // No password configured (local dev): run open.
  // In production set REACT_APP_DASHBOARD_PASSWORD.
  if (!DASHBOARD_PASSWORD) return children;
  if (unlocked) return children;

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-[#001a4d] via-[#003366] to-[#0071ff] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-white/20 blur-[100px] opacity-40 -top-[100px] -left-[100px]" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-cyan-300/30 blur-[100px] opacity-40 -bottom-[100px] -right-[100px]" />

      <div
        className={`glass-card w-[360px] p-10 text-center relative z-10 ${shake ? 'animate-shake' : ''}`}
      >
        <div className="flex justify-center mb-3"><MissionMark size={56} /></div>
        <div className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-1">
          AeroQuant
        </div>
        <div className="text-xs text-tertiary mb-8">by EnviQuant · Secure Access</div>

        <div className="relative mb-3">
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Enter dashboard password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            autoFocus
            className="w-full px-4 py-3.5 pr-12 bg-glass-white border border-glass-border rounded-xl text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-nasa-blue/50 transition-all"
          />
          <button
            onClick={() => setShowPass(!showPass)}
            aria-label={showPass ? 'Hide password' : 'Show password'}
            aria-pressed={showPass}
            className="touch-hit absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-transparent border-none cursor-pointer text-secondary opacity-70 hover:opacity-100 transition-opacity"
          >
            {showPass ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
          </button>
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-red-300 mb-3 font-medium" role="alert">
            <AlertIcon size={14} /> {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="w-full min-h-[44px] py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 border-none rounded-xl text-white text-sm font-bold cursor-pointer tracking-wide shadow-nasa-glow hover:shadow-cool-glow transition-all flex items-center justify-center gap-2"
        >
          <LockIcon size={16} /> Access Dashboard
        </button>

        <div className="text-[10px] text-tertiary mt-5">
          Session expires after 1 hour
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s ease; }
      `}</style>
    </div>
  );
}

// Production config: same-origin by default (nginx proxies /ws + /api to backend).
// Override with REACT_APP_WS_URL / REACT_APP_API_URL for split deployments.
const API_URL = process.env.REACT_APP_API_URL || '';
const WS_URL =
  process.env.REACT_APP_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

function GaugeRing({ value, max, color, size = 100, strokeWidth = 8, label, unit }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-extrabold tracking-tight block leading-none" style={{ color }}>
          {value}<span className="text-sm opacity-60">{unit}</span>
        </span>
        <span className="text-[10px] text-tertiary block mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function ToggleSwitch({ icon, name, isOn, onToggle, color, disabled }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${disabled ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <div>
          <div className="text-xs font-semibold text-primary">{name}</div>
          <div className={`text-[10px] font-medium ${isOn ? 'text-emerald-400' : 'text-tertiary'}`}>
            {disabled ? 'AI Controlled' : isOn ? '● Active' : '○ Inactive'}
          </div>
        </div>
      </div>
      <button
        aria-pressed={isOn}
        className={`touch-hit w-11 h-[26px] rounded-full cursor-pointer relative transition-all duration-300 border-none outline-none flex-shrink-0 ${isOn ? 'shadow-nasa-glow' : 'bg-white/10'}`}
        style={isOn ? { background: color || '#34d399' } : {}}
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
      >
        <div
          className="w-5 h-5 rounded-full bg-white absolute top-[3px] left-[3px] transition-all duration-300 shadow-md"
          style={{ transform: isOn ? 'translateX(18px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

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
    <div className="flex items-center gap-3 p-2.5 bg-cyan-400/5 border border-cyan-400/15 rounded-xl mb-2 flex-shrink-0">
      <div className="relative flex items-center justify-center flex-shrink-0">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} fill="none"
            stroke="rgba(34,211,238,0.1)" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={sprayActive ? '#34d399' : '#22d3ee'} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute flex items-center justify-center">
          {sprayActive
            ? <span className="text-emerald-400"><DropIcon size={14} /></span>
            : <span className="text-[11px] font-extrabold text-cyan-400 tabular-nums">
                {mm}:{ss.toString().padStart(2, '0')}
              </span>
          }
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-cyan-400">
          {sprayActive ? 'Misting Now...' : 'Next Mist'}
        </div>
        <div className="text-[10px] text-tertiary mt-0.5">
          {sprayActive ? 'Spray active' : `Every ${Math.round(interval / 60)}min cycle`}
        </div>
      </div>
    </div>
  );
}

// Roadmap placeholder — no live vision model is connected in production.
// Renders a neutral, disabled grid so the UI never shows fake plant health.
function CultivationMap() {
  const slots = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'];

  return (
    <div className="relative h-full flex flex-col opacity-60" aria-label="Cultivation map roadmap placeholder">
      <div className="absolute -top-5 -right-2 bg-white/5 border border-white/15 text-secondary px-2 py-1 rounded-lg text-[9px] font-extrabold tracking-wide flex items-center gap-1 z-10 backdrop-blur-sm">
        <RocketIcon size={12} /> ROADMAP
      </div>

      <div className="grid grid-cols-3 grid-rows-2 gap-1.5 flex-1 mt-2.5">
        {slots.map((id) => (
          <div key={id} className="bg-white/5 border border-white/10 rounded-lg flex flex-col items-center justify-center gap-0.5 relative p-1">
            <span className="text-secondary opacity-60"><LeafIcon size={16} /></span>
            <span className="text-[9px] text-tertiary font-semibold">{id}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-auto">
        <span className="text-[10px] text-tertiary font-medium">No live vision model connected</span>
      </div>
    </div>
  );
}

// Roadmap placeholder — disease detection is not wired to any model yet.
// Must never render fake alerts in production.
function DiseasePanel() {
  const slots = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'];

  return (
    <div className="relative h-full flex flex-col opacity-60" aria-label="Disease detection roadmap placeholder">
      <div className="absolute -top-5 -right-2 bg-white/5 border border-white/15 text-secondary px-2 py-1 rounded-lg text-[9px] font-extrabold tracking-wide flex items-center gap-1 z-10 backdrop-blur-sm">
        <FlaskIcon size={12} /> ROADMAP
      </div>

      <div className="grid grid-cols-3 grid-rows-2 gap-1.5 flex-1 mt-2.5">
        {slots.map((id) => (
          <div key={id} className="rounded-lg flex flex-col items-center justify-center gap-0.5 relative p-1 border border-white/10 bg-white/5">
            <span className="text-secondary opacity-60"><LeafIcon size={16} /></span>
            <span className="text-[9px] font-semibold text-tertiary">Standby</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-auto">
        <span className="text-[10px] text-tertiary font-medium">Detection model not connected</span>
      </div>
    </div>
  );
}

function SystemHealthModal({ isOpen, onClose, data, connected, autoMode }) {
  if (!isOpen) return null;

  const checks = [
    { label: 'WebSocket Backend', ok: connected, detail: connected ? 'Connected' : 'Disconnected' },
    { label: 'MQTT Broker', ok: connected, detail: connected ? 'Connected' : 'Disconnected' },
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
    { label: 'AI Auto Mode', ok: autoMode, detail: autoMode ? 'Active' : 'Manual' },
  ];

  const healthScore = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[1000] flex items-center justify-center animate-fadeIn" onClick={onClose}>
      <div className="bg-[rgba(10,10,28,0.95)] border border-glass-border rounded-3xl p-6 w-[90vw] max-w-[700px] backdrop-blur-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <span className="text-red-300"><HeartIcon size={24} /></span>
            <div>
              <div className="text-lg font-bold">System Health</div>
              <div className="text-[11px] text-tertiary">AeroQuant v3.0.0 — EnviQuant</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-black" style={{ color: healthScore > 80 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                {healthScore}%
              </div>
              <div className="text-[10px] text-tertiary">Health Score</div>
            </div>
            <button aria-label="Close system health dialog" className="touch-hit min-w-[44px] min-h-[44px] rounded-full bg-white/10 border-none text-white text-base cursor-pointer flex items-center justify-center hover:bg-white/20 transition-all" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 mt-4 pr-1">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 bg-white/5 rounded-lg border border-white/5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.ok ? 'bg-emerald-400 shadow-[0_0_6px_var(--accent-green)]' : 'bg-red-400 shadow-[0_0_6px_var(--accent-red)]'}`} />
              <span className="flex-1 text-xs text-primary font-medium">{c.label}</span>
              <span className="text-[11px] font-semibold text-right" style={{ color: c.ok ? 'var(--text-secondary)' : 'var(--accent-red)' }}>
                {c.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[1000] flex items-center justify-center animate-fadeIn" onClick={onClose}>
      <div className="bg-[rgba(10,10,28,0.95)] border border-glass-border rounded-3xl p-6 w-[90vw] max-w-[900px] backdrop-blur-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <span className="text-purple-300"><CameraIcon size={20} /></span>
            <div>
              <div className="text-lg font-bold">Cultivation Camera Vision</div>
              <div className="text-[10px] text-tertiary">1 Main Feed + 6 Overlay Layers</div>
            </div>
          </div>
          <button aria-label="Close camera dialog" className="touch-hit min-w-[44px] min-h-[44px] rounded-full bg-white/10 border-none text-white text-base cursor-pointer flex items-center justify-center hover:bg-white/20 transition-all" onClick={onClose}>✕</button>
        </div>

        <div className="relative w-full aspect-video bg-black/40 border border-emerald-400/20 rounded-xl overflow-hidden my-4">
          {isConnected ? (
            <img
              src={`http://${camUrl}:81/stream`}
              alt="Main Feed"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-emerald-300/60 mb-2"><LeafIcon size={32} /></span>
              <span className="text-sm text-tertiary">No Video Feed</span>
              <span className="text-[11px] text-emerald-400 mt-1">● Enter IP to connect</span>
            </div>
          )}

          <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 pointer-events-none opacity-60">
            {cells.map(cell => (
              <div key={cell.id} className="relative border-r border-b border-dashed border-white/15 flex items-center justify-center">
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 border border-white/15 rounded-full px-2 py-0.5 text-[9px] font-bold text-secondary tracking-wide">
                  STANDBY
                </div>
                <div className="absolute top-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-extrabold text-secondary tracking-wide">
                  {cell.pos}
                </div>
                <div className="bg-black/50 backdrop-blur-sm text-white/60 px-2.5 py-1 rounded-md text-[11px] font-medium border border-white/10">
                  {cell.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <input
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-glass-border text-white text-sm focus:outline-none focus:border-purple-400 transition-all"
            placeholder="ESP32-CAM IP (e.g. 192.168.1.200)"
            value={camUrl}
            onChange={e => setCamUrl(e.target.value)}
          />
          <button className="px-5 py-2.5 rounded-xl bg-purple-500 border-none text-white text-sm font-semibold cursor-pointer hover:opacity-90 transition-all" onClick={toggleConnection}>
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NASAAlertBanner({ alert, forecast }) {
  if (!alert) return null;

  return (
    <div className="fixed top-[112px] left-0 right-0 z-[100] px-6 pointer-events-none">
      <div className="max-w-[860px] mx-auto bg-gradient-to-r from-red-600/30 via-red-500/20 to-cyan-500/20 border-2 border-red-400/60 rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur-xl shadow-heatwave animate-heatwave-glow">
        <span className="text-cyan-200 flex-shrink-0"><SatelliteIcon size={26} /></span>
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-base font-black tracking-widest bg-gradient-to-r from-red-400 via-red-300 to-cyan-300 bg-clip-text text-transparent animate-pulse">
            ⚡ PREEMPTIVE STRIKE INITIATED ⚡
          </span>
          <span className="text-xs text-white/90 font-semibold">
            NASA heatwave {forecast?.max_temp?.toFixed(1)}°C predicted — Root-zone cooling OVERRIDE engaged
          </span>
        </div>
        <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 animate-nasa-blink shadow-heatwave" />
      </div>
    </div>
  );
}

function NASAForecastWidget({ forecast, alert }) {
  const maxTemp = forecast?.max_temp || 0;
  const threshold = forecast?.threshold || 35;
  const location = forecast?.location || '—';
  const lastFetch = forecast?.last_fetch
    ? new Date(forecast.last_fetch).toLocaleTimeString()
    : '—';

  const hourlyData = forecast?.forecast || [];
  const next24h = hourlyData.slice(0, 24);
  const chartMax = Math.max(...next24h.map(h => h.temp_c), threshold + 2);
  const chartMin = Math.min(...next24h.map(h => h.temp_c), threshold - 2);
  const chartRange = chartMax - chartMin || 1;

  return (
    <div className={`glass-card col-span-1 md:col-span-2 !border-cyan-300/30 ${alert ? '!border-red-400/60 shadow-heatwave animate-heatwave-glow' : '!shadow-cool-glow'}`}>
      {alert && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600/40 to-cyan-500/30 border border-red-400/50 text-center animate-pulse">
          <span className="text-sm font-black tracking-widest bg-gradient-to-r from-red-300 to-cyan-200 bg-clip-text text-transparent">
            ⚡ PREEMPTIVE STRIKE INITIATED ⚡
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-cyan-200"><SatelliteIcon size={16} /></span>
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">NASA POWER API FORECAST — 72H THERMAL</span>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${alert ? 'bg-red-500/25 text-red-200 border border-red-400/50 animate-pulse' : 'bg-cyan-400/15 text-cyan-200 border border-cyan-300/30'}`}>
          {alert ? '⚠ HEATWAVE >35°C' : '✓ NOMINAL'}
        </span>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black tracking-tight" style={{ color: alert ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {maxTemp.toFixed(1)}°C
            </span>
            <span className="text-[10px] text-tertiary font-semibold uppercase tracking-wide">Max Forecast (72h)</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-white/5 rounded-xl border border-glass-border">
            <span className="text-base font-extrabold text-orange-400">{threshold}°C</span>
            <span className="text-[9px] text-tertiary font-semibold uppercase">Threshold</span>
          </div>
        </div>

        {next24h.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-tertiary font-semibold uppercase tracking-wide">Next 24 Hours</div>
            <div className="flex items-end gap-[2px] h-12">
              {next24h.map((h, i) => {
                const height = ((h.temp_c - chartMin) / chartRange) * 100;
                const isAboveThreshold = h.temp_c > threshold;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div
                      className="w-full rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${Math.max(height, 5)}%`,
                        background: isAboveThreshold
                          ? 'linear-gradient(to top, #f87171, #fb923c)'
                          : 'linear-gradient(to top, #22d3ee, #60a5fa)',
                        opacity: isAboveThreshold ? 1 : 0.7,
                      }}
                    />
                    {i % 4 === 0 && (
                      <span className="text-[8px] text-tertiary tabular-nums">
                        {new Date(h.timestamp).getHours().toString().padStart(2, '0')}h
                      </span>
                    )}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {h.temp_c.toFixed(1)}°C
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[8px] text-tertiary">
              <span>{new Date(next24h[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
              <span className="text-red-400">— {threshold}°C threshold</span>
              <span>{new Date(next24h[next24h.length-1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5 mt-auto">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-tertiary font-medium">Location</span>
            <span className="text-secondary font-semibold">{location}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-tertiary font-medium">Last Fetch</span>
            <span className="text-secondary font-semibold">{lastFetch}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-tertiary font-medium">Source</span>
            <span className="text-secondary font-semibold">NASA POWER API</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📈 TELEMETRY ANALYTICS (live trend + statistics)
// Chart guidance (verified): line chart for time-series trends —
// solid actual vs dashed comparison series, threshold marker line,
// hover values, pause control, text summary + data table fallback,
// never color-alone encoding.
// ═══════════════════════════════════════════════════════════
const TELEMETRY_WINDOW = 120;
const ROOT_ALERT_LINE = 28;

function downsample(points, maxPts) {
  if (points.length <= maxPts) return points;
  const step = points.length / maxPts;
  const out = [];
  for (let i = 0; i < maxPts; i++) out.push(points[Math.floor(i * step)]);
  return out;
}

function TrendChart({ points }) {
  const W = 320, H = 120, PAD_L = 34, PAD_B = 16, PAD_T = 8, PAD_R = 8;
  const iw = W - PAD_L - PAD_R, ih = H - PAD_T - PAD_B;
  const pts = downsample(points, 60);

  if (pts.length < 4) {
    return (
      <div className="h-[140px] flex items-center justify-center text-xs text-tertiary" role="status">
        Collecting live samples… ({pts.length}/4 minimum)
      </div>
    );
  }

  const vals = pts.flatMap(p => [p.root, p.amb]);
  let lo = Math.min(...vals, ROOT_ALERT_LINE) - 1;
  let hi = Math.max(...vals, ROOT_ALERT_LINE) + 1;
  const span = hi - lo || 1;
  const X = i => PAD_L + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * iw);
  const Y = v => PAD_T + (1 - (v - lo) / span) * ih;

  const line = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.root).toFixed(1)}`).join(' ');
  const dash = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.amb).toFixed(1)}`).join(' ');
  const area = `${PAD_L},${(PAD_T + ih).toFixed(1)} ${line} ${X(pts.length - 1).toFixed(1)},${(PAD_T + ih).toFixed(1)}`;
  const alertY = Y(Math.min(Math.max(ROOT_ALERT_LINE, lo), hi));

  const fmtT = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[140px]" role="img"
        aria-label={`Root versus ambient temperature trend over the last ${pts.length} samples. Root is the solid cyan line, ambient is the dashed blue line. Red dashed line marks the ${ROOT_ALERT_LINE} degree alert threshold.`}>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={PAD_L} x2={W - PAD_R} y1={PAD_T + ih * f} y2={PAD_T + ih * f}
            stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        ))}
        <polygon points={area} fill="rgba(34,211,238,0.18)" />
        <polyline points={dash} fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="5 3" strokeLinejoin="round" />
        <polyline points={line} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={PAD_L} x2={W - PAD_R} y1={alertY} y2={alertY}
          stroke="#f87171" strokeWidth="1.2" strokeDasharray="6 3" />
        <text x={W - PAD_R - 2} y={alertY - 3} textAnchor="end" fontSize="8" fill="#fca5a5">
          {ROOT_ALERT_LINE}° alert
        </text>
        {pts.map((p, i) => (i % 5 === 0 || i === pts.length - 1) && (
          <g key={p.t}>
            <circle cx={X(i)} cy={Y(p.root)} r="6" fill="transparent">
              <title>{fmtT(p.t)} — Root {p.root.toFixed(1)}°, Ambient {p.amb.toFixed(1)}°</title>
            </circle>
            <circle cx={X(i)} cy={Y(p.root)} r="1.6" fill="#22d3ee" />
          </g>
        ))}
        <text x={4} y={PAD_T + 8} fontSize="8" fill="rgba(255,255,255,0.5)" textAnchor="start">{hi.toFixed(0)}°</text>
        <text x={4} y={PAD_T + ih} fontSize="8" fill="rgba(255,255,255,0.5)" textAnchor="start">{lo.toFixed(0)}°</text>
        <text x={PAD_L} y={H - 3} fontSize="8" fill="rgba(255,255,255,0.5)">{fmtT(pts[0].t)}</text>
        <text x={W - PAD_R} y={H - 3} fontSize="8" fill="rgba(255,255,255,0.5)" textAnchor="end">{fmtT(pts[pts.length - 1].t)}</text>
      </svg>
      <figcaption className="flex items-center gap-4 mt-1 text-[10px] text-tertiary">
        <span className="flex items-center gap-1.5">
          <svg width="20" height="4" aria-hidden="true"><line x1="0" y1="2" x2="20" y2="2" stroke="#22d3ee" strokeWidth="2.5" /></svg>
          Root (solid)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="20" height="4" aria-hidden="true"><line x1="0" y1="2" x2="20" y2="2" stroke="#93c5fd" strokeWidth="2" strokeDasharray="5 3" /></svg>
          Ambient (dashed)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="20" height="4" aria-hidden="true"><line x1="0" y1="2" x2="20" y2="2" stroke="#f87171" strokeWidth="1.5" strokeDasharray="6 3" /></svg>
          {ROOT_ALERT_LINE}° alert
        </span>
      </figcaption>
    </figure>
  );
}

function StatTile({ label, value, sub }) {
  return (
    <div className="flex flex-col p-2.5 rounded-xl bg-white/5 border border-white/10 min-w-0">
      <span className="text-[9px] text-tertiary font-semibold uppercase tracking-wider">{label}</span>
      <span className="text-lg font-extrabold text-white tabular-nums leading-tight mt-0.5 truncate">{value}</span>
      {sub && <span className="text-[10px] text-secondary mt-0.5 truncate">{sub}</span>}
    </div>
  );
}

function AnalyticsCard({ history, sprayCycles, paused, onTogglePause }) {
  const stats = React.useMemo(() => {
    if (history.length < 2) return null;
    const roots = history.map(h => h.root);
    const ambs = history.map(h => h.amb);
    const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
    const avgRoot = avg(roots), avgAmb = avg(ambs);
    const mn = Math.min(...roots), mx = Math.max(...roots);
    const half = Math.floor(roots.length / 2);
    const firstHalf = avg(roots.slice(0, half)), lastHalf = avg(roots.slice(half));
    const drift = lastHalf - firstHalf;
    const trend = Math.abs(drift) < 0.3 ? 'stable' : drift > 0 ? 'rising' : 'falling';
    const variance = avg(roots.map(r => (r - avgRoot) ** 2));
    const stability = Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(variance) * 12)));
    const coolOn = history.filter(h => h.cool === 1).length;
    const duty = Math.round((coolOn / history.length) * 100);
    const phDrift = history[history.length - 1].ph - history[0].ph;
    return { avgRoot, avgAmb, mn, mx, trend, drift, stability, duty, phDrift, n: history.length };
  }, [history]);

  const summary = stats
    ? `Root temperature averaging ${stats.avgRoot.toFixed(1)} degrees over ${stats.n} samples, trend ${stats.trend}, stability score ${stats.stability} percent, cooling duty ${stats.duty} percent.`
    : 'Waiting for telemetry samples.';

  return (
    <div className="glass-card col-span-1 md:col-span-2 xl:col-span-4" aria-labelledby="analytics-title">
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-cyan-200"><ChartIcon size={16} /></span>
          <span id="analytics-title" className="text-[11px] font-bold text-white uppercase tracking-widest">
            Telemetry Analytics — Live
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-tertiary tabular-nums" role="status" aria-live="off">
            {stats ? `${stats.n} samples` : 'warming up'}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${paused ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30' : 'bg-cyan-400/15 text-cyan-200 border border-cyan-300/30'}`}>
            {paused ? 'PAUSED' : 'STREAMING'}
          </span>
          <button
            onClick={onTogglePause}
            aria-pressed={paused}
            aria-label={paused ? 'Resume live telemetry chart' : 'Pause live telemetry chart'}
            className="min-h-[44px] px-4 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold cursor-pointer hover:bg-white/20 transition-all"
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-secondary mb-2" role="status" aria-atomic="true">{summary}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3 min-h-0">
        <TrendChart points={history} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
          <StatTile label="Avg root" value={stats ? `${stats.avgRoot.toFixed(1)}°C` : '—'} sub={stats ? `amb ${stats.avgAmb.toFixed(1)}°C` : ''} />
          <StatTile label="Min – Max" value={stats ? `${stats.mn.toFixed(0)}–${stats.mx.toFixed(0)}°` : '—'} sub={stats ? `trend ${stats.trend}` : ''} />
          <StatTile label="Stability" value={stats ? `${stats.stability}%` : '—'} sub="window score" />
          <StatTile label="Cooling duty" value={stats ? `${stats.duty}%` : '—'} sub="relay on-time" />
          <StatTile label="Spray cycles" value={`${sprayCycles}`} sub="pump activations" />
          <StatTile label="pH drift" value={stats ? `${stats.phDrift >= 0 ? '+' : ''}${stats.phDrift.toFixed(2)}` : '—'} sub="window delta" />
        </div>
      </div>

      <details className="mt-2 text-[11px] text-secondary">
        <summary className="cursor-pointer text-tertiary hover:text-secondary transition-colors min-h-[44px] inline-flex items-center">
          View recent readings table (last 12)
        </summary>
        <div className="overflow-x-auto mt-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-tertiary text-[10px] uppercase tracking-wider">
                <th className="pr-3 py-1 font-semibold">Time</th>
                <th className="pr-3 py-1 font-semibold">Root °C</th>
                <th className="pr-3 py-1 font-semibold">Amb °C</th>
                <th className="py-1 font-semibold">RH %</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {history.slice(-12).reverse().map(h => (
                <tr key={h.t} className="border-t border-white/5">
                  <td className="pr-3 py-1">{new Date(h.t).toLocaleTimeString()}</td>
                  <td className="pr-3 py-1">{h.root.toFixed(1)}</td>
                  <td className="pr-3 py-1">{h.amb.toFixed(1)}</td>
                  <td className="py-1">{Math.round(h.rh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🗂️ MISSION TABS + STATUS CARDS
// ═══════════════════════════════════════════════════════════
const TABS = [
  { id: 'command', label: 'Command', Icon: SatelliteIcon },
  { id: 'climate', label: 'Climate', Icon: LeafIcon },
  { id: 'water', label: 'Water + Nutrients', Icon: DropIcon },
  { id: 'intel', label: 'Intelligence', Icon: ChartIcon },
];
const TAB_IDS = TABS.map(t => t.id);

function TabBar({ tab, onChange }) {
  const ids = TABS.map(t => t.id);
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = ids.indexOf(tab);
    const next = e.key === 'ArrowRight' ? ids[(i + 1) % ids.length] : ids[(i - 1 + ids.length) % ids.length];
    onChange(next);
  };

  return (
    <div className="flex items-center gap-1 px-4 z-10 bg-white/5 backdrop-blur-lg border-b border-white/10 flex-shrink-0 h-12 overflow-x-auto" role="tablist" aria-label="Dashboard sections" onKeyDown={onKeyDown}>
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            aria-controls={`panel-${id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(id)}
            className={`min-h-[44px] flex items-center gap-2 px-4 rounded-lg text-xs font-bold tracking-wide whitespace-nowrap cursor-pointer transition-all border ${
              active
                ? 'bg-white/15 border-white/30 text-white shadow-[0_0_16px_rgba(34,211,238,0.25)]'
                : 'bg-transparent border-transparent text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon size={15} />
            {label}
            {active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

// Threat dial: forecast max plotted on a 28–40°C scale with a labeled
// 35°C strike line. Zones + numeric readout: never color-alone.
function ThreatDial({ maxTemp, alert }) {
  const CX = 100, CY = 88, R = 62;
  const clampV = v => Math.min(40, Math.max(28, v));
  const ang = v => 180 - ((clampV(v) - 28) / 12) * 180;
  const pol = (deg, rr = R) => `${(CX + rr * Math.cos(deg * Math.PI / 180)).toFixed(1)},${(CY - rr * Math.sin(deg * Math.PI / 180)).toFixed(1)}`;
  const seg = (v0, v1) => `M ${pol(ang(v0))} A ${R} ${R} 0 0 1 ${pol(ang(v1))}`;
  const hasFeed = maxTemp != null;
  const sweep = alert ? '#f87171' : '#22d3ee';
  const tick = v => {
    const a = pol(ang(v), R - 8).split(','), b = pol(ang(v), R + 8).split(','), c = pol(ang(v), R + 20).split(',');
    return { a, b, c };
  };
  return (
    <div className="flex flex-col items-center w-full">
      <svg viewBox="0 0 200 104" className="w-full max-w-[230px]" role="img"
        aria-label={hasFeed
          ? `Threat dial: forecast maximum ${maxTemp.toFixed(1)} degrees against the 35 degree strike threshold.`
          : 'Threat dial: awaiting NASA forecast feed.'}>
        <circle cx={CX} cy={CY} r={R + 26} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R + 16} fill="none" stroke={sweep} strokeWidth="1.5"
          strokeDasharray="26 220" opacity="0.55" className="radar-sweep" />
        <circle cx={CX} cy={CY} r={R + 16} fill="none" stroke={sweep} strokeWidth="1"
          strokeDasharray="8 260" opacity="0.3" className="radar-sweep-rev" />
        <path d={seg(28, 33)} fill="none" stroke="#34d399" strokeWidth="9" strokeLinecap="round" opacity="0.85" />
        <path d={seg(33, 35)} fill="none" stroke="#fbbf24" strokeWidth="9" strokeLinecap="round" opacity="0.9" />
        <path d={seg(35, 40)} fill="none" stroke="#f87171" strokeWidth="9" strokeLinecap="round" opacity="0.9" />
        {[28, 35, 40].map(v => {
          const t = tick(v);
          return (
            <g key={v}>
              <line x1={t.a[0]} y1={t.a[1]} x2={t.b[0]} y2={t.b[1]}
                stroke={v === 35 ? '#fca5a5' : 'rgba(255,255,255,0.5)'} strokeWidth={v === 35 ? 2.5 : 1.5} />
              <text x={t.c[0]} y={Number(t.c[1]) + 3} textAnchor="middle" fontSize="8" fontWeight="700"
                fill={v === 35 ? '#fca5a5' : 'rgba(255,255,255,0.55)'}>
                {v}°
              </text>
            </g>
          );
        })}
        {hasFeed ? (
          <g>
            <line x1={CX} y1={CY}
              x2={pol(ang(maxTemp), R - 18).split(',')[0]} y2={pol(ang(maxTemp), R - 18).split(',')[1]}
              stroke={alert ? '#f87171' : '#e2e8f0'} strokeWidth="3" strokeLinecap="round" />
            <circle cx={CX} cy={CY} r="6" fill="#0b2545" stroke={alert ? '#f87171' : '#22d3ee'} strokeWidth="2" />
            <circle cx={CX} cy={CY} r="2" fill={alert ? '#f87171' : '#22d3ee'} />
          </g>
        ) : (
          <text x={CX} y={CY - 32} textAnchor="middle" fontSize="9" fontWeight="700" fill="rgba(255,255,255,0.5)" letterSpacing="2">
            AWAITING FEED
          </text>
        )}
      </svg>
      <span className={`text-2xl font-black tracking-tight tabular-nums leading-none mt-1 ${alert ? 'text-red-300 animate-pulse' : 'text-white'}`}>
        {hasFeed ? `${maxTemp.toFixed(1)}°C` : '—'}
      </span>
    </div>
  );
}

function DefenseStatus({ alert, forecast, data }) {
  const maxTemp = forecast?.max_temp;
  const hasFeed = maxTemp != null;
  const fanPct = Math.round((data.exhaust_fan / 255) * 100);
  return (
    <div className="glass-card xl:row-span-2 !border-cyan-300/25">
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-cyan-200"><CpuIcon size={16} /></span>
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-widest">Heat Defense</span>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${alert ? 'bg-red-500/25 text-red-200 border border-red-400/50 animate-pulse' : 'bg-cyan-400/15 text-cyan-200 border border-cyan-300/30'}`}>
          {alert ? 'STRIKE' : 'STANDBY'}
        </span>
      </div>
      <div className={`relative flex-1 min-h-[210px] flex flex-col items-center justify-center rounded-xl border py-2 px-2 mb-2 overflow-hidden ${alert ? 'bg-red-500/10 border-red-400/40' : 'bg-cyan-400/5 border-cyan-300/20'}`}>
        <ThreatDial maxTemp={maxTemp} alert={alert} />
        <span className="text-[10px] text-tertiary font-semibold uppercase tracking-widest mt-1">
          {!hasFeed ? 'Awaiting NASA feed…' : alert ? 'Preemptive cooling engaged' : 'Forecast max vs 35° strike line'}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 text-[11px]">
        <div className="flex justify-between items-center"><span className="text-tertiary font-medium">Forecast max</span><span className="text-secondary font-bold tabular-nums">{maxTemp != null ? `${maxTemp.toFixed(1)}°C` : '—'}</span></div>
        <div className="flex justify-between items-center"><span className="text-tertiary font-medium">Strike threshold</span><span className="text-secondary font-bold tabular-nums">35.0°C</span></div>
        <div className="flex justify-between items-center"><span className="text-tertiary font-medium">Cooling relay</span><span className={`font-bold ${data.cooling ? 'text-cyan-300' : 'text-tertiary'}`}>{data.cooling ? '● ENGAGED' : '○ idle'}</span></div>
        <div className="flex justify-between items-center"><span className="text-tertiary font-medium">Exhaust fan</span><span className="text-secondary font-bold tabular-nums">{fanPct}%</span></div>
      </div>
    </div>
  );
}

function VpdCard({ temp, rh }) {
  let vpd = null, status = null, color = 'var(--text-tertiary)';
  if (temp > 0 && rh > 0) {
    const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    vpd = svp * (1 - rh / 100);
    if (vpd < 0.4) { status = 'Too humid — disease risk'; color = 'var(--accent-blue)'; }
    else if (vpd < 0.8) { status = 'Low — slow transpiration'; color = 'var(--accent-cyan)'; }
    else if (vpd <= 1.2) { status = 'Optimal for leafy greens'; color = 'var(--accent-green)'; }
    else if (vpd <= 1.6) { status = 'High — watch wilting'; color = 'var(--accent-orange)'; }
    else { status = 'Stress — mist + cool now'; color = 'var(--accent-red)'; }
  }
  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-emerald-300"><LeafIcon size={16} /></span>
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">VPD Comfort</span>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-400/15 text-emerald-400">Root Zone</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <VpdArc vpd={vpd} color={color} />
        <span className="text-2xl font-black tracking-tight tabular-nums leading-none mt-1" style={{ color }}>
          {vpd != null ? `${vpd.toFixed(2)}` : '—'}
          <span className="text-xs opacity-60 font-bold"> kPa</span>
        </span>
      </div>
      <div className="text-center mt-1">
        <span className="text-[11px] font-semibold" style={{ color }}>{status || 'Awaiting sensors…'}</span>
      </div>
    </div>
  );
}

function VpdArc({ vpd, color }) {
  const CX = 70, CY = 66, R = 54;
  const clampV = v => Math.min(2, Math.max(0, v));
  const ang = v => 180 - (clampV(v) / 2) * 180;
  const pol = (deg, rr = R) => `${(CX + rr * Math.cos(deg * Math.PI / 180)).toFixed(1)},${(CY - rr * Math.sin(deg * Math.PI / 180)).toFixed(1)}`;
  const seg = (v0, v1) => `M ${pol(ang(v0))} A ${R} ${R} 0 0 1 ${pol(ang(v1))}`;
  return (
    <svg viewBox="0 0 140 78" className="w-full max-w-[170px]" role="img"
      aria-label={vpd != null
        ? `Vapor pressure deficit gauge: ${vpd.toFixed(2)} kilopascals. Optimal band 0.8 to 1.2.`
        : 'Vapor pressure deficit gauge: awaiting sensor data.'}>
      <path d={seg(0, 2)} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" strokeLinecap="round" />
      <path d={seg(0.8, 1.2)} fill="none" stroke="#34d399" strokeWidth="10" opacity="0.85" />
      {[0, 1, 2].map(v => (
        <text key={v} x={pol(ang(v), R + 12).split(',')[0]} y={Number(pol(ang(v), R + 12).split(',')[1]) + 3}
          textAnchor="middle" fontSize="8" fontWeight="700" fill="rgba(255,255,255,0.55)">{v}</text>
      ))}
      {vpd != null && (
        <g>
          <line x1={CX} y1={CY}
            x2={pol(ang(vpd), R - 14).split(',')[0]} y2={pol(ang(vpd), R - 14).split(',')[1]}
            stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx={CX} cy={CY} r="4.5" fill="#0b2545" stroke={color} strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

function SystemPulse({ history, sprayCycles, connected }) {
  const span = history.length > 1
    ? Math.round((history[history.length - 1].t - history[0].t) / 1000)
    : 0;
  const mm = Math.floor(span / 60), ss = span % 60;
  const pts = history.slice(-60);
  const vals = pts.map(p => p.root);
  const lo = vals.length ? Math.min(...vals) : 0;
  const hi = vals.length ? Math.max(...vals) : 1;
  const spread = hi - lo || 1;
  const line = pts.map((p, i) => `${((i / Math.max(1, pts.length - 1)) * 120).toFixed(1)},${(36 - ((p.root - lo) / spread) * 32).toFixed(1)}`).join(' ');
  const last = vals.length ? vals[vals.length - 1] : null;
  return (
    <div className="glass-card col-span-1 md:col-span-2">
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-cyan-200"><CpuIcon size={16} /></span>
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-widest">System Pulse</span>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/5 text-secondary border border-white/10">
          LIVE FEED
        </span>
      </div>
      <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 pt-1.5 pb-1 mb-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[9px] text-tertiary font-semibold uppercase tracking-wider">Root temp · live trace</span>
          <span className="text-xs font-extrabold text-cyan-200 tabular-nums">{last != null ? `${last.toFixed(1)}°C` : '—'}</span>
        </div>
        {pts.length > 1 ? (
          <svg viewBox="0 0 120 40" preserveAspectRatio="none" className="w-full h-11" role="img"
            aria-label={`Live root temperature trace, last ${pts.length} samples, currently ${last.toFixed(1)} degrees.`}>
            <polygon points={`0,40 ${line} 120,40`} fill="rgba(34,211,238,0.15)" />
            <polyline points={line} fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <circle cx="120" cy={(36 - ((last - lo) / spread) * 32).toFixed(1)} r="2.5" fill="#22d3ee" />
          </svg>
        ) : (
          <div className="h-11 flex items-center text-[10px] text-tertiary" role="status">Collecting trace…</div>
        )}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 content-center">
        <div className="flex flex-col p-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[9px] text-tertiary font-semibold uppercase tracking-wider">Link</span>
          <span className={`text-sm font-extrabold mt-0.5 ${connected ? 'text-emerald-300' : 'text-red-300'}`}>{connected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
        <div className="flex flex-col p-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[9px] text-tertiary font-semibold uppercase tracking-wider">Session window</span>
          <span className="text-sm font-extrabold mt-0.5 text-white tabular-nums">{mm}:{ss.toString().padStart(2, '0')}</span>
        </div>
        <div className="flex flex-col p-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[9px] text-tertiary font-semibold uppercase tracking-wider">Samples</span>
          <span className="text-sm font-extrabold mt-0.5 text-white tabular-nums">{history.length}</span>
        </div>
        <div className="flex flex-col p-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[9px] text-tertiary font-semibold uppercase tracking-wider">Spray cycles</span>
          <span className="text-sm font-extrabold mt-0.5 text-white tabular-nums">{sprayCycles}</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState({
    root_temp: 0, root_humidity: 0,
    ambient_temp: 0, ambient_humidity: 0,
    water_temp1: 0, water_temp2: 0,
    ph: 0, tds: 0, water_level: 1, main_water_level: 1,
    spray_pump: 0, cooling: 0, grow_light: 0,
    exhaust_fan: 0, refill_pump: 0, auto_mode: 0,
    timestamp: ''
  });

  const [connected, setConnected] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const [autoMode, setAutoMode] = useState(false);
  const [autoConfig, setAutoConfig] = useState({ spray_interval_sec: 600, spray_duration_sec: 5 });
  const [sprayCountdown, setSprayCountdown] = useState(600);
  const [sprayActive, setSprayActive] = useState(false);
  const lastSprayRef = useRef(Date.now());
  const sprayEndRef = useRef(0);

  const [nasaAlert, setNasaAlert] = useState(false);
  const [nasaForecast, setNasaForecast] = useState(null);

  // ─── Mission tabs (?tab=command|climate|water|intel, deep-linkable) ───
  const [tab, setTabState] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return TAB_IDS.includes(t) ? t : 'command';
  });
  const prevNasaAlert = useRef(false);
  const applyTab = useCallback((id) => {
    if (!TAB_IDS.includes(id)) return;
    setTabState(id);
    try {
      const q = new URLSearchParams(window.location.search);
      q.set('tab', id);
      window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
    } catch { /* non-browser env */ }
  }, []);

  // ─── 📈 Telemetry history (live analytics window) ───
  const [telemetry, setTelemetry] = useState([]);
  const [sprayCycles, setSprayCycles] = useState(0);
  const [chartPaused, setChartPaused] = useState(false);
  const pausedRef = useRef(false);
  const prevSprayRef = useRef(0);
  useEffect(() => { pausedRef.current = chartPaused; }, [chartPaused]);

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  // Live WebSocket frame handler.
  const handleMessage = useCallback((msg) => {
    if (msg.type === 'sensor_data' && msg.data) {
      const d = msg.data;
      setData(prev => ({ ...prev, ...d }));
      if (d.spray_pump === 1 && prevSprayRef.current === 0) {
        setSprayCycles(c => c + 1);
      }
        prevSprayRef.current = d.spray_pump === 1 ? 1 : 0;
        if (!pausedRef.current) {
        setTelemetry(prev => {
          const next = [...prev, {
            t: Date.now(),
            root: Number(d.root_temp) || 0,
            amb: Number(d.ambient_temp) || 0,
            rh: Number(d.root_humidity) || 0,
            ph: Number(d.ph) || 0,
            cool: d.cooling === 1 ? 1 : 0,
          }];
          return next.length > TELEMETRY_WINDOW ? next.slice(next.length - TELEMETRY_WINDOW) : next;
        });
      }
    } else if (msg.type === 'auto_config' && msg.config) {
      setAutoConfig(msg.config);
      setAutoMode(msg.config.auto_mode);
      if (!msg.config.auto_mode) {
        setSprayActive(false);
      }
      } else if (msg.type === 'nasa_alert') {
        setNasaAlert(msg.alert);
        setNasaForecast(msg);
        // Rising edge: route attention to Command deck so the strike is visible.
        if (msg.alert && !prevNasaAlert.current) applyTab('command');
        prevNasaAlert.current = !!msg.alert;
      } else if (msg.type === 'error') {
        console.warn('Backend:', msg.message);
      }
    }, [applyTab]);

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
        handleMessage(JSON.parse(event.data));
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
  }, [handleMessage]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connectWebSocket]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const sendCommand = useCallback((device, action) => {
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

  const sendAutoMode = useCallback((enable) => {
    const cmd = JSON.stringify({ type: 'auto_mode', action: enable ? 1 : 0 });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd);
    }

    setAutoMode(enable);
    if (enable) {
      lastSprayRef.current = Date.now() - (autoConfig.spray_interval_sec * 1000);
      setSprayCountdown(0);
    } else {
      setSprayActive(false);
    }
  }, [autoConfig.spray_interval_sec]);

  const toggle = (device) => {
    if (autoMode) return;
    const newVal = data[device] === 1 ? 0 : 1;
    sendCommand(device, newVal);
  };

  const setFanSpeed = (speed) => {
    if (autoMode) return;
    sendCommand('exhaust_fan', parseInt(speed));
  };

  const fanPercent = Math.round((data.exhaust_fan / 255) * 100);

  return (
    <PasswordGate>
    <div className={`w-screen h-screen flex flex-col overflow-hidden relative ${autoMode ? 'shadow-[inset_0_0_0_2px_rgba(52,211,153,0.2)]' : ''}`}>
      {autoMode && <div className="fixed top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400/80 to-cyan-400/60 z-50 animate-scan-line pointer-events-none" />}

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-br from-white/25 to-cyan-300/20 blur-[100px] -top-[120px] -left-[120px] animate-orb-bob" />
        <div className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-br from-cyan-300/30 to-blue-500/20 blur-[100px] top-1/3 -right-[120px] animate-orb-bob" style={{ animationDelay: '-7s' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-white/15 to-blue-300/20 blur-[100px] -bottom-[80px] left-[30%] animate-orb-bob" style={{ animationDelay: '-14s' }} />
        {autoMode && <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-br from-emerald-300/20 to-transparent blur-[100px] top-[20%] left-[40%] animate-orb-bob opacity-20" />}
      </div>

      <div className="flex items-center justify-between px-6 py-2.5 z-10 bg-white/10 backdrop-blur-lg border-b border-white/20 shadow-[0_4px_24px_rgba(0,51,102,0.4)] flex-shrink-0 h-14 gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <MissionMark size={28} />
          <div>
            <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">AeroQuant</div>
            <div className="text-[10px] text-tertiary font-normal whitespace-nowrap">by EnviQuant · Intelligent Aeroponic OS</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-white/5 border border-glass-border rounded-full px-3.5 py-1.5 flex-shrink-0">
          <span className="text-secondary flex items-center"><CpuIcon size={14} /></span>
          <span className="text-xs font-bold tracking-wide whitespace-nowrap text-secondary">{autoMode ? 'AI AUTO' : 'MANUAL'}</span>
          <button
            className={`touch-hit w-14 h-[30px] rounded-full cursor-pointer relative transition-all duration-300 border border-white/10 outline-none flex-shrink-0 ${autoMode ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 border-emerald-400/40 shadow-nasa-glow' : 'bg-white/10'}`}
            onClick={() => sendAutoMode(!autoMode)}
            title={autoMode ? 'Switch to Manual' : 'Switch to AI Auto Mode'}
            aria-label={autoMode ? 'Switch to manual mode' : 'Switch to AI auto mode'}
            aria-pressed={autoMode}
          >
            <div
              className="w-6 h-6 rounded-full bg-white absolute top-[3px] left-[3px] transition-all duration-300 flex items-center justify-center text-[10px] text-gray-700 font-black shadow-md"
              style={{ transform: autoMode ? 'translateX(26px)' : 'translateX(0)', background: autoMode ? 'linear-gradient(135deg, #34d399, #22d3ee)' : 'white', color: autoMode ? 'white' : '#333' }}
            >
              {autoMode ? '✦' : '○'}
            </div>
          </button>
          {autoMode && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_var(--accent-green)] animate-pulse" />
              ACTIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide ${connected ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30' : 'bg-red-400/15 text-red-400 border border-red-400/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_8px_var(--accent-green)] animate-pulse' : 'bg-red-400 shadow-[0_0_8px_var(--accent-red)]'}`} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <span className="text-[13px] text-secondary font-medium tabular-nums">{currentTime}</span>
          <button className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-400/10 border border-red-400/25 text-red-300 text-xs font-semibold cursor-pointer hover:bg-red-400/20 hover:-translate-y-0.5 transition-all" onClick={() => setHealthOpen(true)} title="System Health" aria-label="Open system health">
            <HeartIcon size={14} /> Health
          </button>
          <button className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-400/15 border border-purple-400/30 text-purple-300 text-xs font-semibold cursor-pointer hover:bg-purple-400/25 hover:-translate-y-0.5 transition-all" onClick={() => setCamOpen(true)} aria-label="Open camera vision">
            <CameraIcon size={14} /> Camera
          </button>
        </div>
      </div>

      <TabBar tab={tab} onChange={applyTab} />

      <NASAAlertBanner alert={nasaAlert} forecast={nasaForecast} />

      <div className="main-grid-scroll flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 xl:auto-rows-[minmax(0,1fr)] auto-rows-auto gap-3 p-3 pb-6 z-10 overflow-y-auto" role="tabpanel" id={`panel-${tab}`} aria-label={`${tab} section`}>

        {tab === 'command' && <NASAForecastWidget forecast={nasaForecast} alert={nasaAlert} />}

        {tab === 'command' && <DefenseStatus alert={nasaAlert} forecast={nasaForecast} data={data} />}

        <div className={`glass-card ${tab !== 'climate' ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-emerald-300"><LeafIcon size={16} /></span>
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Root Chamber</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-400/15 text-emerald-400">Root Zone</span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <GaugeRing value={data.root_temp} max={50} color="var(--accent-green)" size={110} label="Temperature" unit="°C" />
          </div>
          <div className="text-center mt-1">
            <span className="text-[13px] text-secondary flex items-center justify-center gap-1.5"><span className="text-emerald-300/80"><DropIcon size={13} /></span>{data.root_humidity}% RH</span>
          </div>
        </div>

        <div className={`glass-card ${tab !== 'climate' ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-blue-300"><HomeIcon size={16} /></span>
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Ambient</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-400/15 text-blue-400">Room Zone</span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <GaugeRing value={data.ambient_temp} max={50} color="var(--accent-blue)" size={110} label="Temperature" unit="°C" />
          </div>
          <div className="text-center mt-1">
            <span className="text-[13px] text-secondary flex items-center justify-center gap-1.5"><span className="text-blue-300/80"><DropIcon size={13} /></span>{data.ambient_humidity}% RH</span>
          </div>
        </div>

        <div className={`glass-card ${tab !== 'water' ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-cyan-300"><WaveIcon size={16} /></span>
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Water Temp</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-400/15 text-cyan-400">Water Tanks</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-2.5 min-h-0">
            <div className="flex items-center gap-2.5">
              <div className="text-lg w-[34px] h-[34px] flex items-center justify-center rounded-xl bg-cyan-400/10 flex-shrink-0 text-cyan-300"><FlaskIcon size={18} /></div>
              <div className="flex-1">
                <div className="text-xl font-extrabold tracking-tight leading-none text-cyan-400">{data.water_temp1}°C</div>
                <div className="text-[10px] text-tertiary mt-0.5">Buffer Tank</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="text-lg w-[34px] h-[34px] flex items-center justify-center rounded-xl bg-blue-400/10 flex-shrink-0 text-blue-300"><DropIcon size={18} /></div>
              <div className="flex-1">
                <div className="text-xl font-extrabold tracking-tight leading-none text-blue-400">{data.water_temp2}°C</div>
                <div className="text-[10px] text-tertiary mt-0.5">Main Tank</div>
              </div>
            </div>
          </div>
        </div>

        <div className={`glass-card xl:row-span-2 ${tab !== 'command' ? 'hidden' : ''} ${autoMode ? '!border-emerald-400/25 !bg-emerald-400/4 shadow-[0_0_20px_rgba(52,211,153,0.1),inset_0_1px_0_rgba(52,211,153,0.15)]' : ''}`}>
          <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-cyan-200"><CpuIcon size={16} /></span>
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">{autoMode ? 'AI Control' : 'Controls'}</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{
              background: autoMode ? 'rgba(52,211,153,0.2)' : 'rgba(251,146,60,0.15)',
              color: autoMode ? 'var(--accent-green)' : 'var(--accent-orange)',
              border: autoMode ? '1px solid rgba(52,211,153,0.4)' : 'none'
            }}>
              {autoMode ? '✦ AUTO' : 'MANUAL'}
            </span>
          </div>

          {autoMode && (
            <MistingTimer
              countdown={sprayCountdown}
              interval={autoConfig.spray_interval_sec}
              sprayActive={sprayActive}
            />
          )}

          <div className="flex-1 flex flex-col justify-around min-h-0">
            <ToggleSwitch icon={<span className="text-blue-300"><DropIcon size={20} /></span>} name="Spray Pump"
              isOn={data.spray_pump === 1} onToggle={() => toggle('spray_pump')}
              color="var(--accent-blue)" disabled={autoMode} />
            <ToggleSwitch icon={<span className="text-cyan-300"><SnowIcon size={20} /></span>} name="Cooling"
              isOn={data.cooling === 1} onToggle={() => toggle('cooling')}
              color="var(--accent-cyan)" disabled={autoMode} />
            <ToggleSwitch icon={<span className="text-yellow-300"><BulbIcon size={20} /></span>} name="Grow Light"
              isOn={data.grow_light === 1} onToggle={() => toggle('grow_light')}
              color="var(--accent-yellow)" disabled={autoMode} />
            <ToggleSwitch icon={<span className="text-purple-300"><PumpIcon size={20} /></span>} name="Refill Pump"
              isOn={data.refill_pump === 1} onToggle={() => toggle('refill_pump')}
              color="var(--accent-purple)" disabled={false}
            />

            <div className="py-1.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300 text-xl inline-block"><FanIcon size={20} spin={data.exhaust_fan > 0} /></span>
                  <div>
                    <div className="text-xs font-semibold">Exhaust Fan</div>
                    <div className={`text-[10px] font-medium ${data.exhaust_fan > 0 ? 'text-emerald-400' : 'text-tertiary'}`}>
                      {autoMode ? 'AI Controlled' : data.exhaust_fan > 0 ? `● ${fanPercent}% Speed` : '○ Inactive'}
                    </div>
                  </div>
                </div>
                <span className="text-base font-extrabold text-cyan-400 tabular-nums">{fanPercent}%</span>
              </div>
              <div className="mt-1">
                <input type="range" min="0" max="255" step="1"
                  value={data.exhaust_fan}
                  onChange={e => setFanSpeed(e.target.value)}
                  disabled={autoMode}
                  className="w-full h-1 rounded-full bg-white/10 outline-none appearance-none cursor-pointer"
                  style={{ opacity: autoMode ? 0.4 : 1 }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`glass-card ${tab !== 'water' ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-pink-300"><FlaskIcon size={16} /></span>
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">pH Level</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-pink-400/15 text-pink-400">Main Tank</span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <GaugeRing value={data.ph} max={14} color="var(--accent-pink)" size={110} label="Acidity" unit="" />
          </div>
          <div className="text-center mt-1">
            <span className="text-[11px] font-semibold" style={{ color: data.ph >= 5.5 && data.ph <= 6.5 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {data.ph >= 5.5 && data.ph <= 6.5 ? '✓ Optimal Range' : '⚠ Out of Range'}
            </span>
          </div>
        </div>

        <div className={`glass-card ${tab !== 'water' ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-yellow-300"><ChartIcon size={16} /></span>
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">TDS / Nutrients</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-yellow-400/15 text-yellow-400">Main Tank</span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <GaugeRing value={Math.round(data.tds)} max={1500} color="var(--accent-yellow)" size={110} label="Nutrients" unit=" ppm" />
          </div>
          <div className="text-center mt-1">
            <span className="text-[11px] font-semibold" style={{ color: data.tds >= 400 && data.tds <= 1200 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
              {data.tds >= 400 && data.tds <= 1200 ? '✓ Good Level' : '⚠ Check Nutrients'}
            </span>
          </div>
        </div>

        <div className={`glass-card ${tab !== 'water' ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-cyan-200"><BucketIcon size={16} /></span>
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Water Levels</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{
              background: (data.water_level === 0 && data.main_water_level === 0) ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
              color: (data.water_level === 0 && data.main_water_level === 0) ? 'var(--accent-green)' : 'var(--accent-red)'
            }}>Buffer Tank</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-4">
            <div className="flex flex-col items-center flex-1">
              <div className="w-10 h-[60px] border-2 border-white/15 rounded-lg relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-b-md" style={{
                  height: data.water_level === 0 ? '75%' : '15%',
                  background: data.water_level === 0
                    ? 'linear-gradient(to top, var(--accent-blue), var(--accent-cyan))'
                    : 'linear-gradient(to top, var(--accent-red), var(--accent-orange))'
                }} />
              </div>
              <div className="mt-2 text-center">
                <div className="text-base font-extrabold" style={{ color: data.water_level === 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {data.water_level === 0 ? 'OK' : 'LOW'}
                </div>
                <div className="text-[10px] text-tertiary">Buffer Bottom</div>
              </div>
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-10 h-[60px] border-2 border-white/15 rounded-lg relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-b-md" style={{
                  height: data.main_water_level === 0 ? '75%' : '15%',
                  background: data.main_water_level === 0
                    ? 'linear-gradient(to top, var(--accent-blue), var(--accent-cyan))'
                    : 'linear-gradient(to top, var(--accent-red), var(--accent-orange))'
                }} />
              </div>
              <div className="mt-2 text-center">
                <div className="text-base font-extrabold" style={{ color: data.main_water_level === 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {data.main_water_level === 0 ? 'OK' : 'LOW'}
                </div>
                <div className="text-[10px] text-tertiary">Buffer Top</div>
              </div>
            </div>
          </div>
        </div>

        <div className={`glass-card col-span-1 md:col-span-2 !border-purple-400/20 ${tab !== 'intel' ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-purple-300"><DnaIcon size={16} /></span>
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Smart Cultivation — 2R × 3C</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-400/15 text-purple-400">
              AI VISION
            </span>
          </div>
          <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">
            <div className="flex-1 px-3 flex flex-col min-h-0 relative">
              <div className="text-[10px] text-tertiary font-semibold tracking-wider mb-2">
                CULTIVATION MAP
              </div>
              <CultivationMap />
            </div>
            <div className="flex-1 px-3 flex flex-col min-h-0 relative border-l border-glass-border">
              <div className="text-[10px] text-tertiary font-semibold tracking-wider mb-2">
                DISEASE DETECTION
              </div>
              <DiseasePanel />
            </div>
          </div>
        </div>

        <div className={`glass-card ${tab !== 'climate' ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-cyan-300"><DropIcon size={16} /></span>
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Humidity</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3 min-h-0">
            {[
              { label: 'Root Chamber', rh: data.root_humidity, bar: 'linear-gradient(90deg, #059669, #34d399)', text: 'text-emerald-300', Icon: LeafIcon },
              { label: 'Ambient', rh: data.ambient_humidity, bar: 'linear-gradient(90deg, #2563eb, #60a5fa)', text: 'text-blue-300', Icon: HomeIcon },
            ].map(({ label, rh, bar, text, Icon }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`flex items-center gap-1.5 text-[11px] font-semibold text-secondary ${text}`}>
                    <Icon size={14} /> {label}
                  </span>
                  <span className="text-sm font-extrabold text-white tabular-nums">{Math.round(rh)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden" role="img" aria-label={`${label} humidity ${Math.round(rh)} percent`}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, rh))}%`, background: bar }} />
                </div>
              </div>
            ))}
            <div className="text-[10px] text-tertiary text-center">Mold risk climbs above 85% · stress below 40%</div>
          </div>
        </div>

        {tab === 'climate' && <VpdCard temp={data.root_temp} rh={data.root_humidity} />}

        {tab === 'intel' && <AnalyticsCard history={telemetry} sprayCycles={sprayCycles} paused={chartPaused} onTogglePause={() => setChartPaused(p => !p)} />}

        {tab === 'intel' && <SystemPulse history={telemetry} sprayCycles={sprayCycles} connected={connected} />}

      </div>

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