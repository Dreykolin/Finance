export interface Gasto {
  id: number;
  descripcion: string;
  metodoPago: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
}

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
