import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import Modal from './Modal'
import { SECUENCIAL } from '../lib/colors'
import { formatCLP } from '../lib/format'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

export interface PuntoDia {
  /** Día del mes, ya formateado para el eje ('1', '2', …). */
  etiqueta: string
  valor: number
}

export interface MovimientoDetalle {
  id: number
  fecha: string
  texto: string
  monto: number
  /** Resta en lugar de sumar (un retiro, una devolución). */
  negativo?: boolean
  /** Rótulo de categoría: método de pago, tipo de movimiento. */
  etiqueta?: string
}

/**
 * Detalle de un mes concreto.
 *
 * El gráfico anual responde *qué mes* fue distinto; este responde *qué pasó
 * dentro*. Por eso la serie es acumulada y no diaria: lo que interesa al abrir
 * un mes es el ritmo con que se llegó al total — si se gastó parejo o hubo un
 * salto — y contra la referencia (presupuesto o meta) esa lectura es inmediata.
 * El desglose diario está en la lista de abajo, que no necesita interpretación.
 */
export default function DetalleMes({
  open, onClose, titulo, puntos, referencia, resumen, movimientos, etiquetaSerie,
}: {
  open: boolean
  onClose: () => void
  titulo: string
  puntos: PuntoDia[]
  referencia?: { valor: number; etiqueta: string } | null
  resumen: { etiqueta: string; valor: string; acento?: boolean }[]
  movimientos: MovimientoDetalle[]
  etiquetaSerie: string
}) {
  const datos = {
    labels: puntos.map(p => p.etiqueta),
    datasets: [
      {
        label: etiquetaSerie,
        data: puntos.map(p => p.valor),
        borderColor: SECUENCIAL.fuerte,
        backgroundColor: 'rgba(139,92,246,0.12)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
      ...(referencia && referencia.valor > 0 ? [{
        label: referencia.etiqueta,
        data: Array(puntos.length).fill(referencia.valor),
        borderColor: 'rgba(248,113,113,0.6)',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      }] : []),
    ],
  }

  const opciones = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: { label: string }[]) => `Día ${items[0]?.label ?? ''}`,
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${ctx.dataset.label ?? ''}: ${formatCLP(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#71717a', font: { size: 10 }, maxTicksLimit: 10 },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#71717a',
          font: { size: 10 },
          callback: (v: number) => `$${Math.round(v / 1000)}k`,
        },
        grid: { color: 'rgba(63,63,70,0.4)' },
      },
    },
  }

  return (
    <Modal open={open} onClose={onClose} title={titulo} tamano="ancho">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {resumen.map(r => (
            <div key={r.etiqueta} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider truncate">
                {r.etiqueta}
              </p>
              <p className={`font-extrabold text-base mt-0.5 ${r.acento ? 'text-accent' : 'text-white'}`}>
                {r.valor}
              </p>
            </div>
          ))}
        </div>

        {puntos.length > 0 ? (
          <div>
            <p className="text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase mb-2">
              {etiquetaSerie} día a día
            </p>
            <div style={{ height: 220 }}>
              <Line data={datos} options={opciones as never} />
            </div>
          </div>
        ) : (
          <p className="text-zinc-600 text-sm text-center py-6">Sin movimientos este mes.</p>
        )}

        {movimientos.length > 0 && (
          <div>
            <p className="text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase mb-2">
              Movimientos del mes ({movimientos.length})
            </p>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              {movimientos.map(m => (
                <div
                  key={m.id}
                  className="grid grid-cols-[54px_1fr_auto] gap-3 px-3 py-2.5 items-center border-b border-zinc-800/60 last:border-0"
                >
                  <span className="text-zinc-600 text-xs tabular-nums">
                    {m.fecha.slice(8)}/{m.fecha.slice(5, 7)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-zinc-200 text-sm truncate">{m.texto}</p>
                    {m.etiqueta && (
                      <p className="text-zinc-600 text-[11px] truncate">{m.etiqueta}</p>
                    )}
                  </div>
                  <span className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                    m.negativo ? 'text-red-400' : 'text-white'
                  }`}>
                    {m.negativo ? '−' : ''}{formatCLP(m.monto)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
