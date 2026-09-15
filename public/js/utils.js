import { getState, getMe } from './state.js';
import { SECTIONS_META, BUILTIN_SECS, SEC_DEFAULT_COL } from './constants.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
export function fmt(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
export function fmtDate(ts) {
  return ts ? new Date(ts).toLocaleDateString('pt-BR') : '—';
}
export function fmtDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
export function relTime(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} d`;
  return 'em ' + new Date(ts).toLocaleDateString('pt-BR');
}
export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] || '').join('').toUpperCase() || '?';
}
export function pct(a, b) {
  b = Number(b) || 0;
  return b > 0 ? Math.min(100, ((Number(a) || 0) / b) * 100) : 0;
}
export function canManage() {
  const me = getMe();
  return !!me && (me.role === 'admin' || me.role === 'gestor');
}
export function isAdmin() {
  const me = getMe();
  return !!me && me.role === 'admin';
}
export function isOwner(c) {
  const me = getMe();
  return !!me && me.role === 'jogador' && !!c && c.ownerId === me.id;
}
export function canEditChar(c) {
  return canManage() || isOwner(c);
}
export function canTouch(c, ownerId) {
  const me = getMe();
  return canEditChar(c) && (canManage() || ownerId === me.id);
}

export function charsOf(rpgId) {
  const state = getState();
  return state.characters.filter((c) => c.rpgId === rpgId);
}
export function findRpg(id) {
  const state = getState();
  return state.rpgs.find((r) => r.id === id);
}
export function findChar(id) {
  const state = getState();
  return state.characters.find((c) => c.id === id);
}
export function slotsUsed(c) {
  return c.inventory.reduce((s, i) => s + i.qty / (i.perSlot || 1), 0);
}
export function assignedQty(rpgId, itemId) {
  const state = getState();
  let sum = 0;
  for (const c of state.characters) {
    if (c.rpgId !== rpgId) continue;
    for (const it of c.inventory) if (it.src === itemId) sum += Number(it.qty) || 0;
  }
  return sum;
}

export function uidShort() {
  return Math.random().toString(36).slice(2, 8);
}
export function normalizeSectionDef(def) {
  if (!Array.isArray(def)) def = [];
  const seen = {};
  const out = [];
  for (const f of def) {
    if (!f || !f.id || seen[f.id]) continue;
    seen[f.id] = true;
    out.push({
      id: String(f.id).slice(0, 24),
      name: String((f.name && String(f.name).trim()) ? f.name : 'Campo').slice(0, 40),
      editable: f.editable !== false
    });
  }
  return out;
}
export function getSections(sc) {
  const isArray = Array.isArray(sc);
  const src = isArray ? sc : (sc && typeof sc === 'object' ? Object.keys(sc).map((k) => ({ id: k, label: (SECTIONS_META[k] || {}).label || k, type: 'builtin', enabled: sc[k] !== false })) : []);
  const mk = (it) => {
    const custom = it.type === 'custom' || !SECTIONS_META[it.id];
    const o = {
      id: it.id,
      label: (it.label && String(it.label).trim()) ? it.label : ((SECTIONS_META[it.id] || {}).label || it.id),
      type: custom ? 'custom' : 'builtin',
      enabled: it.enabled !== false,
      col: (it.col === 'left' || it.col === 'right') ? it.col : (SEC_DEFAULT_COL[it.id] || 'right')
    };
    if (custom) o.definition = normalizeSectionDef(it.definition);
    return o;
  };
  const def = (id) => ({ id, label: (SECTIONS_META[id] || {}).label || id, type: 'builtin', enabled: true, col: SEC_DEFAULT_COL[id] || 'right' });
  if (isArray) {
    const out = [];
    const seen = {};
    for (const it of src) {
      if (!it || !it.id || seen[it.id]) continue;
      seen[it.id] = true;
      out.push(mk(it));
    }
    BUILTIN_SECS.forEach((id) => { if (!seen[id]) { seen[id] = true; out.push(def(id)); } });
    return out;
  }
  const byId = {};
  for (const it of src) {
    if (!it || !it.id || byId[it.id]) continue;
    byId[it.id] = mk(it);
  }
  const out = [];
  BUILTIN_SECS.forEach((id) => { const e = byId[id]; out.push(e || def(id)); delete byId[id]; });
  Object.values(byId).forEach((o) => out.push(o));
  return out;
}
export function sectionsPayload(r) {
  const raw = (r && r.schema && r.schema.sections) || [];
  return (Array.isArray(raw) ? getSections(raw) : getSections(raw)).map((s) => {
    const o = { id: s.id, label: s.label, type: s.type, enabled: s.enabled, col: s.col };
    if (s.type === 'custom') o.definition = s.definition;
    return o;
  });
}
const FORMULA_VARS = ['+', '-', '*', '/', '(', ')'];
export function evalExpression(expr, vars) {
  try {
    const toks = String(expr || '').toUpperCase().match(/[A-ZÀ-ÚÃÕÂÊÎÔÛ][A-ZÀ-ÚÃÕÂÊÎÔÛ0-9 ]*|\d+(?:\.\d+)?|[+\-*/()]/g) || [];
    let i = 0;
    const peek = () => toks[i];
    const next = () => toks[i++];
    const parseExpr = () => {
      let v = parseTerm();
      while (peek() === '+' || peek() === '-') { const op = next(); const r = parseTerm(); v = op === '+' ? v + r : v - r; }
      return v;
    };
    const parseTerm = () => {
      let v = parseFactor();
      while (peek() === '*' || peek() === '/') { const op = next(); const r = parseFactor(); v = op === '*' ? v * r : (r === 0 ? 0 : v / r); }
      return v;
    };
    const parseFactor = () => {
      const t = next();
      if (t === '(') { const v = parseExpr(); next(); return v; }
      if (t === '-' || t === '+') return (t === '-' ? -1 : 1) * parseFactor();
      if (t !== undefined && !FORMULA_VARS.includes(t)) {
        const n = Number(t);
        if (!isNaN(n)) return n;
        const key = t.trim();
        const val = vars[key] !== undefined ? Number(vars[key]) : 0;
        return val;
      }
      return 0;
    };
    if (!toks.length) return null;
    const v = parseExpr();
    if (i !== toks.length) return null;
    return v;
  } catch (e) { return null; }
}
export function calcFormulas(rpg, c) {
  const out = [];
  if (!rpg || !Array.isArray(rpg.schema.formulas)) return out;
  const vars = {};
  for (const a of rpg.schema.attrs || []) {
    if (a.active !== false) vars[(a.name || '').trim().toUpperCase()] = Number(c.attrVals[a.id] ?? 0);
  }
  for (const f of rpg.schema.formulas) {
    if (!f || !f.expr) continue;
    const v = evalExpression(f.expr, vars);
    if (v !== null && isFinite(v)) out.push({ name: f.name, value: v });
  }
  return out;
}
