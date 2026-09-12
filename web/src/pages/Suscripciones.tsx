import { useState } from 'react'
import {
  Repeat2, Trash2, Pencil, Plus, Check, X, ChevronLeft, ChevronRight,
  AlertCircle, Pause, Play,
} from 'lucide-react'
import { useSuscripciones } from '../store/useSuscripciones'
import Modal from '../components/Modal'
import MetodoPicker from '../components/MetodoPicker'
import StatTile from '../components/StatTile'
import { PageHeader, Card, CardHeader, Button, INPUT, LABEL } from '../components/ui'
import { formatCLP } from '../lib/format'
import type { Suscripcion, NuevaSuscripcion, CargoSuscripcion } from '../types'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const pad = (n: number) => String(n).padStart(2, '0')
const periodoDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const periodoActual = periodoDe(new Date())

/** Ventana del carril: tres meses atrás, el actual y tres adelante. */
function ventana(offset: number): string[] {
  const hoy = new Date()
  const out: string[] = []
  for (let i = -3; i <= 3; i++) {
    out.push(periodoDe(new Date(hoy.getFullYear(), hoy.getMonth() + i + offset, 1)))
  }
  return out
}

const etiquetaMes = (periodo: string) => MESES[Number(periodo.slice(5, 7)) - 1]

/**
 * Qué corresponde mostrar en una celda del carril.
 *
 * La app no puede saber si un cobro ocurrió — no hay conexión bancaria. Lo que
 * sí sabe es qué cobros ya vencieron, y los da por hechos hasta que el usuario
 * diga lo contrario. De ahí la distinción entre 'cobrado' y 'porConfirmar'.
 */
type EstadoCelda = 'cobrado' | 'porConfirmar' | 'omitido' | 'proyectado' | 'noAplica'

function estadoCelda(s: Suscripcion, periodo: string, cargo?: CargoSuscripcion): EstadoCelda {
  if (cargo) {
    if (cargo.estado === 'omitido') return 'omitido'
    return cargo.confirmado ? 'cobrado' : 'porConfirmar'
  }
  // Sin cargo: o el servicio aún no existía, o el cobro no ha llegado.
  if (periodo < s.desde.slice(0, 7)) return 'noAplica'
  if (s.ciclo === 'anual' && s.mesCobro && Number(periodo.slice(5, 7)) !== s.mesCobro) return 'noAplica'
  if (!s.activa) return 'noAplica'
  return periodo >= periodoActual ? 'proyectado' : 'noAplica'
}

