import { Card, SectionLabel } from './ui'

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
    <Card tipo="grafico">
      <div className="flex items-center justify-between gap-3 px-5 mb-4">
        <SectionLabel>{title}</SectionLabel>
        {action}
      </div>
      <div className="px-2" style={{ height }}>{children}</div>
    </Card>
  )
}
