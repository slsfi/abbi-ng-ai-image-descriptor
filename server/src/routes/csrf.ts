/**
 * routes/csrf.ts
 *
 * CSRF token endpoint for the backend API (Lusca-based).
 *
 * Base path: /api/csrf
 *
 * Purpose:
 * - Provide the frontend SPA with a CSRF token tied to the current session.
 * - The frontend must include this token in the `x-csrf-token` header
 *   for all state-changing requests (POST/PUT/PATCH/DELETE).
 *
 * Implementation:
 * - Relies on lusca's CSRF middleware (which is based on csurf-style semantics).
 * - `lusca.csrf()` must be mounted BEFORE this router in index.ts.
 * - The token is generated per session and stored server-side (in the session).
 *
 * Important:
 * - This endpoint is a GET and is considered "safe"; CSRF validation is not
 *   required for this request.
 */

import express, { type Request, type Response } from 'express';

/**
 * Express router for CSRF-related endpoints.
 *
 * Mounted at: /api/csrf
 */
export const csrfRouter = express.Router();

/**
 * A request that has a csurf-compatible `csrfToken()` function.
 *
 * Lusca's CSRF middleware decorates the request object with this method.
 */
type CsrfRequest = Request & {
  csrfToken: () => string;
};

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
 *   { "csrfToken": "<opaque token string>" }
 *
 * Errors:
 * - 500 if lusca.csrf() was not mounted (csrfToken() missing)
 */
csrfRouter.get('/token', (req: Request, res: Response) => {
  const csrfReq = req as Partial<CsrfRequest>;

  if (typeof csrfReq.csrfToken !== 'function') {
    // Misconfiguration guard: index.ts must mount lusca.csrf() before this router.
    res.status(500).json({ ok: false, error: 'CSRF middleware not configured.' });
    return;
  }

  const token = csrfReq.csrfToken();
  res.status(200).json({ csrfToken: token });
});
