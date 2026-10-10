module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        'nasa-blue': {
          DEFAULT: '#0071ff',
          50: '#e6f0ff',
          100: '#b3d4ff',
          200: '#80b8ff',
          300: '#4da1ff',
          400: '#1a87ff',
          500: '#0071ff',
          600: '#0066e6',
          700: '#004d99',
          800: '#003366',
          900: '#001a4d',
        },
        'space-deep': {
          DEFAULT: '#0a0a1a',
          900: '#050510',
        },
        'glass-white': 'rgba(255, 255, 255, 0.08)',
        'glass-border': 'rgba(255, 255, 255, 0.12)',
        'glass-accent': 'rgba(255, 255, 255, 0.03)',
        primary: 'rgba(255, 255, 255, 0.95)',
        secondary: 'rgba(255, 255, 255, 0.6)',
        tertiary: 'rgba(255, 255, 255, 0.35)',
      },
      backdropBlur: {
        'xl': '20px',
        '2xl': '30px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.25)',
        'glass-lg': '0 12px 40px rgba(0, 0, 0, 0.35)',
        'glass-inner': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'nasa-glow': '0 0 30px rgba(52, 211, 153, 0.4)',
        'cool-glow': '0 0 40px rgba(34, 211, 238, 0.5)',
        'heatwave': '0 0 50px rgba(248, 113, 113, 0.6)',
        'heatwave-inner': 'inset 0 0 30px rgba(248, 113, 113, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'orb-bob': 'floatOrb 20s ease-in-out infinite',
        'nasa-blink': 'nasaBlink 1.5s ease-in-out infinite',
        'heatwave-glow': 'heatwaveGlow 1.2s ease-in-out infinite',
        'scan-line': 'scanLine 3s linear infinite',
      },
      keyframes: {
        'floatOrb': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(30px, -30px) scale(1.05)' },
          '50%': { transform: 'translate(-20px, 20px) scale(0.95)' },
          '75%': { transform: 'translate(10px, 10px) scale(1.02)' },
        },
        'nasaBlink': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.7, transform: 'scale(1.1)' },
        },
        'heatwaveGlow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(248, 113, 113, 0.4), 0 0 40px rgba(248, 113, 113, 0.2)',
            opacity: 1
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(248, 113, 113, 0.6), 0 0 80px rgba(248, 113, 113, 0.4)',
            opacity: 0.9
          },
        },
        'scanLine': {
          '0%': { top: '0px', opacity: 1 },
          '90%': { top: '100vh', opacity: 0.8 },
          '100%': { top: '100vh', opacity: 0 },
        },
      },
      fontFamily: {
        'orbitron': ['"Orbitron"', 'sans-serif'],
        'techno': ['"Shared Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}