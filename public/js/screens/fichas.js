import { getState, getMe } from '../state.js';
import { ICONS, EQUIP_SLOTS, EQUIP_SLOT_CATS, EQUIP_SLOT_LABELS, SECTIONS_META } from '../constants.js';
import { esc, fmt, fmtDate, relTime, findRpg, findChar, charsOf, canManage, isOwner, canEditChar, canTouch, slotsUsed, pct, initials, getSections, calcFormulas, sectionsPayload } from '../utils.js';
import { tile, emptyBox, movementRow, attrControl, skillControl } from '../ui.js';

export function charCard(c) {
  const used = slotsUsed(c);
  const p = pct(used, c.capacity);
  const statusBadge = c.status === 'ativo' ? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-gray">Inativo</span>';
  return `<div class="card char-card" data-act="open-char" data-id="${c.id}">
    <div class="cc-top">
      <span class="avatar-light lg">${initials(c.name)}${c.photo ? `<img src="${c.photo}" alt="">` : ''}</span>
      <div class="cc-info">
        <div class="cc-name">${esc(c.name)}</div>
        <div class="cc-sub">${esc(c.player || 'Sem jogador')}</div>
      </div>
      ${statusBadge}
    </div>
    <div class="bar"><div class="${p >= 100 ? 'full' : p >= 80 ? 'warn' : ''}" style="width:${p}%"></div></div>
    <div class="cc-meta">
      <span>${fmt(used)}/${c.capacity} slots</span>
      <span>${c.inventory.length} ${c.inventory.length === 1 ? 'item' : 'itens'} · ${c.spells.length} ${c.spells.length === 1 ? 'magia' : 'magias'} · ${c.runes.length} ${c.runes.length === 1 ? 'runa' : 'runas'}</span>
    </div>
  </div>`;
}

export function viewFichas(rpgId) {
  const rpg = findRpg(rpgId);
  const q = fichaQuery.trim().toLowerCase();
  let chars = charsOf(rpgId);
  if (q) chars = chars.filter((c) => ((c.name || '') + ' ' + (c.player || '') + ' ' + (c.ident || '')).toLowerCase().includes(q));

  return `
  <div class="page-head">
    <div><h1>Fichas</h1><div class="sub">${charsOf(rpgId).length} personagens cadastrados nesta mesa</div></div>
    <div class="page-actions">
      <button class="btn btn-primary" data-act="new-char-modal" data-id="${rpgId}">${ICONS.plus} Nova ficha</button>
    </div>
  </div>

  <div style="display:flex;gap:12px;margin-bottom:16px;align-items:center;flex-wrap:wrap">
    <div class="search-wrap">${ICONS.search}<input type="search" class="input" id="search-fichas" placeholder="Buscar por personagem, jogador ou ID…  ( / )" value="${esc(fichaQuery)}"></div>
  </div>

  ${chars.length ? `<div class="grid-cards">${chars.map(charCard).join('')}</div>
  <div class="empty" id="fichas-empty" hidden>${ICONS.search}<div>Nenhuma ficha encontrada para esta busca.</div></div>`
    : (q ? emptyBox('Nenhuma ficha encontrada para esta busca.', 'search') : emptyBox('Nenhuma ficha criada ainda.' + (canManage() ? ' Clique em "Nova ficha".' : ''), 'sheets'))}`;
}

let fichaQuery = '';
export function getFichaQuery() { return fichaQuery; }
export function setFichaQuery(v) { fichaQuery = v; }

