import { describe, test, expect } from 'vitest'
import { leerConfigSso } from '../../src/sso/config.js'

const completa = {
  SSO_ISSUER: 'http://localhost:8080/realms/empresa-demo',
  SSO_CLIENT_ID: 'finance',
  SSO_CLIENT_SECRET: 'secreto',
  SSO_CALLBACK_URL: 'http://localhost:3000/auth/sso/callback',
  SSO_NOMBRE: 'Empresa Demo',
}

describe('leerConfigSso', () => {
  test('sin variables SSO el login empresarial queda apagado', () => {
    expect(leerConfigSso({})).toBeNull()
  })

  test('con todas las variables devuelve la configuración', () => {
    expect(leerConfigSso(completa)).toEqual({
      issuer: new URL('http://localhost:8080/realms/empresa-demo'),
      clientId: 'finance',
      clientSecret: 'secreto',
      callbackUrl: new URL('http://localhost:3000/auth/sso/callback'),
      nombre: 'Empresa Demo',
    })
  })

  test('el nombre visible es opcional', () => {
    const { SSO_NOMBRE: _, ...sinNombre } = completa
    expect(leerConfigSso(sinNombre)?.nombre).toBe('tu empresa')
  })

  test('una configuración a medias es un error que nombra lo que falta', () => {
    const { SSO_CLIENT_SECRET: _, ...aMedias } = completa
    expect(() => leerConfigSso(aMedias)).toThrow(/SSO_CLIENT_SECRET/)
  })

  test('rechaza URLs mal escritas', () => {
    expect(() => leerConfigSso({ ...completa, SSO_ISSUER: 'empresa-demo' })).toThrow(/SSO_ISSUER/)
  })
})
