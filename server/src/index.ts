/**
 * index.ts
 *
 * Backend server entry point.
 *
 * Responsibilities:
 * - Create and configure the Express application
 * - Configure global middleware (JSON body parsing, cookies)
 * - Mount API routers under /api/*
 * - Start the HTTP server on the configured port
 *
 * Notes:
 * - This backend is intended to be deployed behind nginx in production.
 * - In development, it typically runs on http://localhost:3000 and Angular
 *   proxies /api requests to it.
 */

import express from 'express';
import session from 'express-session';
import crypto from 'node:crypto';

import { healthRouter } from './routes/health.js';
import { sessionRouter } from './routes/session.js';
import { openaiRouter } from './routes/openai.js';
import { csrfRouter } from './routes/csrf.js';

import { withCsrfProtection } from './middleware/csrfSync.js';

/**
 * Maximum JSON request body size.
 *
 * Rationale:
 * - The app may send base64-encoded images (large payloads).
 * - This limit should be aligned with nginx's `client_max_body_size` in production.
 *
 * If you later switch to multipart/binary uploads, you can reduce this.
 */
const JSON_BODY_LIMIT = '50mb';

/**
 * Default TCP port for the backend HTTP server.
 *
 * In Docker Compose, this is typically exposed only on the internal network,
 * with nginx proxying external traffic to it.
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

// Require a strong session secret in production
const isProd = process.env.NODE_ENV === 'production';

const sessionSecret = process.env.SESSION_SECRET
  ?? (!isProd ? crypto.randomBytes(32).toString('hex') : undefined);

if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set in production.');
}

/**
 * express-session middleware.
 *
 * Required by csrf-sync because csrf-sync stores the CSRF token on req.session.
 *
 * Notes:
 * - Default MemoryStore is acceptable for low-traffic deployments and matches
 *   our "no DB / no persistent storage" requirement.
 * - Sessions will be lost on restart (acceptable).
 * - Set SESSION_SECRET in production.
 */
app.use(session({
  name: 'abbi_sess', // optional: custom cookie name
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: isProd ? 'strict' : 'lax',
    secure: isProd,
    path: '/',
    maxAge: 30 * 60_000 // align cookie expiration with TTL
  }
}));

/**
 * CSRF token endpoint.
 *
 * Must be registered BEFORE CSRF protection middleware,
 * because clients need to fetch a token without already having one.
 */
app.use('/api/csrf', csrfRouter);

/**
 * Mount API routers.
 *
 * Keep routing modular:
 * - Each router module documents its own contract (request/response/errors).
 * - index.ts remains focused on wiring and global concerns.
 */

/**
 * Public / non-state-changing routes.
 */
app.use('/api/health', healthRouter);

/**
 * Session routes.
 *
 * POST /api/session/start is state-changing and SHOULD be protected.
 * However, the frontend cannot obtain a CSRF token before a session exists.
 *
 * Strategy:
 * - Allow /session/start without CSRF
 * - All subsequent unsafe routes require CSRF
 */
app.use('/api/session', sessionRouter);

/**
 * Protected API routes.
 *
 * All unsafe HTTP methods under these routes require a valid CSRF token
 * in the `x-csrf-token` header.
 */
app.use('/api/openai', withCsrfProtection, openaiRouter);

// Normalize CSRF/library errors
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if ((err as any)?.code === 'EBADCSRFTOKEN') {
    res.status(403).json({ ok: false, error: 'Invalid or missing CSRF token.' });
    return;
  }
  next(err);
});

/**
 * Start the server.
 *
 * The server binds to 0.0.0.0 by default, which is appropriate for containers.
 */
const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
});
