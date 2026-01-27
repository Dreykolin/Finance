import type { Gasto } from "./ListaGastos";

// Lista por defecto de métodos de pago (puedes ampliarla o derivarla dinámicamente)
export const METODOS_PAGO: string[] = [
  "Efectivo",
  "Débito",
  "Crédito",
  "Tarjeta",
  "Transferencia",
  "Otro",
];

// Agrupa un array de gastos por método de pago y devuelve el formato
// esperado por MetodoPagoBarChart: { metodo, monto }[]
export function agruparPorMetodo(gastos: Gasto[]): { metodo: string; monto: number }[] {
  const totales = gastos.reduce<Record<string, number>>((acc, gasto) => {
    const metodo = gasto.metodoPago ?? "Desconocido";
    acc[metodo] = (acc[metodo] || 0) + gasto.monto;
    return acc;
  }, {});

  return Object.entries(totales).map(([metodo, monto]) => ({ metodo, monto }));
}
