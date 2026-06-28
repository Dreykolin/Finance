import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import type { Ahorro, MetaAhorro } from '../types'

function mapDeposito(d: any): Ahorro {
  return { id: d.id, monto: d.monto, fecha: d.fecha, esRetiro: d.es_retiro }
}

function mapReserva(r: any): MetaAhorro {
  return { id: r.id, nombre: r.nombre, montoObjetivo: r.monto_meta ?? 0, completada: r.completada }
}

export function useAhorros() {
  const [ahorros, setAhorros] = useState<Ahorro[]>([])
  const generalIdRef = useRef<number | null>(null)

  async function cargar() {
    const reservas = await api.get<any[]>('/reservas')
    const general = reservas.find(r => r.es_general)
    if (!general) return
    generalIdRef.current = general.id
    const depositos = await api.get<any[]>(`/reservas/${general.id}/depositos`)
    setAhorros(depositos.map(mapDeposito))
  }

  useEffect(() => { cargar().catch(console.error) }, [])

  async function agregar(a: Omit<Ahorro, 'id'>) {
    const id = generalIdRef.current
    if (!id) return
    await api.post(`/reservas/${id}/depositos`, { monto: a.monto, fecha: a.fecha, es_retiro: a.esRetiro })
    await cargar()
  }

  async function eliminar(id: number) {
    await api.delete(`/reservas/depositos/${id}`)
    setAhorros(prev => prev.filter(a => a.id !== id))
  }

  return { ahorros, agregar, eliminar }
}

export function useMetas() {
  const [metas, setMetas] = useState<MetaAhorro[]>([])

  async function cargar() {
    const reservas = await api.get<any[]>('/reservas')
    setMetas(reservas.filter(r => !r.es_general).map(mapReserva))
  }

  useEffect(() => { cargar().catch(console.error) }, [])

  async function agregar(m: Omit<MetaAhorro, 'id'>) {
    await api.post('/reservas', { nombre: m.nombre, monto_meta: m.montoObjetivo })
    await cargar()
  }

  async function eliminar(id: number) {
    await api.delete(`/reservas/${id}`)
    setMetas(prev => prev.filter(m => m.id !== id))
  }

  async function toggleCompletada(id: number) {
    const meta = metas.find(m => m.id === id)
    if (!meta) return
    const updated = await api.patch<any>(`/reservas/${id}`, { completada: !meta.completada })
    setMetas(prev => prev.map(m => m.id === id ? mapReserva(updated) : m))
  }

  return { metas, agregar, eliminar, toggleCompletada }
}
