import { useState } from 'react'

export interface DonutSlice {
  label: string
  value: number
  color: string
}

function donutArc(cx: number, cy: number, R: number, r: number, a1: number, a2: number) {
  const cos = Math.cos, sin = Math.sin
  const large = a2 - a1 > Math.PI ? 1 : 0
  const x1 = cx + R * cos(a1), y1 = cy + R * sin(a1)
  const x2 = cx + R * cos(a2), y2 = cy + R * sin(a2)
  const x3 = cx + r * cos(a2), y3 = cy + r * sin(a2)
  const x4 = cx + r * cos(a1), y4 = cy + r * sin(a1)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
}

interface Props {
  slices: DonutSlice[]
  /** Etiqueta del centro cuando no hay segmento seleccionado. */
  label?: string
  /** Cómo se escribe el valor de un segmento (monto en CLP, "12 usos", etc.). */
  formatValue: (v: number) => string
  size?: number
}

/**
 * Donut interactivo: click en un segmento (o en su leyenda) lo destaca y muestra
 * su porcentaje y valor en el centro. Un único segmento al 100% se dibuja como
 * anillo completo, sin el corte que deja el gap entre arcos.
 */
export default function Donut({ slices, label, formatValue, size = 180 }: Props) {
  const [active, setActive] = useState<number | null>(null)

  const total = slices.reduce((s, x) => s + x.value, 0)
  if (slices.length === 0 || total === 0) {
    return (
      <div className="py-12 flex items-center justify-center text-zinc-600 text-sm italic">
        Sin datos
      </div>
    )
  }

  const cx = 80, cy = 80, R = 68, r = 44
  const gap = slices.length > 1 ? 0.03 : 0

  let angle = -Math.PI / 2
  const arcs = slices.map(s => {
    const frac  = s.value / total
    const sweep = frac * (2 * Math.PI) - gap
    const a1 = angle + gap / 2
    const a2 = a1 + sweep
    angle += frac * (2 * Math.PI)
    return { ...s, a1, a2, pct: frac * 100 }
  })

  const shown = active !== null ? arcs[active] : null

  return (
    <div className="flex items-center gap-6 flex-wrap md:flex-nowrap">
      <div className="flex-shrink-0 mx-auto md:mx-0">
        <svg viewBox="0 0 160 160" width={size} height={size}>
          {arcs.map((arc, i) => (
            <path
              key={arc.label}
              d={donutArc(cx, cy, active === i ? R + 5 : R, r, arc.a1, arc.a2)}
              fill={arc.color}
              opacity={active !== null && active !== i ? 0.3 : 1}
              style={{ transition: 'all 0.2s', cursor: 'pointer' }}
              onClick={() => setActive(active === i ? null : i)}
            />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="19" fontWeight="bold" fill="white">
            {shown ? `${Math.round(shown.pct)}%` : ''}
          </text>
          <text x={cx} y={cy + 9} textAnchor="middle" fontSize="9" fill="#71717a">
            {shown ? shown.label : label ?? ''}
          </text>
          <text x={cx} y={cy + 24} textAnchor="middle" fontSize="10" fill="#a1a1aa">
            {shown ? formatValue(shown.value) : ''}
          </text>
        </svg>
      </div>

      <div className="flex-1 min-w-[180px] flex flex-col gap-2">
        {arcs.map((arc, i) => (
          <button
            key={arc.label}
            onClick={() => setActive(active === i ? null : i)}
            className={`flex items-center gap-3 text-left transition-opacity hover:opacity-100 ${
              active !== null && active !== i ? 'opacity-30' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: arc.color }} />
            <span className="flex-1 text-sm text-zinc-300 font-medium truncate">{arc.label}</span>
            <span className="text-xs text-zinc-500 tabular-nums">{formatValue(arc.value)}</span>
            <span className="text-sm font-bold text-white w-11 text-right tabular-nums">
              {Math.round(arc.pct)}%
            </span>
          </button>
        ))}
        <div className="flex items-center gap-3 pt-2 mt-1 border-t border-zinc-800">
          <span className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="flex-1 text-sm text-zinc-400 font-bold">Total</span>
          <span className="text-sm font-bold text-white tabular-nums">{formatValue(total)}</span>
          <span className="w-11" />
        </div>
      </div>
    </div>
  )
}
