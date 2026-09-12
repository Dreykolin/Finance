import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ── Utilidades de calendario ────────────────────────────────────────────────
// Todo se maneja como 'YYYY-MM-DD' en vez de Date: las comparaciones lexicográficas
// son exactas y no dependen de la zona horaria del servidor.

const pad = (n: number) => String(n).padStart(2, '0')
const hoyStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const ultimoDia = (y: number, m: number) => new Date(y, m, 0).getDate()

/** Fecha real del cobro: el 31 en un mes de 30 se cobra el 30. */
export function fechaCobro(y: number, m: number, dia: number): string {
  return `${y}-${pad(m)}-${pad(Math.min(dia, ultimoDia(y, m)))}`
}

export interface SubRow {
  id: number
  precio: number
  metodo_pago?: string | null
  ciclo: string
  dia_cobro: number
  mes_cobro: number | null
  desde: string
}

/**
 * Períodos cuyo cobro ya venció y por tanto deberían existir como cargo.
 * No mira la base: solo calendario. El llamador descarta los ya materializados.
 */
export function periodosVencidos(s: SubRow, hasta: string): { periodo: string; fecha: string }[] {
  const out: { periodo: string; fecha: string }[] = []
  const desdeY = Number(s.desde.slice(0, 4))
  const desdeM = Number(s.desde.slice(5, 7))
  const hastaY = Number(hasta.slice(0, 4))

  if (s.ciclo === 'anual') {
    const mes = s.mes_cobro ?? desdeM
    for (let y = desdeY; y <= hastaY; y++) {
      const fecha = fechaCobro(y, mes, s.dia_cobro)
      if (fecha >= s.desde && fecha <= hasta) out.push({ periodo: `${y}-${pad(mes)}`, fecha })
    }
    return out
  }

  let y = desdeY, m = desdeM
  // Tope de seguridad: 10 años de cargos mensuales.
  for (let i = 0; i < 120; i++) {
    const fecha = fechaCobro(y, m, s.dia_cobro)
    if (fecha > hasta) break
    if (fecha >= s.desde) out.push({ periodo: `${y}-${pad(m)}`, fecha })
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}

/**
 * Crea los cargos que ya vencieron y aún no existen, junto con su gasto en el
 * libro mayor. Se ejecuta de forma perezosa al listar: evita depender de un cron
 * y hace que el estado esté al día en cuanto el usuario abre la aplicación.
 *
 * Los cargos nacen como 'cobrado' sin confirmar: los cobros recurrentes ocurren
 * salvo excepción, y el usuario puede desmarcar el que no haya sucedido.
 */
async function materializarCargos(userId: number) {
  const { rows: subs } = await pool.query<SubRow>(
    `SELECT id, precio, ciclo, dia_cobro, mes_cobro, metodo_pago,
            TO_CHAR(desde, 'YYYY-MM-DD') AS desde
     FROM suscripciones WHERE id_usuario = $1 AND activa = TRUE`,
    [userId]
  )
  if (subs.length === 0) return

  const { rows: existentes } = await pool.query(
    `SELECT id_suscripcion, periodo FROM cargos_suscripciones WHERE id_suscripcion = ANY($1)`,
    [subs.map(s => s.id)]
  )
  const yaHay = new Set(existentes.map(r => `${r.id_suscripcion}|${r.periodo}`))

  const hasta = hoyStr()
  const pendientes: { sub: SubRow; periodo: string; fecha: string }[] = []
  for (const sub of subs) {
    for (const p of periodosVencidos(sub, hasta)) {
      if (!yaHay.has(`${sub.id}|${p.periodo}`)) pendientes.push({ sub, ...p })
    }
  }
  if (pendientes.length === 0) return

  const { rows: nombres } = await pool.query(
    'SELECT id, nombre FROM suscripciones WHERE id = ANY($1)',
    [subs.map(s => s.id)]
  )
  const nombreDe = new Map(nombres.map(r => [r.id, r.nombre]))

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const { sub, periodo, fecha } of pendientes) {
      const compra = await client.query(
        `INSERT INTO compras (id_usuario, detalles, monto, metodo_pago, fecha, origen, id_suscripcion)
         VALUES ($1,$2,$3,$4,$5,'suscripcion',$6) RETURNING id`,
        [userId, nombreDe.get(sub.id), sub.precio, sub.metodo_pago ?? null, fecha, sub.id]
      )
      await client.query(
        `INSERT INTO cargos_suscripciones (id_suscripcion, periodo, monto, estado, confirmado, fecha, id_compra)
         VALUES ($1,$2,$3,'cobrado',FALSE,$4,$5)
         ON CONFLICT (id_suscripcion, periodo) DO NOTHING`,
        [sub.id, periodo, sub.precio, fecha, compra.rows[0].id]
      )
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('materializarCargos', e)
  } finally {
    client.release()
  }
}

