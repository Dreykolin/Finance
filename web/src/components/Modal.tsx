import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

/** Debe coincidir con --dur-salida en index.css. */
const DUR_SALIDA = 160

/**
 * Estado compartido por todos los diálogos abiertos.
 *
 * El bloqueo del scroll se lleva por cuenta y no por booleano: en Cuotas un
 * diálogo abre otro encima, y con un booleano el segundo en cerrarse devolvía
 * el scroll al fondo mientras el primero seguía abierto.
 *
 * La pila además decide quién atiende la tecla Escape: solo el de más arriba.
 */
let abiertos: symbol[] = []

function apilar(id: symbol) {
  abiertos.push(id)
  if (abiertos.length === 1) document.body.style.overflow = 'hidden'
}

function desapilar(id: symbol) {
  abiertos = abiertos.filter(x => x !== id)
  if (abiertos.length === 0) document.body.style.overflow = ''
}

const esElDeArriba = (id: symbol) => abiertos[abiertos.length - 1] === id

const sinMovimiento = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: Props) {
  const id = useRef(Symbol('dialogo'))
  // Se mantiene montado durante la animación de cierre: sin esto el diálogo
  // desaparecía de golpe mientras el fondo sí se desvanecía.
  const [montado, setMontado] = useState(open)
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    if (open) {
      setMontado(true)
      setSaliendo(false)
      return
    }
    if (!montado) return
    setSaliendo(true)
    const t = setTimeout(() => {
      setMontado(false)
      setSaliendo(false)
    }, sinMovimiento() ? 0 : DUR_SALIDA)
    return () => clearTimeout(t)
  }, [open, montado])

  useEffect(() => {
    if (!montado || saliendo) return
    const propio = id.current
    apilar(propio)

    function alPulsar(e: KeyboardEvent) {
      // Solo el diálogo de más arriba responde, o Escape cerraría toda la pila.
      if (e.key === 'Escape' && esElDeArriba(propio)) {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', alPulsar)
    return () => {
      document.removeEventListener('keydown', alPulsar)
      desapilar(propio)
    }
  }, [montado, saliendo, onClose])

  if (!montado) return null

  // Cada diálogo apilado se sitúa por encima del anterior.
  const profundidad = Math.max(abiertos.indexOf(id.current), 0)

  return (
    <div
      className="fixed inset-0 flex items-end md:items-center justify-center"
      style={{ zIndex: `calc(var(--z-dialogo) + ${profundidad})` }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${
          saliendo ? 'animate-fade-out' : 'animate-fade-in'
        }`}
        onClick={onClose}
      />
      <div
        className={`relative w-full md:max-w-md bg-zinc-900 md:rounded-2xl rounded-t-2xl border border-zinc-800 shadow-2xl ${
          saliendo ? 'animate-dialogo-out' : 'animate-dialogo-in'
        }`}
      >
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
            <h2 className="font-bold text-base">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-5 py-4 pb-8 md:pb-5 max-h-[85vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
