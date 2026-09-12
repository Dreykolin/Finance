import { useState } from 'react'
import { Trash2, Plus, Check, X, ChevronLeft, ChevronRight, Pause, Play, Pencil } from 'lucide-react'
import { useSuscripciones } from '../../store/useSuscripciones'
import { formatCLP } from '../../lib/format'
import Modal from '../../components/Modal'
import StatTile from '../../components/StatTile'
import { Card, Button, INPUT, LABEL } from '../../components/ui'
import MetodoPicker from '../../components/MetodoPicker'
import {
  MESES, ventana, etiquetaMes, periodoActual, estadoCelda, editable, ESTILO_CELDA,
} from '../../lib/cargos'
import type { Suscripcion, NuevaSuscripcion } from '../../types'

/**
 * El carril en el teléfono.
 *
 * En escritorio cada servicio es una fila: nombre a la izquierda y siete meses a
 * la derecha. A 390px eso deja celdas de menos de veinte píxeles, imposibles de
 * acertar con el pulgar. Aquí el bloque se apila —identidad arriba, carril
 * debajo ocupando todo el ancho— y así las celdas rondan los cuarenta píxeles.
 * La cabecera de meses se escribe una sola vez arriba, y sigue alineada porque
 * todos los carriles comparten la misma retícula de siete columnas.
 */
