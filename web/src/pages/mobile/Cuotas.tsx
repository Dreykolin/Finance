import { useState } from 'react'
import { Check, Trash2, Pencil, Minus, Plus } from 'lucide-react'
import { useCuotas } from '../../store/useCuotas'
import { formatCLP, formatFecha } from '../../lib/format'
import { proximoCobro, cuotasAtrasadas, hoyISO } from '../../lib/cuotas'
import Modal from '../../components/Modal'
import StatTile from '../../components/StatTile'
import MetodoPicker from '../../components/MetodoPicker'
import { Button, INPUT, LABEL } from '../../components/ui'
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
  const { cuotas, agregar, editar, eliminar, marcarCuota } = useCuotas()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [editando, setEditando]     = useState(false)
  const [confirmId, setConfirmId]   = useState<number | null>(null)

  const activas      = cuotas.filter(c => c.cuotasPagadas < c.cuotasTotales)
  const cargaMensual = activas.reduce((s, c) => s + c.montoCuota, 0)
  const selected     = cuotas.find(c => c.id === selectedId) ?? null

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-extrabold tracking-tight mb-4">Cuotas</h1>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            etiqueta="Carga mensual"
            valor={formatCLP(cargaMensual)}
            nota={activas.length + (activas.length === 1 ? ' producto activo' : ' productos activos')}
            acento
          />
          <StatTile
            etiqueta="Deuda pendiente"
            valor={formatCLP(cuotas.reduce((t, c) => t + (c.cuotasTotales - c.cuotasPagadas) * c.montoCuota, 0))}
            nota={(cuotas.length - activas.length) + ' completadas'}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 pb-28 flex flex-col gap-3">
        {cuotas.length === 0 && (
          <div className="py-20 text-center text-zinc-600 text-sm">Sin productos registrados</div>
        )}

        {cuotas.map(c => {
          const completada = c.cuotasPagadas >= c.cuotasTotales
          const atrasadas  = cuotasAtrasadas(c)
          const proxima    = proximoCobro(c)
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
                {proxima && (
                  <p className="text-zinc-600 text-xs mt-0.5">
                    Próxima {formatFecha(proxima.fecha)}
                  </p>
                )}
              </div>
              {completada && (
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">Listo</span>
              )}
              {!completada && atrasadas > 0 && (
                <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full whitespace-nowrap">
                  {atrasadas} sin marcar
                </span>
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
      <Modal
        open={selected !== null}
        onClose={() => { setSelectedId(null); setEditando(false) }}
        title={selected?.producto}
      >
        {selected && editando && (
          <FormEditarCuotaMovil
            cuota={selected}
            onSave={async patch => { await editar(selected.id, patch); setEditando(false) }}
            onCancel={() => setEditando(false)}
          />
        )}
        {selected && !editando && (
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
              {(() => {
                const proxima = proximoCobro(selected)
                if (!proxima) return null
                const vencida = proxima.fecha <= hoyISO()
                return (
                  <>
                    <div className="h-px bg-zinc-800" />
                    <div className="flex justify-between">
                      <span className="text-zinc-500 text-sm">
                        {vencida ? 'Cuota vencida' : 'Próximo cobro'}
                      </span>
                      <span className={`font-bold text-sm ${vencida ? 'text-yellow-500' : 'text-accent'}`}>
                        {formatFecha(proxima.fecha)} · cuota {proxima.numero}
                      </span>
                    </div>
                  </>
                )
              })()}
              <p className="text-zinc-600 text-xs text-center">
                Desde {formatFecha(selected.fechaInicio)}
                {selected.metodoPago && ` · ${selected.metodoPago}`}
              </p>
            </div>

            {cuotasAtrasadas(selected) > 0 && (
              <p className="text-yellow-500/90 text-xs leading-relaxed text-center -mt-2">
                {cuotasAtrasadas(selected) === 1
                  ? 'Ya venció 1 cuota que no has marcado.'
                  : `Ya vencieron ${cuotasAtrasadas(selected)} cuotas que no has marcado.`}
                {' '}Márcalas si ya te las cobraron.
              </p>
            )}
            <div className="flex flex-col gap-3 w-full">
              <div className="flex gap-3">
                <button
                  onClick={() => { marcarCuota(selected.id); setSelectedId(null) }}
                  disabled={selected.cuotasPagadas >= selected.cuotasTotales}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent text-white font-bold rounded-2xl py-4 active:opacity-80 disabled:opacity-40"
                >
                  <Check size={16} />
                  {selected.cuotasPagadas < selected.cuotasTotales ? 'Marcar cuota' : 'Completado'}
                </button>
                <button onClick={() => setEditando(true)}
                  className="w-14 flex items-center justify-center bg-zinc-800 rounded-2xl active:bg-zinc-700">
                  <Pencil size={17} className="text-zinc-300" />
                </button>
                <button onClick={() => { setConfirmId(selected.id); setSelectedId(null) }}
                  className="w-14 flex items-center justify-center bg-zinc-800 rounded-2xl active:bg-zinc-700">
                  <Trash2 size={18} className="text-red-400" />
                </button>
              </div>

              {/* El error más común con el pulgar: marcar de más. */}
              {selected.cuotasPagadas > 0 && (
                <button
                  onClick={() => editar(selected.id, { cuotasPagadas: selected.cuotasPagadas - 1 })}
                  className="flex items-center justify-center gap-2 text-zinc-500 active:text-zinc-300 text-xs font-bold py-2"
                >
                  <Minus size={13} />
                  Deshacer última cuota
                </button>
              )}
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

/**
 * Edición en el teléfono. Incluye las cuotas ya pagadas porque es la única forma
 * de corregir un "marcar" accidental, que con el pulgar ocurre más que con el ratón.
 */
function FormEditarCuotaMovil({ cuota, onSave, onCancel }: {
  cuota: CompraCuotas
  onSave: (patch: Partial<Omit<CompraCuotas, 'id'>>) => Promise<void>
  onCancel: () => void
}) {
  const [producto, setProducto]           = useState(cuota.producto)
  const [tienda, setTienda]               = useState(cuota.tienda)
  const [cuotasTotales, setCuotasTotales] = useState(String(cuota.cuotasTotales))
  const [montoCuota, setMontoCuota]       = useState(String(cuota.montoCuota))
  const [pagadas, setPagadas]             = useState(String(cuota.cuotasPagadas))
  const [metodo, setMetodo]               = useState(cuota.metodoPago ?? '')
  const [primerCobro, setPrimerCobro]     = useState(cuota.fechaPrimerCobro || cuota.fechaInicio)
  const [guardando, setGuardando]         = useState(false)

  const nTot = parseInt(cuotasTotales) || 0
  const nPag = parseInt(pagadas) || 0
  const aRevertir = cuota.cuotasPagadas - nPag

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!producto || !tienda || !nTot || nPag > nTot) return
    setGuardando(true)
    try {
      await onSave({
        producto, tienda,
        cuotasTotales: nTot,
        montoCuota: parseInt(montoCuota) || 0,
        cuotasPagadas: nPag,
        metodoPago: metodo,
        fechaPrimerCobro: primerCobro,
      })
    } finally { setGuardando(false) }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className={LABEL}>Producto</label>
        <input className={INPUT} value={producto} onChange={e => setProducto(e.target.value)} required />
      </div>
      <div>
        <label className={LABEL}>Tienda</label>
        <input className={INPUT} value={tienda} onChange={e => setTienda(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>N° cuotas</label>
          <input className={INPUT} type="number" min="1" value={cuotasTotales}
            onChange={e => setCuotasTotales(e.target.value.replace(/\D/g, ''))} required />
        </div>
        <div>
          <label className={LABEL}>Valor cuota</label>
          <input className={INPUT} type="number" min="0" value={montoCuota}
            onChange={e => setMontoCuota(e.target.value.replace(/\D/g, ''))} required />
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
        <label className={LABEL}>Cuotas pagadas</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPagadas(String(Math.max(0, nPag - 1)))}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 active:bg-zinc-700">
            <Minus size={16} />
          </button>
          <input className={`${INPUT} text-center flex-1`} type="number" min="0" value={pagadas}
            onChange={e => setPagadas(e.target.value.replace(/\D/g, ''))} required />
          <button type="button" onClick={() => setPagadas(String(Math.min(nTot, nPag + 1)))}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 active:bg-zinc-700">
            <Plus size={16} />
          </button>
        </div>
        {aRevertir > 0 && (
          <p className="text-yellow-500/90 text-xs leading-relaxed">
            Se revertirán {aRevertir} {aRevertir === 1 ? 'cuota' : 'cuotas'} y se
            {aRevertir === 1 ? ' borrará el gasto' : ' borrarán los gastos'} que
            {aRevertir === 1 ? ' generó' : ' generaron'} en tu historial.
          </p>
        )}
      </div>

      <div>
        <label className={LABEL}>Primer cobro</label>
        <input className={INPUT} type="date" value={primerCobro}
          onChange={e => setPrimerCobro(e.target.value)} required />
        <p className="text-zinc-600 text-xs mt-1.5 leading-relaxed">
          Cuándo te cobran la primera cuota: la fecha de tu factura, o el día del
          débito si la tienda cobra aparte.
        </p>
      </div>

      <div>
        <label className={LABEL}>Con qué la pagas</label>
        <MetodoPicker valor={metodo} onChange={setMetodo} opcional />
      </div>

      <div className="flex gap-3">
        <Button type="button" variante="secundario" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="flex-1" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}

function FormCuota({ onSave }: { onSave: (c: Omit<CompraCuotas, 'id'>) => void }) {
  const [metodo, setMetodo]             = useState('')
  const [producto, setProducto]         = useState('')
  const [tienda, setTienda]             = useState('')
  const [cuotasTotales, setCuotasTotales] = useState('')
  const [montoCuota, setMontoCuota]     = useState('')
  const [primerCobro, setPrimerCobro]   = useState(hoyISO())
  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-accent transition-colors placeholder:text-zinc-600"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!producto || !tienda || !cuotasTotales || !montoCuota) return
    onSave({
      producto, tienda,
      cuotasTotales: parseInt(cuotasTotales),
      cuotasPagadas: 0,
      montoCuota: parseInt(montoCuota),
      fechaInicio: hoyISO(),
      fechaPrimerCobro: primerCobro,
      metodoPago: metodo,
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input className={inputCls} placeholder="Producto" value={producto} onChange={e => setProducto(e.target.value)} required />
      <input className={inputCls} placeholder="Tienda" value={tienda} onChange={e => setTienda(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputCls} type="number" placeholder="N° cuotas" value={cuotasTotales} onChange={e => setCuotasTotales(e.target.value.replace(/\D/g,''))} min="1" required />
        <input className={inputCls} type="number" placeholder="Valor cuota" value={montoCuota} onChange={e => setMontoCuota(e.target.value.replace(/\D/g,''))} min="0" required />
      </div>
      <div>
        <label className={LABEL}>Primer cobro</label>
        <input className={inputCls} type="date" value={primerCobro}
          onChange={e => setPrimerCobro(e.target.value)} required />
        <p className="text-zinc-600 text-xs mt-1.5 leading-relaxed">
          Cuándo te cobran la primera cuota: la fecha de tu factura, o el día del
          débito si la tienda cobra aparte.
        </p>
      </div>
      <div>
        <label className={LABEL}>Con qué la pagas</label>
        <MetodoPicker valor={metodo} onChange={setMetodo} opcional />
      </div>
      <button type="submit" className="bg-white text-zinc-950 font-bold rounded-2xl py-4 active:opacity-80">Guardar</button>
    </form>
  )
}
