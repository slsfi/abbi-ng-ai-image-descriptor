/**
 * routes/openai.ts
 *
 * OpenAI API relay endpoints.
 *
 * Base path: /api/openai
 *
 * Purpose:
 * - Provide same-origin server-to-server access to OpenAI from an Angular SPA.
 * - Avoid CORS issues by moving OpenAI SDK usage to the backend.
 * - Keep the frontend's request payload format stable during migration.
 *
 * Security model:
 * - Uses the "bring your own API key" session created via POST /api/session/start.
 * - The OpenAI key is stored in memory only (sessionStore) and never persisted.
 * - Authentication is possession of a valid session cookie (HttpOnly).
 *
 * Note on OpenAI client creation:
 *
 * A new OpenAI client instance is created per request.
 * This is intentional and inexpensive:
 * - client instances are lightweight
 * - HTTP connections are pooled by the underlying runtime
 * - avoids stale credentials or invalidation complexity
 * 
 * Note on API key validation:
 *
 * This endpoint does NOT re-validate API keys.
 * Keys are validated when the session is created via POST /api/session/start.
 * If a key becomes invalid later, the OpenAI SDK call will fail and the error
 * is returned to the client.
 * 
 * Non-goals (for now):
 * - Streaming responses
 * - Rate limiting
 * - Multipart/binary upload optimizations
 *
 * These can be added later.
 */

import express, { type Request, type Response } from 'express';
import OpenAI from 'openai';
import { getSession } from '../sessionStore.js';

/**
 * Name of the HttpOnly cookie containing the session identifier.
 *
 * NOTE:
 * - Keep this consistent with routes/session.ts.
 * - If you later centralize constants, move this to a shared module.
 */
const SESSION_COOKIE_NAME = 'abbi_sid';

/**
 * Express router for OpenAI operations.
 *
 * Mounted at: /api/openai
 */
export const openaiRouter = express.Router();

/**
 * Request body schema for OpenAI responses relay.
 *
 * The frontend sends:
 * {
 *   payload: <OpenAI Responses API request object>
 * }
 *
 * We intentionally keep this generic so frontend code can reuse its current
 * payload building logic while we migrate call-sites incrementally.
 */
type OpenAiResponsesRequestBody = {
  payload: Record<string, unknown>;
};

/**
 * Minimal usage shape for the app.
 */
type Usage = {
  inputTokens: number;
  outputTokens: number;
};

/**
 * Error shape used by the backend responses.
 *
 * We keep it small and UI-friendly; do not leak sensitive details.
 */
type ApiError = {
  code: number;
  message: string;
};

/**
 * Backend response shape. This mirrors the frontend's AiResult idea:
 * - `text` contains the synthesized text output (if any)
 * - `usage` contains token counts when available
 * - `raw` contains the raw provider response for debugging (may be large)
 * - `error` is present for provider/API errors
 *
 * If you later want stricter typing, you can model this using shared types.
 */
type AiResult = {
  text: string;
  usage?: Usage;
  raw?: unknown;
  error?: ApiError;
};

/**
 * Extract a session ID from the request cookies.
 *
 * @param req - Express request
 * @returns Session ID string if present, otherwise null
 */
function getSessionId(req: Request<any, any, any, any>): string | null {
  const sid = (req.cookies?.[SESSION_COOKIE_NAME] as string | undefined) ?? undefined;
  return sid ?? null;
}

/**
 * Convert an OpenAI Responses API response into the app-facing AiResult shape.
 *
 * @param resp - OpenAI SDK response object
 * @returns AiResult
 */
function toAiResult(resp: any): AiResult {
  const inputTokens = resp?.usage?.input_tokens;
  const outputTokens = resp?.usage?.output_tokens;

  return {
    text: resp?.output_text ?? '',
    usage:
      typeof inputTokens === 'number' && typeof outputTokens === 'number'
        ? { inputTokens, outputTokens }
        : undefined,
    raw: resp
  };
}

/**
 * Convert an unknown error into a safe AiResult error payload.
 *
 * @param e - unknown error thrown by SDK/network
 * @returns AiResult with error field set
 */
function toErrorResult(e: unknown): AiResult {
  // The OpenAI SDK error objects often have status/message fields,
  // but we must not depend on any one shape.
  const anyErr = e as any;

  const code =
    typeof anyErr?.status === 'number'
      ? anyErr.status
      : typeof anyErr?.code === 'number'
        ? anyErr.code
        : 500;

  const message =
    typeof anyErr?.message === 'string'
      ? anyErr.message
      : 'OpenAI request failed.';

  return {
    text: '',
    error: { code, message },
    raw: anyErr
  };
}

/**
 * POST /api/openai/responses
 *
 * Relays a request to OpenAI's Responses API using the official OpenAI SDK.
 *
 * Requirements:
 * - A valid OpenAI session must exist (created via POST /api/session/start).
 * - The request must include the session cookie (HttpOnly, same-origin in prod).
 *
 * Request body:
 * {
 *   payload: object
 * }
 *
 * Response:
 * - 200 OK with AiResult on success
 * - 401 OK with AiResult.error if session is missing/expired
 *   (We return 200 for consistent frontend handling; you may prefer true 401s.)
 *
 * Notes on status codes:
 * - This endpoint returns 200 even on provider errors so the frontend can display
 *   the error in-band without special-case fetch handling.
 * - If you prefer strict REST semantics, change error cases to res.status(401/500).
 */
openaiRouter.post(
  '/responses',
  async (
    req: Request<unknown, unknown, OpenAiResponsesRequestBody>,
    res: Response<AiResult>
  ) => {
    const sid = getSessionId(req);
    if (!sid) {
      return res.json({
        text: '',
        error: { code: 401, message: 'No session. Please enter your API key again.' }
      });
    }

    const session = getSession(sid);
    if (!session || session.provider !== 'OpenAI') {
      return res.json({
        text: '',
        error: { code: 401, message: 'Session expired or not an OpenAI session. Please enter your API key again.' }
      });
    }

    const payload = req.body?.payload;
    if (!payload || typeof payload !== 'object') {
      return res.json({
        text: '',
        error: { code: 400, message: 'Missing or invalid payload.' }
      });
    }

    try {
      const client = new OpenAI({
        apiKey: session.apiKey,
        ...(session.orgKey ? { organization: session.orgKey } : {})
      });

      const resp = await client.responses.create(payload as any);
      return res.json(toAiResult(resp));
    } catch (e: unknown) {
      return res.json(toErrorResult(e));
    }
  }
);
