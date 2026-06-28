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
  const { nombre_producto, tienda, cuotas_totales, monto_cuota, fecha } = req.body
  if (!nombre_producto || !tienda || !cuotas_totales || !monto_cuota || !fecha) {
    res.status(400).json({ error: 'Faltan campos' }); return
  }
  const result = await pool.query(
    'INSERT INTO cuotas (id_usuario, nombre_producto, tienda, cuotas_totales, cuotas_pagadas, monto_cuota, fecha) VALUES ($1,$2,$3,$4,0,$5,$6) RETURNING *',
    [req.user!.id, nombre_producto, tienda, cuotas_totales, monto_cuota, fecha]
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
      "INSERT INTO compras (id_usuario, detalles, monto, fecha, origen) VALUES ($1,$2,$3,$4,'cuota')",
      [req.user!.id, detalles, cuota.monto_cuota, fecha]
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

router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM cuotas WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  if (result.rowCount === 0) { res.status(404).json({ error: 'No encontrado' }); return }
  res.json({ ok: true })
})

export default router
