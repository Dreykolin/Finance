import { useState, useEffect } from 'react'
import type { Suscripcion } from '../types'

const KEY = 'fin_suscripciones'

export function useSuscripciones() {
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(suscripciones))
  }, [suscripciones])

  function agregar(s: Omit<Suscripcion, 'id'>) {
    setSuscripciones(prev => [...prev, { ...s, id: Date.now() }])
  }

  function eliminar(id: number) {
    setSuscripciones(prev => prev.filter(s => s.id !== id))
  }

  function togglePagado(id: number) {
    setSuscripciones(prev => prev.map(s => s.id === id ? { ...s, pagado: !s.pagado } : s))
  }

  function resetearPagos() {
    setSuscripciones(prev => prev.map(s => ({ ...s, pagado: false })))
  }

  return { suscripciones, agregar, eliminar, togglePagado, resetearPagos }
}
