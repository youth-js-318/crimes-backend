import express, { json } from 'express'
import cors from 'cors'
import crimesRoutes from './src/routes/crimes'
import carteirasRoutes from './src/routes/carteiras'
import pessoasRoutes from './src/routes/pessoas'
import interviewRoutes from './src/routes/interview'
import incomeRoutes from './src/routes/income'
import getFitNowMembersRoutes from './src/routes/get_fit_now_members'
import getFitNowCheckinRoutes from './src/routes/get_fit_now_checkin'
import facebookEventCheckinRoutes from './src/routes/facebook_event_checkin'

const app = express()

app.use(json())
app.use(cors())

app.use('/crimes', crimesRoutes)
app.use('/carteiras', carteirasRoutes)
app.use('/pessoas', pessoasRoutes)
app.use('/entrevistas', interviewRoutes)
app.use('/saldo', incomeRoutes)
app.use('/academia-membros', getFitNowMembersRoutes)
app.use('/academia-checkin', getFitNowCheckinRoutes)
app.use('/facebook-checkin', facebookEventCheckinRoutes)

app.listen(3000, () => {
    console.log('server running on http://localhost:3000')
})
