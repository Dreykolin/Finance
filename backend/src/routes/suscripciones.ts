import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM suscripciones WHERE id_usuario = $1', [req.user!.id])
  res.json(result.rows)
})

router.post('/', async (req, res) => {
  const { nombre, precio, fecha_limite } = req.body
  if (!nombre || !precio) { res.status(400).json({ error: 'Faltan campos' }); return }

  const result = await pool.query(
    'INSERT INTO suscripciones (id_usuario, nombre, precio, fecha_limite, pagado) VALUES ($1,$2,$3,$4,FALSE) RETURNING *',
    [req.user!.id, nombre, precio, fecha_limite ?? null]
  )
  res.json(result.rows[0])
})

// Toggle pagado → si se marca como pagado, genera compra
router.post('/:id/toggle', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM suscripciones WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  const sus = rows[0]
  if (!sus) { res.status(404).json({ error: 'No encontrado' }); return }

  if (!sus.pagado) {
    const fecha = new Date().toISOString().slice(0, 10)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('UPDATE suscripciones SET pagado = TRUE WHERE id = $1', [sus.id])
      await client.query(
        "INSERT INTO compras (id_usuario, detalles, monto, fecha, origen, id_suscripcion) VALUES ($1,$2,$3,$4,'suscripcion',$5)",
        [req.user!.id, sus.nombre, sus.precio, fecha, sus.id]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('POST /suscripciones/:id/toggle', e)
      res.status(500).json({ error: 'No se pudo registrar el pago' }); return
    } finally {
      client.release()
    }
  } else {
    // Destildar es corregir un error de registro: el gasto auto-generado de este
    // mes no debe quedar en el historial.
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('UPDATE suscripciones SET pagado = FALSE WHERE id = $1', [sus.id])
      await client.query(
        `DELETE FROM compras WHERE id IN (
           SELECT id FROM compras
           WHERE id_suscripcion = $1 AND id_usuario = $2 AND origen = 'suscripcion'
           ORDER BY fecha DESC, id DESC
           LIMIT 1
         )`,
        [sus.id, req.user!.id]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('POST /suscripciones/:id/toggle (revertir)', e)
      res.status(500).json({ error: 'No se pudo revertir el pago' }); return
    } finally {
      client.release()
    }
  }

  const updated = await pool.query('SELECT * FROM suscripciones WHERE id = $1', [sus.id])
  res.json(updated.rows[0])
})

// Resetear todos a no pagado (inicio de mes)
router.post('/reset', async (req, res) => {
  await pool.query('UPDATE suscripciones SET pagado = FALSE WHERE id_usuario = $1', [req.user!.id])
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM suscripciones WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  if (result.rowCount === 0) { res.status(404).json({ error: 'No encontrado' }); return }
  res.json({ ok: true })
})

export default router
