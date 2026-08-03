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
            login(undefined, 'admin'),
            /username.*password.*obrigat/i,
        )
    })

    it('throws on missing password', async () => {
        await assert.rejects(
            login('admin', undefined),
            /username.*password.*obrigat/i,
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
        let statusCode = 200
        let body: unknown
        const res = {
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
        }
        return res
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
