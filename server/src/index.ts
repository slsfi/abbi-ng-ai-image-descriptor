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
 * CSRF strategy (Lusca-only, CodeQL-friendly):
 * - Mount `lusca.csrf()` immediately after express-session.
 * - Do NOT exempt any state-changing routes from CSRF.
 *
 * Bootstrap flow for the SPA:
 * 1) GET  /api/csrf/token
 *    - Safe method (no CSRF required)
 *    - Initializes session CSRF secret and returns a token
 * 2) POST /api/session/start
 *    - Requires `x-csrf-token` header
 * 3) Subsequent unsafe requests also require `x-csrf-token`
 *
 * Rationale:
 * - Avoids any CSRF-exempt POST route, which static analyzers typically flag
 *   when cookie/session middleware is used.
 */

import express from 'express';
import session from 'express-session';
import lusca from 'lusca';
import crypto from 'node:crypto';

import { healthRouter } from './routes/health.js';
import { sessionRouter } from './routes/session.js';
import { openaiRouter } from './routes/openai.js';
import { googleRouter } from './routes/google.js';
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

const app = express();

app.set('trust proxy', true);

app.use(express.json({ limit: JSON_BODY_LIMIT }));

/**
 * Require a strong session secret in production.
 *
 * - In production, SESSION_SECRET must be provided (e.g. Jenkins credential binding).
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
      maxAge: 30 * 60_000
    }
  })
);

/**
 * CSRF protection middleware (lusca.csrf).
 *
 * Must run after express-session and before any state-changing routes that rely on
 * cookie-based authentication.
 *
 * The SPA supplies the token via the `x-csrf-token` header.
 */
app.use(lusca.csrf());

/**
 * CSRF token endpoint.
 *
 * The SPA calls GET /api/csrf/token first to obtain a token. This also initializes
 * the per-session CSRF secret and causes a session cookie to be issued.
 */
app.use('/api/csrf', csrfRouter);

/**
 * Public / non-state-changing routes.
 */
app.use('/api/health', healthRouter);

/**
 * Session routes (CSRF-protected by lusca.csrf()).
 */
app.use('/api/session', sessionRouter);

/**
 * Protected API routes (CSRF-protected by lusca.csrf()).
 */
app.use('/api/openai', openaiRouter);

app.use('/api/google', googleRouter);

const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
});
