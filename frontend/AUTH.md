# Authentication connection

Run these in separate terminals from the repository root:

```powershell
npm.cmd --prefix backend run dev
npm.cmd --prefix frontend run dev
```

The backend needs its existing MongoDB connection and ACCESS_TOKEN_SECRET configured. Its default port is 3000; update frontend/vite.config.ts if you use a different port. Restart Vite after proxy changes.

Local requests use /api through Vite's proxy. A production host must route /api to Express too; the development proxy is not part of the production build.

## State and request flow

- src/stores/auth-store.ts: shared user, access token, loading state, server errors, and signup/signin/signout actions.
- src/lib/api.ts: shared Axios client with cookies and a 15-second timeout.
- Forms: Zod validation and local field errors. Passwords are never saved to Zustand.
- /: protected account screen showing the profile from GET /api/users/me.

Signup sends username, email, firstName, lastName, and password. Success redirects to signin. Signin uses username and password, then fetches the profile using the returned bearer token. Import the shared api client for future protected requests; its interceptor adds the current access token.

Access tokens stay in memory. On startup, initialize() calls POST /api/auth/refresh using the HttpOnly refresh cookie, fetches the profile, and then enables routing. Protected requests that fail with 401 or 403 share one refresh call and retry once with the new token. Auth endpoints never retry themselves. Expired or revoked refresh sessions clear authentication and send the user to signin. Refresh-session expiry is checked explicitly in MongoDB; refresh does not extend the original 14-day expiry. Signout revokes the refresh-token session and clears its cookie. Development cookies use SameSite=Lax without Secure; production uses SameSite=None with Secure.

## Verification

```powershell
node --test backend/tests/refresh.test.mjs
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
```

Store tests mock HTTP responses for signup, signin, profile loading failures, network errors, duplicate submissions, and signout. They do not create database accounts or verify a live MongoDB connection.

