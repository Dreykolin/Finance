import type { LucideIcon } from 'lucide-react'

/**
 * Primitivos de interfaz.
 *
 * Existen para que una misma cosa se vea igual en las cuatro pantallas. Las
 * decisiones que fijan están tomadas una sola vez aquí:
 *
 * - **Radios por jerarquía**: `2xl` contenedores, `xl` controles, `lg` fichas.
 * - **Dos niveles de título** y solo dos: `SectionLabel` (mayúsculas pequeñas)
 *   rotula datos —un gráfico, una columna—; `CardHeader` (blanco, con acciones)
 *   encabeza un bloque con el que se interactúa.
 * - **Un único botón primario**, el violeta de acento. El blanco quedó reservado
 *   para el acceso con Google, donde es marca ajena y no jerarquía propia.
 */

// ── Campos ──────────────────────────────────────────────────────────────────

/** Un único estilo de campo: cinco formularios lo repetían con pequeñas derivas. */
export const INPUT =
  'bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm ' +
  'outline-none focus:border-accent transition-colors placeholder:text-zinc-600 w-full'

/** Etiqueta de campo dentro de un formulario. */
export const LABEL = 'text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase mb-1.5 block'

// ── Contenedor ──────────────────────────────────────────────────────────────

/**
 * Las tres formas de contenedor que el producto usa, y no más:
 * - `normal`  contenido con aire alrededor (una ficha, un aviso).
 * - `grafico` sin aire lateral, para que el trazado llegue al borde.
 * - `lista`   sin relleno, para cabecera y filas que van a sangre.
 */
const RELLENO = {
  normal:  'p-4',
  grafico: 'py-5',
  lista:   'overflow-hidden',
} as const

export function Card({ children, className = '', tipo = 'normal' }: {
  children: React.ReactNode
  className?: string
  tipo?: keyof typeof RELLENO
}) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl ${RELLENO[tipo]} ${className}`}>
      {children}
    </div>
  )
}

/** Cabecera de un bloque con el que se interactúa: título y, opcionalmente, acciones. */
export function CardHeader({ titulo, nota, children }: {
  titulo: string
  nota?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-zinc-800">
      <div className="min-w-0">
        <p className="text-white font-bold">{titulo}</p>
        {nota && <p className="text-zinc-600 text-xs mt-0.5">{nota}</p>}
      </div>
      {children && <div className="flex items-center gap-1 flex-shrink-0">{children}</div>}
    </div>
  )
}

/** Rótulo de un dato: un gráfico, un grupo de campos, una columna. */
export function SectionLabel({ children, className = '' }: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={`text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase ${className}`}>
      {children}
    </p>
  )
}

// ── Cabecera de página ──────────────────────────────────────────────────────

/**
 * Las cuatro pantallas abren igual: icono de acento, el nombre del módulo tal
 * como aparece en el menú lateral, una línea de contexto y las acciones a la
 * derecha. El título repite el del menú a propósito: que la pantalla se llame
 * distinto que el enlace por el que llegaste desorienta.
 */
export function PageHeader({ Icono, titulo, subtitulo, children }: {
  Icono: LucideIcon
  titulo: string
  subtitulo: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-6 pb-4">
      <div className="flex items-center gap-3 min-w-0">
        <Icono size={22} className="text-accent flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight truncate">{titulo}</h1>
          <p className="text-zinc-500 text-sm mt-0.5 truncate">{subtitulo}</p>
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  )
}

// ── Botones ─────────────────────────────────────────────────────────────────

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma'

const VARIANTES: Record<Variante, string> = {
  primario:   'bg-accent text-white hover:opacity-90',
  secundario: 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
  peligro:    'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  fantasma:   'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800',
}

export function Button({
  variante = 'primario', tamano = 'md', className = '', children, ...props
}: {
  variante?: Variante
  tamano?: 'sm' | 'md'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const medida = tamano === 'sm' ? 'px-3 py-1.5 text-xs rounded-lg' : 'px-4 py-3 text-sm rounded-xl'
  return (
    <button
      {...props}
      className={`font-bold transition-colors disabled:opacity-40 ${medida} ${VARIANTES[variante]} ${className}`}
    >
      {children}
    </button>
  )
}

/** Botón de solo icono, para las acciones de una fila o de una cabecera. */
export function IconButton({
  Icono, activo = false, peligro = false, className = '', ...props
}: {
  Icono: LucideIcon
  activo?: boolean
  peligro?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const color = activo
    ? 'bg-accent border-accent text-white'
    : peligro
      ? 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-red-400'
      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
  return (
    <button
      {...props}
      className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${color} ${className}`}
    >
      <Icono size={17} />
    </button>
  )
}
