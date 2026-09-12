// Paleta única para las categorías de gasto, compartida por desktop y mobile.
export const METODOS = ['Efectivo', 'Débito', 'Crédito', 'Transferencia'] as const

export const METODO_FILL: Record<string, string> = {
  'Efectivo':      '#10b981',
  'Débito':        '#3b82f6',
  'Crédito':       '#8b5cf6',
  'Transferencia': '#f97316',
}

// Las compras auto-generadas por cuotas y suscripciones no tienen método de pago:
// son gasto comprometido, no una decisión de pago del momento. Se grafican como
// categorías propias en vez de caer en una etiqueta vacía.
export const ORIGEN_LABEL: Record<string, string> = {
  cuota:       'Cuotas',
  suscripcion: 'Suscripciones',
}

export const ORIGEN_FILL: Record<string, string> = {
  'Directo':       '#64748b',
  'Cuotas':        '#eab308',
  'Suscripciones': '#ec4899',
}

/** Etiqueta del eje "tipo de gasto", que incluye lo registrado a mano. */
export const TIPO_LABEL: Record<string, string> = {
  manual:      'Directo',
  cuota:       'Cuotas',
  suscripcion: 'Suscripciones',
}

export const SIN_METODO = 'Sin declarar'

export const EXTRA_COLORS = ['#14b8a6', '#6366f1', '#f43f5e', '#a3e635']

export function colorFor(label: string, i = 0): string {
  return METODO_FILL[label] ?? ORIGEN_FILL[label] ?? EXTRA_COLORS[i % EXTRA_COLORS.length]
}
