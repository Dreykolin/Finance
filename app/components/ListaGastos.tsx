"use client";

import React, { useState } from "react";

export interface Gasto {
  id: number;
  descripcion: string;
  metodoPago: string;
  monto: number;
  fecha: string;
}

interface ListaGastosProps {
  gastos: Gasto[];
  onAgregarGasto: (gasto: Omit<Gasto, "id">) => void;
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

  const inputClass = "bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-white focus:border-white block w-full p-2.5 outline-none transition-colors placeholder-zinc-600";
  const labelClass = "block mb-1 text-xs font-medium text-zinc-400 uppercase tracking-wide";

  return (
    <div className="w-full flex flex-col">
      <button
        className={`mb-6 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md self-start text-sm
          ${mostrarFormulario 
            ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" 
            : "bg-zinc-100 text-zinc-950 hover:bg-white hover:scale-105"
          }`}
        onClick={() => setMostrarFormulario((v) => !v)}
      >
        {mostrarFormulario ? "✕ Cancelar" : "+ Añadir gasto"}
      </button>

      {mostrarFormulario && (
        <form onSubmit={handleAgregarGasto} className="mb-8 p-6 border border-zinc-800 rounded-xl bg-zinc-900/50 flex flex-col gap-5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
               <label className={labelClass}>Descripción</label>
               <input
                type="text"
                placeholder="Ej. Compra semanal"
                className={inputClass}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className={labelClass}>Monto</label>
                   <input
                    type="number"
                    placeholder="0.00"
                    className={inputClass}
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                    <label className={labelClass}>Fecha</label>
                    <input
                        type="date"
                        className={inputClass}
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        required
                    />
                </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
             <div className="w-full md:w-1/2">
                <label className={labelClass}>Método de Pago</label>
                <select
                    className={inputClass}
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    required
                >
                    <option value="" disabled>Seleccionar...</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                </select>
             </div>
             
             <div className="flex gap-3 w-full md:w-auto">
                <button 
                    type="submit" 
                    className="flex-1 md:flex-none bg-zinc-100 text-zinc-900 font-bold px-6 py-2.5 rounded-lg hover:bg-white transition-colors shadow-sm"
                >
                    Guardar
                </button>
             </div>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-800/50 shadow-inner bg-zinc-900/30">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="py-4 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">ID</th>
              <th className="py-4 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Fecha</th>
              <th className="py-4 px-6 text-xs font-bold text-zinc-500 uppercase tracking-wider text-left w-[40%]">Descripción</th>
              <th className="py-4 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Método</th>
              <th className="py-4 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {gastos.map((gasto) => (
              <tr
                key={gasto.id}
                // CLASE PRINCIPAL: Al hacer hover, el fondo cambia a blanco (zinc-100)
                // Usamos 'group' para poder referenciar este estado en los hijos
                className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-100 transition-colors duration-200 group cursor-default"
              >
                {/* ID: Normal (Gris medio) -> Hover (Gris oscuro) */}
                <td className="py-4 px-4 text-center text-zinc-600 font-mono group-hover:text-zinc-500 transition-colors">
                    {gasto.id}
                </td>

                {/* FECHA: Normal (Gris claro) -> Hover (Gris oscuro) */}
                <td className="py-4 px-4 text-center text-zinc-400 group-hover:text-zinc-500 transition-colors">
                    {gasto.fecha}
                </td>

                {/* DESCRIPCIÓN: EL ARREGLO IMPORTANTE 
                    Normal: text-zinc-200 (Blanco suave)
                    Hover: group-hover:text-zinc-900 (Negro casi puro) para que se lea sobre blanco
                */}
                <td className="py-4 px-6 text-zinc-200 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] group-hover:text-zinc-900 transition-colors">
                    {gasto.descripcion}
                </td>

                {/* MÉTODO: También invertimos los colores del badge */}
                <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50 group-hover:bg-zinc-200 group-hover:text-zinc-800 group-hover:border-zinc-300 transition-colors">
                        {gasto.metodoPago}
                    </span>
                </td>

                {/* MONTO: Normal (Blanco) -> Hover (Negro fuerte) */}
                <td className="py-4 px-4 text-right font-bold text-white tracking-wide group-hover:text-zinc-950 transition-colors">
                    ${gasto.monto.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
            {gastos.length === 0 && (
                <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-600 italic">
                        No hay gastos registrados aún.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}