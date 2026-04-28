import express, { json } from 'express'
import cors from 'cors'
import crimesRoutes from './src/routes/crimes'
import carteirasRoutes from './src/routes/carteiras'

const app = express()

app.use(json())
app.use(cors())

app.use('/crimes', crimesRoutes)
app.use('/carteiras', carteirasRoutes)

app.listen(3000, () => {
    console.log('server running on http://localhost:3000')
})
