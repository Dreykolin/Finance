import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { CompraCuotas } from '../types'

function mapCuota(r: any): CompraCuotas {
  return {
    id:           r.id,
    producto:     r.nombre_producto,
    tienda:       r.tienda,
    cuotasTotales: r.cuotas_totales,
    cuotasPagadas: r.cuotas_pagadas,
    montoCuota:   r.monto_cuota,
    fechaInicio:  r.fecha,
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
    })
    setCuotas(prev => [...prev, mapCuota(created)])
  }

  async function eliminar(id: number) {
    await api.delete(`/cuotas/${id}`)
    setCuotas(prev => prev.filter(c => c.id !== id))
  }

  async function marcarCuota(id: number) {
    const updated = await api.post<any>(`/cuotas/${id}/marcar`)
    setCuotas(prev => prev.map(c => c.id === id ? mapCuota(updated) : c))
  }

  return { cuotas, agregar, eliminar, marcarCuota }
}
