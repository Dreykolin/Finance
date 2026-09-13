import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

export interface Configuracion {
  presupuesto: number
  /** 'YYYY-MM-DD' o null: desde cuándo los datos son representativos. */
  analisisDesde: string | null
}

const VACIA: Configuracion = { presupuesto: 0, analisisDesde: null }

/** Clave heredada: el presupuesto vivía solo en este navegador. */
const CLAVE_LOCAL = 'fin_presupuesto'

export function useConfiguracion() {
  const [config, setConfig] = useState<Configuracion>(VACIA)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    try {
      const r = await api.get<any>('/configuracion')
      const remoto: Configuracion = {
        presupuesto: r.presupuesto_mensual ?? 0,
        analisisDesde: r.analisis_desde ?? null,
      }

      // Si el servidor aún no sabe del presupuesto pero este navegador sí, se
      // sube una vez. Evita que quien ya lo tenía puesto lo vea desaparecer.
      const local = Number(localStorage.getItem(CLAVE_LOCAL) ?? '0')
      if (remoto.presupuesto === 0 && local > 0) {
        const subido = await api.patch<any>('/configuracion', { presupuesto_mensual: local })
        remoto.presupuesto = subido.presupuesto_mensual ?? local
        localStorage.removeItem(CLAVE_LOCAL)
      }

      setConfig(remoto)
    } catch (e) {
      console.error('No se pudo cargar la configuración', e)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function guardar(cambios: Partial<Configuracion>) {
    const r = await api.patch<any>('/configuracion', {
      ...(cambios.presupuesto !== undefined ? { presupuesto_mensual: cambios.presupuesto } : {}),
      ...(cambios.analisisDesde !== undefined ? { analisis_desde: cambios.analisisDesde } : {}),
    })
    setConfig({
      presupuesto: r.presupuesto_mensual ?? 0,
      analisisDesde: r.analisis_desde ?? null,
    })
  }

  return { config, cargando, guardar }
}

/**
 * Filtra por la fecha de corte. Se aplica al análisis y nunca al historial: los
 * movimientos anteriores ocurrieron y deben poder consultarse; lo que no deben
 * es arrastrar medias y tendencias calculadas sobre meses a medio registrar.
 */
export function desdeElCorte<T extends { fecha: string }>(
  filas: T[], desde: string | null,
): T[] {
  if (!desde) return filas
  return filas.filter(f => f.fecha >= desde)
}
