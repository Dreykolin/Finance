import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { leerCartola } from '../../src/cartolas/leer.js'
import { ErrorCartola } from '../../src/cartolas/errores.js'

const ficticia = readFileSync(new URL('../fixtures/cartola_ficticia.xls', import.meta.url))

describe('leerCartola (archivo .xls de punta a punta)', () => {
  test('lee la cartola ficticia con el formato binario del banco', () => {
    const c = leerCartola(ficticia)
    expect(c.fechaEmision).toBe('2027-01-05')
    expect(c.saldoInicial).toBe(250000)
    expect(c.saldoFinal).toBe(210000)
    expect(c.movimientos).toHaveLength(5)
  })

  test('los movimientos de diciembre quedan en el año anterior a la emisión', () => {
    const fechas = leerCartola(ficticia).movimientos.map(m => m.fecha)
    expect(fechas).toEqual(['2026-12-28', '2026-12-28', '2026-12-28', '2027-01-02', '2027-01-04'])
  })

  test('conserva tildes y textos tal como vienen', () => {
    const [primero] = leerCartola(ficticia).movimientos
    expect(primero.descripcion).toBe('PAGO:SUPERMERCADO LIDER')
  })

  test('rechaza un archivo que no es una planilla', () => {
    expect(() => leerCartola(Buffer.from('esto no es un excel'))).toThrow(ErrorCartola)
  })

  test('rechaza un archivo vacío', () => {
    expect(() => leerCartola(Buffer.alloc(0))).toThrow(ErrorCartola)
  })
})
