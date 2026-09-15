import { getState } from '../state.js';
import { ICONS, CAT_LABELS, CAT_ORDER, MV_META } from '../constants.js';
import { esc, fmt, fmtDateTime, findRpg, canManage, assignedQty } from '../utils.js';
import { emptyBox, movementRow } from '../ui.js';

let estTab = 'catalogo';
let catFilter = 'all';
let catQuery = '';
let estPage = 1;

export function getEstTab() { return estTab; }
export function setEstTab(v) { estTab = v; }
export function getCatFilter() { return catFilter; }
export function setCatFilter(v) { catFilter = v; }
export function getCatQuery() { return catQuery; }
export function setCatQuery(v) { catQuery = v; }
export function getEstPage() { return estPage; }
export function setEstPage(v) { estPage = v; }

export function catalogRows(rpg) {
  const q = catQuery.trim().toLowerCase();
  let items = [...rpg.catalog].sort((a, b) => ((CAT_ORDER[a.category] ?? 99) - (CAT_ORDER[b.category] ?? 99)) || a.name.localeCompare(b.name));
  if (catFilter !== 'all') items = items.filter((i) => i.category === catFilter);
  if (q) items = items.filter((i) => ((i.name || '') + ' ' + (i.effect || '')).toLowerCase().includes(q));
  return items;
}

export function catDdMenuHtml(rpg) {
  const counts = {};
  rpg.catalog.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
  const opts = ['all', ...Object.keys(CAT_LABELS)];
  return opts.map((k) => `<button type="button" class="cat-dd-item ${catFilter === k ? 'active' : ''}" data-act="cat-pick" data-cf="${k}">
    <span class="cat-dd-name">${catFilter === k ? ICONS.check + '<span>Todas as categorias</span>' : '<span>' + esc(k === 'all' ? 'Todas as categorias' : CAT_LABELS[k]) + '</span>'}</span>
    <span class="cat-dd-count">${k === 'all' ? rpg.catalog.length : (counts[k] || 0)}</span>
  </button>`).join('');
}

