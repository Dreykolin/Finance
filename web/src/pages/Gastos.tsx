import { useState } from 'react'
import { Settings, Trash2, ChevronDown, TrendingUp } from 'lucide-react'
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
import StatTile from '../components/StatTile'
import { PageHeader, Card, CardHeader, SectionLabel, Button, IconButton, INPUT } from '../components/ui'
import { METODOS, TIPO_LABEL, TIPOS, SIN_METODO, colorFor, ordenCanonico } from '../lib/colors'
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
      <PageHeader Icono={TrendingUp} titulo="Gastos" subtitulo="Tus movimientos y en qué se va el mes">
        <IconButton
          Icono={Settings}
          title="Presupuesto mensual"
          onClick={() => { setPresupuestoInput(presupuesto > 0 ? String(presupuesto) : ''); setShowSettings(true) }}
        />
      </PageHeader>

      {/*
        * Mismo reparto que Ahorros: a la izquierda lo que se lee (análisis, fijo
        * al hacer scroll), a la derecha lo que se edita (el registro, que crece).
        * Las pestañas Análisis/Historial eran una concesión al ancho del móvil;
        * en escritorio las dos vistas caben simultáneamente.
        */}
      <div className="px-5 pb-5">
        <ResumenMes gastos={gastos} presupuesto={presupuesto} />
      </div>

      <div className="px-5 pb-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="flex flex-col gap-5 xl:sticky xl:top-5">
          <AnalisisTab gastos={gastos} presupuesto={presupuesto} />
        </div>
        <HistorialTab gastos={gastos} onAgregar={agregar} onEliminar={eliminar} />
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
          <Button onClick={savePresupuesto}>Guardar</Button>
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
 * Los cuatro números con los que se abre el mes. Van como fichas y no como
 * gráfico: para un valor único un gráfico de una sola barra no aporta nada que
 * la cifra no diga mejor.
 */
function ResumenMes({ gastos, presupuesto }: { gastos: Gasto[]; presupuesto: number }) {
  const hoy = new Date()
  const clave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const mesActual   = clave(hoy)
  const mesAnterior = clave(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1))

  const suma = (xs: Gasto[]) => xs.reduce((t, g) => t + g.monto, 0)
  const delMes    = gastos.filter(g => g.fecha.startsWith(mesActual))
  const totalMes  = suma(delMes)
  const totalPrev = suma(gastos.filter(g => g.fecha.startsWith(mesAnterior)))

  // Proyección lineal: a este ritmo diario, cómo cierra el mes. Solo tiene
  // sentido con unos días corridos; antes de eso el ritmo es puro ruido.
  const diaDeHoy = hoy.getDate()
  const diasMes  = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const proyeccion = diaDeHoy >= 3 ? Math.round(totalMes / diaDeHoy * diasMes) : null

  const comprometido = suma(delMes.filter(g => g.origen !== 'manual'))
  const pctComprometido = totalMes > 0 ? Math.round(comprometido / totalMes * 100) : 0

  // El promedio excluye el mes en curso, que está a medias y lo hundiría.
  const porMes: Record<string, number> = {}
  gastos.forEach(g => {
    const m = g.fecha.slice(0, 7)
    if (m !== mesActual) porMes[m] = (porMes[m] ?? 0) + g.monto
  })
  const cerrados = Object.values(porMes)
  const promedio = cerrados.length > 0
    ? Math.round(cerrados.reduce((a, b) => a + b, 0) / cerrados.length)
    : 0

  const deltaPct = totalPrev > 0 ? (totalMes - totalPrev) / totalPrev * 100 : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile
        etiqueta="Gastado este mes"
        valor={formatCLP(totalMes)}
        delta={totalPrev > 0 ? { pct: deltaPct, respecto: 'vs. mes anterior' } : undefined}
        medidor={presupuesto > 0
          ? { pct: totalMes / presupuesto, limite: formatCLP(presupuesto) }
          : undefined}
        nota={presupuesto === 0 ? 'Fija un presupuesto para ver el avance' : undefined}
      />

      <StatTile
        etiqueta="Proyección de cierre"
        valor={proyeccion !== null ? formatCLP(proyeccion) : '—'}
        nota={proyeccion === null
          ? 'Disponible tras unos días del mes'
          : presupuesto > 0 && proyeccion > presupuesto
            ? `Te pasarías por ${formatCLP(proyeccion - presupuesto)}`
            : `A tu ritmo de estos ${diaDeHoy} días`}
      />

      <StatTile
        etiqueta="Comprometido"
        valor={formatCLP(comprometido)}
        nota={totalMes > 0
          ? `${pctComprometido}% del mes en cuotas y suscripciones`
          : 'Cuotas y suscripciones del mes'}
      />

      <StatTile
        etiqueta="Promedio mensual"
        valor={promedio > 0 ? formatCLP(promedio) : '—'}
        nota={cerrados.length > 0
          ? `Sobre ${cerrados.length} ${cerrados.length === 1 ? 'mes cerrado' : 'meses cerrados'}`
          : 'Aún no hay un mes completo'}
      />
    </div>
  )
}

