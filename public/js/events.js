import { getState, getMe, getSocket, send, showApp, scheduleRender, setToastFn, doLogin, renderLogin, $modalRoot } from './state.js';
import { ICONS, CAT_LABELS } from './constants.js';
import { esc, fmt, findRpg, findChar, charsOf, canManage, isAdmin, isOwner, canEditChar, slotsUsed, getSections, sectionsPayload, evalExpression, uidShort, assignedQty } from './utils.js';
import { toast, openModal, closeModal, confirmDialog, modalHead, openRpgModal, openCharModal, openItemModal, openGiveModal, openClearHistoryModal, openAttrModal, openFormulaModal, openSkillModal, openClassModal, openCustomSecModal, openUserModal, pickCatalogItem, openAcMenu, updateNiInfo, getNiAcIndex, setNiAcIndex, renderTopbar, readItemForm } from './ui.js';
import { route, render } from './router.js';
import { viewConfigBody, getCfgTab, setCfgTab } from './screens/config.js';
import { catalogAreaHtml, catDdMenuHtml, getEstTab, setEstTab, getCatFilter, setCatFilter, getEstPage, setEstPage, getCatQuery, setCatQuery } from './screens/estoque.js';
import { getFichaQuery, setFichaQuery } from './screens/fichas.js';

setToastFn(toast);

