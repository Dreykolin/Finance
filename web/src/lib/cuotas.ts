import type { CompraCuotas } from '../types'

/**
 * Calendario de cuotas a partir de una sola fecha declarada.
 *
 * Solo se guarda cuándo cae el primer cobro; las demás se derivan sumando meses.
 * Eso cubre los dos mecanismos sin modelarlos por separado: una cuota que llega
 * en la factura de la tarjeta y una que se debita en fecha propia (MercadoLibre)
 * se diferencian únicamente en qué día declaraste como primer cobro.
 *
 * Todo se opera como texto 'YYYY-MM-DD': las comparaciones lexicográficas entre
 * fechas ISO son correctas y evitan los corrimientos de día por zona horaria.
 */

/** Normaliza a 'YYYY-MM-DD' lo que llegue: ISO con hora, Date serializado o ya plano. */
export function aISO(valor: string | null | undefined): string {
  if (!valor) return ''
  return String(valor).slice(0, 10)
}

export function hoyISO(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/**
 * Suma meses respetando el fin de mes: si el día no existe en el mes destino se
 * recorta al último (31 de enero + 1 mes = 28/29 de febrero, no 3 de marzo).
 */
export function sumarMeses(iso: string, meses: number): string {
  const [y, m, d] = aISO(iso).split('-').map(Number)
  if (!y || !m || !d) return ''
  const total = m - 1 + meses
  const anio = y + Math.floor(total / 12)
  const mes = ((total % 12) + 12) % 12
  const ultimoDia = new Date(anio, mes + 1, 0).getDate()
  const dia = Math.min(d, ultimoDia)
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Fecha del cobro n (1 = primera cuota). */
export function fechaDeCuota(c: CompraCuotas, n: number): string {
  return sumarMeses(c.fechaPrimerCobro, n - 1)
}

/** La siguiente cuota por pagar, o null si el producto ya está saldado. */
export function proximoCobro(c: CompraCuotas): { numero: number; fecha: string } | null {
  if (c.cuotasPagadas >= c.cuotasTotales) return null
  const numero = c.cuotasPagadas + 1
  const fecha = fechaDeCuota(c, numero)
  return fecha ? { numero, fecha } : null
}

/** Cuántas cuotas ya vencieron a la fecha: las que el banco ya debió cobrar. */
export function cuotasVencidas(c: CompraCuotas, hoy = hoyISO()): number {
  if (!c.fechaPrimerCobro) return 0
  let n = 0
  while (n < c.cuotasTotales && fechaDeCuota(c, n + 1) <= hoy) n++
  return n
}

/**
 * Cuotas vencidas que siguen sin marcarse como pagadas. Es una señal, no una
 * certeza: puede ser un pago real sin registrar, o un cobro que no ocurrió.
 */
export function cuotasAtrasadas(c: CompraCuotas, hoy = hoyISO()): number {
  return Math.max(0, cuotasVencidas(c, hoy) - c.cuotasPagadas)
}
