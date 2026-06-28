import { useState, useEffect } from 'react'
import type { CompraCuotas } from '../types'

const KEY = 'fin_cuotas'

export function useCuotas() {
  const [cuotas, setCuotas] = useState<CompraCuotas[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(cuotas))
  }, [cuotas])

  function agregar(c: Omit<CompraCuotas, 'id'>) {
    setCuotas(prev => [...prev, { ...c, id: Date.now() }])
  }

  function eliminar(id: number) {
    setCuotas(prev => prev.filter(c => c.id !== id))
  }

  function marcarCuota(id: number) {
    setCuotas(prev => prev.map(c =>
      c.id === id && c.cuotasPagadas < c.cuotasTotales
        ? { ...c, cuotasPagadas: c.cuotasPagadas + 1 }
        : c
    ))
  }

  return { cuotas, agregar, eliminar, marcarCuota }
}
