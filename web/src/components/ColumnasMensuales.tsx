import { useState } from 'react'
import { SECUENCIAL } from '../lib/colors'

export interface PuntoMes {
  clave: string        // 'YYYY-MM'
  etiqueta: string     // 'Sep'
  valor: number
  detalle?: string     // se muestra en el tooltip
  tenue?: boolean      // proyección o contexto, no dato firme
}

const W = 560, H = 200
const PL = 54, PR = 12, PT = 16, PB = 28
const gW = W - PL - PR, gH = H - PT - PB

/** Columna con el extremo de datos redondeado y la base cuadrada. */
function columna(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, h, w / 2)
  if (h <= 0) return ''
  return `M ${x} ${y + h} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} ` +
         `L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h} Z`
}

/** Escala con topes redondos: 0 / 25k / 50k, nunca 0 / 23.487 / 46.974. */
function escala(max: number, pasos = 4) {
  if (max <= 0) return { tope: 1000, paso: 250 }
  const crudo = max / pasos
  const pot = Math.pow(10, Math.floor(Math.log10(crudo)))
  const paso = Math.ceil(crudo / pot) * pot
  return { tope: paso * pasos, paso }
}

const corto = (v: number) =>
  v === 0 ? '0' : v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))

/**
 * Una sola serie de magnitud por mes. Sin leyenda a propósito: con una única
 * serie el título ya dice qué se está mirando, y un recuadro con un solo color
 * solo repetiría el título.
 */
export default function ColumnasMensuales({ puntos, formatear, notaVacio }: {
  puntos: PuntoMes[]
  formatear: (v: number) => string
  notaVacio?: string
}) {
  const [activo, setActivo] = useState<number | null>(null)

  if (puntos.length === 0 || puntos.every(p => p.valor === 0)) {
    return (
      <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm italic px-4 text-center">
        {notaVacio ?? 'Sin datos'}
      </div>
    )
  }

  const { tope, paso } = escala(Math.max(...puntos.map(p => p.valor)))
  const banda = gW / puntos.length
  const ancho = Math.min(24, banda - 2)          // 2px de aire entre columnas
  const y = (v: number) => PT + gH - (v / tope) * gH

  const lineas: number[] = []
  for (let v = 0; v <= tope; v += paso) lineas.push(v)

  const sel = activo !== null ? puntos[activo] : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
      {lineas.map(v => (
        <g key={v}>
          <line
            x1={PL} y1={y(v)} x2={W - PR} y2={y(v)}
            stroke="#3f3f46" strokeWidth="1" strokeOpacity={v === 0 ? 0.8 : 0.35}
          />
          <text x={PL - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#71717a">
            {corto(v)}
          </text>
        </g>
      ))}

      {puntos.map((p, i) => {
        const cx = PL + banda * i + banda / 2
        const x  = cx - ancho / 2
        const alto = (p.valor / tope) * gH
        const activa = activo === i
        return (
          <g key={p.clave}>
            <path
              d={columna(x, y(p.valor), ancho, alto)}
              fill={p.tenue ? SECUENCIAL.suave : activa ? SECUENCIAL.fuerte : SECUENCIAL.medio}
              style={{ transition: 'fill 0.15s' }}
            />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="#71717a">
              {p.etiqueta}
            </text>
            {/* Zona sensible más ancha que la columna: apuntar a 6px es un castigo. */}
            <rect
              x={PL + banda * i} y={PT} width={banda} height={gH}
              fill="transparent" style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
            />
          </g>
        )
      })}

      {sel && activo !== null && (() => {
        const cx = PL + banda * activo + banda / 2
        const ancho_t = 128
        const tx = Math.max(PL, Math.min(cx - ancho_t / 2, W - PR - ancho_t))
        const ty = Math.max(PT, y(sel.valor) - (sel.detalle ? 46 : 32))
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={ancho_t} height={sel.detalle ? 40 : 26} rx="6" fill="#27272a" />
            <text x={tx + 8} y={ty + 17} fontSize="12" fill="#fff" fontWeight="bold">
              {formatear(sel.valor)}
            </text>
            {sel.detalle && (
              <text x={tx + 8} y={ty + 32} fontSize="10" fill="#a1a1aa">
                {sel.detalle}
              </text>
            )}
          </g>
        )
      })()}
    </svg>
  )
}
