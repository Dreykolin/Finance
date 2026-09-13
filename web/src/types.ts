export interface Gasto {
  id: number;
  descripcion: string;
  metodoPago: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
  /** 'manual' | 'cuota' | 'suscripcion' — las dos últimas se generan solas. */
  origen: string;
  /** Registro que generó el gasto, para poder llevar al usuario hasta él. */
  idCuota?: number | null;
  idSuscripcion?: number | null;
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
  /**
   * Cuándo cae la primera cuota. No coincide con la compra: comprar a fin de mes
   * suele caer en la factura siguiente, y hay cuotas que se debitan en fecha
   * propia. Las demás cuotas se derivan sumando meses a esta.
   */
  fechaPrimerCobro: string;
  /** Medio con el que se paga cada cuota; lo heredan los gastos generados. */
  metodoPago: string;
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

/** Un cobro concreto de una suscripción, en un período concreto. */
export interface CargoSuscripcion {
  id: number;
  periodo: string;                    // 'YYYY-MM'
  /** Monto congelado: cambiar el precio del servicio no reescribe el historial. */
  monto: number;
  /** 'cobrado' = ocurrió · 'omitido' = ese mes no se cobró. */
  estado: 'cobrado' | 'omitido';
  /** false = la app lo dio por hecho al vencer, nadie lo verificó todavía. */
  confirmado: boolean;
  fecha: string;                      // 'YYYY-MM-DD'
}

export interface Suscripcion {
  id: number;
  nombre: string;
  monto: number;
  ciclo: 'mensual' | 'anual';
  diaCobro: number;                   // 1-31
  mesCobro: number | null;            // 1-12, solo si el ciclo es anual
  activa: boolean;
  desde: string;                      // 'YYYY-MM-DD'
  /** Medio al que llega el cobro; lo heredan los gastos generados. */
  metodoPago: string;
  cargos: CargoSuscripcion[];
  /** Derivado: ¿el cargo del período en curso está cobrado? (lo usa la vista móvil) */
  pagado: boolean;
}

/** Lo que el cliente envía al dar de alta un servicio. */
export type NuevaSuscripcion = Pick<Suscripcion, 'nombre' | 'monto' | 'ciclo' | 'diaCobro'> & {
  mesCobro?: number | null;
  metodoPago?: string;
  /**
   * Desde cuándo corre el servicio ('YYYY-MM-DD'). Marca el límite hacia atrás
   * de los cobros que se dan por ocurridos: al dar de alta algo que ya tenías,
   * retrasarla hasta la fecha de cobro hace que este mes cuente.
   */
  desde?: string;
};
