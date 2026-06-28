import { NavLink } from 'react-router-dom'
import { TrendingUp, CreditCard, PiggyBank, Repeat2 } from 'lucide-react'

const tabs = [
  { to: '/mobile/gastos',        Icon: TrendingUp, label: 'Gastos'  },
  { to: '/mobile/cuotas',        Icon: CreditCard,  label: 'Cuotas'  },
  { to: '/mobile/ahorros',       Icon: PiggyBank,   label: 'Ahorros' },
  { to: '/mobile/suscripciones', Icon: Repeat2,     label: 'Suscr.'  },
]

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800 flex safe-area-bottom">
      {tabs.map(({ to, Icon, label }) => (
        <NavLink key={to} to={to} className={({ isActive }) =>
          `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
            isActive ? 'text-accent' : 'text-zinc-500'
          }`
        }>
          <Icon size={22} />
          <span className="text-[11px] font-semibold">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
