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

router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM compras WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  if (result.rowCount === 0) { res.status(404).json({ error: 'No encontrado' }); return }
  res.json({ ok: true })
})

export default router
