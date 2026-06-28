import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import { initDb } from './db.js'

import authRoutes          from './routes/auth.js'
import comprasRoutes       from './routes/compras.js'
import cuotasRoutes        from './routes/cuotas.js'
import suscripcionesRoutes from './routes/suscripciones.js'
import reservasRoutes      from './routes/reservas.js'

const app  = express()
const PORT = process.env.PORT ?? 3000

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(passport.initialize())

app.use('/auth',          authRoutes)
app.use('/compras',       comprasRoutes)
app.use('/cuotas',        cuotasRoutes)
app.use('/suscripciones', suscripcionesRoutes)
app.use('/reservas',      reservasRoutes)

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`))
  })
  .catch(err => {
    console.error('Error conectando a la base de datos:', err.message)
    process.exit(1)
  })
