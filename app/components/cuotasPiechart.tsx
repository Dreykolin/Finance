"use client";
import React from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  ChartData,
  ChartOptions
} from "chart.js";

ChartJS.register(ArcElement, Tooltip);

interface CuotasPieChartProps {
  cuotasPagadas: number;
  cuotasTotales: number;
}

export default function CuotasPieChart({ cuotasPagadas, cuotasTotales }: CuotasPieChartProps) {
  const chartData: ChartData<"doughnut"> = {
    labels: ["Pagadas", "Pendientes"],
    datasets: [
      {
        data: [cuotasPagadas, cuotasTotales - cuotasPagadas],
        backgroundColor: [
          "#ffffff", // Pagadas: Blanco puro
          "rgba(255, 255, 255, 0.1)", // Pendientes: Gris transparente
        ],
        borderColor: ["#ffffff", "rgba(255, 255, 255, 0.1)"],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const chartOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, 
      },
      tooltip: {
         backgroundColor: 'rgba(24, 24, 27, 0.95)',
         bodyColor: '#e4e4e7',
         callbacks: {
            label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                return ` ${label}: ${value} cuotas`;
            }
         }
      }
    },
    cutout: "85%",
  };

  const porcentaje = Math.round((cuotasPagadas / cuotasTotales) * 100);

  return (
    // AQUÍ ESTÁ LA MAGIA:
    // flex-row: pone gráfico y leyenda uno al lado del otro
    // justify-center: los centra en el contenedor
    // gap-10: les da aire entre medio
    <div className="flex flex-row items-center justify-center gap-10 w-full py-4">
      
      {/* Gráfico */}
      <div className="relative w-36 h-36 shrink-0">
        <Doughnut data={chartData} options={chartOptions} />
        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
          <span className="text-3xl font-bold text-white tracking-tighter">{porcentaje}%</span>
          <span className="text-[10px] text-zinc-500 uppercase font-semibold mt-0.5">Listo</span>
        </div>
      </div>
      
      {/* Leyenda Lateral */}
      <div className="flex flex-col gap-5 min-w-[100px]">
        {/* Item Pagadas */}
        <div className="flex items-center gap-3 group">
            <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] group-hover:scale-125 transition-transform"></span>
            <div className="flex flex-col">
                <span className="text-xl font-bold text-white leading-none">{cuotasPagadas}</span>
                <span className="text-xs text-zinc-400 font-medium mt-1">Pagadas</span>
            </div>
        </div>

        {/* Item Pendientes */}
        <div className="flex items-center gap-3 group">
            <span className="w-2 h-2 rounded-full bg-zinc-700 group-hover:bg-zinc-600 transition-colors"></span>
            <div className="flex flex-col">
                <span className="text-xl font-bold text-zinc-500 leading-none group-hover:text-zinc-400 transition-colors">{cuotasTotales - cuotasPagadas}</span>
                <span className="text-xs text-zinc-600 font-medium mt-1">Restantes</span>
            </div>
        </div>
      </div>
    </div>
  );
}