# JARED-HERO2 Backend (Node/Express)

Endpoints:
- `GET /health` → `{ ok: true }`
- `POST /inference` → `{ content }`
- `POST /analyze-image` (multipart form: `file`) → `{ summary, confidence }`
- `POST /speak` → MP3 audio stream

## Local run
```
npm install
copy .env.example .env   # Windows  (or: cp .env.example .env on Mac/Linux)
# Edit .env and paste your real OPENAI key
npm start
# Server on http://localhost:3001
```
## Deploy on Render
- New Web Service from GitHub repo root `JARED-HERO2-backend`
- Build: `npm install`
- Start: `node server.js`
- Env var: `OPENAI_API_KEY` (set to your real key)
