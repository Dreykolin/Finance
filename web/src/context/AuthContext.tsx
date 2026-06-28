import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

export interface AuthUser { id: number; nombre: string; correo: string }
interface AuthCtx { user: AuthUser | null; loading: boolean; logout: () => void }

const Ctx = createContext<AuthCtx>(null!)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    api.post('/auth/logout').then(() => setUser(null)).catch(() => setUser(null))
  }

  return <Ctx.Provider value={{ user, loading, logout }}>{children}</Ctx.Provider>
}
