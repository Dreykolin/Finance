import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

export interface AuthUser { id: number; nombre: string; correo: string }
interface AuthCtx { user: AuthUser | null; loading: boolean; logout: () => void }

const Ctx = createContext<AuthCtx>(null!)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Captura token que viene en la URL después del OAuth redirect
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')
    if (token) {
      localStorage.setItem('fin_token', token)
      window.history.replaceState({}, '', window.location.pathname)
    }

    api.get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    localStorage.removeItem('fin_token')
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, logout }}>{children}</Ctx.Provider>
}
