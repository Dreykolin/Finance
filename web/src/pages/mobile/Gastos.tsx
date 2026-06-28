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

function mesCorto(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('es', { month: 'short' })
}

function niceScale(max: number, steps = 4) {
  if (max === 0) return { maxY: 100000, step: 25000 }
  const raw = max / steps
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = Math.ceil(raw / pow) * pow
  return { maxY: step * steps, step }
}

function fmtMil(v: number) {
  if (v === 0) return '0'
  return v >= 1000 ? `${Math.round(v / 1000)}mil` : String(Math.round(v))
}

// ── Tendencia Mensual ──────────────────────────────────────────────────────
function TendenciaChart({ gastos, presupuesto }: { gastos: Gasto[]; presupuesto: number }) {
  const [tooltip, setTooltip] = useState<number | null>(null)

  const byMonth: Record<string, number> = {}
  gastos.forEach(g => { byMonth[g.fecha.slice(0, 7)] = (byMonth[g.fecha.slice(0, 7)] ?? 0) + g.monto })
  const months = Object.keys(byMonth).sort()

  if (months.length === 0) return (
    <div className="h-48 flex items-center justify-center text-zinc-600 text-sm italic">No hay datos suficientes</div>
  )

  const values = months.map(m => byMonth[m])
  const maxVal = Math.max(...values, presupuesto || 0)
  const { maxY, step } = niceScale(maxVal)
  const steps = Math.round(maxY / step)

  const PL = 52, PB = 28, PT = 16, PR = 12
  const W = 320, H = 200
  const gW = W - PL - PR
  const gH = H - PT - PB

  const toX = (i: number) => PL + (months.length === 1 ? gW / 2 : (i / (months.length - 1)) * gW)
  const toY = (v: number) => PT + (1 - v / maxY) * gH

  const pathD = months.map((_, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(values[i]).toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${toX(months.length - 1).toFixed(1)} ${(PT + gH).toFixed(1)} L ${toX(0).toFixed(1)} ${(PT + gH).toFixed(1)} Z`
  const budgetY = presupuesto > 0 ? toY(presupuesto) : null

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y axis grid + labels */}
        {Array.from({ length: steps + 1 }, (_, i) => {
          const v = step * i
          const y = toY(v)
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="1" />
              <text x={PL - 8} y={y + 4} textAnchor="end" fontSize="9" fill="#71717a">{fmtMil(v)}</text>
            </g>
          )
        })}

        {/* Budget line */}
        {budgetY !== null && (
          <g>
            <line x1={PL} y1={budgetY} x2={W - PR} y2={budgetY}
              stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 5" strokeOpacity="0.6" />
            <text x={W - PR - 2} y={budgetY - 4} textAnchor="end" fontSize="9" fill="#ef4444" fontWeight="bold">
              LÍMITE
            </text>
          </g>
        )}

        {/* Area + line */}
        <path d={areaD} fill="url(#tGrad)" />
        <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points + X labels */}
        {months.map((m, i) => {
          const x = toX(i), y = toY(values[i])
          const isSelected = tooltip === i
          return (
            <g key={m} onClick={() => setTooltip(isSelected ? null : i)} style={{ cursor: 'pointer' }}>
              {/* X label */}
              <text x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="#a1a1aa" fontWeight="bold">
                {mesCorto(m)}
              </text>
              {/* Dot */}
              <circle cx={x} cy={y} r={isSelected ? 7 : 5} fill="#09090b" />
              <circle cx={x} cy={y} r={isSelected ? 7 : 5} fill="none"
                stroke={isSelected ? 'white' : '#8b5cf6'}
                strokeWidth={isSelected ? 2.5 : 2} />
              {/* Tooltip */}
              {isSelected && (
                <g>
                  <rect x={x - 38} y={y - 30} width="76" height="20" rx="5" fill="#27272a" />
                  <text x={x} y={y - 16} textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">
                    {formatCLP(values[i])}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Distribución de Métodos ────────────────────────────────────────────────
function MetodosChart({ gastos }: { gastos: Gasto[] }) {
  const byMetodo: Record<string, number> = {}
  gastos.filter(g => g.metodoPago).forEach(g => {
    byMetodo[g.metodoPago] = (byMetodo[g.metodoPago] ?? 0) + g.monto
  })
  const entries = Object.entries(byMetodo).sort(([, a], [, b]) => b - a)

  if (entries.length === 0) return (
    <div className="h-48 flex items-center justify-center text-zinc-600 text-sm italic">Sin datos de métodos</div>
  )

  const maxVal = Math.max(...entries.map(([, v]) => v))
  const { maxY, step } = niceScale(maxVal)
  const steps = Math.round(maxY / step)

  const PL = 52, PB = 28, PT = 16, PR = 24
  const W = 320, H = 200
  const gW = W - PL - PR
  const gH = H - PT - PB

  const barSpacing = 24
  const barW = Math.min(((gW - barSpacing * (entries.length - 1)) / entries.length), 60)
  const totalW = barW * entries.length + barSpacing * (entries.length - 1)
  const startX = PL + (gW - totalW) / 2

  const toY = (v: number) => PT + (1 - v / maxY) * gH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Y axis grid + labels */}
      {Array.from({ length: steps + 1 }, (_, i) => {
        const v = step * i
        const y = toY(v)
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="1" />
            <text x={PL - 8} y={y + 4} textAnchor="end" fontSize="9" fill="#71717a">{fmtMil(v)}</text>
          </g>
        )
      })}

      {/* Bars */}
      {entries.map(([metodo, val], i) => {
        const x = startX + i * (barW + barSpacing)
        const barH = (val / maxY) * gH
        const y = PT + gH - barH
        return (
          <g key={metodo}>
            <rect x={x} y={y} width={barW} height={barH} rx="5" fill="white" fillOpacity="0.85" />
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
              {metodo.slice(0, 6)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function MobileGastos() {
  const { gastos, agregar, eliminar } = useGastos()
  const [tab, setTab]             = useState<'analisis' | 'historial'>('analisis')
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
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-end justify-between mb-1">
          <div>
            <p className="text-2xl font-extrabold tracking-tight leading-none">Finanzas</p>
            <p className="text-zinc-500 text-sm mt-0.5">Gestión de gastos</p>
          </div>
          <button
            onClick={() => { setPresupuestoInput(presupuestoVal > 0 ? String(presupuestoVal) : ''); setShowSettings(true) }}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 text-accent active:bg-zinc-800"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-900 mt-5">
        {(['analisis', 'historial'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-extrabold tracking-widest uppercase transition-colors relative ${
              tab === t ? 'text-accent' : 'text-zinc-500'
            }`}
          >
            {t === 'analisis' ? 'Análisis' : 'Historial'}
            {tab === t && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      {/* ── ANÁLISIS ── */}
      {tab === 'analisis' && (
        <div className="flex-1 px-6 py-6 pb-28 flex flex-col gap-5">
          <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Dashboard</p>

          {/* Tendencia mensual */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-5">
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest px-6 mb-4">Tendencia Mensual</p>
            <div className="px-2">
              <TendenciaChart gastos={gastos} presupuesto={presupuestoVal} />
            </div>
          </div>

          {/* Distribución métodos */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-5">
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest px-6 mb-4">Distribución de Métodos</p>
            <div className="px-2">
              <MetodosChart gastos={gastos} />
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {tab === 'historial' && (
        <div className="flex-1 flex flex-col">
          <div className="px-6 pt-5 pb-4 flex flex-col gap-4">
            {/* Mes selector */}
            <div className="flex items-center justify-between">
              <button onClick={() => setMesOffset(v => v - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-zinc-800">
                <ChevronLeft size={18} />
              </button>
              <span className="text-white font-bold capitalize text-sm">{mesNombre(mesActual)}</span>
              <button onClick={() => setMesOffset(v => Math.min(v + 1, 0))} disabled={mesOffset === 0}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:bg-zinc-800 disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Total */}
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
                    <div className={`h-full rounded-full transition-all ${pct >= 1 ? 'bg-red-500' : pct >= 0.8 ? 'bg-yellow-500' : 'bg-accent'}`}
                      style={{ width: `${pct * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Section header */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-widest">Movimientos</p>
              <button onClick={() => setShowForm(true)}
                className="h-8 px-3 bg-white text-zinc-950 rounded-lg text-xs font-bold active:opacity-80">
                + Añadir
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 px-6 pb-28 flex flex-col gap-5">
            {dias.length === 0 && (
              <div className="py-10 text-center text-zinc-600 text-sm">Sin movimientos este mes</div>
            )}
            {dias.map(dia => (
              <div key={dia}>
                <p className="text-zinc-500 text-[11px] font-extrabold uppercase tracking-widest mb-2">{diaLabel(dia)}</p>
                <div className="flex flex-col divide-y divide-zinc-800 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  {porDia[dia].map(g => (
                    <GastoRow key={g.id} g={g} onDelete={() => setConfirmId(g.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      {tab === 'historial' && (
        <button onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-5 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform text-white text-2xl font-light z-30">
          +
        </button>
      )}

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
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Presupuesto mensual">
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

function GastoRow({ g, onDelete }: { g: Gasto; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div onClick={() => setExpanded(e => !e)} className={`px-4 py-3.5 transition-colors ${expanded ? 'bg-zinc-800/40' : ''}`}>
      <div className="flex items-center">
        <span className="text-zinc-500 text-xs w-14 flex-shrink-0">{formatFecha(g.fecha)}</span>
        <span className="flex-1 text-white text-sm font-medium truncate">{g.descripcion}</span>
        <span className="text-white font-bold text-sm ml-2 flex-shrink-0">{formatCLP(g.monto)}</span>
      </div>
      {expanded && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-red-500/70 active:text-red-400">
            <Trash2 size={18} />
          </button>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${METODO_COLOR[g.metodoPago] ?? METODO_COLOR['']}`}>
            {g.metodoPago.toUpperCase() || 'SIN MÉTODO'}
          </span>
        </div>
      )}
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
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Método de pago</p>
        <div className="grid grid-cols-2 gap-2">
          {METODOS.map(m => (
            <button key={m} type="button" onClick={() => setMetodo(m)}
              className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${metodo === m ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" disabled={!descripcion || !monto || !metodo}
        className="bg-accent text-white font-bold rounded-2xl py-4 disabled:opacity-40 active:opacity-80">
        Guardar Registro
      </button>
    </form>
  )
}
