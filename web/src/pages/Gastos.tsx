import { useState } from 'react'
import { Settings, Trash2, ChevronDown } from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useGastos } from '../store/useGastos'
import ChartContainer from '../components/ChartContainer'
import Donut, { type DonutSlice } from '../components/Donut'
import Modal from '../components/Modal'
import { formatCLP, formatFecha, mesLabel } from '../lib/format'
import { METODOS, ORIGEN_LABEL, colorFor } from '../lib/colors'
import type { Gasto, NuevoGasto } from '../types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const CHART_OPTS_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#71717a', font: { size: 11 } }, grid: { color: 'rgba(63,63,70,0.5)' } },
    y: { ticks: { color: '#71717a', font: { size: 11 }, callback: (v: number) => `$${(v/1000).toFixed(0)}k` }, grid: { color: 'rgba(63,63,70,0.5)' }, beginAtZero: true },
  },
}

export default function Gastos() {
  const { gastos, agregar, eliminar } = useGastos()
  const [tab, setTab] = useState<'analisis' | 'historial'>('analisis')
  const [presupuesto, setPresupuesto] = useState(() => {
    return Number(localStorage.getItem('fin_presupuesto') ?? '0')
  })
  const [showSettings, setShowSettings] = useState(false)
  const [presupuestoInput, setPresupuestoInput] = useState('')

  function savePresupuesto() {
    const v = parseInt(presupuestoInput)
    if (!isNaN(v) && v > 0) {
      setPresupuesto(v)
      localStorage.setItem('fin_presupuesto', String(v))
    }
    setShowSettings(false)
  }

  return (
    <div className="min-h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-6 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Finanzas</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Gestión de gastos</p>
        </div>
        <button
          onClick={() => { setPresupuestoInput(presupuesto > 0 ? String(presupuesto) : ''); setShowSettings(true) }}
          className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl text-accent hover:bg-zinc-800 transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 px-5">
        {(['analisis', 'historial'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 mr-6 text-xs font-extrabold tracking-widest uppercase transition-colors border-b-2 ${
              tab === t
                ? 'text-accent border-accent'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {t === 'analisis' ? 'Análisis' : 'Historial'}
          </button>
        ))}
      </div>

      <div className="p-5 flex flex-col gap-5">
        {tab === 'analisis' ? (
          <AnalisisTab gastos={gastos} presupuesto={presupuesto} />
        ) : (
          <HistorialTab gastos={gastos} onAgregar={agregar} onEliminar={eliminar} />
        )}
      </div>

      {/* Settings modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Configuración">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-2">
              Presupuesto Mensual
            </label>
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus-within:border-accent transition-colors">
              <span className="text-zinc-500 font-bold">$</span>
              <input
                type="number"
                className="flex-1 bg-transparent text-white outline-none text-sm"
                placeholder={presupuesto > 0 ? String(presupuesto) : '0'}
                value={presupuestoInput}
                onChange={e => setPresupuestoInput(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={savePresupuesto}
            className="bg-accent text-white font-bold rounded-xl py-3 hover:opacity-90 transition-opacity"
          >
            Guardar
          </button>
        </div>
      </Modal>
    </div>
  )
}

function AnalisisTab({ gastos, presupuesto }: { gastos: Gasto[], presupuesto: number }) {
  if (gastos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="text-zinc-600 text-sm">Sin datos todavía.</p>
        <p className="text-zinc-700 text-xs">Agrega gastos en la pestaña Historial.</p>
      </div>
    )
  }

  // Agrupar por mes
  const porMes: Record<string, number> = {}
  gastos.forEach(g => {
    const mes = g.fecha.slice(0, 7)
    porMes[mes] = (porMes[mes] ?? 0) + g.monto
  })
  const meses = Object.keys(porMes).sort()
  const labelsLinea = meses.map(mesLabel)
  const dataLinea = meses.map(m => porMes[m])


  const lineData = {
    labels: labelsLinea,
    datasets: [
      {
        data: dataLinea,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.12)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#8b5cf6',
        pointRadius: 4,
      },
      ...(presupuesto > 0 ? [{
        data: Array(meses.length).fill(presupuesto),
        borderColor: 'rgba(239,68,68,0.6)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        label: 'Presupuesto',
      }] : []),
    ],
  }

  const lineOpts = {
    ...CHART_OPTS_BASE,
    plugins: {
      ...CHART_OPTS_BASE.plugins,
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number } }) => formatCLP(ctx.parsed.y),
        },
      },
    },
  }

  return (
    <>
      <ChartContainer title="Tendencia Mensual">
        <Line data={lineData} options={lineOpts as never} />
      </ChartContainer>
      <DistribucionCard gastos={gastos} />
    </>
  )
}

/**
 * Distribución del gasto por categoría de pago.
 *
 * Las compras auto-generadas (marcar una cuota, pagar una suscripción) se insertan
 * sin método de pago, así que se agrupan por su `origen` en vez de acumularse en
 * una etiqueta vacía. Eso además separa el gasto comprometido del discrecional.
 *
 * El toggle cambia la pregunta: "cuánto gasté con cada medio" (monto) frente a
 * "con qué frecuencia lo uso" (número de movimientos).
 */
function DistribucionCard({ gastos }: { gastos: Gasto[] }) {
  const [modo, setModo] = useState<'monto' | 'frecuencia'>('monto')

  const acc: Record<string, { monto: number; usos: number }> = {}
  gastos.forEach(g => {
    const cat = ORIGEN_LABEL[g.origen] ?? g.metodoPago ?? ''
    if (!cat) return // gasto manual sin método declarado: no clasificable
    acc[cat] ??= { monto: 0, usos: 0 }
    acc[cat].monto += g.monto
    acc[cat].usos  += 1
  })

  const slices: DonutSlice[] = Object.entries(acc)
    .map(([label, v]) => ({ label, value: modo === 'monto' ? v.monto : v.usos }))
    .sort((a, b) => b.value - a.value)
    .map((s, i) => ({ ...s, color: colorFor(s.label, i) }))

  const sinClasificar = gastos.filter(g => !ORIGEN_LABEL[g.origen] && !g.metodoPago).length

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-5">
      <div className="flex items-center justify-between px-5 mb-4 gap-3">
        <p className="text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase">
          Distribución del Gasto
        </p>
        <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
          {(['monto', 'frecuencia'] as const).map(m => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition-colors ${
                modo === m ? 'bg-accent text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5">
        <Donut
          slices={slices}
          label={modo === 'monto' ? 'del total' : 'de los usos'}
          formatValue={v => modo === 'monto' ? formatCLP(v) : `${v} ${v === 1 ? 'uso' : 'usos'}`}
        />
        {sinClasificar > 0 && (
          <p className="text-zinc-600 text-xs mt-4">
            {sinClasificar} {sinClasificar === 1 ? 'movimiento' : 'movimientos'} sin método de pago
            {' '}{sinClasificar === 1 ? 'quedó' : 'quedaron'} fuera del gráfico.
          </p>
        )}
      </div>
    </div>
  )
}

function HistorialTab({
  gastos, onAgregar, onEliminar,
}: {
  gastos: Gasto[]
  onAgregar: (g: NuevoGasto) => void
  onEliminar: (id: number) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [verTodos, setVerTodos] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const visibles = verTodos ? gastos : gastos.slice(0, 10)

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase">
          Movimientos
        </span>
        <button
          onClick={() => setShowForm(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            showForm
              ? 'bg-zinc-800 text-zinc-400'
              : 'bg-white text-zinc-950'
          }`}
        >
          {showForm ? 'Cerrar' : '+ Añadir'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <FormNuevoGasto
          onSave={g => { onAgregar(g); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[80px_1fr_auto] gap-2 px-4 py-3 border-b border-zinc-800">
          <span className="text-zinc-600 text-[10px] font-bold uppercase">Fecha</span>
          <span className="text-zinc-600 text-[10px] font-bold uppercase">Descripción</span>
          <span className="text-zinc-600 text-[10px] font-bold uppercase">Monto</span>
        </div>

        {gastos.length === 0 && (
          <div className="py-10 text-center text-zinc-700 text-sm">Sin registros</div>
        )}

        {visibles.map(g => (
          <div key={g.id}>
            <button
              className="w-full grid grid-cols-[80px_1fr_auto] gap-2 px-4 py-3.5 text-left hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/60"
              onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
            >
              <span className="text-zinc-500 text-xs">{formatFecha(g.fecha)}</span>
              <span className="text-white text-sm truncate">{g.descripcion}</span>
              <span className="text-white text-sm font-bold whitespace-nowrap">{formatCLP(g.monto)}</span>
            </button>
            {expandedId === g.id && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/30 border-b border-zinc-800/60 animate-fade-in">
                <button
                  onClick={() => setConfirmId(g.id)}
                  className="text-red-500/80 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                  {g.metodoPago}
                </span>
              </div>
            )}
          </div>
        ))}

        {gastos.length > 10 && (
          <button
            onClick={() => setVerTodos(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-3.5 text-accent text-sm font-bold hover:bg-zinc-800/30 transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform ${verTodos ? 'rotate-180' : ''}`} />
            {verTodos ? 'Ver menos' : `Ver todos (${gastos.length})`}
          </button>
        )}
      </div>

      {/* Confirm delete */}
      <Modal open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar gasto?</h2>
          <p className="text-zinc-400 text-sm">Esta acción no se puede deshacer.</p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setConfirmId(null)}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => { if (confirmId) { onEliminar(confirmId); setConfirmId(null); setExpandedId(null) } }}
              className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function FormNuevoGasto({
  onSave, onCancel,
}: {
  onSave: (g: NuevoGasto) => void
  onCancel: () => void
}) {
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [metodo, setMetodo] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!descripcion || !monto || !fecha || !metodo) return
    onSave({ descripcion, monto: parseInt(monto), fecha, metodoPago: metodo })
  }

  return (
    <form onSubmit={submit} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 animate-slide-up">
      <input
        type="text"
        placeholder="¿En qué gastaste?"
        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent transition-colors placeholder:text-zinc-600"
        value={descripcion}
        onChange={e => setDescripcion(e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder="Monto"
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent transition-colors placeholder:text-zinc-600"
          value={monto}
          onChange={e => setMonto(e.target.value.replace(/\D/g, ''))}
          min="0"
          required
        />
        <input
          type="date"
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent transition-colors"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          required
        />
      </div>

      <div>
        <p className="text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase mb-2">Método de pago</p>
        <div className="flex flex-wrap gap-2">
          {METODOS.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMetodo(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                metodo === m
                  ? 'bg-accent text-white'
                  : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="bg-accent text-white font-bold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
        disabled={!descripcion || !monto || !metodo}
      >
        Guardar Registro
      </button>
    </form>
  )
}
