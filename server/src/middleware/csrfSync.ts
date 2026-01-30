/**
 * middleware/csrfSync.ts
 *
 * CSRF protection middleware based on csrf-sync (Synchroniser Token Pattern).
 *
 * This implements robust CSRF protection for cookie-authenticated APIs:
 * - Stores a per-session token in req.session (requires express-session).
 * - Requires the token be sent in the `x-csrf-token` header for unsafe requests.
 *
 * Why we have a "skip" mechanism:
 * - Some endpoints (e.g. POST /api/session/start) must be callable before a CSRF
 *   token exists, because they bootstrap the session.
 * - We therefore provide a narrowly-scoped exemption mechanism.
 *
 * IMPORTANT:
 * - Exemptions must remain minimal and explicit.
 */

import type { Request, Response, NextFunction } from 'express';
import { csrfSync } from 'csrf-sync';

const {
  csrfSynchronisedProtection,
  generateToken
} = csrfSync({
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string | undefined
});

/**
 * Generate (or retrieve) the CSRF token for the current session.
 *
 * Used by GET /api/csrf/token.
 */
export { generateToken };

/**
 * Create CSRF protection middleware with optional route exemptions.
 *
 * This allows us to mount CSRF protection in front of an entire router
 * (which satisfies CodeQL), while still allowing a small set of bootstrap
 * endpoints to be accessed before a CSRF token exists.
 *
 * @param options - Configuration options for exemptions.
 * @param options.skip - A predicate returning true for requests that should be exempt.
 * @returns Express middleware function.
 */
export function createCsrfProtection(options?: {
  skip?: (req: Request) => boolean;
}): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (options?.skip?.(req)) {
      next();
      return;
    }
    csrfSynchronisedProtection(req, res, next);
  };
}

/**
 * Default CSRF protection middleware (no exemptions).
 *
 * Use this on routers that should always be CSRF-protected for unsafe methods.
 */
export const withCsrfProtection = createCsrfProtection();