async function eventAction(t) {
  const id = t.dataset.id;
  const sub = t.dataset.sub;

  switch (t.dataset.act) {
    case 'theme-dd': {
      const menu = document.getElementById('theme-dd');
      if (menu) menu.hidden = !menu.hidden;
      break;
    }
    case 'theme-mode': {
      const { setMode } = await import('./state.js');
      setMode(t.dataset.mode);
      const menu = document.getElementById('theme-dd');
      if (menu) menu.hidden = true;
      renderTopbar(route());
      const btn = document.querySelector('.theme-btn');
      if (btn) btn.title = 'Aparência';
      break;
    }
    case 'theme-pick': {
      const { setTheme, getTheme } = await import('./state.js');
      setTheme(t.dataset.theme);
      document.querySelectorAll('[data-act="theme-pick"]').forEach((b) => b.classList.toggle('picked', b.dataset.theme === getTheme()));
      renderTopbar(route());
      const btn = document.querySelector('.theme-btn');
      if (btn) btn.title = 'Aparência';
      break;
    }

case 'toggle-user-menu':
      fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
        .finally(() => window.location.replace('/login.html'));
      break;

    case 'open-rpg':
      location.hash = '#/rpg/' + id;
      break;
    case 'open-char':
      const cc = findChar(id); location.hash = cc ? '#/rpg/' + cc.rpgId + '/ficha/' + id : '#/';
      break;
    case 'new-rpg-modal': openRpgModal(); break;
    case 'new-char-modal': openCharModal(id); break;

    case 'est-tab': {
      setEstTab(t.dataset.tab);
      document.querySelectorAll('[data-act="est-tab"]').forEach((b) => b.classList.toggle('active', b.dataset.tab === getEstTab()));
      render();
      break;
    }
case 'cfg-tab': {
      setCfgTab(t.dataset.tab);
      document.querySelectorAll('[data-act="cfg-tab"]').forEach((b) => b.classList.toggle('active', b.dataset.tab === getCfgTab()));
      const body = document.getElementById('config-body');
      if (body) body.innerHTML = viewConfigBody(findRpg(id));
      break;
    }
    case 'save-rules': {
      const rpg = findRpg(id);
      if (!rpg) break;
      const subDivisor = Math.max(1, Math.floor(Number(document.getElementById('rl-subdiv')?.value) || 10));
      send({ type: 'setRpgRule', rpgId: id, key: 'subDivisor', value: subDivisor });
      const notes = document.getElementById('rl-notes')?.value.trim() || '';
      if (notes !== (rpg.schema.rules && rpg.schema.rules.rules)) {
        send({ type: 'setRpgRule', rpgId: id, key: 'rules', value: notes });
      }
      toast('Regras salvas.');
      break;
    }

    case 'cat-dd': {
      const menu = document.getElementById('cat-dd-menu');
      if (menu) menu.hidden = !menu.hidden;
      break;
    }
    case 'cat-pick': {
      setCatFilter(t.dataset.cf);
      setEstPage(1);
      const rpg = findRpg(route().rpgId);
      const menu = document.getElementById('cat-dd-menu');
      if (menu) { menu.hidden = true; if (rpg) menu.innerHTML = catDdMenuHtml(rpg); }
      const lbl = document.getElementById('cat-dd-label');
      if (lbl) lbl.textContent = getCatFilter() === 'all' ? 'Todas as categorias' : (CAT_LABELS[getCatFilter()] || getCatFilter());
      const area = document.getElementById('catalog-area');
      if (area && rpg && document.getElementById('search-cat')) area.innerHTML = catalogAreaHtml(rpg);
      else render();
      break;
    }
    case 'est-page': {
      setEstPage(getEstPage() + Number(t.dataset.delta));
      const area = document.getElementById('catalog-area');
      const rr = findRpg(route().rpgId);
      if (area && rr && document.getElementById('search-cat')) area.innerHTML = catalogAreaHtml(rr);
      else render();
      break;
    }

    case 'give-item-modal': openGiveModal(id, sub); break;
    case 'new-item-modal': openItemModal(id, null); break;
    case 'clear-hist-modal': openClearHistoryModal(id); break;
    case 'edit-item-modal': openItemModal(id, sub); break;
    case 'catalog-del': {
      const rpg = findRpg(id);
      const item = rpg.catalog.find((x) => x.id === sub);
      if (await confirmDialog('Excluir item', `Remover <b>${esc(item ? item.name : '')}</b> do catálogo? Fichas que já o possuem não são afetadas.`, 'Excluir')) {
        send({ type: 'removeCatalogItem', rpgId: id, itemId: sub });
        toast('Item removido do catálogo.');
      }
      break;
    }

    case 'item-inc': case 'item-dec': {
      const c = findChar(id);
      const it = c && c.inventory.find((x) => x.id === sub);
      if (it) send({ type: 'updateItem', charId: id, itemId: sub, qty: Math.max(0, (Number(it.qty) || 0) + (t.dataset.act === 'item-inc' ? 1 : -1)) });
      break;
    }
    case 'counter-inc': case 'counter-dec': {
      const cc = findChar(t.dataset.cid);
      if (cc) send({ type: 'setAttrVal', charId: t.dataset.cid, attrId: t.dataset.aid, value: Math.max(0, (Number(cc.attrVals[t.dataset.aid]) || 0) + (t.dataset.act === 'counter-inc' ? 1 : -1)) });
      break;
    }
    case 'item-del':
      send({ type: 'removeItem', charId: id, itemId: sub });
      toast('Item descartado da mochila.');
      break;
    case 'item-return': {
      const c = findChar(id);
      const it = c && c.inventory.find((x) => x.id === sub);
      if (it) {
        send({ type: 'returnItem', charId: id, entryId: sub, qty: it.qty });
        toast(`${it.qty} unidade(s) devolvida(s) ao estoque.`);
      }
      break;
    }
    case 'item-give-catalog': {
      const wrap = document.getElementById('ni-ac-wrap');
      const inp = document.getElementById('ni-catalog');
      const qtyEl = document.getElementById('ni-qty');
      const itemId = wrap && wrap.dataset.itemId;
      const c = findChar(id);
      if (!itemId || !c) { toast('Digite e escolha um item da lista primeiro.', 'err'); return; }
      send({ type: 'giveItem', rpgId: c.rpgId, charId: id, itemId, qty: Math.max(1, Number(qtyEl && qtyEl.value) || 1) });
      if (wrap) delete wrap.dataset.itemId;
      if (inp) { inp.value = ''; inp.blur(); }
      if (qtyEl) qtyEl.value = 1;
      updateNiInfo(null);
      break;
    }
    case 'item-add-manual': {
      const nameEl = document.getElementById('ni-name');
      const perEl = document.getElementById('ni-per');
      if (!nameEl.value.trim()) { nameEl.focus(); return; }
      send({ type: 'addItem', charId: id, name: nameEl.value.trim(), qty: 1, perSlot: Number(perEl.value) || 1 });
      nameEl.value = '';
      nameEl.focus();
      break;
    }

    case 'custom-add': send({ type: 'addCustomAttr', charId: id }); break;
    case 'custom-del': send({ type: 'removeCustomAttr', charId: id, fieldId: sub }); break;
    case 'spell-add': send({ type: 'addSpell', charId: id }); break;
    case 'spell-del': send({ type: 'removeSpell', charId: id, spellId: sub }); break;
    case 'rune-add': send({ type: 'addRune', charId: id }); break;
    case 'rune-del': send({ type: 'removeRune', charId: id, runeId: sub }); break;
    case 'equip-remove': {
      send({ type: 'unequip', charId: id, slot: sub });
      toast('Item desequipado.');
      break;
    }

    case 'change-photo': {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.onchange = () => {
        const file = inp.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const size = 160;
            const cv = document.createElement('canvas');
            cv.width = size; cv.height = size;
            const ctx = cv.getContext('2d');
            const side = Math.min(img.width, img.height);
            ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
            send({ type: 'updateCharacter', charId: id, patch: { photo: cv.toDataURL('image/jpeg', 0.82) } });
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      };
      inp.click();
      break;
    }

    case 'del-char': {
      if (await confirmDialog('Excluir ficha', 'A ficha e todo o seu inventário serão excluídos permanentemente.', 'Excluir ficha')) {
        const c = findChar(id);
        location.hash = '#/rpg/' + c.rpgId + '/fichas';
        send({ type: 'deleteCharacter', charId: id });
      }
      break;
    }

    case 'attr-edit-modal': openAttrModal(id, sub); break;
    case 'formula-edit-modal': openFormulaModal(id, sub); break;
    case 'formula-del': {
      if (await confirmDialog('Excluir cálculo', 'Remover esta fórmula de cálculo?', 'Excluir')) {
        send({ type: 'removeFormula', rpgId: id, formulaId: sub });
        toast('Cálculo removido.');
      }
      break;
    }
    case 'attr-del': {
      if (await confirmDialog('Excluir atributo', 'Os valores deste atributo serão apagados de <b>todas as fichas</b> desta mesa.', 'Excluir')) {
        send({ type: 'removeAttr', rpgId: id, attrId: sub });
      }
      break;
    }
    case 'attr-move': send({ type: 'reorderAttr', rpgId: id, attrId: sub, delta: Number(t.dataset.delta) }); break;
    case 'skill-edit-modal': openSkillModal(id, sub); break;
    case 'skill-del': {
      if (await confirmDialog('Excluir perícia', 'Os níveis desta perícia serão apagados de todas as fichas da mesa.', 'Excluir')) {
        send({ type: 'removeSkill', rpgId: id, skillId: sub });
      }
      break;
    }
    case 'skill-move': send({ type: 'reorderSkill', rpgId: id, skillId: sub, delta: Number(t.dataset.delta) }); break;
    case 'sec-move': {
      const rF = findRpg(t.dataset.rpg);
      const idx = Number(t.dataset.idx);
      const dir = Number(t.dataset.dir);
      if (!rF || !rF.schema || !rF.schema.sections) break;
      const arr = Array.isArray(rF.schema.sections) ? rF.schema.sections.slice() : getSections(rF.schema.sections);
      const j = idx + dir;
      if (j < 0 || j >= arr.length) break;
      const tmp = arr[idx]; arr[idx] = arr[j]; arr[j] = tmp;
      rF.schema.sections = arr;
      render();
      send({ type: 'setSections', rpgId: rF.id, sections: sectionsPayload(rF) });
      break;
    }
    case 'custom-sec-add-modal': openCustomSecModal(id, ''); break;
    case 'custom-sec-edit-modal': openCustomSecModal(id, sub); break;
    case 'custom-sec-del': {
      if (await confirmDialog('Remover bloco', 'Os campos preenchidos nas fichas deste bloco permanecerão guardados, mas o bloco deixará de aparecer.', 'Remover')) {
        const rD = findRpg(t.dataset.id);
        if (rD && rD.schema && rD.schema.sections) {
          rD.schema.sections = (Array.isArray(rD.schema.sections) ? rD.schema.sections : getSections(rD.schema.sections)).filter((s) => s.id !== sub);
          render();
          send({ type: 'setSections', rpgId: rD.id, sections: sectionsPayload(rD) });
        }
      }
      break;
    }
    case 'cs-add-field': {
      const wrap = document.getElementById('cs-fields');
      if (wrap) wrap.insertAdjacentHTML('beforeend', `<div class="cs-row"><input type="text" class="input cs-fname" placeholder="Nome do campo" maxlength="40"><label class="check-line cs-fed-wrap" title="Jogador pode preencher este campo"><input type="checkbox" class="cs-fed" checked> Jogador</label><button class="icon-btn danger" data-act="cs-del-field" title="Remover campo">${ICONS.x}</button></div>`);
      break;
    }
    case 'cs-del-field': {
      const row = t.closest('.cs-row');
      if (row) row.remove();
      break;
    }
    case 'class-edit-modal': openClassModal(id, sub); break;
    case 'class-del': {
      if (await confirmDialog('Excluir função', 'As fichas vinculadas ficarão sem função definida.', 'Excluir')) {
        send({ type: 'removeClass', rpgId: id, classId: sub });
      }
      break;
    }

    case 'user-edit-modal': openUserModal(sub); break;
    case 'user-del': {
      const u = (getState().users || []).find((x) => x.id === sub);
      if (await confirmDialog('Excluir usuário', `Excluir a conta <b>@${esc(u ? u.username : '')}</b>?`, 'Excluir')) {
        send({ type: 'deleteUser', userId: sub });
      }
      break;
    }

    case 'save-settings': {
      const nameEl = document.getElementById('set-name');
      send({ type: 'updateSettings', patch: { systemName: nameEl.value.trim() } });
      toast('Ajustes salvos.');
      break;
    }
    case 'change-password': {
      const cur = document.getElementById('pw-current').value;
      const next = document.getElementById('pw-next').value;
      const conf = document.getElementById('pw-confirm').value;
      if (next !== conf) { toast('A confirmação não confere com a nova senha.', 'err'); return; }
      send({ type: 'changeOwnPassword', current: cur, next });
      document.getElementById('pw-current').value = '';
      document.getElementById('pw-next').value = '';
      document.getElementById('pw-confirm').value = '';
      break;
    }

    default: break;
  }
}