/**
 * Borrar un gasto auto-generado no es solo quitarlo del historial: revierte el
 * pago en el módulo que lo creó. Conviene decirlo antes, no después.
 */
function avisoBorrado(gastos: Gasto[], id: number | null): string {
  const g = gastos.find(x => x.id === id)
  if (!g) return 'Esta acción no se puede deshacer.'
  if (g.origen === 'cuota') {
    return 'Este gasto lo generó una cuota. Al borrarlo se descontará esa cuota del producto, como si el pago no hubiera ocurrido.'
  }
  if (g.origen === 'suscripcion') {
    return 'Este gasto lo generó una suscripción. Al borrarlo, ese mes quedará marcado como no cobrado en su carril.'
  }
  return 'Esta acción no se puede deshacer.'
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
  const [eje, setEje]   = useState<'metodo' | 'tipo'>('metodo')

  const acc: Record<string, { monto: number; usos: number }> = {}
  gastos.forEach(g => {
    // Dos dimensiones distintas sobre el mismo gasto: con qué se pagó, y de
    // dónde vino. Un cargo de Netflix a la tarjeta de crédito es "Crédito" en un
    // eje y "Suscripciones" en el otro; mezclarlas en uno solo pierde ambas.
    const cat = eje === 'tipo'
      ? (TIPO_LABEL[g.origen] ?? TIPO_LABEL.manual)
      : (g.metodoPago || SIN_METODO)
    acc[cat] ??= { monto: 0, usos: 0 }
    acc[cat].monto += g.monto
    acc[cat].usos  += 1
  })

  // Orden canónico, no por magnitud: la paleta está verificada sobre pares
  // adyacentes, así que reordenar los segmentos según los datos rompería la
  // separación garantizada entre colores vecinos.
  const orden = eje === 'tipo' ? TIPOS : METODOS
  const slices: DonutSlice[] = ordenCanonico(Object.keys(acc), orden).map(label => ({
    label,
    value: modo === 'monto' ? acc[label].monto : acc[label].usos,
    color: colorFor(label),
  }))

  const sinDeclarar = gastos.filter(g => !g.metodoPago).length

  const Toggle = <T extends string>(
    { valor, opciones, onChange }: { valor: T; opciones: readonly T[]; onChange: (v: T) => void }
  ) => (
    <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
      {opciones.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition-colors ${
            valor === o ? 'bg-accent text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {o === 'metodo' ? 'método' : o}
        </button>
      ))}
    </div>
  )

  return (
    <Card tipo="grafico">
      <div className="flex items-center justify-between px-5 mb-2 gap-3 flex-wrap">
        <SectionLabel>Distribución del Gasto</SectionLabel>
        <div className="flex items-center gap-2">
          <Toggle valor={eje} opciones={['metodo', 'tipo'] as const} onChange={setEje} />
          <Toggle valor={modo} opciones={['monto', 'frecuencia'] as const} onChange={setModo} />
        </div>
      </div>
      <p className="text-zinc-600 text-xs px-5 mb-4">
        {eje === 'metodo' ? 'Con qué pagas' : 'De dónde viene el gasto'}
      </p>
      <div className="px-5">
        <Donut
          slices={slices}
          label={modo === 'monto' ? 'del total' : 'de los usos'}
          formatValue={v => modo === 'monto' ? formatCLP(v) : `${v} ${v === 1 ? 'uso' : 'usos'}`}
        />
        {eje === 'metodo' && sinDeclarar > 0 && (
          <p className="text-zinc-600 text-xs mt-4">
            {sinDeclarar} {sinDeclarar === 1 ? 'movimiento' : 'movimientos'} sin método declarado.
            Puedes fijarlo en la cuota o suscripción que lo genera.
          </p>
        )}
      </div>
    </Card>
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
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const visibles = verTodos ? gastos : gastos.slice(0, 12)

  return (
    <Card tipo="lista">
      <CardHeader titulo="Movimientos">
        <Button
          tamano="sm"
          variante={showForm ? 'secundario' : 'primario'}
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? 'Cerrar' : '+ Añadir'}
        </Button>
      </CardHeader>

      {showForm && (
        <div className="p-4 border-b border-zinc-800">
          <FormNuevoGasto
            onSave={g => { onAgregar(g); setShowForm(false) }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="grid grid-cols-[64px_1fr_auto] gap-2 px-4 py-2.5">
        <span className="text-zinc-600 text-[10px] font-bold uppercase">Fecha</span>
        <span className="text-zinc-600 text-[10px] font-bold uppercase">Descripción</span>
        <span className="text-zinc-600 text-[10px] font-bold uppercase">Monto</span>
      </div>

      {gastos.length === 0 && (
        <div className="py-10 text-center text-zinc-700 text-sm">Sin registros</div>
      )}

      {visibles.map(g => <GastoRow key={g.id} g={g} onDelete={() => setConfirmId(g.id)} />)}

      {gastos.length > 12 && (
        <button
          onClick={() => setVerTodos(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-3.5 text-accent text-sm font-bold hover:bg-zinc-800/30 transition-colors border-t border-zinc-800/60"
        >
          <ChevronDown size={16} className={`transition-transform ${verTodos ? 'rotate-180' : ''}`} />
          {verTodos ? 'Ver menos' : `Ver todos (${gastos.length})`}
        </button>
      )}

      <Modal open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar gasto?</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">{avisoBorrado(gastos, confirmId)}</p>
          <div className="flex gap-3 mt-2">
            <Button variante="secundario" className="flex-1" onClick={() => setConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variante="peligro"
              className="flex-1"
              onClick={() => { if (confirmId) { onEliminar(confirmId); setConfirmId(null) } }}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}

/**
 * Fila del historial. En la columna estrecha la descripción no cabe entera, así
 * que se recorta en una línea; al abrir la fila se muestra completa, junto al
 * método de pago y la acción de borrar.
 */
function GastoRow({ g, onDelete }: { g: Gasto; onDelete: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const auto = g.origen === 'manual' ? null : TIPO_LABEL[g.origen]

  return (
    <div className={`border-t border-zinc-800/60 transition-colors ${abierto ? 'bg-zinc-800/30' : ''}`}>
      <button
        className="w-full grid grid-cols-[64px_1fr_auto] gap-2 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
        onClick={() => setAbierto(v => !v)}
      >
        <span className="text-zinc-500 text-xs self-center">{formatFecha(g.fecha)}</span>
        <span className="text-white text-sm truncate self-center">{g.descripcion}</span>
        <span className="text-white text-sm font-bold whitespace-nowrap self-center tabular-nums">
          {formatCLP(g.monto)}
        </span>
      </button>

      {abierto && (
        <div className="animate-despliegue">
          <div className="px-4 pb-3 flex flex-col gap-2.5">
          <p className="text-zinc-300 text-sm leading-snug break-words">{g.descripcion}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={onDelete}
              className="text-red-500/80 hover:text-red-400 transition-colors"
            >
              <Trash2 size={16} />
            </button>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
              auto ? 'bg-accent/15 text-accent' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {auto || g.metodoPago || 'Sin método'}
            </span>
          </div>
          </div>
        </div>
      )}
    </div>
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
        className={INPUT}
        value={descripcion}
        onChange={e => setDescripcion(e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder="Monto"
          className={INPUT}
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
        <SectionLabel className="mb-2">Método de pago</SectionLabel>
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

      <Button type="submit" disabled={!descripcion || !monto || !metodo}>
        Guardar Registro
      </Button>
    </form>
  )
}
