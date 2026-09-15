import type { User } from './stores'

async function post(url: string, body: any): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  })
}

export async function apiLogin(username: string, password: string): Promise<{ ok: boolean; user?: User; error?: string }> {
  try {
    const res = await post('/api/login', { username, password })
    const data = await res.json()
    return data
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erro de conexão.' }
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await post('/api/logout', {})
  } catch {
    // ignora
  }
}

export async function apiMe(): Promise<{ ok: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' })
    const data = await res.json()
    return data
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erro de conexão.' }
  }
}
