import React from 'react';
import ListaGastos from './ListaGastos';
import MetodoPagoBarChart from './MetodoPagoBarChart';

export default function GestorTarjetasPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Gestor de Tarjetas</h1>
      <section className="mb-8">
        <MetodoPagoBarChart />
      </section>
      <section>
        <ListaGastos filtroPorTarjeta={true} />
      </section>
    </main>
  );
}
