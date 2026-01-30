/**
 * middleware/csrfSync.ts
 *
 * CSRF protection middleware based on csrf-sync (Synchroniser Token Pattern).
 *
 * This implements robust CSRF protection for cookie-authenticated APIs:
 * - Stores a per-session token in the session state.
 * - Requires the token be sent in the `x-csrf-token` header for unsafe requests.
 * - Protects POST/PUT/PATCH/DELETE/etc.
 *
 * Related guidance:
 * - Since csurf is deprecated, csrf-sync is a maintained alternative
 *   that works well with Express and session-based state.
 */

import type { Request, Response, NextFunction } from 'express';
import { csrfSync } from 'csrf-sync';

// Configure csrfSync.
// Defaults:
// - ignoredMethods: GET, HEAD, OPTIONS (safe methods don't require tokens)
// - getTokenFromRequest: reads req.headers['x-csrf-token']
const {
  csrfSynchronisedProtection,
  generateToken,
} = csrfSync({
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string | undefined
});

/**
 * Generate (or retrieve) the CSRF token for the current session.
 *
 * Used by the CSRF token endpoint (e.g. GET /api/csrf/token).
 */
export { generateToken };

/**
 * Wrapper middleware to protect routes with synchronized CSRF.
 *
 * This is the ONLY CSRF-related middleware that should be used by routes.
 * The underlying csrf-sync implementation detail is intentionally not exported.
 */
export function withCsrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  csrfSynchronisedProtection(req, res, next);
}
