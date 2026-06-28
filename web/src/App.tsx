import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Nav from './components/Nav'
import Gastos from './pages/Gastos'
import Cuotas from './pages/Cuotas'
import Ahorros from './pages/Ahorros'
import Suscripciones from './pages/Suscripciones'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="flex h-full items-center justify-center bg-zinc-950">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*"      element={<Navigate to="/login" replace />} />
    </Routes>
  )

  return (
    <div className="flex h-full bg-zinc-950 text-white overflow-hidden">
      <Nav />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 md:ml-56">
        <Routes>
          <Route path="/"              element={<Navigate to="/gastos" replace />} />
          <Route path="/gastos"        element={<Gastos />} />
          <Route path="/cuotas"        element={<Cuotas />} />
          <Route path="/ahorros"       element={<Ahorros />} />
          <Route path="/suscripciones" element={<Suscripciones />} />
          <Route path="*"              element={<Navigate to="/gastos" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
