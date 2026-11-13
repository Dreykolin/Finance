import { pool } from '../db.js'
import { sugerirConciliacion } from './conciliacion.js'
import type { MovimientoConHuella } from './huellas.js'

/**
 * La deduplicación la arbitra la base de datos, no la aplicación:
 * UNIQUE (id_usuario, huella) + ON CONFLICT DO NOTHING. Así, dos
 * importaciones simultáneas de la misma cartola no pueden duplicar nada
 * (la segunda espera a la primera y descarta lo que ya existe).
 *
 * El índice único parcial sobre id_compra impide que un mismo gasto quede
 * conciliado con dos movimientos.
 */
export async function initCartolasDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS movimientos_bancarios (
      id           SERIAL PRIMARY KEY,
      id_usuario   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      huella       TEXT NOT NULL,
      fecha        DATE NOT NULL,
      descripcion  TEXT NOT NULL,
      canal        TEXT,
      monto        INTEGER NOT NULL,
      saldo        INTEGER,
      id_compra    INTEGER REFERENCES compras(id) ON DELETE SET NULL,
      importado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (id_usuario, huella)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS movimientos_bancarios_compra_unica
      ON movimientos_bancarios (id_compra) WHERE id_compra IS NOT NULL;
  `)
}

/** Inserta todo en una sola sentencia (atómica) y cuenta cuántos ya existían. */
export async function guardarMovimientos(idUsuario: number, movimientos: MovimientoConHuella[]) {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO movimientos_bancarios (id_usuario, huella, fecha, descripcion, canal, monto, saldo)
     SELECT $1, * FROM unnest($2::text[], $3::date[], $4::text[], $5::text[], $6::int[], $7::int[])
     ON CONFLICT (id_usuario, huella) DO NOTHING
     RETURNING id`,
    [
      idUsuario,
      movimientos.map(m => m.huella),
      movimientos.map(m => m.fecha),
      movimientos.map(m => m.descripcion),
      movimientos.map(m => m.canal),
      movimientos.map(m => m.monto),
      movimientos.map(m => m.saldo),
    ])
  return { nuevos: rows.length, duplicados: movimientos.length - rows.length }
}

/**
 * Sugerencias para los movimientos de la cartola que aún no están conciliados,
 * contra los gastos del usuario que no estén ya vinculados a otro movimiento.
 * Las fechas se leen como texto para no depender de la zona horaria del servidor.
 */
export async function sugerenciasPara(idUsuario: number, huellas: string[]) {
  const { rows: pendientes } = await pool.query<{ id: number; huella: string; fecha: string; descripcion: string; monto: number }>(
    `SELECT id, huella, to_char(fecha, 'YYYY-MM-DD') AS fecha, descripcion, monto
       FROM movimientos_bancarios
      WHERE id_usuario = $1 AND huella = ANY($2) AND id_compra IS NULL AND monto < 0
      ORDER BY fecha, id`,
    [idUsuario, huellas])
  if (pendientes.length === 0) return []

  const { rows: gastos } = await pool.query<{ id: number; fecha: string; monto: number; detalles: string }>(
    `SELECT c.id, to_char(c.fecha, 'YYYY-MM-DD') AS fecha, c.monto, c.detalles
       FROM compras c
      WHERE c.id_usuario = $1
        AND c.fecha BETWEEN $2::date - 3 AND $3::date + 3
        AND NOT EXISTS (SELECT 1 FROM movimientos_bancarios m WHERE m.id_compra = c.id)`,
    [idUsuario, pendientes[0].fecha, pendientes[pendientes.length - 1].fecha])

  const porHuella = new Map(pendientes.map(p => [p.huella, p]))
  const porId = new Map(gastos.map(g => [g.id, g]))
  return sugerirConciliacion(pendientes, gastos).map(s => {
    const m = porHuella.get(s.huella)!
    return {
      idMovimiento: m.id, fecha: m.fecha, descripcion: m.descripcion, monto: m.monto,
      idCompra: s.idCompra, detallesCompra: porId.get(s.idCompra)!.detalles, diasDiferencia: s.diasDiferencia,
    }
  })
}
