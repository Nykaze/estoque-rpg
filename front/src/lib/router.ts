import { writable, get } from 'svelte/store'
import { canManage, isAdmin } from './utils'

export type Route = {
  view: string
  rpgId?: string
  charId?: string
}

export const route = writable<Route>({ view: 'dashboard' })

export function parseHash(hash: string): Route {
  const h = (hash || '').replace(/^#\/?/, '')
  const parts = h.split('/').filter(Boolean)
  if (parts.length === 0) return { view: 'dashboard' }
  if (parts[0] === 'rpg') {
    const rpgId = parts[1]
    if (parts[2] === 'fichas') return { view: 'fichas', rpgId }
    if (parts[2] === 'ficha' && parts[3]) return { view: 'ficha', rpgId, charId: parts[3] }
    if (parts[2] === 'monstros') return { view: 'monstros', rpgId }
    if (parts[2] === 'estoque') return { view: 'estoque', rpgId }
    if (parts[2] === 'config') return { view: 'config', rpgId }
    if (rpgId) return { view: 'mesa', rpgId }
    return { view: 'dashboard' }
  }
  if (parts[0] === 'usuarios') return { view: 'usuarios' }
  if (parts[0] === 'ajustes') return { view: 'ajustes' }
  return { view: 'dashboard' }
}

export function navigate(r: Route) {
  const parts: string[] = []
  if (['mesa', 'fichas', 'ficha', 'monstros', 'estoque', 'config'].includes(r.view)) {
    parts.push('rpg', r.rpgId || '')
    if (r.view !== 'mesa') parts.push(r.view)
    if (r.view === 'ficha') parts.push(r.charId || '')
    window.location.hash = '/' + parts.filter(Boolean).join('/')
  } else {
    window.location.hash = '/' + (r.view === 'dashboard' ? '' : r.view)
  }
}

export function initRouter() {
  const apply = () => {
    let r = parseHash(window.location.hash)
    if (r.view === 'usuarios' && !isAdmin()) r = { view: 'dashboard' }
    if (r.view === 'monstros' && !canManage()) {
      if (r.rpgId) r = { view: 'mesa', rpgId: r.rpgId }
      else r = { view: 'dashboard' }
    }
    if ((r.view === 'estoque' || r.view === 'config') && !canManage()) {
      if (r.rpgId) r = { view: 'mesa', rpgId: r.rpgId }
      else r = { view: 'dashboard' }
    }
    route.set(r)
  }
  window.addEventListener('hashchange', apply)
  apply()
}

export function currentRoute() {
  return get(route)
}
