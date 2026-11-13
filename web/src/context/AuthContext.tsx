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
    // Después del login (Google o empresa) el backend vuelve con un código de un
    // solo uso, no con el JWT: se saca de la URL de inmediato y se canjea.
    const params = new URLSearchParams(window.location.search)
    const codigo = params.get('codigo')
    if (codigo) window.history.replaceState({}, '', window.location.pathname)

    const canje = codigo
      ? api.post<{ token: string }>('/auth/canjear', { codigo })
          .then(({ token }) => localStorage.setItem('fin_token', token))
          .catch(() => {})
      : Promise.resolve()

    canje
      .then(() => api.get<AuthUser>('/auth/me'))
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
