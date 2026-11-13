import { beforeAll, beforeEach, afterAll, describe, test, expect, vi } from 'vitest'
import request from 'supertest'
import { app } from '../../src/app.js'
import { pool, initDb } from '../../src/db.js'
import { initIdentidadesDb, buscarOCrearUsuario, GOOGLE_ISSUER } from '../../src/identidades/repositorio.js'
import * as cliente from '../../src/sso/cliente.js'

// El protocolo OIDC real (firmas, PKCE, nonce) se prueba contra Keycloak en
// test/e2e. Aquí se reemplaza el cliente para probar lo que hace nuestra ruta.
vi.mock('../../src/sso/cliente.js', () => ({
  urlDeAutorizacion: vi.fn(),
  canjearCallback: vi.fn(),
}))

const FRONTEND = 'http://localhost:5173'
const ISSUER = 'http://localhost:8080/realms/empresa-demo'
const ENV_SSO = {
  SSO_ISSUER: ISSUER,
  SSO_CLIENT_ID: 'finance',
  SSO_CLIENT_SECRET: 'secreto',
  SSO_CALLBACK_URL: 'http://localhost:3000/auth/sso/callback',
  SSO_NOMBRE: 'Empresa Demo',
}
const TX = { state: 'state-1', nonce: 'nonce-1', codeVerifier: 'verifier-1' }
const CLAIMS_ANA = { iss: ISSUER, sub: 'sub-ana', email: 'ana@empresa-demo.cl', email_verified: true, name: 'Ana Demo' }

const urlAuth = vi.mocked(cliente.urlDeAutorizacion)
const canjear = vi.mocked(cliente.canjearCallback)

/** Hace /login con un agente que guarda la cookie de transacción. */
async function iniciarLogin() {
  const agente = request.agent(app)
  const res = await agente.get('/auth/sso/login')
  return { agente, res }
}

const destino = (res: request.Response) => new URL(res.headers.location)

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('localhost:5433/finance_test')) {
    throw new Error('Los tests de integración solo corren contra la base de pruebas (npm run db:test:up)')
  }
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  await initDb()
  await initIdentidadesDb()
  process.env.FRONTEND_URL = FRONTEND
})

beforeEach(async () => {
  Object.assign(process.env, ENV_SSO)
  vi.resetAllMocks()
  urlAuth.mockResolvedValue({ url: new URL(`${ISSUER}/protocol/openid-connect/auth?state=state-1`), tx: TX })
  canjear.mockResolvedValue(CLAIMS_ANA)
  await pool.query('DELETE FROM codigos_login; DELETE FROM identidades; DELETE FROM reservas; DELETE FROM usuarios;')
})

afterAll(async () => {
  for (const k of Object.keys(ENV_SSO)) delete process.env[k]
  await pool.end()
})

describe('SSO apagado', () => {
  beforeEach(() => { for (const k of Object.keys(ENV_SSO)) delete process.env[k] })

  test('sin configuración, el frontend no muestra el botón', async () => {
    expect((await request(app).get('/auth/sso/config')).body).toEqual({ habilitado: false })
  })

  test('sin configuración, /login no existe', async () => {
    expect((await request(app).get('/auth/sso/login')).status).toBe(404)
  })
})

describe('GET /auth/sso/config', () => {
  test('con configuración, informa el nombre del IdP', async () => {
    expect((await request(app).get('/auth/sso/config')).body)
      .toEqual({ habilitado: true, nombre: 'Empresa Demo' })
  })
})

describe('GET /auth/sso/login', () => {
  test('redirige al IdP y guarda state, nonce y PKCE en una cookie httpOnly', async () => {
    const { res } = await iniciarLogin()
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe(`${ISSUER}/protocol/openid-connect/auth?state=state-1`)

    const cookie = String(res.headers['set-cookie'])
    expect(cookie).toMatch(/^sso_tx=/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Lax/)
  })
})

