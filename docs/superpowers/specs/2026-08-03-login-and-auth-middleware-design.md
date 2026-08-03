# Login + Authenticated Middleware — Design

**Date:** 2026-08-03
**Project:** `crimes-backend` (Murder Mystery teaching API)
**Scope:** Add a mock login endpoint that returns a JWT, and an `authenticated` middleware that guards the existing data routes. Docs stay public so students can read them and learn the token flow.

## Goals

- A single `POST /login` endpoint that accepts hardcoded credentials and returns a signed JWT.
- An Express middleware that verifies the bearer token on every data route.
- The OpenAPI spec reflects the new endpoint and the new security requirement, and `openapi.test.ts` enforces it.
- All behaviour covered by `node:test` unit tests — no untested code.

## Non-goals

- A real user database, password hashing, registration, or password reset.
- Refresh tokens, token revocation, or role-based authorisation.
- Rate limiting, audit logging, or any production-grade hardening beyond constant-time credential comparison.
- A frontend or any change to how students consume the API beyond adding `Authorization: Bearer <token>`.

## Architecture

A new module `src/lib/auth.ts` owns all authentication logic. It exports:

- `login(username, password): Promise<LoginResult>` — validates credentials against the hardcoded user and signs a JWT.
- `authMiddleware: RequestHandler` — Express middleware, extracts and verifies the bearer token, attaches the decoded payload to `req.user`.
- `requireUser(req): JwtPayload` — typed accessor that throws if the middleware did not run, so route handlers fail loudly rather than read `undefined`.
- `MOCK_USERS: readonly User[]` — the in-memory user list. Exposed so tests can reference the canonical credentials.

A new router `src/routes/auth.ts` exposes `POST /login`. It depends only on `src/lib/auth.ts` and returns a `LoginResult` on success.

`index.ts` mounts `POST /login` publicly and wraps each of the nine existing data routers with `authMiddleware`.

### Public vs guarded routes

| Path | Status |
| --- | --- |
| `POST /login` | public |
| `GET /docs` | public |
| `GET /docs.json` | public |
| `GET /crimes` and the other 8 data routes | guarded |

The `/docs` Swagger UI continues to render without a token, but the "Try it out" button on a guarded operation requires one. Students authenticate in the UI using the `Authorize` button at the top of the spec.

## Hardcoded user

A single user defined in `src/lib/auth.ts` as a module constant:

```ts
export type User = { id: string; username: string; password: string }

export const MOCK_USERS: readonly User[] = [
    { id: '1', username: 'admin', password: 'admin' },
] as const
```

The password is stored as a plain string because the goal is a mock that students can read and reason about. A constant-time comparator is used to avoid leaking the password character by character through timing differences.

## JWT

- Library: `jose` (added to `package.json` `dependencies`).
- Algorithm: `HS256`.
- Secret source: `process.env.JWT_SECRET ?? 'dev-secret-change-me'`. The secret is encoded to a `Uint8Array` once at module load time and reused for both signing and verification.
- Lifetime: 1 hour. The token's `exp` is `iat + 3600`. The response includes an `expires_at` field as an ISO-8601 string.
- Claims:
  ```ts
  type JwtPayload = {
      sub: string
      username: string
      iat: number
      exp: number
  }
  ```
- Response shape on `POST /login`:
  ```json
  {
      "token": "eyJ...",
      "token_type": "Bearer",
      "expires_at": "2026-08-03T15:04:05.000Z"
  }
  ```

## Request and error flow

### `POST /login`

1. Parse `username` and `password` from the JSON body. Both must be strings.
2. Look up the user by username. Compare the password with `constantTimeEqual`.
3. On success, sign a JWT and return the `LoginResult`.
4. On failure, return the appropriate error.

| Condition | Status | Body |
| --- | --- | --- |
| Missing or non-string `username` or `password` | 400 | `{ "error": "Campos \"username\" e \"password\" são obrigatórios" }` |
| Wrong username or password | 401 | `{ "error": "Credenciais inválidas" }` |
| `jose` signing error | 500 | `{ "error": "Erro interno do servidor" }` |

### `authMiddleware` (every guarded route)

1. Read the `Authorization` header. If missing, malformed, or not starting with `Bearer `, respond 401 and stop.
2. Extract the token after `Bearer `. Call `jose.jwtVerify(token, secret, { algorithms: ['HS256'] })`.
3. On success, assign `req.user = payload` and call `next()`.
4. On any `JOSEError` (bad signature, malformed token, expired), respond 401.
5. On any other thrown error, respond 500.

