import { ErrorSso } from './errores.js'

export interface PerfilSso {
  /** URL del IdP que firmó el token (claim iss). */
  emisor: string
  /** Identificador estable del usuario dentro de ese IdP (claim sub). */
  sub: string
  correo: string
  nombre: string
}

/**
 * Traduce los claims de un ID token ya verificado a nuestro perfil.
 *
 * La identidad es el par (emisor, sub): el correo puede cambiar y dos IdPs
 * pueden declarar el mismo. Por eso el correo se usa para mostrar y para
 * detectar choques, nunca para decidir de quién es una cuenta.
 */
export function perfilDesdeClaims(claims: Record<string, unknown>): PerfilSso {
  const emisor = texto(claims.iss)
  const sub = texto(claims.sub)
  if (!emisor || !sub) throw new ErrorSso('El ID token no trae emisor (iss) o sujeto (sub)')

  const correo = texto(claims.email)?.toLowerCase()
  if (!correo) throw new ErrorSso('El proveedor de identidad no entregó un correo')

  // Algunos IdPs (p. ej. Entra ID) no envían email_verified; solo se rechaza
  // cuando el propio IdP dice que el correo no está verificado.
  if (claims.email_verified === false) {
    throw new ErrorSso('El proveedor de identidad indica que el correo no está verificado')
  }

  const nombre = texto(claims.name) ?? texto(claims.preferred_username) ?? correo.split('@')[0]
  return { emisor, sub, correo, nombre }
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : undefined
}
