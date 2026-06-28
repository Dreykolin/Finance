import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Suscripcion } from '../types'

function mapSus(r: any): Suscripcion {
  return {
    id:     r.id,
    nombre: r.nombre,
    monto:  r.precio,
    pagado: r.pagado,
  }
}

export function useSuscripciones() {
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([])

  useEffect(() => {
    api.get<any[]>('/suscripciones')
      .then(data => setSuscripciones(data.map(mapSus)))
      .catch(console.error)
  }, [])

  async function agregar(s: Omit<Suscripcion, 'id'>) {
    const created = await api.post<any>('/suscripciones', {
      nombre: s.nombre,
      precio: s.monto,
    })
    setSuscripciones(prev => [...prev, mapSus(created)])
  }

  async function eliminar(id: number) {
    await api.delete(`/suscripciones/${id}`)
    setSuscripciones(prev => prev.filter(s => s.id !== id))
  }

  async function togglePagado(id: number) {
    const updated = await api.post<any>(`/suscripciones/${id}/toggle`)
    setSuscripciones(prev => prev.map(s => s.id === id ? mapSus(updated) : s))
  }

  async function resetearPagos() {
    await api.post('/suscripciones/reset')
    setSuscripciones(prev => prev.map(s => ({ ...s, pagado: false })))
  }

  return { suscripciones, agregar, eliminar, togglePagado, resetearPagos }
}
