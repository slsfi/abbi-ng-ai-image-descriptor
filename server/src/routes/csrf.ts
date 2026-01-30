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
 * - Relies on lusca's CSRF middleware mounted in index.ts.
 * - Lusca decorates the request object with a `csrfToken()` function.
 */

import express, { type Request, type Response } from 'express';

export const csrfRouter = express.Router();

type CsrfRequest = Request & {
  csrfToken: () => string;
};

csrfRouter.get('/token', (req: Request, res: Response) => {
  const csrfReq = req as Partial<CsrfRequest>;

  if (typeof csrfReq.csrfToken !== 'function') {
    res.status(500).json({ ok: false, error: 'CSRF middleware not configured.' });
    return;
  }

  const token = csrfReq.csrfToken();
  res.status(200).json({ csrfToken: token });
});
