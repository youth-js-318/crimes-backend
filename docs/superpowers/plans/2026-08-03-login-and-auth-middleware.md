# Login + Authenticated Middleware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `POST /login` endpoint that returns a signed JWT (mock user in memory) and an `authMiddleware` that guards all existing data routes. Docs stay public.

**Architecture:** A new `src/lib/auth.ts` module owns the mock user, the secret-derived `Uint8Array`, `login()`, `authMiddleware`, and `requireUser`. A new `src/routes/auth.ts` exposes `POST /login`. `index.ts` mounts a guard `Router` that wraps the 9 data routers and mounts `/login` publicly. `jose` signs and verifies HS256 tokens. The OpenAPI spec is extended with the new path, a `BearerAuth` security scheme, and the `Login` tag.

**Tech Stack:** Express 5, TypeScript strict, `jose` (HS256), `node:test` + `node:assert/strict`, `tsx`.

---

## File map

| File | Status | Responsibility |
| --- | --- | --- |
| `package.json` | Modify | Add `jose` to `dependencies`. |
| `src/lib/auth.ts` | Create | Mock user, `constantTimeEqual`, `login`, `authMiddleware`, `requireUser`, secret helper. |
| `src/lib/auth.test.ts` | Create | Unit tests for all auth helpers. |
| `src/routes/auth.ts` | Create | `POST /` route that delegates to `login`. |
| `index.ts` | Modify | Wire `authMiddleware` around data routes; mount `/login` publicly. |
| `src/docs/openapi.ts` | Modify | Add `BearerAuth`, `LoginRequest`, `LoginResponse`, `Unauthorized`, `/login` path, `Login` tag, top-level `security`. |
| `src/docs/openapi.test.ts` | Modify | Add new schema names, `/login` path, security-presence assertions. |

---

## Task 1: Add `jose` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `jose`**

Run: `npm install jose`
Expected: `package.json` gains a `jose` entry under `dependencies`; `node_modules/jose` exists.

- [ ] **Step 2: Verify the import resolves**

Run:

```bash
node --import tsx -e "import('jose').then(j => console.log(typeof j.SignJWT, typeof j.jwtVerify))"
```

Expected output: `function function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add jose dependency for JWT signing"
```

---

## Task 2: `src/lib/auth.ts` — TDD

**Files:**
- Create: `src/lib/auth.test.ts`
- Create: `src/lib/auth.ts`

### Step 1: Write the failing test file

Create `src/lib/auth.test.ts` with the contents below.

