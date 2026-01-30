/**
 * routes/csrf.ts
 *
 * CSRF token endpoint for the backend API.
 *
 * Base path: /api/csrf
 *
 * Purpose:
 * - Provide the frontend SPA with a CSRF token tied to the current session.
 * - The frontend must include this token in the `x-csrf-token` header
 *   for all state-changing requests (POST/PUT/PATCH/DELETE).
 *
 * Implementation:
 * - Uses csrf-sync (synchroniser token pattern).
 * - The token is generated per session and stored server-side.
 * - The token is NOT stored in a cookie.
 */

import express, { type Request, type Response } from 'express';
import { generateToken } from '../middleware/csrfSync.js';

/**
 * Express router for CSRF-related endpoints.
 *
 * Mounted at: /api/csrf
 */
export const csrfRouter = express.Router();

/**
 * GET /api/csrf/token
 *
 * Returns a CSRF token for the current session.
 *
 * The frontend should:
 * 1. Call this endpoint once after a session has been created
 *    (i.e. after POST /api/session/start).
 * 2. Store the returned token in memory.
 * 3. Send it in the `x-csrf-token` header for all unsafe requests.
 *
 * Response:
 * - 200 OK
 *   {
 *     "csrfToken": "<opaque token string>"
 *   }
 *
 * Errors:
 * - None. If no session exists yet, csrf-sync will still generate a token,
 *   but it will only become meaningful once a session cookie is present.
 */
csrfRouter.get('/token', (req: Request, res: Response) => {
  const token = generateToken(req);
  res.status(200).json({ csrfToken: token });
});
