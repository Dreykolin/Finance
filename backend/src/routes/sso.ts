import { Router, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { leerConfigSso } from '../sso/config.js'
import { urlDeAutorizacion, canjearCallback, type TransaccionSso } from '../sso/cliente.js'
import { perfilDesdeClaims } from '../sso/perfil.js'
import { buscarOCrearUsuario, ErrorCuentaExistente } from '../identidades/repositorio.js'
import { emitirCodigo } from '../identidades/codigos.js'

/**
 * "Entrar con tu empresa": login por OpenID Connect contra el IdP configurado
 * en las variables SSO_* (Keycloak en local; Entra ID, Okta, Google Workspace...
 * en producción). Sin esas variables, estas rutas no existen.
 */
const router = Router()

const COOKIE_TX = 'sso_tx'
const AUDIENCIA_TX = 'sso_tx'
const DIEZ_MINUTOS = 10 * 60 * 1000

function volverAlLogin(res: Response, error: 'sso' | 'cuenta_existente') {
  res.redirect(`${process.env.FRONTEND_URL}/login?error=${error}`)
}

router.get('/config', (_req, res) => {
  const cfg = leerConfigSso(process.env)
  res.json(cfg ? { habilitado: true, nombre: cfg.nombre } : { habilitado: false })
})

router.get('/login', async (_req, res) => {
  const cfg = leerConfigSso(process.env)
  if (!cfg) { res.status(404).json({ error: 'Login empresarial no configurado' }); return }

  try {
    const { url, tx } = await urlDeAutorizacion(cfg)
    // La transacción viaja firmada en una cookie del propio backend: no hay que
    // guardar estado en el servidor y nadie puede alterarla. SameSite=Lax deja
    // que el navegador la envíe en la redirección de vuelta desde el IdP.
    res.cookie(COOKIE_TX, jwt.sign(tx, process.env.JWT_SECRET!, { expiresIn: '10m', audience: AUDIENCIA_TX }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: cfg.callbackUrl.protocol === 'https:',
      path: '/auth/sso',
      maxAge: DIEZ_MINUTOS,
    })
    res.redirect(url.href)
  } catch (e) {
    console.error('No se pudo iniciar el login SSO:', e)
    volverAlLogin(res, 'sso')
  }
})

router.get('/callback', async (req, res) => {
  const cfg = leerConfigSso(process.env)
  if (!cfg) { res.status(404).json({ error: 'Login empresarial no configurado' }); return }

  // La transacción se consume siempre, salga bien o mal: un callback no se repite.
  const crudo: string | undefined = req.cookies?.[COOKIE_TX]
  res.clearCookie(COOKIE_TX, { path: '/auth/sso' })

  // El IdP devuelve ?error=... si el usuario canceló o no tiene acceso a la app.
  if (req.query.error || !crudo) { volverAlLogin(res, 'sso'); return }

  let tx: TransaccionSso
  try {
    const { state, nonce, codeVerifier } = jwt.verify(crudo, process.env.JWT_SECRET!, { audience: AUDIENCIA_TX }) as TransaccionSso
    tx = { state, nonce, codeVerifier }
  } catch {
    volverAlLogin(res, 'sso'); return
  }

  try {
    // La URL pública (no req.protocol): detrás del proxy de Render llega como http.
    const urlActual = new URL(req.originalUrl, cfg.callbackUrl)
    const claims = await canjearCallback(cfg, urlActual, tx)
    const usuario = await buscarOCrearUsuario(perfilDesdeClaims(claims))
    const codigo = await emitirCodigo(usuario.id)
    res.redirect(`${process.env.FRONTEND_URL}/?codigo=${encodeURIComponent(codigo)}`)
  } catch (e) {
    if (e instanceof ErrorCuentaExistente) { volverAlLogin(res, 'cuenta_existente'); return }
    console.error('Login SSO fallido:', e)
    volverAlLogin(res, 'sso')
  }
})

export default router
