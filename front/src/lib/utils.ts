import { getState, getMe } from './stores'
import { SEC_META, BUILTIN_SECS, SEC_DEFAULT_COL, EQUIP_SLOTS, EQUIP_SLOTS_STARS } from './constants'

export function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] as string))
}
export function fmt(n: any): number {
  return Math.round((Number(n) || 0) * 100) / 100
}
export function fmtDate(ts?: number): string {
  return ts ? new Date(ts).toLocaleDateString('pt-BR') : '—'
}
export function fmtDateTime(ts?: number): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
export function relTime(ts?: number): string {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d} d`
  return 'em ' + new Date(ts).toLocaleDateString('pt-BR')
}
export function initials(name: any): string {
  const parts = String(name || '?').trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0] || '').join('').toUpperCase() || '?'
}
export function pct(a: any, b: any): number {
  b = Number(b) || 0
  return b > 0 ? Math.min(100, ((Number(a) || 0) / b) * 100) : 0
}
export function canManage(): boolean {
  const me = getMe()
  return !!me && (me.role === 'admin' || me.role === 'gestor')
}
export function isAdmin(): boolean {
  const me = getMe()
  return !!me && me.role === 'admin'
}
export function isOwner(c: any): boolean {
  const me = getMe()
  return !!me && me.role === 'jogador' && !!c && c.ownerId === me.id
}
export function canEditChar(c: any): boolean {
  if (c?.isMonster) return canManage()
  return canManage() || isOwner(c)
}
export function canTouch(c: any, ownerId?: string | null): boolean {
  const me = getMe()
  return canEditChar(c) && (canManage() || ownerId === me?.id)
}

export function charsOf(rpgId: string): any[] {
  return getState().characters.filter((c: any) => c.rpgId === rpgId)
}
export function fichasOf(rpgId: string): any[] {
  return getState().characters.filter((c: any) => c.rpgId === rpgId && !c.isMonster)
}
export function monstrosOf(rpgId: string): any[] {
  return getState().characters.filter((c: any) => c.rpgId === rpgId && c.isMonster)
}
export function findRpg(id: string): any {
  return getState().rpgs.find((r: any) => r.id === id)
}
export function findChar(id: string): any {
  return getState().characters.find((c: any) => c.id === id)
}
export function equipSlots(rpg: any): string[] {
  return rpg?.equipStars ? EQUIP_SLOTS_STARS : EQUIP_SLOTS
}
export function slotsUsed(c: any, rpg?: any): number {
  const noEquip = rpg?.equipStars
  const equipped = noEquip ? new Set(Object.values(c.equipment || {}).filter(Boolean)) : new Set()
  return c.inventory.reduce((s: number, i: any) => s + (equipped.has(i.id) ? 0 : i.qty / (i.perSlot || 1)), 0)
}
export function starOf(item: any, rpg: any): number {
  if (!item || !rpg?.equipStars) return 0
  const cat = (rpg?.catalog || []).find((x: any) => x.id === item.src)
  if (!cat || cat.category !== 'acessorio') return 0
  return Math.min(3, Math.max(1, Math.floor(Number(cat.stars) || 1)))
}
export function equipAccStars(c: any, rpg: any): number {
  if (!rpg?.equipStars) return 0
  const eq = c.equipment || {}
  return equipSlots(rpg).reduce((s, slot) => s + starOf(c.inventory.find((i: any) => i.id === eq[slot]), rpg), 0)
}
export function assignedQty(rpgId: string, itemId: string): number {
  const st = getState()
  let sum = 0
  for (const c of st.characters) {
    if (c.rpgId !== rpgId) continue
    for (const it of c.inventory) if (it.src === itemId) sum += Number(it.qty) || 0
  }
  return sum
}

export function normalizeSectionDef(def: any): any[] {
  if (!Array.isArray(def)) def = []
  const seen: Record<string, boolean> = {}
  const out: any[] = []
  for (const f of def) {
    if (!f || !f.id || seen[f.id]) continue
    seen[f.id] = true
    out.push({
      id: String(f.id).slice(0, 24),
      name: String((f.name && String(f.name).trim()) ? f.name : 'Campo').slice(0, 40),
      editable: f.editable !== false,
    })
  }
  return out
}
export function getSections(sc: any): any[] {
  const isArray = Array.isArray(sc)
  const src = isArray
    ? sc
    : sc && typeof sc === 'object'
      ? Object.keys(sc).map((k) => ({ id: k, label: (SEC_META[k] || {}).label || k, type: 'builtin', enabled: sc[k] !== false }))
      : []
  const mk = (it: any) => {
    const custom = it.type === 'custom' || !SEC_META[it.id]
    const o: any = {
      id: it.id,
      label: (it.label && String(it.label).trim()) ? it.label : ((SEC_META[it.id] || {}).label || it.id),
      type: custom ? 'custom' : 'builtin',
      enabled: it.enabled !== false,
      col: (it.col === 'left' || it.col === 'right') ? it.col : (SEC_DEFAULT_COL[it.id] || 'right'),
    }
    if (custom) o.definition = normalizeSectionDef(it.definition)
    return o
  }
  const def = (id: string) => ({ id, label: (SEC_META[id] || {}).label || id, type: 'builtin', enabled: true, col: SEC_DEFAULT_COL[id] || 'right' })
  if (isArray) {
    const out: any[] = []
    const seen: Record<string, boolean> = {}
    for (const it of src) {
      if (!it || !it.id || seen[it.id]) continue
      seen[it.id] = true
      out.push(mk(it))
    }
    BUILTIN_SECS.forEach((id) => { if (!seen[id]) { seen[id] = true; out.push(def(id)) } })
    return out
  }
  const byId: Record<string, any> = {}
  for (const it of src) {
    if (!it || !it.id || byId[it.id]) continue
    byId[it.id] = mk(it)
  }
  const out: any[] = []
  BUILTIN_SECS.forEach((id) => { const e = byId[id]; out.push(e || def(id)); delete byId[id] })
  Object.values(byId).forEach((o) => out.push(o))
  return out
}
export function sectionsPayload(r: any): any[] {
  const raw = (r && r.schema && r.schema.sections) || []
  const list = Array.isArray(raw) ? raw : Object.keys(raw || {}).map((k) => ({ id: k, enabled: raw[k] !== false }))
  return getSections(list).map((s) => {
    const o: any = { id: s.id, label: s.label, type: s.type, enabled: s.enabled, col: s.col }
    if (s.type === 'custom') o.definition = s.definition
    return o
  })
}

const FORMULA_VARS = ['+', '-', '*', '/', '(', ')']
export function evalExpression(expr: string, vars: Record<string, number>): number | null {
  try {
    const toks = String(expr || '').toUpperCase().match(/[A-ZÀ-ÚÃÕÂÊÎÔÛ][A-ZÀ-ÚÃÕÂÊÎÔÛ0-9 ]*|\d+(?:\.\d+)?|[+\-*/()]/g) || []
    let i = 0
    const peek = () => toks[i]
    const next = () => toks[i++]
    const parseExpr = (): number => {
      let v = parseTerm()
      while (peek() === '+' || peek() === '-') { const op = next(); const r = parseTerm(); v = op === '+' ? v + r : v - r }
      return v
    }
    const parseTerm = (): number => {
      let v = parseFactor()
      while (peek() === '*' || peek() === '/') { const op = next(); const r = parseFactor(); v = op === '*' ? v * r : (r === 0 ? 0 : v / r) }
      return v
    }
    const parseFactor = (): number => {
      const t = next()
      if (t === '(') { const v = parseExpr(); next(); return v }
      if (t === '-' || t === '+') return (t === '-' ? -1 : 1) * parseFactor()
      if (t !== undefined && !FORMULA_VARS.includes(t)) {
        const n = Number(t)
        if (!isNaN(n)) return n
        const key = t.trim()
        return vars[key] !== undefined ? Number(vars[key]) : 0
      }
      return 0
    }
    if (!toks.length) return null
    const v = parseExpr()
    if (i !== toks.length) return null
    return v
  } catch { return null }
}
export function calcFormulas(rpg: any, c: any): { name: string; value: number }[] {
  const out: { name: string; value: number }[] = []
  if (!rpg || !Array.isArray(rpg.schema.formulas)) return out
  const vars: Record<string, number> = {}
  for (const a of rpg.schema.attrs || []) {
    if (a.active !== false) vars[(a.name || '').trim().toUpperCase()] = Number(c.attrVals[a.id] ?? 0)
  }
  for (const f of rpg.schema.formulas) {
    if (!f || !f.expr) continue
    const v = evalExpression(f.expr, vars)
    if (v !== null && isFinite(v)) out.push({ name: f.name, value: v })
  }
  return out
}

export function attrLabel(attr: any, rpg: any): string {
  return attr?.name || 'Atributo'
}

const BONUS_KEYS = ['DANO', 'VIDA', 'MANA', 'ESFORÇO', 'DEFESA'] as const
export type BonusKey = (typeof BONUS_KEYS)[number]
export type ItemBonuses = Record<BonusKey, number>
export function emptyBonuses(): ItemBonuses {
  return { DANO: 0, VIDA: 0, MANA: 0, ESFORÇO: 0, DEFESA: 0 }
}
function bonusKeyOf(word: string): BonusKey | null {
  const w = word.toUpperCase()
  if (w === 'ESFORCO' || w === 'ESTAMINA') return 'ESFORÇO'
  if (w === 'VIDA') return 'VIDA'
  if (w === 'MANA') return 'MANA'
  if (w === 'DEFESA') return 'DEFESA'
  if (w === 'DANO') return 'DANO'
  return null
}
function diceAvg(count: number, faces: number): number {
  return Math.round(((count || 1) * ((faces || 0) + 1)) / 2)
}
export function parseItemBonuses(effect: string): ItemBonuses {
  const out = emptyBonuses()
  const txt = String(effect || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (!txt.trim()) return out
  for (const m of txt.matchAll(/([-+])\s*(\d+)\s*DE\s+(DANO|VIDA|MANA|ESFORCO|ESTAMINA|DEFESA)/g)) {
    const k = bonusKeyOf(m[3])
    if (k) out[k] += (m[1] === '-' ? -1 : 1) * Number(m[2])
  }
  for (const m of txt.matchAll(/(?:^|[^A-Z0-9])(DANO|VIDA|MANA|ESFORCO|ESTAMINA|DEFESA)[\s:=]*([+-])?(\d+)(?:D(\d+))?/g)) {
    const k = bonusKeyOf(m[1])
    if (!k) continue
    const sign = m[2] === '-' ? -1 : 1
    const base = Number(m[3])
    if (m[4]) out[k] += sign * diceAvg(base, Number(m[4]))
    else out[k] += sign * base
  }
  return out
}
export function equipBonuses(rpg: any, c: any): ItemBonuses {
  const out = emptyBonuses()
  if (!c || !Array.isArray(c.inventory)) return out
  const equipped = new Set(Object.values(c.equipment || {}).filter(Boolean))
  for (const it of c.inventory) {
    if (!it || !equipped.has(it.id)) continue
    let eff = it.effect || ''
    if (!eff && rpg && Array.isArray(rpg.catalog)) {
      const cat = rpg.catalog.find((x: any) => x.id === it.src)
      eff = cat?.effect || ''
    }
    if (!eff) continue
    const b = parseItemBonuses(eff)
    for (const k of BONUS_KEYS) out[k] += b[k]
  }
  return out
}
export function classLbl(rpg: any): string {
  return (rpg?.schema?.classLabel || 'Funções')
}
export function classLblSing(rpg: any): string {
  const s = classLbl(rpg)
  return /s$/i.test(s) ? s.slice(0, -1) : s
}
