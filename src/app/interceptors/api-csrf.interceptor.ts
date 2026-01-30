import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { CsrfService } from '../services/csrf.service';

/**
 * Adds `x-csrf-token` to unsafe backend requests (`POST/PUT/PATCH/DELETE`) under `/api/*`.
 *
 * Responsibilities:
 * - Leaves safe methods (GET/HEAD/OPTIONS) untouched.
 * - Requests a CSRF token on demand and attaches it as `x-csrf-token`.
 * - Clears the cached token on 401/403 so the next request refetches it.
 *
 * This interceptor does not store tokens anywhere persistent.
 */
export const apiCsrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);

  const method = req.method.toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  if (isSafe) return next(req);

  const csrf = inject(CsrfService);

  return csrf.getToken().pipe(
    switchMap(token => next(req.clone({ setHeaders: { 'x-csrf-token': token } }))),
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        csrf.clear();
      }
      return throwError(() => err);
    }),
  );
};
