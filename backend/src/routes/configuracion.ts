import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

/**
 * Ajustes del usuario.
 *
 * `analisis_desde` marca desde cuándo los datos son representativos. Quien llega
 * a la aplicación con compras en cuotas ya empezadas termina con meses que solo
 * contienen esas cuotas y ninguno de los demás gastos de entonces: no están
 * incompletos, están sesgados a la baja, y arrastran la tendencia y el promedio.
 * Recortar el análisis es preferible a borrar el historial, que sí ocurrió.
 */

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT presupuesto_mensual, TO_CHAR(analisis_desde, 'YYYY-MM-DD') AS analisis_desde
     FROM usuarios WHERE id = $1`,
    [req.user!.id]
  )
  res.json(rows[0] ?? { presupuesto_mensual: 0, analisis_desde: null })
})

router.patch('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.user!.id])
  const actual = rows[0]
  if (!actual) { res.status(404).json({ error: 'No encontrado' }); return }

  let presupuesto = actual.presupuesto_mensual ?? 0
  if (req.body.presupuesto_mensual !== undefined) {
    presupuesto = Number(req.body.presupuesto_mensual) || 0
    if (presupuesto < 0) { res.status(400).json({ error: 'Presupuesto inválido' }); return }
  }

  let desde: string | null = actual.analisis_desde
  if (req.body.analisis_desde !== undefined) {
    const v = req.body.analisis_desde
    // Cadena vacía o null significan "considerar todo el historial".
    desde = v ? String(v).slice(0, 10) : null
    if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      res.status(400).json({ error: 'Fecha inválida' }); return
    }
  }

  const { rows: actualizado } = await pool.query(
    `UPDATE usuarios SET presupuesto_mensual = $1, analisis_desde = $2::date
     WHERE id = $3
     RETURNING presupuesto_mensual, TO_CHAR(analisis_desde, 'YYYY-MM-DD') AS analisis_desde`,
    [presupuesto, desde, req.user!.id]
  )
  res.json(actualizado[0])
})

export default router