```ts
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { SignJWT, jwtVerify } from 'jose'
import {
    MOCK_USERS,
    constantTimeEqual,
    login,
    authMiddleware,
    requireUser,
} from './auth'

const TEST_SECRET = 'test-secret-must-be-long-enough-for-hs256-please'
const ORIGINAL_SECRET = process.env.JWT_SECRET

before(() => {
    process.env.JWT_SECRET = TEST_SECRET
})

after(() => {
    if (ORIGINAL_SECRET === undefined) {
        delete process.env.JWT_SECRET
    } else {
        process.env.JWT_SECRET = ORIGINAL_SECRET
    }
})

describe('MOCK_USERS', () => {
    it('contains exactly one user', () => {
        assert.equal(MOCK_USERS.length, 1)
    })

    it('has admin/admin credentials', () => {
        const [user] = MOCK_USERS
        assert.ok(user, 'expected one mock user')
        assert.equal(user.username, 'admin')
        assert.equal(user.password, 'admin')
        assert.ok(user.id, 'expected user to have an id')
    })
})

describe('constantTimeEqual', () => {
    it('returns true for equal strings', () => {
        assert.equal(constantTimeEqual('abc', 'abc'), true)
    })

    it('returns true for both empty strings', () => {
        assert.equal(constantTimeEqual('', ''), true)
    })

    it('returns false for different same-length strings', () => {
        assert.equal(constantTimeEqual('abc', 'abd'), false)
    })

    it('returns false for different-length strings', () => {
        assert.equal(constantTimeEqual('abc', 'abcd'), false)
        assert.equal(constantTimeEqual('abcd', 'abc'), false)
    })
})

describe('login', () => {
    it('returns a token that verifies with the same secret', async () => {
        const result = await login('admin', 'admin')
        const verified = await jwtVerify(
            result.token,
            new TextEncoder().encode(TEST_SECRET),
            { algorithms: ['HS256'] },
        )
        assert.equal(verified.payload.sub, MOCK_USERS[0]!.id)
        assert.equal(verified.payload.username, 'admin')
    })

    it('sets exp - iat to 3600 seconds', async () => {
        const result = await login('admin', 'admin')
        const verified = await jwtVerify(
            result.token,
            new TextEncoder().encode(TEST_SECRET),
            { algorithms: ['HS256'] },
        )
        const { iat, exp } = verified.payload as { iat: number; exp: number }
        assert.equal(exp - iat, 3600)
    })

    it('returns expires_at as an ISO string matching the token exp', async () => {
        const result = await login('admin', 'admin')
        const verified = await jwtVerify(
            result.token,
            new TextEncoder().encode(TEST_SECRET),
            { algorithms: ['HS256'] },
        )
        const exp = (verified.payload as { exp: number }).exp
        const expected = new Date(exp * 1000).toISOString()
        assert.equal(result.expires_at, expected)
    })

    it('returns token_type "Bearer"', async () => {
        const result = await login('admin', 'admin')
        assert.equal(result.token_type, 'Bearer')
    })

    it('throws on wrong password', async () => {
        await assert.rejects(login('admin', 'wrong'), /credenciais/i)
    })

    it('throws on wrong username', async () => {
        await assert.rejects(login('notadmin', 'admin'), /credenciais/i)
    })

    it('throws on missing username', async () => {
        await assert.rejects(
            // @ts-expect-error testing runtime validation
            login(undefined, 'admin'),
            /username e password/i,
        )
    })

    it('throws on missing password', async () => {
        await assert.rejects(
            // @ts-expect-error testing runtime validation
            login('admin', undefined),
            /username e password/i,
        )
    })
})

describe('authMiddleware', () => {
    const signToken = async (secret: string, claims: Record<string, unknown> = {}) => {
        return await new SignJWT({ username: 'admin', ...claims })
            .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
            .setSubject(MOCK_USERS[0]!.id)
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(new TextEncoder().encode(secret))
    }

    const makeRes = () => {
        const headers: Record<string, unknown> = {}
        let statusCode = 200
        let body: unknown
        return {
            status(code: number) {
                statusCode = code
                return this
            },
            json(payload: unknown) {
                body = payload
                return this
            },
            get statusCode() {
                return statusCode
            },
            get body() {
                return body
            },
            get headers() {
                return headers
            },
        }
    }

    it('sets req.user and calls next on a valid token', async () => {
        const token = await signToken(TEST_SECRET)
        const req = { headers: { authorization: `Bearer ${token}` } }
        const res = makeRes()
        let nextCalled = 0
        await authMiddleware(
            req as never,
            res as never,
            () => {
                nextCalled += 1
            },
        )
        assert.equal(nextCalled, 1)
        const user = (req as { user?: unknown }).user as { sub: string; username: string }
        assert.equal(user.sub, MOCK_USERS[0]!.id)
        assert.equal(user.username, 'admin')
    })

    it('responds 401 when Authorization header is missing', async () => {
        const req = { headers: {} }
        const res = makeRes()
        let nextCalled = 0
        await authMiddleware(
            req as never,
            res as never,
            () => {
                nextCalled += 1
            },
        )
        assert.equal(nextCalled, 0)
        assert.equal(res.statusCode, 401)
        assert.deepEqual(res.body, { error: 'Token ausente ou mal formatado' })
    })

    it('responds 401 when scheme is not Bearer', async () => {
        const req = { headers: { authorization: 'Basic abc123' } }
        const res = makeRes()
        let nextCalled = 0
        await authMiddleware(
            req as never,
            res as never,
            () => {
                nextCalled += 1
            },
        )
        assert.equal(nextCalled, 0)
        assert.equal(res.statusCode, 401)
        assert.deepEqual(res.body, { error: 'Token ausente ou mal formatado' })
    })

    it('responds 401 on a token signed with a different secret', async () => {
        const token = await signToken('a-different-secret-that-is-also-long-enough')
        const req = { headers: { authorization: `Bearer ${token}` } }
        const res = makeRes()
        let nextCalled = 0
        await authMiddleware(
            req as never,
            res as never,
            () => {
                nextCalled += 1
            },
        )
        assert.equal(nextCalled, 0)
        assert.equal(res.statusCode, 401)
        assert.deepEqual(res.body, { error: 'Token inválido ou expirado' })
    })

    it('responds 401 on an expired token', async () => {
        const expired = await new SignJWT({ username: 'admin' })
            .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
            .setSubject(MOCK_USERS[0]!.id)
            .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
            .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
            .sign(new TextEncoder().encode(TEST_SECRET))
        const req = { headers: { authorization: `Bearer ${expired}` } }
        const res = makeRes()
        let nextCalled = 0
        await authMiddleware(
            req as never,
            res as never,
            () => {
                nextCalled += 1
            },
        )
        assert.equal(nextCalled, 0)
        assert.equal(res.statusCode, 401)
        assert.deepEqual(res.body, { error: 'Token inválido ou expirado' })
    })
})

describe('requireUser', () => {
    it('returns the user attached by the middleware', () => {
        const user = { sub: '1', username: 'admin', iat: 1, exp: 2 }
        const req = { user } as never
        assert.equal(requireUser(req), user)
    })

    it('throws when the user is not set', () => {
        const req = {} as never
        assert.throws(() => requireUser(req), /authMiddleware must run/)
    })
})
```

### Step 2: Run the test to verify it fails

Run: `npm test -- --test-name-pattern='MOCK_USERS'`
Expected: FAIL — `Cannot find module './auth'` (the file does not exist yet).

### Step 3: Write the implementation

Create `src/lib/auth.ts` with the contents below.

```ts
import type { Request, RequestHandler } from 'express'
import { errors as joseErrors, jwtVerify, SignJWT } from 'jose'

export type User = {
    id: string
    username: string
    password: string
}

export const MOCK_USERS: readonly User[] = [
    { id: '1', username: 'admin', password: 'admin' },
] as const

export type JwtPayload = {
    sub: string
    username: string
    iat: number
    exp: number
}

export type LoginResult = {
    token: string
    token_type: 'Bearer'
    expires_at: string
}

const TOKEN_TTL_SECONDS = 60 * 60

const getSecret = (): Uint8Array => {
    const raw = process.env.JWT_SECRET ?? 'dev-secret-change-me'
    return new TextEncoder().encode(raw)
}

export const constantTimeEqual = (a: string, b: string): boolean => {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i += 1) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return diff === 0
}

export const login = async (username: unknown, password: unknown): Promise<LoginResult> => {
    if (typeof username !== 'string' || typeof password !== 'string') {
        throw new Error('Campos "username" e "password" são obrigatórios')
    }

    const user = MOCK_USERS.find((u) => u.username === username)
    if (!user || !constantTimeEqual(user.password, password)) {
        throw new Error('Credenciais inválidas')
    }

    const secret = getSecret()
    const token = await new SignJWT({ username: user.username })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(user.id)
        .setIssuedAt()
        .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
        .sign(secret)

    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString()

    return { token, token_type: 'Bearer', expires_at: expiresAt }
}

export const authMiddleware: RequestHandler = async (req, res, next) => {
    const header = req.headers.authorization
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token ausente ou mal formatado' })
        return
    }

    const token = header.slice('Bearer '.length).trim()
    if (token === '') {
        res.status(401).json({ error: 'Token ausente ou mal formatado' })
        return
    }

    try {
        const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
        const user: JwtPayload = {
            sub: String(payload.sub),
            username: String((payload as { username?: unknown }).username ?? ''),
            iat: Number(payload.iat),
            exp: Number(payload.exp),
        }
        ;(req as Request & { user: JwtPayload }).user = user
        next()
    } catch (err) {
        if (err instanceof joseErrors.JOSEError) {
            res.status(401).json({ error: 'Token inválido ou expirado' })
            return
        }
        next(err)
    }
}

export const requireUser = (req: Request): JwtPayload => {
    const user = (req as Request & { user?: JwtPayload }).user
    if (!user) {
        throw new Error('authMiddleware must run before this handler')
    }
    return user
}
```

