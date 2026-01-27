"use client";
import ListaGastos from "../ListaGastos";
import MetodoPagoBarChart from "../MetodoPagoBarChart";
import React, { useState } from "react";
import type { Gasto } from "../ListaGastos";

export default function GestorTarjetasPage() {
  // Estado de ejemplo para gastos por tarjeta
  const [gastos, setGastos] = useState([
    { id: 1, descripcion: 'Supermercado Jumbo', metodoPago: 'Visa', monto: 45000, fecha: '2026-01-10' },
    { id: 2, descripcion: 'Cine Hoyts', metodoPago: 'Mastercard', monto: 12000, fecha: '2026-01-12' },
    { id: 3, descripcion: 'Spotify', metodoPago: 'Visa', monto: 4300, fecha: '2026-01-20' },
    { id: 4, descripcion: 'Netflix', metodoPago: 'Mastercard', monto: 8900, fecha: '2026-01-21' },
    { id: 5, descripcion: 'Amazon', metodoPago: 'Visa', monto: 25000, fecha: '2026-01-24' },
  ]);

  const handleAgregarGasto = (nuevoGasto: Omit<Gasto, 'id'>) => {
    setGastos((prev) => [
      ...prev,
      { ...nuevoGasto, id: prev.length ? prev[prev.length - 1].id + 1 : 1 },
    ]);
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 flex flex-col gap-8 p-0 m-0">
      <header className="w-full py-6" style={{ backgroundColor: '#8e24aa' }}>
        <span className="text-white text-center text-3xl font-bold shadow block">Gestor de Tarjetas</span>
      </header>
      <main className="flex flex-col md:flex-row w-full max-w-7xl mx-auto gap-8 px-4 md:px-8">
        <section className="w-full md:w-3/5 flex flex-col justify-start">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#8e24aa' }}>Lista de Gastos por Tarjeta</h2>
          <ListaGastos gastos={gastos} onAgregarGasto={handleAgregarGasto} />
        </section>
        <section className="w-full md:w-2/5 flex flex-col justify-start gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#8e24aa' }}>Dinero por Tarjeta</h2>
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
