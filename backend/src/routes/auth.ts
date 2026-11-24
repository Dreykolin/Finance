import { Router } from 'express'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { generateToken, requireAuth } from '../middleware/auth.js'
import { buscarOCrearUsuario, ErrorCuentaExistente, GOOGLE_ISSUER } from '../identidades/repositorio.js'
import { emitirCodigo, canjearCodigo } from '../identidades/codigos.js'

const router = Router()

// Google es un proveedor de identidad más: pasa por el mismo modelo
// (emisor, sub) que el login empresarial.
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL!,
}, async (_access, _refresh, profile, done) => {
  try {
    const user = await buscarOCrearUsuario({
      emisor: GOOGLE_ISSUER,
      sub:    profile.id,
      correo: (profile.emails?.[0].value ?? '').trim().toLowerCase(),
      nombre: profile.displayName,
    })
    done(null, user)
  } catch (e) {
    if (e instanceof ErrorCuentaExistente) return done(null, false)
    done(e as Error)
  }
}))

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }))

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=1`,
  }),
  async (req, res) => {
    // El JWT no va en la URL (queda en el historial y en logs): va un código de
    // un solo uso que el frontend canjea en POST /auth/canjear.
    try {
      const codigo = await emitirCodigo(req.user!.id)
      res.redirect(`${process.env.FRONTEND_URL}/?codigo=${encodeURIComponent(codigo)}`)
    } catch (e) {
      console.error('No se pudo emitir el código de login:', e)
      res.redirect(`${process.env.FRONTEND_URL}/login?error=1`)
    }
  }
)

router.post('/canjear', async (req, res) => {
  const { codigo } = req.body ?? {}
  if (typeof codigo !== 'string' || !codigo) { res.status(400).json({ error: 'Falta el código' }); return }

  try {
    const usuario = await canjearCodigo(codigo)
    if (!usuario) { res.status(401).json({ error: 'Código inválido, vencido o ya usado' }); return }
    res.json({ token: generateToken({ id: usuario.id, nombre: usuario.nombre, correo: usuario.correo }) })
  } catch (e) {
    console.error('Error canjeando código de login:', e)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.get('/me', requireAuth, (req, res) => { res.json(req.user) })

router.post('/logout', (_req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' })
  res.json({ ok: true })
})

export default router