function FilaServicio({ s, periodos, onAlternar, onEditar, onBaja, onEliminar }: {
  s: Suscripcion
  periodos: string[]
  onAlternar: (periodo: string) => void
  onEditar: () => void
  onBaja: () => void
  onEliminar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const hoy = periodoActual()

  return (
    <div className={`px-4 py-3.5 border-b border-zinc-800/40 last:border-0 ${s.activa ? '' : 'opacity-45'}`}>
      <button className="w-full flex items-start justify-between gap-3 text-left"
        onClick={() => setAbierto(v => !v)}>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{s.nombre}</p>
          <p className="text-zinc-500 text-xs truncate">
            {s.ciclo === 'anual'
              ? `${s.diaCobro} ${MESES[(s.mesCobro ?? 1) - 1]} · anual`
              : `día ${s.diaCobro}`}
            {s.metodoPago && ` · ${s.metodoPago}`}
            {!s.activa && ' · de baja'}
          </p>
        </div>
        <span className="text-white font-bold text-sm whitespace-nowrap tabular-nums">
          {formatCLP(s.monto)}
        </span>
      </button>

      <div className="grid grid-cols-7 gap-1.5 mt-3">
        {periodos.map(p => {
          const cargo = s.cargos.find(c => c.periodo === p)
          const estado = estadoCelda(s, p, cargo)
          const activa = editable(estado)
          return (
            <button
              key={p}
              disabled={!activa}
              onClick={() => onAlternar(p)}
              className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                ESTILO_CELDA[estado]
              } ${activa ? 'active:scale-95' : ''} ${p === hoy ? 'ring-1 ring-zinc-600' : ''}`}
            >
              {(estado === 'cobrado' || estado === 'porConfirmar') && <Check size={15} strokeWidth={3} />}
              {estado === 'omitido' && <X size={13} strokeWidth={3} />}
              {estado === 'proyectado' && <span className="w-1 h-1 rounded-full bg-zinc-600" />}
            </button>
          )
        })}
      </div>

      {abierto && (
        <div className="animate-despliegue">
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
          <Button tamano="sm" variante="secundario" onClick={onEditar}
            className="flex items-center gap-1.5">
            <Pencil size={13} /> Editar
          </Button>
          <Button tamano="sm" variante="secundario" onClick={onBaja}
            className="flex items-center gap-1.5">
            {s.activa ? <><Pause size={13} /> Dar de baja</> : <><Play size={13} /> Reactivar</>}
          </Button>
          <button onClick={onEliminar}
            className="ml-auto text-zinc-600 active:text-red-400 p-1.5">
            <Trash2 size={16} />
          </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MobileSuscripciones() {
  const { suscripciones, agregar, editar, eliminar, alternarCargo } = useSuscripciones()

  const [offset, setOffset]       = useState(0)
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const periodos = ventana(offset)
  const activas  = suscripciones.filter(s => s.activa)
  const mensual  = activas.filter(s => s.ciclo === 'mensual').reduce((t, s) => t + s.monto, 0)
  const anual    = activas.filter(s => s.ciclo === 'anual').reduce((t, s) => t + s.monto, 0)
  const acumulado = suscripciones.flatMap(s =>
    s.cargos.filter(c => c.estado === 'cobrado')).reduce((t, c) => t + c.monto, 0)
  const porRevisar = suscripciones.flatMap(s =>
    s.cargos.filter(c => c.estado === 'cobrado' && !c.confirmado)).length

  const enEdicion = suscripciones.find(s => s.id === editId) ?? null

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">Suscripciones</h1>
        <Button tamano="sm" onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5">
          <Plus size={14} /> Añadir
        </Button>
      </div>

      <div className="px-4 pb-28 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <StatTile etiqueta="Al mes" valor={formatCLP(mensual)}
            nota={anual > 0 ? `+ ${formatCLP(Math.round(anual / 12))} prorrateado` : undefined} />
          <StatTile etiqueta="Al año" valor={formatCLP(mensual * 12 + anual)} />
          <StatTile etiqueta="Pagado hasta hoy" valor={formatCLP(acumulado)} />
          <StatTile etiqueta="Por revisar" valor={String(porRevisar)}
            nota={porRevisar > 0 ? 'Dados por hechos' : 'Todo confirmado'} />
        </div>

        <Card tipo="lista">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800">
            <p className="text-white font-bold text-sm">Servicios</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setOffset(o => o - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 active:bg-zinc-800">
                <ChevronLeft size={16} />
              </button>
              {offset !== 0 && (
                <button onClick={() => setOffset(0)}
                  className="text-zinc-500 text-[11px] font-bold px-1">Hoy</button>
              )}
              <button onClick={() => setOffset(o => o + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 active:bg-zinc-800">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Una sola cabecera de meses: todos los carriles comparten retícula. */}
          <div className="grid grid-cols-7 gap-1.5 px-4 py-2 border-b border-zinc-800/60">
            {periodos.map(p => (
              <span key={p} className={`text-center text-[10px] font-extrabold uppercase ${
                p === periodoActual() ? 'text-accent' : 'text-zinc-600'
              }`}>
                {etiquetaMes(p)}
              </span>
            ))}
          </div>

          {suscripciones.length === 0 && (
            <p className="py-10 text-center text-zinc-700 text-sm">Sin servicios registrados.</p>
          )}

          {suscripciones.map(s => (
            <FilaServicio
              key={s.id}
              s={s}
              periodos={periodos}
              onAlternar={p => alternarCargo(s.id, p)}
              onEditar={() => setEditId(s.id)}
              onBaja={() => editar(s.id, { activa: !s.activa })}
              onEliminar={() => setConfirmId(s.id)}
            />
          ))}
        </Card>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-zinc-500 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-accent" /> cobrado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-accent/20 border border-dashed border-accent/60" /> sin confirmar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-zinc-800" /> no se cobró
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-zinc-900 border border-zinc-800" /> proyectado
          </span>
        </div>

        <p className="text-zinc-600 text-xs leading-relaxed px-1">
          Los cobros se dan por hechos al llegar su fecha y se registran solos en Gastos.
          Toca un mes si alguno no ocurrió.
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
            Se borrará con todo su historial. Si solo dejaste de usarla, conviene
            darla de baja: conserva el historial y deja de proyectar cobros.
          </p>
          <div className="flex gap-3">
            <Button variante="secundario" className="flex-1" onClick={() => setConfirmId(null)}>
              Cancelar
            </Button>
            <Button variante="peligro" className="flex-1"
              onClick={() => { if (confirmId) { eliminar(confirmId); setConfirmId(null) } }}>
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
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [monto, setMonto]   = useState(inicial ? String(inicial.monto) : '')
  const [ciclo, setCiclo]   = useState<'mensual' | 'anual'>(inicial?.ciclo ?? 'mensual')
  const [dia, setDia]       = useState(String(inicial?.diaCobro ?? 1))
  const [mes, setMes]       = useState(String(inicial?.mesCobro ?? new Date().getMonth() + 1))
  const [metodo, setMetodo] = useState(inicial?.metodoPago ?? '')
  const [guardando, setGuardando] = useState(false)

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
        <label className={LABEL}>Servicio</label>
        <input className={INPUT} placeholder="Netflix, gimnasio…" value={nombre}
          onChange={e => setNombre(e.target.value)} required />
      </div>

      <div>
        <label className={LABEL}>Monto del cobro</label>
        <input className={INPUT} type="number" min="0" placeholder="0" value={monto}
          onChange={e => setMonto(e.target.value.replace(/\D/g, ''))} required />
      </div>

      <div>
        <label className={LABEL}>Cada cuánto</label>
        <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
          {(['mensual', 'anual'] as const).map(c => (
            <button key={c} type="button" onClick={() => setCiclo(c)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-colors ${
                ciclo === c ? 'bg-accent text-white' : 'text-zinc-500'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={LABEL}>Cuándo te cobran</label>
        <div className={`grid gap-3 ${ciclo === 'anual' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {ciclo === 'anual' && (
            <select className={INPUT} value={mes} onChange={e => setMes(e.target.value)}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          )}
          <input className={INPUT} type="number" min="1" max="31" placeholder="Día" value={dia}
            onChange={e => setDia(e.target.value.replace(/\D/g, ''))} required />
        </div>
      </div>

      <div>
        <label className={LABEL}>A dónde te lo cobran</label>
        <MetodoPicker valor={metodo} onChange={setMetodo} opcional />
      </div>

      <Button type="submit" disabled={guardando || !nombre || !monto}>
        {guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Añadir servicio'}
      </Button>
    </form>
  )
}

