import { describe, test, expect } from 'vitest'
import { conHuellas } from '../../src/cartolas/huellas.js'
import type { Movimiento } from '../../src/cartolas/interpretar.js'

const mov = (fecha: string, descripcion: string, monto: number, saldo: number | null = null): Movimiento =>
  ({ fecha, descripcion, canal: 'INTERNET', monto, saldo })

describe('conHuellas', () => {
  test('el mismo movimiento produce la misma huella en dos importaciones', () => {
    const a = conHuellas([mov('2026-10-01', 'PAGO:SUPERMERCADO', -25000)])
    const b = conHuellas([mov('2026-10-01', 'PAGO:SUPERMERCADO', -25000)])
    expect(a[0].huella).toBe(b[0].huella)
  })

  test('movimientos distintos producen huellas distintas', () => {
    const [a, b] = conHuellas([
      mov('2026-10-01', 'PAGO:SUPERMERCADO', -25000),
      mov('2026-10-01', 'PAGO:SUPERMERCADO', -26000),
    ])
    expect(a.huella).not.toBe(b.huella)
  })

  // El banco no entrega un ID por movimiento. Dos transferencias idénticas el
  // mismo día son dos movimientos reales: no se pueden fusionar.
  test('dos movimientos idénticos en la misma cartola tienen huellas distintas', () => {
    const [a, b] = conHuellas([
      mov('2026-10-01', 'TRASPASO A:FULANO', -10000),
      mov('2026-10-01', 'TRASPASO A:FULANO', -10000),
    ])
    expect(a.huella).not.toBe(b.huella)
  })

  test('cartolas que se solapan generan las mismas huellas para los movimientos comunes', () => {
    const comunes = [
      mov('2026-10-01', 'TRASPASO A:FULANO', -10000),
      mov('2026-10-01', 'TRASPASO A:FULANO', -10000),
    ]
    const octubre = conHuellas([mov('2026-09-30', 'PAGO:LUZ', -30000), ...comunes])
    const noviembre = conHuellas([...comunes, mov('2026-11-02', 'PAGO:AGUA', -12000)])
    expect(noviembre.slice(0, 2).map(m => m.huella)).toEqual(octubre.slice(1, 3).map(m => m.huella))
  })

  test('ignora diferencias de mayúsculas y espacios en la descripción', () => {
    const [a] = conHuellas([mov('2026-10-01', 'PAGO:SUPERMERCADO', -25000)])
    const [b] = conHuellas([mov('2026-10-01', '  pago:supermercado ', -25000)])
    expect(a.huella).toBe(b.huella)
  })

  test('el saldo diario no forma parte de la huella', () => {
    const [a] = conHuellas([mov('2026-10-01', 'PAGO:SUPERMERCADO', -25000, null)])
    const [b] = conHuellas([mov('2026-10-01', 'PAGO:SUPERMERCADO', -25000, 75000)])
    expect(a.huella).toBe(b.huella)
  })
})
