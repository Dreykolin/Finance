import { describe, test, expect } from 'vitest'
import { interpretarFilas, type Celda } from '../../src/cartolas/interpretar.js'
import { ErrorCartola } from '../../src/cartolas/errores.js'

/**
 * Réplica de la estructura de la cartola del Banco de Chile (con datos
 * inventados): bloque de datos de la cuenta, fecha de emisión, resúmenes, y la
 * tabla de movimientos entre SALDO INICIAL y SALDO FINAL. La primera columna
 * viene vacía, igual que en el archivo real.
 */
function cartolaBase(): Celda[][] {
  return [
    [],
    [null, 'Sr(a): ', 'PERSONA DE PRUEBA'],
    [null, 'Rut:', '11.111.111-1'],
    [null, 'Cuenta:', '00-000-00000-00'],
    [],
    [null, 'Detalle Cartola Histórica', null, 'Fecha de Emisión', ' 30/10/2026'],
    [],
    [null, 'Saldo Inicial', 'Saldo Disponible', 'Línea de Crédito'],
    [null, 100000, 90000, 500000],
    [],
    [null, 'Fecha', 'Descripción', 'Canal o Sucursal', 'Cargos (PESOS)', 'Abonos (PESOS)', 'Saldo (PESOS)'],
    [null, '28/09', 'SALDO INICIAL'],
    [null, '29/09', 'PAGO:SUPERMERCADO', 'INTERNET', 25000],
    [null, '29/09', 'TRASPASO DE:FULANO', 'INTERNET', null, 40000, 115000],
    [],
    [null, '02/10', 'TRASPASO A:MENGANO', 'OF.CENTRAL', 15000, null, 100000],
    [null, '30/10', 'SALDO FINAL', null, null, null, 100000],
    [],
    [null, 'Infórmate sobre la garantía estatal de los depósitos.'],
  ]
}

describe('interpretarFilas', () => {
  test('lee la fecha de emisión y los saldos inicial y final', () => {
    const c = interpretarFilas(cartolaBase())
    expect(c.fechaEmision).toBe('2026-10-30')
    expect(c.saldoInicial).toBe(100000)
    expect(c.saldoFinal).toBe(100000)
  })

  test('extrae solo los movimientos, sin SALDO INICIAL ni SALDO FINAL ni filas vacías', () => {
    const c = interpretarFilas(cartolaBase())
    expect(c.movimientos.map(m => m.descripcion)).toEqual([
      'PAGO:SUPERMERCADO',
      'TRASPASO DE:FULANO',
      'TRASPASO A:MENGANO',
    ])
  })

  test('convierte cargos en montos negativos y abonos en positivos', () => {
    const c = interpretarFilas(cartolaBase())
    expect(c.movimientos.map(m => m.monto)).toEqual([-25000, 40000, -15000])
  })

  test('el saldo diario es opcional', () => {
    const c = interpretarFilas(cartolaBase())
    expect(c.movimientos.map(m => m.saldo)).toEqual([null, 115000, 100000])
  })

  test('infiere el año de cada movimiento y conserva el canal', () => {
    const [primero] = interpretarFilas(cartolaBase()).movimientos
    expect(primero).toEqual({
      fecha: '2026-09-29',
      descripcion: 'PAGO:SUPERMERCADO',
      canal: 'INTERNET',
      monto: -25000,
      saldo: null,
    })
  })

  test('encuentra el encabezado aunque el banco agregue filas arriba', () => {
    const filas = cartolaBase()
    filas.unshift([], [null, 'Fila nueva del banco'])
    expect(interpretarFilas(filas).movimientos).toHaveLength(3)
  })

  test('acepta montos que vienen como texto con separador de miles', () => {
    const filas = cartolaBase()
    filas[12][4] = '25.000'
    expect(interpretarFilas(filas).movimientos[0].monto).toBe(-25000)
  })

  test('rechaza un archivo sin la tabla de movimientos', () => {
    const filas = cartolaBase().filter(f => f[1] !== 'Fecha')
    expect(() => interpretarFilas(filas)).toThrow(ErrorCartola)
  })

  test('rechaza un movimiento con cargo y abono a la vez', () => {
    const filas = cartolaBase()
    filas[12][5] = 1000
    expect(() => interpretarFilas(filas)).toThrow(/cargo y abono/)
  })

  test('rechaza un movimiento sin monto', () => {
    const filas = cartolaBase()
    filas[12][4] = null
    expect(() => interpretarFilas(filas)).toThrow(/sin monto/)
  })

  test('rechaza una cartola sin SALDO FINAL', () => {
    const filas = cartolaBase().filter(f => f[2] !== 'SALDO FINAL')
    expect(() => interpretarFilas(filas)).toThrow(/SALDO FINAL/)
  })
})
