import express, { json } from 'express'
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
app.use('/crimes', authMiddleware)
app.use('/carteiras', authMiddleware)
app.use('/pessoas', authMiddleware)
app.use('/entrevistas', authMiddleware)
app.use('/saldo', authMiddleware)
app.use('/academia-membros', authMiddleware)
app.use('/academia-checkin', authMiddleware)
app.use('/facebook-checkin', authMiddleware)
app.use('/solucao', authMiddleware)

app.use('/crimes', crimesRoutes)
app.use('/carteiras', carteirasRoutes)
app.use('/pessoas', pessoasRoutes)
app.use('/entrevistas', interviewRoutes)
app.use('/saldo', incomeRoutes)
app.use('/academia-membros', getFitNowMembersRoutes)
app.use('/academia-checkin', getFitNowCheckinRoutes)
app.use('/facebook-checkin', facebookEventCheckinRoutes)
app.use('/solucao', solutionRoutes)

// Rotas publicas
app.use('/login', authRoutes)

app.listen(PORT, () => {
    console.log(`server running on http://localhost:${PORT}`)
})
