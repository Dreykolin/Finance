import { useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useSuscripciones } from '../../store/useSuscripciones'
import { formatCLP } from '../../lib/format'
import Modal from '../../components/Modal'
import type { Suscripcion } from '../../types'

export default function MobileSuscripciones() {
  const { suscripciones, agregar, eliminar, togglePagado, resetearPagos } = useSuscripciones()
  const [showForm, setShowForm]   = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [showReset, setShowReset] = useState(false)

  const totalMensual = suscripciones.reduce((s, sub) => s + sub.monto, 0)
  const totalPagado  = suscripciones.filter(s => s.pagado).reduce((s, sub) => s + sub.monto, 0)
  const pendientes   = suscripciones.filter(s => !s.pagado)
  const pagadas      = suscripciones.filter(s => s.pagado)

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold tracking-tight">Suscripciones</h1>
          <button onClick={() => setShowReset(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-zinc-800">
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Summary card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total mensual</p>
              <p className="text-3xl font-extrabold text-white mt-1">{formatCLP(totalMensual)}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-xs">Pagado</p>
              <p className="text-accent font-bold">{formatCLP(totalPagado)}</p>
              <p className="text-zinc-600 text-xs mt-1">{pendientes.length} pendientes</p>
            </div>
          </div>
          {totalMensual > 0 && (
            <div className="mt-3">
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(totalPagado / totalMensual) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 px-4 pb-28 flex flex-col gap-5">
        {suscripciones.length === 0 && (
          <div className="py-20 text-center text-zinc-600 text-sm">Sin suscripciones registradas</div>
        )}

        {pendientes.length > 0 && (
          <div>
            <p className="text-zinc-500 text-[11px] font-extrabold uppercase tracking-widest mb-2">Pendientes</p>
            <div className="flex flex-col gap-2">
              {pendientes.map(s => (
                <SusCard key={s.id} s={s} onToggle={togglePagado} onDelete={() => setConfirmId(s.id)} />
              ))}
            </div>
          </div>
        )}

        {pagadas.length > 0 && (
          <div>
            <p className="text-zinc-500 text-[11px] font-extrabold uppercase tracking-widest mb-2">Pagadas</p>
            <div className="flex flex-col gap-2">
              {pagadas.map(s => (
                <SusCard key={s.id} s={s} onToggle={togglePagado} onDelete={() => setConfirmId(s.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform text-white text-2xl z-30"
      >
        +
      </button>

      {/* Add */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva Suscripción">
        <FormSuscripcion onSave={s => { agregar(s); setShowForm(false) }} />
      </Modal>

      {/* Confirm delete */}
      <Modal open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar suscripción?</h2>
          <div className="flex gap-3">
            <button onClick={() => setConfirmId(null)} className="flex-1 py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-bold">Cancelar</button>
            <button onClick={() => { if (confirmId) { eliminar(confirmId); setConfirmId(null) } }} className="flex-1 py-3.5 rounded-2xl bg-red-500/20 text-red-400 font-bold">Eliminar</button>
          </div>
        </div>
      </Modal>

      {/* Reset */}
      <Modal open={showReset} onClose={() => setShowReset(false)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">Resetear pagos del mes</h2>
          <p className="text-zinc-400 text-sm">Todos los checkmarks se desmarcarán.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowReset(false)} className="flex-1 py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-bold">Cancelar</button>
            <button onClick={() => { resetearPagos(); setShowReset(false) }} className="flex-1 py-3.5 rounded-2xl bg-accent/20 text-accent font-bold">Resetear</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SusCard({ s, onToggle, onDelete }: { s: Suscripcion; onToggle: (id: number) => void; onDelete: () => void }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 flex items-center gap-4 ${s.pagado ? 'opacity-50' : ''}`}>
      <button
        onClick={() => onToggle(s.id)}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${s.pagado ? 'bg-accent border-accent' : 'border-zinc-600 active:border-accent'}`}
      >
        {s.pagado && (
          <svg width="12" height="10" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <p className={`flex-1 font-semibold text-base ${s.pagado ? 'line-through text-zinc-500' : 'text-white'}`}>{s.nombre}</p>
      <p className="text-white font-bold">{formatCLP(s.monto)}</p>
      <button onClick={onDelete} className="text-zinc-700 active:text-red-500 pl-1">
        <Trash2 size={16} />
      </button>
    </div>
  )
}

function FormSuscripcion({ onSave }: { onSave: (s: Omit<Suscripcion, 'id'>) => void }) {
  const [nombre, setNombre] = useState('')
  const [monto, setMonto]   = useState('')
  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-accent transition-colors placeholder:text-zinc-600"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre || !monto) return
    onSave({ nombre, monto: parseInt(monto), pagado: false })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input className={inputCls} placeholder="Netflix, Spotify..." value={nombre} onChange={e => setNombre(e.target.value)} required />
      <input className={inputCls} type="number" placeholder="Monto mensual" value={monto} onChange={e => setMonto(e.target.value.replace(/\D/g,''))} required />
      <button type="submit" disabled={!nombre || !monto} className="bg-accent text-white font-bold rounded-2xl py-4 disabled:opacity-40 active:opacity-80">Guardar</button>
    </form>
  )
}
