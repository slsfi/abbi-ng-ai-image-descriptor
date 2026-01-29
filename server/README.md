# aBBi AI Backend Server

This directory contains a small Node.js backend used by the aBBi Angular AI
app to communicate with external AI providers (OpenAI, Google, etc.).

The backend exists primarily to:
- avoid browser CORS issues
- keep API keys out of the frontend bundle
- centralize provider SDK usage
- support large payloads (images, batched requests)

The system follows a **"bring your own API key"** model:
- users enter their own API keys
- keys are stored in memory only
- no login system
- no persistent storage

---

## Architecture Overview

### High-level

Browser (Angular SPA)
|
| /api/*
v
nginx (reverse proxy + static files)
|
v
Node backend (Express 5)
|
v
AI providers (OpenAI, Google)


### Key design choices

- **SPA only** (no SSR)
- **Same-origin API** in production (`/api/...`)
- **HttpOnly cookie sessions**
- **No database**
- **Official provider SDKs only**
- **Keys never persist to disk**

---

## Directory Structure

server/
├─ src/
│ ├─ index.ts # App entry point
│ ├─ sessionStore.ts # In-memory session storage
│ └─ routes/
│ ├─ health.ts # GET /api/health
│ ├─ session.ts # Session creation / clearing
│ └─ openai.ts # OpenAI API relay
│
├─ package.json
├─ tsconfig.json
└─ README.md

---

## Development Setup

### Requirements

- Node.js **18+** (20+ recommended)
- npm

### Install dependencies

From the repository root:

```bash
cd server
npm install
```

### Run the server in development mode

```bash
npm run dev
```

This starts the backend on:

```
http://localhost:3000
```

### Angular development integration

In development:
- Angular runs on `http://localhost:4200`
- The Angular dev proxy forwards `/api/*` → `http://localhost:3000`

So the frontend always uses:

```
/api/...
```

in both development and production.

## Production Usage (Docker)

In production, the backend is not exposed directly.
nginx reverse-proxies `/api/*` requests to it.

### Build and run with Docker Compose

From the repository root:

```bash
docker compose up --build
```

Services:
- **nginx** – serves the Angular SPA and proxies API requests
- **api** – Node backend (this server)

The backend listens internally on port `3000`.

## Session Model

### How sessions work

1. User enters an API key in the UI
2. Frontend calls:

```
POST /api/session/start
```

3. Backend:
  - validates the key via provider SDK
  - stores it in memory with a TTL
  - sets an HttpOnly session cookie
4. Subsequent API calls reuse the session

### Session lifetime

- Sessions expire automatically (default: 30 minutes)
- Expired sessions are removed by a cleanup task
- Restarting the server clears all sessions (expected)

## API Overview

### Health check

```
GET /api/health
```

Returns:

```json
{ "ok": true }
```

### Start session

```
POST /api/session/start
```

Request body:

```json
{
  "provider": "OpenAI",
  "apiKey": "sk-...",
  "orgKey": "optional"
}
```

Response:

```json
{ "ok": true }
```

### OpenAI responses relay

```
POST /api/openai/responses
```

- Requires a valid OpenAI session
- Payload is forwarded to the OpenAI SDK
- Response is normalized to the app’s `AiResult` shape

---

## Updating the Server

### Updating dependencies

```bash
cd server
npm update
```

Then rebuild containers:

```bash
docker compose build api
```

### Updating TypeScript or Node features

- Update `tsconfig.json` as needed
- Ensure Node version compatibility (18+)

### Adding new providers

1. Add provider-specific validation to `/api/session/start`
2. Add new route module under `routes/`
3. Keep SDK usage **server-side** only
4. Mirror existing documentation style

---

## Documentation Conventions

This backend follows strict documentation rules:
- Every file has a file-level docstring
- Every exported symbol has JSDoc
- Every route documents:
  - inputs
  - outputs
  - error cases
- Configuration choices are explained in README files

This is intentional: the backend is small but security-sensitive.

---

## Non-goals

This server intentionally does not:
- manage users
- persist data
- store API keys long-term
- provide rate limiting (yet)

These can be added later if requirements change.

---

## License / Internal Use

This backend is intended to be used together with the Angular AI app
in this repository.
