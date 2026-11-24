import * as oidc from 'openid-client'
import type { ConfigSso } from './config.js'
import { ErrorSso } from './errores.js'

/** Lo que hay que recordar entre la ida al IdP y la vuelta al callback. */
export interface TransaccionSso {
  /** Amarra la respuesta a esta solicitud (anti-CSRF). */
  state: string
  /** Amarra el ID token a esta solicitud (anti-replay). */
  nonce: string
  /** PKCE: solo quien inició el login puede canjear el código. */
  codeVerifier: string
}

let cache: { clave: string; config: Promise<oidc.Configuration> } | null = null

/**
 * Discovery: lee /.well-known/openid-configuration del IdP (endpoints y llaves
 * públicas para verificar firmas). Se hace una vez y se reutiliza; si falla,
 * se reintenta en el próximo login en vez de quedar cacheado el error.
 */
function configuracion(cfg: ConfigSso): Promise<oidc.Configuration> {
  const clave = `${cfg.issuer.href}|${cfg.clientId}`
  if (cache?.clave !== clave) {
    // HTTP sin TLS solo se permite contra un IdP local (Keycloak en Docker).
    const local = cfg.issuer.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(cfg.issuer.hostname)
    const config = oidc.discovery(cfg.issuer, cfg.clientId, cfg.clientSecret, undefined,
      local ? { execute: [oidc.allowInsecureRequests] } : undefined)
    config.catch(() => { if (cache?.config === config) cache = null })
    cache = { clave, config }
  }
  return cache.config
}

export async function urlDeAutorizacion(cfg: ConfigSso): Promise<{ url: URL; tx: TransaccionSso }> {
  const config = await configuracion(cfg)
  const tx: TransaccionSso = {
    state: oidc.randomState(),
    nonce: oidc.randomNonce(),
    codeVerifier: oidc.randomPKCECodeVerifier(),
  }
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: cfg.callbackUrl.href,
    scope: 'openid email profile',
    code_challenge: await oidc.calculatePKCECodeChallenge(tx.codeVerifier),
    code_challenge_method: 'S256',
    state: tx.state,
    nonce: tx.nonce,
  })
  return { url, tx }
}

/**
 * Canjea el código por tokens y devuelve los claims del ID token. openid-client
 * verifica firma (con las llaves del IdP), emisor, audiencia, vencimiento,
 * state, nonce y PKCE; si algo no calza, lanza.
 */
export async function canjearCallback(
  cfg: ConfigSso, urlActual: URL, tx: TransaccionSso,
): Promise<Record<string, unknown>> {
  const config = await configuracion(cfg)
  const tokens = await oidc.authorizationCodeGrant(config, urlActual, {
    pkceCodeVerifier: tx.codeVerifier,
    expectedState: tx.state,
    expectedNonce: tx.nonce,
    idTokenExpected: true,
  })
  const claims = tokens.claims()
  if (!claims) throw new ErrorSso('El proveedor de identidad no devolvió un ID token')
  return claims as Record<string, unknown>
}
