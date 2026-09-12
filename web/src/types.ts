export interface Gasto {
  id: number;
  descripcion: string;
  metodoPago: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
  /** 'manual' | 'cuota' | 'suscripcion' — las dos últimas se generan solas. */
  origen: string;
}

/** Lo que el cliente envía al crear un gasto: `origen` lo asigna el servidor. */
export type NuevoGasto = Omit<Gasto, 'id' | 'origen'>;

export interface CompraCuotas {
  id: number;
  producto: string;
  tienda: string;
  cuotasTotales: number;
  cuotasPagadas: number;
  montoCuota: number;
  fechaInicio: string;
}

export interface Ahorro {
  id: number;
  monto: number;
  fecha: string; // YYYY-MM-DD
  esRetiro: boolean;
}

export interface MetaAhorro {
  id: number;
  nombre: string;
  montoObjetivo: number;
  completada: boolean;
}

export interface Suscripcion {
  id: number;
  nombre: string;
  monto: number;
  pagado: boolean;
}
