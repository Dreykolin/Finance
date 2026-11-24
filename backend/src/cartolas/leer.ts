import * as XLSX from 'xlsx'
import { ErrorCartola } from './errores.js'
import { interpretarFilas, type Cartola, type Celda } from './interpretar.js'

/**
 * Lee la primera hoja de la planilla como una matriz de celdas.
 *
 * El Banco de Chile entrega un .xls binario (BIFF8, Excel 97-2003), no un CSV;
 * SheetJS lo decodifica. El rango se fuerza a partir de A1 para que los
 * números de fila de los errores coincidan con los que el usuario ve en Excel.
 */
export function leerFilas(archivo: Buffer): Celda[][] {
  if (!archivo || archivo.length === 0) throw new ErrorCartola('El archivo está vacío')

  let libro: XLSX.WorkBook
  try {
    libro = XLSX.read(archivo, { type: 'buffer' })
  } catch {
    throw new ErrorCartola('El archivo no es una planilla válida')
  }

  const hoja = libro.Sheets[libro.SheetNames[0]]
  if (!hoja?.['!ref']) throw new ErrorCartola('La planilla no tiene datos')

  const rango = XLSX.utils.decode_range(hoja['!ref'])
  rango.s = { r: 0, c: 0 }
  return XLSX.utils.sheet_to_json<Celda[]>(hoja, { header: 1, raw: true, defval: null, blankrows: true, range: rango })
}

export function leerCartola(archivo: Buffer): Cartola {
  return interpretarFilas(leerFilas(archivo))
}
