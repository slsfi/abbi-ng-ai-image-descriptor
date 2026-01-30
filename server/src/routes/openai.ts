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
 * - Uses a server-side session created via POST /api/session/start.
 * - Provider credentials are stored in req.session (memory only).
 *
 * Note on OpenAI client creation:
 * - A new OpenAI client instance is created per request.
 * - This is intentional and inexpensive (client is a lightweight config wrapper).
 *
 * Note on API key validation:
 * - This endpoint does NOT re-validate API keys.
 * - Keys are validated when the session is created via POST /api/session/start.
 * - If a key becomes invalid later, the SDK call fails and the error is returned.
 */

import express, { type Request, type Response } from 'express';
import OpenAI from 'openai';

/**
 * Express router for OpenAI operations.
 *
 * Mounted at: /api/openai
 */
export const openaiRouter = express.Router();

/**
 * Request body schema for OpenAI responses relay.
 */
type OpenAiResponsesRequestBody = {
  payload: Record<string, unknown>;
};

type Usage = {
  inputTokens: number;
  outputTokens: number;
};

type ApiError = {
  code: number;
  message: string;
};

type AiResult = {
  text: string;
  usage?: Usage;
  raw?: unknown;
  error?: ApiError;
};

/**
 * Convert an OpenAI Responses API response into the app-facing AiResult shape.
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
 */
function toErrorResult(e: unknown): AiResult {
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
 * - The request must include the session cookie (managed by express-session).
 * - This route is CSRF-protected by middleware mounted in index.ts.
 */
openaiRouter.post(
  '/responses',
  async (
    req: Request<unknown, unknown, OpenAiResponsesRequestBody>,
    res: Response<AiResult>
  ) => {
    // Optional TTL enforcement beyond cookie maxAge.
    if (req.session.expiresAt && Date.now() > req.session.expiresAt) {
      return res.json({
        text: '',
        error: { code: 401, message: 'Session expired. Please enter your API key again.' }
      });
    }

    if (req.session.provider !== 'OpenAI' || !req.session.apiKey) {
      return res.json({
        text: '',
        error: { code: 401, message: 'No OpenAI session. Please enter your API key again.' }
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
        apiKey: req.session.apiKey,
        ...(req.session.orgKey ? { organization: req.session.orgKey } : {})
      });

      const resp = await client.responses.create(payload as any);
      return res.json(toAiResult(resp));
    } catch (e: unknown) {
      return res.json(toErrorResult(e));
    }
  }
);
