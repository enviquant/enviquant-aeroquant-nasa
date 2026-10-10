# AeroQuant Frontend

React 19 dashboard for the AeroQuant aeroponic system. Shows live ESP32 telemetry over WebSocket, NASA POWER 72h forecast, and manual / AI-auto controls.

## Setup

```bash
cp .env.example .env
# set REACT_APP_DASHBOARD_PASSWORD
npm install
npm start
```

- Same-origin default: the app calls `/ws` and `/api/*` on the same host (nginx proxies to the backend in production).
- For split deployments set `REACT_APP_WS_URL` and `REACT_APP_API_URL` in `.env`.

## Scripts

- `npm start` — dev server (`http://localhost:3000`)
- `npm run build` — production bundle in `build/`
- `npm test` — test runner

## Notes

- Camera vision + cultivation map panels are disabled Roadmap placeholders until a live vision model is connected. They never render fake alerts.
- Dashboard gate password comes from `REACT_APP_DASHBOARD_PASSWORD`. No default is committed.
