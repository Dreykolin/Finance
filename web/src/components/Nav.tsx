import { NavLink } from 'react-router-dom'
import { TrendingUp, CreditCard, PiggyBank, Repeat2 } from 'lucide-react'

const tabs = [
  { to: '/gastos',        Icon: TrendingUp, label: 'Gastos'  },
  { to: '/cuotas',        Icon: CreditCard,  label: 'Cuotas'  },
  { to: '/ahorros',       Icon: PiggyBank,   label: 'Ahorros' },
  { to: '/suscripciones', Icon: Repeat2,     label: 'Suscr.'  },
]

export default function Nav() {
  return (
    <>
      {/* ── Mobile bottom bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800 flex safe-area-bottom">
        {tabs.map(({ to, Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
              isActive ? 'text-accent' : 'text-zinc-500'
            }`
          }>
            <Icon size={22} />
            <span className="text-[11px] font-semibold">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 h-full bg-zinc-950 border-r border-zinc-800 fixed left-0 top-0 z-40">
        <div className="px-6 py-6 border-b border-zinc-800">
          <h1 className="text-lg font-extrabold tracking-tight">Finanzas</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Panel personal</p>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1 mt-2">
          {tabs.map(({ to, Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
              }`
            }>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
