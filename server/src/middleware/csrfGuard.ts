/**
 * middleware/csrfGuard.ts
 *
 * CSRF mitigation middleware for cookie-authenticated APIs.
 *
 * Threat model:
 * - The backend uses an HttpOnly session cookie for authentication.
 * - Without CSRF defenses, a malicious website could attempt to trigger
 *   state-changing requests from a victim's browser.
 *
 * Approach:
 * - For unsafe HTTP methods (POST/PUT/PATCH/DELETE), enforce same-origin by
 *   validating the `Origin` header when present.
 * - Fall back to validating the `Referer` header when `Origin` is absent
 *   (some clients/edge cases).
 *
 * This approach is well-suited for same-origin SPAs where the frontend and API
 * share an origin (e.g., nginx serves the SPA and proxies /api/*).
 *
 * Notes:
 * - This is not a token-based CSRF defense. If you later add cross-origin
 *   consumers or third-party integrations, you may need a token-based solution.
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Returns true if the HTTP method is considered "safe" (does not modify state).
 */
function isSafeMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

/**
 * Compute the expected origin (scheme + host) for this request.
 *
 * In production behind nginx, you should ensure proxy headers are trusted
 * appropriately if you rely on req.protocol. If you terminate TLS at nginx,
 * consider setting `app.set('trust proxy', true)` in index.ts so req.protocol
 * reflects the original scheme.
 */
function expectedOrigin(req: Request): string {
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * Express middleware enforcing same-origin for unsafe requests.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (isSafeMethod(req.method)) {
    next();
    return;
  }

  const exp = expectedOrigin(req);

  const origin = req.get('origin');
  if (origin) {
    if (origin !== exp) {
      res.status(403).json({ ok: false, error: 'CSRF blocked: origin mismatch.' });
      return;
    }
    next();
    return;
  }

  // Fallback check when Origin header is missing.
  const referer = req.get('referer');
  if (referer) {
    if (!referer.startsWith(exp + '/')) {
      res.status(403).json({ ok: false, error: 'CSRF blocked: referer mismatch.' });
      return;
    }
    next();
    return;
  }

  // If neither header is present, be conservative.
  res.status(403).json({ ok: false, error: 'CSRF blocked: missing origin/referer.' });
}
