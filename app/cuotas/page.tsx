"use client";
import React, { useState } from "react";
import { Check, CreditCard, ShoppingBag, Calendar } from "lucide-react";
import CuotasPieChart from "../components/cuotasPiechart";

export default function GestorCuotasPage() {
  // Datos simulados
  const compras = [
    { id: 1, producto: "MacBook Pro M3", tienda: "MacOnline", cuotasTotales: 12, cuotasPagadas: 4, montoCuota: 180000, fechaInicio: "2025-10-01" },
    { id: 2, producto: "iPhone 15 Pro", tienda: "Falabella", cuotasTotales: 24, cuotasPagadas: 12, montoCuota: 65000, fechaInicio: "2025-02-15" },
    { id: 3, producto: "Smart TV Samsung", tienda: "Paris", cuotasTotales: 6, cuotasPagadas: 5, montoCuota: 85000, fechaInicio: "2025-09-10" },
    { id: 4, producto: "Muebles Terraza", tienda: "Sodimac", cuotasTotales: 3, cuotasPagadas: 1, montoCuota: 120000, fechaInicio: "2026-01-05" },
  ];

  const [selectedCompra, setSelectedCompra] = useState(compras[0]);

  return (
    // Agregamos 'flex flex-col items-center justify-center' al contenedor padre para centrar todo
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 flex flex-col items-center justify-center">
      
      {/* Contenedor principal limitado (max-w-5xl) para alinear header y contenido */}
      <div className="w-full max-w-6xl space-y-8">
        
        {/* HEADER CENTRADO EN RELACIÓN AL CONTENIDO */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-white" />
              Seguimiento de Cuotas
            </h1>
            <p className="text-zinc-400 text-lg">
              Controla tus compras a plazo y deuda restante.
            </p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Total Deuda Activa</p>
            <p className="text-2xl font-bold text-white">$1.850.000</p>
          </div>
        </header>

        {/* GRID DE CONTENIDO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMNA IZQUIERDA: LISTA DE COMPRAS */}
          <section className="lg:col-span-2 flex flex-col gap-4">
            {compras.map((compra) => (
              <div
                key={compra.id}
                onClick={() => setSelectedCompra(compra)}
                className={`p-6 rounded-xl border cursor-pointer transition-all duration-300 group relative overflow-hidden select-none
                  ${selectedCompra.id === compra.id 
                    ? "bg-zinc-900 border-zinc-500 shadow-2xl scale-[1.01]" 
                    : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-600"
                  }`}
              >
                {/* Barra de progreso de fondo */}
                <div 
                  className="absolute bottom-0 left-0 h-[3px] bg-white transition-all duration-1000 ease-out opacity-40 z-20"
                  style={{ width: `${(compra.cuotasPagadas / compra.cuotasTotales) * 100}%` }}
                />

                <div className="flex justify-between items-center relative z-10">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${selectedCompra.id === compra.id ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {compra.tienda}
                      </span>
                    </div>
                    <h3 className={`font-bold text-xl transition-colors ${selectedCompra.id === compra.id ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                      {compra.producto}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                      <ShoppingBag size={14} />
                      <span>${compra.montoCuota.toLocaleString('es-CL')}/mes</span>
                      <span className="mx-1 text-zinc-700">|</span>
                      <Calendar size={14} />
                      <span>Inicio: {compra.fechaInicio}</span>
                    </div>
                  </div>
                  
                  <div className="text-right pl-4">
                    <div className="text-3xl font-mono font-bold text-white tracking-tight flex items-baseline justify-end gap-1">
                      {compra.cuotasPagadas}<span className="text-zinc-600 text-xl font-normal">/{compra.cuotasTotales}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">
                      Pagadas
                    </div>
                  </div>
                </div>
              </div>
            ))}
              
            <button className="mt-2 border-2 border-dashed border-zinc-800 text-zinc-500 py-4 rounded-xl hover:bg-zinc-900 hover:text-white hover:border-zinc-600 transition-all font-medium flex items-center justify-center gap-2">
                <span>+</span> Registrar nueva compra
            </button>
          </section>

          {/* COLUMNA DERECHA: DETALLE Y GRÁFICO (STICKY) */}
          <section className="lg:col-span-1">
            <div className="sticky top-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:p-8 shadow-2xl flex flex-col items-center">
              <h2 className="text-xs font-bold text-zinc-500 mb-8 uppercase tracking-[0.2em] w-full text-center border-b border-zinc-800 pb-4">
                Estado Actual
              </h2>
              
              <div className="mb-8 scale-110">
                <CuotasPieChart 
                  cuotasPagadas={selectedCompra.cuotasPagadas} 
                  cuotasTotales={selectedCompra.cuotasTotales} 
                />
              </div>

              {/* Resumen de Montos */}
              <div className="w-full space-y-4 text-sm bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Total Compra</span>
                  <span className="text-white font-medium text-base">${(selectedCompra.cuotasTotales * selectedCompra.montoCuota).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Pagado <span className="text-xs text-zinc-600">({selectedCompra.cuotasPagadas}x)</span></span>
                  <span className="text-emerald-500 font-medium">+ ${(selectedCompra.cuotasPagadas * selectedCompra.montoCuota).toLocaleString('es-CL')}</span>
                </div>
                <div className="w-full h-px bg-zinc-800 my-1"></div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-zinc-400 font-semibold">Deuda Restante</span>
                  <span className="text-white font-bold text-lg">${((selectedCompra.cuotasTotales - selectedCompra.cuotasPagadas) * selectedCompra.montoCuota).toLocaleString('es-CL')}</span>
                </div>
              </div>

              <button className="w-full mt-6 bg-white text-zinc-950 font-bold py-3 px-4 rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5 flex items-center justify-center gap-2">
                <Check size={18} />
                Ver historial de pagos
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}