export function viewFicha(charId) {
  const state = getState();
  const me = getMe();
  const c = findChar(charId);
  if (!c) return emptyBox('Ficha não encontrada.');
  const rpg = findRpg(c.rpgId);
  const schema = rpg.schema;
  const cls = schema.classes.find((x) => x.id === c.classId);
  const used = slotsUsed(c);
  const p = pct(used, c.capacity);
  const manage = canManage();
  const owner = isOwner(c);
  const canSkills = manage || (me && me.role === 'jogador');
  const canTouchSp = (sp) => canTouch(c, sp.ownerId);
  const canTouchRu = (ru) => canTouch(c, ru.ownerId);
  const charMoves = state.movements.filter((m) => m.rpgId === c.rpgId && m.charId === c.id).slice(-6).reverse();

  const activeAttrs = [...schema.attrs].filter((a) => a.active).sort((a, b) => a.order - b.order);
  const activeSkills = [...schema.skills].filter((s) => s.active).sort((a, b) => a.order - b.order);
  const secList = getSections(schema.sections);
  const skillCats = [...new Set(activeSkills.map((s) => s.cat))];
  const lvlByName = {};
  activeAttrs.forEach((a2) => { if (a2.type === 'level') lvlByName[String(a2.name).toUpperCase()] = a2; });
  const poolForCat = (cat) => {
    const parts = String(cat || '').split('&').map((s2) => s2.trim().toUpperCase()).filter(Boolean);
    const div = (rpg.schema.rules && rpg.schema.rules.subDivisor) || 10;
    let sum = 0;
    let any = false;
    parts.forEach((p2) => {
      const at = lvlByName[p2];
      if (at && at.hasSub !== false) { any = true; sum += Number(c.attrVals[at.id + ':sub'] ?? 0); }
    });
    return any ? Math.floor(sum / div) : null;
  };

  const secsOn = {};
  secList.forEach((s) => (secsOn[s.id] = s.enabled));

  const secR = (id, inner) => `<div class="sec sec-${id}">${inner}</div>`;
  const secLabel = (id) => { const f = secList.find((s) => s.id === id); return f ? esc(f.label) : esc((SECTIONS_META[id] || {}).label || id); };
  const renderers = {
    atributos: () => secR('atributos', `<div class="sec-head"><h3>${ICONS.sliders} ${secLabel('atributos')}</h3></div>${(() => {
      const attrBox = (attr) => `
        <div class="attr-box">
          <div class="a-label" title="${esc(attr.desc || attr.name)}">${esc(attr.name)}</div>
          ${canEditChar(c) ? attrControl(c, attr) : `<div class="v" style="font-size:19px;font-weight:700;margin-top:2px">${esc(String(attr.type === 'bool' ? (c.attrVals[attr.id] ? 'Sim' : 'Não') : (c.attrVals[attr.id] ?? '—')))}</div>`}
        </div>`;
      const attrFull = (attr) => `
        <div class="attr-line">
          <div class="a-label" title="${esc(attr.desc || attr.name)}">${esc(attr.name)}</div>
          ${attrControl(c, attr)}
        </div>`;
      const res = activeAttrs.filter((a) => a.type === 'number');
      const lvl = activeAttrs.filter((a) => a.type === 'level');
      const grid = activeAttrs.filter((a) => !['number', 'level', 'longtext', 'vinculo'].includes(a.type));
      const full = activeAttrs.filter((a) => a.type === 'longtext' || a.type === 'vinculo');
      const derivs = calcFormulas(rpg, c);
      if (!activeAttrs.length) return '<p class="empty">Nenhum atributo definido para esta mesa. Configure na aba de Configuração.</p>';
      return `
        ${lvl.length ? `<div class="skill-group-label" style="margin-top:14px">Atributos</div><div class="attr-grid">${lvl.map(attrBox).join('')}</div>` : ''}
        ${derivs.length ? `<div class="skill-group-label" style="margin-top:14px">Cálculos</div><div class="attr-grid">${derivs.map((d) => `<div class="attr-box derived"><div class="a-label" title="${esc(d.name)}">${esc(d.name)}</div><div class="v" style="font-size:19px;font-weight:700;margin-top:2px;color:var(--accent,var(--blue))">${esc(Math.round(d.value * 100) / 100)}</div></div>`).join('')}</div>` : ''}
        ${grid.length ? `<div class="skill-group-label" style="margin-top:14px">Outros campos</div><div class="attr-grid">${grid.map(attrBox).join('')}</div>` : ''}
        ${full.length ? `<div class="attr-rows">${full.map(attrFull).join('')}</div>` : ''}`;
    })()}`),
    pericias: () => secR('pericias', `<div class="sec-head"><h3>${ICONS.sparkles} ${secLabel('pericias')}</h3></div>${activeSkills.length ? skillCats.map((cat) => `
      <div class="skill-group-label">${esc(cat)}${(() => { const p2 = poolForCat(cat); const dv = (rpg.schema.rules && rpg.schema.rules.subDivisor) || 10; return p2 !== null ? ` <span class="pool-badge" title="Subpontos ÷ ${dv} dos atributos desta classe">${p2} ${p2 === 1 ? 'pt' : 'pts'}</span>` : ''; })()}</div>
      ${activeSkills.filter((s) => s.cat === cat).map((sk) => `
      <div class="skill-row">
        <span class="s-name" title="${esc(sk.desc || sk.name)}">${esc(sk.name)}</span>
        ${canSkills ? skillControl(c, sk) : `<b style="font-size:14px">${Number(c.skillVals[sk.id] ?? 0)}</b>`}
      </div>`).join('')}`).join('')
      : '<p class="empty">Nenhuma perícia definida. Adicione perícias na Configuração da mesa.</p>'}`),
    camposlivres: () => secR('camposlivres', `<div class="sec-head"><h3>${secLabel('camposlivres')}</h3>${manage ? `<button class="btn btn-ghost btn-sm" data-act="custom-add" data-id="${c.id}">${ICONS.plus} Campo</button>` : ''}</div>${c.customAttrs.length ? c.customAttrs.map((f) => `
      <div class="form-row" style="margin-bottom:7px;align-items:center">
        <input type="text" class="input" placeholder="Nome do campo" value="${esc(f.name)}" data-field="custom-name" data-cid="${c.id}" data-fid="${f.id}" ${manage ? '' : 'readonly'}>
        <input type="text" class="input" placeholder="Valor" value="${esc(f.value)}" data-field="custom-val" data-cid="${c.id}" data-fid="${f.id}" ${manage ? '' : 'readonly'}>
        ${manage ? `<button class="icon-btn danger" data-act="custom-del" data-id="${c.id}" data-sub="${f.id}">${ICONS.x}</button>` : ''}
      </div>`).join('') : '<p class="empty" style="padding:10px">Nenhum campo personalizado. Adicione campos livres conforme necessário.</p>'}`),
    inventario: () => secR('inventario', `<div class="sec-head"><h3>${ICONS.bag} ${secLabel('inventario')}</h3><span class="badge ${p >= 100 ? 'badge-red' : p >= 80 ? 'badge-amber' : 'badge-green'}">${fmt(used)}/${c.capacity} slots</span></div>
      <div class="bar" style="margin-bottom:12px"><div class="${p >= 100 ? 'full' : p >= 80 ? 'warn' : ''}" style="width:${p}%"></div></div>
      ${c.inventory.length ? `<div class="table-wrap"><table class="tbl inv-table">
        <thead><tr><th>Item</th><th style="text-align:center">Qtd</th><th style="text-align:right">Un/slot</th><th style="text-align:right">Slots</th><th></th></tr></thead>
        <tbody>${c.inventory.map((i) => `
          <tr>
            <td class="cell-strong" title="${esc(i.effect || '')}">${esc(i.name)}</td>
            <td style="text-align:center">
              <span class="inv-qty">
                ${manage ? `<button class="icon-btn" style="width:24px;height:24px" data-act="item-dec" data-id="${c.id}" data-sub="${i.id}">−</button>` : ''}
                <input type="number" min="0" step="any" value="${i.qty}" data-field="item-qty" data-cid="${c.id}" data-iid="${i.id}" ${manage ? '' : 'readonly'}>
                ${manage ? `<button class="icon-btn" style="width:24px;height:24px" data-act="item-inc" data-id="${c.id}" data-sub="${i.id}">+</button>` : ''}
              </span>
            </td>
            <td class="cell-num cell-muted">${fmt(i.perSlot)}</td>
            <td class="cell-num">${fmt(i.qty / (i.perSlot || 1))}</td>
            <td><div class="row-actions">
              ${manage && i.src ? `<button class="icon-btn" title="Devolver ao estoque" data-act="item-return" data-id="${c.id}" data-sub="${i.id}">${ICONS.gift}</button>` : ''}
              ${manage ? `<button class="icon-btn danger" title="Descartar" data-act="item-del" data-id="${c.id}" data-sub="${i.id}">${ICONS.trash}</button>` : ''}
            </div></td>
          </tr>`).join('')}</tbody>
      </table></div>` : emptyBox('A mochila está pronta para a aventura. Itens do catálogo aparecem aqui quando atribuídos.', 'bag')}
      ${manage ? `
      <div class="inv-add">
        <div class="sec-subtitle">Entregar do catálogo</div>
        <div class="inv-add-row">
          <div class="ac-wrap" id="ni-ac-wrap" style="flex:3;min-width:200px">
            <input type="text" class="input" id="ni-catalog" data-cid="${c.id}" placeholder="Digite o nome do item…" autocomplete="off">
            <div class="ac-menu" id="ni-ac-menu" hidden></div>
          </div>
          <input type="number" class="input" id="ni-qty" min="1" step="any" value="1" title="Quantidade" style="flex:1;min-width:64px">
          <button class="btn btn-primary btn-sm" data-act="item-give-catalog" data-id="${c.id}" title="Entregar do estoque à mochila">${ICONS.gift} Dar</button>
        </div>
        <div class="ni-hint" id="ni-info">Digite para buscar um item — nome, efeito ou categoria.</div>
        <div class="sec-subtitle" style="margin-top:10px">Item avulso</div>
        <div class="inv-add-row" style="margin-top:0">
          <input type="text" class="input" id="ni-name" placeholder="Item avulso (sem vínculo com estoque)" style="flex:2;min-width:140px">
          <input type="number" class="input" id="ni-per" min="0.01" step="any" value="1" title="Unidades por slot" style="flex:1;min-width:70px">
          <button class="btn btn-secondary btn-sm" data-act="item-add-manual" data-id="${c.id}">${ICONS.plus} Adicionar</button>
        </div>
      </div>` : ''}`),
    equipamento: () => secR('equipamento', `<div class="sec-head"><h3>${ICONS.shield} ${secLabel('equipamento')}</h3></div><div class="equip-grid">
      ${EQUIP_SLOTS.map((slot) => {
        const entryId = c.equipment && c.equipment[slot];
        const entry = entryId ? c.inventory.find((x) => x.id === entryId) : null;
        const rpg2 = findRpg(c.rpgId);
        const catItem = entry && rpg2 ? rpg2.catalog.find((x) => x.id === entry.src) : null;
        const itemCat = catItem ? catItem.category : '';
        const compatCats = EQUIP_SLOT_CATS[slot];
        const compatItems = c.inventory.filter((i) => {
          const ci = rpg2 ? rpg2.catalog.find((x) => x.id === i.src) : null;
          return ci && compatCats.includes(ci.category);
        });
        return `<div class="equip-slot">
          <div class="equip-label">${esc(EQUIP_SLOT_LABELS[slot])}</div>
          ${entry ? `<div class="equip-item">
            <span class="equip-item-name" title="${esc(entry.effect || '')}">${esc(entry.name)}</span>
            ${canEditChar(c) ? `<button class="icon-btn danger" data-act="equip-remove" data-id="${c.id}" data-sub="${slot}" title="Desequipar">${ICONS.x}</button>` : ''}
          </div>` : `<div class="equip-empty">Vazio</div>`}
          ${canEditChar(c) ? `<select class="input equip-select" data-act="equip-pick" data-id="${c.id}" data-sub="${slot}">
            <option value="">— vazio —</option>
            ${compatItems.map((i) => `<option value="${i.id}" ${entry && entry.id === i.id ? 'selected' : ''}>${esc(i.name)} (qtd: ${i.qty})</option>`).join('')}
          </select>` : ''}
        </div>`;
      }).join('')}
    </div>`),
    magias: () => secR('magias', `<div class="sec-head"><h3>${ICONS.sparkles} ${secLabel('magias')}</h3>${canEditChar(c) ? `<button class="btn btn-ghost btn-sm" data-act="spell-add" data-id="${c.id}">${ICONS.plus} Magia</button>` : ''}</div>${c.spells.length ? c.spells.map((sp) => `
      <div class="spell-item">
        <div class="spell-head">
          <input type="text" placeholder="Nome da magia" value="${esc(sp.name)}" data-field="spell-name" data-cid="${c.id}" data-sid2="${sp.id}" ${canTouchSp(sp) ? '' : 'readonly'}>
          <input type="text" class="spell-cost" placeholder="Custo" value="${esc(sp.cost)}" data-field="spell-cost" data-cid="${c.id}" data-sid2="${sp.id}" ${canTouchSp(sp) ? '' : 'readonly'}>
          ${canTouchSp(sp) ? `<button class="icon-btn danger" data-act="spell-del" data-id="${c.id}" data-sub="${sp.id}">${ICONS.x}</button>` : ''}
        </div>
        <textarea class="note-area" rows="2" placeholder="Descrição / efeito" data-field="spell-desc" data-cid="${c.id}" data-sid2="${sp.id}" ${canTouchSp(sp) ? '' : 'readonly'}>${esc(sp.description)}</textarea>
      </div>`).join('') : '<p class="empty" style="padding:10px">Este grimório ainda está vazio. Adicione magias e técnicas conhecidas.</p>'}`),
    runas: () => secR('runas', `<div class="sec-head"><h3>${ICONS.rune} ${secLabel('runas')}</h3>${canEditChar(c) ? `<button class="btn btn-ghost btn-sm" data-act="rune-add" data-id="${c.id}">${ICONS.plus} Runa</button>` : ''}</div>${c.runes.length ? c.runes.map((ru) => `
      <div class="spell-item">
        <div class="spell-head">
          <input type="text" placeholder="Nome da runa" value="${esc(ru.name)}" data-field="rune-name" data-cid="${c.id}" data-rid="${ru.id}" ${canTouchRu(ru) ? '' : 'readonly'}>
          <input type="text" class="spell-cost" placeholder="Círculo" value="${esc(ru.circle)}" data-field="rune-circle" data-cid="${c.id}" data-rid="${ru.id}" ${canTouchRu(ru) ? '' : 'readonly'}>
          ${canTouchRu(ru) ? `<button class="icon-btn danger" data-act="rune-del" data-id="${c.id}" data-sub="${ru.id}">${ICONS.x}</button>` : ''}
        </div>
        <textarea class="note-area" rows="2" placeholder="Descrição / efeito" data-field="rune-desc" data-cid="${c.id}" data-rid="${ru.id}" ${canTouchRu(ru) ? '' : 'readonly'}>${esc(ru.description)}</textarea>
      </div>`).join('') : '<p class="empty" style="padding:10px">Nenhuma runa inscrita. Registre runas mágicas aqui.</p>'}`),
    anotacoes: () => secR('anotacoes', `<div class="sec-head"><h3>${secLabel('anotacoes')}</h3></div><textarea class="note-area border-box" rows="4" placeholder="História, missões, contatos…" data-field="char-notes" data-cid="${c.id}" ${canEditChar(c) ? '' : 'readonly'}>${esc(c.notes)}</textarea>`),
    historico: () => (charMoves.length ? secR('historico', `<div class="sec-head"><h3>${ICONS.history} ${secLabel('historico')}</h3>${manage ? `<button class="btn btn-ghost btn-sm" data-act="clear-hist-modal" data-id="${c.id}" title="Apagar histórico de itens desta ficha">${ICONS.trash} Limpar</button>` : ''}</div>${charMoves.map(movementRow).join('')}`) : '')
  };

  const renderersEnabled = (id) => (renderers[id] && secsOn[id] ? renderers[id]() : '');
  const customRenderer = (s) => {
    const vals = (c.customSections && c.customSections[s.id]) || {};
    return secR(s.id, `<div class="sec-head"><h3>${esc(s.label)}${manage ? `<button class="btn btn-ghost btn-sm" data-act="custom-sec-edit" data-id="${s.id}" title="Editar blocos">${ICONS.pencil}</button>` : ''}</h3></div>${
      s.definition && s.definition.length ? s.definition.map((f) => {
        const canEdit = f.editable ? true : !!manage;
        return `<div class="form-row" style="margin-bottom:7px;align-items:center">
          <span class="cell-strong" style="flex:0 0 auto;min-width:120px">${esc(f.name)}</span>
          <input type="text" class="input" placeholder="…" value="${esc(vals[f.id] ?? '')}" data-custom-field data-cid="${c.id}" data-sid="${s.id}" data-fid="${f.id}" ${canEdit ? '' : 'readonly'}>
        </div>`;
      }).join('') : '<p class="empty" style="padding:10px">Bloco vazio — edite para adicionar campos.</p>'
    }`);
  };
  const leftArr = [];
  const rightArr = [];
  secList.forEach((s) => {
    if (s.id === 'historico' && !charMoves.length) return;
    let html;
    if (s.type === 'custom') html = secsOn[s.id] ? customRenderer(s) : '';
    else html = renderersEnabled(s.id);
    if (html) (s.col === 'left' ? leftArr : rightArr).push(html);
  });
  const hideCls = secList.filter((s) => !s.enabled).map((s) => `hide-${s.id}`).join(' ');

  return `
  <div class="sheet ${hideCls}">
    <div class="sheet-head">
      <div class="sh-row">
${manage ? `<button class="sh-photo-btn" data-act="change-photo" data-id="${c.id}" title="Alterar foto">
          <span class="avatar-shield lg">${c.photo ? `<img src="${c.photo}" alt="">` : initials(c.name)}</span>
          <span class="sh-photo-edit">${ICONS.pencil}</span>
        </button>` : `<span class="avatar-shield lg">${c.photo ? `<img src="${c.photo}" alt="">` : initials(c.name)}</span>`}
        <div class="sh-title-wrap">
          <input type="text" class="sh-name" value="${esc(c.name)}" data-field="char-name" data-cid="${c.id}" ${canEditChar(c) ? '' : 'readonly'}>
          <div class="sh-meta">
            <input type="text" class="input" style="max-width:150px" placeholder="Jogador" title="Jogador" value="${esc(c.player)}" data-field="char-player" data-cid="${c.id}" ${manage ? '' : 'readonly'}>
            <input type="text" class="input" style="max-width:120px" placeholder="Identificação" title="Identificação" value="${esc(c.ident)}" data-field="char-ident" data-cid="${c.id}" ${canEditChar(c) ? '' : 'readonly'}>
            <select class="input" style="max-width:130px" data-field="char-status" data-cid="${c.id}" ${manage ? '' : 'disabled'} title="Status">
              <option value="ativo" ${c.status === 'ativo' ? 'selected' : ''}>Ativo</option>
              <option value="inativo" ${c.status !== 'ativo' ? 'selected' : ''}>Inativo</option>
            </select>
            <select class="input" style="max-width:160px" data-field="char-class" data-cid="${c.id}" ${canEditChar(c) ? '' : 'disabled'} title="Função/Classe">
              <option value="">Sem função</option>
              ${schema.classes.map((k) => `<option value="${k.id}" ${c.classId === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}
            </select>
          </div>
          <div class="sh-stats">
            <span class="sh-stat"><span class="k">Criado em</span><br><span class="v">${fmtDate(c.createdAt)}</span></span>
            <span class="sh-stat"><span class="k">Atualizado</span><br><span class="v">${relTime(c.updatedAt)}</span></span>
            <span class="sh-stat"><span class="k">Capacidade</span><br><input type="number" class="input" style="width:76px;padding:3px 8px" min="1" value="${c.capacity}" data-field="char-capacity" data-cid="${c.id}" ${manage ? '' : 'readonly'}></span>
            <span class="sh-stat"><span class="k">${ICONS.cash} Dinheiro</span><br><input type="number" class="input" style="width:90px;padding:3px 8px" min="0" value="${c.cash ?? 0}" data-field="char-cash" data-cid="${c.id}" ${manage ? '' : 'readonly'}></span>
${cls ? `<span class="sh-stat"><span class="k">Função</span><br><span class="v" title="${esc(cls.desc)}">${esc(cls.name)}</span></span>` : ''}
          </div>
        </div>
        ${(() => {
          const resAttrs = activeAttrs.filter((a) => a.type === 'number');
          if (!resAttrs.length) return '';
          return `<div class="sh-resources">${resAttrs.map((ra) => `
            <div class="sh-res">
              <span class="sh-res-k" title="${esc(ra.desc || ra.name)}">${esc(ra.name)}</span>
              ${canEditChar(c)
                ? `<input type="number" class="input sh-res-v" min="${ra.min ?? ''}" max="${ra.max ?? ''}" value="${Number(c.attrVals[ra.id] ?? 0)}" data-field="attr-val" data-cid="${c.id}" data-aid="${ra.id}">`
                : `<span class="sh-res-v">${Number(c.attrVals[ra.id] ?? 0)}</span>`}
            </div>`).join('')}</div>`;
        })()}
      </div>
    </div>

    <div class="sheet-grid">
      <div class="sheet-col">
        ${leftArr.join('')}
      </div>
      <div class="sheet-col">
        ${rightArr.join('')}
        ${manage ? `
        <div style="display:flex;justify-content:flex-end;border-top:1px solid var(--border);padding-top:14px">
          <button class="btn btn-danger-soft btn-sm" data-act="del-char" data-id="${c.id}">${ICONS.trash} Excluir ficha</button>
        </div>` : ''}
      </div>
    </div>

  </div>`;
}
