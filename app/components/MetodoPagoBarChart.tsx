"use client";

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  TooltipItem
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Tipos de datos
interface DataItem {
  metodo: string;
  monto: number;
}

interface MetodoPagoBarChartProps {
  data: DataItem[];
}

const MetodoPagoBarChart = ({ data }: MetodoPagoBarChartProps) => {
  const labels = data.map(item => item.metodo);
  const montos = data.map(item => item.monto);

  // Configuración de datos y colores para modo oscuro
  const chartData: ChartData<'bar'> = {
    labels,
    datasets: [
      {
        label: 'Monto',
        data: montos,
        // Usamos blanco con opacidad para que resalte sobre el fondo oscuro
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        hoverBackgroundColor: '#ffffff',
        borderRadius: 6, // Bordes redondeados modernos
        borderSkipped: false,
        barThickness: 40, // Barras más delgadas y elegantes
      },
    ],
  };

  // Opciones de configuración visual
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false, // Permite ajustar altura con CSS
    plugins: {
      legend: {
        display: false, // Ocultamos la leyenda para más limpieza (ya sabemos que es dinero)
      },
      title: {
        display: false, // El título ya está en la tarjeta HTML
      },
      tooltip: {
        // Tooltip estilo "dark glass"
        backgroundColor: 'rgba(24, 24, 27, 0.95)', // zinc-950
        titleColor: '#ffffff',
        bodyColor: '#e4e4e7', // zinc-200
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false, // Quitar cuadrito de color en tooltip
        callbacks: {
            label: (context: TooltipItem<'bar'>) => {
                return `$ ${context.raw?.toLocaleString()}`;
            }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        border: {
            display: false, // Sin línea de eje vertical
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)', // Líneas de guía muy sutiles
        },
        ticks: {
          color: '#a1a1aa', // zinc-400 (texto secundario)
          font: {
            size: 11,
            family: 'sans-serif'
          },
          callback: function(value) {
            return '$' + value.toLocaleString(); // Formato moneda
          },
          maxTicksLimit: 6,
          padding: 10
        },
      },
      x: {
        border: {
            display: false,
        },
        grid: {
          display: false, // Sin líneas verticales para limpieza
        },
        ticks: {
          color: '#e4e4e7', // zinc-200 (texto principal brillante)
          font: {
             weight: 'bold',
             size: 12
          },
          padding: 10
        },
      },
    },
    layout: {
        padding: {
            top: 10,
            bottom: 10
        }
    }
  };

  // Contenedor con altura fija para evitar colapsos
  return (
    <div className="w-full h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default MetodoPagoBarChart;