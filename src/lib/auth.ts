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
    const iatSeconds = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({ username: user.username })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(user.id)
        .setIssuedAt(iatSeconds)
        .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
        .sign(secret)

    const expiresAt = new Date((iatSeconds + TOKEN_TTL_SECONDS) * 1000).toISOString()

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
