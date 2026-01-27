"use client";

import ListaGastos from "./components/ListaGastos";
import GastosChart from "./components/GastosChart";
import MetodoPagoBarChart from "./components/MetodoPagoBarChart";
import { useState } from "react";
import type { Gasto } from "./components/ListaGastos";
import { agruparPorMetodo } from "./components/metodosPago";

export default function Home() {
  const [gastos, setGastos] = useState<Gasto[]>([
  { id: 1, descripcion: "Supermercado Jumbo", metodoPago: "Tarjeta", monto: 45000, fecha: "2026-01-10" },
  { id: 2, descripcion: "Transporte Uber", metodoPago: "Efectivo", monto: 8000, fecha: "2026-01-11" },
  { id: 3, descripcion: "Cine Hoyts", metodoPago: "Tarjeta", monto: 12000, fecha: "2026-02-12" },
  { id: 4, descripcion: "Farmacia Cruz Verde", metodoPago: "Débito", monto: 15000, fecha: "2026-02-13" },
  { id: 5, descripcion: "Restaurante Italiano", metodoPago: "Crédito", monto: 38000, fecha: "2026-02-14" },
  { id: 6, descripcion: "Gasolina Shell", metodoPago: "Débito", monto: 32000, fecha: "2026-03-15" },
  { id: 7, descripcion: "Internet Hogar", metodoPago: "Transferencia", monto: 27000, fecha: "2026-03-16" },
  { id: 8, descripcion: "Luz Enel", metodoPago: "Transferencia", monto: 21000, fecha: "2026-03-17" },
  { id: 9, descripcion: "Agua Andina", metodoPago: "Transferencia", monto: 18000, fecha: "2026-03-18" },
  { id: 10, descripcion: "Comida rápida", metodoPago: "Efectivo", monto: 9000, fecha: "2026-03-19" },
  { id: 11, descripcion: "Spotify", metodoPago: "Tarjeta", monto: 4300, fecha: "2026-04-20" },
  { id: 12, descripcion: "Netflix", metodoPago: "Tarjeta", monto: 8900, fecha: "2026-04-21" },
  { id: 13, descripcion: "Taxi", metodoPago: "Efectivo", monto: 7000, fecha: "2026-04-22" },
  { id: 14, descripcion: "Panadería", metodoPago: "Efectivo", monto: 3500, fecha: "2026-05-23" },
  { id: 15, descripcion: "Veterinario", metodoPago: "Débito", monto: 25000, fecha: "2026-06-24" },
  { id: 16, descripcion: "Ropa Zara", metodoPago: "Crédito", monto: 56000, fecha: "2026-07-25" },
  { id: 17, descripcion: "Clases Yoga", metodoPago: "Tarjeta", monto: 22000, fecha: "2026-07-26" },
  { id: 18, descripcion: "Café local", metodoPago: "Efectivo", monto: 2500, fecha: "2026-07-27" },
  { id: 19, descripcion: "Libro técnico", metodoPago: "Tarjeta", monto: 18000, fecha: "2026-08-28" },
  { id: 20, descripcion: "Suscripción App", metodoPago: "Crédito", monto: 5900, fecha: "2026-08-29" },
  ]);

  const handleAgregarGasto = (nuevoGasto: Omit<Gasto, "id">) => {
    setGastos(prev => [
      ...prev,
      { ...nuevoGasto, id: prev.length ? prev.at(-1)!.id + 1 : 1 }
    ]);
  };

  // --- ESTILOS ACTUALIZADOS (DARK MODE) ---
  // Fondo: zinc-900 (Gris oscuro elegante)
  // Borde: zinc-800 (Sutil)
  // Texto: se maneja con clases globales o específicas
  const cardClasses = "bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 p-6";
  
  // Títulos: Blanco puro para máximo contraste
  const sectionTitleClasses = "text-lg font-bold text-white mb-6 tracking-tight";

  return (
    // Fondo General: zinc-950 (Casi negro, da profundidad)
    <main className="min-h-screen w-full bg-zinc-950 text-zinc-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex flex-col gap-10">
        
        {/* Header */}
        <header className="pl-14 md:pl-0"> {/* Padding left extra para móvil por el botón menú */}
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Resumen de Gastos
          </h1>
          <p className="text-zinc-400 mt-2 text-lg font-medium">
            Controla y analiza tus finanzas mensuales.
          </p>
        </header>

        {/* Grid de contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* SECCIÓN 1: Lista de gastos (Ocupa 3 columnas) */}
          <section className={`lg:col-span-3 ${cardClasses}`}>
            <h2 className={sectionTitleClasses}>
              Lista de Gastos
            </h2>
            <ListaGastos gastos={gastos} onAgregarGasto={handleAgregarGasto} />
          </section>

          {/* SECCIÓN 2: Gráficos (Ocupa 2 columnas) */}
          <section className="lg:col-span-2 flex flex-col gap-8">
            
            <div className={cardClasses}>
              <h2 className={sectionTitleClasses}>
                Gastos en el tiempo
              </h2>
              {/* Asegúrate de que tus gráficos usen colores visibles en oscuro */}
              <GastosChart gastos={gastos.map(({ fecha, monto }) => ({ fecha, monto }))} />
            </div>

            <div className={cardClasses}>
              <h2 className={sectionTitleClasses}>
                Método de Pago
              </h2>
              <MetodoPagoBarChart data={agruparPorMetodo(gastos)} />
            </div>

          </section>
        </div>
      </div>
    </main>
  );
}