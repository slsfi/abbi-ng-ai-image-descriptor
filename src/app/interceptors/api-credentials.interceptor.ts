import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Ensures that requests to the application's backend API (`/api/*`) include
 * cookies (session ID) in development and production.
 *
 * Why:
 * - The backend stores the user-provided OpenAI API key in a server-side session.
 * - The session is identified by an HttpOnly cookie.
 * - Without `withCredentials`, the browser won't send that cookie, and the backend
 *   will not find the session state.
 *
 * Scope:
 * - Only affects same-origin backend calls under `/api/`.
 * - Leaves all other requests untouched.
 */
export const apiCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }

  return next(req.clone({ withCredentials: true }));
};
