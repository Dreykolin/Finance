import { useState, useEffect } from 'react'
import type { Ahorro, MetaAhorro } from '../types'

const AHORROS_KEY = 'fin_ahorros'
const METAS_KEY   = 'fin_metas'

export function useAhorros() {
  const [ahorros, setAhorros] = useState<Ahorro[]>(() => {
    try { return JSON.parse(localStorage.getItem(AHORROS_KEY) ?? '[]') }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(AHORROS_KEY, JSON.stringify(ahorros))
  }, [ahorros])

  function agregar(a: Omit<Ahorro, 'id'>) {
    setAhorros(prev => [{ ...a, id: Date.now() }, ...prev])
  }

  function eliminar(id: number) {
    setAhorros(prev => prev.filter(a => a.id !== id))
  }

  return { ahorros, agregar, eliminar }
}

export function useMetas() {
  const [metas, setMetas] = useState<MetaAhorro[]>(() => {
    try { return JSON.parse(localStorage.getItem(METAS_KEY) ?? '[]') }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(METAS_KEY, JSON.stringify(metas))
  }, [metas])

  function agregar(m: Omit<MetaAhorro, 'id'>) {
    setMetas(prev => [...prev, { ...m, id: Date.now() }])
  }

  function eliminar(id: number) {
    setMetas(prev => prev.filter(m => m.id !== id))
  }

  function toggleCompletada(id: number) {
    setMetas(prev => prev.map(m => m.id === id ? { ...m, completada: !m.completada } : m))
  }

  return { metas, agregar, eliminar, toggleCompletada }
}
