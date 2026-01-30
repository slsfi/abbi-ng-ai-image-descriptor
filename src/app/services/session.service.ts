import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

/**
 * Manages the backend session lifecycle for this SPA.
 *
 * Responsibilities:
 * - Starts a backend session by sending the user-provided API key exactly once.
 * - Clears the backend session (removes API key from server-side session memory).
 * - Exposes a small in-memory session state via signals for UI decisions.
 *
 * Notes:
 * - The backend stores the API key only in the server-side session (MemoryStore).
 * - All unsafe requests are CSRF-protected; our HTTP interceptor adds `x-csrf-token`.
 * - This service does not persist anything to localStorage/sessionStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly http = inject(HttpClient);

  /**
   * True after a successful `start()`, false after `clear()` or on initial load.
   * This is an in-memory hint for the UI; it is not a backend session probe.
   */
  readonly hasActiveSession = signal<boolean>(false);

  /**
   * Starts a backend session by validating and storing the API key in the server-side session.
   *
   * @param apiKey User-provided API key (bring-your-own-key model).
   * @returns Observable that completes when the session is started.
   */
  start(apiKey: string): Observable<unknown> {
    return this.http.post('/api/session/start', { apiKey }).pipe(
      tap(() => this.hasActiveSession.set(true)),
    );
  }

  /**
   * Clears the backend session (removes the stored API key) and resets local state.
   *
   * @returns Observable that completes when the session is cleared.
   */
  clear(): Observable<unknown> {
    return this.http.post('/api/session/clear', {}).pipe(
      tap(() => this.hasActiveSession.set(false)),
    );
  }

  /**
   * Resets local session hint state without calling the backend.
   * Useful if the app detects a 401/403 and wants to force re-auth/key prompt.
   */
  resetLocalState(): void {
    this.hasActiveSession.set(false);
  }
}
