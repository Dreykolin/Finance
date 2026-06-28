import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { useCuotas } from '../../store/useCuotas'
import { formatCLP, formatFecha } from '../../lib/format'
import Modal from '../../components/Modal'
import type { CompraCuotas } from '../../types'

function RingProgress({ value, total, size = 56, stroke = 5 }: { value: number; total: number; size?: number; stroke?: number }) {
  const pct  = total > 0 ? value / total : 0
  const r    = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#8b5cf6" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-white leading-none" style={{ fontSize: size * 0.22 }}>
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  )
}

export default function MobileCuotas() {
  const { cuotas, agregar, eliminar, marcarCuota } = useCuotas()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [confirmId, setConfirmId]   = useState<number | null>(null)

  const activas      = cuotas.filter(c => c.cuotasPagadas < c.cuotasTotales)
  const cargaMensual = activas.reduce((s, c) => s + c.montoCuota, 0)
  const selected     = cuotas.find(c => c.id === selectedId) ?? null

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-extrabold tracking-tight mb-4">Cuotas</h1>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Carga mensual</p>
            <p className="text-3xl font-extrabold text-white mt-1">{formatCLP(cargaMensual)}</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-600 text-xs">{activas.length} activas</p>
            <p className="text-zinc-500 text-xs">{cuotas.length - activas.length} completadas</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 pb-28 flex flex-col gap-3">
        {cuotas.length === 0 && (
          <div className="py-20 text-center text-zinc-600 text-sm">Sin productos registrados</div>
        )}

        {cuotas.map(c => {
          const completada = c.cuotasPagadas >= c.cuotasTotales
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 active:bg-zinc-800 transition-colors text-left"
            >
              <RingProgress value={c.cuotasPagadas} total={c.cuotasTotales} />
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-base truncate ${completada ? 'text-zinc-500' : 'text-white'}`}>{c.producto}</p>
                <p className="text-zinc-500 text-sm">{c.tienda}</p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  {c.cuotasPagadas}/{c.cuotasTotales} · {formatCLP(c.montoCuota)}/cuota
                </p>
              </div>
              {completada && (
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">Listo</span>
              )}
            </button>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform text-white text-2xl z-30"
      >
        +
      </button>

      {/* Detail modal */}
      <Modal open={selected !== null} onClose={() => setSelectedId(null)} title={selected?.producto}>
        {selected && (
          <div className="flex flex-col items-center gap-5">
            <p className="text-zinc-500 text-sm -mt-2">{selected.tienda}</p>
            <RingProgress value={selected.cuotasPagadas} total={selected.cuotasTotales} size={110} stroke={9} />
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Total</span>
                <span className="text-white font-bold">{formatCLP(selected.cuotasTotales * selected.montoCuota)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Por cuota</span>
                <span className="text-accent font-bold">{formatCLP(selected.montoCuota)}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Restante</span>
                <span className="text-white font-bold text-lg">{formatCLP((selected.cuotasTotales - selected.cuotasPagadas) * selected.montoCuota)}</span>
              </div>
              <p className="text-zinc-600 text-xs text-center">Desde {formatFecha(selected.fechaInicio)}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => { marcarCuota(selected.id); setSelectedId(null) }}
                disabled={selected.cuotasPagadas >= selected.cuotasTotales}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-zinc-950 font-bold rounded-2xl py-4 active:opacity-80 disabled:opacity-30"
              >
                <Check size={16} />
                {selected.cuotasPagadas < selected.cuotasTotales ? 'Marcar cuota' : 'Completado'}
              </button>
              <button onClick={() => { setConfirmId(selected.id); setSelectedId(null) }}
                className="w-14 flex items-center justify-center bg-zinc-800 rounded-2xl active:bg-zinc-700">
                <Trash2 size={18} className="text-red-400" />
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva Compra">
        <FormCuota onSave={c => { agregar(c); setShowAdd(false) }} />
      </Modal>

      {/* Confirm delete */}
      <Modal open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar producto?</h2>
          <div className="flex gap-3">
            <button onClick={() => setConfirmId(null)} className="flex-1 py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-bold">Cancelar</button>
            <button onClick={() => { if (confirmId) { eliminar(confirmId); setConfirmId(null) } }} className="flex-1 py-3.5 rounded-2xl bg-red-500/20 text-red-400 font-bold">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function FormCuota({ onSave }: { onSave: (c: Omit<CompraCuotas, 'id'>) => void }) {
  const [producto, setProducto]         = useState('')
  const [tienda, setTienda]             = useState('')
  const [cuotasTotales, setCuotasTotales] = useState('')
  const [montoCuota, setMontoCuota]     = useState('')
  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-accent transition-colors placeholder:text-zinc-600"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!producto || !tienda || !cuotasTotales || !montoCuota) return
    onSave({ producto, tienda, cuotasTotales: parseInt(cuotasTotales), cuotasPagadas: 0, montoCuota: parseInt(montoCuota), fechaInicio: new Date().toISOString().slice(0, 10) })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input className={inputCls} placeholder="Producto" value={producto} onChange={e => setProducto(e.target.value)} required />
      <input className={inputCls} placeholder="Tienda" value={tienda} onChange={e => setTienda(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputCls} type="number" placeholder="N° cuotas" value={cuotasTotales} onChange={e => setCuotasTotales(e.target.value.replace(/\D/g,''))} min="1" required />
        <input className={inputCls} type="number" placeholder="Valor cuota" value={montoCuota} onChange={e => setMontoCuota(e.target.value.replace(/\D/g,''))} min="0" required />
      </div>
      <button type="submit" className="bg-white text-zinc-950 font-bold rounded-2xl py-4 active:opacity-80">Guardar</button>
    </form>
  )
}
