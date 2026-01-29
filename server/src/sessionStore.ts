/**
 * sessionStore.ts
 *
 * In-memory session storage for "bring-your-own-key" API sessions.
 *
 * Design goals:
 * - No persistent storage (no DB, no files).
 * - Store provider API keys in memory only (lost on restart).
 * - Sessions expire automatically via TTL.
 * - Backend uses session ID (ideally HttpOnly cookie) to look up the key.
 *
 * Security notes:
 * - This store keeps API keys in process memory. That is acceptable for this project
 *   because keys are never persisted and access is controlled by possession of the key.
 * - Consider adding rate limiting and optional key fingerprinting later if needed.
 */

export type Provider = 'OpenAI' | 'Google';

/**
 * A single session record stored in memory.
 */
export type SessionRecord = {
  /**
   * Which provider the API key belongs to.
   * (We keep this so the backend can refuse mismatched calls, e.g. OpenAI endpoint
   * with a Google session.)
   */
  provider: Provider;

  /**
   * Provider API key. Stored in memory only and removed when the session expires
   * or is cleared. Never persisted.
   */
  apiKey: string;

  /**
   * Optional organization/project identifier (provider-specific).
   * Used for providers that support an "organization" parameter (OpenAI).
   */
  orgKey?: string;

  /**
   * Absolute timestamp (milliseconds since epoch) when the session becomes invalid.
   */
  expiresAt: number;
};

/**
 * Internal in-memory session map.
 *
 * Key: sessionId (string)
 * Value: SessionRecord
 */
const sessions = new Map<string, SessionRecord>();

/**
 * Create a new session identifier.
 *
 * Prefer crypto.randomUUID() when available (Node 18+ supports it).
 * Falls back to a timestamp+random token if crypto isn't present (e.g., some test envs).
 */
export function createSessionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Store/overwrite a session in memory.
 *
 * @param id - session ID
 * @param rec - session record to store
 */
export function setSession(id: string, rec: SessionRecord): void {
  sessions.set(id, rec);
}

/**
 * Retrieve a session record by session ID.
 *
 * If the session is expired, it is deleted immediately and `null` is returned.
 *
 * @param id - session ID
 * @returns the SessionRecord if present and not expired, otherwise null
 */
export function getSession(id: string): SessionRecord | null {
  const rec = sessions.get(id);
  if (!rec) return null;

  if (Date.now() > rec.expiresAt) {
    sessions.delete(id);
    return null;
  }

  return rec;
}

/**
 * Remove a session from memory (log out / clear session).
 *
 * @param id - session ID
 */
export function clearSession(id: string): void {
  sessions.delete(id);
}

/**
 * Periodic cleanup: deletes expired sessions from the map.
 *
 * Schedule:
 * - Runs every 60 seconds.
 *
 * `.unref?.()`:
 * - If supported by the runtime, unref() prevents this timer from keeping the Node
 *   process alive on its own (helpful for tests and graceful container shutdown).
 */
const CLEANUP_INTERVAL_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [id, rec] of sessions) {
    if (now > rec.expiresAt) sessions.delete(id);
  }
}, CLEANUP_INTERVAL_MS).unref?.();
