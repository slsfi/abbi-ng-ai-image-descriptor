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
 * - Store it in the server-side session (express-session MemoryStore)
 * - Keep operational complexity low (no auth, no DB, no persistent storage)
 *
 * Security notes:
 * - API keys are stored in server memory only and are lost on restart.
 * - Access remains: "having a valid API key + a valid session cookie = access".
 *
 * API key validation strategy:
 * - Provider API keys are validated exactly once, at session creation time.
 * - Validation is performed server-to-server using the official SDK.
 * - Subsequent API calls rely on the existence of a valid session.
 */

import express, { type Request, type Response } from 'express';
import OpenAI from 'openai';

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
  provider: 'OpenAI' | 'Google';
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
 * Default session TTL (time-to-live) in milliseconds.
 *
 * This TTL is enforced in two ways:
 * - Session cookie maxAge (configured in index.ts for express-session)
 * - Optional expiresAt stored in session to enforce a hard TTL
 *
 * You can tune this as needed.
 */
const DEFAULT_TTL_MS = 30 * 60_000; // 30 minutes

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

  await client.models.list();
}

/**
 * POST /api/session/start
 *
 * Creates a new server-side session for a provider API key.
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
 * Notes:
 * - This endpoint performs server-to-server validation to avoid CORS and to ensure
 *   the key works before storing it in memory.
 * - This endpoint is intentionally NOT CSRF-protected because it creates the session.
 */
sessionRouter.post(
  '/start',
  async (req: Request<unknown, unknown, StartSessionBody>, res: Response<SessionResponse>) => {
    const { provider, apiKey, orgKey } = req.body ?? {};

    if (!provider || !apiKey) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: provider and apiKey.' });
    }

    try {
      if (provider === 'OpenAI') {
        await validateOpenAiKey(apiKey, orgKey);
      } else if (provider === 'Google') {
        // Placeholder: implement validation with Google GenAI SDK in Phase 5.
        // For now, accept the session creation to keep the frontend flow uniform.
      } else {
        return res.status(400).json({ ok: false, error: `Unsupported provider: ${String(provider)}` });
      }
    } catch {
      return res.status(401).json({ ok: false, error: `Invalid ${provider} API key.` });
    }

    // Store provider credentials in the server-side session (memory-only store).
    req.session.provider = provider;
    req.session.apiKey = apiKey;
    req.session.orgKey = orgKey;
    req.session.expiresAt = Date.now() + DEFAULT_TTL_MS;

    return res.status(200).json({ ok: true });
  }
);

/**
 * POST /api/session/clear
 *
 * Clears the current session (server-side).
 *
 * Response:
 * - 200 { ok: true } always (idempotent)
 *
 * Notes:
 * - If no session exists, this still returns ok=true to keep client logic simple.
 */
sessionRouter.post('/clear', (req: Request, res: Response<SessionResponse>) => {
  req.session.destroy((err) => {
    if (err) {
      // Do not leak internals; the client can retry.
      res.status(200).json({ ok: true });
      return;
    }
    res.status(200).json({ ok: true });
  });
});
