import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { ESTADO } from '../lib/colors'
import { Card } from './ui'

/**
 * Un valor con su contexto. Para una sola cifra esto es la forma correcta: un
 * gráfico de una barra no añade nada que el número no diga mejor.
 *
 * El delta lleva flecha y texto además de color, porque el color solo no es un
 * canal accesible. `subirEsBueno` distingue los casos: gastar más es malo,
 * ahorrar más es bueno, y la misma flecha hacia arriba cambia de signo.
 */
export default function StatTile({
  etiqueta, valor, delta, nota, medidor, acento,
}: {
  etiqueta: string
  valor: string
  delta?: { pct: number; respecto: string; subirEsBueno?: boolean }
  nota?: string
  medidor?: { pct: number; limite: string }
  acento?: boolean
}) {
  return (
    <Card className="flex flex-col gap-1 min-w-0">
      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider truncate">
        {etiqueta}
      </p>

      {/* Sin tabular-nums: a este tamano los digitos de ancho fijo se ven sueltos.
          Las cifras alineadas en columna (tablas, ejes) si lo llevan. */}
      <p className={`font-extrabold leading-tight ${
        acento ? 'text-accent text-xl' : 'text-white text-xl'
      }`}>
        {valor}
      </p>

      {delta && <Delta {...delta} />}

      {medidor && <Medidor {...medidor} />}

      {nota && <p className="text-zinc-600 text-xs leading-snug mt-0.5">{nota}</p>}
    </Card>
  )
}

function Delta({ pct, respecto, subirEsBueno = false }: {
  pct: number; respecto: string; subirEsBueno?: boolean
}) {
  // Menos de un punto porcentual no es una tendencia, es ruido.
  const plano = Math.abs(pct) < 1
  const subio  = pct > 0
  const bueno  = plano ? null : (subio === subirEsBueno)

  const color = bueno === null ? '#71717a' : bueno ? ESTADO.bien : ESTADO.critico
  const Icono = plano ? Minus : subio ? ArrowUp : ArrowDown

  return (
    <div className="flex items-center gap-1 text-xs">
      <Icono size={13} style={{ color }} strokeWidth={2.5} />
      <span className="font-bold tabular-nums" style={{ color }}>
        {plano ? 'sin cambio' : `${Math.abs(Math.round(pct))}%`}
      </span>
      <span className="text-zinc-600 truncate">{respecto}</span>
    </div>
  )
}

function Medidor({ pct, limite }: { pct: number; limite: string }) {
  const p = Math.max(0, Math.min(pct, 1))
  // Umbrales de estado: holgado, cerca del límite, pasado.
  const color = pct >= 1 ? ESTADO.critico : pct >= 0.8 ? ESTADO.aviso : '#8b5cf6'

  return (
    <div className="mt-1.5">
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${p * 100}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-[11px] mt-1 tabular-nums">
        <span style={{ color }} className="font-bold">
          {Math.round(pct * 100)}%
        </span>
        <span className="text-zinc-600">{limite}</span>
      </div>
    </div>
  )
}
