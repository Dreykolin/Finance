import { useState } from 'react'
import { Trash2, Plus, CheckCircle, Circle } from 'lucide-react'
import { useAhorros, useMetas } from '../../store/useAhorros'
import { formatCLP, formatFecha } from '../../lib/format'
import Modal from '../../components/Modal'
import type { Ahorro, MetaAhorro } from '../../types'

export default function MobileAhorros() {
  const { ahorros, agregar: agregarAhorro, eliminar: eliminarAhorro } = useAhorros()
  const { metas, agregar: agregarMeta, eliminar: eliminarMeta, toggleCompletada } = useMetas()

  const [showDeposito, setShowDeposito]   = useState(false)
  const [esRetiro, setEsRetiro]           = useState(false)
  const [showMetaForm, setShowMetaForm]   = useState(false)
  const [confirmAhorro, setConfirmAhorro] = useState<number | null>(null)
  const [confirmMeta, setConfirmMeta]     = useState<number | null>(null)
  const [tab, setTab]                     = useState<'movimientos' | 'metas'>('movimientos')

  const total      = ahorros.reduce((s, a) => s + (a.esRetiro ? -a.monto : a.monto), 0)
  const metaActiva = metas.filter(m => !m.completada).sort((a, b) => a.montoObjetivo - b.montoObjetivo)[0] ?? null

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">
      {/* Hero */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-extrabold tracking-tight mb-4">Ahorros</h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total ahorrado</p>
          <p className={`text-4xl font-extrabold mt-1 mb-4 ${total >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatCLP(total)}
          </p>

          {metaActiva && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-zinc-500">{metaActiva.nombre}</span>
                <span className="text-emerald-500 font-bold">{formatCLP(metaActiva.montoObjetivo)}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min((total / metaActiva.montoObjetivo) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setEsRetiro(false); setShowDeposito(true) }}
              className="bg-accent text-white font-bold rounded-xl py-3 text-sm active:opacity-80"
            >
              + Ahorrar
            </button>
            <button
              onClick={() => { setEsRetiro(true); setShowDeposito(true) }}
              className="bg-zinc-800 text-red-400 font-bold rounded-xl py-3 text-sm active:bg-zinc-700"
            >
              − Retirar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-1 mb-4">
        {(['movimientos', 'metas'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === t ? 'bg-zinc-800 text-white' : 'text-zinc-500 active:bg-zinc-900'
            }`}
          >
            {t === 'movimientos' ? 'Movimientos' : 'Metas'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-28 flex flex-col gap-2">
        {tab === 'movimientos' && (
          <>
            {ahorros.length === 0 && (
              <div className="py-16 text-center text-zinc-600 text-sm">Sin movimientos todavía</div>
            )}
            {[...ahorros].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(a => (
              <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${a.esRetiro ? 'bg-red-500/15' : 'bg-accent/15'}`}>
                  <span className={`text-sm font-bold ${a.esRetiro ? 'text-red-400' : 'text-accent'}`}>
                    {a.esRetiro ? '−' : '+'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${a.esRetiro ? 'text-red-400' : 'text-white'}`}>
                    {a.esRetiro ? 'Retiro' : 'Depósito'}
                  </p>
                  <p className="text-zinc-600 text-xs">{formatFecha(a.fecha)}</p>
                </div>
                <p className={`font-bold ${a.esRetiro ? 'text-red-400' : 'text-white'}`}>{formatCLP(a.monto)}</p>
                <button onClick={() => setConfirmAhorro(a.id)} className="text-zinc-700 active:text-red-500 pl-1">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </>
        )}

        {tab === 'metas' && (
          <>
            <button
              onClick={() => setShowMetaForm(true)}
              className="w-full border-2 border-dashed border-zinc-800 rounded-2xl py-4 flex items-center justify-center gap-2 text-zinc-500 active:border-zinc-700 transition-colors"
            >
              <Plus size={16} />
              <span className="text-sm font-medium">Nueva meta</span>
            </button>

            {metas.length === 0 && (
              <div className="py-10 text-center text-zinc-600 text-sm">Sin metas todavía</div>
            )}

            {metas.map(m => (
              <div key={m.id} className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 ${m.completada ? 'opacity-50' : ''}`}>
                <button onClick={() => toggleCompletada(m.id)} className="flex-shrink-0">
                  {m.completada
                    ? <CheckCircle size={22} className="text-accent" />
                    : <Circle size={22} className="text-zinc-600" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${m.completada ? 'line-through text-zinc-500' : 'text-white'}`}>{m.nombre}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{formatCLP(m.montoObjetivo)}</p>
                  {!m.completada && m.montoObjetivo > 0 && (
                    <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((total / m.montoObjetivo) * 100, 100)}%` }} />
                    </div>
                  )}
                </div>
                <button onClick={() => setConfirmMeta(m.id)} className="text-zinc-700 active:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Deposito modal */}
      <Modal open={showDeposito} onClose={() => setShowDeposito(false)} title={esRetiro ? 'Registrar Retiro' : 'Registrar Ahorro'}>
        <FormDeposito esRetiro={esRetiro} onSave={a => { agregarAhorro(a); setShowDeposito(false) }} />
      </Modal>

      {/* Meta form */}
      <Modal open={showMetaForm} onClose={() => setShowMetaForm(false)} title="Nueva Meta">
        <FormMeta onSave={m => { agregarMeta(m); setShowMetaForm(false) }} />
      </Modal>

      {/* Confirm ahorro */}
      <Modal open={confirmAhorro !== null} onClose={() => setConfirmAhorro(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar movimiento?</h2>
          <div className="flex gap-3">
            <button onClick={() => setConfirmAhorro(null)} className="flex-1 py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-bold">Cancelar</button>
            <button onClick={() => { if (confirmAhorro) { eliminarAhorro(confirmAhorro); setConfirmAhorro(null) } }} className="flex-1 py-3.5 rounded-2xl bg-red-500/20 text-red-400 font-bold">Eliminar</button>
          </div>
        </div>
      </Modal>

      {/* Confirm meta */}
      <Modal open={confirmMeta !== null} onClose={() => setConfirmMeta(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar meta?</h2>
          <div className="flex gap-3">
            <button onClick={() => setConfirmMeta(null)} className="flex-1 py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-bold">Cancelar</button>
            <button onClick={() => { if (confirmMeta) { eliminarMeta(confirmMeta); setConfirmMeta(null) } }} className="flex-1 py-3.5 rounded-2xl bg-red-500/20 text-red-400 font-bold">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function FormDeposito({ esRetiro, onSave }: { esRetiro: boolean; onSave: (a: Omit<Ahorro, 'id'>) => void }) {
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-accent transition-colors placeholder:text-zinc-600"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!monto) return
    onSave({ monto: parseInt(monto), fecha, esRetiro })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <input className={inputCls} type="number" placeholder="Monto" value={monto} onChange={e => setMonto(e.target.value.replace(/\D/g,''))} required />
        <input className={inputCls} type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
      </div>
      <button type="submit" disabled={!monto}
        className={`font-bold rounded-2xl py-4 disabled:opacity-40 active:opacity-80 ${esRetiro ? 'bg-red-500 text-white' : 'bg-accent text-white'}`}>
        {esRetiro ? 'Registrar Retiro' : 'Guardar Ahorro'}
      </button>
    </form>
  )
}

function FormMeta({ onSave }: { onSave: (m: Omit<MetaAhorro, 'id'>) => void }) {
  const [nombre, setNombre] = useState('')
  const [monto, setMonto]   = useState('')
  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-accent transition-colors placeholder:text-zinc-600"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre || !monto) return
    onSave({ nombre, montoObjetivo: parseInt(monto), completada: false })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input className={inputCls} placeholder="Nombre de la meta" value={nombre} onChange={e => setNombre(e.target.value)} required />
      <input className={inputCls} type="number" placeholder="Monto objetivo" value={monto} onChange={e => setMonto(e.target.value.replace(/\D/g,''))} required />
      <button type="submit" disabled={!nombre || !monto} className="bg-accent text-white font-bold rounded-2xl py-4 disabled:opacity-40">Añadir</button>
    </form>
  )
}
