import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ── Calendario de cuotas ────────────────────────────────────────────────────
// Espejo de web/src/lib/cuotas.ts. El gasto de una cuota pertenece al mes en que
// esa cuota se cobra, no al día en que el usuario la registra: ponerse al día con
// un producto antiguo no debe amontonar un año de cargos en el mes en curso.

/** Suma meses respetando el fin de mes (31 de enero + 1 mes = 28/29 de febrero). */
function sumarMeses(iso: string, meses: number): string {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  const total = m - 1 + meses
  const anio = y + Math.floor(total / 12)
  const mes = ((total % 12) + 12) % 12
  const ultimoDia = new Date(anio, mes + 1, 0).getDate()
  const dia = Math.min(d, ultimoDia)
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Fecha del cobro n (1 = primera cuota); recurre a hoy si no hay calendario. */
function fechaDeCuota(cuota: { fecha_primer_cobro?: string | Date | null; fecha?: string | Date }, n: number): string {
  const base = cuota.fecha_primer_cobro ?? cuota.fecha
  const iso = base instanceof Date
    ? `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
    : String(base ?? '').slice(0, 10)
  return sumarMeses(iso, n - 1) || hoyISO()
}

/** Inserta el gasto de la cuota n, fechado donde corresponde. */
async function insertarGastoDeCuota(
  client: { query: (q: string, v: unknown[]) => Promise<unknown> },
  userId: number,
  cuota: { id: number; nombre_producto: string; cuotas_totales: number; monto_cuota: number; metodo_pago?: string | null; fecha_primer_cobro?: string | Date | null; fecha?: string | Date },
  n: number,
) {
  await client.query(
    `INSERT INTO compras (id_usuario, detalles, monto, metodo_pago, fecha, origen, id_cuota)
     VALUES ($1,$2,$3,$4,$5,'cuota',$6)`,
    [
      userId,
      `${cuota.nombre_producto} (${n}/${cuota.cuotas_totales})`,
      cuota.monto_cuota,
      cuota.metodo_pago ?? null,
      fechaDeCuota(cuota, n),
      cuota.id,
    ]
  )
}

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
  // Si no se declara, el primer cobro se asume el día de la compra.
  const fecha_primer_cobro = req.body.fecha_primer_cobro || fecha
  // Un producto que ya venías pagando puede declarar cuántas cuotas lleva; sus
  // gastos se generan en los meses que les corresponden, no en el de hoy.
  const yaPagadas = Math.min(
    Math.max(Number(req.body.cuotas_pagadas) || 0, 0),
    Number(cuotas_totales),
  )

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `INSERT INTO cuotas (id_usuario, nombre_producto, tienda, cuotas_totales, cuotas_pagadas,
                           monto_cuota, fecha, metodo_pago, fecha_primer_cobro)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user!.id, nombre_producto, tienda, cuotas_totales, yaPagadas,
       monto_cuota, fecha, metodo_pago ?? null, fecha_primer_cobro]
    )
    const creada = result.rows[0]
    for (let n = 1; n <= yaPagadas; n++) {
      await insertarGastoDeCuota(client, req.user!.id, creada, n)
    }
    await client.query('COMMIT')
    res.json(creada)
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('POST /cuotas', e)
    res.status(500).json({ error: 'No se pudo registrar la compra' })
  } finally {
    client.release()
  }
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

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('UPDATE cuotas SET cuotas_pagadas = $1 WHERE id = $2', [nuevasPagadas, cuota.id])
    await insertarGastoDeCuota(client, req.user!.id, cuota, nuevasPagadas)
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
    const fecha_primer_cobro = req.body.fecha_primer_cobro ?? cuota.fecha_primer_cobro

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
              monto_cuota = $4, cuotas_pagadas = $5, metodo_pago = $6,
              fecha_primer_cobro = $7
       WHERE id = $8`,
      [nombre_producto, tienda, cuotas_totales, monto_cuota, cuotas_pagadas, metodo_pago ?? null, fecha_primer_cobro, cuota.id]
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
    } else if (revertidas < 0) {
      // Subir el contador de golpe equivale a marcar esas cuotas: se generan sus
      // gastos, cada uno en el mes que le toca. Evita tener que pulsar "marcar"
      // doce veces para un producto que ya venías pagando.
      const datos = { ...cuota, nombre_producto, cuotas_totales, monto_cuota, metodo_pago, fecha_primer_cobro }
      for (let n = cuota.cuotas_pagadas + 1; n <= cuotas_pagadas; n++) {
        await insertarGastoDeCuota(client, req.user!.id, datos, n)
      }
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
