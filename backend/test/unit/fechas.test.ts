import { describe, test, expect } from 'vitest'
import { inferirFecha, parsearFechaEmision } from '../../src/cartolas/fechas.js'
import { ErrorCartola } from '../../src/cartolas/errores.js'

describe('parsearFechaEmision', () => {
  test('convierte "dd/mm/aaaa" a ISO, tolerando espacios', () => {
    expect(parsearFechaEmision(' 30/10/2026')).toBe('2026-10-30')
  })

  test('rechaza una fecha con formato inesperado', () => {
    expect(() => parsearFechaEmision('2026-10-30')).toThrow(ErrorCartola)
  })
})

describe('inferirFecha', () => {
  // El banco entrega "dd/mm" sin año y solo deja consultar los últimos 12 meses.
  test('un movimiento anterior a la emisión es del mismo año', () => {
    expect(inferirFecha('15/09', '2026-10-30')).toBe('2026-09-15')
  })

  test('un movimiento del mismo día de emisión es del mismo año', () => {
    expect(inferirFecha('30/10', '2026-10-30')).toBe('2026-10-30')
  })

  test('un movimiento posterior a la emisión (en día/mes) es del año anterior', () => {
    expect(inferirFecha('28/12', '2027-01-05')).toBe('2026-12-28')
  })

  test('rechaza un día/mes imposible', () => {
    expect(() => inferirFecha('31/02', '2026-10-30')).toThrow(ErrorCartola)
  })

  test('rechaza un texto que no es dd/mm', () => {
    expect(() => inferirFecha('SALDO', '2026-10-30')).toThrow(ErrorCartola)
  })
})
