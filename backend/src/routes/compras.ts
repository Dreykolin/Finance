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
 * Solo se borran los gastos registrados a mano.
 *
 * Un gasto que nació de una cuota o de una suscripción no se puede quitar desde
 * aquí, porque desde el historial la intención es ambigua: puede significar "ese
 * cobro no ocurrió" —que obliga a deshacerlo también en su origen— o "sí ocurrió,
 * pero no quiero verlo". En su módulo la acción no admite esa duda: deshacer una
 * cuota o marcar un mes como no cobrado dicen exactamente lo que hacen.
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

    if (compra.id_cuota) {
      res.status(409).json({
        error: 'Este gasto lo generó una cuota',
        detalle: 'Para deshacerlo, usa "Deshacer última cuota" en el producto.',
        origen: 'cuota',
        id_origen: compra.id_cuota,
      })
      return
    }

    if (compra.id_suscripcion) {
      res.status(409).json({
        error: 'Este gasto lo generó una suscripción',
        detalle: 'Para deshacerlo, marca ese mes como no cobrado en su carril.',
        origen: 'suscripcion',
        id_origen: compra.id_suscripcion,
      })
      return
    }

    await client.query('DELETE FROM compras WHERE id = $1', [compra.id])
    res.json({ ok: true })
  } catch (e) {
    console.error('DELETE /compras/:id', e)
    res.status(500).json({ error: 'No se pudo eliminar' })
  } finally {
    client.release()
  }
})

export default router
