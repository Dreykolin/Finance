export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export function mesLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-');
  return new Date(+y, +m - 1).toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
}
