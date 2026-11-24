import { ErrorCartola } from './errores.js'
import { inferirFecha, parsearFechaEmision } from './fechas.js'

export type Celda = string | number | null | undefined

export interface Movimiento {
  fecha: string          // ISO, con el año ya inferido
  descripcion: string
  canal: string
  monto: number          // negativo = cargo, positivo = abono
  saldo: number | null   // el banco solo lo informa al cierre de cada día
}

export interface Cartola {
  fechaEmision: string
  saldoInicial: number
  saldoFinal: number
  movimientos: Movimiento[]
}

/** Compara textos ignorando mayúsculas, tildes y espacios de los extremos. */
const normalizar = (c: Celda) =>
  String(c ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

const estaVacia = (c: Celda) => normalizar(c) === ''

/** Los montos llegan como número, pero se acepta texto tipo "25.000" o "$25.000". */
function aNumero(c: Celda, fila: number): number | null {
  if (estaVacia(c)) return null
  if (typeof c === 'number') return c
  const limpio = String(c).replace(/[$\s.]/g, '').replace(',', '.')
  const n = Number(limpio)
  if (!Number.isFinite(n)) throw new ErrorCartola(`Fila ${fila}: monto no numérico "${c}"`)
  return n
}

function buscarCelda(filas: Celda[][], predicado: (texto: string) => boolean, hasta = filas.length) {
  for (let r = 0; r < hasta; r++) {
    const c = (filas[r] ?? []).findIndex(celda => predicado(normalizar(celda)))
    if (c !== -1) return { r, c }
  }
  return null
}

/**
 * Interpreta la cartola histórica del Banco de Chile a partir de sus filas.
 *
 * Nada se busca por posición fija: el encabezado, la fecha de emisión y el
 * saldo inicial se ubican por su texto, para que una fila extra del banco no
 * rompa la importación. Ante cualquier dato que no calce se lanza un
 * ErrorCartola con la fila, en vez de importar algo dudoso.
 */
export function interpretarFilas(filas: Celda[][]): Cartola {
  // 1. Encabezado de la tabla de movimientos.
  const r0 = filas.findIndex(f =>
    (f ?? []).some(c => normalizar(c) === 'fecha') && (f ?? []).some(c => normalizar(c).startsWith('cargos')))
  if (r0 === -1) throw new ErrorCartola('No se encontró la tabla de movimientos (fila con "Fecha" y "Cargos")')

  const encabezado = filas[r0].map(normalizar)
  const col = (prefijo: string) => encabezado.findIndex(t => t.startsWith(prefijo))
  const cols = {
    fecha: col('fecha'), descripcion: col('descripcion'), canal: col('canal'),
    cargos: col('cargos'), abonos: col('abonos'), saldo: col('saldo'),
  }
  for (const [nombre, i] of Object.entries(cols)) {
    if (i === -1) throw new ErrorCartola(`Falta la columna "${nombre}" en el encabezado`)
  }

  // 2. Datos de cabecera, siempre por encima de la tabla.
  const emision = buscarCelda(filas, t => t === 'fecha de emision', r0)
  const textoEmision = emision && filas[emision.r].slice(emision.c + 1).find(c => !estaVacia(c))
  if (!textoEmision) throw new ErrorCartola('No se encontró la fecha de emisión')
  const fechaEmision = parsearFechaEmision(String(textoEmision))

  const inicial = buscarCelda(filas, t => t === 'saldo inicial', r0)
  const saldoInicial = inicial && aNumero(filas[inicial.r + 1]?.[inicial.c], inicial.r + 2)
  if (saldoInicial === null || saldoInicial === undefined) throw new ErrorCartola('No se encontró el saldo inicial')

  // 3. Movimientos, entre SALDO INICIAL y SALDO FINAL.
  const movimientos: Movimiento[] = []
  for (let r = r0 + 1; r < filas.length; r++) {
    const f = filas[r] ?? []
    if (f.every(estaVacia)) continue
    const n = r + 1 // número de fila tal como se ve en Excel
    const descripcion = String(f[cols.descripcion] ?? '').trim()
    const tipo = normalizar(descripcion)

    if (tipo === 'saldo inicial') continue
    if (tipo === 'saldo final') {
      const saldoFinal = aNumero(f[cols.saldo], n)
      if (saldoFinal === null) throw new ErrorCartola(`Fila ${n}: SALDO FINAL sin monto`)
      return { fechaEmision, saldoInicial, saldoFinal, movimientos }
    }
    // Una fila sin fecha "dd/mm" ya no es un movimiento: es el pie del
    // documento. Si se llegó aquí sin SALDO FINAL, la cartola está incompleta.
    if (!/^\d{2}\/\d{2}$/.test(String(f[cols.fecha] ?? '').trim())) break

    const cargo = aNumero(f[cols.cargos], n)
    const abono = aNumero(f[cols.abonos], n)
    if (cargo !== null && abono !== null) throw new ErrorCartola(`Fila ${n}: tiene cargo y abono a la vez`)
    if (cargo === null && abono === null) throw new ErrorCartola(`Fila ${n}: movimiento sin monto`)

    movimientos.push({
      fecha: inferirFecha(String(f[cols.fecha] ?? ''), fechaEmision),
      descripcion,
      canal: String(f[cols.canal] ?? '').trim(),
      monto: abono !== null ? abono : -cargo!,
      saldo: aNumero(f[cols.saldo], n),
    })
  }
  throw new ErrorCartola('La cartola no tiene la fila SALDO FINAL: puede estar incompleta')
}
