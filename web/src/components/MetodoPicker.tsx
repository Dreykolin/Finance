import { METODOS, METODO_FILL } from '../lib/colors'

/**
 * Selector de medio de pago. En cuotas y suscripciones se declara una sola vez
 * y lo heredan todos los gastos que el compromiso genere, de ahí que admita
 * quedar sin declarar: no siempre se recuerda con qué tarjeta se contrató algo.
 */
export default function MetodoPicker({ valor, onChange, opcional = false }: {
  valor: string
  onChange: (m: string) => void
  opcional?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {METODOS.map(m => {
        const activo = valor === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(activo && opcional ? '' : m)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activo ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: activo ? 'rgba(255,255,255,0.9)' : METODO_FILL[m] }}
            />
            {m}
          </button>
        )
      })}
      {opcional && valor === '' && (
        <span className="self-center text-zinc-600 text-xs">sin declarar</span>
      )}
    </div>
  )
}
