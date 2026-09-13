import { useState } from 'react'
import { Flag, Plus, Trash2, CheckCircle, Circle, PiggyBank } from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useAhorros, useMetas } from '../store/useAhorros'
import ChartContainer from '../components/ChartContainer'
import Modal from '../components/Modal'
import StatTile from '../components/StatTile'
import DetalleMes, { type PuntoDia, type MovimientoDetalle } from '../components/DetalleMes'
import { PageHeader, CardHeader, SectionLabel, Button, IconButton, Card, INPUT } from '../components/ui'
import { formatCLP, formatFecha, mesLabel } from '../lib/format'
import type { Ahorro, MetaAhorro } from '../types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// Una línea de umbral por meta, en orden de cercanía.
const META_COLORS = [
  'rgba(16,185,129,0.75)',
  'rgba(56,189,248,0.7)',
  'rgba(251,191,36,0.7)',
  'rgba(244,114,182,0.7)',
  'rgba(148,163,184,0.65)',
]

/**
 * Detalle de un mes de ahorro.
 *
 * A diferencia de los gastos, la serie no parte de cero: arranca del saldo que
 * ya había al empezar el mes. Un mes de ahorro no se entiende por lo que entró,
 * sino por dónde dejó el capital — y un retiro grande sobre un saldo alto no
 * significa lo mismo que sobre uno bajo.
 */
function detalleAhorroMes(ahorros: Ahorro[], periodo: string): {
  puntos: PuntoDia[]
  resumen: { etiqueta: string; valor: string; acento?: boolean }[]
  movimientos: MovimientoDetalle[]
} {
  const neto = (a: Ahorro) => (a.esRetiro ? -a.monto : a.monto)

  const saldoPrevio = ahorros
    .filter(a => a.fecha.slice(0, 7) < periodo)
    .reduce((t, a) => t + neto(a), 0)

  const delMes = ahorros
    .filter(a => a.fecha.startsWith(periodo))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const [anio, mes] = periodo.split('-').map(Number)
  const diasDelMes = new Date(anio, mes, 0).getDate()
  const hoy = new Date()
  const esMesActual = hoy.getFullYear() === anio && hoy.getMonth() + 1 === mes
  const hasta = esMesActual ? hoy.getDate() : diasDelMes

  const porDia: Record<number, number> = {}
  delMes.forEach(a => {
    const d = Number(a.fecha.slice(8, 10))
    porDia[d] = (porDia[d] ?? 0) + neto(a)
  })

  let saldo = saldoPrevio
  const puntos: PuntoDia[] = []
  for (let d = 1; d <= hasta; d++) {
    saldo += porDia[d] ?? 0
    puntos.push({ etiqueta: String(d), valor: saldo })
  }

  const depositado = delMes.filter(a => !a.esRetiro).reduce((t, a) => t + a.monto, 0)
  const retirado   = delMes.filter(a => a.esRetiro).reduce((t, a) => t + a.monto, 0)
  const variacion  = depositado - retirado

  return {
    puntos,
    resumen: [
      { etiqueta: 'Saldo al cierre', valor: formatCLP(saldo), acento: true },
      { etiqueta: 'Depositado', valor: formatCLP(depositado) },
      { etiqueta: 'Retirado', valor: retirado > 0 ? formatCLP(retirado) : '—' },
      {
        etiqueta: 'Variación del mes',
        valor: `${variacion >= 0 ? '+' : '−'}${formatCLP(Math.abs(variacion))}`,
      },
      { etiqueta: 'Saldo inicial', valor: formatCLP(saldoPrevio) },
    ],
    movimientos: delMes
      .slice()
      .reverse()
      .map(a => ({
        id: a.id,
        fecha: a.fecha,
        texto: a.esRetiro ? 'Retiro' : 'Depósito',
        monto: a.monto,
        negativo: a.esRetiro,
      })),
  }
}

