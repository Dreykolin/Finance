import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM compras WHERE id_usuario = $1 ORDER BY fecha DESC',
    [req.user!.id]
  )
  res.json(result.rows)
})

router.post('/', async (req, res) => {
  const { detalles, monto, metodo_pago, fecha } = req.body
  if (!detalles || !monto || !fecha) { res.status(400).json({ error: 'Faltan campos' }); return }

  const result = await pool.query(
    'INSERT INTO compras (id_usuario, detalles, monto, metodo_pago, fecha) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.user!.id, detalles, monto, metodo_pago ?? null, fecha]
  )
  res.json(result.rows[0])
})

/**
 * Borrar un gasto auto-generado equivale a decir que ese pago no ocurrió, así
 * que hay que deshacerlo también en su origen: de lo contrario la cuota seguiría
 * contando el pago y el carril de la suscripción mostraría un cobro sin gasto
 * detrás. Es la misma reversión que ofrecen los otros dos módulos, alcanzada
 * desde el historial.
 */
router.delete('/:id', async (req, res) => {
  const client = await pool.connect()
  try {
    const { rows } = await client.query(
      'SELECT * FROM compras WHERE id = $1 AND id_usuario = $2',
      [req.params.id, req.user!.id]
    )
    const compra = rows[0]
    if (!compra) { res.status(404).json({ error: 'No encontrado' }); return }

    await client.query('BEGIN')

    if (compra.id_cuota) {
      await client.query(
        `UPDATE cuotas SET cuotas_pagadas = GREATEST(cuotas_pagadas - 1, 0)
         WHERE id = $1 AND id_usuario = $2`,
        [compra.id_cuota, req.user!.id]
      )
    }

    if (compra.id_suscripcion) {
      await client.query(
        `UPDATE cargos_suscripciones SET estado = 'omitido', confirmado = TRUE, id_compra = NULL
         WHERE id_compra = $1`,
        [compra.id]
      )
    }

    await client.query('DELETE FROM compras WHERE id = $1', [compra.id])
    await client.query('COMMIT')
    res.json({ ok: true, revirtio: Boolean(compra.id_cuota || compra.id_suscripcion) })
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('DELETE /compras/:id', e)
    res.status(500).json({ error: 'No se pudo eliminar' })
  } finally {
    client.release()
  }
})

export default router
