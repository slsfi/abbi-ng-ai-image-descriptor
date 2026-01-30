/**
 * index.ts
 *
 * Backend server entry point.
 *
 * Responsibilities:
 * - Create and configure the Express application
 * - Configure global middleware (JSON body parsing, sessions)
 * - Mount API routers under /api/*
 * - Start the HTTP server on the configured port
 *
 * CSRF strategy (Lusca only):
 * - Use `lusca.csrf()` immediately after session middleware (CodeQL-recognized).
 * - Exempt ONLY the session bootstrap endpoint (POST /api/session/start) by
 *   registering it BEFORE `lusca.csrf()` is mounted.
 * - Provide a CSRF token endpoint (GET /api/csrf/token) that returns
 *   `req.csrfToken()` (provided by lusca/csurf) to the SPA.
 *
 * Client contract:
 * - Call POST /api/session/start (no CSRF token required)
 * - Call GET /api/csrf/token and store the returned token in memory
 * - Send the token in the `x-csrf-token` header for all unsafe requests
 */

import express from 'express';
import session from 'express-session';
import lusca from 'lusca';
import crypto from 'node:crypto';

import { healthRouter } from './routes/health.js';
import { sessionRouter, startSessionHandler } from './routes/session.js';
import { openaiRouter } from './routes/openai.js';
import { csrfRouter } from './routes/csrf.js';

/**
 * Maximum JSON request body size.
 *
 * Rationale:
 * - The app may send base64-encoded images (large payloads).
 * - This limit should be aligned with nginx's `client_max_body_size` in production.
 */
const JSON_BODY_LIMIT = '50mb';

/**
 * Default TCP port for the backend HTTP server.
 */
const DEFAULT_PORT = 3000;

/**
 * Create the Express app instance.
 */
const app = express();

/**
 * If nginx terminates TLS and forwards requests, this makes req.protocol accurate.
 */
app.set('trust proxy', true);

/**
 * Global middleware.
 *
 * - express.json() parses application/json bodies.
 */
app.use(express.json({ limit: JSON_BODY_LIMIT }));

/**
 * Require a strong session secret in production.
 *
 * - In production, SESSION_SECRET must be provided (e.g. via Jenkins env var).
 * - In development, generate a per-process secret (sessions reset on restart).
 */
const isProd = process.env.NODE_ENV === 'production';

const sessionSecret =
  process.env.SESSION_SECRET ??
  (!isProd ? crypto.randomBytes(32).toString('hex') : undefined);

if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set in production.');
}

/**
 * express-session middleware.
 *
 * Required for:
 * - session-based “bring your own key” storage
 * - lusca CSRF protection (stores CSRF secret in the session)
 *
 * Notes:
 * - Default MemoryStore is acceptable for low-traffic deployments and matches
 *   our "no DB / no persistent storage" requirement.
 * - Sessions will be lost on restart (acceptable).
 */
app.use(
  session({
    name: 'abbi_sess',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProd ? 'strict' : 'lax',
      secure: isProd,
      path: '/',
      maxAge: 30 * 60_000,
    },
  })
);

/**
 * Session bootstrap endpoint (CSRF-exempt).
 *
 * This MUST be registered before lusca.csrf(), because a CSRF token cannot
 * exist prior to session creation and the first token fetch.
 *
 * Route: POST /api/session/start
 */
app.post('/api/session/start', startSessionHandler);

/**
 * CSRF protection middleware (lusca.csrf).
 *
 * This must run after express-session and before any state-changing handlers
 * that rely on the session cookie.
 */
app.use(lusca.csrf());

/**
 * CSRF token endpoint.
 *
 * This is a safe GET endpoint. The frontend should call it after session bootstrap
 * and then send `x-csrf-token` on unsafe requests.
 */
app.use('/api/csrf', csrfRouter);

/**
 * Public / non-state-changing routes.
 */
app.use('/api/health', healthRouter);

/**
 * Session routes (other than /start).
 *
 * Note: routes/session.ts still defines POST /start for modularity, but it is
 * effectively shadowed by the explicit app.post('/api/session/start', ...) above.
 * You MAY remove the router's /start route later if you want stricter routing.
 */
app.use('/api/session', sessionRouter);

/**
 * Protected API routes (CSRF enforced by lusca.csrf).
 */
app.use('/api/openai', openaiRouter);

/**
 * Start the server.
 */
const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
});
