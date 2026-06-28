import { Router } from 'express'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { pool } from '../db.js'
import { generateToken, requireAuth } from '../middleware/auth.js'

const router = Router()

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL!,
}, async (_access, _refresh, profile, done) => {
  try {
    const google_id = profile.id
    const nombre    = profile.displayName
    const correo    = profile.emails?.[0].value ?? ''

    const existing = await pool.query('SELECT * FROM usuarios WHERE google_id = $1', [google_id])

    if (existing.rows.length > 0) return done(null, existing.rows[0])

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, correo, google_id) VALUES ($1, $2, $3) RETURNING *',
      [nombre, correo, google_id]
    )
    const user = result.rows[0]

    // Crear reserva "General" por defecto
    await pool.query(
      'INSERT INTO reservas (id_usuario, nombre, es_general) VALUES ($1, $2, TRUE)',
      [user.id, 'General']
    )

    done(null, user)
  } catch (e) {
    done(e as Error)
  }
}))

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }))

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=1`,
  }),
  (req, res) => {
    const user = req.user as any
    const token = generateToken({ id: user.id, nombre: user.nombre, correo: user.correo })

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // cross-origin: Vercel (frontend) ↔ Coolify (backend)
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    res.redirect(process.env.FRONTEND_URL!)
  }
)

router.get('/me', requireAuth, (req, res) => { res.json(req.user) })

router.post('/logout', (_req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' })
  res.json({ ok: true })
})

export default router
