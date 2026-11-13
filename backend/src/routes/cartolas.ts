import express, { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { leerCartola } from '../cartolas/leer.js'
import { validarSaldos } from '../cartolas/validacion.js'
import { conHuellas } from '../cartolas/huellas.js'
import { ErrorCartola } from '../cartolas/errores.js'
import { guardarMovimientos, sugerenciasPara } from '../cartolas/repositorio.js'

const router = Router()
router.use(requireAuth)

/**
 * Importa una cartola del Banco de Chile (.xls) enviada como cuerpo binario.
 *
 * - 400: no viene archivo.
 * - 422: el archivo no es una cartola válida o sus saldos no cuadran. No se
 *   guarda nada y el mensaje dice qué falló.
 * - 200: { nuevos, duplicados, sugerencias }. Reimportar es seguro.
 */
router.post(
  '/',
  express.raw({ type: ['application/vnd.ms-excel', 'application/octet-stream'], limit: '2mb' }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: 'Falta el archivo de la cartola (application/vnd.ms-excel)' })
      return
    }
    try {
      const cartola = leerCartola(req.body)
      validarSaldos(cartola)
      const movimientos = conHuellas(cartola.movimientos)
      const { nuevos, duplicados } = await guardarMovimientos(req.user!.id, movimientos)
      const sugerencias = await sugerenciasPara(req.user!.id, movimientos.map(m => m.huella))
      res.json({ fechaEmision: cartola.fechaEmision, nuevos, duplicados, sugerencias })
    } catch (e) {
      if (e instanceof ErrorCartola) {
        res.status(422).json({ error: e.message })
        return
      }
      console.error('POST /cartolas', e)
      res.status(500).json({ error: 'No se pudo importar la cartola' })
    }
  })

router.get('/movimientos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, to_char(fecha, 'YYYY-MM-DD') AS fecha, descripcion, canal, monto, saldo, id_compra
         FROM movimientos_bancarios
        WHERE id_usuario = $1
        ORDER BY fecha DESC, id DESC`,
      [req.user!.id])
    res.json(rows)
  } catch (e) {
    console.error('GET /cartolas/movimientos', e)
    res.status(500).json({ error: 'No se pudieron obtener los movimientos' })
  }
})

/** Confirma que un movimiento del banco corresponde a un gasto registrado. */
router.post('/movimientos/:id/conciliar', async (req, res) => {
  const idMovimiento = Number(req.params.id)
  const idCompra = Number(req.body?.id_compra)
  if (!Number.isInteger(idMovimiento) || !Number.isInteger(idCompra)) {
    res.status(400).json({ error: 'id de movimiento e id_compra deben ser enteros' })
    return
  }
  try {
    const { rowCount } = await pool.query(
      `UPDATE movimientos_bancarios m SET id_compra = $1
        WHERE m.id = $2 AND m.id_usuario = $3
          AND EXISTS (SELECT 1 FROM compras c WHERE c.id = $1 AND c.id_usuario = $3)`,
      [idCompra, idMovimiento, req.user!.id])
    if (!rowCount) {
      res.status(404).json({ error: 'Movimiento o gasto no encontrado' })
      return
    }
    res.json({ ok: true })
  } catch (e: any) {
    if (e?.code === '23505') { // índice único: el gasto ya está conciliado con otro movimiento
      res.status(409).json({ error: 'Ese gasto ya está conciliado con otro movimiento' })
      return
    }
    console.error('POST /cartolas/movimientos/:id/conciliar', e)
    res.status(500).json({ error: 'No se pudo conciliar' })
  }
})

export default router
