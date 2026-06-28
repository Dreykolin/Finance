import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Nav from './components/Nav'
import MobileNav from './components/MobileNav'
import Gastos from './pages/Gastos'
import Cuotas from './pages/Cuotas'
import Ahorros from './pages/Ahorros'
import Suscripciones from './pages/Suscripciones'
import MobileGastos from './pages/mobile/Gastos'
import MobileCuotas from './pages/mobile/Cuotas'
import MobileAhorros from './pages/mobile/Ahorros'
import MobileSuscripciones from './pages/mobile/Suscripciones'

function AutoRedirect() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
  return <Navigate to={isMobile ? '/mobile/gastos' : '/gastos'} replace />
}

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
    <Routes>
      <Route path="/" element={<AutoRedirect />} />
      <Route path="/login" element={<AutoRedirect />} />

      {/* Desktop */}
      <Route path="/gastos"        element={<div className="flex h-full bg-zinc-950 text-white overflow-hidden"><Nav /><main className="flex-1 overflow-y-auto pb-16 md:pb-0 md:ml-56"><Gastos /></main></div>} />
      <Route path="/cuotas"        element={<div className="flex h-full bg-zinc-950 text-white overflow-hidden"><Nav /><main className="flex-1 overflow-y-auto pb-16 md:pb-0 md:ml-56"><Cuotas /></main></div>} />
      <Route path="/ahorros"       element={<div className="flex h-full bg-zinc-950 text-white overflow-hidden"><Nav /><main className="flex-1 overflow-y-auto pb-16 md:pb-0 md:ml-56"><Ahorros /></main></div>} />
      <Route path="/suscripciones" element={<div className="flex h-full bg-zinc-950 text-white overflow-hidden"><Nav /><main className="flex-1 overflow-y-auto pb-16 md:pb-0 md:ml-56"><Suscripciones /></main></div>} />

      {/* Mobile */}
      <Route path="/mobile/gastos"        element={<div className="min-h-full bg-zinc-950 text-white"><MobileGastos /><MobileNav /></div>} />
      <Route path="/mobile/cuotas"        element={<div className="min-h-full bg-zinc-950 text-white"><MobileCuotas /><MobileNav /></div>} />
      <Route path="/mobile/ahorros"       element={<div className="min-h-full bg-zinc-950 text-white"><MobileAhorros /><MobileNav /></div>} />
      <Route path="/mobile/suscripciones" element={<div className="min-h-full bg-zinc-950 text-white"><MobileSuscripciones /><MobileNav /></div>} />

      <Route path="*" element={<AutoRedirect />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
