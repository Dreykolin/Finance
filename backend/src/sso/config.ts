export interface ConfigSso {
  issuer: URL
  clientId: string
  clientSecret: string
  callbackUrl: URL
  nombre: string
}

const OBLIGATORIAS = ['SSO_ISSUER', 'SSO_CLIENT_ID', 'SSO_CLIENT_SECRET', 'SSO_CALLBACK_URL'] as const

/**
 * El login empresarial se activa solo si el IdP está configurado: sin variables
 * SSO_* la app se comporta exactamente como antes. Una configuración a medias
 * es un error, no un "apagado" silencioso.
 */
export function leerConfigSso(env: Record<string, string | undefined>): ConfigSso | null {
  const presentes = OBLIGATORIAS.filter(k => env[k]?.trim())
  if (presentes.length === 0) return null

  const faltantes = OBLIGATORIAS.filter(k => !env[k]?.trim())
  if (faltantes.length > 0) {
    throw new Error(`Configuración SSO incompleta, falta: ${faltantes.join(', ')}`)
  }

  return {
    issuer: url(env, 'SSO_ISSUER'),
    clientId: env.SSO_CLIENT_ID!.trim(),
    clientSecret: env.SSO_CLIENT_SECRET!.trim(),
    callbackUrl: url(env, 'SSO_CALLBACK_URL'),
    nombre: env.SSO_NOMBRE?.trim() || 'tu empresa',
  }
}

function url(env: Record<string, string | undefined>, clave: string): URL {
  try {
    return new URL(env[clave]!.trim())
  } catch {
    throw new Error(`${clave} no es una URL válida`)
  }
}
