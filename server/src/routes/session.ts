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
 * CSRF (Lusca-only):
 * - All unsafe session endpoints require a CSRF token via `x-csrf-token`.
 * - The SPA must first call GET /api/csrf/token to obtain the token.
 */

import express, { type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export const sessionRouter = express.Router();

type StartSessionBody = {
  provider: 'OpenAI' | 'Google';
  apiKey: string;
  orgKey?: string;
};

type SessionResponse =
  | { ok: true }
  | { ok: false; error: string };

const DEFAULT_TTL_MS = 30 * 60_000; // 30 minutes

async function validateGoogleKey(apiKey: string): Promise<void> {
  const client = new GoogleGenAI({
    apiKey: apiKey
    // NOTE: Do not force apiVersion to 'v1'.
    // Preview models (e.g. Gemini 3 Pro Preview) require v1beta
    // for thinkingConfig and mediaResolution.
  });

  await client.models.list();
}

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
 * CSRF:
 * - This endpoint is state-changing and MUST be CSRF-protected.
 * - The SPA must send `x-csrf-token`, obtained by calling GET /api/csrf/token first.
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
        await validateGoogleKey(apiKey);
      } else {
        return res.status(400).json({ ok: false, error: `Unsupported provider: ${String(provider)}` });
      }
    } catch {
      return res.status(401).json({ ok: false, error: `Invalid ${provider} API key.` });
    }

    req.session.provider = provider;
    req.session.apiKey = apiKey;
    req.session.orgKey = orgKey;
    req.session.expiresAt = Date.now() + DEFAULT_TTL_MS;

    return res.status(200).json({ ok: true });
  }
);

sessionRouter.post('/clear', (req: Request, res: Response<SessionResponse>) => {
  req.session.destroy((_err) => {
    // Idempotent response: do not leak internals.
    res.status(200).json({ ok: true });
  });
});
