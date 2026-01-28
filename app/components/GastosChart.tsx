"use client";
import { Line } from 'react-chartjs-2';
import { parseISO } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
  TooltipItem
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface GastosChartProps {
  gastos: { fecha: string; monto: number }[];
  presupuestoMensual?: number; // Nueva prop opcional
}

export default function GastosChart({ gastos, presupuestoMensual = 90000 }: GastosChartProps) {
  // Manejo de estado vacío
  if (gastos.length === 0) {
    return (
        <div className="flex items-center justify-center h-64 text-zinc-500 text-sm italic">
            No hay datos suficientes para generar el gráfico.
        </div>
    );
  }

  // --- LÓGICA DE AGRUPACIÓN POR MES ---
  
  // 1. Crear un diccionario para acumular montos por mes (Clave: YYYY-MM)
  const porMes: { [key: string]: number } = {};

  // 2. Ordenar gastos cronológicamente antes de procesar
  const gastosOrdenados = [...gastos].sort((a, b) => a.fecha.localeCompare(b.fecha));

  gastosOrdenados.forEach(g => {
    // Asumimos que la fecha viene en formato ISO (YYYY-MM-DD)
    const fecha = parseISO(g.fecha);
    
    // Generamos la clave "2026-01", "2026-02" para agrupar y ordenar fácil
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    
    porMes[key] = (porMes[key] || 0) + g.monto;
  });

  // 3. Extraer claves y asegurar orden cronológico
  const keys = Object.keys(porMes).sort();

  // 4. Generar etiquetas legibles (ej: "Ene", "Feb")
  const labels = keys.map(key => {
    const [year, month] = key.split('-').map(Number);
    // Crear fecha (día 1 del mes) para usar el localizador
    const date = new Date(year, month - 1, 1);
    // Obtener nombre corto del mes en español (ej: "ene")
    const nombreMes = date.toLocaleString('es-CL', { month: 'short' });
    // Capitalizar primera letra (ej: "Ene")
    return nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
  });

  const data = keys.map(key => porMes[key]);

  // --- CONFIGURACIÓN DEL GRÁFICO ---

  // Configuración de Datos (Estilo Dark Mode)
  const chartData: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: 'Monto Real',
        data,
        borderColor: '#ffffff', // Línea blanca pura
        backgroundColor: 'rgba(255, 255, 255, 0.05)', // Relleno muy sutil
        pointBackgroundColor: '#18181b', // Centro del punto negro (zinc-950)
        pointBorderColor: '#ffffff', // Borde del punto blanco
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#ffffff',
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4, // Curva suave (bezier)
        fill: true,
        order: 2, // Para que quede por encima del presupuesto si se cruzan
      },
      // --- NUEVO DATASET: LÍNEA DE PRESUPUESTO ---
      {
        label: 'Tope Presupuestario',
        data: new Array(labels.length).fill(presupuestoMensual), // Línea constante
        borderColor: 'rgba(239, 68, 68, 0.6)', // Rojo sutil (red-500 con opacidad)
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 6], // Línea punteada
        pointRadius: 0, // Sin puntos, solo la línea de referencia
        pointHoverRadius: 0,
        tension: 0, // Línea completamente recta
        fill: false,
        order: 1, // Para que quede detrás de la línea de gastos
      }
    ],
  };

  // Opciones de Configuración (Estilo Minimalista Oscuro)
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index', // Muestra ambos tooltips al pasar por el eje X
        intersect: false,
    },
    plugins: {
      legend: { 
        display: false 
      },
      title: { 
        display: false 
      },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)', // zinc-950
        titleColor: '#ffffff',
        bodyColor: '#e4e4e7',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true, // Mostrar cuadrito de color para distinguir gasto de presupuesto
        boxPadding: 4,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const parsed = (context.parsed as any);
            const rawValue: number = typeof parsed === 'number' ? parsed : (parsed?.y ?? 0);
            return `${context.dataset.label}: $ ${Number(rawValue).toLocaleString('es-CL')}`;
          },
          title: (tooltipItems) => {
            return tooltipItems[0].label;
          }
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: { 
            color: '#a1a1aa', // zinc-400
            font: { size: 12, weight: 'bold' } 
        },
        grid: { 
            display: false
        },
        border: { display: false }
      },
      y: {
        title: { display: false },
        beginAtZero: true,
        // Sugerir el máximo para que la línea de presupuesto siempre se vea, 
        // incluso si los gastos son bajos
        suggestedMax: presupuestoMensual * 1.1, 
        ticks: {
          color: '#71717a', // zinc-500
          font: { size: 10 },
          callback: (value) => {
            const num = Number(value);
            if (num >= 1000000) return `$${(num/1000000).toFixed(1)}M`; // Millones
            if (num >= 1000) return `$${(num/1000).toFixed(0)}k`; // Miles
            return `$${num}`;
          },
          maxTicksLimit: 5,
          padding: 10
        },
        grid: { 
            color: 'rgba(255, 255, 255, 0.05)',
        },
        border: { display: false }
      },
    },
    layout: {
        padding: { top: 10, bottom: 10, left: 0, right: 0 }
    }
  };

  return (
    <div className="w-full h-64">
      <Line data={chartData} options={options} />
    </div>
  );
}