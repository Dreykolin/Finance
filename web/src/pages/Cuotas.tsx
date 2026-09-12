import { useState } from 'react'
import { CreditCard, ShoppingBag, Check, Trash2, Plus, Pencil, Minus } from 'lucide-react'
import { useCuotas } from '../store/useCuotas'
import Modal from '../components/Modal'
import { formatCLP, formatFecha } from '../lib/format'
import type { CompraCuotas } from '../types'

// ── Circular progress ring ──────────────────────────────────────
function RingProgress({
  value, total, size = 64, stroke = 6,
}: {
  value: number; total: number; size?: number; stroke?: number
}) {
  const pct = total > 0 ? value / total : 0
  const r = (size - stroke * 2) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-white leading-none" style={{ fontSize: size * 0.22 }}>
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  )
}

// ── Fila de resumen ──────────────────────────────────────────────
function ResumenRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500 text-sm">{label}</span>
      <span className={`font-bold ${highlight ? 'text-lg text-white' : 'text-accent text-sm'}`}>
        {value}
      </span>
    </div>
  )
}

export default function Cuotas() {
  const { cuotas, agregar, editar, eliminar, marcarCuota } = useCuotas()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showGlobal, setShowGlobal] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [editando, setEditando] = useState(false)

  const activas = cuotas.filter(c => c.cuotasPagadas < c.cuotasTotales)
  const totalPagadas  = cuotas.reduce((s, c) => s + c.cuotasPagadas, 0)
  const totalCuotas   = cuotas.reduce((s, c) => s + c.cuotasTotales, 0)
  const cargaMensual  = activas.reduce((s, c) => s + c.montoCuota, 0)
  const montoTotal    = cuotas.reduce((s, c) => s + c.cuotasTotales * c.montoCuota, 0)
  const montoAbonado  = cuotas.reduce((s, c) => s + c.cuotasPagadas * c.montoCuota, 0)
  const deudaPendiente = montoTotal - montoAbonado

  const selected = cuotas.find(c => c.id === selectedId) ?? null

  return (
    <div className="min-h-full bg-zinc-950 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <CreditCard size={22} className="text-accent" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Seguimiento</h1>
            <div className="mt-1">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Carga Mensual</p>
              <p className="text-white text-lg font-bold">{formatCLP(cargaMensual)}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { setShowGlobal(true) }}
          className="hover:opacity-80 transition-opacity"
          title="Resumen global"
        >
          <RingProgress value={totalPagadas} total={totalCuotas} size={60} stroke={6} />
        </button>
      </div>

      <div className="h-px bg-zinc-800 mx-5 mb-5" />

      {/* Product list */}
      <div className="px-5 flex flex-col gap-4">
        <p className="text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase">
          Tus Productos
        </p>

        {cuotas.length === 0 && (
          <p className="text-zinc-700 text-sm text-center py-8">Sin productos registrados.</p>
        )}

        {cuotas.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between hover:bg-zinc-900 transition-colors text-left"
          >
            <div>
              <p className="text-white font-bold text-base">{c.producto}</p>
              <p className="text-zinc-500 text-sm mt-0.5">
                {c.tienda} · {c.cuotasPagadas}/{c.cuotasTotales} cuotas
              </p>
              <p className="text-zinc-600 text-xs mt-0.5">{formatCLP(c.montoCuota)}/cuota</p>
            </div>
            <ShoppingBag size={18} className="text-zinc-700 flex-shrink-0 ml-3" />
          </button>
        ))}

        {/* Add button */}
        <button
          onClick={() => setShowAdd(true)}
          className="w-full border-2 border-dashed border-zinc-800 rounded-2xl py-5 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
        >
          <Plus size={18} />
          <span className="font-medium text-sm">Registrar nueva compra</span>
        </button>
      </div>

      {/* Detail modal */}
      <Modal
        open={selected !== null}
        onClose={() => { setSelectedId(null); setEditando(false) }}
        title={selected?.producto}
      >
        {selected && editando && (
          <FormEditarCuota
            cuota={selected}
            onSave={async patch => { await editar(selected.id, patch); setEditando(false) }}
            onCancel={() => setEditando(false)}
          />
        )}
        {selected && !editando && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-zinc-500 text-sm -mt-2">{selected.tienda}</p>

            <RingProgress
              value={selected.cuotasPagadas}
              total={selected.cuotasTotales}
              size={120}
              stroke={10}
            />

            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
              <ResumenRow label="Total a Pagar" value={formatCLP(selected.cuotasTotales * selected.montoCuota)} />
              <ResumenRow label="Valor de Cuota" value={formatCLP(selected.montoCuota)} />
              <div className="h-px bg-zinc-800" />
              <ResumenRow
                label="Deuda Restante"
                value={formatCLP((selected.cuotasTotales - selected.cuotasPagadas) * selected.montoCuota)}
                highlight
              />
              <p className="text-zinc-600 text-xs text-center">
                Desde {formatFecha(selected.fechaInicio)} · {selected.cuotasPagadas}/{selected.cuotasTotales} cuotas
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <div className="flex gap-3">
                <button
                  onClick={() => { marcarCuota(selected.id); setSelectedId(null) }}
                  disabled={selected.cuotasPagadas >= selected.cuotasTotales}
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-zinc-950 font-bold rounded-xl py-3.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-30"
                >
                  <Check size={16} />
                  {selected.cuotasPagadas < selected.cuotasTotales ? 'Marcar cuota' : 'Pagado'}
                </button>
                <button
                  onClick={() => setEditando(true)}
                  title="Editar registro"
                  className="w-14 flex items-center justify-center bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  <Pencil size={17} className="text-zinc-300" />
                </button>
                <button
                  onClick={() => setConfirmId(selected.id)}
                  title="Eliminar"
                  className="w-14 flex items-center justify-center bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  <Trash2 size={18} className="text-red-500" />
                </button>
              </div>

              {/* Atajo para el caso frecuente: marque una cuota por error. */}
              {selected.cuotasPagadas > 0 && (
                <button
                  onClick={() => editar(selected.id, { cuotasPagadas: selected.cuotasPagadas - 1 })}
                  className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs font-bold py-1 transition-colors"
                >
                  <Minus size={13} />
                  Deshacer ultima cuota
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Global summary modal */}
      <Modal open={showGlobal} onClose={() => setShowGlobal(false)} title="Resumen de Deuda">
        <div className="flex flex-col items-center gap-6">
          <RingProgress value={totalPagadas} total={totalCuotas} size={120} stroke={10} />
          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
            <ResumenRow label="Deuda Total Actual" value={formatCLP(montoTotal)} />
            <ResumenRow label="Total Abonado" value={`+ ${formatCLP(montoAbonado)}`} />
            <div className="h-px bg-zinc-800" />
            <ResumenRow label="Deuda Pendiente" value={formatCLP(deudaPendiente)} highlight />
          </div>
        </div>
      </Modal>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva Compra">
        <FormNuevaCompra
          onSave={c => { agregar(c); setShowAdd(false) }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      {/* Confirm delete */}
      <Modal open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar producto?</h2>
          <p className="text-zinc-400 text-sm">Esta acción no se puede deshacer.</p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setConfirmId(null)}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (confirmId) { eliminar(confirmId); setConfirmId(null); setSelectedId(null) }
              }}
              className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-sm"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/**
 * Edicion integral del registro. `cuotasPagadas` es editable a proposito: es la
 * unica forma de corregir un "Marcar cuota" accidental, y al bajarla el backend
 * borra las compras que ese marcado habia generado en el historial de gastos.
 */