// ── Rutas ───────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    await materializarCargos(req.user!.id)

    const { rows: subs } = await pool.query(
      `SELECT id, nombre, precio, ciclo, dia_cobro, mes_cobro, activa, metodo_pago,
              TO_CHAR(desde, 'YYYY-MM-DD') AS desde
       FROM suscripciones WHERE id_usuario = $1
       ORDER BY activa DESC, nombre ASC`,
      [req.user!.id]
    )

    const { rows: cargos } = subs.length === 0 ? { rows: [] } : await pool.query(
      `SELECT id, id_suscripcion, periodo, monto, estado, confirmado,
              TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha
       FROM cargos_suscripciones WHERE id_suscripcion = ANY($1)
       ORDER BY periodo ASC`,
      [subs.map(s => s.id)]
    )

    const periodoActual = hoyStr().slice(0, 7)
    res.json(subs.map(s => ({
      ...s,
      cargos: cargos.filter(c => c.id_suscripcion === s.id),
      // Compatibilidad con la vista móvil, que sigue razonando en "pagado este mes".
      pagado: cargos.some(c =>
        c.id_suscripcion === s.id && c.periodo === periodoActual && c.estado === 'cobrado'),
    })))
  } catch (e) {
    console.error('GET /suscripciones', e)
    res.status(500).json({ error: 'No se pudieron cargar las suscripciones' })
  }
})

router.post('/', async (req, res) => {
  const { nombre, precio, ciclo, dia_cobro, mes_cobro, desde, metodo_pago } = req.body
  if (!nombre || !precio) { res.status(400).json({ error: 'Faltan campos' }); return }

  const cicloFinal = ciclo === 'anual' ? 'anual' : 'mensual'
  const dia = Number(dia_cobro) || 1
  if (dia < 1 || dia > 31) { res.status(400).json({ error: 'Día de cobro inválido' }); return }

  let mes: number | null = null
  if (cicloFinal === 'anual') {
    mes = Number(mes_cobro) || 0
    if (mes < 1 || mes > 12) { res.status(400).json({ error: 'Mes de cobro inválido' }); return }
  }

  const result = await pool.query(
    `INSERT INTO suscripciones (id_usuario, nombre, precio, ciclo, dia_cobro, mes_cobro, desde, metodo_pago, pagado)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date, CURRENT_DATE),$8,FALSE) RETURNING *`,
    [req.user!.id, nombre, precio, cicloFinal, dia, mes, desde ?? null, metodo_pago ?? null]
  )
  res.json({ ...result.rows[0], cargos: [] })
})

