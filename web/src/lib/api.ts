const BASE = import.meta.env.VITE_API_URL ?? ''

function getToken() {
  return localStorage.getItem('fin_token')
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

export const api = {
  get:    <T>(path: string)                 => req<T>(path),
  post:   <T>(path: string, body?: unknown) => req<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown) => req<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                 => req<T>(path, { method: 'DELETE' }),
}
