import { Router } from 'express'
import { validateSolution } from '../lib/solution'

const solutionRoutes = Router()

solutionRoutes.post('/', async (req, res) => {
    const name = req.body?.name

    if (typeof name !== 'string') {
        return res.status(400).json({ error: 'Campo "name" deve ser uma string' })
    }

    try {
        const result = await validateSolution(name)
        return res.json(result)
    } catch {
        return res.status(500).json({ error: 'Erro interno do servidor' })
    }
})

export default solutionRoutes
