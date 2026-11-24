import { beforeAll, beforeEach, afterAll, describe, test, expect } from 'vitest'
import { pool, initDb } from '../../src/db.js'
import {
  initIdentidadesDb, buscarOCrearUsuario, ErrorCuentaExistente, GOOGLE_ISSUER,
} from '../../src/identidades/repositorio.js'
import { emitirCodigo, canjearCodigo } from '../../src/identidades/codigos.js'

const ana = {
  emisor: 'http://localhost:8080/realms/empresa-demo',
  sub: 'sub-ana',
  correo: 'ana@empresa-demo.cl',
  nombre: 'Ana Demo',
}

const contar = async (tabla: string) =>
  Number((await pool.query(`SELECT count(*) FROM ${tabla}`)).rows[0].count)

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('localhost:5433/finance_test')) {
    throw new Error('Los tests de integración solo corren contra la base de pruebas (npm run db:test:up)')
  }
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  await initDb()
})

beforeEach(async () => {
  await pool.query('DROP TABLE IF EXISTS codigos_login, identidades; DELETE FROM reservas; DELETE FROM usuarios;')
})

afterAll(async () => {
  await pool.end()
})

describe('initIdentidadesDb', () => {
  test('migra los usuarios de Google existentes a identidades', async () => {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, correo, google_id) VALUES ('Dreyko', 'd@gmail.com', 'g-123') RETURNING id`)
    await initIdentidadesDb()

    const usuario = await buscarOCrearUsuario({
      emisor: GOOGLE_ISSUER, sub: 'g-123', correo: 'd@gmail.com', nombre: 'Dreyko',
    })
    expect(usuario.id).toBe(rows[0].id)
    expect(await contar('usuarios')).toBe(1)
  })

  test('es idempotente: correrla dos veces no falla ni duplica', async () => {
    await pool.query(`INSERT INTO usuarios (nombre, correo, google_id) VALUES ('D', 'd@gmail.com', 'g-1')`)
    await initIdentidadesDb()
    await initIdentidadesDb()
    expect(await contar('identidades')).toBe(1)
  })
})

describe('buscarOCrearUsuario', () => {
  beforeEach(() => initIdentidadesDb())

  test('el primer login crea el usuario, su identidad y su reserva General', async () => {
    const usuario = await buscarOCrearUsuario(ana)
    expect(usuario).toMatchObject({ nombre: 'Ana Demo', correo: 'ana@empresa-demo.cl' })

    const { rows } = await pool.query('SELECT nombre, es_general FROM reservas WHERE id_usuario = $1', [usuario.id])
    expect(rows).toEqual([{ nombre: 'General', es_general: true }])
  })

  test('los logins siguientes devuelven el mismo usuario', async () => {
    const primero = await buscarOCrearUsuario(ana)
    const segundo = await buscarOCrearUsuario({ ...ana, nombre: 'Ana D.' })
    expect(segundo.id).toBe(primero.id)
    expect(await contar('usuarios')).toBe(1)
  })

  test('el mismo sub en otro IdP es otra persona', async () => {
    const a = await buscarOCrearUsuario(ana)
    const b = await buscarOCrearUsuario({ ...ana, emisor: 'https://otro-idp.example', correo: 'b@otro.cl' })
    expect(b.id).not.toBe(a.id)
  })

  test('no vincula cuentas por correo: un correo ya usado se rechaza', async () => {
    await buscarOCrearUsuario({ emisor: GOOGLE_ISSUER, sub: 'g-ana', correo: ana.correo, nombre: 'Ana' })

    await expect(buscarOCrearUsuario(ana)).rejects.toBeInstanceOf(ErrorCuentaExistente)
    expect(await contar('usuarios')).toBe(1)
    expect(await contar('identidades')).toBe(1)
  })

  test('dos primeros logins simultáneos crean un solo usuario', async () => {
    const [a, b] = await Promise.all([buscarOCrearUsuario(ana), buscarOCrearUsuario(ana)])
    expect(a.id).toBe(b.id)
    expect(await contar('usuarios')).toBe(1)
    expect(await contar('reservas')).toBe(1)
  })
})

describe('códigos de login de un solo uso', () => {
  let idUsuario: number
  beforeEach(async () => {
    await initIdentidadesDb()
    idUsuario = (await buscarOCrearUsuario(ana)).id
  })

  test('un código se canjea por su usuario', async () => {
    const codigo = await emitirCodigo(idUsuario)
    expect(await canjearCodigo(codigo)).toMatchObject({ id: idUsuario, correo: ana.correo })
  })

  test('el código sirve una sola vez', async () => {
    const codigo = await emitirCodigo(idUsuario)
    await canjearCodigo(codigo)
    expect(await canjearCodigo(codigo)).toBeNull()
  })

  test('dos canjes simultáneos: solo uno gana', async () => {
    const codigo = await emitirCodigo(idUsuario)
    const resultados = await Promise.all([canjearCodigo(codigo), canjearCodigo(codigo)])
    expect(resultados.filter(Boolean)).toHaveLength(1)
  })

  test('un código vencido no sirve', async () => {
    const codigo = await emitirCodigo(idUsuario, -1)
    expect(await canjearCodigo(codigo)).toBeNull()
  })

  test('un código inventado no sirve', async () => {
    expect(await canjearCodigo('no-existe')).toBeNull()
  })

  test('en la base se guarda el hash, no el código', async () => {
    const codigo = await emitirCodigo(idUsuario)
    const { rows } = await pool.query('SELECT * FROM codigos_login')
    expect(JSON.stringify(rows)).not.toContain(codigo)
  })
})
