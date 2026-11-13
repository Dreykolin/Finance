/**
 * Genera test/fixtures/cartola_ficticia.xls: un .xls (BIFF8, el mismo formato
 * binario que entrega el Banco de Chile) con la estructura de la cartola real y
 * datos inventados. Así los tests no dependen de una cartola real, que tiene
 * RUT y número de cuenta y nunca debe versionarse.
 *
 * Casos que cubre a propósito:
 * - emisión el 05/01/2027 con movimientos de diciembre (cambio de año),
 * - dos transferencias idénticas el mismo día,
 * - filas vacías y pie legal.
 *
 * Uso: npx tsx scripts/generar-cartola-ficticia.ts
 */
import * as XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'node:fs'

const filas = [
  [], [], [], [], [], [], [],
  [null, 'Sr(a): ', 'PERSONA DE PRUEBA'],
  [null, 'Rut:', '11.111.111-1'],
  [null, 'Cuenta:', '00-000-00000-00'],
  [null, 'Moneda:', 'PESOS CHILENOS (CLP)'],
  [], [],
  [null, 'Detalle Cartola Histórica', null, 'Fecha de Emisión', ' 05/01/2027'],
  [],
  [null, 'Folio Cartola', 'Saldo Contable', 'Retenciones 24 Hrs.', 'Retenciones 48 Hrs.'],
  [null, '12', 210000, 0, 0],
  [], [],
  [null, 'Saldo Inicial', 'Saldo Disponible', 'Línea de Crédito'],
  [null, 250000, 210000, 500000],
  [], [], [],
  [null, 'Fecha', 'Descripción', 'Canal o Sucursal', 'Cargos (PESOS)', 'Abonos (PESOS)', 'Saldo (PESOS)'],
  [null, '27/12', 'SALDO INICIAL'],
  [null, '28/12', 'PAGO:SUPERMERCADO LIDER', 'INTERNET', 32990],
  [null, '28/12', 'TRASPASO A:FULANO DE TAL', 'INTERNET', 10000],
  [null, '28/12', 'TRASPASO A:FULANO DE TAL', 'INTERNET', 10000, null, 197010],
  [],
  [null, '02/01', 'TRASPASO DE:EMPRESA EJEMPLO SPA', 'OF.CENTRAL', null, 45000, 242010],
  [null, '04/01', 'PAGO:CUENTA DE LUZ', 'INTERNET', 32010, null, 210000],
  [null, '05/01', 'SALDO FINAL', null, null, null, 210000],
  [], [], [], [], [], [],
  [null, 'Infórmate sobre la garantía estatal de los depósitos en tu banco.'],
]

const libro = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), 'Hoja1')
mkdirSync('test/fixtures', { recursive: true })
writeFileSync('test/fixtures/cartola_ficticia.xls', XLSX.write(libro, { type: 'buffer', bookType: 'biff8' }))
console.log('Generado test/fixtures/cartola_ficticia.xls')
