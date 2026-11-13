import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import passport from 'passport'

import authRoutes          from './routes/auth.js'
import comprasRoutes       from './routes/compras.js'
import cuotasRoutes        from './routes/cuotas.js'
import suscripcionesRoutes from './routes/suscripciones.js'
import reservasRoutes      from './routes/reservas.js'
import configRoutes        from './routes/configuracion.js'
import cartolasRoutes      from './routes/cartolas.js'

// La app se arma aquí y se levanta en index.ts: así los tests pueden montarla
// con Supertest sin abrir un puerto.
export const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(passport.initialize())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/auth',          authRoutes)
app.use('/compras',       comprasRoutes)
app.use('/cuotas',        cuotasRoutes)
app.use('/suscripciones', suscripcionesRoutes)
app.use('/reservas',      reservasRoutes)
app.use('/configuracion', configRoutes)
app.use('/cartolas',      cartolasRoutes)
