import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, shareReplay, tap } from 'rxjs';

/**
 * CSRF token manager for the backend API.
 *
 * Responsibilities:
 * - Fetches a CSRF token from `GET /api/csrf/token`.
 * - Caches the token in memory only (never in localStorage/sessionStorage).
 * - Exposes a simple `getToken()` API for interceptors/services.
 *
 * Notes:
 * - The backend ties the CSRF token to the server-side session.
 * - If the session expires or is cleared, callers should call `clear()`
 *   so a fresh token is fetched next time.
 */
@Injectable({
  providedIn: 'root'
})
export class CsrfService {
  private readonly http = inject(HttpClient);

  private token?: string;
  private inFlight$?: Observable<string>;

  /**
   * Returns an in-memory CSRF token, fetching it once per session when needed.
   */
  getToken(): Observable<string> {
    if (this.token) return of(this.token);
    if (this.inFlight$) return this.inFlight$;

    this.inFlight$ = this.http
      .get<{ csrfToken: string }>('/api/csrf/token')
      .pipe(
        map(r => r.csrfToken),
        tap(t => {
          this.token = t;
          this.inFlight$ = undefined;
        }),
        shareReplay(1),
      );

    return this.inFlight$;
  }

  /**
   * Clears the cached token so the next `getToken()` call refetches it.
   */
  clear(): void {
    this.token = undefined;
    this.inFlight$ = undefined;
  }
}
