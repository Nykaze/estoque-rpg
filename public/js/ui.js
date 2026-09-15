import { getState, getMe, getMode, getTheme, setMode, setTheme, $appEl, $shell, $authView, $sidebar, $topbar, $modalRoot, $toastRoot } from './state.js';
import { THEMES, ICONS, CAT_LABELS, ROLE_LABELS, ATTR_TYPE_LABELS, EQUIP_SLOTS, EQUIP_SLOT_CATS, EQUIP_SLOT_LABELS, MV_META, SECTIONS_META } from './constants.js';
import { esc, fmt, fmtDate, fmtDateTime, relTime, initials, pct, findRpg, findChar, charsOf, canManage, isAdmin, isOwner, canEditChar, canTouch, slotsUsed, assignedQty, getSections, calcFormulas, sectionsPayload, evalExpression } from './utils.js';

export function tile(label, value, opts = {}) {
  return `<div class="tile ${opts.tone ? 'tone-' + opts.tone : ''}">
    <div class="t-label">${esc(label)}</div>
    <div class="t-value">${value}${opts.suffix ? ` <small>${esc(opts.suffix)}</small>` : ''}</div>
    ${opts.foot ? `<div class="t-foot">${opts.foot}</div>` : ''}
  </div>`;
}

export function emptyBox(msg, icon) {
  return `<div class="empty">${ICONS[icon || 'box']}<div>${msg}</div></div>`;
}

export function movementRow(mv) {
  const meta = MV_META[mv.type] || MV_META.baixa;
  const target = mv.charName ? ` para <b>${esc(mv.charName)}</b>` : '';
  const reason = mv.reason ? `<span class="cell-muted" style="margin-left:6px">— ${esc(mv.reason)}</span>` : '';
  return `<div class="mv-item">
    <span class="mv-dot" style="background:${meta.color}"></span>
    <div class="mv-main">
      <div class="mv-title"><b>${esc(mv.itemName)}</b>${target} <span class="cell-muted">×${mv.qty}</span>${reason}</div>
      <div class="mv-sub">${fmtDateTime(mv.at)} · ${esc(mv.byName || 'sistema')}</div>
    </div>
    <span class="badge ${meta.cls}">${meta.label}</span>
  </div>`;
}