### Step 4: Run the full test suite

Run: `npm test`
Expected: PASS — all describe blocks green, including the OpenAPI spec tests.

### Step 5: Commit

```bash
git add src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat: add auth module with login and middleware"
```

---

## Task 3: `src/routes/auth.ts` — `POST /login`

**Files:**
- Create: `src/routes/auth.ts`

- [ ] **Step 1: Create the route file**

Create `src/routes/auth.ts` with the contents below.

```ts
import { Router } from 'express'
import { login } from '../lib/auth'

const authRoutes = Router()

authRoutes.post('/', async (req, res) => {
    const { username, password } = req.body ?? {}

    try {
        const result = await login(username, password)
        return res.json(result)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro interno do servidor'

        if (/credenciais/i.test(message)) {
            return res.status(401).json({ error: message })
        }
        if (/username e password/i.test(message)) {
            return res.status(400).json({ error: message })
        }
        return res.status(500).json({ error: 'Erro interno do servidor' })
    }
})

export default authRoutes
```

- [ ] **Step 2: Verify the type-checks**

Run: `npx tsc --noEmit`
Expected: exit 0, no diagnostics.

- [ ] **Step 3: Commit**

```bash
git add src/routes/auth.ts
git commit -m "feat: expose POST /login route"
```

---

## Task 4: Wire middleware into `index.ts`

**Files:**
- Modify: `index.ts`

- [ ] **Step 1: Replace `index.ts` with the contents below**

The full replacement file (re-read first to confirm the only changes are the imports/registration block):

