import { describe, test, expect } from 'vitest'
import { sugerirConciliacion } from '../../src/cartolas/conciliacion.js'

const mov = (huella: string, fecha: string, monto: number) => ({ huella, fecha, monto })
const compra = (id: number, fecha: string, monto: number) => ({ id, fecha, monto })

describe('sugerirConciliacion', () => {
  test('sugiere el gasto con el mismo monto y fecha cercana', () => {
    const s = sugerirConciliacion([mov('m1', '2026-10-05', -25000)], [compra(7, '2026-10-04', 25000)])
    expect(s).toEqual([{ huella: 'm1', idCompra: 7, diasDiferencia: 1 }])
  })

  test('no sugiere si el monto es distinto', () => {
    expect(sugerirConciliacion([mov('m1', '2026-10-05', -25000)], [compra(7, '2026-10-05', 24990)])).toEqual([])
  })

  test('no sugiere si la fecha está fuera de la tolerancia (3 días por defecto)', () => {
    expect(sugerirConciliacion([mov('m1', '2026-10-05', -25000)], [compra(7, '2026-10-01', 25000)])).toEqual([])
  })

  test('los abonos no se concilian con gastos', () => {
    expect(sugerirConciliacion([mov('m1', '2026-10-05', 25000)], [compra(7, '2026-10-05', 25000)])).toEqual([])
  })

  test('entre varios candidatos elige el de fecha más cercana', () => {
    const s = sugerirConciliacion(
      [mov('m1', '2026-10-05', -25000)],
      [compra(7, '2026-10-03', 25000), compra(8, '2026-10-05', 25000)])
    expect(s[0].idCompra).toBe(8)
  })

  test('un gasto se sugiere para un solo movimiento', () => {
    const s = sugerirConciliacion(
      [mov('m1', '2026-10-05', -10000), mov('m2', '2026-10-05', -10000)],
      [compra(7, '2026-10-05', 10000)])
    expect(s).toEqual([{ huella: 'm1', idCompra: 7, diasDiferencia: 0 }])
  })

  test('dos movimientos iguales se emparejan con dos gastos distintos', () => {
    const s = sugerirConciliacion(
      [mov('m1', '2026-10-05', -10000), mov('m2', '2026-10-05', -10000)],
      [compra(7, '2026-10-05', 10000), compra(8, '2026-10-06', 10000)])
    expect(s.map(x => [x.huella, x.idCompra])).toEqual([['m1', 7], ['m2', 8]])
  })

  test('cruza bien el cambio de año', () => {
    const s = sugerirConciliacion([mov('m1', '2027-01-01', -5000)], [compra(7, '2026-12-30', 5000)])
    expect(s[0].diasDiferencia).toBe(2)
  })
})
