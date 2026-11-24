export interface MovimientoAConciliar { huella: string; fecha: string; monto: number }
export interface GastoRegistrado { id: number; fecha: string; monto: number }
export interface Sugerencia { huella: string; idCompra: number; diasDiferencia: number }

const DIA_MS = 86_400_000
const dias = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / DIA_MS

/**
 * Sugiere qué gasto registrado a mano corresponde a cada cargo del banco.
 *
 * Criterio: mismo monto y fecha dentro de una tolerancia (el cargo puede
 * aparecer uno o dos días después de la compra). Entre varios candidatos se
 * elige el más cercano en fecha, y cada gasto se sugiere una sola vez.
 *
 * Son sugerencias: el usuario confirma. El emparejamiento es voraz (en el
 * orden de la cartola), suficiente para el volumen de una cuenta personal.
 */
export function sugerirConciliacion(
  movimientos: MovimientoAConciliar[],
  gastos: GastoRegistrado[],
  toleranciaDias = 3,
): Sugerencia[] {
  const usados = new Set<number>()
  const sugerencias: Sugerencia[] = []

  for (const m of movimientos) {
    if (m.monto >= 0) continue // solo los cargos corresponden a gastos
    const candidato = gastos
      .filter(g => !usados.has(g.id) && g.monto === -m.monto && dias(g.fecha, m.fecha) <= toleranciaDias)
      .sort((a, b) => dias(a.fecha, m.fecha) - dias(b.fecha, m.fecha) || a.id - b.id)[0]

    if (candidato) {
      usados.add(candidato.id)
      sugerencias.push({ huella: m.huella, idCompra: candidato.id, diasDiferencia: dias(candidato.fecha, m.fecha) })
    }
  }
  return sugerencias
}