export function attrControl(c, attr) {
  const v = c.attrVals[attr.id];
  const editableOwner = canEditChar(c) && !canManage();
  switch (attr.type) {
    case 'level': {
      if (editableOwner) return `<div class="v" style="font-size:19px;font-weight:700;margin-top:2px">${Number(v ?? 0)}</div>`;
      const base = `<input type="number" class="a-input" data-field="attr-val" data-cid="${c.id}" data-aid="${attr.id}" value="${Number(v ?? 0)}" ${attr.max !== null ? `max="${attr.max}"` : ''} title="${esc(attr.desc || attr.name)}">`;
      if (attr.hasSub === false) return base;
      const subKey = attr.id + ':sub';
      const tip = `Subpontos de ${esc(attr.name)} — 10 sub = 1 pt de perícia`;
      const sub = canManage()
        ? `<span class="a-sub-chip" title="${tip}"><span class="a-sub-ic">${ICONS.pool}</span><input type="number" class="a-sub" data-field="attr-sub" data-cid="${c.id}" data-aid="${attr.id}" value="${Number(c.attrVals[subKey] ?? 0)}" min="0" max="9999" placeholder="0"><span class="a-sub-unit">sub</span></span>`
        : `<span class="a-sub-chip" title="${tip}"><span class="a-sub-ic">${ICONS.pool}</span><span class="a-sub-view">${Number(c.attrVals[subKey] ?? 0)}</span><span class="a-sub-unit">sub</span></span>`;
      return base + sub;
    }
    case 'number':
      if (!canEditChar(c)) return `<span class="sh-res-v">${Number(v ?? 0)}</span>`;
      return `<input type="number" class="a-input" data-field="attr-val" data-cid="${c.id}" data-aid="${attr.id}" value="${Number(v ?? 0)}" ${attr.min !== null ? `min="${attr.min}"` : ''} ${attr.max !== null ? `max="${attr.max}"` : ''} title="${esc(attr.desc || attr.name)}">`;
    case 'bool':
      if (!canManage()) return `<div class="v" style="font-size:19px;font-weight:700;margin-top:2px">${v ? 'Sim' : 'Não'}</div>`;
      return `<label class="switch" style="margin-top:6px"><input type="checkbox" data-field="attr-val" data-cid="${c.id}" data-aid="${attr.id}" ${v ? 'checked' : ''}><span class="track"></span></label>`;
    case 'select':
      if (!canManage()) return `<div class="v" style="font-size:17px;font-weight:600">${esc(v ?? '—')}</div>`;
      return `<select class="input" style="font-size:13px;padding:4px 24px 4px 8px;margin-top:4px;background-position:right 6px center" data-field="attr-val" data-cid="${c.id}" data-aid="${attr.id}">
        ${attr.options.map((o) => `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
      </select>`;
    case 'counter': {
      const n = Number(v ?? 0);
      if (!canManage()) return `<b style="font-size:15px">${n}</b>`;
      return `<span class="a-stepper">
        <button class="icon-btn" data-act="counter-dec" data-cid="${c.id}" data-aid="${attr.id}" title="Diminuir">−</button>
        <input type="number" min="0" step="1" class="a-input" data-field="attr-val" data-cid="${c.id}" data-aid="${attr.id}" value="${n}">
        <button class="icon-btn" data-act="counter-inc" data-cid="${c.id}" data-aid="${attr.id}" title="Aumentar">+</button>
      </span>`;
    }
    case 'moeda': {
      const n = Number(v ?? 0);
      if (!canManage()) return `<div class="v" style="font-size:19px;font-weight:700;margin-top:2px">${ICONS.cash} ${n.toLocaleString('pt-BR')}</div>`;
      return `<span class="a-moeda"><span class="a-coini">${ICONS.cash}</span><input type="number" min="0" step="1" class="a-input" data-field="attr-val" data-cid="${c.id}" data-aid="${attr.id}" value="${n}"></span>`;
    }
    case 'longtext':
      return canManage()
        ? `<textarea class="a-long" rows="3" data-field="attr-val" data-cid="${c.id}" data-aid="${attr.id}">${esc(v ?? '')}</textarea>`
        : `<div class="a-longview">${esc(v ?? '') || '—'}</div>`;
    case 'vinculo': {
      const chars = c.rpgId ? (getState().characters || []).filter((x) => x.rpgId === c.rpgId && x.id !== c.id) : [];
      const t = (getState().characters || []).find((x) => x.id === v);
      if (!canManage()) return t ? t.name : '—';
      return `<select class="a-vinculo" data-field="attr-val" data-cid="${c.id}" data-aid="${attr.id}">
        <option value="">— nenhum —</option>
        ${chars.map((x) => `<option value="${x.id}" ${v === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select>`;
    }
    default:
      if (!canManage()) return `<div class="v" style="font-size:14px;font-weight:600">${esc(v ?? '—')}</div>`;
      return `<input type="text" class="a-input" style="font-size:14px;font-weight:600" data-field="attr-val" data-cid="${c.id}" data-aid="${attr.id}" value="${esc(v ?? '')}">`;
  }
}

export function skillControl(c, sk) {
  const v = Number(c.skillVals[sk.id] ?? 0);
  if (sk.max != null && sk.max <= 10) {
    return `<span class="pips" title="Clique para definir o nível">
      ${Array.from({ length: sk.max }, (_, i) => `<span class="pip ${i < v ? 'on' : ''}" data-field="skill-pip" data-cid="${c.id}" data-sid="${sk.id}" data-lvl="${i + 1}" role="button"></span>`).join('')}
    </span>
    <input type="number" class="s-val" min="0" max="${sk.max}" value="${v}" data-field="skill-val" data-cid="${c.id}" data-sid="${sk.id}">`;
  }
  return `<input type="number" class="s-val" min="0" ${sk.max != null ? `max="${sk.max}"` : ''} value="${v}" data-field="skill-val" data-cid="${c.id}" data-sid="${sk.id}">`;
}

let toastTimer = null;
export function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || 'ok');
  el.innerHTML = (kind === 'err' ? ICONS.alert : ICONS.check) + `<span>${esc(msg)}</span>`;
  $toastRoot.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 2600);
}

export function openModal(html) {
  $modalRoot.hidden = false;
  $modalRoot.innerHTML = `<div class="modal-overlay" data-overlay="1"><div class="modal">${html}</div></div>`;
}
export function closeModal() {
  $modalRoot.hidden = true;
  $modalRoot.innerHTML = '';
}

export function confirmDialog(title, message, confirmLabel) {
  return new Promise((resolve) => {
    openModal(`
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close-modal="1">${ICONS.x}</button></div>
      <div class="modal-body" style="color:var(--muted)">${message}</div>
      <div class="modal-foot">
        <button class="btn btn-secondary" data-confirm="0">Cancelar</button>
        <button class="btn btn-danger" data-confirm="1">${esc(confirmLabel || 'Confirmar')}</button>
      </div>`);
    $modalRoot.querySelectorAll('[data-confirm]').forEach((b) => b.addEventListener('click', () => { closeModal(); resolve(b.dataset.confirm === '1'); }));
  });
}

export function modalHead(title) {
  return `<div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close-modal="1">${ICONS.x}</button></div>`;
}

