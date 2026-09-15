import { writable, get } from 'svelte/store'

export type User = {
  id: string
  username: string
  name: string
  role: 'admin' | 'gestor' | 'jogador'
  active?: boolean
  createdAt?: number
}

// Estado completo recebido do servidor via socket (stateFor(user))
export const app = writable<any>(null)
export const me = writable<User | null>(null)
export const connected = writable(false)
export const connecting = writable(true)

export type ToastKind = 'ok' | 'err'
export type Toast = { id: number; msg: string; kind: ToastKind }
export const toasts = writable<Toast[]>([])
let toastSeq = 0
export function pushToast(msg: string, kind: ToastKind = 'ok') {
  const t = { id: ++toastSeq, msg, kind }
  toasts.update((l) => [...l, t])
  setTimeout(() => toasts.update((l) => l.filter((x) => x.id !== t.id)), 2600)
}

export function applyState(s: any) {
  app.set(s)
  if (s?.me) me.set(s.me)
}

// ---- helpers reativos ----
export const getState = () => get(app)
export const getMe = () => get(me)