function Celda({ estado, onClick, title }: {
  estado: EstadoCelda
  onClick?: () => void
  title: string
}) {
  const base = 'w-full aspect-square max-w-[42px] mx-auto rounded-lg flex items-center justify-center transition-all'
  const interactivo = estado !== 'proyectado' && estado !== 'noAplica'

  const estilos: Record<EstadoCelda, string> = {
    cobrado:      'bg-accent text-white',
    porConfirmar: 'bg-accent/20 text-accent border-2 border-dashed border-accent/60',
    omitido:      'bg-zinc-800 text-zinc-600',
    proyectado:   'bg-zinc-900 border border-zinc-800 text-zinc-700',
    noAplica:     'bg-transparent border border-zinc-900 text-zinc-800',
  }

  return (
    <button
      type="button"
      title={title}
      disabled={!interactivo}
      onClick={onClick}
      className={`${base} ${estilos[estado]} ${interactivo ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}
    >
      {estado === 'cobrado' && <Check size={16} strokeWidth={3} />}
      {estado === 'porConfirmar' && <Check size={16} strokeWidth={3} />}
      {estado === 'omitido' && <X size={14} strokeWidth={3} />}
      {estado === 'proyectado' && <span className="w-1 h-1 rounded-full bg-zinc-600" />}
    </button>
  )
}

/**
 * Lo que un carril mensual no deja ver: el acumulado. Un servicio de $9.900 no
 * impresiona hasta que se suman los veinte meses que llevas pagándolo, y ese es
 * justo el número que decide si sigue valiendo la pena.
 */
function ResumenSuscripciones({ suscripciones, mensual, anual, porRevisar }: {
  suscripciones: Suscripcion[]
  mensual: number
  anual: number
  porRevisar: number
}) {
  const cobros = suscripciones.flatMap(s =>
    s.cargos.filter(c => c.estado === 'cobrado').map(c => ({ nombre: s.nombre, monto: c.monto })))
  const acumulado = cobros.reduce((t, c) => t + c.monto, 0)

  const porServicio: Record<string, number> = {}
  cobros.forEach(c => { porServicio[c.nombre] = (porServicio[c.nombre] ?? 0) + c.monto })
  const mayor = Object.entries(porServicio).sort(([, a], [, b]) => b - a)[0]

  // Coste anual real: doce meses de lo mensual más lo que se cobra una vez al año.
  const anualizado = mensual * 12 + anual

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile
        etiqueta="Compromiso mensual"
        valor={formatCLP(mensual)}
        nota={anual > 0
          ? `+ ${formatCLP(Math.round(anual / 12))}/mes prorrateado de lo anual`
          : undefined}
        acento
      />
      <StatTile
        etiqueta="Costo al año"
        valor={formatCLP(anualizado)}
        nota="Lo que suman tus servicios en doce meses"
      />
      <StatTile
        etiqueta="Pagado hasta hoy"
        valor={formatCLP(acumulado)}
        nota={mayor
          ? `${mayor[0]} lidera con ${formatCLP(mayor[1])}`
          : 'Sin cobros registrados aún'}
      />
      <StatTile
        etiqueta="Por revisar"
        valor={String(porRevisar)}
        nota={porRevisar > 0
          ? 'Cobros que la app dio por hechos'
          : 'Todo confirmado'}
      />
    </div>
  )
}

export default function Suscripciones() {
  const {
    suscripciones, agregar, editar, eliminar, alternarCargo, confirmarCargo,
  } = useSuscripciones()

  const [offset, setOffset]       = useState(0)
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const periodos = ventana(offset)
  const activas  = suscripciones.filter(s => s.activa)

  // El compromiso mensual solo cuenta lo mensual; lo anual se prorratea aparte
  // para no inflar el número de un mes cualquiera.
  const mensual   = activas.filter(s => s.ciclo === 'mensual').reduce((t, s) => t + s.monto, 0)
  const anual     = activas.filter(s => s.ciclo === 'anual').reduce((t, s) => t + s.monto, 0)
  const porRevisar = suscripciones.flatMap(s =>
    s.cargos.filter(c => c.estado === 'cobrado' && !c.confirmado)
  ).length

  const enEdicion = suscripciones.find(s => s.id === editId) ?? null

  return (
    <div className="min-h-full bg-zinc-950 pb-6">
      <PageHeader Icono={Repeat2} titulo="Suscripciones" subtitulo="Tus cobros recurrentes, mes a mes">
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 py-2">
          <Plus size={16} />
          Añadir
        </Button>
      </PageHeader>

      <div className="px-5 flex flex-col gap-5">
        <ResumenSuscripciones
          suscripciones={suscripciones}
          mensual={mensual}
          anual={anual}
          porRevisar={porRevisar}
        />

        {/* Carril */}
        <Card tipo="lista">
          <CardHeader titulo="Servicios" nota="Toca un mes para corregir si el cobro ocurrió o no">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOffset(o => o - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              {offset !== 0 && (
                <button
                  onClick={() => setOffset(0)}
                  className="text-zinc-500 hover:text-zinc-300 text-[11px] font-bold px-2 transition-colors"
                >
                  Hoy
                </button>
              )}
              <button
                onClick={() => setOffset(o => o + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </CardHeader>

          {/* Cabecera de meses */}
          <div className="grid grid-cols-[minmax(0,1fr)_repeat(7,minmax(34px,46px))_76px] gap-2 px-5 py-2.5 border-b border-zinc-800/60">
            <span />
            {periodos.map(p => (
              <span
                key={p}
                className={`text-center text-[10px] font-extrabold uppercase tracking-wider ${
                  p === periodoActual ? 'text-accent' : 'text-zinc-600'
                }`}
              >
                {etiquetaMes(p)}
              </span>
            ))}
            <span />
          </div>

          {suscripciones.length === 0 && (
            <p className="py-12 text-center text-zinc-700 text-sm">
              Sin servicios registrados.
            </p>
          )}

          {suscripciones.map(s => (
            <div
              key={s.id}
              className={`grid grid-cols-[minmax(0,1fr)_repeat(7,minmax(34px,46px))_76px] gap-2 px-5 py-3 items-center border-b border-zinc-800/40 last:border-0 ${
                s.activa ? '' : 'opacity-45'
              }`}
            >
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{s.nombre}</p>
                <p className="text-zinc-500 text-xs truncate">
                  {s.ciclo === 'anual'
                    ? `${s.diaCobro} ${MESES[(s.mesCobro ?? 1) - 1]} · ${formatCLP(s.monto)}/año`
                    : `día ${s.diaCobro} · ${formatCLP(s.monto)}/mes`}
                  {s.metodoPago && ` · ${s.metodoPago}`}
                  {!s.activa && ' · de baja'}
                </p>
              </div>

              {periodos.map(p => {
                const cargo  = s.cargos.find(c => c.periodo === p)
                const estado = estadoCelda(s, p, cargo)
                const titulos: Record<EstadoCelda, string> = {
                  cobrado:      `Cobrado · ${formatCLP(cargo?.monto ?? s.monto)} · clic para marcar que no ocurrió`,
                  porConfirmar: `Se dio por cobrado · ${formatCLP(cargo?.monto ?? s.monto)} · clic si no ocurrió`,
                  omitido:      'No se cobró · clic para reponerlo',
                  proyectado:   'Cobro proyectado',
                  noAplica:     '',
                }
                return (
                  <Celda
                    key={p}
                    estado={estado}
                    title={titulos[estado]}
                    onClick={() => alternarCargo(s.id, p)}
                  />
                )
              })}

              <div className="flex items-center justify-end gap-1">
                {s.cargos.some(c => c.estado === 'cobrado' && !c.confirmado) && (
                  <button
                    title="Confirmar los cobros pendientes de revisar"
                    onClick={() => {
                      s.cargos
                        .filter(c => c.estado === 'cobrado' && !c.confirmado)
                        .forEach(c => confirmarCargo(s.id, c.periodo))
                    }}
                    className="text-yellow-500/80 hover:text-yellow-400 transition-colors p-1"
                  >
                    <AlertCircle size={15} />
                  </button>
                )}
                <button
                  title={s.activa ? 'Dar de baja' : 'Reactivar'}
                  onClick={() => editar(s.id, { activa: !s.activa })}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
                >
                  {s.activa ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  title="Editar"
                  onClick={() => setEditId(s.id)}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
                >
                  <Pencil size={14} />
                </button>
                <button
                  title="Eliminar"
                  onClick={() => setConfirmId(s.id)}
                  className="text-zinc-700 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Leyenda */}
          {suscripciones.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 border-t border-zinc-800 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-accent" /> cobrado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-accent/20 border border-dashed border-accent/60" /> sin confirmar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-zinc-800" /> no se cobró
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-zinc-900 border border-zinc-800" /> proyectado
              </span>
            </div>
          )}
        </Card>

        <p className="text-zinc-600 text-xs leading-relaxed">
          Los cobros se dan por hechos al llegar su fecha y se registran solos en Gastos.
          Si alguno no ocurrió, márcalo y el gasto se elimina.
        </p>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo servicio">
        <FormSuscripcion onSave={async s => { await agregar(s); setShowForm(false) }} />
      </Modal>

      <Modal open={enEdicion !== null} onClose={() => setEditId(null)} title={enEdicion?.nombre}>
        {enEdicion && (
          <FormSuscripcion
            inicial={enEdicion}
            onSave={async s => { await editar(enEdicion.id, s); setEditId(null) }}
          />
        )}
      </Modal>

      <Modal open={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-base">¿Eliminar suscripción?</h2>
          <p className="text-zinc-400 text-sm">
            Se borrará junto con todo su historial de cobros. Si solo dejaste de usarla,
            conviene darla de baja: conserva el historial y deja de proyectar cobros.
          </p>
          <div className="flex gap-3 mt-2">
            <Button variante="secundario" className="flex-1" onClick={() => setConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variante="peligro" className="flex-1"
              onClick={() => { if (confirmId) { eliminar(confirmId); setConfirmId(null) } }}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function FormSuscripcion({ inicial, onSave }: {
  inicial?: Suscripcion
  onSave: (s: NuevaSuscripcion) => Promise<void>
}) {
  const [nombre, setNombre]   = useState(inicial?.nombre ?? '')
  const [monto, setMonto]     = useState(inicial ? String(inicial.monto) : '')
  const [ciclo, setCiclo]     = useState<'mensual' | 'anual'>(inicial?.ciclo ?? 'mensual')
  const [dia, setDia]         = useState(String(inicial?.diaCobro ?? 1))
  const [mes, setMes]         = useState(String(inicial?.mesCobro ?? new Date().getMonth() + 1))
  const [metodo, setMetodo]   = useState(inicial?.metodoPago ?? '')
  const [guardando, setGuardando] = useState(false)

  const inputCls = INPUT
  const labelCls = LABEL

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const d = parseInt(dia)
    if (!nombre || !monto || !d) return
    setGuardando(true)
    try {
      await onSave({
        nombre,
        monto: parseInt(monto),
        ciclo,
        diaCobro: Math.min(Math.max(d, 1), 31),
        mesCobro: ciclo === 'anual' ? parseInt(mes) : null,
        metodoPago: metodo,
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Servicio</label>
        <input
          className={inputCls}
          placeholder="Netflix, gimnasio, dominio…"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelCls}>Monto del cobro</label>
        <input
          className={inputCls}
          type="number"
          min="0"
          placeholder="0"
          value={monto}
          onChange={e => setMonto(e.target.value.replace(/\D/g, ''))}
          required
        />
      </div>

      <div>
        <label className={labelCls}>Cada cuánto</label>
        <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
          {(['mensual', 'anual'] as const).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCiclo(c)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${
                ciclo === c ? 'bg-accent text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Cuándo te cobran</label>
        <div className={`grid gap-3 ${ciclo === 'anual' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {ciclo === 'anual' && (
            <select
              className={inputCls}
              value={mes}
              onChange={e => setMes(e.target.value)}
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          )}
          <input
            className={inputCls}
            type="number"
            min="1"
            max="31"
            placeholder="Día"
            value={dia}
            onChange={e => setDia(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>
        <p className="text-zinc-600 text-xs mt-2">
          Si el día no existe en un mes (el 31 en febrero), el cobro se registra el último día.
        </p>
      </div>

      <div>
        <label className={labelCls}>A dónde te lo cobran</label>
        <MetodoPicker valor={metodo} onChange={setMetodo} opcional />
      </div>

      <Button type="submit" disabled={guardando || !nombre || !monto}>
        {guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Añadir servicio'}
      </Button>
    </form>
  )
}