router.patch('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM suscripciones WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  const sus = rows[0]
  if (!sus) { res.status(404).json({ error: 'No encontrado' }); return }

  const nombre = req.body.nombre ?? sus.nombre
  const precio = Number(req.body.precio ?? sus.precio)
  const ciclo  = req.body.ciclo === 'anual' ? 'anual' : (req.body.ciclo === 'mensual' ? 'mensual' : sus.ciclo)
  const dia    = Number(req.body.dia_cobro ?? sus.dia_cobro)
  const activa = req.body.activa ?? sus.activa
  const metodo = req.body.metodo_pago !== undefined ? req.body.metodo_pago : sus.metodo_pago
  let mes: number | null = req.body.mes_cobro !== undefined ? Number(req.body.mes_cobro) : sus.mes_cobro

  if (!nombre) { res.status(400).json({ error: 'El nombre es obligatorio' }); return }
  if (!Number.isInteger(precio) || precio < 0) { res.status(400).json({ error: 'Precio inválido' }); return }
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) { res.status(400).json({ error: 'Día de cobro inválido' }); return }
  if (ciclo === 'anual') {
    if (!mes || mes < 1 || mes > 12) { res.status(400).json({ error: 'Mes de cobro inválido' }); return }
  } else {
    mes = null
  }

  const updated = await pool.query(
    `UPDATE suscripciones SET nombre=$1, precio=$2, ciclo=$3, dia_cobro=$4, mes_cobro=$5,
            activa=$6, metodo_pago=$7
     WHERE id=$8 RETURNING *`,
    [nombre, precio, ciclo, dia, mes, activa, metodo ?? null, sus.id]
  )
  res.json(updated.rows[0])
})

/**
 * Alterna un cargo entre cobrado y omitido, y lo marca como confirmado por el
 * usuario. Al omitirlo se borra el gasto del libro mayor; al reponerlo se vuelve
 * a crear. El cargo de un período futuro no existe todavía y no es alterable.
 */
router.post('/:id/cargos/:periodo', async (req, res) => {
  const client = await pool.connect()
  try {
    const { rows } = await client.query(
      `SELECT c.*, s.nombre, s.id_usuario, s.metodo_pago
       FROM cargos_suscripciones c
       JOIN suscripciones s ON s.id = c.id_suscripcion
       WHERE c.id_suscripcion = $1 AND c.periodo = $2 AND s.id_usuario = $3`,
      [req.params.id, req.params.periodo, req.user!.id]
    )
    const cargo = rows[0]
    if (!cargo) { res.status(404).json({ error: 'Cargo no encontrado' }); return }

    const nuevoEstado = cargo.estado === 'cobrado' ? 'omitido' : 'cobrado'

    await client.query('BEGIN')
    if (nuevoEstado === 'omitido') {
      if (cargo.id_compra) {
        await client.query('DELETE FROM compras WHERE id = $1 AND id_usuario = $2',
          [cargo.id_compra, req.user!.id])
      }
      await client.query(
        `UPDATE cargos_suscripciones SET estado='omitido', confirmado=TRUE, id_compra=NULL WHERE id=$1`,
        [cargo.id]
      )
    } else {
      const compra = await client.query(
        `INSERT INTO compras (id_usuario, detalles, monto, metodo_pago, fecha, origen, id_suscripcion)
         VALUES ($1,$2,$3,$4,$5,'suscripcion',$6) RETURNING id`,
        [req.user!.id, cargo.nombre, cargo.monto, cargo.metodo_pago ?? null, cargo.fecha, cargo.id_suscripcion]
      )
      await client.query(
        `UPDATE cargos_suscripciones SET estado='cobrado', confirmado=TRUE, id_compra=$1 WHERE id=$2`,
        [compra.rows[0].id, cargo.id]
      )
    }
    await client.query('COMMIT')

    const { rows: fresco } = await client.query(
      `SELECT id, id_suscripcion, periodo, monto, estado, confirmado,
              TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha
       FROM cargos_suscripciones WHERE id = $1`,
      [cargo.id]
    )
    res.json(fresco[0])
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('POST /suscripciones/:id/cargos/:periodo', e)
    res.status(500).json({ error: 'No se pudo actualizar el cargo' })
  } finally {
    client.release()
  }
})

