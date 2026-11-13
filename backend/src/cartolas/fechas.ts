import { ErrorCartola } from './errores.js'

const pad = (n: number) => String(n).padStart(2, '0')

function esFechaValida(anio: number, mes: number, dia: number): boolean {
  const d = new Date(Date.UTC(anio, mes - 1, dia))
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
}

/** " 30/10/2026" -> "2026-10-30". El banco antepone un espacio. */
export function parsearFechaEmision(texto: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto).trim())
  if (!m) throw new ErrorCartola(`Fecha de emisión con formato inesperado: "${texto}"`)
  const [dia, mes, anio] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (!esFechaValida(anio, mes, dia)) throw new ErrorCartola(`Fecha de emisión imposible: "${texto}"`)
  return `${anio}-${pad(mes)}-${pad(dia)}`
}

/**
 * El Banco de Chile entrega la fecha de cada movimiento como "dd/mm", sin año.
 * Como solo permite consultar los últimos 12 meses, el año queda determinado
 * por la fecha de emisión: si el día/mes es posterior al de emisión, el
 * movimiento es del año anterior (una cartola emitida el 05/01 que trae un
 * movimiento del 28/12).
 *
 * Las fechas se manejan como texto ISO para no depender de zonas horarias.
 */
export function inferirFecha(ddmm: string, fechaEmision: string): string {
  const m = /^(\d{2})\/(\d{2})$/.exec(String(ddmm).trim())
  if (!m) throw new ErrorCartola(`Fecha de movimiento con formato inesperado: "${ddmm}"`)
  const [dia, mes] = [Number(m[1]), Number(m[2])]

  const anioEmision = Number(fechaEmision.slice(0, 4))
  const mmddEmision = fechaEmision.slice(5)
  const mmdd = `${pad(mes)}-${pad(dia)}`
  const anio = mmdd > mmddEmision ? anioEmision - 1 : anioEmision

  if (!esFechaValida(anio, mes, dia)) throw new ErrorCartola(`Fecha de movimiento imposible: "${ddmm}"`)
  return `${anio}-${mmdd}`
}
