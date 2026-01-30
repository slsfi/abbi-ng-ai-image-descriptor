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
import cookieParser from 'cookie-parser';

import { csrfGuard } from './middleware/csrfGuard.js';
import { healthRouter } from './routes/health.js';
import { sessionRouter } from './routes/session.js';
import { openaiRouter } from './routes/openai.js';

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
 * - cookieParser() populates req.cookies, used for session cookie handling.
 */
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(cookieParser());

/**
 * CSRF mitigation: must run after cookie parsing and before route handlers.
 */
app.use(csrfGuard);

/**
 * Mount API routers.
 *
 * Keep routing modular:
 * - Each router module documents its own contract (request/response/errors).
 * - index.ts remains focused on wiring and global concerns.
 */
app.use('/api/health', healthRouter);
app.use('/api/session', sessionRouter);
app.use('/api/openai', openaiRouter);

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