/**
 * Ritmo y plazo. El saldo por sí solo no dice si vas bien: lo que orienta es a
 * qué velocidad crece y cuándo, a esa velocidad, llegas a lo que te propusiste.
 */
function ResumenAhorros({ ahorros, total, proximaMeta, metasActivas }: {
  ahorros: Ahorro[]
  total: number
  proximaMeta: MetaAhorro | null
  metasActivas: number
}) {
  // Ritmo: neto por mes sobre los meses con movimiento. Usar meses corridos
  // castigaría a quien ahorra en tandas en vez de todos los meses.
  const porMes: Record<string, number> = {}
  ahorros.forEach(a => {
    const m = a.fecha.slice(0, 7)
    porMes[m] = (porMes[m] ?? 0) + (a.esRetiro ? -a.monto : a.monto)
  })
  const meses = Object.values(porMes)
  const ritmo = meses.length > 0
    ? Math.round(meses.reduce((x, y) => x + y, 0) / meses.length)
    : 0

  const depositado = ahorros.filter(a => !a.esRetiro).reduce((t, a) => t + a.monto, 0)
  const retirado   = ahorros.filter(a => a.esRetiro).reduce((t, a) => t + a.monto, 0)

  const falta = proximaMeta ? proximaMeta.montoObjetivo - total : 0
  const mesesParaMeta = proximaMeta && falta > 0 && ritmo > 0
    ? Math.ceil(falta / ritmo)
    : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile
        etiqueta="Total ahorrado"
        valor={formatCLP(total)}
        nota={retirado > 0 ? `${formatCLP(retirado)} retirados en total` : undefined}
        acento={total >= 0}
      />

      <StatTile
        etiqueta="Ritmo mensual"
        valor={ritmo !== 0 ? `${ritmo > 0 ? '+' : ''}${formatCLP(ritmo)}` : '—'}
        nota={meses.length > 0
          ? `Promedio de ${meses.length} ${meses.length === 1 ? 'mes' : 'meses'} con movimiento`
          : 'Sin movimientos todavía'}
      />

      <StatTile
        etiqueta={proximaMeta ? `Para "${proximaMeta.nombre}"` : 'Próxima meta'}
        valor={!proximaMeta ? '—' : falta <= 0 ? '¡Alcanzada!' : formatCLP(falta)}
        medidor={proximaMeta && proximaMeta.montoObjetivo > 0
          ? { pct: total / proximaMeta.montoObjetivo, limite: formatCLP(proximaMeta.montoObjetivo) }
          : undefined}
        nota={!proximaMeta ? 'Define una meta para seguir tu avance' : undefined}
      />

      <StatTile
        etiqueta="A este ritmo"
        valor={mesesParaMeta !== null
          ? `${mesesParaMeta} ${mesesParaMeta === 1 ? 'mes' : 'meses'}`
          : proximaMeta && falta <= 0 ? 'Cumplida' : '—'}
        nota={mesesParaMeta !== null
          ? `Hasta alcanzar "${proximaMeta!.nombre}"`
          : ritmo <= 0 && proximaMeta
            ? 'Tu ritmo actual no acerca la meta'
            : `${depositado > 0 ? formatCLP(depositado) + ' depositados' : 'Sin depósitos'}`}
      />
    </div>
  )
}