/** Confirma un cargo sin cambiarle el estado: "sí, esto ocurrió tal cual". */
router.post('/:id/cargos/:periodo/confirmar', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE cargos_suscripciones c SET confirmado = TRUE
     FROM suscripciones s
     WHERE c.id_suscripcion = s.id AND s.id_usuario = $1
       AND c.id_suscripcion = $2 AND c.periodo = $3
     RETURNING c.id, c.id_suscripcion, c.periodo, c.monto, c.estado, c.confirmado,
               TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha`,
    [req.user!.id, req.params.id, req.params.periodo]
  )
  if (!rows[0]) { res.status(404).json({ error: 'Cargo no encontrado' }); return }
  res.json(rows[0])
})

/**
 * Compatibilidad con la vista móvil: alterna el cargo del período en curso.
 * Si aún no existe (el cobro no ha vencido), lo crea ya confirmado.
 */
router.post('/:id/toggle', async (req, res) => {
  const periodo = hoyStr().slice(0, 7)
  const { rows } = await pool.query(
    'SELECT * FROM suscripciones WHERE id = $1 AND id_usuario = $2',
    [req.params.id, req.user!.id]
  )
  const sus = rows[0]
  if (!sus) { res.status(404).json({ error: 'No encontrado' }); return }

  const { rows: existe } = await pool.query(
    'SELECT id FROM cargos_suscripciones WHERE id_suscripcion = $1 AND periodo = $2',
    [sus.id, periodo]
  )

  if (existe.length === 0) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const compra = await client.query(
        `INSERT INTO compras (id_usuario, detalles, monto, metodo_pago, fecha, origen, id_suscripcion)
         VALUES ($1,$2,$3,$4,$5,'suscripcion',$6) RETURNING id`,
        [req.user!.id, sus.nombre, sus.precio, sus.metodo_pago ?? null, hoyStr(), sus.id]
      )
      await client.query(
        `INSERT INTO cargos_suscripciones (id_suscripcion, periodo, monto, estado, confirmado, fecha, id_compra)
         VALUES ($1,$2,$3,'cobrado',TRUE,$4,$5)`,
        [sus.id, periodo, sus.precio, hoyStr(), compra.rows[0].id]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('POST /suscripciones/:id/toggle', e)
      res.status(500).json({ error: 'No se pudo registrar el pago' }); return
    } finally {
      client.release()
    }
    res.json({ ...sus, pagado: true }); return
  }

  // Ya existe: alterna su estado.
  const client = await pool.connect()
  try {
    const c = await client.query(
      'SELECT * FROM cargos_suscripciones WHERE id_suscripcion = $1 AND periodo = $2',
      [sus.id, periodo]
    )
    const actual = c.rows[0]
    const pasaACobrado = actual.estado !== 'cobrado'

    await client.query('BEGIN')
    if (pasaACobrado) {
      const compra = await client.query(
        `INSERT INTO compras (id_usuario, detalles, monto, metodo_pago, fecha, origen, id_suscripcion)
         VALUES ($1,$2,$3,$4,$5,'suscripcion',$6) RETURNING id`,
        [req.user!.id, sus.nombre, actual.monto, sus.metodo_pago ?? null, actual.fecha, sus.id]
      )
      await client.query(
        `UPDATE cargos_suscripciones SET estado='cobrado', confirmado=TRUE, id_compra=$1 WHERE id=$2`,
        [compra.rows[0].id, actual.id]
      )
    } else {
      if (actual.id_compra) {
        await client.query('DELETE FROM compras WHERE id = $1 AND id_usuario = $2',
          [actual.id_compra, req.user!.id])
      }
      await client.query(
        `UPDATE cargos_suscripciones SET estado='omitido', confirmado=TRUE, id_compra=NULL WHERE id=$1`,
        [actual.id]
      )
    }
    await client.query('COMMIT')
    res.json({ ...sus, pagado: pasaACobrado })
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('POST /suscripciones/:id/toggle', e)
    res.status(500).json({ error: 'No se pudo actualizar' })
  } finally {
    client.release()
  }
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
