import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM cuotas WHERE id_usuario = $1 ORDER BY fecha DESC',
    [req.user!.id]
  )
  res.json(result.rows)
})

router.post('/', async (req, res) => {
  const { nombre_producto, tienda, cuotas_totales, monto_cuota, fecha, metodo_pago } = req.body
  if (!nombre_producto || !tienda || !cuotas_totales || !monto_cuota || !fecha) {
    res.status(400).json({ error: 'Faltan campos' }); return
  }
  const result = await pool.query(
    'INSERT INTO cuotas (id_usuario, nombre_producto, tienda, cuotas_totales, cuotas_pagadas, monto_cuota, fecha, metodo_pago) VALUES ($1,$2,$3,$4,0,$5,$6,$7) RETURNING *',
    [req.user!.id, nombre_producto, tienda, cuotas_totales, monto_cuota, fecha, metodo_pago ?? null]
  )
  res.json(result.rows[0])
})

// Marcar cuota → genera compra automáticamente
router.post('/:id/marcar', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM cuotas WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  const cuota = rows[0]
  if (!cuota) { res.status(404).json({ error: 'No encontrado' }); return }
  if (cuota.cuotas_pagadas >= cuota.cuotas_totales) {
    res.status(400).json({ error: 'Cuotas ya completadas' }); return
  }

  const nuevasPagadas = cuota.cuotas_pagadas + 1
  const fecha    = new Date().toISOString().slice(0, 10)
  const detalles = `${cuota.nombre_producto} (${nuevasPagadas}/${cuota.cuotas_totales})`

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('UPDATE cuotas SET cuotas_pagadas = $1 WHERE id = $2', [nuevasPagadas, cuota.id])
    await client.query(
      "INSERT INTO compras (id_usuario, detalles, monto, metodo_pago, fecha, origen, id_cuota) VALUES ($1,$2,$3,$4,$5,'cuota',$6)",
      [req.user!.id, detalles, cuota.monto_cuota, cuota.metodo_pago ?? null, fecha, cuota.id]
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK'); throw e
  } finally {
    client.release()
  }

  const updated = await pool.query('SELECT * FROM cuotas WHERE id = $1', [cuota.id])
  res.json(updated.rows[0])
})

// Editar un registro completo, incluidas las cuotas ya pagadas.
// Bajar cuotas_pagadas revierte los pagos: borra las compras auto-generadas
// correspondientes, porque esos pagos nunca ocurrieron (fueron un error de registro).
router.patch('/:id', async (req, res) => {
  const client = await pool.connect()
  try {
    const { rows } = await client.query(
      'SELECT * FROM cuotas WHERE id = $1 AND id_usuario = $2',
      [req.params.id, req.user!.id]
    )
    const cuota = rows[0]
    if (!cuota) { res.status(404).json({ error: 'No encontrado' }); return }

    const nombre_producto = req.body.nombre_producto ?? cuota.nombre_producto
    const tienda          = req.body.tienda          ?? cuota.tienda
    const cuotas_totales  = Number(req.body.cuotas_totales  ?? cuota.cuotas_totales)
    const monto_cuota     = Number(req.body.monto_cuota     ?? cuota.monto_cuota)
    const cuotas_pagadas  = Number(req.body.cuotas_pagadas  ?? cuota.cuotas_pagadas)
    const metodo_pago     = req.body.metodo_pago !== undefined ? req.body.metodo_pago : cuota.metodo_pago

    if (!nombre_producto || !tienda) {
      res.status(400).json({ error: 'Producto y tienda son obligatorios' }); return
    }
    if (!Number.isInteger(cuotas_totales) || cuotas_totales < 1) {
      res.status(400).json({ error: 'El total de cuotas debe ser al menos 1' }); return
    }
    if (!Number.isInteger(monto_cuota) || monto_cuota < 0) {
      res.status(400).json({ error: 'Monto de cuota inválido' }); return
    }
    if (!Number.isInteger(cuotas_pagadas) || cuotas_pagadas < 0) {
      res.status(400).json({ error: 'Cuotas pagadas inválidas' }); return
    }
    if (cuotas_pagadas > cuotas_totales) {
      res.status(400).json({ error: 'Las cuotas pagadas no pueden superar el total' }); return
    }

    const revertidas = cuota.cuotas_pagadas - cuotas_pagadas

    await client.query('BEGIN')
    await client.query(
      `UPDATE cuotas SET nombre_producto = $1, tienda = $2, cuotas_totales = $3,
              monto_cuota = $4, cuotas_pagadas = $5, metodo_pago = $6
       WHERE id = $7`,
      [nombre_producto, tienda, cuotas_totales, monto_cuota, cuotas_pagadas, metodo_pago ?? null, cuota.id]
    )
    if (revertidas > 0) {
      await client.query(
        `DELETE FROM compras WHERE id IN (
           SELECT id FROM compras
           WHERE id_cuota = $1 AND id_usuario = $2 AND origen = 'cuota'
           ORDER BY fecha DESC, id DESC
           LIMIT $3
         )`,
        [cuota.id, req.user!.id, revertidas]
      )
    }
    await client.query('COMMIT')

    const updated = await client.query('SELECT * FROM cuotas WHERE id = $1', [cuota.id])
    res.json(updated.rows[0])
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('PATCH /cuotas/:id', e)
    res.status(500).json({ error: 'No se pudo actualizar' })
  } finally {
    client.release()
  }
})

router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM cuotas WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  if (result.rowCount === 0) { res.status(404).json({ error: 'No encontrado' }); return }
  res.json({ ok: true })
})

export default router
