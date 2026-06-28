import { useState } from 'react'
import { Settings, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useGastos } from '../../store/useGastos'
import { formatCLP, formatFecha } from '../../lib/format'
import Modal from '../../components/Modal'
import type { Gasto } from '../../types'

const METODOS = ['Efectivo', 'Débito', 'Crédito', 'Transferencia']

const METODO_COLOR: Record<string, string> = {
  'Efectivo':      'bg-emerald-500/20 text-emerald-400',
  'Débito':        'bg-blue-500/20 text-blue-400',
  'Crédito':       'bg-purple-500/20 text-purple-400',
  'Transferencia': 'bg-orange-500/20 text-orange-400',
  '':              'bg-zinc-800 text-zinc-500',
}

function getMes(offset: number) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.toISOString().slice(0, 7)
}

function mesNombre(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('es', { month: 'long', year: 'numeric' })
}

export default function MobileGastos() {
  const { gastos, agregar, eliminar } = useGastos()
  const [mesOffset, setMesOffset] = useState(0)
  const [showForm, setShowForm]   = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [presupuesto] = useState(() => Number(localStorage.getItem('fin_presupuesto') ?? '0'))
  const [showSettings, setShowSettings] = useState(false)
  const [presupuestoInput, setPresupuestoInput] = useState('')
  const [presupuestoVal, setPresupuestoVal] = useState(presupuesto)

  const mesActual = getMes(mesOffset)
  const delMes    = gastos.filter(g => g.fecha.startsWith(mesActual))
  const totalMes  = delMes.reduce((s, g) => s + g.monto, 0)
  const pct       = presupuestoVal > 0 ? Math.min(totalMes / presupuestoVal, 1) : 0

  // Agrupar por día
  const porDia: Record<string, Gasto[]> = {}
  delMes.forEach(g => {
    porDia[g.fecha] = [...(porDia[g.fecha] ?? []), g]
  })
  const dias = Object.keys(porDia).sort((a, b) => b.localeCompare(a))

  function diaLabel(fecha: string) {
    const hoy  = new Date().toISOString().slice(0, 10)
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (fecha === hoy)  return 'Hoy'
    if (fecha === ayer) return 'Ayer'
    return formatFecha(fecha)
  }

  function savePresupuesto() {
    const v = parseInt(presupuestoInput)
    if (!isNaN(v) && v > 0) {
      setPresupuestoVal(v)
      localStorage.setItem('fin_presupuesto', String(v))
    }
    setShowSettings(false)
  }

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold tracking-tight">Gastos</h1>
          <button
            onClick={() => { setPresupuestoInput(presupuestoVal > 0 ? String(presupuestoVal) : ''); setShowSettings(true) }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Mes selector */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMesOffset(v => v - 1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-zinc-800">
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-bold capitalize">{mesNombre(mesActual)}</span>
          <button onClick={() => setMesOffset(v => Math.min(v + 1, 0))} className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-zinc-800" disabled={mesOffset === 0}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Total card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Total del mes</p>
          <p className="text-3xl font-extrabold text-white">{formatCLP(totalMes)}</p>
          {presupuestoVal > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                <span>{Math.round(pct * 100)}% del presupuesto</span>
                <span>{formatCLP(presupuestoVal)}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 1 ? 'bg-red-500' : pct >= 0.8 ? 'bg-yellow-500' : 'bg-accent'}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction list */}
      <div className="flex-1 px-4 pb-28 flex flex-col gap-5">
        {dias.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-600 text-sm">
            Sin movimientos este mes
          </div>
        )}

        {dias.map(dia => (
          <div key={dia}>
            <p className="text-zinc-500 text-[11px] font-extrabold uppercase tracking-widest mb-2">{diaLabel(dia)}</p>
            <div className="flex flex-col gap-2">
              {porDia[dia].map(g => (
                <div
                  key={g.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{g.descripcion}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${METODO_COLOR[g.metodoPago] ?? METODO_COLOR['']}`}>
                      {g.metodoPago || 'Sin método'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-white font-bold">{formatCLP(g.monto)}</p>
                    <button onClick={() => setConfirmId(g.id)} className="text-zinc-700 active:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform text-white text-2xl font-light z-30"
      >
        +
      </button>

      {/* Add form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo Gasto">
        <FormGasto onSave={g => { agregar(g); setShowForm(false) }} />
      </Modal>

      {/* Confirm delete */}
      <Modal open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar gasto?</h2>
          <div className="flex gap-3">
            <button onClick={() => setConfirmId(null)} className="flex-1 py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-bold">Cancelar</button>
            <button onClick={() => { if (confirmId) { eliminar(confirmId); setConfirmId(null) } }} className="flex-1 py-3.5 rounded-2xl bg-red-500/20 text-red-400 font-bold">Eliminar</button>
          </div>
        </div>
      </Modal>

      {/* Settings */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Presupuesto">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-2xl px-4 py-3.5 focus-within:border-accent transition-colors">
            <span className="text-zinc-500 font-bold">$</span>
            <input type="number" className="flex-1 bg-transparent text-white outline-none" placeholder="0" value={presupuestoInput} onChange={e => setPresupuestoInput(e.target.value)} />
          </div>
          <button onClick={savePresupuesto} className="bg-accent text-white font-bold rounded-2xl py-3.5">Guardar</button>
        </div>
      </Modal>
    </div>
  )
}

function FormGasto({ onSave }: { onSave: (g: Omit<Gasto, 'id'>) => void }) {
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto]             = useState('')
  const [fecha, setFecha]             = useState(new Date().toISOString().slice(0, 10))
  const [metodo, setMetodo]           = useState('')

  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-accent transition-colors placeholder:text-zinc-600"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!descripcion || !monto || !metodo) return
    onSave({ descripcion, monto: parseInt(monto), fecha, metodoPago: metodo })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input className={inputCls} placeholder="¿En qué gastaste?" value={descripcion} onChange={e => setDescripcion(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputCls} type="number" placeholder="Monto" value={monto} onChange={e => setMonto(e.target.value.replace(/\D/g, ''))} required />
        <input className={inputCls} type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {METODOS.map(m => (
          <button key={m} type="button" onClick={() => setMetodo(m)}
            className={`py-3 rounded-2xl text-sm font-bold transition-colors ${metodo === m ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'}`}>
            {m}
          </button>
        ))}
      </div>
      <button type="submit" disabled={!descripcion || !monto || !metodo}
        className="bg-accent text-white font-bold rounded-2xl py-4 text-base disabled:opacity-40 active:opacity-80">
        Guardar
      </button>
    </form>
  )
}
