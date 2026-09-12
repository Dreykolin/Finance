import { useState, useRef, useEffect } from 'react'
import { Settings, Trash2, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'
import { useGastos } from '../../store/useGastos'
import { formatCLP, formatFecha } from '../../lib/format'
import Modal from '../../components/Modal'
import Donut, { type DonutSlice } from '../../components/Donut'
import StatTile from '../../components/StatTile'
import { Card, SectionLabel, Button, INPUT } from '../../components/ui'
import { METODOS, TIPO_LABEL, TIPOS, SIN_METODO, SECUENCIAL, colorFor, ordenCanonico } from '../../lib/colors'
import type { Gasto, NuevoGasto } from '../../types'


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

/**
 * Distribución del gasto. Comparte componente y paleta con la versión de
 * escritorio: tener aquí una copia de los colores fue justo lo que hizo que
 * crédito y débito acabaran siendo indistinguibles en esta pantalla.
 *
 * El conmutador de eje va debajo del título y no al lado, que a este ancho no cabe.
 */
function DistribucionMovil({ gastos, etiqueta }: { gastos: Gasto[]; etiqueta?: string }) {
  const [eje, setEje] = useState<'metodo' | 'tipo'>('metodo')

  const acc: Record<string, { monto: number; usos: number }> = {}
  gastos.forEach(g => {
    const cat = eje === 'tipo'
      ? (TIPO_LABEL[g.origen] ?? TIPO_LABEL.manual)
      : (g.metodoPago || SIN_METODO)
    acc[cat] ??= { monto: 0, usos: 0 }
    acc[cat].monto += g.monto
    acc[cat].usos  += 1
  })

  const orden = eje === 'tipo' ? TIPOS : METODOS
  const slices: DonutSlice[] = ordenCanonico(Object.keys(acc), orden).map(label => ({
    label,
    value: acc[label].monto,
    color: colorFor(label),
  }))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 self-start">
        {(['metodo', 'tipo'] as const).map(e => (
          <button
            key={e}
            onClick={() => setEje(e)}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
              eje === e ? 'bg-accent text-white' : 'text-zinc-500'
            }`}
          >
            {e === 'metodo' ? 'método' : 'tipo'}
          </button>
        ))}
      </div>
      <Donut slices={slices} label={etiqueta} formatValue={formatCLP} size={150} />
    </div>
  )
}

// ── Shared chart types & helpers ───────────────────────────────────────────
interface Vp { xStart: number; xEnd: number; yMin: number; yMax: number }
interface GestureRef { vp: Vp; touches: [number, number][] }
type ChartPt = { key: string; x: number; value: number; label: string }

const PL = 52, PB = 28, PT = 16, PR = 12, W = 320, H = 200
const gW = W - PL - PR, gH = H - PT - PB

function buildChartData(gastos: Gasto[]) {
  const byMonth: Record<string, number> = {}
  const byDay:   Record<string, number> = {}
  gastos.forEach(g => {
    byMonth[g.fecha.slice(0, 7)] = (byMonth[g.fecha.slice(0, 7)] ?? 0) + g.monto
    byDay[g.fecha]               = (byDay[g.fecha]               ?? 0) + g.monto
  })
  const months = Object.keys(byMonth).sort()
  return { byMonth, byDay, months }
}

function dayXPos(fecha: string, months: string[]): number {
  const [y, m, d] = fecha.split('-')
  const mIdx = months.indexOf(`${y}-${m}`)
  if (mIdx === -1) return -1
  const daysInM = new Date(+y, +m, 0).getDate()
  return mIdx + (parseInt(d) - 1) / daysInM
}

function buildPts(vp: Vp, byMonth: Record<string,number>, byDay: Record<string,number>, months: string[]): ChartPt[] {
  const xRange = vp.xEnd - vp.xStart
  const showDays = xRange < 1.8
  if (showDays) {
    // Filtrar por índice de mes visible, no por posición x exacta
    const firstMIdx = Math.floor(vp.xStart)
    const lastMIdx  = Math.ceil(vp.xEnd)
    return Object.entries(byDay)
      .map(([f, v]) => ({ key: f, x: dayXPos(f, months), value: v, label: f.slice(8) }))
      .filter(p => {
        const mIdx = months.indexOf(p.key.slice(0, 7))
        return mIdx >= firstMIdx && mIdx <= lastMIdx && p.x >= 0
      })
      .sort((a, b) => a.x - b.x)
  }
  return months
    .map((m, i) => ({ key: m, x: i, value: byMonth[m], label: mesCorto(m) }))
    .filter(p => p.x >= vp.xStart - 0.5 && p.x <= vp.xEnd + 0.5)
}

function renderChart(
  vp: Vp, pts: ChartPt[], presupuesto: number,
  tooltip: string | null, svgRef?: React.RefObject<SVGSVGElement | null>,
  style?: React.CSSProperties
) {
  const xRange = vp.xEnd - vp.xStart
  const showDays = xRange < 1.8
  const toSvgX = (x: number) => PL + ((x - vp.xStart) / xRange) * gW
  const toSvgY = (v: number) => PT + (1 - (v - vp.yMin) / (vp.yMax - vp.yMin)) * gH

  const { step: curStep } = niceScale(vp.yMax - vp.yMin)
  const yLines: number[] = []
  for (let v = Math.ceil(vp.yMin / curStep) * curStep; v <= vp.yMax; v += curStep) yLines.push(v)

  const pathPts = pts.map(p => ({ x: toSvgX(p.x), y: toSvgY(p.value) }))
  const pathD = pathPts.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = pathPts.length > 1
    ? `${pathD} L ${pathPts[pathPts.length-1].x.toFixed(1)} ${(PT+gH).toFixed(1)} L ${pathPts[0].x.toFixed(1)} ${(PT+gH).toFixed(1)} Z`
    : ''
  const budgetY = presupuesto > 0 && presupuesto >= vp.yMin && presupuesto <= vp.yMax ? toSvgY(presupuesto) : null

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={style}>
      <defs>
        <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SECUENCIAL.fuerte} stopOpacity="0.25" />
          <stop offset="100%" stopColor={SECUENCIAL.fuerte} stopOpacity="0" />
        </linearGradient>
        <clipPath id="chartClip">
          <rect x={PL} y={PT} width={gW} height={gH} />
        </clipPath>
      </defs>

      {yLines.map(v => {
        const y = toSvgY(v)
        return y >= PT && y <= PT + gH ? (
          <g key={v}>
            <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="1" />
            <text x={PL-8} y={y+4} textAnchor="end" fontSize="9" fill="#71717a">{fmtMil(v)}</text>
          </g>
        ) : null
      })}

      {budgetY !== null && (
        <g>
          <line x1={PL} y1={budgetY} x2={W-PR} y2={budgetY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 5" strokeOpacity="0.6" />
          <text x={W-PR-2} y={budgetY-4} textAnchor="end" fontSize="9" fill="#ef4444" fontWeight="bold">LÍMITE</text>
        </g>
      )}

      <g clipPath="url(#chartClip)">
        {areaD && <path d={areaD} fill="url(#tGrad)" />}
        {pathD && <path d={pathD} fill="none" stroke={SECUENCIAL.fuerte} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      </g>

      {pts.map(pt => {
        const sx = toSvgX(pt.x), sy = toSvgY(pt.value)
        if (sx < PL - 12 || sx > W - PR + 12) return null
        const sel = tooltip === pt.key
        return (
          <g key={pt.key}>
            <text x={sx} y={H-6} textAnchor="middle" fontSize="10" fill="#a1a1aa" fontWeight="bold">{pt.label}</text>
            {sy >= PT && sy <= PT + gH && (
              <>
                <circle cx={sx} cy={sy} r={sel ? 7 : 5} fill="#09090b" />
                <circle cx={sx} cy={sy} r={sel ? 7 : 5} fill="none" stroke={sel ? 'white' : SECUENCIAL.fuerte} strokeWidth={sel ? 2.5 : 2} />
                {sel && (
                  <g>
                    <rect x={sx-40} y={sy-32} width="80" height="22" rx="5" fill="#27272a" />
                    <text x={sx} y={sy-17} textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">{formatCLP(pt.value)}</text>
                  </g>
                )}
              </>
            )}
          </g>
        )
      })}

      {style && (
        <text x={W-PR} y={PT+10} textAnchor="end" fontSize="8" fill="#3f3f46">
          {showDays ? 'vista por día' : 'pellizca para ver días'}
        </text>
      )}
    </svg>
  )
}

// ── Versión estática (card) — siempre granularidad mensual ─────────────────
function TendenciaChartStatic({ gastos, presupuesto }: { gastos: Gasto[]; presupuesto: number }) {
  const { byMonth, months } = buildChartData(gastos)
  if (months.length === 0) return (
    <div className="h-36 flex items-center justify-center text-zinc-600 text-sm italic">Sin datos</div>
  )
  const values = months.map(m => byMonth[m])
  const { maxY } = niceScale(Math.max(...values, presupuesto || 0, 1))
  const vp: Vp = { xStart: 0, xEnd: Math.max(months.length - 1, 0.5), yMin: 0, yMax: maxY }
  // Forzar vista mensual — no daily (evita problema de filtro con 1 solo mes)
  const pts: ChartPt[] = months.map((m, i) => ({ key: m, x: i, value: byMonth[m], label: mesCorto(m) }))
  return renderChart(vp, pts, presupuesto, null)
}

// ── Versión interactiva (overlay) ───────────────────────────────────────────

function TendenciaChartInteractive({ gastos, presupuesto }: { gastos: Gasto[]; presupuesto: number }) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const gesture = useRef<GestureRef | null>(null)
  const vpRef   = useRef<Vp | null>(null)
  const ptsRef  = useRef<ChartPt[]>([])
  const [tooltip, setTooltip] = useState<string | null>(null)
  const [vp, setVp] = useState<Vp>({ xStart: 0, xEnd: 0.5, yMin: 0, yMax: 100000 })

  const { byMonth, byDay, months } = buildChartData(gastos)
  const origXMax = Math.max(months.length - 1, 1.0)
  const pts = buildPts(vp, byMonth, byDay, months)

  useEffect(() => {
    if (gastos.length === 0) return
    const { byMonth: bm, months: ms } = buildChartData(gastos)
    if (!ms.length) return
    const { maxY } = niceScale(Math.max(...ms.map(m => bm[m]), presupuesto || 0, 1))
    setVp({ xStart: 0, xEnd: Math.max(ms.length - 1, 1.0), yMin: 0, yMax: maxY })
  }, [gastos.length, presupuesto])

  vpRef.current  = vp
  ptsRef.current = pts

  function svgToData(sx: number, sy: number, v: Vp): [number, number] {
    return [v.xStart + ((sx - PL) / gW) * (v.xEnd - v.xStart), v.yMax - ((sy - PT) / gH) * (v.yMax - v.yMin)]
  }
  function distT(a: [number,number], b: [number,number]) { return Math.hypot(a[0]-b[0], a[1]-b[1]) }

  useEffect(() => {
    const el = svgRef.current
    if (!el) return

    function onStart(e: TouchEvent) {
      e.preventDefault()
      setTooltip(null)
      gesture.current = { vp: { ...vpRef.current! }, touches: Array.from(e.touches).map(t => [t.clientX, t.clientY] as [number,number]) }
    }

    function onMove(e: TouchEvent) {
      e.preventDefault()
      if (!gesture.current) return
      const { vp: sv, touches: st } = gesture.current
      const ct = Array.from(e.touches).map(t => [t.clientX, t.clientY] as [number,number])
      const r  = el!.getBoundingClientRect()
      if (!r.width) return
      const oXMax = origXMax

      if (ct.length === 1) {
        const xRng = sv.xEnd - sv.xStart, yRng = sv.yMax - sv.yMin
        const dsx = (ct[0][0] - st[0][0]) / r.width * W
        const dsy = (ct[0][1] - st[0][1]) / r.height * H
        let xs = sv.xStart - (dsx / gW) * xRng, xe = xs + xRng
        if (xs < 0) { xs = 0; xe = xRng }
        if (xe > oXMax) { xe = oXMax; xs = xe - xRng }
        const ym = Math.max(0, sv.yMin + (dsy / gH) * yRng)
        setVp({ xStart: xs, xEnd: xe, yMin: ym, yMax: ym + yRng })
      } else if (ct.length >= 2) {
        const sd = distT(st[0], st[1]), cd = distT(ct[0], ct[1])
        if (!sd) return
        const scale = sd / cd
        const newXRng = Math.min(Math.max((sv.xEnd - sv.xStart) * scale, 0.05), oXMax)
        const newYRng = Math.max((sv.yMax - sv.yMin) * scale, 5000)
        const svgCx = ((st[0][0]+st[1][0])/2 - r.left) / r.width * W
        const svgCy = ((st[0][1]+st[1][1])/2 - r.top)  / r.height * H
        const [pdx, pdy] = svgToData(svgCx, svgCy, sv)
        const fracX = (pdx - sv.xStart) / (sv.xEnd - sv.xStart)
        const fracY = (sv.yMax - pdy)   / (sv.yMax  - sv.yMin)
        let xs = pdx - fracX * newXRng, xe = xs + newXRng
        if (xs < 0) { xs = 0; xe = newXRng }
        if (xe > oXMax) { xe = oXMax; xs = xe - newXRng }
        const ym = Math.max(0, pdy + fracY * newYRng - newYRng)
        setVp({ xStart: xs, xEnd: xe, yMin: ym, yMax: ym + newYRng })
      }
    }

    function onEnd(e: TouchEvent) {
      if (e.touches.length === 0) {
        if (gesture.current?.touches.length === 1 && e.changedTouches.length === 1) {
          const st = gesture.current.touches[0], ct = e.changedTouches[0]
          if (Math.hypot(ct.clientX - st[0], ct.clientY - st[1]) < 12) {
            const r = el!.getBoundingClientRect()
            const tapX = (ct.clientX - r.left) / r.width * W
            const tapY = (ct.clientY - r.top)  / r.height * H
            const v = vpRef.current!, xRng = v.xEnd - v.xStart
            let closest: string | null = null, best = Infinity
            for (const pt of ptsRef.current) {
              const px = PL + ((pt.x - v.xStart) / xRng) * gW
              const py = PT + (1 - (pt.value - v.yMin) / (v.yMax - v.yMin)) * gH
              const d = Math.hypot(tapX - px, tapY - py)
              if (d < best) { best = d; closest = pt.key }
            }
            if (closest && best < 28) setTooltip(p => p === closest ? null : closest)
          }
        }
        gesture.current = null; return
      }
      gesture.current = { vp: { ...vpRef.current! }, touches: Array.from(e.touches).map(t => [t.clientX, t.clientY] as [number,number]) }
    }

    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: false })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [months.length, origXMax])

  if (!months.length) return (
    <div className="h-48 flex items-center justify-center text-zinc-600 text-sm italic">Sin datos</div>
  )
  return renderChart(vp, pts, presupuesto, tooltip, svgRef, { touchAction: 'none' })
}

// ── Contenedor con botón expand ─────────────────────────────────────────────
function TendenciaChart({ gastos, presupuesto }: { gastos: Gasto[]; presupuesto: number }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <div>
        <TendenciaChartStatic gastos={gastos} presupuesto={presupuesto} />
        <div className="flex justify-end mt-1">
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-[11px] font-bold active:bg-zinc-700"
          >
            <Maximize2 size={11} />
            Ampliar
          </button>
        </div>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-[var(--z-dialogo)] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={() => setExpanded(false)} />
          <div className="relative w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 animate-dialogo-in">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Tendencia Mensual</p>
              <button onClick={() => setExpanded(false)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 active:bg-zinc-700">
                <X size={14} />
              </button>
            </div>
            <p className="text-zinc-600 text-[10px] mb-3">Pellizca para zoom · Arrastra para mover · Toca un punto para ver el valor</p>
            <TendenciaChartInteractive gastos={gastos} presupuesto={presupuesto} />
          </div>
        </div>
      )}
    </>
  )
}

// ── Donut slider (histórico + mensual deslizable) ──────────────────────────
function DonutSlider({ gastos, delMes, mesActual, mesOffset, rangoMes, onPrev, onNext }: {
  gastos: Gasto[]
  delMes: Gasto[]
  mesActual: string
  mesOffset: number
  rangoMes: string | null
  onPrev: () => void
  onNext: () => void
}) {
  const [slide, setSlide] = useState(0)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Slide header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">
            {slide === 0 ? 'Distribución de Métodos' : 'Métodos del Mes'}
          </p>
          <p className="text-zinc-600 text-[10px] mt-0.5">
            {slide === 0
              ? 'Histórico total'
              : rangoMes ?? 'Sin gastos este mes'
            }
          </p>
        </div>
        {slide === 1 && (
          <div className="flex items-center gap-1">
            <button onClick={onPrev} className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-500 active:bg-zinc-800">
              <ChevronLeft size={14} />
            </button>
            <span className="text-zinc-400 text-[10px] font-bold capitalize">{mesNombre(mesActual)}</span>
            <button onClick={onNext} disabled={mesOffset === 0}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-500 active:bg-zinc-800 disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable slides */}
      <div
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
        onScroll={e => {
          const el = e.currentTarget
          setSlide(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        <div className="flex-shrink-0 w-full snap-start px-5 pb-5">
          <DistribucionMovil gastos={gastos} etiqueta="histórico" />
        </div>
        <div className="flex-shrink-0 w-full snap-start px-5 pb-5">
          <DistribucionMovil gastos={delMes} etiqueta={mesNombre(mesActual)} />
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 pb-4">
        {[0, 1].map(i => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${slide === i ? 'bg-accent' : 'bg-zinc-700'}`} />
        ))}
      </div>
    </div>
  )
}