export function themeControlHtml() {
  const mode = getMode();
  const theme = getTheme();
  const cur = THEMES.find((t) => t.id === theme) || THEMES[0];
  return `
    <div class="theme-wrap">
      <button class="theme-btn" data-act="theme-dd" aria-haspopup="true" title="Aparência">
        <span class="tb-swatch"></span>
        <span class="theme-btn-label">${mode === 'dark' ? 'Escuro' : 'Claro'} · ${esc(cur.label)}</span>
      </button>
      <div class="theme-dd" id="theme-dd" hidden>
        <div class="theme-dd-section">Modo do site</div>
        <div class="theme-dd-row">
          <button class="theme-mode-btn ${mode === 'light' ? 'active' : ''}" data-act="theme-mode" data-mode="light">${ICONS.sun} Claro</button>
          <button class="theme-mode-btn ${mode === 'dark' ? 'active' : ''}" data-act="theme-mode" data-mode="dark">${ICONS.moon} Escuro</button>
        </div>
        <div class="theme-dd-section">Tema</div>
        <div class="theme-grid">
          ${THEMES.map((t) => `
            <button class="theme-opt ${theme === t.id ? 'picked' : ''}" data-act="theme-pick" data-theme="${t.id}" title="${esc(t.label)}">
              <span>${esc(t.label)}</span>
              <span class="to-swatch" style="--accent:${t.accent};--accent2:${t.accent2}"></span>
            </button>`).join('')}
        </div>
      </div>
    </div>`;
}

const NAV_ICONS = { dashboard: 'dash', mesa: 'rpg', fichas: 'sheets', estoque: 'box', config: 'sliders', usuarios: 'users', ajustes: 'gear' };

function navItem(view, label, hash, active, iconKey) {
  return `<a class="nav-item ${active ? 'active' : ''}" href="${hash}" data-nav="${view}">${ICONS[iconKey || NAV_ICONS[view]] || ''}<span>${esc(label)}</span></a>`;
}

