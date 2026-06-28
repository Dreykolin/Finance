import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Gasto } from '../types'

function mapGasto(r: any): Gasto {
  return {
    id:        r.id,
    descripcion: r.detalles,
    monto:     r.monto,
    fecha:     r.fecha,
    metodoPago: r.metodo_pago ?? '',
  }
}

export function useGastos() {
  const [gastos, setGastos] = useState<Gasto[]>([])

  useEffect(() => {
    api.get<any[]>('/compras')
      .then(data => setGastos(data.map(mapGasto)))
      .catch(console.error)
  }, [])

  async function agregar(g: Omit<Gasto, 'id'>) {
    const created = await api.post<any>('/compras', {
      detalles:    g.descripcion,
      monto:       g.monto,
      fecha:       g.fecha,
      metodo_pago: g.metodoPago || null,
    })
    setGastos(prev => [mapGasto(created), ...prev])
  }

  async function eliminar(id: number) {
    await api.delete(`/compras/${id}`)
    setGastos(prev => prev.filter(g => g.id !== id))
  }

  return { gastos, agregar, eliminar }
}
