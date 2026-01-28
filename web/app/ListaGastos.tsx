"use client";
import React, { useState } from 'react';
import GastosChart from './GastosChart';


export interface Gasto {
  id: number;
  descripcion: string;
  metodoPago: string;
  monto: number;
  fecha: string;
}

interface ListaGastosProps {
  gastos: Gasto[];
  onAgregarGasto: (gasto: Omit<Gasto, 'id'>) => void;
}

export default function ListaGastos({ gastos, onAgregarGasto }: ListaGastosProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");

  const handleAgregarGasto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion || !metodoPago || !monto || !fecha) return;
    onAgregarGasto({
      descripcion,
      metodoPago,
      monto: parseFloat(monto),
      fecha,
    });
    setDescripcion("");
    setMetodoPago("");
    setMonto("");
    setFecha("");
    setMostrarFormulario(false);
  };

  return (
    <div className="w-full flex flex-col">
      <button
        className="mb-4 px-4 py-2 bg-[#8e24aa] text-white rounded hover:bg-[#6d1b7b] transition self-start"
        onClick={() => setMostrarFormulario((v) => !v)}
      >
        Añadir gasto
      </button>
      {mostrarFormulario && (
        <form onSubmit={handleAgregarGasto} className="mb-6 p-4 border rounded-lg bg-gray-50 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Descripción"
            className="border px-3 py-2 rounded"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Método de pago"
            className="border px-3 py-2 rounded"
            value={metodoPago}
            onChange={e => setMetodoPago(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Monto"
            className="border px-3 py-2 rounded"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            min="0"
            step="0.01"
            required
          />
          <input
            type="date"
            className="border px-3 py-2 rounded"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            required
          />
          <div className="flex gap-2 mt-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">Guardar</button>
            <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full max-w-3xl mx-auto border border-gray-200 rounded-lg bg-white">
          <thead style={{ backgroundColor: '#ede7f6' }}>
            <tr>
              <th className="py-3 px-3 border-b font-semibold text-center" style={{ color: '#5e35b1' }}>ID</th>
              <th className="py-3 px-3 border-b font-semibold text-center" style={{ color: '#5e35b1' }}>Fecha</th>
              <th className="py-3 px-6 border-b font-semibold text-left w-[40%]" style={{ color: '#5e35b1' }}>Descripción</th>
              <th className="py-3 px-3 border-b font-semibold text-center" style={{ color: '#5e35b1' }}>Método de Pago</th>
              <th className="py-3 px-3 border-b font-semibold text-right" style={{ color: '#5e35b1' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((gasto, idx) => (
              <tr
                key={gasto.id}
                className={
                  `transition-all ` +
                  (idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f6fc]') +
                  ' hover:bg-[#ede7f6]'
                }
              >
                <td className="py-3 px-3 border-b text-center align-middle text-gray-700">{gasto.id}</td>
                <td className="py-3 px-3 border-b text-center align-middle text-gray-700">{gasto.fecha}</td>
                <td className="py-3 px-6 border-b align-middle whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] text-gray-900">{gasto.descripcion}</td>
                <td className="py-3 px-3 border-b text-center align-middle text-gray-700">{gasto.metodoPago}</td>
                <td className="py-3 px-3 border-b text-right align-middle font-semibold" style={{ color: '#8e24aa' }}>${gasto.monto.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