function FormEditarCuota({
  cuota, onSave, onCancel,
}: {
  cuota: CompraCuotas
  onSave: (patch: Partial<Omit<CompraCuotas, 'id'>>) => Promise<void>
  onCancel: () => void
}) {
  const [producto, setProducto]           = useState(cuota.producto)
  const [tienda, setTienda]               = useState(cuota.tienda)
  const [cuotasTotales, setCuotasTotales] = useState(String(cuota.cuotasTotales))
  const [montoCuota, setMontoCuota]       = useState(String(cuota.montoCuota))
  const [cuotasPagadas, setCuotasPagadas] = useState(String(cuota.cuotasPagadas))
  const [error, setError]                 = useState<string | null>(null)
  const [guardando, setGuardando]         = useState(false)

  const inputCls = "bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent transition-colors placeholder:text-zinc-600 w-full"
  const labelCls = "text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase mb-1.5 block"

  const totales  = parseInt(cuotasTotales) || 0
  const pagadas  = parseInt(cuotasPagadas) || 0
  const aRevertir = cuota.cuotasPagadas - pagadas

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!producto || !tienda || !totales) return
    if (pagadas > totales) { setError('Las cuotas pagadas no pueden superar el total.'); return }
    setError(null); setGuardando(true)
    try {
      await onSave({
        producto, tienda,
        cuotasTotales: totales,
        montoCuota: parseInt(montoCuota) || 0,
        cuotasPagadas: pagadas,
      })
    } catch {
      setError('No se pudo guardar. Revisa los datos e intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Producto</label>
        <input className={inputCls} value={producto} onChange={e => setProducto(e.target.value)} required />
      </div>
      <div>
        <label className={labelCls}>Tienda</label>
        <input className={inputCls} value={tienda} onChange={e => setTienda(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Total de cuotas</label>
          <input className={inputCls} type="number" min="1" value={cuotasTotales}
            onChange={e => setCuotasTotales(e.target.value.replace(/\D/g, ''))} required />
        </div>
        <div>
          <label className={labelCls}>Valor de cuota</label>
          <input className={inputCls} type="number" min="0" value={montoCuota}
            onChange={e => setMontoCuota(e.target.value.replace(/\D/g, ''))} required />
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
        <label className={labelCls}>Cuotas pagadas</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setCuotasPagadas(String(Math.max(0, pagadas - 1)))}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
            <Minus size={15} />
          </button>
          <input className={`${inputCls} text-center flex-1`} type="number" min="0" value={cuotasPagadas}
            onChange={e => setCuotasPagadas(e.target.value.replace(/\D/g, ''))} required />
          <button type="button" onClick={() => setCuotasPagadas(String(Math.min(totales, pagadas + 1)))}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
            <Plus size={15} />
          </button>
        </div>
        {aRevertir > 0 && (
          <p className="text-yellow-500/90 text-xs leading-relaxed">
            Se revertiran {aRevertir} {aRevertir === 1 ? 'cuota' : 'cuotas'} y se
            {aRevertir === 1 ? ' borrara el gasto' : ' borraran los gastos'} que
            {aRevertir === 1 ? ' genero' : ' generaron'} en tu historial.
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={guardando}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40">
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

function FormNuevaCompra({
  onSave, onCancel,
}: {
  onSave: (c: Omit<CompraCuotas, 'id'>) => void
  onCancel: () => void
}) {
  const [producto, setProducto] = useState('')
  const [tienda, setTienda] = useState('')
  const [cuotasTotales, setCuotasTotales] = useState('')
  const [montoCuota, setMontoCuota] = useState('')

  const inputCls = "bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent transition-colors placeholder:text-zinc-600 w-full"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!producto || !tienda || !cuotasTotales || !montoCuota) return
    onSave({
      producto, tienda,
      cuotasTotales: parseInt(cuotasTotales),
      cuotasPagadas: 0,
      montoCuota: parseInt(montoCuota),
      fechaInicio: new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input className={inputCls} placeholder="Producto" value={producto} onChange={e => setProducto(e.target.value)} required />
      <input className={inputCls} placeholder="Tienda" value={tienda} onChange={e => setTienda(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputCls} type="number" placeholder="N° Cuotas" value={cuotasTotales} onChange={e => setCuotasTotales(e.target.value.replace(/\D/g,''))} min="1" required />
        <input className={inputCls} type="number" placeholder="Valor Cuota" value={montoCuota} onChange={e => setMontoCuota(e.target.value.replace(/\D/g,''))} min="0" required />
      </div>
      <button
        type="submit"
        className="bg-white text-zinc-950 font-bold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity"
      >
        Guardar
      </button>
    </form>
  )
}