describe('GET /auth/sso/callback', () => {
  test('canjea el código del IdP con la transacción guardada y la URL completa', async () => {
    const { agente } = await iniciarLogin()
    await agente.get('/auth/sso/callback?code=abc&state=state-1')

    const [config, urlActual, tx] = canjear.mock.calls[0]
    expect(config.issuer.href).toBe(ISSUER)
    expect(urlActual.href).toBe('http://localhost:3000/auth/sso/callback?code=abc&state=state-1')
    expect(tx).toEqual(TX)
  })

  test('un login exitoso vuelve al frontend con un código canjeable por el JWT', async () => {
    const { agente } = await iniciarLogin()
    const res = await agente.get('/auth/sso/callback?code=abc&state=state-1')

    expect(res.status).toBe(302)
    const url = destino(res)
    expect(url.origin).toBe(FRONTEND)
    expect(url.searchParams.has('token')).toBe(false)

    const canje = await request(app).post('/auth/canjear').send({ codigo: url.searchParams.get('codigo') })
    expect(canje.status).toBe(200)

    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${canje.body.token}`)
    expect(me.body).toMatchObject({ nombre: 'Ana Demo', correo: 'ana@empresa-demo.cl' })
  })

  test('la cookie de transacción se borra: el callback no se puede repetir', async () => {
    const { agente } = await iniciarLogin()
    await agente.get('/auth/sso/callback?code=abc&state=state-1')
    const repetido = await agente.get('/auth/sso/callback?code=abc&state=state-1')
    expect(destino(repetido).searchParams.get('error')).toBe('sso')
    expect(canjear).toHaveBeenCalledTimes(1)
  })

  test('sin la cookie de transacción se rechaza sin hablar con el IdP', async () => {
    const res = await request(app).get('/auth/sso/callback?code=abc&state=state-1')
    expect(destino(res).href).toBe(`${FRONTEND}/login?error=sso`)
    expect(canjear).not.toHaveBeenCalled()
  })

  test('una cookie de transacción adulterada se rechaza', async () => {
    const res = await request(app).get('/auth/sso/callback?code=abc&state=state-1')
      .set('Cookie', 'sso_tx=eyJhbGciOiJub25lIn0.eyJzdGF0ZSI6IngifQ.')
    expect(destino(res).searchParams.get('error')).toBe('sso')
    expect(canjear).not.toHaveBeenCalled()
  })

  test('si el IdP devuelve un error (p. ej. el usuario canceló) vuelve al login', async () => {
    const { agente } = await iniciarLogin()
    const res = await agente.get('/auth/sso/callback?error=access_denied&state=state-1')
    expect(destino(res).searchParams.get('error')).toBe('sso')
    expect(canjear).not.toHaveBeenCalled()
  })

  test('si la validación del token falla (state, firma, nonce) vuelve al login', async () => {
    canjear.mockRejectedValue(new Error('unexpected "state" response parameter value'))
    const { agente } = await iniciarLogin()
    const res = await agente.get('/auth/sso/callback?code=abc&state=otro')
    expect(destino(res).searchParams.get('error')).toBe('sso')
  })

  test('un correo que ya tiene cuenta con Google no se vincula', async () => {
    await buscarOCrearUsuario({ emisor: GOOGLE_ISSUER, sub: 'g-1', correo: 'ana@empresa-demo.cl', nombre: 'Ana' })
    const { agente } = await iniciarLogin()
    const res = await agente.get('/auth/sso/callback?code=abc&state=state-1')
    expect(destino(res).href).toBe(`${FRONTEND}/login?error=cuenta_existente`)
  })
})

describe('POST /auth/canjear', () => {
  test('sin código responde 400', async () => {
    expect((await request(app).post('/auth/canjear').send({})).status).toBe(400)
  })

  test('un código ya usado responde 401', async () => {
    const { agente } = await iniciarLogin()
    const codigo = destino(await agente.get('/auth/sso/callback?code=abc&state=state-1')).searchParams.get('codigo')
    await request(app).post('/auth/canjear').send({ codigo })
    expect((await request(app).post('/auth/canjear').send({ codigo })).status).toBe(401)
  })
})
