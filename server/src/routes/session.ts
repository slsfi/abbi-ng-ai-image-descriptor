/**
 * routes/session.ts
 *
 * Session management endpoints for the "bring your own API key" model.
 *
 * Base path: /api/session
 *
 * Purpose:
 * - Accept a user-supplied provider API key
 * - Validate it server-to-server using the official provider SDK
 * - Store it in memory only (Map + TTL)
 * - Issue a session identifier as an HttpOnly cookie
 *
 * Why a cookie session?
 * - Keeps raw API keys out of the browser bundle and out of local storage
 * - Allows same-origin requests through nginx without CORS issues
 * - Keeps operational complexity low (no auth, no DB)
 *
 * Security notes:
 * - API keys are stored in process memory only and are lost on restart.
 * - This is a deliberate design choice for low-ops deployments.
 */

import express, { type Request, type Response } from 'express';
import OpenAI from 'openai';
import { createSessionId, setSession, clearSession, type Provider } from '../sessionStore.js';

/**
 * Name of the HttpOnly cookie that stores the session identifier.
 */
const SESSION_COOKIE_NAME = 'abbi_sid';

/**
 * Default session TTL (time-to-live) in milliseconds.
 *
 * A "short" TTL is intentional:
 * - limits the impact if a session cookie is leaked
 * - encourages periodic re-validation
 *
 * You can tune this as needed.
 */
const DEFAULT_TTL_MS = 30 * 60_000; // 30 minutes

/**
 * Express router for session operations.
 *
 * Mounted at: /api/session
 */
export const sessionRouter = express.Router();

/**
 * Request body schema for starting a session.
 */
type StartSessionBody = {
  provider: Provider;
  apiKey: string;
  orgKey?: string;
};

/**
 * Standard API response shape for session endpoints.
 */
type SessionResponse =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validates an OpenAI API key using the official OpenAI SDK.
 *
 * The validation strategy is to call a lightweight endpoint that requires
 * authentication. `models.list()` is generally small and sufficient.
 *
 * @param apiKey - OpenAI API key provided by the user
 * @param orgKey - Optional OpenAI organization key (if used in your setup)
 * @throws if the key is invalid or the request fails
 */
async function validateOpenAiKey(apiKey: string, orgKey?: string): Promise<void> {
  const client = new OpenAI({
    apiKey,
    ...(orgKey ? { organization: orgKey } : {})
  });

  // Throws on invalid key (401) or network errors.
  await client.models.list();
}

/**
 * POST /api/session/start
 *
 * Creates a new in-memory session for a provider API key.
 *
 * Request body:
 * {
 *   provider: "OpenAI" | "Google",
 *   apiKey: string,
 *   orgKey?: string
 * }
 *
 * Response:
 * - 200 { ok: true } on success
 * - 401 { ok: false, error: "..."} on invalid key
 * - 400 { ok: false, error: "..."} on missing parameters
 *
 * Side effects:
 * - Sets an HttpOnly cookie containing the session identifier.
 *
 * Notes:
 * - This endpoint performs server-to-server validation to avoid CORS and to ensure
 *   the key works before storing it in memory.
 */
sessionRouter.post('/start', async (req: Request<unknown, unknown, StartSessionBody>, res: Response<SessionResponse>) => {
  const { provider, apiKey, orgKey } = req.body ?? {};

  // Basic input validation (keep it strict and explicit).
  if (!provider || !apiKey) {
    return res.status(400).json({ ok: false, error: 'Missing required fields: provider and apiKey.' });
  }

  // Validate API key depending on provider.
  // Phase 4: OpenAI validation is implemented; Google can be added in Phase 5.
  try {
    if (provider === 'OpenAI') {
      await validateOpenAiKey(apiKey, orgKey);
    } else if (provider === 'Google') {
      // Placeholder: implement validation with Google GenAI SDK in Phase 5.
      // For now, accept the session creation so the frontend flow can stay uniform
      // even if Google is still called browser-side.
      //
      // If you prefer strict behavior, replace this with:
      // return res.status(400).json({ ok: false, error: 'Google session validation not implemented yet.' });
    } else {
      // Exhaustiveness guard (should not happen if Provider type is respected).
      return res.status(400).json({ ok: false, error: `Unsupported provider: ${String(provider)}` });
    }
  } catch (_e: unknown) {
    // Do not leak provider SDK error details to clients in this phase.
    // A simple message is enough for UI validation.
    return res.status(401).json({ ok: false, error: `Invalid ${provider} API key.` });
  }

  // Create and store session in memory.
  const sid = createSessionId();
  const ttlMs = DEFAULT_TTL_MS;

  setSession(sid, {
    provider,
    apiKey,
    orgKey,
    expiresAt: Date.now() + ttlMs
  });

  // Issue session cookie.
  //
  // Cookie settings:
  // - httpOnly: prevents JS access (reduces XSS impact)
  // - sameSite=lax: good default for SPA on same origin
  // - secure: should be true behind HTTPS; allow false for local dev without TLS
  res.cookie(SESSION_COOKIE_NAME, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ttlMs,
    path: '/'
  });

  return res.status(200).json({ ok: true });
});

/**
 * POST /api/session/clear
 *
 * Clears the current session (server-side record + client cookie).
 *
 * Response:
 * - 200 { ok: true } always (idempotent)
 *
 * Notes:
 * - If no session exists, this still returns ok=true to keep client logic simple.
 */
sessionRouter.post('/clear', (req: Request, res: Response<SessionResponse>) => {
  const sid: string | undefined = req.cookies?.[SESSION_COOKIE_NAME];

  if (sid) {
    clearSession(sid);
  }

  // Clear cookie on client.
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

  return res.status(200).json({ ok: true });
});
