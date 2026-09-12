import type { Suscripcion, CargoSuscripcion } from '../types'

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const pad = (n: number) => String(n).padStart(2, '0')
export const periodoDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
export const periodoActual = () => periodoDe(new Date())
export const etiquetaMes = (periodo: string) => MESES[Number(periodo.slice(5, 7)) - 1]

/**
 * Ventana del carril alrededor del mes en curso. El escritorio muestra siete
 * meses; en el teléfono no caben con holgura, así que el ancho es un parámetro
 * y no una constante.
 */
export function ventana(offset: number, radio = 3): string[] {
  const hoy = new Date()
  const out: string[] = []
  for (let i = -radio; i <= radio; i++) {
    out.push(periodoDe(new Date(hoy.getFullYear(), hoy.getMonth() + i + offset, 1)))
  }
  return out
}

/**
 * Qué corresponde mostrar en una celda del carril.
 *
 * La aplicación no puede saber si un cobro ocurrió — no hay conexión bancaria.
 * Lo que sí sabe es qué cobros ya vencieron, y los da por hechos hasta que el
 * usuario diga lo contrario: de ahí la distinción entre 'cobrado' y 'porConfirmar'.
 */
export type EstadoCelda = 'cobrado' | 'porConfirmar' | 'omitido' | 'proyectado' | 'noAplica'

export function estadoCelda(
  s: Suscripcion, periodo: string, cargo?: CargoSuscripcion,
): EstadoCelda {
  if (cargo) {
    if (cargo.estado === 'omitido') return 'omitido'
    return cargo.confirmado ? 'cobrado' : 'porConfirmar'
  }
  // Sin cargo: o el servicio aún no existía, o el cobro todavía no ha llegado.
  if (periodo < s.desde.slice(0, 7)) return 'noAplica'
  if (s.ciclo === 'anual' && s.mesCobro && Number(periodo.slice(5, 7)) !== s.mesCobro) return 'noAplica'
  if (!s.activa) return 'noAplica'
  return periodo >= periodoActual() ? 'proyectado' : 'noAplica'
}

export const editable = (e: EstadoCelda) => e !== 'proyectado' && e !== 'noAplica'

/** Descripción de la periodicidad, tal como se muestra bajo el nombre. */
export function resumenCiclo(s: Suscripcion, formatear: (n: number) => string): string {
  const partes = [
    s.ciclo === 'anual'
      ? `${s.diaCobro} ${MESES[(s.mesCobro ?? 1) - 1]} · ${formatear(s.monto)}/año`
      : `día ${s.diaCobro} · ${formatear(s.monto)}/mes`,
  ]
  if (s.metodoPago) partes.push(s.metodoPago)
  if (!s.activa) partes.push('de baja')
  return partes.join(' · ')
}

export const ESTILO_CELDA: Record<EstadoCelda, string> = {
  cobrado:      'bg-accent text-white',
  porConfirmar: 'bg-accent/20 text-accent border-2 border-dashed border-accent/60',
  omitido:      'bg-zinc-800 text-zinc-600',
  proyectado:   'bg-zinc-900 border border-zinc-800 text-zinc-700',
  noAplica:     'bg-transparent border border-zinc-900 text-zinc-800',
}
