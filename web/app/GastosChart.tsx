"use client";
import { Line } from 'react-chartjs-2';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface GastosChartProps {
  gastos: { fecha: string; monto: number }[];
}

export default function GastosChart({ gastos }: GastosChartProps) {
  // Agrupar gastos por semana (ventanas de 7 días, día 01 es lunes)
  if (gastos.length === 0) {
    return <div className="mb-8 bg-white p-4 rounded shadow">No hay datos suficientes.</div>;
  }

  // Encontrar la fecha mínima para saber desde dónde partir
  const fechas = gastos.map(g => parseISO(g.fecha));
  const fechaMin = fechas.reduce((a, b) => (a < b ? a : b));

  // Agrupar por semana
  const semanas: { [semana: string]: number } = {};
  gastos.forEach(g => {
    const dias = differenceInCalendarDays(parseISO(g.fecha), fechaMin);
    const semana = Math.floor(dias / 7) + 1;
    const key = `Semana ${semana}`;
    semanas[key] = (semanas[key] || 0) + g.monto;
  });

  const labels = Object.keys(semanas);
  const data = Object.values(semanas);

  return (
    <div className="mb-8 bg-white p-4 rounded shadow">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'Monto',
              data,
              borderColor: '#8e24aa',
              backgroundColor: 'rgba(142, 36, 170, 0.15)',
              tension: 0.3,
              fill: true,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { display: true, position: 'top' as const, labels: { color: '#8e24aa' } },
            title: { display: true, text: 'Gastos por Semana', color: '#8e24aa' },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed.y;
                  return `Monto: $${Math.round(value / 1000).toLocaleString('es-CL')} mil`;
                },
              },
            },
          },
          scales: {
            x: {
              title: { display: true, text: 'Semana', color: '#8e24aa' },
              ticks: { color: '#8e24aa' },
              grid: { color: 'rgba(142, 36, 170, 0.08)' },
            },
            y: {
              title: { display: true, text: 'Monto ($ mil)', color: '#8e24aa' },
              beginAtZero: true,
              ticks: {
                color: '#8e24aa',
                callback: (value) => `$${Number(value).toLocaleString('es-CL')} mil`,
              },
              grid: { color: 'rgba(142, 36, 170, 0.08)' },
            },
          },
        }}
      />
    </div>
  );
}
