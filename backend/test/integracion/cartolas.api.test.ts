import { beforeAll, beforeEach, afterAll, describe, test, expect } from 'vitest'
import request from 'supertest'
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import { app } from '../../src/app.js'
import { pool, initDb } from '../../src/db.js'
import { initCartolasDb } from '../../src/cartolas/repositorio.js'
import { generateToken } from '../../src/middleware/auth.js'

const ficticia = readFileSync(new URL('../fixtures/cartola_ficticia.xls', import.meta.url))
const MOVIMIENTOS_EN_FICTICIA = 5

let token: string
let tokenOtro: string

async function crearUsuario(n: number) {
  const { rows } = await pool.query(
    'INSERT INTO usuarios (nombre, correo, google_id) VALUES ($1, $2, $3) RETURNING id, nombre, correo',
    [`Usuario ${n}`, `u${n}@example.com`, `google-${n}`])
  return generateToken(rows[0])
}

const subir = (archivo: Buffer, t = token) =>
  request(app).post('/cartolas')
    .set('Authorization', `Bearer ${t}`)
    .set('Content-Type', 'application/vnd.ms-excel')
    .send(archivo)

const listar = (t = token) =>
  request(app).get('/cartolas/movimientos').set('Authorization', `Bearer ${t}`)

/** Copia de la cartola ficticia con el SALDO FINAL alterado. */
function cartolaQueNoCuadra(): Buffer {
  const libro = XLSX.read(ficticia, { type: 'buffer' })
  const hoja = libro.Sheets[libro.SheetNames[0]]
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: null, blankrows: true })
  const r = filas.findIndex(f => f[2] === 'SALDO FINAL')
  hoja[XLSX.utils.encode_cell({ r, c: 6 })] = { t: 'n', v: 999 }
  return XLSX.write(libro, { type: 'buffer', bookType: 'biff8' })
}

beforeAll(async () => {
  // Salvaguarda: este archivo borra el esquema completo.
  if (!process.env.DATABASE_URL?.includes('localhost:5433/finance_test')) {
    throw new Error('Los tests de integración solo corren contra la base de pruebas (npm run db:test:up)')
  }
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  await initDb()
  await initCartolasDb()
  token = await crearUsuario(1)
  tokenOtro = await crearUsuario(2)
})

beforeEach(async () => {
  await pool.query('DELETE FROM movimientos_bancarios; DELETE FROM compras;')
})

afterAll(async () => {
  await pool.end()
})

describe('POST /cartolas', () => {
  test('importa los movimientos de una cartola', async () => {
    const res = await subir(ficticia)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ nuevos: MOVIMIENTOS_EN_FICTICIA, duplicados: 0 })
    expect((await listar()).body).toHaveLength(MOVIMIENTOS_EN_FICTICIA)
  })

  test('reimportar la misma cartola no duplica nada', async () => {
    await subir(ficticia)
    const res = await subir(ficticia)
    expect(res.body).toMatchObject({ nuevos: 0, duplicados: MOVIMIENTOS_EN_FICTICIA })
    expect((await listar()).body).toHaveLength(MOVIMIENTOS_EN_FICTICIA)
  })

  test('dos importaciones simultáneas de la misma cartola no duplican', async () => {
    const [a, b] = await Promise.all([subir(ficticia), subir(ficticia)])
    expect(a.body.nuevos + b.body.nuevos).toBe(MOVIMIENTOS_EN_FICTICIA)
    expect((await listar()).body).toHaveLength(MOVIMIENTOS_EN_FICTICIA)
  })

  test('la misma cartola de otro usuario se importa por separado', async () => {
    await subir(ficticia)
    const res = await subir(ficticia, tokenOtro)
    expect(res.body.nuevos).toBe(MOVIMIENTOS_EN_FICTICIA)
  })

  test('sugiere conciliación con un gasto ya registrado', async () => {
    const { rows } = await pool.query(
      `INSERT INTO compras (id_usuario, detalles, monto, fecha)
       SELECT id, 'Supermercado', 32990, '2026-12-27' FROM usuarios WHERE google_id = 'google-1' RETURNING id`)
    const res = await subir(ficticia)
    expect(res.body.sugerencias).toEqual([
      expect.objectContaining({ idCompra: rows[0].id, descripcion: 'PAGO:SUPERMERCADO LIDER', diasDiferencia: 1 }),
    ])
  })

  test('rechaza con 422 una cartola cuyos saldos no cuadran, sin guardar nada', async () => {
    const res = await subir(cartolaQueNoCuadra())
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/no cuadran/)
    expect((await listar()).body).toHaveLength(0)
  })

  test('rechaza con 422 un archivo que no es una cartola', async () => {
    const res = await subir(Buffer.from('hola'))
    expect(res.status).toBe(422)
  })

  test('rechaza con 400 una solicitud sin archivo', async () => {
    const res = await request(app).post('/cartolas').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  test('sin token responde 401', async () => {
    const res = await subir(ficticia, 'token-invalido')
    expect(res.status).toBe(401)
  })
})

describe('POST /cartolas/movimientos/:id/conciliar', () => {
  test('vincula un movimiento con un gasto, y un gasto no puede vincularse dos veces', async () => {
    const { rows } = await pool.query(
      `INSERT INTO compras (id_usuario, detalles, monto, fecha)
       SELECT id, 'Transferencia', 10000, '2026-12-28' FROM usuarios WHERE google_id = 'google-1' RETURNING id`)
    const idCompra = rows[0].id
    await subir(ficticia)
    const transferencias = (await listar()).body.filter((m: any) => m.descripcion === 'TRASPASO A:FULANO DE TAL')

    const conciliar = (idMov: number) =>
      request(app).post(`/cartolas/movimientos/${idMov}/conciliar`)
        .set('Authorization', `Bearer ${token}`).send({ id_compra: idCompra })

    expect((await conciliar(transferencias[0].id)).status).toBe(200)
    expect((await conciliar(transferencias[1].id)).status).toBe(409)
  })

  test('no permite conciliar movimientos de otro usuario', async () => {
    await subir(ficticia)
    const [m] = (await listar()).body
    const res = await request(app).post(`/cartolas/movimientos/${m.id}/conciliar`)
      .set('Authorization', `Bearer ${tokenOtro}`).send({ id_compra: 1 })
    expect(res.status).toBe(404)
  })
})