export function initEvents() {
document.addEventListener('click', async (e) => {
  const themeDd = document.getElementById('theme-dd');
  if (themeDd && !themeDd.hidden && !e.target.closest('.theme-wrap')) themeDd.hidden = true;
  const ddMenu = document.getElementById('cat-dd-menu');
  if (ddMenu && !ddMenu.hidden && !e.target.closest('.cat-dd')) ddMenu.hidden = true;
  const acMenu = document.getElementById('ni-ac-menu');
  if (acMenu && !acMenu.hidden && !e.target.closest('.ac-wrap') && !e.target.closest('[data-ac-pick]')) acMenu.hidden = true;
  const acPick = e.target.closest('[data-ac-pick]');
  if (acPick) { pickCatalogItem(acPick.dataset.acPick); const inp = document.getElementById('ni-catalog'); if (inp) inp.focus(); return; }
  const overlay = e.target.closest('[data-overlay]');
  if (overlay && e.target === overlay) { closeModal(); return; }
  const closer = e.target.closest('[data-close-modal]');
  if (closer) { closeModal(); return; }

  const pip = e.target.closest('[data-field="skill-pip"]');
  if (pip) { send({ type: 'setSkillVal', charId: pip.dataset.cid, skillId: pip.dataset.sid, value: Number(pip.dataset.lvl) }); return; }

  const t = e.target.closest('[data-act]');
  if (!t) return;
  eventAction(t);
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-submit]');
  if (!btn) return;
  const act = btn.dataset.submit;
  const id = btn.dataset.id;
  const sub = btn.dataset.sub;
  switch (act) {
    case 'create-rpg': {
      const el = document.getElementById('nr-name');
      if (!el.value.trim()) { el.focus(); return; }
      send({ type: 'createRpg', name: el.value.trim() });
      closeModal();
      toast('Mesa criada.');
      break;
    }
    case 'create-char': {
      const nameEl = document.getElementById('nc-name');
      if (!nameEl.value.trim()) { nameEl.focus(); return; }
      send({
        type: 'createCharacter',
        rpgId: id,
        name: nameEl.value.trim(),
        player: document.getElementById('nc-player').value.trim(),
        ident: document.getElementById('nc-ident').value.trim(),
        classId: document.getElementById('nc-class').value,
        capacity: Number(document.getElementById('nc-cap').value) || 10
      });
      closeModal();
      toast('Ficha criada.');
      break;
    }
    case 'add-item': case 'save-item': {
      const f = readItemForm();
      if (!f.name) { document.getElementById('ci-name').focus(); return; }
      const qty = f.qtyRaw === '' ? null : Math.max(0, Number(f.qtyRaw) || 0);
      if (act === 'add-item') {
        send({ type: 'addCatalogItem', rpgId: id, ...f, qty, description: f.description });
        toast('Item cadastrado no estoque.');
      } else {
        send({ type: 'updateCatalogItem', rpgId: id, itemId: sub, patch: { ...f, qty, description: f.description } });
        toast('Item atualizado.');
      }
      closeModal();
      break;
    }
    case 'give-item-confirm': {
      const charSel = document.getElementById('gv-char');
      const qty = Math.max(1, Number(document.getElementById('gv-qty').value) || 1);
      send({ type: 'giveItem', rpgId: id, charId: charSel.value, itemId: sub, qty });
closeModal();
      toast('Item entregue à ficha.');
      break;
    }
    case 'clear-hist-confirm': {
      const sel = document.getElementById('cs-reason');
      if (!sel.value) { sel.focus(); return; }
      const detail = document.getElementById('cs-reason-detail').value.trim();
      let reason;
      if (sel.value === 'Outro (especificar)') {
        if (!detail) { document.getElementById('cs-reason-detail').focus(); return; }
        reason = detail;
      } else {
        reason = detail ? sel.value + ' — ' + detail : sel.value;
      }
      send({ type: 'clearCharHistory', charId: id, reason });
      closeModal();
      toast('Histórico limpo e registrado no log.');
      break;
    }
    case 'save-attr': {
      const type = document.getElementById('at-type').value;
      const attr = {
        name: document.getElementById('at-name').value.trim(),
        type,
        desc: document.getElementById('at-desc').value.trim(),
        min: ['number', 'level', 'counter', 'moeda'].includes(type) ? document.getElementById('at-min').value : null,
        max: ['number', 'level', 'counter', 'moeda'].includes(type) ? document.getElementById('at-max').value : null,
        options: type === 'select' ? document.getElementById('at-options').value.split('\n').map((s) => s.trim()).filter(Boolean) : [],
        required: document.getElementById('at-required').checked,
        active: document.getElementById('at-active').checked,
        hasSub: type === 'level' ? document.getElementById('at-sub').checked : false
      };
      if (!attr.name) { document.getElementById('at-name').focus(); return; }
      if (sub) attr.id = sub;
      send({ type: 'setAttr', rpgId: id, attr });
      closeModal();
      toast(sub ? 'Atributo atualizado.' : 'Atributo criado.');
      break;
    }
    case 'save-formula': {
      const name = document.getElementById('fm-name').value.trim();
      const expr = document.getElementById('fm-expr').value.trim();
      if (!name) { document.getElementById('fm-name').focus(); return; }
      if (!expr || evalExpression(expr, {}) === null) { document.getElementById('fm-expr').focus(); toast('Expressão inválida.'); return; }
      const formula = { name, expr };
      if (sub) formula.id = sub;
      send({ type: 'setFormula', rpgId: id, formula });
      closeModal();
      toast(sub ? 'Cálculo atualizado.' : 'Cálculo criado.');
      break;
    }
    case 'save-skill': {
      const skill = {
        name: document.getElementById('sk-name').value.trim(),
        cat: document.getElementById('sk-cat').value.trim() || 'Geral',
        max: Number(document.getElementById('sk-max').value) || null,
        desc: document.getElementById('sk-desc').value.trim(),
        active: document.getElementById('sk-active').checked
      };
      if (!skill.name) { document.getElementById('sk-name').focus(); return; }
      if (sub) skill.id = sub;
      send({ type: 'setSkill', rpgId: id, skill });
      closeModal();
      toast(sub ? 'Perícia atualizada.' : 'Perícia criada.');
      break;
    }
    case 'save-class': {
      const cl = {
        name: document.getElementById('cl-name').value.trim(),
        desc: document.getElementById('cl-desc').value.trim()
      };
      if (!cl.name) { document.getElementById('cl-name').focus(); return; }
      if (sub) cl.id = sub;
      send({ type: 'setClass', rpgId: id, cl });
      closeModal();
      toast(sub ? 'Função atualizada.' : 'Função criada.');
      break;
    }
    case 'save-custom-sec': {
      const box = document.getElementById('cs-name');
      if (!box || !box.value.trim()) { box && box.focus(); return; }
      const fields = [...document.querySelectorAll('#cs-fields .cs-row')].map((rowEl, i) => {
        const nEl = rowEl.querySelector('.cs-fname');
        const fed = rowEl.querySelector('.cs-fed');
        const name = (nEl && nEl.value.trim()) || ('Campo ' + (i + 1));
        return { id: 'f' + uidShort(), name, editable: fed ? fed.checked : true };
      }).filter((f) => f.name);
      const rS = findRpg(id);
      if (!rS || !rS.schema || !rS.schema.sections) break;
      let arr = Array.isArray(rS.schema.sections) ? rS.schema.sections.slice() : getSections(rS.schema.sections);
      let target;
      if (sub) {
        target = arr.find((s) => s.id === sub);
        if (target) {
          target.label = box.value.trim();
          target.col = document.getElementById('cs-col').value;
          target.definition = fields;
        }
      } else {
        target = {
          id: 'sec' + uidShort(),
          label: box.value.trim(),
          type: 'custom',
          enabled: true,
          col: document.getElementById('cs-col').value || 'right',
          definition: fields
        };
        arr.push(target);
      }
      rS.schema.sections = arr;
      render();
      closeModal();
      send({ type: 'setSections', rpgId: rS.id, sections: sectionsPayload(rS) });
      toast(sub ? 'Bloco atualizado.' : 'Bloco criado.');
      break;
    }
    case 'save-user': {
      if (sub) {
        const patch = {
          name: document.getElementById('us-name').value.trim(),
          role: document.getElementById('us-role').value,
          active: document.getElementById('us-active').checked
        };
        const pass = document.getElementById('us-pass').value;
        if (pass.length >= 6) patch.password = pass;
        send({ type: 'updateUser', userId: sub, patch });
        toast('Usuário atualizado.');
      } else {
        send({
          type: 'createUser',
          username: document.getElementById('us-username').value.trim(),
          name: document.getElementById('us-name').value.trim() || undefined,
          role: document.getElementById('us-role').value,
          password: document.getElementById('us-pass').value
        });
        toast('Conta criada.');
      }
      closeModal();
      break;
    }
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.act === 'equip-pick') {
    const entryId = t.value;
    const charId = t.dataset.id;
    const slot = t.dataset.sub;
    if (entryId) {
      send({ type: 'setEquip', charId, slot, entryId });
      toast('Item equipado.');
    } else {
      send({ type: 'unequip', charId, slot });
      toast('Slot esvaziado.');
    }
    return;
  }
  if (t.dataset.secEnabel !== undefined || t.hasAttribute('data-sec-enable') || t.hasAttribute('data-sec-label') || t.hasAttribute('data-sec-col')) {
    const r = findRpg(t.dataset.rpg);
    if (!r || !r.schema || !r.schema.sections) return;
    const arr = Array.isArray(r.schema.sections) ? r.schema.sections.slice() : getSections(r.schema.sections);
    const sec = arr.find((s) => s.id === t.dataset.sec);
    if (!sec) return;
    if (t.hasAttribute('data-sec-enable')) sec.enabled = !!t.checked;
    else if (t.hasAttribute('data-sec-label')) sec.label = t.value;
    else if (t.hasAttribute('data-sec-col')) sec.col = t.value;
    r.schema.sections = arr;
    send({ type: 'setSections', rpgId: r.id, sections: sectionsPayload(r) });
    render();
    return;
  }
  if (t.hasAttribute('data-custom-field')) {
    send({ type: 'setCustomField', charId: t.dataset.cid, sectionId: t.dataset.sid, fieldId: t.dataset.fid, value: t.value });
    return;
  }
  const f = t.dataset.field;
  if (!f) return;

  switch (f) {
    case 'attr-val': {
      const value = t.type === 'checkbox' ? t.checked : (t.type === 'number' ? Number(t.value) : t.value);
      send({ type: 'setAttrVal', charId: t.dataset.cid, attrId: t.dataset.aid, value });
      break;
    }
    case 'attr-sub':
      send({ type: 'setAttrVal', charId: t.dataset.cid, attrId: t.dataset.aid + ':sub', value: Math.max(0, Math.floor(Number(t.value) || 0)) });
      break;
    case 'skill-val':
      send({ type: 'setSkillVal', charId: t.dataset.cid, skillId: t.dataset.sid, value: Number(t.value) || 0 });
      break;
    case 'char-name': send({ type: 'updateCharacter', charId: t.dataset.cid, patch: { name: t.value } }); break;
    case 'char-player': send({ type: 'updateCharacter', charId: t.dataset.cid, patch: { player: t.value } }); break;
    case 'char-ident': send({ type: 'updateCharacter', charId: t.dataset.cid, patch: { ident: t.value } }); break;
    case 'char-status': send({ type: 'updateCharacter', charId: t.dataset.cid, patch: { status: t.value } }); toast('Status atualizado.'); break;
    case 'char-class': send({ type: 'updateCharacter', charId: t.dataset.cid, patch: { classId: t.value } }); break;
    case 'char-capacity': send({ type: 'updateCharacter', charId: t.dataset.cid, patch: { capacity: Math.max(1, Number(t.value) || 1) } }); break;
    case 'char-notes': send({ type: 'updateCharacter', charId: t.dataset.cid, patch: { notes: t.value } }); break;
    case 'custom-name': send({ type: 'updateCustomAttr', charId: t.dataset.cid, fieldId: t.dataset.fid, name: t.value }); break;
    case 'custom-val': send({ type: 'updateCustomAttr', charId: t.dataset.cid, fieldId: t.dataset.fid, value: t.value }); break;
    case 'item-qty': send({ type: 'updateItem', charId: t.dataset.cid, itemId: t.dataset.iid, qty: Math.max(0, Number(t.value) || 0) }); break;
    case 'spell-name': send({ type: 'updateSpell', charId: t.dataset.cid, spellId: t.dataset.sid2, name: t.value }); break;
    case 'spell-cost': send({ type: 'updateSpell', charId: t.dataset.cid, spellId: t.dataset.sid2, cost: t.value }); break;
    case 'spell-desc': send({ type: 'updateSpell', charId: t.dataset.cid, spellId: t.dataset.sid2, description: t.value }); break;
    case 'rune-name': send({ type: 'updateRune', charId: t.dataset.cid, runeId: t.dataset.rid, name: t.value }); break;
    case 'rune-circle': send({ type: 'updateRune', charId: t.dataset.cid, runeId: t.dataset.rid, circle: t.value }); break;
    case 'rune-desc': send({ type: 'updateRune', charId: t.dataset.cid, runeId: t.dataset.rid, description: t.value }); break;
    case 'attr-active': send({ type: 'setAttr', rpgId: t.dataset.rpg, attr: { id: t.dataset.aid, active: t.checked } }); break;
    case 'skill-active': send({ type: 'setSkill', rpgId: t.dataset.rpg, skill: { id: t.dataset.sid, active: t.checked } }); break;
  }
});

