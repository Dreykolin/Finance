import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { aISO } from '../lib/cuotas'
import type { CompraCuotas } from '../types'

// Las fechas llegan como DATE de Postgres, que se serializa con hora ('...T00:00:00.000Z').
// Se recortan a 'YYYY-MM-DD' para poder compararlas y formatearlas como texto.
function mapCuota(r: any): CompraCuotas {
  return {
    id:           r.id,
    producto:     r.nombre_producto,
    tienda:       r.tienda,
    cuotasTotales: r.cuotas_totales,
    cuotasPagadas: r.cuotas_pagadas,
    montoCuota:   r.monto_cuota,
    fechaInicio:  aISO(r.fecha),
    fechaPrimerCobro: aISO(r.fecha_primer_cobro) || aISO(r.fecha),
    metodoPago:   r.metodo_pago ?? '',
  }
}

export function useCuotas() {
  const [cuotas, setCuotas] = useState<CompraCuotas[]>([])

  useEffect(() => {
    api.get<any[]>('/cuotas')
      .then(data => setCuotas(data.map(mapCuota)))
      .catch(console.error)
  }, [])

  async function agregar(c: Omit<CompraCuotas, 'id'>) {
    const created = await api.post<any>('/cuotas', {
      nombre_producto: c.producto,
      tienda:          c.tienda,
      cuotas_totales:  c.cuotasTotales,
      monto_cuota:     c.montoCuota,
      fecha:           c.fechaInicio,
      fecha_primer_cobro: c.fechaPrimerCobro || c.fechaInicio,
      metodo_pago:     c.metodoPago || null,
    })
    setCuotas(prev => [...prev, mapCuota(created)])
  }

  async function eliminar(id: number) {
    await api.delete(`/cuotas/${id}`)
    setCuotas(prev => prev.filter(c => c.id !== id))
  }

  /**
   * Edita el registro, incluidas las cuotas ya pagadas. Bajar `cuotasPagadas`
   * revierte pagos: el backend borra las compras auto-generadas asociadas.
   */
  async function editar(id: number, c: Partial<Omit<CompraCuotas, 'id'>>) {
    const updated = await api.patch<any>(`/cuotas/${id}`, {
      nombre_producto: c.producto,
      tienda:          c.tienda,
      cuotas_totales:  c.cuotasTotales,
      monto_cuota:     c.montoCuota,
      cuotas_pagadas:  c.cuotasPagadas,
      metodo_pago:     c.metodoPago,
      fecha_primer_cobro: c.fechaPrimerCobro,
    })
    setCuotas(prev => prev.map(x => x.id === id ? mapCuota(updated) : x))
  }

  async function marcarCuota(id: number) {
    const updated = await api.post<any>(`/cuotas/${id}/marcar`)
    setCuotas(prev => prev.map(c => c.id === id ? mapCuota(updated) : c))
  }

  return { cuotas, agregar, editar, eliminar, marcarCuota }
}
