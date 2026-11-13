import { createHash } from 'node:crypto'
import type { Movimiento } from './interpretar.js'

export type MovimientoConHuella = Movimiento & { huella: string }

/**
 * El banco no entrega un identificador por movimiento, así que se construye
 * una huella para reconocerlo si la misma cartola (o una que se solapa) se
 * importa otra vez.
 *
 * Fecha + monto + descripción no basta: dos transferencias idénticas el mismo
 * día son dos movimientos reales, y una huella igual fusionaría una de ellas.
 * Por eso se agrega el número de ocurrencia dentro del grupo de movimientos
 * idénticos (0 para el primero, 1 para el segundo...).
 *
 * Supuesto: la cartola incluye días completos, de modo que si dos cartolas se
 * solapan, ambas traen el grupo completo en el mismo orden. El saldo diario
 * queda fuera porque el banco no siempre lo informa.
 */
export function conHuellas(movimientos: Movimiento[]): MovimientoConHuella[] {
  const ocurrencias = new Map<string, number>()
  return movimientos.map(m => {
    const clave = [m.fecha, m.monto, m.descripcion.trim().toUpperCase()].join('|')
    const n = ocurrencias.get(clave) ?? 0
    ocurrencias.set(clave, n + 1)
    const huella = createHash('sha256').update(`${clave}|${n}`).digest('hex')
    return { ...m, huella }
  })
}
