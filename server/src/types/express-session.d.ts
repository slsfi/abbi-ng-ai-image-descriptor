/**
 * types/express-session.d.ts
 *
 * Type augmentation for express-session.
 *
 * Purpose:
 * - Define the custom fields we store in req.session.
 * - Keeps route code type-safe and self-documenting.
 *
 * Notes:
 * - This file is picked up by TypeScript if your tsconfig includes src/**
 * - Do not import this file anywhere; it is a global type augmentation.
 */

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    /**
     * The provider for which the stored API key is valid.
     */
    provider?: 'OpenAI' | 'Google';

    /**
     * Provider API key (bring-your-own-key).
     *
     * Stored server-side in memory only (MemoryStore) and lost on restart.
     */
    apiKey?: string;

    /**
     * Optional provider organization key (OpenAI).
     */
    orgKey?: string;

    /**
     * Optional absolute expiry timestamp (ms since epoch) if you want TTL semantics.
     * If omitted, session expiry is controlled by the session cookie maxAge.
     */
    expiresAt?: number;
  }
}
