import { useState, useEffect } from 'react'
import type { Gasto } from '../types'

const KEY = 'fin_gastos'

export function useGastos() {
  const [gastos, setGastos] = useState<Gasto[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(gastos))
  }, [gastos])

  function agregar(g: Omit<Gasto, 'id'>) {
    setGastos(prev => [{ ...g, id: Date.now() }, ...prev])
  }

  function eliminar(id: number) {
    setGastos(prev => prev.filter(g => g.id !== id))
  }

  return { gastos, agregar, eliminar }
}
