interface Props {
  title: string
  children: React.ReactNode
  /**
   * Altura del área de dibujo, en px. Los gráficos van con
   * `maintainAspectRatio: false`: en escritorio el contenedor es muy ancho y, si
   * el alto se derivara del ancho, el gráfico ocuparía media pantalla.
   */
  height?: number
  /** Controles opcionales a la derecha del título. */
  action?: React.ReactNode
}

export default function ChartContainer({ title, children, height = 280, action }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-5">
      <div className="flex items-center justify-between gap-3 px-5 mb-4">
        <p className="text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase">
          {title}
        </p>
        {action}
      </div>
      <div className="px-2" style={{ height }}>{children}</div>
    </div>
  )
}
