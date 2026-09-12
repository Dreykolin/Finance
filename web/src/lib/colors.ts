/**
 * Paleta de datos, validada con el verificador de contraste y visión cromática
 * sobre la superficie oscura (#18181b).
 *
 * El orden de cada lista es **fijo y significativo**: las comprobaciones de
 * separación se hicieron sobre pares adyacentes, así que las categorías se
 * dibujan siempre en este orden y nunca reordenadas por magnitud. Reordenar por
 * valor volvería variable la adyacencia y dejaría de estar garantizada la
 * distinción entre, por ejemplo, naranja y amarillo.
 *
 * El color sigue a la entidad, nunca a su posición en el ranking.
 */

/** Orden canónico de métodos. Cambiarlo invalida la comprobación de la paleta. */
export const METODOS = ['Débito', 'Crédito', 'Efectivo', 'Transferencia'] as const

export const METODO_FILL: Record<string, string> = {
  'Débito':        '#3987e5',  // azul
  'Crédito':       '#d95926',  // naranja
  'Efectivo':      '#199e70',  // aqua
  'Transferencia': '#c98500',  // amarillo
}

/** Etiqueta del eje "tipo de gasto", que incluye lo registrado a mano. */
export const TIPO_LABEL: Record<string, string> = {
  manual:      'Directo',
  cuota:       'Cuotas',
  suscripcion: 'Suscripciones',
}

/** Orden canónico de tipos; estos tres separan bien en cualquier disposición. */
export const TIPOS = ['Directo', 'Cuotas', 'Suscripciones'] as const

export const ORIGEN_FILL: Record<string, string> = {
  'Directo':       '#3987e5',
  'Cuotas':        '#d95926',
  'Suscripciones': '#199e70',
}

/** Neutro para lo no clasificado; va siempre al final, como un "Otros". */
export const SIN_METODO = 'Sin declarar'
export const NEUTRO = '#6b7280'

/** Hue único para magnitudes (una sola serie): más alto, más intenso. */
export const SECUENCIAL = {
  fuerte: '#8b5cf6',
  medio:  'rgba(139,92,246,0.55)',
  suave:  'rgba(139,92,246,0.22)',
}

/** Estado: nunca se reutilizan como color de serie, y siempre con texto o icono. */
export const ESTADO = {
  bien:    '#34d399',
  aviso:   '#fbbf24',
  critico: '#f87171',
}

export function colorFor(label: string): string {
  return METODO_FILL[label] ?? ORIGEN_FILL[label] ?? NEUTRO
}

/** Ordena las categorías por su orden canónico; lo desconocido cae al final. */
export function ordenCanonico(labels: string[], orden: readonly string[]): string[] {
  return [...labels].sort((a, b) => {
    const ia = orden.indexOf(a), ib = orden.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}