```ts
import express, { json, Router } from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import crimesRoutes from './src/routes/crimes'
import carteirasRoutes from './src/routes/carteiras'
import pessoasRoutes from './src/routes/pessoas'
import interviewRoutes from './src/routes/interview'
import incomeRoutes from './src/routes/income'
import getFitNowMembersRoutes from './src/routes/get_fit_now_members'
import getFitNowCheckinRoutes from './src/routes/get_fit_now_checkin'
import facebookEventCheckinRoutes from './src/routes/facebook_event_checkin'
import solutionRoutes from './src/routes/solution'
import authRoutes from './src/routes/auth'
import { authMiddleware } from './src/lib/auth'
import { openApiSpec } from './src/docs/openapi'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT || 3000

const app = express()

app.use(json())
app.use(cors())

app.get('/docs.json', (_req, res) => {
    return res.json(openApiSpec)
})

app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
        swaggerOptions: { url: '/docs.json' },
    }),
)

// Um crime aconteceu e o detetive precisa de sua ajuda. O detetive lhe deu o
// relatório da cena do crime, mas você perdeu ele. Você lembra vagamente que
// o crime foi um assassinato (murder) que aconteceu em algum momento
// em 15 de janeiro de 2018 e que ele aconteceu em SQL City.
// Comece encontrando o relatório correspondente da database da polícia.

// Todos aceitam os parâmetros: page, limit, sort_by e sort_order
// Também aceitam os parâmetros de filtro específicos de cada rota,
// como person_id para entrevistas ou ssn para renda

// Rotas de dados: requerem autenticacao via JWT
const guarded = Router()
guarded.use(authMiddleware)
guarded.use('/crimes', crimesRoutes)
guarded.use('/carteiras', carteirasRoutes)
guarded.use('/pessoas', pessoasRoutes)
guarded.use('/entrevistas', interviewRoutes)
guarded.use('/saldo', incomeRoutes)
guarded.use('/academia-membros', getFitNowMembersRoutes)
guarded.use('/academia-checkin', getFitNowCheckinRoutes)
guarded.use('/facebook-checkin', facebookEventCheckinRoutes)
guarded.use('/solucao', solutionRoutes)
app.use(guarded)

// Rotas publicas
app.use('/login', authRoutes)

app.listen(PORT, () => {
    console.log(`server running on http://localhost:${PORT}`)
})
```

- [ ] **Step 2: Verify the type-checks and tests pass**

Run: `npx tsc --noEmit && npm test`
Expected: exit 0, all tests pass.

- [ ] **Step 3: Smoke-test the server manually**

Run (in the background): `PORT=3001 npm run dev`
Then in another shell:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/crimes
# expected: 401
curl -s -X POST -H 'content-type: application/json' \
    -d '{"username":"admin","password":"admin"}' http://localhost:3001/login
# expected: a JSON object with token, token_type: "Bearer", expires_at
TOKEN=$(curl -s -X POST -H 'content-type: application/json' \
    -d '{"username":"admin","password":"admin"}' http://localhost:3001/login \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).token))')
curl -s -o /dev/null -w "%{http_code}\n" -H "authorization: Bearer $TOKEN" http://localhost:3001/crimes
# expected: 200
```

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add index.ts
git commit -m "feat: guard data routes with authMiddleware"
```

---

## Task 5: Update the OpenAPI spec and its test

**Files:**
- Modify: `src/docs/openapi.ts`
- Modify: `src/docs/openapi.test.ts`

### Step 1: Write the failing test additions

Replace the contents of `src/docs/openapi.test.ts` with the file below (the additions over the original are the new schema names, the `/login` path entry, and two new `it(...)` blocks).

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { openApiSpec } from './openapi'

const REQUIRED_SCHEMAS = [
    'Pagination',
    'CrimeSceneReport',
    'DriversLicense',
    'Person',
    'Interview',
    'Income',
    'GetFitNowMember',
    'GetFitNowCheckIn',
    'FacebookEventCheckin',
    'Error',
    'Validation',
    'LoginRequest',
    'LoginResponse',
    'Unauthorized',
] as const

type PathKey =
    | '/crimes'
    | '/carteiras'
    | '/pessoas'
    | '/entrevistas'
    | '/saldo'
    | '/academia-membros'
    | '/academia-checkin'
    | '/facebook-checkin'
    | '/solucao'
    | '/login'

type ArrayPathKey = Exclude<PathKey, '/solucao' | '/login'>
type ObjectPathKey = '/solucao' | '/login'

const ARRAY_ENDPOINTS: Record<ArrayPathKey, string> = {
    '/crimes': 'CrimeSceneReport',
    '/carteiras': 'DriversLicense',
    '/pessoas': 'Person',
    '/entrevistas': 'Interview',
    '/saldo': 'Income',
    '/academia-membros': 'GetFitNowMember',
    '/academia-checkin': 'GetFitNowCheckIn',
    '/facebook-checkin': 'FacebookEventCheckin',
}

const OBJECT_ENDPOINTS: Record<ObjectPathKey, string> = {
    '/solucao': 'Validation',
    '/login': 'LoginResponse',
}

const GUARDED_PATH_KEYS: PathKey[] = [
    '/crimes',
    '/carteiras',
    '/pessoas',
    '/entrevistas',
    '/saldo',
    '/academia-membros',
    '/academia-checkin',
    '/facebook-checkin',
    '/solucao',
]

const ALL_ENDPOINTS: Record<PathKey, string> = {
    ...ARRAY_ENDPOINTS,
    ...OBJECT_ENDPOINTS,
}

type Components = {
    parameters?: Record<string, unknown>
    schemas?: Record<string, { type?: string; properties?: Record<string, unknown>; required?: string[] }>
    securitySchemes?: Record<string, { type?: string; scheme?: string; bearerFormat?: string }>
}

type Operation = {
    security?: Array<Record<string, string[]>>
    requestBody?: { required?: boolean; content?: { 'application/json'?: { schema?: unknown } } }
    responses?: Record<string, { description?: string; content?: { 'application/json'?: { schema?: unknown } } }>
}

type OpenApiSpec = {
    openapi: string
    security?: Array<Record<string, string[]>>
    paths: Record<string, { get?: Operation; post?: Operation }>
    components?: Components
}

const spec = openApiSpec as unknown as OpenApiSpec
const schemas = spec.components?.schemas ?? {}

describe('openapi spec', () => {
    it('declares openapi 3.0.3', () => {
        assert.equal(spec.openapi, '3.0.3')
    })

    it('defines every required resource schema as an object with properties', () => {
        for (const name of REQUIRED_SCHEMAS) {
            const schema = schemas[name]
            assert.ok(schema, `Schema ${name} nao definido em components.schemas`)
            assert.equal(schema.type, 'object', `Schema ${name} deve ser type=object`)
            assert.ok(
                schema.properties && Object.keys(schema.properties).length > 0,
                `Schema ${name} precisa ter properties`,
            )
        }
    })

    it('declares a BearerAuth security scheme', () => {
        const scheme = spec.components?.securitySchemes?.BearerAuth as
            | { type?: string; scheme?: string; bearerFormat?: string }
            | undefined
        assert.ok(scheme, 'securitySchemes.BearerAuth ausente')
        assert.equal(scheme.type, 'http')
        assert.equal(scheme.scheme, 'bearer')
        assert.equal(scheme.bearerFormat, 'JWT')
    })

    it('declares a top-level security requirement referencing BearerAuth', () => {
        const security = spec.security
        assert.ok(security, 'spec.security ausente')
        assert.ok(
            security!.some((entry) => 'BearerAuth' in entry),
            'spec.security deve referenciar BearerAuth',
        )
    })

    it('applies security to every guarded data path', () => {
        for (const path of GUARDED_PATH_KEYS) {
            const operation = spec.paths[path]?.get ?? spec.paths[path]?.post
            assert.ok(operation, `Operacao ausente em ${path}`)
            const operationSecurity = operation.security
            assert.ok(
                operationSecurity?.some((entry) => 'BearerAuth' in entry),
                `${path} deve exigir BearerAuth`,
            )
        }
    })

    it('opts /login out of the top-level security requirement', () => {
        const operation = spec.paths['/login']?.post
        assert.ok(operation, 'Operacao POST ausente em /login')
        const operationSecurity = operation.security
        assert.ok(operationSecurity, '/login deve declarar security: [] explicito')
        assert.equal(operationSecurity!.length, 0, '/login security deve ser array vazio')
    })

    it('declares a 200 paginated envelope with the correct schema for array endpoints', () => {
        for (const [path, expectedSchema] of Object.entries(ARRAY_ENDPOINTS) as [PathKey, string][]) {
            const operation = spec.paths[path]?.get
            assert.ok(operation, `Operacao GET ausente em ${path}`)

            const response200 = operation.responses?.['200']
            assert.ok(response200, `Resposta 200 ausente em ${path}`)

            const jsonSchema = response200.content?.['application/json']?.schema as
                | {
                    type?: string
                    required?: string[]
                    properties?: Record<string, unknown>
                }
                | undefined
            assert.ok(jsonSchema, `Schema JSON ausente em ${path} 200`)
            assert.equal(jsonSchema.type, 'object', `${path} deve retornar object (envelope)`)
            assert.ok(
                jsonSchema.required?.includes('data') &&
                    jsonSchema.required?.includes('pagination') &&
                    jsonSchema.required?.includes('status'),
                `${path} deve exigir data, pagination e status`,
            )

            const data = jsonSchema.properties?.data as { type?: string; items?: { $ref?: string } } | undefined
            assert.ok(data, `${path} deve declarar propriedade data`)
            assert.equal(data.type, 'array', `${path} data deve ser array`)
            assert.equal(
                data.items?.$ref,
                `#/components/schemas/${expectedSchema}`,
                `${path} data.items deve referenciar ${expectedSchema}`,
            )

            const pagination = jsonSchema.properties?.pagination as { $ref?: string } | undefined
            assert.equal(pagination?.$ref, '#/components/schemas/Pagination', `${path} pagination deve referenciar Pagination`)

            const status = jsonSchema.properties?.status as { enum?: string[] } | undefined
            assert.deepEqual(status?.enum, ['success'], `${path} status deve ser enum ['success']`)
        }
    })

    it('declares a 200 object response with the correct schema for object endpoints', () => {
        for (const [path, expectedSchema] of Object.entries(OBJECT_ENDPOINTS) as [PathKey, string][]) {
            const operation = spec.paths[path]?.get ?? spec.paths[path]?.post
            assert.ok(operation, `Operacao ausente em ${path}`)

            const response200 = operation.responses?.['200']
            assert.ok(response200, `Resposta 200 ausente em ${path}`)

            const jsonSchema = response200.content?.['application/json']?.schema as
                | { $ref?: string }
                | undefined
            assert.ok(jsonSchema, `Schema JSON ausente em ${path} 200`)
            assert.equal(jsonSchema.$ref, `#/components/schemas/${expectedSchema}`, `${path} deve referenciar ${expectedSchema}`)
        }
    })

    it('declares 400 and 500 responses with the Error schema for every endpoint', () => {
        for (const path of Object.keys(ALL_ENDPOINTS) as PathKey[]) {
            const operation = spec.paths[path]?.get ?? spec.paths[path]?.post
            assert.ok(operation, `Operacao ausente em ${path}`)

            const response400 = operation.responses?.['400']
            const response500 = operation.responses?.['500']
            assert.ok(response400, `Resposta 400 ausente em ${path}`)
            assert.ok(response500, `Resposta 500 ausente em ${path}`)

            const schema400 = response400.content?.['application/json']?.schema as { $ref?: string } | undefined
            const schema500 = response500.content?.['application/json']?.schema as { $ref?: string } | undefined
            assert.equal(schema400?.$ref, '#/components/schemas/Error', `${path} 400 deve referenciar Error`)
            assert.equal(schema500?.$ref, '#/components/schemas/Error', `${path} 500 deve referenciar Error`)
        }
    })

    it('declares POST /solucao with a required requestBody and POST operation', () => {
        const operation = spec.paths['/solucao']?.post
        assert.ok(operation, 'Operacao POST ausente em /solucao')

        const requestBody = operation.requestBody
        assert.ok(requestBody, 'requestBody ausente em POST /solucao')
        assert.equal(requestBody.required, true, 'requestBody de POST /solucao deve ser obrigatorio')

        const bodySchema = requestBody.content?.['application/json']?.schema as
            | { type?: string; required?: string[]; properties?: Record<string, unknown> }
            | undefined
        assert.ok(bodySchema, 'Schema JSON do requestBody ausente em POST /solucao')
        assert.equal(bodySchema.type, 'object', 'Body de POST /solucao deve ser object')
        assert.ok(
            bodySchema.required?.includes('name'),
            'Body de POST /solucao deve exigir o campo "name"',
        )
        assert.ok(bodySchema.properties?.name, 'Body de POST /solucao deve declarar a propriedade "name"')
    })

    it('declares POST /login with a required requestBody referencing LoginRequest and 200 referencing LoginResponse', () => {
        const operation = spec.paths['/login']?.post
        assert.ok(operation, 'Operacao POST ausente em /login')

        const requestBody = operation.requestBody
        assert.ok(requestBody, 'requestBody ausente em POST /login')
        assert.equal(requestBody.required, true, 'requestBody de POST /login deve ser obrigatorio')

        const bodySchema = requestBody.content?.['application/json']?.schema as { $ref?: string } | undefined
        assert.equal(
            bodySchema?.$ref,
            '#/components/schemas/LoginRequest',
            'Body de POST /login deve referenciar LoginRequest',
        )

        const response200 = operation.responses?.['200']
        const response401 = operation.responses?.['401']
        assert.ok(response200, 'Resposta 200 ausente em /login')
        assert.ok(response401, 'Resposta 401 ausente em /login')

        const schema200 = response200.content?.['application/json']?.schema as { $ref?: string } | undefined
        const schema401 = response401.content?.['application/json']?.schema as { $ref?: string } | undefined
        assert.equal(
            schema200?.$ref,
            '#/components/schemas/LoginResponse',
            '200 de /login deve referenciar LoginResponse',
        )
        assert.equal(
            schema401?.$ref,
            '#/components/schemas/Unauthorized',
            '401 de /login deve referenciar Unauthorized',
        )
    })

    it('every $ref in the spec resolves to a defined component', () => {
        const serialized = JSON.stringify(openApiSpec)
        const refRegex = /"\$ref":\s*"#\/components\/([^/]+)\/([^"]+)"/g
        const matches = [...serialized.matchAll(refRegex)]
        assert.ok(matches.length > 0, 'Nenhum $ref encontrado no spec')

        const components = spec.components ?? {}
        for (const match of matches) {
            const section = match[1]
            const name = match[2]
            if (!section || !name) continue
            const sectionContainer = (components as Record<string, Record<string, unknown> | undefined>)[section]
            assert.ok(
                sectionContainer?.[name],
                `$ref nao resolvido: #/components/${section}/${name}`,
            )
        }
    })
})
```

### Step 2: Run the new test to verify it fails

Run: `npm test -- --test-name-pattern='openapi spec'`
Expected: FAIL — assertions about `BearerAuth`, `LoginRequest`, `/login` path, and security presence will throw.

### Step 3: Add the spec additions

Edit `src/docs/openapi.ts`. The complete target file is below; replace the existing one in full.

```ts
const ok = (description: string, schemaRef: string) => ({
    description,
    content: {
        'application/json': {
            schema: { type: 'array', items: { $ref: schemaRef } },
        },
    },
})