/** Los cuatro indicadores de escritorio, apilados de dos en dos. */
function ResumenMesMovil({ gastos, presupuesto }: { gastos: Gasto[]; presupuesto: number }) {
  const hoy = new Date()
  const clave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const suma = (xs: Gasto[]) => xs.reduce((t, g) => t + g.monto, 0)

  const delMes = gastos.filter(g => g.fecha.startsWith(clave(hoy)))
  const total  = suma(delMes)
  const previo = suma(gastos.filter(g =>
    g.fecha.startsWith(clave(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)))))

  const dia = hoy.getDate()
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const proyeccion = dia >= 3 ? Math.round(total / dia * diasMes) : null
  const comprometido = suma(delMes.filter(g => g.origen !== 'manual'))

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile
        etiqueta="Este mes"
        valor={formatCLP(total)}
        delta={previo > 0 ? { pct: (total - previo) / previo * 100, respecto: 'vs. anterior' } : undefined}
        medidor={presupuesto > 0 ? { pct: total / presupuesto, limite: formatCLP(presupuesto) } : undefined}
      />
      <StatTile
        etiqueta="Cierre previsto"
        valor={proyeccion !== null ? formatCLP(proyeccion) : '—'}
        nota={proyeccion === null ? 'Faltan días' : `A tu ritmo de ${dia} días`}
      />
      <StatTile
        etiqueta="Comprometido"
        valor={formatCLP(comprometido)}
        nota={total > 0 ? `${Math.round(comprometido / total * 100)}% del mes` : 'Cuotas y suscripciones'}
      />
      <StatTile
        etiqueta="Movimientos"
        valor={String(delMes.length)}
        nota="Registros del mes"
      />
    </div>
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

  // Rango de fechas del mes con datos
  const fechasMes = delMes.map(g => g.fecha).sort()
  const rangoMes = fechasMes.length > 0
    ? `${formatFecha(fechasMes[0])} – ${formatFecha(fechasMes[fechasMes.length - 1])}`
    : null

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
            className={`flex-1 py-3 text-xs font-extrabold tracking-widest uppercase transition-colors relative ${tab === t ? 'text-accent' : 'text-zinc-500'}`}>
            {t === 'analisis' ? 'Análisis' : 'Historial'}
            {tab === t && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      {/* ── ANÁLISIS ── */}
      {tab === 'analisis' && (
        <div className="flex-1 px-6 py-6 pb-28 flex flex-col gap-5">
          <ResumenMesMovil gastos={gastos} presupuesto={presupuestoVal} />
          <SectionLabel>Dashboard</SectionLabel>

          {/* Tendencia mensual */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-5">
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest px-6 mb-4">Tendencia Mensual</p>
            <div className="px-2">
              <TendenciaChart gastos={gastos} presupuesto={presupuestoVal} />
            </div>
          </div>

          {/* Distribución — slider */}
          <DonutSlider
            gastos={gastos}
            delMes={delMes}
            mesActual={mesActual}
            mesOffset={mesOffset}
            rangoMes={rangoMes}
            onPrev={() => setMesOffset(v => v - 1)}
            onNext={() => setMesOffset(v => Math.min(v + 1, 0))}
          />
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {tab === 'historial' && (
        <div className="flex-1 flex flex-col">
          <div className="px-6 pt-5 pb-4 flex flex-col gap-4">
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

            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-widest">Movimientos</p>
              <button onClick={() => setShowForm(true)}
                className="h-8 px-3 bg-white text-zinc-950 rounded-lg text-xs font-bold active:opacity-80">
                + Añadir
              </button>
            </div>
          </div>

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
          className="fixed bottom-24 right-5 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform text-white text-2xl font-light z-[var(--z-flotante)]">
          +
        </button>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo Gasto">
        <FormGasto onSave={g => { agregar(g); setShowForm(false) }} />
      </Modal>

      <Modal open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar gasto?</h2>
          <div className="flex gap-3">
            <button onClick={() => setConfirmId(null)} className="flex-1 py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-bold">Cancelar</button>
            <button onClick={() => { if (confirmId) { eliminar(confirmId); setConfirmId(null) } }} className="flex-1 py-3.5 rounded-2xl bg-red-500/20 text-red-400 font-bold">Eliminar</button>
          </div>
        </div>
      </Modal>

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
        <div className="animate-despliegue">
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-red-500/70 active:text-red-400">
            <Trash2 size={18} />
          </button>
          <Insignia gasto={g} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Un punto del color de la categoría y el nombre: identidad sin teñir el texto. */
function Insignia({ gasto }: { gasto: Gasto }) {
  const auto = gasto.origen === 'manual' ? null : TIPO_LABEL[gasto.origen]
  const texto = auto ?? gasto.metodoPago ?? ''
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full bg-zinc-800 text-zinc-300">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: texto ? colorFor(texto) : '#52525b' }}
      />
      {texto ? texto.toUpperCase() : 'SIN MÉTODO'}
    </span>
  )
}

function FormGasto({ onSave }: { onSave: (g: NuevoGasto) => void }) {
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