export function viewEstoque(rpgId) {
  const state = getState();
  const rpg = findRpg(rpgId);
  const moves = state.movements.filter((m) => m.rpgId === rpgId).reverse();
return `
  <div class="page-head">
    <div><h1>Estoque</h1><div class="sub">${rpg.catalog.length} itens no catálogo desta mesa</div></div>
    <div class="page-actions">
      <button class="btn btn-primary" data-act="new-item-modal" data-id="${rpgId}">${ICONS.plus} Novo item</button>
    </div>
  </div>

  <div class="tabs">
    <button class="tab ${estTab === 'catalogo' ? 'active' : ''}" data-act="est-tab" data-tab="catalogo">Catálogo</button>
    <button class="tab ${estTab === 'movimentos' ? 'active' : ''}" data-act="est-tab" data-tab="movimentos">Log</button>
  </div>

  ${estTab === 'catalogo' ? viewCatalogTable(rpg) : `
  <div class="card">
    <div class="card-head"><div><h2>Log de movimentações</h2><div class="card-sub">Todas as entradas, saídas, baixas e limpezas desta mesa — com motivo quando registrado.</div></div></div>
    <div class="card-body">
    ${moves.length ? `<div class="table-wrap"><table class="tbl">
      <thead><tr><th>Data</th><th>Tipo</th><th>Item</th><th>Ficha</th><th class="cell-num">Qtd</th><th>Motivo</th><th>Responsável</th></tr></thead>
      <tbody>${moves.map((m) => {
        const meta = MV_META[m.type] || MV_META.baixa;
        return `<tr>
          <td class="cell-muted" style="white-space:nowrap">${fmtDateTime(m.at)}</td>
          <td><span class="badge ${meta.cls}">${meta.label}</span></td>
          <td class="cell-strong">${esc(m.itemName)}</td>
          <td>${esc(m.charName || '—')}</td>
          <td class="cell-num">${m.qty}</td>
          <td class="cell-muted" style="max-width:220px">${m.reason ? esc(m.reason) : '—'}</td>
          <td class="cell-muted">${esc(m.byName || '')}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>` : emptyBox('Nenhum registro de movimentação ainda.', 'history')}
    </div>
  </div>`}`;
}

export function viewCatalogTable(rpg) {
  return `
  <div style="display:flex;gap:12px;margin-bottom:14px;align-items:center;flex-wrap:wrap">
    <div class="search-wrap">${ICONS.search}<input type="search" class="input" id="search-cat" placeholder="Buscar item ou efeito…  ( / )" value="${esc(catQuery)}"></div>
    <div class="tb-spacer"></div>
    <div class="cat-dd">
      <button type="button" class="btn btn-secondary" data-act="cat-dd" style="white-space:nowrap">${ICONS.filter}<span id="cat-dd-label">${catFilter === 'all' ? 'Todas as categorias' : esc(CAT_LABELS[catFilter] || catFilter)}</span>${ICONS.chev}</button>
      <div class="cat-dd-menu" id="cat-dd-menu" hidden>${catDdMenuHtml(rpg)}</div>
    </div>
  </div>
  <div id="catalog-area">${catalogAreaHtml(rpg)}</div>`;
}

export function catalogAreaHtml(rpg) {
  const all = catalogRows(rpg);
  if (!all.length) {
    const msg = (catFilter !== 'all' || catQuery)
      ? `Nenhum item encontrado${catFilter !== 'all' ? ' em <b>' + esc(CAT_LABELS[catFilter] || catFilter) + '</b>' : ''}${catQuery ? ' para "<b>' + esc(catQuery) + '</b>"' : ''}. Ajuste a busca ou o filtro de categoria.`
      : canManage() ? 'Nenhum item cadastrado. Use "Novo item" para começar o estoque.' : 'Nenhum item cadastrado ainda.';
    return `<div class="card"><div class="card-body">${emptyBox(msg, 'search')}</div></div>`;
  }
  const perPage = 15;
  const pages = Math.max(1, Math.ceil(all.length / perPage));
  if (estPage > pages) estPage = pages;
  const items = all.slice((estPage - 1) * perPage, estPage * perPage);

  return `
  <div class="card">
    <div class="table-wrap">
      <table class="tbl">
        <thead><tr><th>Item</th><th>Categoria</th><th class="cell-num">Peso</th><th class="cell-num">Valor</th><th>Efeito</th><th class="cell-num">Estoque</th><th></th></tr></thead>
        <tbody>
          ${items.map((i) => {
            const assigned = assignedQty(rpg.id, i.id);
            const unlimited = i.qty === null || i.qty === undefined;
            const avail = unlimited ? Infinity : Math.max(0, i.qty - assigned);
            return `<tr>
              <td class="cell-strong">${esc(i.name)}${i.description ? `<div class="cell-muted" style="font-weight:400;max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(i.description)}">${esc(i.description)}</div>` : ''}</td>
              <td><span class="tag-cat">${CAT_LABELS[i.category]}</span></td>
              <td class="cell-num">${fmt(i.weight)}</td>
              <td class="cell-num"><span class="cash-val" title="Valor">${ICONS.cash}<b>${fmt(i.value)}</b></span></td>
              <td class="cell-muted" style="max-width:240px;font-size:12.5px">${esc(i.effect || '—')}</td>
              <td class="cell-num">${unlimited
                ? '<span class="badge badge-gray">∞ ilimitado</span>'
                : `<b>${avail}</b><span class="cell-muted">/${i.qty}</span>${avail <= 0 ? ' <span class="badge badge-red">esgotado</span>' : avail <= 2 ? ' <span class="badge badge-amber">baixo</span>' : ''}`}</td>
              <td><div class="row-actions">
                <button class="btn btn-secondary btn-sm" data-act="give-item-modal" data-id="${rpg.id}" data-sub="${i.id}" ${!unlimited && avail <= 0 ? 'disabled' : ''}>${ICONS.gift} Dar</button>
                <button class="icon-btn" title="Editar" data-act="edit-item-modal" data-id="${rpg.id}" data-sub="${i.id}">${ICONS.pencil}</button>
                <button class="icon-btn danger" title="Excluir" data-act="catalog-del" data-id="${rpg.id}" data-sub="${i.id}">${ICONS.trash}</button>
              </div></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${all.length > perPage ? `
    <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:11px 16px;border-top:1px solid var(--border)">
      <span class="cell-muted" style="font-size:12.5px">Página ${estPage} de ${pages} · ${all.length} itens</span>
      <button class="btn btn-secondary btn-sm" data-act="est-page" data-delta="-1" ${estPage <= 1 ? 'disabled' : ''}>Anterior</button>
      <button class="btn btn-secondary btn-sm" data-act="est-page" data-delta="1" ${estPage >= pages ? 'disabled' : ''}>Próxima</button>
    </div>` : ''}
  </div>`;
}