document.addEventListener('keydown', (e) => {
  const acMenuEl = document.getElementById('ni-ac-menu');
  const inAc = document.activeElement && document.activeElement.id === 'ni-catalog';
  if (acMenuEl && !acMenuEl.hidden && inAc) {
    const btns = [...acMenuEl.querySelectorAll('.ac-item:not([disabled])')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (btns.length) {
        let niAcIndex = getNiAcIndex();
        niAcIndex = e.key === 'ArrowDown' ? (niAcIndex + 1) % btns.length : (niAcIndex - 1 + btns.length) % btns.length;
        setNiAcIndex(niAcIndex);
        btns.forEach((b, i) => b.classList.toggle('active', i === niAcIndex));
        btns[niAcIndex].scrollIntoView({ block: 'nearest' });
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      let niAcIndex = getNiAcIndex();
      const pickBtn = niAcIndex >= 0 && btns[niAcIndex] ? btns[niAcIndex] : btns[0];
      if (pickBtn) pickCatalogItem(pickBtn.dataset.acPick);
      return;
    }
    if (e.key === 'Escape') { acMenuEl.hidden = true; return; }
  }
  const wrapEl = document.getElementById('ni-ac-wrap');
  if (e.key === 'Enter' && inAc && wrapEl && wrapEl.dataset.itemId) {
    e.preventDefault();
    const dar = document.querySelector('[data-act="item-give-catalog"]');
    if (dar) dar.click();
    return;
  }
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
    const target = document.getElementById('search-fichas') || document.getElementById('search-cat');
    if (target) { e.preventDefault(); target.focus(); }
  }
  if (e.key === 'Escape' && !$modalRoot.hidden) closeModal();
  if (e.key === 'Escape') {
    const ddMenu = document.getElementById('cat-dd-menu');
    if (ddMenu) ddMenu.hidden = true;
    const themeDd = document.getElementById('theme-dd');
    if (themeDd) themeDd.hidden = true;
  }
  if (e.key === 'Enter') {
    const ae = document.activeElement;
    if (!ae) return;
    const form = ae.closest('.login-card');
    if (form) { e.preventDefault(); doLogin(); return; }
    if (ae.matches('#nr-name')) document.querySelector('[data-submit="create-rpg"]')?.click();
    if (ae.matches('#nc-name, #nc-player, #nc-class')) document.querySelector('[data-submit="create-char"]')?.click();
    if (ae.matches('#ci-name, #ci-cat, #ci-weight, #ci-value, #ci-qty, #ci-desc, #ci-effect')) document.querySelector('[data-submit^="save-item"], [data-submit="add-item"]')?.click();
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t && t.id === 'ni-catalog') {
    const wrap = document.getElementById('ni-ac-wrap');
    const c = findChar(t.dataset.cid);
    const rpg = c && findRpg(c.rpgId);
    if (!rpg) return;
    const picked = wrap && wrap.dataset.itemId ? rpg.catalog.find((x) => x.id === wrap.dataset.itemId) : null;
    if (picked && picked.name.trim().toLowerCase() !== t.value.trim().toLowerCase()) delete wrap.dataset.itemId;
    openAcMenu();
  }
});

document.addEventListener('focusin', (e) => {
  const t = e.target;
  if (t && t.id === 'ni-catalog' && !t.value.trim()) openAcMenu();
});

const menuBtnCheck = setInterval(() => {
  const mb = document.getElementById('menu-btn');
  if (mb && !mb.dataset.bound) {
    mb.dataset.bound = '1';
    mb.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  }
  const scrim = document.getElementById('scrim');
  if (scrim && !scrim.dataset.bound) {
    scrim.dataset.bound = '1';
    scrim.addEventListener('click', () => document.body.classList.remove('nav-open'));
  }
}, 500);

if (getState()) render();
}
