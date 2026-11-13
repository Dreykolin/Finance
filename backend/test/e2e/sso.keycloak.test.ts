import { beforeAll, afterAll, describe, test, expect } from 'vitest'
import type { Server } from 'node:http'
import { app } from '../../src/app.js'
import { pool, initDb } from '../../src/db.js'
import { initIdentidadesDb } from '../../src/identidades/repositorio.js'

/**
 * Flujo completo contra un IdP real: Keycloak en Docker (npm run sso:up).
 * Nada simulado: discovery, pantalla de login, firma del ID token, PKCE, nonce.
 * El "navegador" es fetch con redirecciones manuales y un frasco de cookies.
 */

const PUERTO = 3999
const API = `http://localhost:${PUERTO}`
const ISSUER = 'http://localhost:8080/realms/empresa-demo'
const FRONTEND = 'http://frontend.test'

let servidor: Server

/** Cookies por origen, como las guardaría un navegador (sin atributos). */
class Frasco {
  private cookies = new Map<string, Map<string, string>>()
  guardar(url: string, res: Response) {
    const origen = new URL(url).origin
    const delOrigen = this.cookies.get(origen) ?? new Map()
    for (const c of res.headers.getSetCookie()) {
      const [par] = c.split(';')
      const i = par.indexOf('=')
      const nombre = par.slice(0, i)
      const valor = par.slice(i + 1)
      if (valor === '' || /expires=Thu, 01 Jan 1970/i.test(c)) delOrigen.delete(nombre)
      else delOrigen.set(nombre, valor)
    }
    this.cookies.set(origen, delOrigen)
  }
  header(url: string) {
    const delOrigen = this.cookies.get(new URL(url).origin) ?? new Map()
    return [...delOrigen].map(([k, v]) => `${k}=${v}`).join('; ')
  }
  async ir(url: string, init: RequestInit = {}) {
    const res = await fetch(url, { ...init, redirect: 'manual', headers: { ...init.headers, cookie: this.header(url) } })
    this.guardar(url, res)
    return res
  }
}

/** Inicia el login en la API y entrega credenciales en la pantalla de Keycloak. */
async function loginEnKeycloak(frasco: Frasco, usuario = 'ana', clave = 'ana-demo') {
  const inicio = await frasco.ir(`${API}/auth/sso/login`)
  expect(inicio.status).toBe(302)
  const urlIdp = inicio.headers.get('location')!
  expect(urlIdp.startsWith(`${ISSUER}/protocol/openid-connect/auth`)).toBe(true)

  const pantalla = await frasco.ir(urlIdp)
  expect(pantalla.status).toBe(200)
  const html = await pantalla.text()
  const accion = html.match(/<form[^>]*id="kc-form-login"[^>]*action="([^"]+)"/)?.[1].replaceAll('&amp;', '&')
  expect(accion).toBeTruthy()

  const envio = await frasco.ir(accion!, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: usuario, password: clave, credentialId: '' }),
  })
  expect(envio.status).toBe(302)
  return envio.headers.get('location')!
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('localhost:5433/finance_test')) {
    throw new Error('Los tests e2e solo corren contra la base de pruebas (npm run db:test:up)')
  }
  const discovery = await fetch(`${ISSUER}/.well-known/openid-configuration`).catch(() => null)
  if (!discovery?.ok) throw new Error('Keycloak no responde: levántalo con npm run sso:up')

  Object.assign(process.env, {
    SSO_ISSUER: ISSUER,
    SSO_CLIENT_ID: 'finance',
    SSO_CLIENT_SECRET: 'finance-dev-secret',
    SSO_CALLBACK_URL: `${API}/auth/sso/callback`,
    SSO_NOMBRE: 'Empresa Demo',
    FRONTEND_URL: FRONTEND,
  })

  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  await initDb()
  await initIdentidadesDb()
  await new Promise<void>(ok => { servidor = app.listen(PUERTO, ok) })
})

afterAll(async () => {
  await new Promise(ok => servidor?.close(ok))
  await pool.end()
})

describe('SSO contra Keycloak', () => {
  test('login completo: IdP → callback → código → JWT → /auth/me', async () => {
    const frasco = new Frasco()
    const callback = await loginEnKeycloak(frasco)
    expect(callback.startsWith(`${API}/auth/sso/callback?`)).toBe(true)

    const vuelta = await frasco.ir(callback)
    expect(vuelta.status).toBe(302)
    const alFrontend = new URL(vuelta.headers.get('location')!)
    expect(alFrontend.origin).toBe(FRONTEND)
    const codigo = alFrontend.searchParams.get('codigo')
    expect(codigo).toBeTruthy()

    const canje = await fetch(`${API}/auth/canjear`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codigo }),
    })
    expect(canje.status).toBe(200)
    const { token } = await canje.json()

    const me = await fetch(`${API}/auth/me`, { headers: { authorization: `Bearer ${token}` } })
    expect(await me.json()).toMatchObject({ nombre: 'Ana Demo', correo: 'ana@empresa-demo.cl' })

    const { rows } = await pool.query('SELECT emisor, sub FROM identidades')
    expect(rows).toHaveLength(1)
    expect(rows[0].emisor).toBe(ISSUER)
    expect(rows[0].sub).toMatch(/^[0-9a-f-]{36}$/) // id interno de Keycloak, no el correo
  })

  test('volver a entrar reutiliza la misma cuenta', async () => {
    const frasco = new Frasco()
    await frasco.ir(await loginEnKeycloak(frasco))
    expect(Number((await pool.query('SELECT count(*) FROM usuarios')).rows[0].count)).toBe(1)
  })

  test('un código del IdP inyectado en el login de otra sesión se rechaza (state)', async () => {
    // La víctima inicia un login; el atacante le hace llegar el callback de SU sesión.
    const victima = new Frasco()
    await victima.ir(`${API}/auth/sso/login`)
    const callbackDelAtacante = await loginEnKeycloak(new Frasco())

    const vuelta = await victima.ir(callbackDelAtacante)
    expect(vuelta.headers.get('location')).toBe(`${FRONTEND}/login?error=sso`)
  })

  test('un callback robado no sirve sin la cookie de quien inició el login (PKCE)', async () => {
    const callback = await loginEnKeycloak(new Frasco())
    const vuelta = await fetch(callback, { redirect: 'manual' })
    expect(vuelta.headers.get('location')).toBe(`${FRONTEND}/login?error=sso`)
  })
})