export default function Ahorros() {
  const { ahorros, agregar: agregarAhorro, eliminar: eliminarAhorro } = useAhorros()
  const { metas, agregar: agregarMeta, eliminar: eliminarMeta, toggleCompletada } = useMetas()

  const [showMetas, setShowMetas] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showMetaForm, setShowMetaForm] = useState(false)
  const [confirmAhorroId, setConfirmAhorroId] = useState<number | null>(null)
  const [confirmMetaId, setConfirmMetaId] = useState<number | null>(null)
  const [mesAbierto, setMesAbierto] = useState<string | null>(null)

  // Total actual
  const totalActual = ahorros.reduce((s, a) => s + (a.esRetiro ? -a.monto : a.monto), 0)

  // Todas las metas pendientes, de la más cercana a la más lejana.
  // Cada una se dibuja como su propia línea de umbral en el gráfico.
  const metasActivas = metas
    .filter(m => !m.completada)
    .sort((a, b) => a.montoObjetivo - b.montoObjetivo)
  const proximaMeta = metasActivas[0] ?? null

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
        pointHoverRadius: 7,
      },
      ...metasActivas.map((m, i) => ({
        data: Array(mesesOrdenados.length).fill(m.montoObjetivo),
        borderColor: META_COLORS[i % META_COLORS.length],
        borderDash: [5, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        label: `${m.nombre} · ${formatCLP(m.montoObjetivo)}`,
      })),
    ],
  }

  // El eje tiene que llegar por encima de la meta más alta, o las líneas de
  // umbral quedan fuera del área visible y la brecha no se puede leer.
  const techo = Math.max(
    totalActual,
    ...metasActivas.map(m => m.montoObjetivo),
    ...mesesOrdenados.map(m => porMes[m]),
    1,
  )

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    // El punto de un mes lleva al movimiento de ese mes, no solo a su saldo final.
    onClick: (_e: unknown, elementos: { index: number }[]) => {
      const i = elementos[0]?.index
      if (i !== undefined && mesesOrdenados[i]) setMesAbierto(mesesOrdenados[i])
    },
    onHover: (e: { native?: Event }, elementos: unknown[]) => {
      const destino = (e.native?.target as HTMLElement | undefined)
      if (destino) destino.style.cursor = elementos.length > 0 ? 'pointer' : 'default'
    },
    plugins: {
      legend: {
        display: metasActivas.length > 0,
        position: 'bottom' as const,
        labels: {
          color: '#a1a1aa',
          boxWidth: 12,
          boxHeight: 2,
          font: { size: 11 },
          // El dataset 0 es el capital acumulado: no necesita entrada de leyenda.
          filter: (item: { datasetIndex: number }) => item.datasetIndex !== 0,
        },
      },
    },
    scales: {
      x: { ticks: { color: '#71717a', font: { size: 11 } }, grid: { color: 'rgba(63,63,70,0.5)' } },
      y: {
        suggestedMax: techo * 1.1,
        ticks: { color: '#71717a', font: { size: 11 }, callback: (v: number) => `$${(v/1000).toFixed(0)}k` },
        grid: { color: 'rgba(63,63,70,0.5)' },
      },
    },
  }

  return (
    <div className="min-h-full bg-zinc-950 pb-4">
      <PageHeader Icono={PiggyBank} titulo="Ahorros" subtitulo="Tu capital y las metas que te pusiste">
        <IconButton
          Icono={Flag}
          activo={showMetas}
          title={showMetas ? 'Ocultar metas' : 'Ver metas'}
          onClick={() => setShowMetas(v => !v)}
        />
      </PageHeader>

      {/*
        * Dos columnas en pantallas anchas: la izquierda concentra el análisis
        * (saldo, gráfico, metas) y queda fija; la derecha es el flujo de
        * registro, que es lo que crece. Apilado por debajo de xl, donde el
        * ancho útil ya no alcanza para dos columnas.
        */}
      <div className="px-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="flex flex-col gap-5 xl:sticky xl:top-5">
        <ResumenAhorros
          ahorros={ahorros}
          total={totalActual}
          proximaMeta={proximaMeta}
          metasActivas={metasActivas.length}
        />

        {/* Chart */}
        {ahorros.length > 0 ? (
          <ChartContainer title="Crecimiento vs Meta" height={300}>
            <Line data={chartData} options={chartOpts as never} />
          </ChartContainer>
        ) : (
          <Card className="py-10 text-center text-zinc-700 text-sm">
            Agrega movimientos para ver el gráfico.
          </Card>
        )}
        </div>

        {/* ── Columna derecha: metas y registro ── */}
        <div className="flex flex-col gap-5">
        {/* Metas panel */}
        {showMetas && (
          <div className="bg-zinc-900 border border-accent/20 rounded-2xl p-4 flex flex-col gap-3 animate-slide-up">
            <div className="flex items-center justify-between">
              <p className="text-white font-bold">Metas de ahorro</p>
              <button
                onClick={() => setShowMetaForm(v => !v)}
                title="Nueva meta"
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
              <FormNuevoAhorro
                onSave={a => { agregarAhorro(a); setShowForm(false) }}
              />
            </div>
          )}

          {/* Table header */}
          <div className="grid grid-cols-[74px_1fr_auto_32px] gap-2 px-4 py-2.5">
            <SectionLabel>Fecha</SectionLabel>
            <SectionLabel>Tipo</SectionLabel>
            <SectionLabel>Monto</SectionLabel>
            <span />
          </div>

          {ahorros.length === 0 && (
            <div className="py-8 text-center text-zinc-700 text-sm">Sin movimientos</div>
          )}

          {ahorros.map(a => (
            <div key={a.id} className="grid grid-cols-[74px_1fr_auto_32px] gap-2 px-4 py-3 items-center border-t border-zinc-800/60">
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
        </Card>
        </div>
      </div>

      {mesAbierto && (
        <DetalleMes
          open
          onClose={() => setMesAbierto(null)}
          titulo={`Ahorros de ${mesLabel(mesAbierto)}`}
          etiquetaSerie="Saldo"
          referencia={proximaMeta
            ? { valor: proximaMeta.montoObjetivo, etiqueta: proximaMeta.nombre }
            : null}
          {...detalleAhorroMes(ahorros, mesAbierto)}
        />
      )}

      {/* Confirm delete ahorro */}
      <Modal open={confirmAhorroId !== null} onClose={() => setConfirmAhorroId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar registro?</h2>
          <p className="text-zinc-400 text-sm">Se borrará permanentemente.</p>
          <div className="flex gap-3 mt-2">
            <Button variante="secundario" className="flex-1" onClick={() => setConfirmAhorroId(null)}>Cancelar</Button>
            <Button
              variante="peligro" className="flex-1"
              onClick={() => { if (confirmAhorroId) { eliminarAhorro(confirmAhorroId); setConfirmAhorroId(null) } }}
            >Eliminar</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete meta */}
      <Modal open={confirmMetaId !== null} onClose={() => setConfirmMetaId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar meta?</h2>
          <p className="text-zinc-400 text-sm">Se quitará de tus objetivos.</p>
          <div className="flex gap-3 mt-2">
            <Button variante="secundario" className="flex-1" onClick={() => setConfirmMetaId(null)}>Cancelar</Button>
            <Button
              variante="peligro" className="flex-1"
              onClick={() => { if (confirmMetaId) { eliminarMeta(confirmMetaId); setConfirmMetaId(null) } }}
            >Eliminar</Button>
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

  const inputCls = INPUT

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!monto) return
    onSave({ monto: parseInt(monto), fecha, esRetiro })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
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
      {/* El retiro conserva el rojo: no es jerarquía, es advertencia de que resta. */}
      <button
        type="submit"
        className={`font-bold rounded-xl py-3 text-sm transition-opacity hover:opacity-90 ${
          esRetiro ? 'bg-red-500/20 text-red-400' : 'bg-accent text-white'
        }`}
      >
        {esRetiro ? 'Registrar retiro' : 'Guardar ahorro'}
      </button>
    </form>
  )
}

function FormNuevaMeta({ onSave }: { onSave: (m: Omit<MetaAhorro, 'id'>) => void }) {
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')

  const inputCls = INPUT

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
      <Button type="submit" tamano="sm" className="py-2">Añadir</Button>
    </form>
  )
}
