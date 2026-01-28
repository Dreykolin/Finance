"use client";
import ListaGastos from "./ListaGastos";
import GastosChart from "./GastosChart";
import MetodoPagoBarChart from "./MetodoPagoBarChart";
import React, { useState } from "react";
import type { Gasto } from "./ListaGastos";

// Lista hardcodeada de métodos de pago
const METODOS_PAGO = [
  "Efectivo",
  "Débito 1",
  "Débito 2",
  "Crédito"
];

export default function Home() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  // Estado compartido para sincronizar ambos componentes
  const [gastos, setGastos] = useState([
    { id: 1, descripcion: 'Supermercado Jumbo', metodoPago: 'Tarjeta', monto: 45000, fecha: '2026-01-10' },
    { id: 2, descripcion: 'Transporte Uber', metodoPago: 'Efectivo', monto: 8000, fecha: '2026-01-11' },
    { id: 3, descripcion: 'Cine Hoyts', metodoPago: 'Tarjeta', monto: 12000, fecha: '2026-01-12' },
    { id: 4, descripcion: 'Farmacia Cruz Verde', metodoPago: 'Débito', monto: 15000, fecha: '2026-01-13' },
    { id: 5, descripcion: 'Restaurante Italiano', metodoPago: 'Crédito', monto: 38000, fecha: '2026-01-14' },
    { id: 6, descripcion: 'Gasolina Shell', metodoPago: 'Débito', monto: 32000, fecha: '2026-01-15' },
    { id: 7, descripcion: 'Internet Hogar', metodoPago: 'Transferencia', monto: 27000, fecha: '2026-01-16' },
    { id: 8, descripcion: 'Luz Enel', metodoPago: 'Transferencia', monto: 21000, fecha: '2026-01-17' },
    { id: 9, descripcion: 'Agua Andina', metodoPago: 'Transferencia', monto: 18000, fecha: '2026-01-18' },
    { id: 10, descripcion: 'Comida rápida', metodoPago: 'Efectivo', monto: 9000, fecha: '2026-01-19' },
    { id: 11, descripcion: 'Spotify', metodoPago: 'Tarjeta', monto: 4300, fecha: '2026-01-20' },
    { id: 12, descripcion: 'Netflix', metodoPago: 'Tarjeta', monto: 8900, fecha: '2026-01-21' },
    { id: 13, descripcion: 'Taxi', metodoPago: 'Efectivo', monto: 7000, fecha: '2026-01-22' },
    { id: 14, descripcion: 'Panadería', metodoPago: 'Efectivo', monto: 3500, fecha: '2026-01-23' },
    { id: 15, descripcion: 'Veterinario', metodoPago: 'Débito', monto: 25000, fecha: '2026-01-24' },
  ]);

  // Función para agregar un gasto desde ListaGastos
  const handleAgregarGasto = (nuevoGasto: Omit<Gasto, 'id'>) => {
    setGastos((prev) => [
      ...prev,
      { ...nuevoGasto, id: prev.length ? prev[prev.length - 1].id + 1 : 1 },
    ]);
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 flex flex-col gap-8 p-0 m-0 relative">
      {/* Botón para abrir/cerrar menú */}
      <button
        className={`fixed top-6 left-6 z-50 bg-[#8e24aa] text-white rounded-full p-3 shadow-lg focus:outline-none transition-transform duration-300 hover:scale-110 ${menuAbierto ? 'left-72 md:left-72' : ''}`}
        onClick={() => setMenuAbierto((v) => !v)}
        aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        style={menuAbierto ? { transition: 'left 0.3s', left: '18rem' } : { transition: 'left 0.3s' }}
      >
        {menuAbierto ? (
          <span style={{ fontSize: 24 }}>&#10005;</span> // X
        ) : (
          <span style={{ fontSize: 24 }}>&#9776;</span> // ☰
        )}
      </button>

      {/* Menú deslizador */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-40 transform transition-transform duration-300 ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderRight: '2px solid #8e24aa' }}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#8e24aa' }}>Menú</h2>
          <ul className="flex flex-col gap-4">
            <li><a href="#" className="text-lg font-semibold text-zinc-900 hover:underline">Inicio</a></li>
            <li><a href="#" className="text-lg font-semibold text-zinc-900 hover:underline">Gastos</a></li>
            <li><a href="#" className="text-lg font-semibold text-zinc-900 hover:underline">Gráficos</a></li>
            <li><a href="#" className="text-lg font-semibold text-zinc-900 hover:underline">Métodos de Pago</a></li>
          </ul>
        </div>
      </aside>

      {/* Header eliminado para evitar superposición visual */}
      <main className="flex flex-col md:flex-row w-full max-w-7xl mx-auto gap-8 px-4 md:px-8">
        <section className="w-full md:w-3/5 flex flex-col justify-start">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#8e24aa' }}>Lista de Gastos</h2>
          <ListaGastos gastos={gastos} onAgregarGasto={handleAgregarGasto} />
        </section>
        <section className="w-full md:w-2/5 flex flex-col justify-start gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#8e24aa' }}>Gráfico de Gastos</h2>
            <GastosChart gastos={gastos.map(({ fecha, monto }) => ({ fecha, monto }))} />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#8e24aa' }}>Dinero por Método de Pago</h2>
            <MetodoPagoBarChart
              data={
                Object.entries(
                  gastos.reduce((acc, gasto) => {
                    acc[gasto.metodoPago] = (acc[gasto.metodoPago] || 0) + gasto.monto;
                    return acc;
                  }, {})
                ).map(([metodo, monto]) => ({ metodo, monto }))
              }
            />
          </div>
        </section>
      </main>
    </div>
  );
}
