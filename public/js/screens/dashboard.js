import { getState, getMe } from '../state.js';
import { ICONS } from '../constants.js';
import { esc, fmt, relTime, findRpg, charsOf, canManage, slotsUsed, pct, initials } from '../utils.js';
import { tile, emptyBox, movementRow } from '../ui.js';

export function rpgCard(r) {
  const chars = charsOf(r.id);
  const itemCount = r.catalog.length;
  const totalQty = chars.reduce((s, c) => s + c.inventory.reduce((x, i) => x + (Number(i.qty) || 0), 0), 0);
  return `<div class="card rpg-card" data-act="open-rpg" data-id="${r.id}">
    <div class="cc-top">
      <div class="cc-icon">${ICONS.rpg}</div>
      <div class="cc-info">
        <div class="cc-name">${esc(r.name)}</div>
        <div class="cc-sub">${chars.length} ${chars.length === 1 ? 'ficha' : 'fichas'} · ${itemCount} ${itemCount === 1 ? 'item' : 'itens'} no catálogo · ${relTime(r.updatedAt)}</div>
      </div>
    </div>
  </div>`;
}

export function viewDashboard() {
  const state = getState();
  const me = getMe();
  const totalChars = state.characters.length;
  const totalItems = state.rpgs.reduce((s, r) => s + r.catalog.length, 0);
  const assignedUnits = state.characters.reduce((s, c) => s + c.inventory.reduce((x, i) => x + (Number(i.qty) || 0), 0), 0);
  const recent = [...state.movements].slice(-8).reverse();

  return `
  <div class="page-head">
    <div>
      <h1>Bem-vindo, ${esc((me.name || '').split(' ')[0])}</h1>
      <div class="sub">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
    <div class="page-actions">${canManage() ? `<button class="btn btn-primary" data-act="new-rpg-modal">${ICONS.plus} Nova mesa</button>` : ''}</div>
  </div>

  <div class="tiles">
    ${tile('Mesas', state.rpgs.length)}
    ${tile('Fichas', totalChars)}
    ${tile('Itens catalogados', totalItems)}
    ${tile('Unidades atribuídas', assignedUnits)}
  </div>

  <div class="card">
    <div class="card-head"><h2>Suas mesas</h2></div>
    <div class="card-body">
      ${state.rpgs.length ? `<div class="grid-cards">${state.rpgs.map(rpgCard).join('')}</div>` : emptyBox(canManage() ? 'Nenhuma mesa criada ainda. Comece criando sua primeira mesa de RPG.' : 'Nenhuma mesa disponível no momento.', 'rpg')}
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h2>Atividade recente</h2></div>
    <div class="card-body">
      ${recent.length ? recent.map(movementRow).join('') : emptyBox('Nenhuma movimentação registrada ainda.', 'history')}
    </div>
  </div>`;
}

export function viewMesa(rpgId) {
  const state = getState();
  const rpg = findRpg(rpgId);
  const chars = charsOf(rpgId);
  const used = chars.reduce((s, c) => s + slotsUsed(c), 0);
  const cap = chars.reduce((s, c) => s + (Number(c.capacity) || 0), 0);
  const fullCount = chars.filter((c) => c.capacity > 0 && slotsUsed(c) >= c.capacity).length;
  const assignedUnits = chars.reduce((s, c) => s + c.inventory.reduce((x, i) => x + (Number(i.qty) || 0), 0), 0);
  const recent = state.movements.filter((m) => m.rpgId === rpgId).slice(-7).reverse();

  return `
  <div class="page-head">
    <div><h1>${esc(rpg.name)}</h1><div class="sub">Visão geral da mesa · atualizada ${relTime(rpg.updatedAt)}</div></div>
    <div class="page-actions">
      <button class="btn btn-secondary" data-act="new-char-modal" data-id="${rpg.id}">${ICONS.plus} Nova ficha</button>
      <a class="btn btn-primary" href="#/rpg/${rpg.id}/fichas">Ver fichas</a>
    </div>
  </div>

  <div class="tiles">
    ${tile('Fichas', chars.length)}
    ${tile('Itens no catálogo', rpg.catalog.length)}
    ${tile('Unidades atribuídas', assignedUnits)}
    ${tile('Ocupação das mochilas', fmt(used), { suffix: `/ ${cap} slots`, tone: fullCount ? 'red' : 'green' })}
  </div>

  <div class="card">
    <div class="card-head"><h2>Ocupação das mochilas</h2><span class="badge ${fullCount ? 'badge-red' : 'badge-green'}">${fullCount} cheia${fullCount === 1 ? '' : 's'}</span></div>
    <div class="card-body">
      ${chars.length ? `
        ${[...chars].map((c) => ({ c, p: pct(slotsUsed(c), c.capacity) })).sort((a, b) => b.p - a.p).map(({ c, p }) => `
        <div class="usage-row" data-act="open-char" data-id="${c.id}" style="cursor:pointer">
          <span class="avatar-light">${initials(c.name)}${c.photo ? `<img src="${c.photo}" alt="">` : ''}</span>
          <span class="u-name">${esc(c.name)}</span>
          <div class="bar"><div class="${p >= 100 ? 'full' : p >= 80 ? 'warn' : ''}" style="width:${p}%"></div></div>
          <span class="u-nums">${fmt(slotsUsed(c))}/${c.capacity}</span>
        </div>`).join('')}
        <div class="usage-row usage-total">
          <span class="avatar-light">Σ</span>
          <span class="u-name">Total</span>
          <div class="bar"><div class="${pct(used, cap) >= 100 ? 'full' : ''}" style="width:${pct(used, cap)}%"></div></div>
          <span class="u-nums">${Math.round(pct(used, cap))}%</span>
        </div>` : emptyBox('Nenhuma ficha registrada nesta mesa. Crie a primeira ficha para começar a aventura.', 'sheets')}
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h2>${ICONS.history} Últimas movimentações</h2></div>
    <div class="card-body">
      ${recent.length ? recent.map(movementRow).join('') : emptyBox('Sem movimentações nesta mesa.', 'history')}
    </div>
  </div>`;
}
