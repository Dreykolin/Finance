import { ErrorCartola } from './errores.js'
import type { Cartola } from './interpretar.js'

/**
 * Control de integridad: saldo inicial + movimientos debe dar el saldo final.
 *
 * Si no cuadra, la cartola está incompleta o se interpretó mal, y se rechaza
 * entera antes de guardar nada. Importar a medias dejaría datos que no
 * coinciden con el banco, que es justo lo que este módulo intenta evitar.
 */
export function validarSaldos(cartola: Cartola): void {
  const calculado = cartola.movimientos.reduce((saldo, m) => saldo + m.monto, cartola.saldoInicial)
  const diferencia = calculado - cartola.saldoFinal
  if (diferencia !== 0) {
    throw new ErrorCartola(
      `Los saldos no cuadran: inicial ${cartola.saldoInicial} + movimientos = ${calculado}, ` +
      `pero el banco informa ${cartola.saldoFinal} (diferencia de ${diferencia})`)
  }
}