| Condition | Status | Body |
| --- | --- | --- |
| Missing or non-Bearer `Authorization` header | 401 | `{ "error": "Token ausente ou mal formatado" }` |
| Verification failure (any `JOSEError`) | 401 | `{ "error": "Token inválido ou expirado" }` |
| Unexpected error | 500 | `{ "error": "Erro interno do servidor" }` |

The 401 messages do not distinguish between expired and otherwise invalid tokens.

### `requireUser(req)`

A pure helper that returns the payload attached by the middleware. Throws `Error('authMiddleware must run before this handler')` if `req.user` is not set. The middleware is the only path that should call `next()` on a guarded route, so reaching `requireUser` without the middleware indicates a wiring bug.

## Wiring in `index.ts`

The middleware is applied per-router rather than globally so `/login`, `/docs`, and `/docs.json` stay reachable:

```ts
const guard = Router()
guard.use(authMiddleware)
guard.use('/crimes', crimesRoutes)
guard.use('/carteiras', carteirasRoutes)
// ... 7 more
app.use(guard)

app.use('/login', authRoutes)
```

`cors()` and `json()` continue to apply globally.

## OpenAPI changes

`src/docs/openapi.ts` is updated to:

- Add `BearerAuth` to `components.securitySchemes` (type `http`, scheme `bearer`, bearer format `JWT`).
- Add `LoginRequest`, `LoginResponse`, and `Unauthorized` schemas under `components.schemas`.
- Add `POST /login` under `paths` with a 200 and a 401 response.
- Add a top-level `security: [{ BearerAuth: [] }]` so all data operations are guarded. `/login` opts out with `security: []`.
- Add a `Login` tag.

`src/docs/openapi.test.ts` is updated to:

- Add `Login`, `LoginRequest`, `LoginResponse`, `Unauthorized` to `REQUIRED_SCHEMAS`.
- Add `/login` to the `PathKey` union and to `OBJECT_ENDPOINTS` (since `POST /login` returns a single object, not an array).
- Assert that `/login` is reachable without `security` and that the other paths require it.

## Testing strategy

All tests live in `src/lib/auth.test.ts` and use `node:test` + `node:assert/strict` to match the rest of the suite. Tests set `process.env.JWT_SECRET` to a stable test value in a `before` block and restore it in an `after` block.

### `login()`

- Returns a token that `jose.jwtVerify` accepts with the same secret.
- The verified payload's `sub` equals the user's `id` and `username` matches.
- `payload.exp - payload.iat === 3600`.
- `expires_at` is an ISO-8601 string equal to `new Date(payload.exp * 1000).toISOString()`.
- Throws on wrong password, wrong username, and missing credentials.

### `constantTimeEqual` (exported for testing)

- Equal strings return `true`.
- Different strings of the same length return `false`.
- Different lengths return `false`.
- Empty strings return `true` (both empty, trivially equal).

### `authMiddleware`

Tests use a tiny stub `req`/`res`/`next` to avoid pulling in `supertest`.

- Sets `req.user` on a valid token and calls `next()` exactly once.
- Responds 401 with the missing-header message when `Authorization` is absent.
- Responds 401 when the scheme is not `Bearer`.
- Responds 401 when the token is signed with a different secret.
- Responds 401 when the token has already expired.
- Responds 500 on an unexpected thrown error from `jose` (simulated by stubbing the verify function).

### `requireUser`

- Returns the payload when `req.user` is set.
- Throws when `req.user` is missing.

## File changes

- `package.json` — add `jose` to `dependencies`.
- `src/lib/auth.ts` — new file. Owns `MOCK_USERS`, `login`, `authMiddleware`, `requireUser`, and the cached secret.
- `src/routes/auth.ts` — new file. Single `POST /` route delegating to `login`.
- `index.ts` — wrap the nine data routers with `authMiddleware` via a guarded `Router`, mount `/login` publicly.
- `src/docs/openapi.ts` — add the `Login` tag, `/login` path, related schemas, and the `BearerAuth` security scheme. Apply `security` to data paths.
- `src/lib/auth.test.ts` — new file with the unit tests above.
- `src/docs/openapi.test.ts` — extend `REQUIRED_SCHEMAS`, `PathKey`, `OBJECT_ENDPOINTS`, and add the security-presence assertions.

## Open questions

None. The design was confirmed in brainstorming and the user has approved it.
