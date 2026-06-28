import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Devuelve reservas con monto_actual calculado desde depósitos
router.get('/', async (req, res) => {
  const result = await pool.query(`
    SELECT
      r.*,
      COALESCE(SUM(CASE WHEN d.es_retiro = FALSE THEN d.monto ELSE -d.monto END), 0) AS monto_actual
    FROM reservas r
    LEFT JOIN depositos_reservas d ON d.id_reserva = r.id
    WHERE r.id_usuario = $1
    GROUP BY r.id
    ORDER BY r.es_general DESC, r.id ASC
  `, [req.user!.id])
  res.json(result.rows)
})

router.post('/', async (req, res) => {
  const { nombre, monto_meta } = req.body
  if (!nombre) { res.status(400).json({ error: 'Falta el nombre' }); return }

  const result = await pool.query(
    'INSERT INTO reservas (id_usuario, nombre, monto_meta) VALUES ($1, $2, $3) RETURNING *',
    [req.user!.id, nombre, monto_meta ?? null]
  )
  res.json(result.rows[0])
})

router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM reservas WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  const reserva = rows[0]
  if (!reserva) { res.status(404).json({ error: 'No encontrado' }); return }
  if (reserva.es_general) { res.status(400).json({ error: 'No puedes eliminar la reserva General' }); return }

  await pool.query('DELETE FROM reservas WHERE id = $1', [req.params.id])
  res.json({ ok: true })
})

// ── Depósitos ──────────────────────────────────────────────────

router.get('/:id/depositos', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id FROM reservas WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  if (!rows[0]) { res.status(404).json({ error: 'No encontrado' }); return }

  const result = await pool.query(
    'SELECT * FROM depositos_reservas WHERE id_reserva = $1 ORDER BY fecha DESC',
    [req.params.id]
  )
  res.json(result.rows)
})

router.post('/:id/depositos', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id FROM reservas WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  if (!rows[0]) { res.status(404).json({ error: 'No encontrado' }); return }

  const { detalles, monto, es_retiro, fecha } = req.body
  if (!monto || !fecha) { res.status(400).json({ error: 'Faltan campos' }); return }

  const result = await pool.query(
    'INSERT INTO depositos_reservas (id_reserva, detalles, monto, es_retiro, fecha) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.params.id, detalles ?? null, monto, es_retiro ?? false, fecha]
  )
  res.json(result.rows[0])
})

router.delete('/depositos/:id', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.id FROM depositos_reservas d
    JOIN reservas r ON r.id = d.id_reserva
    WHERE d.id = $1 AND r.id_usuario = $2
  `, [req.params.id, req.user!.id])

  if (!rows[0]) { res.status(404).json({ error: 'No encontrado' }); return }

  await pool.query('DELETE FROM depositos_reservas WHERE id = $1', [req.params.id])
  res.json({ ok: true })
})

export default router
