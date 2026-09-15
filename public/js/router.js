import { getState, getMe, $appEl, $shell, $authView, showApp } from './state.js';
import { findRpg, findChar, isAdmin, canManage } from './utils.js';
import { renderSidebar, renderTopbar, closeModal } from './ui.js';
import { viewDashboard, viewMesa } from './screens/dashboard.js';
import { viewFichas, viewFicha, setFichaQuery } from './screens/fichas.js';
import { viewEstoque, setCatFilter, setCatQuery, setEstPage, setEstTab } from './screens/estoque.js';
import { viewConfig, setCfgTab } from './screens/config.js';
import { viewUsuarios } from './screens/usuarios.js';
import { viewAjustes } from './screens/ajustes.js';

let lastCtxRpg = null;

export function route() {
  const state = getState();
  const h = location.hash || '#/';
  let m = h.match(/^#\/rpg\/([^/]+)\/ficha\/([^/]+)$/);
  if (m && findRpg(m[1]) && findChar(m[2])) return { view: 'ficha', rpgId: m[1], charId: m[2] };
  m = h.match(/^#\/rpg\/([^/]+)\/(fichas|estoque|config)$/);
  if (m && findRpg(m[1])) return { view: m[2], rpgId: m[1] };
  m = h.match(/^#\/rpg\/([^/]+)$/);
  if (m && findRpg(m[1])) return { view: 'mesa', rpgId: m[1] };
  if (h === '#/usuarios' && isAdmin()) return { view: 'usuarios' };
  if (h === '#/ajustes') return { view: 'ajustes' };
  if (h === '#/' && !canManage()) {
    const own = state && state.characters && state.characters[0];
    if (own && findRpg(own.rpgId)) {
      return { view: 'ficha', rpgId: own.rpgId, charId: own.id, redirect: true };
    }
    return { view: 'dashboard' };
  }
  return { view: 'dashboard' };
}

export function render() {
  const state = getState();
  const me = getMe();
  closeModal();
  if (!me || !state) return;
  $authView.hidden = true;
  $shell.hidden = false;

  const rt = route();
  if (rt.redirect) {
    location.replace('#/rpg/' + rt.rpgId + '/ficha/' + rt.charId);
    return;
  }
  if (rt.rpgId && rt.rpgId !== lastCtxRpg) {
    lastCtxRpg = rt.rpgId;
    setCatFilter('all');
    setCatQuery('');
    setEstPage(1);
    setFichaQuery('');
  }
  renderSidebar(rt);
  renderTopbar(rt);

  switch (rt.view) {
    case 'dashboard': $appEl.innerHTML = viewDashboard(); break;
    case 'mesa': $appEl.innerHTML = viewMesa(rt.rpgId); break;
    case 'fichas': $appEl.innerHTML = viewFichas(rt.rpgId); break;
    case 'ficha': $appEl.innerHTML = viewFicha(rt.charId); break;
    case 'estoque': $appEl.innerHTML = viewEstoque(rt.rpgId); break;
    case 'config': $appEl.innerHTML = viewConfig(rt.rpgId); break;
    case 'usuarios': $appEl.innerHTML = viewUsuarios(); break;
    case 'ajustes': $appEl.innerHTML = viewAjustes(); break;
  }

  bindView(rt);
}

function bindView(rt) {
  const sf = document.getElementById('search-fichas');
  if (sf) sf.addEventListener('input', () => {
    setFichaQuery(sf.value);
    const q = sf.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll('.grid-cards .char-card').forEach((el) => {
      const c = findChar(el.dataset.id);
      const ok = !q || c && ((c.name || '') + ' ' + (c.player || '') + ' ' + (c.ident || '')).toLowerCase().includes(q);
      el.style.display = ok ? '' : 'none';
      if (ok) visible++;
    });
    const emptyEl = document.getElementById('fichas-empty');
    if (emptyEl) emptyEl.hidden = visible > 0;
  });

  const sc = document.getElementById('search-cat');
  if (sc) {
    const applyCat = () => {
      setCatQuery(sc.value);
      setEstPage(1);
      const area = document.getElementById('catalog-area');
      const rpg = findRpg(rt.rpgId);
      if (area && rpg) { import('./screens/estoque.js').then((m) => { area.innerHTML = m.catalogAreaHtml(rpg); }); }
    };
    sc.addEventListener('input', applyCat);
    sc.addEventListener('search', applyCat);
  }
}
