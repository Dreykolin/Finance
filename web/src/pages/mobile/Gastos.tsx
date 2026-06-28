import { useState } from 'react'
import { Settings, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
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

// ── Bar chart: gasto por día ────────────────────────────────────────────────
function BarChart({ delMes }: { delMes: Gasto[] }) {
  const [expanded, setExpanded] = useState(false)

  const byDay: Record<string, number> = {}
  delMes.forEach(g => { byDay[g.fecha] = (byDay[g.fecha] ?? 0) + g.monto })
  const entries = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))

  if (entries.length === 0) return null

  const max    = Math.max(...entries.map(([, v]) => v))
  const W      = 320
  const H      = 72
  const count  = entries.length
  const gap    = 3
  const barW   = Math.max(Math.floor((W - gap * (count - 1)) / count), 4)
  const step   = count > 1 ? (W - barW) / (count - 1) : 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 pt-4 pb-3 flex items-center justify-between active:bg-zinc-800 transition-colors"
      >
        <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-widest">Gastos por día</span>
        <ChevronDown size={14} className={`text-zinc-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <div className="px-4 pb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
          {entries.map(([date, val], i) => {
            const x    = i * step
            const barH = Math.max((val / max) * H * 0.95, 3)
            const y    = H - barH
            return (
              <rect key={date} x={x} y={y} width={barW} height={barH}
                fill="#8b5cf6" rx="2" opacity="0.85" />
            )
          })}
        </svg>

        {expanded && (
          <div className="mt-4 flex flex-col gap-2">
            {entries.slice().reverse().map(([date, val]) => (
              <div key={date} className="flex items-center gap-3">
                <span className="text-zinc-500 text-xs w-24 flex-shrink-0">{formatFecha(date)}</span>
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(val / max) * 100}%` }} />
                </div>
                <span className="text-white text-xs font-bold w-20 text-right">{formatCLP(val)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Line chart: gasto acumulado vs presupuesto ──────────────────────────────
function LineChart({ delMes, presupuesto }: { delMes: Gasto[]; presupuesto: number }) {
  const [expanded, setExpanded] = useState(false)

  const byDay: Record<string, number> = {}
  delMes.forEach(g => { byDay[g.fecha] = (byDay[g.fecha] ?? 0) + g.monto })
  const days = Object.keys(byDay).sort()

  if (days.length === 0) return null

  let cum = 0
  const points = days.map(d => { cum += byDay[d]; return { date: d, val: cum } })

  const W      = 320
  const H      = 80
  const PAD    = 6
  const maxVal = Math.max(cum, presupuesto || cum, 1)

  const toX = (i: number) =>
    points.length === 1 ? W / 2 : PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const toY = (v: number) => PAD + (1 - v / maxVal) * (H - PAD * 2)

  const pathD    = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.val).toFixed(1)}`).join(' ')
  const areaD    = `${pathD} L ${toX(points.length - 1).toFixed(1)} ${H} L ${toX(0).toFixed(1)} ${H} Z`
  const budgetY  = presupuesto > 0 ? toY(presupuesto) : null
  const last     = points[points.length - 1]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 pt-4 pb-3 flex items-center justify-between active:bg-zinc-800 transition-colors"
      >
        <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-widest">Acumulado del mes</span>
        <ChevronDown size={14} className={`text-zinc-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <div className="px-4 pb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Budget line */}
          {budgetY !== null && (
            <line x1={PAD} y1={budgetY} x2={W - PAD} y2={budgetY}
              stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5" />
          )}

          {/* Area fill */}
          <path d={areaD} fill="url(#lineGrad)" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Last dot */}
          <circle cx={toX(points.length - 1)} cy={toY(last.val)} r="4" fill="#8b5cf6" />
          <circle cx={toX(points.length - 1)} cy={toY(last.val)} r="7" fill="#8b5cf6" fillOpacity="0.2" />
        </svg>

        {expanded && (
          <div className="mt-4 flex flex-col gap-2">
            {presupuesto > 0 && (
              <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-800">
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-4 border-t border-dashed border-red-400" />
                  Presupuesto
                </span>
                <span className="text-red-400 font-bold">{formatCLP(presupuesto)}</span>
              </div>
            )}
            {points.slice().reverse().map(p => (
              <div key={p.date} className="flex justify-between text-xs">
                <span className="text-zinc-500">{formatFecha(p.date)}</span>
                <span className="text-white font-bold">{formatCLP(p.val)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function MobileGastos() {
  const { gastos, agregar, eliminar } = useGastos()
  const [mesOffset, setMesOffset] = useState(0)
  const [showForm, setShowForm]   = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [presupuestoInput, setPresupuestoInput] = useState('')
  const [presupuestoVal, setPresupuestoVal] = useState(() => Number(localStorage.getItem('fin_presupuesto') ?? '0'))

  const mesActual = getMes(mesOffset)
  const delMes    = gastos.filter(g => g.fecha.startsWith(mesActual))
  const totalMes  = delMes.reduce((s, g) => s + g.monto, 0)
  const pct       = presupuestoVal > 0 ? Math.min(totalMes / presupuestoVal, 1) : 0

  const porDia: Record<string, Gasto[]> = {}
  delMes.forEach(g => { porDia[g.fecha] = [...(porDia[g.fecha] ?? []), g] })
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
      <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight">Gastos</h1>
          <button
            onClick={() => { setPresupuestoInput(presupuestoVal > 0 ? String(presupuestoVal) : ''); setShowSettings(true) }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-zinc-800"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Mes selector */}
        <div className="flex items-center justify-between">
          <button onClick={() => setMesOffset(v => v - 1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-zinc-800">
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-bold capitalize">{mesNombre(mesActual)}</span>
          <button onClick={() => setMesOffset(v => Math.min(v + 1, 0))} disabled={mesOffset === 0}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-zinc-800 disabled:opacity-30">
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

        {/* Charts */}
        <BarChart delMes={delMes} />
        <LineChart delMes={delMes} presupuesto={presupuestoVal} />
      </div>

      {/* Transaction list */}
      <div className="flex-1 px-4 pb-28 flex flex-col gap-5">
        {dias.length === 0 && (
          <div className="py-10 text-center text-zinc-600 text-sm">Sin movimientos este mes</div>
        )}

        {dias.map(dia => (
          <div key={dia}>
            <p className="text-zinc-500 text-[11px] font-extrabold uppercase tracking-widest mb-2">{diaLabel(dia)}</p>
            <div className="flex flex-col gap-2">
              {porDia[dia].map(g => (
                <div key={g.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 flex items-center gap-3">
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

      {/* Presupuesto */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Presupuesto">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-2xl px-4 py-3.5 focus-within:border-accent transition-colors">
            <span className="text-zinc-500 font-bold">$</span>
            <input type="number" className="flex-1 bg-transparent text-white outline-none" placeholder="0"
              value={presupuestoInput} onChange={e => setPresupuestoInput(e.target.value)} />
          </div>
          <button onClick={savePresupuesto} className="bg-accent text-white font-bold rounded-2xl py-3.5 active:opacity-80">Guardar</button>
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
