"use client";
import React, { useState } from "react";
// Importamos el componente con el nuevo nombre de archivo
import CuotasPieChart from "../components/cuotasPiechart";

// Tipo de dato para una compra en cuotas
interface CompraCuotas {
  id: number;
  producto: string;
  tienda: string;
  cuotasTotales: number;
  cuotasPagadas: number;
  montoCuota: number;
  fechaInicio: string;
}

export default function GestorCuotasPage() {
  // Datos simulados
  const compras: CompraCuotas[] = [
    { id: 1, producto: "MacBook Pro M3", tienda: "MacOnline", cuotasTotales: 12, cuotasPagadas: 4, montoCuota: 180000, fechaInicio: "2025-10-01" },
    { id: 2, producto: "iPhone 15 Pro", tienda: "Falabella", cuotasTotales: 24, cuotasPagadas: 12, montoCuota: 65000, fechaInicio: "2025-02-15" },
    { id: 3, producto: "Smart TV Samsung", tienda: "Paris", cuotasTotales: 6, cuotasPagadas: 5, montoCuota: 85000, fechaInicio: "2025-09-10" },
    { id: 4, producto: "Muebles Terraza", tienda: "Sodimac", cuotasTotales: 3, cuotasPagadas: 1, montoCuota: 120000, fechaInicio: "2026-01-05" },
  ];

  const [selectedCompra, setSelectedCompra] = useState<CompraCuotas>(compras[0]);

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 p-8 md:p-12">
      <header className="mb-10 pl-12 md:pl-0">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          Seguimiento de Cuotas
        </h1>
        <p className="text-zinc-400 text-lg">
          Controla tus compras a plazo y deuda restante.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
        
        {/* COLUMNA IZQUIERDA: LISTA DE COMPRAS */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          {compras.map((compra) => (
            <div
              key={compra.id}
              onClick={() => setSelectedCompra(compra)}
              className={`p-6 rounded-xl border cursor-pointer transition-all duration-300 group relative overflow-hidden select-none
                ${selectedCompra.id === compra.id 
                  ? "bg-zinc-900 border-zinc-600 shadow-xl scale-[1.01]" 
                  : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700"
                }`}
            >
              {/* Barra de progreso sutil */}
              <div 
                className="absolute bottom-0 left-0 h-[2px] bg-white transition-all duration-1000 ease-out opacity-30"
                style={{ width: `${(compra.cuotasPagadas / compra.cuotasTotales) * 100}%` }}
              />

              <div className="flex justify-between items-center relative z-10">
                <div className="flex flex-col gap-1">
                  <h3 className={`font-bold text-lg transition-colors ${selectedCompra.id === compra.id ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                    {compra.producto}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <span className="font-medium text-zinc-400">{compra.tienda}</span>
                    <span>•</span>
                    <span>${compra.montoCuota.toLocaleString('es-CL')}/mes</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-mono font-bold text-white tracking-tight">
                    {compra.cuotasPagadas}<span className="text-zinc-600 text-xl font-normal">/{compra.cuotasTotales}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">
                    Cuotas Pagadas
                  </div>
                </div>
              </div>
            </div>
          ))}
            
            <button className="mt-2 border-2 border-dashed border-zinc-800 text-zinc-500 py-4 rounded-xl hover:bg-zinc-900 hover:text-white hover:border-zinc-600 transition-all font-medium">
                + Registrar nueva compra en cuotas
            </button>
        </section>

        {/* COLUMNA DERECHA: DETALLE Y GRÁFICO (STICKY) */}
        <section className="lg:col-span-1">
          <div className="sticky top-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-lg font-bold text-zinc-400 mb-6 uppercase tracking-widest w-full text-center border-b border-zinc-800 pb-4">
              Estado de Deuda
            </h2>
            
            {/* AQUÍ ESTÁ EL COMPONENTE IMPORTADO */}
            <div className="mb-8">
                <CuotasPieChart 
                    cuotasPagadas={selectedCompra.cuotasPagadas} 
                    cuotasTotales={selectedCompra.cuotasTotales} 
                />
            </div>

            {/* Resumen de Montos */}
            <div className="w-full space-y-4 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Total Compra</span>
                    <span className="text-white font-medium text-base">${(selectedCompra.cuotasTotales * selectedCompra.montoCuota).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Pagado</span>
                    <span className="text-zinc-300 font-medium">${(selectedCompra.cuotasPagadas * selectedCompra.montoCuota).toLocaleString('es-CL')}</span>
                </div>
                <div className="w-full h-px bg-zinc-800 my-2"></div>
                <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-semibold">Deuda Restante</span>
                    <span className="text-white font-bold text-lg">${((selectedCompra.cuotasTotales - selectedCompra.cuotasPagadas) * selectedCompra.montoCuota).toLocaleString('es-CL')}</span>
                </div>
            </div>

            <button className="w-full mt-8 bg-white text-zinc-950 font-bold py-3 px-4 rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5">
                Ver historial de pagos
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}