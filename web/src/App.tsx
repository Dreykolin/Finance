import { Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav'
import Gastos from './pages/Gastos'
import Cuotas from './pages/Cuotas'
import Ahorros from './pages/Ahorros'
import Suscripciones from './pages/Suscripciones'

export default function App() {
  return (
    <div className="flex h-full bg-zinc-950 text-white overflow-hidden">
      <Nav />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 md:ml-56">
        <Routes>
          <Route path="/" element={<Navigate to="/gastos" replace />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/cuotas" element={<Cuotas />} />
          <Route path="/ahorros" element={<Ahorros />} />
          <Route path="/suscripciones" element={<Suscripciones />} />
        </Routes>
      </main>
    </div>
  )
}
