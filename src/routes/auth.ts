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
        if (/username.*password.*obrigat/i.test(message)) {
            return res.status(400).json({ error: message })
        }
        return res.status(500).json({ error: 'Erro interno do servidor' })
    }
})

export default authRoutes
