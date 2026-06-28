import { useState } from 'react'
import { Flag, Plus, Trash2, CheckCircle, Circle } from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useAhorros, useMetas } from '../store/useAhorros'
import ChartContainer from '../components/ChartContainer'
import Modal from '../components/Modal'
import { formatCLP, formatFecha, mesLabel } from '../lib/format'
import type { Ahorro, MetaAhorro } from '../types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

export default function Ahorros() {
  const { ahorros, agregar: agregarAhorro, eliminar: eliminarAhorro } = useAhorros()
  const { metas, agregar: agregarMeta, eliminar: eliminarMeta, toggleCompletada } = useMetas()

  const [showMetas, setShowMetas] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showMetaForm, setShowMetaForm] = useState(false)
  const [confirmAhorroId, setConfirmAhorroId] = useState<number | null>(null)
  const [confirmMetaId, setConfirmMetaId] = useState<number | null>(null)

  // Total actual
  const totalActual = ahorros.reduce((s, a) => s + (a.esRetiro ? -a.monto : a.monto), 0)

  // Primera meta activa (menor monto objetivo)
  const metaActiva = metas
    .filter(m => !m.completada)
    .reduce((min: MetaAhorro | null, m) => (!min || m.montoObjetivo < min.montoObjetivo ? m : min), null)

  // Datos del gráfico: acumulado a lo largo del tiempo
  const sortedAhorros = [...ahorros].sort((a, b) => a.fecha.localeCompare(b.fecha))
  let acum = 0
  const puntos = sortedAhorros.map(a => {
    acum += a.esRetiro ? -a.monto : a.monto
    return { fecha: a.fecha.slice(0, 7), total: acum }
  })
  // Agrupar por mes (último valor del mes)
  const porMes: Record<string, number> = {}
  puntos.forEach(p => { porMes[p.fecha] = p.total })
  const mesesOrdenados = Object.keys(porMes).sort()

  const chartData = {
    labels: mesesOrdenados.map(mesLabel),
    datasets: [
      {
        data: mesesOrdenados.map(m => porMes[m]),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.1)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#8b5cf6',
        pointRadius: 4,
      },
      ...(metaActiva ? [{
        data: Array(mesesOrdenados.length).fill(metaActiva.montoObjetivo),
        borderColor: 'rgba(16,185,129,0.6)',
        borderDash: [5, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        label: metaActiva.nombre,
      }] : []),
    ],
  }

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#71717a', font: { size: 11 } }, grid: { color: 'rgba(63,63,70,0.5)' } },
      y: {
        ticks: { color: '#71717a', font: { size: 11 }, callback: (v: number) => `$${(v/1000).toFixed(0)}k` },
        grid: { color: 'rgba(63,63,70,0.5)' },
      },
    },
  }

  return (
    <div className="min-h-full bg-zinc-950 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-6 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Mis Ahorros</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Gestiona tu capital y metas.</p>
        </div>
        <button
          onClick={() => setShowMetas(v => !v)}
          className={`p-2 rounded-xl border transition-colors ${
            showMetas
              ? 'bg-accent border-accent text-white'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Flag size={18} />
        </button>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {/* Total card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Ahorrado</p>
            <p className={`text-2xl font-extrabold mt-1 ${totalActual >= 0 ? 'text-white' : 'text-red-400'}`}>
              {formatCLP(totalActual)}
            </p>
          </div>
          {metaActiva && (
            <div className="text-right">
              <p className="text-zinc-600 text-xs">Meta activa</p>
              <p className="text-emerald-500 text-sm font-bold mt-0.5">{metaActiva.nombre}</p>
              <p className="text-zinc-500 text-xs">{formatCLP(metaActiva.montoObjetivo)}</p>
            </div>
          )}
        </div>

        {/* Metas panel */}
        {showMetas && (
          <div className="bg-zinc-900 border border-accent/20 rounded-2xl p-4 flex flex-col gap-3 animate-slide-up">
            <div className="flex items-center justify-between">
              <p className="text-white font-bold">Metas de Ahorro</p>
              <button
                onClick={() => setShowMetaForm(v => !v)}
                className="text-accent hover:opacity-80 transition-opacity"
              >
                <Plus size={18} />
              </button>
            </div>

            {showMetaForm && (
              <FormNuevaMeta
                onSave={m => { agregarMeta(m); setShowMetaForm(false) }}
              />
            )}

            {metas.length === 0 && (
              <p className="text-zinc-700 text-sm text-center py-2">Sin metas todavía.</p>
            )}

            {metas.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <button
                  onClick={() => toggleCompletada(m.id)}
                  className="flex-shrink-0 transition-colors"
                >
                  {m.completada
                    ? <CheckCircle size={20} className="text-accent" />
                    : <Circle size={20} className="text-zinc-600" />
                  }
                </button>
                <button
                  onClick={() => toggleCompletada(m.id)}
                  className="flex-1 text-left"
                >
                  <p className={`text-sm font-medium ${m.completada ? 'line-through text-zinc-600' : 'text-white'}`}>
                    {m.nombre}
                  </p>
                  <p className="text-zinc-500 text-xs">{formatCLP(m.montoObjetivo)}</p>
                </button>
                <button
                  onClick={() => setConfirmMetaId(m.id)}
                  className="text-zinc-700 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {ahorros.length > 0 ? (
          <ChartContainer title="Crecimiento vs Meta">
            <Line data={chartData} options={chartOpts as never} />
          </ChartContainer>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-700 text-sm">
            Agrega movimientos para ver el gráfico.
          </div>
        )}

        {/* Movimientos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
            <p className="text-white font-bold">Movimientos</p>
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
            <div className="p-4 border-b border-zinc-800">
              <FormNuevoAhorro
                onSave={a => { agregarAhorro(a); setShowForm(false) }}
              />
            </div>
          )}

          {/* Table header */}
          <div className="grid grid-cols-[90px_1fr_auto_36px] gap-2 px-4 py-2.5">
            <span className="text-zinc-600 text-[10px] font-bold uppercase">Fecha</span>
            <span className="text-zinc-600 text-[10px] font-bold uppercase">Tipo</span>
            <span className="text-zinc-600 text-[10px] font-bold uppercase">Monto</span>
            <span />
          </div>

          {ahorros.length === 0 && (
            <div className="py-8 text-center text-zinc-700 text-sm">Sin movimientos</div>
          )}

          {ahorros.map(a => (
            <div key={a.id} className="grid grid-cols-[90px_1fr_auto_36px] gap-2 px-4 py-3 items-center border-t border-zinc-800/60">
              <span className="text-zinc-500 text-xs">{formatFecha(a.fecha)}</span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${a.esRetiro ? 'text-red-400' : 'text-accent'}`}>
                {a.esRetiro ? 'Retiro' : 'Ahorro'}
              </span>
              <span className={`font-bold text-sm ${a.esRetiro ? 'text-red-400' : 'text-white'}`}>
                {a.esRetiro ? '-' : '+'}{formatCLP(a.monto)}
              </span>
              <button
                onClick={() => setConfirmAhorroId(a.id)}
                className="flex items-center justify-center text-zinc-700 hover:text-red-500 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm delete ahorro */}
      <Modal open={confirmAhorroId !== null} onClose={() => setConfirmAhorroId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar registro?</h2>
          <p className="text-zinc-400 text-sm">Se borrará permanentemente.</p>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setConfirmAhorroId(null)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm">Cancelar</button>
            <button
              onClick={() => { if (confirmAhorroId) { eliminarAhorro(confirmAhorroId); setConfirmAhorroId(null) } }}
              className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-sm"
            >Eliminar</button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete meta */}
      <Modal open={confirmMetaId !== null} onClose={() => setConfirmMetaId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar meta?</h2>
          <p className="text-zinc-400 text-sm">Se quitará de tus objetivos.</p>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setConfirmMetaId(null)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm">Cancelar</button>
            <button
              onClick={() => { if (confirmMetaId) { eliminarMeta(confirmMetaId); setConfirmMetaId(null) } }}
              className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-sm"
            >Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function FormNuevoAhorro({ onSave }: { onSave: (a: Omit<Ahorro, 'id'>) => void }) {
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [esRetiro, setEsRetiro] = useState(false)

  const inputCls = "bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent transition-colors placeholder:text-zinc-600 w-full"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!monto) return
    onSave({ monto: parseInt(monto), fecha, esRetiro })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <input className={inputCls} type="number" placeholder="Monto" value={monto} onChange={e => setMonto(e.target.value.replace(/\D/g,''))} required />
        <input className={inputCls} type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
      </div>
      <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
        <div>
          <p className="text-white text-sm font-medium">¿Es un retiro?</p>
          <p className="text-zinc-500 text-xs">Se restará del total</p>
        </div>
        <button
          type="button"
          onClick={() => setEsRetiro(v => !v)}
          className={`w-11 h-6 rounded-full transition-colors relative ${esRetiro ? 'bg-red-500/40' : 'bg-zinc-700'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${esRetiro ? 'left-5 bg-red-400' : 'left-0.5 bg-zinc-400'}`} />
        </button>
      </div>
      <button
        type="submit"
        className={`font-bold rounded-xl py-3 text-sm transition-opacity hover:opacity-90 ${
          esRetiro ? 'bg-red-500 text-white' : 'bg-white text-zinc-950'
        }`}
      >
        {esRetiro ? 'Registrar Retiro' : 'Guardar Ahorro'}
      </button>
    </form>
  )
}

function FormNuevaMeta({ onSave }: { onSave: (m: Omit<MetaAhorro, 'id'>) => void }) {
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')

  const inputCls = "bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-accent transition-colors placeholder:text-zinc-600 w-full"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre || !monto) return
    onSave({ nombre, montoObjetivo: parseInt(monto), completada: false })
    setNombre(''); setMonto('')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 pb-2 border-b border-zinc-800">
      <input className={inputCls} placeholder="Nombre de la meta" value={nombre} onChange={e => setNombre(e.target.value)} required />
      <input className={inputCls} type="number" placeholder="Monto objetivo" value={monto} onChange={e => setMonto(e.target.value.replace(/\D/g,''))} required />
      <button type="submit" className="bg-accent text-white font-bold rounded-xl py-2 text-sm hover:opacity-90 transition-opacity">
        Añadir
      </button>
    </form>
  )
}
