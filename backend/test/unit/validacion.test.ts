import { describe, test, expect } from 'vitest'
import { validarSaldos } from '../../src/cartolas/validacion.js'
import { ErrorCartola } from '../../src/cartolas/errores.js'
import type { Cartola } from '../../src/cartolas/interpretar.js'

const mov = (monto: number) => ({ fecha: '2026-10-01', descripcion: 'X', canal: 'INTERNET', monto, saldo: null })

const cartola = (saldoInicial: number, montos: number[], saldoFinal: number): Cartola => ({
  fechaEmision: '2026-10-30', saldoInicial, saldoFinal, movimientos: montos.map(mov),
})

describe('validarSaldos', () => {
  test('acepta una cartola donde inicial + movimientos = final', () => {
    expect(() => validarSaldos(cartola(100000, [-25000, 40000, -15000], 100000))).not.toThrow()
  })

  test('acepta una cartola sin movimientos si los saldos coinciden', () => {
    expect(() => validarSaldos(cartola(5000, [], 5000))).not.toThrow()
  })

  test('rechaza una cartola cuyos saldos no cuadran, informando la diferencia', () => {
    expect(() => validarSaldos(cartola(100000, [-25000], 100000)))
      .toThrow(ErrorCartola)
    expect(() => validarSaldos(cartola(100000, [-25000], 100000)))
      .toThrow(/diferencia de -25000/)
  })
})
