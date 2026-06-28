import { useState } from 'react'
import { Repeat2, Trash2, RotateCcw } from 'lucide-react'
import { useSuscripciones } from '../store/useSuscripciones'
import Modal from '../components/Modal'
import { formatCLP } from '../lib/format'
import type { Suscripcion } from '../types'

export default function Suscripciones() {
  const { suscripciones, agregar, eliminar, togglePagado, resetearPagos } = useSuscripciones()
  const [showForm, setShowForm] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [showReset, setShowReset] = useState(false)

  const totalMensual = suscripciones.reduce((s, sub) => s + sub.monto, 0)
  const totalPagado  = suscripciones.filter(s => s.pagado).reduce((s, sub) => s + sub.monto, 0)
  const pendientes   = suscripciones.filter(s => !s.pagado).length

  return (
    <div className="min-h-full bg-zinc-950 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Repeat2 size={22} className="text-accent" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Suscripciones</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Pagos recurrentes mensuales</p>
          </div>
        </div>
        <button
          onClick={() => setShowReset(true)}
          className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Resetear pagos del mes"
        >
          <RotateCcw size={17} />
        </button>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total</p>
            <p className="text-white font-bold text-sm">{formatCLP(totalMensual)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Pagado</p>
            <p className="text-accent font-bold text-sm">{formatCLP(totalPagado)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Pendientes</p>
            <p className={`font-bold text-sm ${pendientes > 0 ? 'text-yellow-400' : 'text-zinc-600'}`}>
              {pendientes}
            </p>
          </div>
        </div>

        {/* Lista */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase">
              Servicios
            </span>
            <button
              onClick={() => setShowForm(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showForm ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-zinc-950'
              }`}
            >
              {showForm ? 'Cerrar' : '+ Añadir'}
            </button>
          </div>

          {showForm && (
            <div className="mb-4">
              <FormNuevaSuscripcion
                onSave={s => { agregar(s); setShowForm(false) }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {suscripciones.length === 0 && (
              <p className="py-10 text-center text-zinc-700 text-sm">
                Sin suscripciones registradas.
              </p>
            )}

            {suscripciones.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center gap-4 px-4 py-4 transition-colors ${
                  i < suscripciones.length - 1 ? 'border-b border-zinc-800/60' : ''
                } ${s.pagado ? 'opacity-50' : ''}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => togglePagado(s.id)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    s.pagado
                      ? 'bg-accent border-accent'
                      : 'border-zinc-600 hover:border-accent'
                  }`}
                >
                  {s.pagado && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${s.pagado ? 'line-through text-zinc-500' : 'text-white'}`}>
                    {s.nombre}
                  </p>
                </div>

                {/* Monto */}
                <span className="font-bold text-sm text-white whitespace-nowrap">
                  {formatCLP(s.monto)}
                </span>

                {/* Delete */}
                <button
                  onClick={() => setConfirmId(s.id)}
                  className="text-zinc-700 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm delete */}
      <Modal open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar suscripción?</h2>
          <p className="text-zinc-400 text-sm">Se borrará permanentemente.</p>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setConfirmId(null)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm">Cancelar</button>
            <button
              onClick={() => { if (confirmId) { eliminar(confirmId); setConfirmId(null) } }}
              className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-sm"
            >Eliminar</button>
          </div>
        </div>
      </Modal>

      {/* Confirm reset */}
      <Modal open={showReset} onClose={() => setShowReset(false)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">Resetear pagos del mes</h2>
          <p className="text-zinc-400 text-sm">Todos los checkmarks se desmarcarán. Útil al comenzar un nuevo mes.</p>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowReset(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm">Cancelar</button>
            <button
              onClick={() => { resetearPagos(); setShowReset(false) }}
              className="flex-1 py-3 rounded-xl bg-accent/20 text-accent font-bold text-sm"
            >Resetear</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function FormNuevaSuscripcion({
  onSave, onCancel,
}: {
  onSave: (s: Omit<Suscripcion, 'id'>) => void
  onCancel: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')

  const inputCls = "bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent transition-colors placeholder:text-zinc-600 w-full"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre || !monto) return
    onSave({ nombre, monto: parseInt(monto), pagado: false })
  }

  return (
    <form onSubmit={submit} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 animate-slide-up">
      <input
        className={inputCls}
        placeholder="Nombre (ej: Netflix, Spotify)"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        required
      />
      <input
        className={inputCls}
        type="number"
        placeholder="Monto mensual"
        value={monto}
        onChange={e => setMonto(e.target.value.replace(/\D/g, ''))}
        min="0"
        required
      />
      <button
        type="submit"
        disabled={!nombre || !monto}
        className="bg-accent text-white font-bold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        Guardar
      </button>
    </form>
  )
}
