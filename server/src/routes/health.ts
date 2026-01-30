/**
 * routes/health.ts
 *
 * Health-check endpoint for the backend server.
 *
 * Base path: /api/health
 *
 * Purpose:
 * - Provide a lightweight endpoint for:
 *   - local development verification
 *   - container / orchestration health checks
 *   - nginx reverse-proxy sanity checks
 *
 * This endpoint does not require a session and does not call any external services.
 */

import express from 'express';

/**
 * Express router for health-check operations.
 *
 * Mounted at: /api/health
 */
export const healthRouter = express.Router();

/**
 * GET /api/health
 *
 * Returns a simple JSON payload indicating that the server process is running
 * and able to respond to requests.
 *
 * Response:
 * - 200 OK
 *   { "ok": true }
 */
healthRouter.get('/', (_req, res) => {
  res.status(200).json({ ok: true });
});
