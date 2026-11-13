import { describe, test, expect } from 'vitest'
import { perfilDesdeClaims } from '../../src/sso/perfil.js'
import { ErrorSso } from '../../src/sso/errores.js'

const claims = {
  iss: 'http://localhost:8080/realms/empresa-demo',
  sub: '7f3c-uuid',
  email: 'ana@empresa-demo.cl',
  email_verified: true,
  name: 'Ana Demo',
  preferred_username: 'ana',
}

describe('perfilDesdeClaims', () => {
  test('arma el perfil desde un ID token completo', () => {
    expect(perfilDesdeClaims(claims)).toEqual({
      emisor: 'http://localhost:8080/realms/empresa-demo',
      sub: '7f3c-uuid',
      correo: 'ana@empresa-demo.cl',
      nombre: 'Ana Demo',
    })
  })

  test('el nombre cae en preferred_username y luego en el correo', () => {
    const { name: _, ...sinName } = claims
    expect(perfilDesdeClaims(sinName).nombre).toBe('ana')
    const { preferred_username: __, ...sinNada } = sinName
    expect(perfilDesdeClaims(sinNada).nombre).toBe('ana')
  })

  test('normaliza el correo a minúsculas', () => {
    expect(perfilDesdeClaims({ ...claims, email: ' Ana@Empresa-Demo.CL ' }).correo)
      .toBe('ana@empresa-demo.cl')
  })

  test('exige correo', () => {
    const { email: _, ...sinCorreo } = claims
    expect(() => perfilDesdeClaims(sinCorreo)).toThrow(ErrorSso)
  })

  test('rechaza un correo que el IdP declara no verificado', () => {
    expect(() => perfilDesdeClaims({ ...claims, email_verified: false })).toThrow(/verificado/)
  })

  test('exige emisor y sujeto: son la identidad', () => {
    expect(() => perfilDesdeClaims({ ...claims, sub: '' })).toThrow(ErrorSso)
    expect(() => perfilDesdeClaims({ ...claims, iss: undefined })).toThrow(ErrorSso)
  })
})
