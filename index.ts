import express, { json } from 'express'
import cors from 'cors'
import crimesRoutes from './src/routes/crimes'

const app = express()

app.use(json())
app.use(cors())

app.use('/crimes', crimesRoutes)

app.listen(3000, () => {
    console.log('server running on http://localhost:3000')
})
