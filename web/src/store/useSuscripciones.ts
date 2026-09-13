import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { Suscripcion, NuevaSuscripcion, CargoSuscripcion } from '../types'

function mapSus(r: any): Suscripcion {
  return {
    id:       r.id,
    nombre:   r.nombre,
    monto:    r.precio,
    ciclo:    r.ciclo === 'anual' ? 'anual' : 'mensual',
    diaCobro: r.dia_cobro ?? 1,
    mesCobro: r.mes_cobro ?? null,
    activa:   r.activa ?? true,
    metodoPago: r.metodo_pago ?? '',
    desde:    (r.desde ?? '').slice(0, 10),
    cargos:   (r.cargos ?? []).map(mapCargo),
    pagado:   r.pagado ?? false,
  }
}

function mapCargo(c: any): CargoSuscripcion {
  return {
    id:         c.id,
    periodo:    c.periodo,
    monto:      c.monto,
    estado:     c.estado === 'omitido' ? 'omitido' : 'cobrado',
    confirmado: c.confirmado ?? false,
    fecha:      (c.fecha ?? '').slice(0, 10),
  }
}

export function useSuscripciones() {
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([])

  const cargar = useCallback(async () => {
    const data = await api.get<any[]>('/suscripciones')
    setSuscripciones(data.map(mapSus))
  }, [])

  useEffect(() => { cargar().catch(console.error) }, [cargar])

  async function agregar(s: NuevaSuscripcion) {
    await api.post('/suscripciones', {
      nombre:    s.nombre,
      precio:    s.monto,
      ciclo:     s.ciclo,
      dia_cobro: s.diaCobro,
      mes_cobro: s.mesCobro ?? null,
      metodo_pago: s.metodoPago || null,
      desde: s.desde ?? null,
    })
    // Se recarga en vez de insertar en local: al crearla, el backend puede haber
    // materializado cargos vencidos (y sus gastos) en el mismo golpe.
    await cargar()
  }

  async function editar(id: number, patch: Partial<NuevaSuscripcion & { activa: boolean }>) {
    await api.patch(`/suscripciones/${id}`, {
      nombre:    patch.nombre,
      precio:    patch.monto,
      ciclo:     patch.ciclo,
      dia_cobro: patch.diaCobro,
      mes_cobro: patch.mesCobro,
      activa:    patch.activa,
      metodo_pago: patch.metodoPago,
    })
    await cargar()
  }

  async function eliminar(id: number) {
    await api.delete(`/suscripciones/${id}`)
    setSuscripciones(prev => prev.filter(s => s.id !== id))
  }

  /** Alterna un cargo entre cobrado y omitido; el gasto asociado se crea o se borra. */
  async function alternarCargo(idSus: number, periodo: string) {
    const actualizado = await api.post<any>(`/suscripciones/${idSus}/cargos/${periodo}`)
    aplicarCargo(idSus, mapCargo(actualizado))
  }

  /** Marca "sí, esto ocurrió" sin cambiar el estado del cargo. */
  async function confirmarCargo(idSus: number, periodo: string) {
    const actualizado = await api.post<any>(`/suscripciones/${idSus}/cargos/${periodo}/confirmar`)
    aplicarCargo(idSus, mapCargo(actualizado))
  }

  function aplicarCargo(idSus: number, cargo: CargoSuscripcion) {
    setSuscripciones(prev => prev.map(s =>
      s.id !== idSus ? s : {
        ...s,
        cargos: s.cargos.map(c => c.periodo === cargo.periodo ? cargo : c),
      }
    ))
  }

  /** Compatibilidad con la vista móvil: opera sobre el cargo del mes en curso. */
  async function togglePagado(id: number) {
    const updated = await api.post<any>(`/suscripciones/${id}/toggle`)
    setSuscripciones(prev => prev.map(s =>
      s.id === id ? { ...s, pagado: updated.pagado ?? !s.pagado } : s
    ))
    await cargar()
  }

  return {
    suscripciones, agregar, editar, eliminar,
    alternarCargo, confirmarCargo, togglePagado, recargar: cargar,
  }
}