const okPaginated = (description: string, schemaRef: string) => ({
    description,
    content: {
        'application/json': {
            schema: {
                type: 'object',
                required: ['data', 'pagination', 'status'],
                properties: {
                    data: { type: 'array', items: { $ref: schemaRef } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                    status: { type: 'string', enum: ['success'] },
                },
            },
        },
    },
})

const okObject = (description: string, schemaRef: string) => ({
    description,
    content: {
        'application/json': {
            schema: { $ref: schemaRef },
        },
    },
})

const error = (description: string) => ({
    description,
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
        },
    },
})

const unauthorized = () => ({
    description: 'Token ausente, mal formatado ou expirado',
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/Unauthorized' },
        },
    },
})

const bearerSecurity = [{ BearerAuth: [] }]

const wrapGuarded = <T extends Record<string, unknown>>(operation: T): T & { security: typeof bearerSecurity } => ({
    ...operation,
    security: bearerSecurity,
})

export const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Murder Mistery API',
        version: '1.0.0',
        description: 'API para investigação de dados do caso Murder Mystery',
    },
    servers: [
        {
            url: 'https://crimes-backend-production.up.railway.app',
        },
        {
            url: 'http://localhost:3000',
        },
    ],
    tags: [
        { name: 'Crimes' },
        { name: 'Carteiras' },
        { name: 'Pessoas' },
        { name: 'Entrevistas' },
        { name: 'Renda' },
        { name: 'Academia' },
        { name: 'Facebook' },
        { name: 'Solucao' },
        { name: 'Login' },
    ],
    security: bearerSecurity,
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        parameters: {
            Page: {
                name: 'page',
                in: 'query',
                schema: { type: 'integer', minimum: 1, default: 1 },
                description: 'Numero da pagina',
            },
            Limit: {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
                description: 'Quantidade de registros por pagina',
            },
            SortBy: {
                name: 'sort_by',
                in: 'query',
                schema: { type: 'string' },
                description: 'Campo permitido para ordenacao da rota',
            },
            SortOrder: {
                name: 'sort_order',
                in: 'query',
                schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
                description: 'Direcao da ordenacao',
            },
        },
        schemas: {
            Pagination: {
                type: 'object',
                description: 'Metadados de paginacao da resposta',
                required: ['page', 'limit', 'total', 'total_pages', 'has_next', 'has_prev'],
                properties: {
                    page: { type: 'integer', nullable: true, description: 'Pagina atual (null se nao paginado)' },
                    limit: { type: 'integer', nullable: true, description: 'Itens por pagina (null se nao paginado)' },
                    total: { type: 'integer', description: 'Total de registros que correspondem ao filtro' },
                    total_pages: { type: 'integer', nullable: true, description: 'Total de paginas (null se nao paginado)' },
                    has_next: { type: 'boolean', nullable: true, description: 'Existe proxima pagina?' },
                    has_prev: { type: 'boolean', nullable: true, description: 'Existe pagina anterior?' },
                },
            },
            Error: {
                type: 'object',
                description: 'Resposta de erro padrao',
                required: ['error'],
                properties: {
                    error: { type: 'string', description: 'Mensagem descrevendo o erro' },
                },
            },
            Unauthorized: {
                type: 'object',
                description: 'Resposta de erro de autenticacao',
                required: ['error'],
                properties: {
                    error: { type: 'string', description: 'Mensagem descrevendo o motivo da recusa' },
                },
            },
            LoginRequest: {
                type: 'object',
                description: 'Credenciais submetidas para obter um token',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string', description: 'Nome de usuario' },
                    password: { type: 'string', description: 'Senha' },
                },
            },
            LoginResponse: {
                type: 'object',
                description: 'Token JWT emitido pelo login',
                required: ['token', 'token_type', 'expires_at'],
                properties: {
                    token: { type: 'string', description: 'JWT assinado' },
                    token_type: { type: 'string', enum: ['Bearer'], description: 'Tipo do token' },
                    expires_at: { type: 'string', format: 'date-time', description: 'Momento de expiracao do token em ISO-8601' },
                },
            },
            CrimeSceneReport: {
                type: 'object',
                description: 'Relatorio da cena do crime',
                required: ['date', 'type', 'description', 'city'],
                properties: {
                    date: { type: 'integer', description: 'Data do crime em formato YYYYMMDD' },
                    type: { type: 'string', description: 'Tipo do crime' },
                    description: { type: 'string', description: 'Descricao do crime' },
                    city: { type: 'string', description: 'Cidade onde ocorreu o crime' },
                },
            },
            DriversLicense: {
                type: 'object',
                description: 'Carteira de motorista',
                required: ['id', 'plate_number'],
                properties: {
                    id: { type: 'integer', description: 'Identificador da carteira' },
                    age: { type: 'integer', nullable: true, description: 'Idade do portador' },
                    height: { type: 'integer', nullable: true, description: 'Altura em polegadas' },
                    eye_color: { type: 'string', nullable: true, description: 'Cor dos olhos' },
                    hair_color: { type: 'string', nullable: true, description: 'Cor do cabelo' },
                    gender: { type: 'string', nullable: true, description: 'Genero' },
                    plate_number: { type: 'string', description: 'Placa do veiculo' },
                    car_make: { type: 'string', nullable: true, description: 'Marca do veiculo' },
                    car_model: { type: 'string', nullable: true, description: 'Modelo do veiculo' },
                },
            },
            Person: {
                type: 'object',
                description: 'Pessoa cadastrada',
                required: ['id'],
                properties: {
                    id: { type: 'integer', description: 'Identificador da pessoa' },
                    name: { type: 'string', nullable: true, description: 'Nome completo' },
                    license_id: { type: 'integer', nullable: true, description: 'Id da carteira de motorista' },
                    address_number: { type: 'integer', nullable: true, description: 'Numero do endereco' },
                    address_street_name: { type: 'string', nullable: true, description: 'Rua do endereco' },
                    ssn: { type: 'string', nullable: true, description: 'Social Security Number' },
                },
            },
            Interview: {
                type: 'object',
                description: 'Entrevista realizada com uma pessoa',
                required: ['person_id', 'transcript'],
                properties: {
                    person_id: { type: 'integer', description: 'Id da pessoa entrevistada' },
                    transcript: { type: 'string', description: 'Transcricao da entrevista' },
                },
            },
            Income: {
                type: 'object',
                description: 'Renda anual de uma pessoa',
                required: ['ssn'],
                properties: {
                    ssn: { type: 'string', description: 'Social Security Number' },
                    annual_income: { type: 'integer', nullable: true, description: 'Renda anual em dolares' },
                },
            },
            GetFitNowMember: {
                type: 'object',
                description: 'Membro da academia Get Fit Now',
                required: ['id'],
                properties: {
                    id: { type: 'string', description: 'Identificador do membro' },
                    person_id: { type: 'integer', nullable: true, description: 'Id da pessoa associada' },
                    name: { type: 'string', nullable: true, description: 'Nome do membro' },
                    membership_start_date: { type: 'integer', nullable: true, description: 'Data de inicio da matricula' },
                    membership_status: { type: 'string', nullable: true, description: 'Status da matricula' },
                },
            },
            GetFitNowCheckIn: {
                type: 'object',
                description: 'Check-in na academia Get Fit Now',
                required: ['membership_id', 'check_in_date', 'check_in_time', 'check_out_time'],
                properties: {
                    membership_id: { type: 'string', description: 'Id do membro' },
                    check_in_date: { type: 'integer', description: 'Data do check-in' },
                    check_in_time: { type: 'integer', description: 'Hora do check-in em minutos desde 00:00' },
                    check_out_time: { type: 'integer', description: 'Hora do check-out em minutos desde 00:00' },
                },
            },
            FacebookEventCheckin: {
                type: 'object',
                description: 'Check-in em evento do Facebook',
                required: ['person_id', 'event_id', 'date'],
                properties: {
                    person_id: { type: 'integer', description: 'Id da pessoa' },
                    event_id: { type: 'integer', description: 'Id do evento' },
                    event_name: { type: 'string', nullable: true, description: 'Nome do evento' },
                    date: { type: 'integer', description: 'Data do check-in' },
                },
            },
            Validation: {
                type: 'object',
                description: 'Resultado da validacao de uma solucao submetida',
                required: ['correct', 'message'],
                properties: {
                    correct: { type: 'boolean', description: 'Indica se a solucao submetida esta correta' },
                    message: { type: 'string', description: 'Mensagem amigavel descrevendo o resultado' },
                    hint: { type: 'string', description: 'Dica para o jogador (presente apenas em respostas incorretas)' },
                    role: {
                        type: 'string',
                        enum: ['assassino', 'mandante'],
                        description: 'Papel da pessoa correta (presente apenas em respostas corretas)',
                    },
                },
            },
        },
    },
    paths: {
        '/login': {
            post: {
                tags: ['Login'],
                summary: 'Autentica e devolve um token JWT',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/LoginRequest' },
                        },
                    },
                },
                responses: {
                    '200': okObject('Token emitido', '#/components/schemas/LoginResponse'),
                    '400': error('Body invalido'),
                    '401': unauthorized(),
                    '500': error('Erro interno do servidor'),
                },
            },
        },
        '/crimes': {
            get: wrapGuarded({
                tags: ['Crimes'],
                summary: 'Lista crimes',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'city', in: 'query', schema: { type: 'string' } },
                    { name: 'type', in: 'query', schema: { type: 'string' } },
                    { name: 'description', in: 'query', schema: { type: 'string' } },
                    { name: 'date', in: 'query', schema: { type: 'integer' } },
                ],
                responses: {
                    '200': okPaginated('Lista de crimes', '#/components/schemas/CrimeSceneReport'),
                    '400': error('Parametros de consulta invalidos'),
                    '401': unauthorized(),
                    '500': error('Erro interno do servidor'),
                },
            }),
        },
        '/carteiras': {
            get: wrapGuarded({
                tags: ['Carteiras'],
                summary: 'Lista carteiras de motorista',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'id', in: 'query', schema: { type: 'integer' } },
                    { name: 'age', in: 'query', schema: { type: 'integer' } },
                    { name: 'height', in: 'query', schema: { type: 'integer' } },
                    { name: 'eye_color', in: 'query', schema: { type: 'string' } },
                    { name: 'hair_color', in: 'query', schema: { type: 'string' } },
                    { name: 'gender', in: 'query', schema: { type: 'string' } },
                    { name: 'plate_number', in: 'query', schema: { type: 'string' } },
                    { name: 'car_make', in: 'query', schema: { type: 'string' } },
                    { name: 'car_model', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    '200': okPaginated('Lista de carteiras', '#/components/schemas/DriversLicense'),
                    '400': error('Parametros de consulta invalidos'),
                    '401': unauthorized(),
                    '500': error('Erro interno do servidor'),
                },
            }),
        },
        '/pessoas': {
            get: wrapGuarded({
                tags: ['Pessoas'],
                summary: 'Lista pessoas',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'name', in: 'query', schema: { type: 'string' } },
                    { name: 'license_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'address_number', in: 'query', schema: { type: 'integer' } },
                    { name: 'address_street_name', in: 'query', schema: { type: 'string' } },
                    { name: 'ssn', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    '200': okPaginated('Lista de pessoas', '#/components/schemas/Person'),
                    '400': error('Parametros de consulta invalidos'),
                    '401': unauthorized(),
                    '500': error('Erro interno do servidor'),
                },
            }),
        },
        '/entrevistas': {
            get: wrapGuarded({
                tags: ['Entrevistas'],
                summary: 'Lista entrevistas',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'person_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'transcript', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    '200': okPaginated('Lista de entrevistas', '#/components/schemas/Interview'),
                    '400': error('Parametros de consulta invalidos'),
                    '401': unauthorized(),
                    '500': error('Erro interno do servidor'),
                },
            }),
        },
        '/saldo': {
            get: wrapGuarded({
                tags: ['Renda'],
                summary: 'Lista renda',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'ssn', in: 'query', schema: { type: 'string' } },
                    { name: 'annual_income', in: 'query', schema: { type: 'integer' } },
                ],
                responses: {
                    '200': okPaginated('Lista de renda', '#/components/schemas/Income'),
                    '400': error('Parametros de consulta invalidos'),
                    '401': unauthorized(),
                    '500': error('Erro interno do servidor'),
                },
            }),
        },
        '/academia-membros': {
            get: wrapGuarded({
                tags: ['Academia'],
                summary: 'Lista membros da academia',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'id', in: 'query', schema: { type: 'string' } },
                    { name: 'person_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'name', in: 'query', schema: { type: 'string' } },
                    { name: 'membership_start_date', in: 'query', schema: { type: 'integer' } },
                    { name: 'membership_status', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    '200': okPaginated('Lista de membros', '#/components/schemas/GetFitNowMember'),
                    '400': error('Parametros de consulta invalidos'),
                    '401': unauthorized(),
                    '500': error('Erro interno do servidor'),
                },
            }),
        },
        '/academia-checkin': {
            get: wrapGuarded({
                tags: ['Academia'],
                summary: 'Lista check-ins da academia',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'membership_id', in: 'query', schema: { type: 'string' } },
                    { name: 'check_in_date', in: 'query', schema: { type: 'integer' } },
                    { name: 'check_in_time', in: 'query', schema: { type: 'integer' } },
                    { name: 'check_out_time', in: 'query', schema: { type: 'integer' } },
                ],
                responses: {
                    '200': okPaginated('Lista de check-ins', '#/components/schemas/GetFitNowCheckIn'),
                    '400': error('Parametros de consulta invalidos'),
                    '401': unauthorized(),
                    '500': error('Erro interno do servidor'),
                },
            }),
        },
        '/facebook-checkin': {
            get: wrapGuarded({
                tags: ['Facebook'],
                summary: 'Lista check-ins de eventos do Facebook',
                parameters: [
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                    { $ref: '#/components/parameters/SortBy' },
                    { $ref: '#/components/parameters/SortOrder' },
                    { name: 'person_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'event_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'event_name', in: 'query', schema: { type: 'string' } },
                    { name: 'date', in: 'query', schema: { type: 'integer' } },
                ],
                responses: {
                    '200': okPaginated('Lista de check-ins do Facebook', '#/components/schemas/FacebookEventCheckin'),
                    '400': error('Parametros de consulta invalidos'),
                    '401': unauthorized(),
                    '500': error('Erro interno do servidor'),
                },
            }),
        },
        '/solucao': {
            post: wrapGuarded({
                tags: ['Solucao'],
                summary: 'Valida uma solucao para o crime',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string', description: 'Nome do suspeito submetido como resposta' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': okObject('Resultado da validacao', '#/components/schemas/Validation'),
                    '400': error('Body invalido'),
                    '401': unauthorized(),
                    '500': error('Erro interno do servidor'),
                },
            }),
        },
    },
}
```

### Step 4: Run the tests

Run: `npm test`
Expected: PASS — all tests green, including the new security/login assertions.

### Step 5: Commit

```bash
git add src/docs/openapi.ts src/docs/openapi.test.ts
git commit -m "feat: document login endpoint and Bearer security"
```

---

## Task 6: Final verification

**Files:**
- Modify: none (read-only verification)

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: End-to-end smoke test**

Run (in the background): `PORT=3002 npm run dev`
Then:

```bash
curl -s -o /dev/null -w "no auth: %{http_code}\n" http://localhost:3002/crimes
curl -s -o /dev/null -w "wrong scheme: %{http_code}\n" -H "authorization: Basic abc" http://localhost:3002/crimes
curl -s -X POST -H 'content-type: application/json' -d '{}' -w "missing creds: %{http_code}\n" http://localhost:3002/login
curl -s -X POST -H 'content-type: application/json' -d '{"username":"admin","password":"wrong"}' -w "wrong password: %{http_code}\n" http://localhost:3002/login
TOKEN=$(curl -s -X POST -H 'content-type: application/json' -d '{"username":"admin","password":"admin"}' http://localhost:3002/login | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).token))')
curl -s -o /dev/null -w "with token: %{http_code}\n" -H "authorization: Bearer $TOKEN" http://localhost:3002/crimes
curl -s -o /dev/null -w "docs: %{http_code}\n" http://localhost:3002/docs
```

Expected: 401, 401, 400, 401, 200, 200.

Stop the dev server.

- [ ] **Step 4: No-op (no commit)**

This task does not produce a commit. If a fix is needed, fix it in the relevant prior task's commit via `git commit --amend` or a follow-up commit.

---

## Self-review notes

- **Spec coverage:** every section in `2026-08-03-login-and-auth-middleware-design.md` maps to a task — public/guarded routes (Task 4), `MOCK_USERS` (Task 2), `constantTimeEqual` (Task 2), `login` (Task 2), `authMiddleware` errors (Task 2), `requireUser` (Task 2), `POST /login` route (Task 3), wiring (Task 4), OpenAPI changes (Task 5), testing strategy (Task 2 and Task 5).
- **Type consistency:** `User`, `JwtPayload`, `LoginResult`, `MOCK_USERS`, `constantTimeEqual`, `login`, `authMiddleware`, `requireUser` are exported once from `src/lib/auth.ts` and consumed unchanged in Tasks 3, 4, and 5. The `PathKey` union in the test file lists every path that the spec section enumerates.
- **No placeholders:** every step has explicit code, file paths, and run commands. The only "TBD"-shaped item is the `npx tsc --noEmit` run on the unchanged tree in Task 6, which is verification, not a placeholder.