export function renderSidebar(rt) {
  const inMesa = ['mesa', 'fichas', 'ficha', 'estoque', 'config'].includes(rt.view);
  const rpg = inMesa ? findRpg(rt.rpgId) : null;
  let html = `
  <div class="brand">
    <div class="brand-mark">E</div>
    <div>
      <div class="brand-name">${esc(getState().settings.systemName)}</div>
      <div class="brand-sub">gestão de mesas</div>
    </div>
  </div>
  <nav class="nav-section">
    <div class="nav-label">Geral</div>
    ${navItem('dashboard', 'Dashboard', '#/', rt.view === 'dashboard')}
  </nav>`;

  if (rpg) {
    html += `
    <nav class="nav-section">
      <div class="nav-label">${esc(rpg.name).slice(0, 22)}</div>
      ${navItem('mesa', 'Visão geral', `#/rpg/${rpg.id}`, rt.view === 'mesa')}
      ${navItem('fichas', 'Fichas', `#/rpg/${rpg.id}/fichas`, ['fichas', 'ficha'].includes(rt.view))}
      ${canManage() ? navItem('estoque', 'Estoque', `#/rpg/${rpg.id}/estoque`, rt.view === 'estoque') : ''}
      ${canManage() ? navItem('config', 'Configurar ficha', `#/rpg/${rpg.id}/config`, rt.view === 'config') : ''}
    </nav>`;
  } else {
    html += `
    <nav class="nav-section">
      <div class="nav-label">Mesas</div>
      <div class="nav-empty">Abra uma mesa pelo dashboard para ver seus módulos.</div>
    </nav>`;
  }

  html += `<nav class="nav-section">
    <div class="nav-label">Sistema</div>
    ${isAdmin() ? navItem('usuarios', 'Usuários', '#/usuarios', rt.view === 'usuarios') : ''}
    ${navItem('ajustes', 'Ajustes', '#/ajustes', rt.view === 'ajustes')}
  </nav>`;

  const me = getMe();
  html += `
  <div class="sidebar-foot">
    <button class="user-chip" data-act="toggle-user-menu" title="Sair da conta">
      <span class="avatar">${initials(me.name)}</span>
      <span class="u-info">
        <span class="u-name">${esc(me.name)}</span>
        <span class="u-role">${ROLE_LABELS[me.role] || me.role}</span>
      </span>
      <span style="color:#7c8899">${ICONS.logout}</span>
    </button>
  </div>`;

  $sidebar.innerHTML = html;
}

export function renderTopbar(rt) {
  const titles = {
    dashboard: ['Dashboard', 'Visão geral do sistema'],
    mesa: ['Mesa', 'Resumo da mesa'],
    fichas: ['Fichas', 'Personagens da mesa'],
    ficha: ['Ficha', 'Detalhes do personagem'],
    estoque: ['Estoque', 'Catálogo e movimentações'],
    config: ['Configuração da ficha', 'Atributos, perícias e funções'],
    usuarios: ['Usuários', 'Contas e permissões'],
    ajustes: ['Ajustes', 'Preferências do sistema']
  };
  let [title, sub] = titles[rt.view] || ['—', ''];
  if (rt.view === 'mesa' || rt.view === 'fichas' || rt.view === 'ficha' || rt.view === 'estoque' || rt.view === 'config') {
    const rpg = findRpg(rt.rpgId);
    if (rpg) title = rpg.name + ' · ' + title;
  }
  if (rt.view === 'ficha') {
    const c = findChar(rt.charId);
    if (c) title = c.name;
  }
  $topbar.innerHTML = `
    <button class="icon-btn menu-btn" id="menu-btn" aria-label="Menu">${ICONS.menu}</button>
    <div>
      <div class="tb-title">${esc(title)}</div>
      <div class="tb-crumb">${esc(sub)}</div>
    </div>
    <div class="tb-spacer"></div>
    ${themeControlHtml()}
    <div class="conn-pill" id="conn-pill"><span class="conn-dot"></span><span id="conn-label">Conectado</span></div>`;
}

export function updateNiInfo(item) {
  const info = document.getElementById('ni-info');
  if (!info) return;
  if (!item) { info.textContent = 'Digite para buscar um item — nome, efeito ou categoria.'; return; }
  const parts = [];
  if (Number(item.value) > 0) parts.push(`<span class="cash-val">${ICONS.cash}<b>${fmt(item.value)}</b></span>`);
  parts.push(`${fmt(item.weight || 0)} slot${fmt(item.weight) === '1' ? '' : 's'}/un`);
  const unlimited = item.qty === null || item.qty === undefined;
  if (!unlimited) {
    const cidEl = document.getElementById('ni-catalog');
    const ch = cidEl && findChar(cidEl.dataset.cid);
    const rpg2 = ch && findRpg(ch.rpgId);
    if (rpg2) parts.push(`estoque: ${Math.max(0, item.qty - assignedQty(rpg2.id, item.id))}`);
  }
  if (item.effect) parts.push(esc(item.effect));
  info.innerHTML = parts.join('<span class="cell-muted"> · </span>');
}

export function acMenuHtml(rpg, query) {
  const s = String(query || '').trim().toLowerCase();
  let rows = [...rpg.catalog].sort((a, b) => a.name.localeCompare(b.name));
  if (s) rows = rows.filter((i) => ((i.name || '') + ' ' + (i.effect || '') + ' ' + (CAT_LABELS[i.category] || i.category)).toLowerCase().includes(s));
  rows = rows.slice(0, 10);
  if (!rows.length) return `<div class="ac-empty">Nenhum item encontrado para "${esc(s)}".</div>`;
  return rows.map((i) => {
    const assigned = assignedQty(rpg.id, i.id);
    const unlimited = i.qty === null || i.qty === undefined;
    const avail = unlimited ? Infinity : Math.max(0, i.qty - assigned);
    const out = !unlimited && avail <= 0;
    return `<button type="button" class="ac-item ${out ? 'out' : ''}" data-ac-pick="${esc(i.id)}" ${out ? 'disabled' : ''} title="${esc(i.effect || i.name)}">
      <span class="ac-name">${esc(i.name)}</span>
      <span class="ac-meta">
        <span class="tag-cat">${esc(CAT_LABELS[i.category] || i.category)}</span>
        <span class="cash-val">${ICONS.cash}<b>${fmt(i.value)}</b></span>
        <span class="cell-muted">${unlimited ? '∞' : 'disp.: ' + avail}</span>
      </span>
    </button>`;
  }).join('');
}

export function openAcMenu() {
  const inp = document.getElementById('ni-catalog');
  const menu = document.getElementById('ni-ac-menu');
  if (!inp || !menu) return;
  const c = findChar(inp.dataset.cid);
  const rpg = c && findRpg(c.rpgId);
  if (!rpg) return;
  _niAcIndex = -1;
  menu.innerHTML = acMenuHtml(rpg, inp.value);
  menu.hidden = false;
}

let _niAcIndex = -1;
export function getNiAcIndex() { return _niAcIndex; }
export function setNiAcIndex(v) { _niAcIndex = v; }

export function pickCatalogItem(itemId) {
  const inp = document.getElementById('ni-catalog');
  const wrap = document.getElementById('ni-ac-wrap');
  const menu = document.getElementById('ni-ac-menu');
  if (!inp || !wrap) return;
  const c = findChar(inp.dataset.cid);
  const rpg = c && findRpg(c.rpgId);
  const item = rpg && rpg.catalog.find((x) => x.id === itemId);
  if (!item) return;
  wrap.dataset.itemId = item.id;
  inp.value = item.name;
  updateNiInfo(item);
  if (menu) menu.hidden = true;
}

export function openRpgModal() {
  openModal(`${modalHead('Nova mesa')}
    <div class="modal-body">
      <div class="field"><label>Nome do RPG <span class="req">*</span></label><input type="text" class="input" id="nr-name" maxlength="60" placeholder="Ex: Desajustados"></div>
      <p class="hint" style="font-size:12px;color:var(--faint)">A mesa nasce com atributos, perícias e funções de exemplo — personalize em "Configurar ficha".</p>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-close-modal="1">Cancelar</button><button class="btn btn-primary" data-submit="create-rpg">Criar mesa</button></div>`);
  setTimeout(() => document.getElementById('nr-name').focus(), 30);
}

export function openCharModal(rpgId) {
  const rpg = findRpg(rpgId);
  if (!rpg) return;
  openModal(`${modalHead('Nova ficha')}
    <div class="modal-body">
      <div class="field"><label>Personagem <span class="req">*</span></label><input type="text" class="input" id="nc-name" maxlength="60"></div>
      <div class="form-row">
        <div class="field"><label>Jogador</label><input type="text" class="input" id="nc-player" maxlength="60"></div>
        <div class="field"><label>Identificação</label><input type="text" class="input" id="nc-ident" maxlength="30"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Função</label><select class="input" id="nc-class"><option value="">—</option>${rpg.schema.classes.map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Capacidade (slots)</label><input type="number" class="input" id="nc-cap" min="1" value="10"></div>
      </div>
      <p class="hint" style="font-size:12px;color:var(--faint)">A ficha já vem preenchida com os atributos e perícias configurados para a mesa.</p>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-close-modal="1">Cancelar</button><button class="btn btn-primary" data-submit="create-char" data-id="${rpgId}">Criar ficha</button></div>`);
  setTimeout(() => document.getElementById('nc-name').focus(), 30);
}

export function itemFormHtml(i) {
  i = i || { name: '', category: 'consumivel', description: '', weight: 1, value: 0, effect: '', qty: '' };
  return `
    <div class="field"><label>Nome <span class="req">*</span></label><input type="text" class="input" id="ci-name" maxlength="60" value="${esc(i.name)}"></div>
    <div class="form-row">
      <div class="field"><label>Categoria</label><select class="input" id="ci-cat">${Object.keys(CAT_LABELS).map((k) => `<option value="${k}" ${i.category === k ? 'selected' : ''}>${CAT_LABELS[k]}</option>`).join('')}</select></div>
      <div class="field"><label>Peso por unidade (slots)</label><input type="number" class="input" id="ci-weight" min="0" step="any" value="${i.weight}"></div>
      <div class="field"><label>Valor</label><input type="number" class="input" id="ci-value" min="0" step="any" value="${i.value}"></div>
    </div>
    <div class="field"><label>Estoque total <span style="font-weight:400;color:var(--faint)">(vazio = ilimitado)</span></label><input type="number" class="input" id="ci-qty" min="0" step="any" placeholder="∞" value="${i.qty ?? ''}"></div>
    <div class="field"><label>Descrição</label><textarea class="input" id="ci-desc" rows="2" maxlength="500">${esc(i.description)}</textarea></div>
    <div class="field" style="margin-bottom:0"><label>Efeito</label><textarea class="input" id="ci-effect" rows="2" maxlength="300">${esc(i.effect)}</textarea></div>`;
}

export function readItemForm() {
  return {
    name: document.getElementById('ci-name').value.trim(),
    category: document.getElementById('ci-cat').value,
    weight: Number(document.getElementById('ci-weight').value) || 0,
    value: Number(document.getElementById('ci-value').value) || 0,
    effect: document.getElementById('ci-effect').value.trim(),
    description: document.getElementById('ci-desc').value.trim(),
    qtyRaw: document.getElementById('ci-qty').value.trim()
  };
}

export function openItemModal(rpgId, itemId) {
  const rpg = findRpg(rpgId);
  const item = itemId ? rpg.catalog.find((x) => x.id === itemId) : null;
  openModal(`<div class="modal wide">${modalHead(item ? 'Editar item' : 'Novo item')}
    <div class="modal-body">${itemFormHtml(item)}</div>
    <div class="modal-foot">
      <button class="btn btn-secondary" data-close-modal="1">Cancelar</button>
      <button class="btn btn-primary" data-submit="${item ? 'save-item' : 'add-item'}" data-id="${rpgId}" data-sub="${itemId || ''}">${item ? 'Salvar' : 'Cadastrar item'}</button>
    </div></div>`);
  setTimeout(() => document.getElementById('ci-name').focus(), 30);
}

export function openGiveModal(rpgId, itemId) {
  const chars = charsOf(rpgId);
  if (!chars.length) { toast('Nenhuma ficha nesta mesa ainda — crie uma antes.', 'err'); return; }
  openModal(`${modalHead('Dar item à ficha')}
    <div class="modal-body">
      <div class="field"><label>Ficha <span class="req">*</span></label>
        <select class="input" id="gv-char">${chars.map((c) => `<option value="${c.id}">${esc(c.name)}${c.player ? ' · ' + esc(c.player) : ''}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Quantidade</label><input type="number" class="input" id="gv-qty" min="1" step="any" value="1"></div>
    </div>
<div class="modal-foot"><button class="btn btn-secondary" data-close-modal="1">Cancelar</button><button class="btn btn-primary" data-submit="give-item-confirm" data-id="${rpgId}" data-sub="${itemId}">Entregar</button></div>`);
}

export function openClearHistoryModal(charId) {
  const c = findChar(charId);
  if (!c || !canManage()) return;
  const state = getState();
  const n = state.movements.filter((m) => m.charId === c.id).length;
  openModal(`${modalHead('Limpar histórico de itens')}
    <div class="modal-body">
      <p class="hint" style="font-size:12.5px;color:var(--muted)">Remove os <b>${n}</b> registro(s) do histórico de itens de <b>${esc(c.name)}</b>. A limpeza fica registrada no log de movimentações com o motivo informado.</p>
      <div class="field"><label>Motivo <span class="req">*</span></label>
        <select class="input" id="cs-reason">
          <option value="">Selecione…</option>
          <option value="Reinício de campanha">Reinício de campanha</option>
          <option value="Início de nova temporada">Início de nova temporada</option>
          <option value="Ajuste de registro">Ajuste de registro</option>
          <option value="Outro (especificar)">Outro (especificar)</option>
        </select>
      </div>
      <div class="field"><label>Detalhe do motivo</label><input type="text" class="input" id="cs-reason-detail" maxlength="160" placeholder="Ex: registros duplicados por engano"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-close-modal="1">Cancelar</button><button class="btn btn-danger" data-submit="clear-hist-confirm" data-id="${charId}">${ICONS.trash} Limpar histórico</button></div>`);
  setTimeout(() => { const el = document.getElementById('cs-reason'); if (el) el.focus(); }, 30);
}

export function openAttrModal(rpgId, attrId) {
  const rpg = findRpg(rpgId);
  const a = attrId ? rpg.schema.attrs.find((x) => x.id === attrId) : null;
  a && (a.type = ATTR_TYPE_LABELS[a.type] ? a.type : 'text');
  openModal(`<div class="modal wide">${modalHead(a ? 'Editar atributo' : 'Novo atributo')}
    <div class="modal-body">
      <div class="form-row">
        <div class="field"><label>Nome <span class="req">*</span></label><input type="text" class="input" id="at-name" maxlength="40" value="${esc(a ? a.name : '')}" placeholder="Ex: FORÇA"></div>
        <div class="field"><label>Tipo</label>
          <select class="input" id="at-type">
            ${Object.keys(ATTR_TYPE_LABELS).map((t) => `<option value="${t}" ${a && a.type === t ? 'selected' : ''}>${ATTR_TYPE_LABELS[t]}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field"><label>Descrição</label><input type="text" class="input" id="at-desc" maxlength="200" value="${esc(a ? a.desc : '')}"></div>
      <div class="form-row" id="at-range-row" ${a && !['number', 'level', 'counter', 'moeda'].includes(a.type) ? 'hidden' : ''}>
        <div class="field"><label>Mínimo</label><input type="number" class="input" id="at-min" value="${a && a.min !== null ? a.min : 0}"></div>
        <div class="field"><label>Máximo <span style="font-weight:400;color:var(--faint)">(${ATTR_TYPE_LABELS.level} aplica)</span></label><input type="number" class="input" id="at-max" value="${a && a.max !== null ? a.max : 10}"></div>
      </div>
      <div class="field" id="at-options-row" ${!a || a.type !== 'select' ? 'hidden' : ''}>
        <label>Opções (uma por linha)</label>
        <textarea class="input" id="at-options" rows="3">${esc(a ? a.options.join('\n') : '')}</textarea>
      </div>
      <label class="check-line"><input type="checkbox" id="at-required" ${a && a.required ? 'checked' : ''}> Campo obrigatório na criação da ficha</label>
      &nbsp;&nbsp;
      <label class="check-line"><input type="checkbox" id="at-active" ${!a || a.active ? 'checked' : ''}> Atributo ativo (visível nas fichas)</label>
      &nbsp;&nbsp;
      <label class="check-line" id="at-sub-row" ${a && a.type !== 'level' ? 'hidden' : ''} title="Só se aplica a atributos do tipo Nível"><input type="checkbox" id="at-sub" ${!a || a.hasSub !== false ? 'checked' : ''}> Tem sub-atributo (subpontos → pool de perícia)</label>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-close-modal="1">Cancelar</button><button class="btn btn-primary" data-submit="save-attr" data-id="${rpgId}" data-sub="${attrId || ''}">Salvar atributo</button></div></div>`);

  const typeSel = document.getElementById('at-type');
  typeSel.addEventListener('change', () => {
    document.getElementById('at-range-row').hidden = !['number', 'level', 'counter', 'moeda'].includes(typeSel.value);
    document.getElementById('at-options-row').hidden = typeSel.value !== 'select';
    document.getElementById('at-sub-row').hidden = typeSel.value !== 'level';
  });
  setTimeout(() => document.getElementById('at-name').focus(), 30);
}

export function openFormulaModal(rpgId, formulaId) {
  const rpg = findRpg(rpgId);
  const formulas = rpg.schema.formulas || [];
  const f = formulaId ? formulas.find((x) => x.id === formulaId) : null;
  const attrNames = (rpg.schema.attrs || []).filter((a) => a.active !== false).map((a) => a.name.toUpperCase());
  openModal(`<div class="modal">${modalHead(f ? 'Editar cálculo' : 'Novo cálculo')}
    <div class="modal-body">
      <div class="field"><label>Nome <span class="req">*</span></label><input type="text" class="input" id="fm-name" maxlength="40" value="${esc(f ? f.name : '')}" placeholder="Ex: Vida"></div>
      <div class="field"><label>Fórmula <span class="req">*</span></label><input type="text" class="input" id="fm-expr" maxlength="120" value="${esc(f ? f.expr : '')}" placeholder="Ex: (VIGOR * 4) + 5" style="font-family:monospace"></div>
      <div class="field"><label>Atributos disponíveis</label><div class="cell-muted" style="font-size:12px">${attrNames.length ? esc(attrNames.join(', ')) : '—'}</div></div>
      <div class="field" id="fm-live"><label>Pré-visualização</label><b id="fm-live-val" style="color:var(--accent,var(--blue))">—</b></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-close-modal="1">Cancelar</button><button class="btn btn-primary" data-submit="save-formula" data-id="${rpgId}" data-sub="${formulaId || ''}">Salvar cálculo</button></div></div>`);
  const updateLive = () => {
    const vm = {};
    for (const n of attrNames.slice(0, 6)) vm[n] = 3;
    const v = evalExpression(document.getElementById('fm-expr').value, vm);
    document.getElementById('fm-live-val').textContent = v === null ? 'Expressão inválida' : String(Math.round(v * 100) / 100);
  };
  document.getElementById('fm-expr').addEventListener('input', updateLive);
  setTimeout(() => document.getElementById('fm-name').focus(), 30);
}

export function openSkillModal(rpgId, skillId) {
  const rpg = findRpg(rpgId);
  const s = skillId ? rpg.schema.skills.find((x) => x.id === skillId) : null;
  openModal(`${modalHead(s ? 'Editar perícia' : 'Nova perícia')}
    <div class="modal-body">
      <div class="form-row">
        <div class="field"><label>Nome <span class="req">*</span></label><input type="text" class="input" id="sk-name" maxlength="40" value="${esc(s ? s.name : '')}"></div>
        <div class="field"><label>Categoria</label><input type="text" class="input" id="sk-cat" maxlength="30" value="${esc(s ? s.cat : 'Geral')}" placeholder="Ex: Combate"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Nível máximo</label><input type="number" class="input" id="sk-max" min="1" value="${s && s.max != null ? s.max : 5}"></div>
        <div class="field"><label>Descrição</label><input type="text" class="input" id="sk-desc" maxlength="200" value="${esc(s ? s.desc : '')}"></div>
      </div>
      <label class="check-line"><input type="checkbox" id="sk-active" ${!s || s.active ? 'checked' : ''}> Perícia ativa (visível nas fichas)</label>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-close-modal="1">Cancelar</button><button class="btn btn-primary" data-submit="save-skill" data-id="${rpgId}" data-sub="${skillId || ''}">Salvar perícia</button></div></div>`);
  setTimeout(() => document.getElementById('sk-name').focus(), 30);
}

export function openClassModal(rpgId, classId) {
  const rpg = findRpg(rpgId);
  const cl = classId ? rpg.schema.classes.find((x) => x.id === classId) : null;
  openModal(`${modalHead(cl ? 'Editar função' : 'Nova função')}
    <div class="modal-body">
      <div class="field"><label>Nome <span class="req">*</span></label><input type="text" class="input" id="cl-name" maxlength="40" value="${esc(cl ? cl.name : '')}"></div>
      <div class="field" style="margin-bottom:0"><label>Descrição</label><textarea class="input" id="cl-desc" rows="2" maxlength="300">${esc(cl ? cl.desc : '')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-close-modal="1">Cancelar</button><button class="btn btn-primary" data-submit="save-class" data-id="${rpgId}" data-sub="${classId || ''}">Salvar função</button></div></div>`);
  setTimeout(() => document.getElementById('cl-name').focus(), 30);
}

export function openCustomSecModal(rpgId, sectionId) {
  const rpg = findRpg(rpgId);
  const sec = sectionId ? getSections(rpg.schema.sections).find((x) => x.id === sectionId) : null;
  const name = sec ? sec.label : '';
  const col = sec ? sec.col : 'right';
  const def = sec && sec.definition ? sec.definition : [];
  const row = (f, idx) => `
    <div class="cs-row" data-idx="${idx}">
      <input type="text" class="input cs-fname" placeholder="Nome do campo" value="${esc(f ? f.name : '')}" maxlength="40">
      <label class="check-line cs-fed-wrap" title="Jogador pode preencher este campo"><input type="checkbox" class="cs-fed" ${!f || f.editable ? 'checked' : ''}> Jogador</label>
      <button class="icon-btn danger" data-act="cs-del-field" title="Remover campo">${ICONS.x}</button>
    </div>`;
  openModal(`${modalHead(sec ? `Editar bloco: ${esc(name)}` : 'Novo bloco personalizado')}
    <div class="modal-body">
      <div class="form-row" style="align-items:flex-end">
        <div class="field" style="flex:1"><label>Nome do bloco <span class="req">*</span></label><input type="text" class="input" id="cs-name" maxlength="40" value="${esc(name)}" placeholder="Ex: Antecedentes"></div>
        <div class="field" style="flex:none;width:130px"><label>Coluna</label>
          <select class="input" id="cs-col">
            <option value="left" ${col === 'left' ? 'selected' : ''}>Esquerda</option>
            <option value="right" ${col === 'right' ? 'selected' : ''}>Direita</option>
          </select>
        </div>
      </div>
      <div class="cs-label">Campos do bloco</div>
      <div id="cs-fields">${def.length ? def.map((f, i) => row(f, i)).join('') : row(null, 0)}</div>
      <button class="btn btn-ghost btn-sm" data-act="cs-add-field" style="margin-top:8px">${ICONS.plus} Adicionar campo</button>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-close-modal="1">Cancelar</button><button class="btn btn-primary" data-submit="save-custom-sec" data-id="${rpgId}" data-sub="${sectionId || ''}">${sec ? 'Salvar bloco' : 'Criar bloco'}</button></div></div>`);
  setTimeout(() => document.getElementById('cs-name').focus(), 30);
}

export function openUserModal(userId) {
  const state = getState();
  const me = getMe();
  const u = userId ? (state.users || []).find((x) => x.id === userId) : null;
  openModal(`${modalHead(u ? 'Editar usuário' : 'Novo usuário')}
    <div class="modal-body">
      <div class="field"><label>Usuário (login) <span class="req">*</span></label><input type="text" class="input" id="us-username" maxlength="24" value="${esc(u ? u.username : '')}" ${u ? 'disabled' : ''}></div>
      <div class="field"><label>Nome completo</label><input type="text" class="input" id="us-name" maxlength="40" value="${esc(u ? u.name : '')}"></div>
      <div class="field"><label>Perfil de acesso</label>
        <select class="input" id="us-role">
          <option value="jogador" ${u && u.role === 'jogador' ? 'selected' : ''}>Jogador — apenas consulta</option>
          <option value="gestor" ${u && u.role === 'gestor' ? 'selected' : ''}>Gestor — gerencia mesas, fichas e estoque</option>
          <option value="admin" ${u && u.role === 'admin' ? 'selected' : ''}>Administrador — acesso total</option>
        </select>
      </div>
      <div class="field" ${u ? '' : 'hidden'} id="us-active-row">
        <label class="check-line"><input type="checkbox" id="us-active" ${!u || u.active ? 'checked' : ''}> Conta ativa</label>
      </div>
      <div class="field" style="margin-bottom:0"><label>${u ? 'Nova senha (deixe vazio p/ manter)' : 'Senha'} ${u ? '' : '<span class="req">*</span>'}</label><input type="password" class="input" id="us-pass" autocomplete="new-password"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-secondary" data-close-modal="1">Cancelar</button><button class="btn btn-primary" data-submit="save-user" data-sub="${userId || ''}">${u ? 'Salvar' : 'Criar conta'}</button></div></div>`);
  setTimeout(() => { const el = document.getElementById('us-' + (u ? 'name' : 'username')); el && el.focus(); }, 30);
}
