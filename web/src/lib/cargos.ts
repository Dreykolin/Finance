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

/**
 * Una celda se puede corregir salvo que no corresponda o pertenezca al futuro.
 *
 * El mes en curso es pulsable aunque figure como proyectado: puede que el cobro
 * ya haya ocurrido y el sistema no lo sepa —un servicio dado de alta después de
 * su fecha de cobro—, y el usuario debe poder decirlo.
 */
export function editable(e: EstadoCelda, periodo?: string): boolean {
  if (e === 'noAplica') return false
  if (e !== 'proyectado') return true
  return periodo !== undefined && periodo <= periodoActual()
}

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
  // Hueco visible: en negro sobre negro la retícula desaparecía y el carril
  // parecía desalineado, como si faltaran celdas en lugar de no corresponder.
  noAplica:     'bg-zinc-950/60 border border-zinc-800/50 text-zinc-800',
}

const ultimoDia = (y: number, m: number) => new Date(y, m, 0).getDate()

/**
 * Fecha del cobro de este periodo, o null si aún no ha llegado.
 *
 * Sirve para la única pregunta que la aplicación no puede responder sola al dar
 * de alta un servicio: si el día de cobro de este mes ya pasó, ¿fue un cobro que
 * ocurrió —porque el servicio ya lo tenías— o el primero será el mes que viene,
 * porque acabas de contratarlo? Los dos casos son opuestos y solo el usuario
 * los distingue.
 */
export function cobroYaVencidoEsteMes(
  ciclo: 'mensual' | 'anual', diaCobro: number, mesCobro?: number | null,
): string | null {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = ciclo === 'anual' ? (mesCobro ?? 0) : hoy.getMonth() + 1
  if (!m) return null
  if (ciclo === 'anual' && m !== hoy.getMonth() + 1) return null

  const dia = Math.min(diaCobro, ultimoDia(y, m))
  if (dia > hoy.getDate()) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Texto del día de cobro tal como se lee en la pregunta del formulario. */
export function textoFechaCobro(fecha: string): string {
  const [, m, d] = fecha.split('-')
  return `${Number(d)} de ${MESES_LARGOS[Number(m) - 1]}`
}

const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
