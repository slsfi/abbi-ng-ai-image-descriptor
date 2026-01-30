/**
 * routes/google.ts
 *
 * Google GenAI API relay endpoints.
 *
 * Base path: /api/google
 *
 * Purpose:
 * - Provide same-origin server-to-server access to Google GenAI from an
 *   Angular SPA.
 * - Avoid CORS issues by moving Google GenAI SDK usage to the backend.
 * - Keep the frontend's request payload format stable during migration.
 *
 * Security model:
 * - Uses a server-side session created via POST /api/session/start.
 * - Provider credentials are stored in req.session (memory only).
 *
 * Note on Google GenAI client creation:
 * - A new Google GenAI client instance is created per request.
 * - This is intentional and inexpensive (client is a lightweight config wrapper).
 *
 * Note on API key validation:
 * - This endpoint does NOT re-validate API keys.
 * - Keys are validated when the session is created via POST /api/session/start.
 * - If a key becomes invalid later, the SDK call fails and the error is returned.
 */

import express, { type Request, type Response } from 'express';
import { ApiError, GenerateContentParameters, GenerateContentResponse,
         GoogleGenAI
        } from '@google/genai';

/**
 * Express router for Google GenAI operations.
 *
 * Mounted at: /api/google
 */
export const googleRouter = express.Router();

/**
 * Request body schema for Google responses relay.
 */
type GoogleResponsesRequestBody = {
  payload: GenerateContentParameters;
};

type Usage = {
  inputTokens: number;
  outputTokens: number;
};

type AiError = {
  code: number;
  message: string;
};

type AiResult = {
  text: string;
  usage?: Usage;
  raw?: unknown;
  error?: AiError;
};

/**
 * Convert an OpenAI Responses API response into the app-facing AiResult shape.
 */
function toAiResult(resp: GenerateContentResponse): AiResult {
  const inputTokens = resp?.usageMetadata?.promptTokenCount ?? 0;

  // Output tokens is the sum of candidates and thoughts tokens
  const candidatesTokens = resp?.usageMetadata?.candidatesTokenCount ?? 0;
  const thoughtsTokens = resp?.usageMetadata?.thoughtsTokenCount ?? 0;
  const outputTokens = candidatesTokens + thoughtsTokens;

  return {
    text: resp?.text ?? '',
    usage: { inputTokens, outputTokens }
  };
}

/**
   * Normalizes any thrown error into a valid `AiResult` error response.
   *
   * This function guarantees that:
   *  - The returned object always conforms to `AiResult`
   *  - `text` is present (empty string) so downstream code can rely on it
   *  - Google `ApiError` instances are mapped to a clean `{ code, message }` shape
   *  - Unexpected errors are safely converted to a generic 500 error
   */
function toErrorResultGoogle(e: unknown): AiResult {
  if (e instanceof ApiError) {
    return {
      text: '',
      error: {
        code: e.status ?? 400,
        message: extractGoogleApiMessage(e)
      }
    };
  }

  return {
    text: '',
    error: { code: 500, message: 'Google API error.' }
  };
}

/**
 * Extracts a clean, human-readable error message from a Google GenAI ApiError.
 *
 * The Google GenAI SDK frequently embeds the entire backend JSON error payload
 * (sometimes prefixed with the HTTP status code) into `ApiError.message`, e.g.:
 *
 *   "400 {\"error\":{\"code\":400,\"message\":\"...\",\"status\":\"INVALID_ARGUMENT\"}}"
 *
 * This helper attempts to:
 *  1) Detect and parse such embedded JSON payloads
 *  2) Prefer the backend-provided `error.message` field
 *  3) Fall back to the raw message if parsing fails
 *
 * This ensures that UI-facing error messages remain concise and readable,
 * and prevents leaking raw JSON blobs into snackbars or logs.
 */
function extractGoogleApiMessage(e: ApiError): string {
  const raw = String(e.message ?? '').trim();
  const jsonStart = raw.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const obj = JSON.parse(raw.slice(jsonStart));
      const msg = obj?.error?.message;
      if (typeof msg === 'string' && msg.trim()) return msg.trim();
    } catch {}
  }
  return raw || 'Google API error.';
}

/**
 * POST /api/google/generate-content
 *
 * Relays a request to Google's Gemini API using the official Google GenAI SDK.
 *
 * Requirements:
 * - A valid Google session must exist (created via POST /api/session/start).
 * - The request must include the session cookie (managed by express-session).
 * - This route is CSRF-protected by middleware mounted in index.ts.
 */
googleRouter.post(
  '/generate-content',
  async (
    req: Request<unknown, unknown, GoogleResponsesRequestBody>,
    res: Response<AiResult>
  ) => {
    // Optional TTL enforcement beyond cookie maxAge.
    if (req.session.expiresAt && Date.now() > req.session.expiresAt) {
      return res.json({
        text: '',
        error: { code: 401, message: 'Session expired. Please enter your API key again.' }
      });
    }

    if (req.session.provider !== 'Google' || !req.session.apiKey) {
      return res.json({
        text: '',
        error: { code: 401, message: 'No Google session. Please enter your API key again.' }
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
      const client = new GoogleGenAI({
        apiKey: req.session.apiKey
      });

      const resp = await client.models.generateContent(payload);
      return res.json(toAiResult(resp));
    } catch (e: unknown) {
      return res.json(toErrorResultGoogle(e));
    }
  }
);
