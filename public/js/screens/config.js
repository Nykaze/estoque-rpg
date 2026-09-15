import { ICONS, ATTR_TYPE_LABELS, SECTIONS_META } from '../constants.js';
import { esc, findRpg, charsOf, canManage, getSections, evalExpression, sectionsPayload } from '../utils.js';
import { emptyBox } from '../ui.js';

let cfgTab = 'attrs';
export function getCfgTab() { return cfgTab; }
export function setCfgTab(v) { cfgTab = v; }

export function viewConfig(rpgId) {
  const rpg = findRpg(rpgId);
  return `
  <div class="page-head">
    <div><h1>Configuração da ficha</h1><div class="sub">Defina atributos, perícias e funções disponíveis para as fichas de <b>${esc(rpg.name)}</b>. As alterações refletem em todas as fichas da mesa.</div></div>
  </div>

  <div class="tabs">
    <button class="tab ${cfgTab === 'attrs' ? 'active' : ''}" data-act="cfg-tab" data-id="${rpg.id}" data-tab="attrs">Atributos (${rpg.schema.attrs.length})</button>
    <button class="tab ${cfgTab === 'skills' ? 'active' : ''}" data-act="cfg-tab" data-id="${rpg.id}" data-tab="skills">Perícias (${rpg.schema.skills.length})</button>
    <button class="tab ${cfgTab === 'classes' ? 'active' : ''}" data-act="cfg-tab" data-id="${rpg.id}" data-tab="classes">Funções (${rpg.schema.classes.length})</button>
    <button class="tab ${cfgTab === 'sections' ? 'active' : ''}" data-act="cfg-tab" data-id="${rpg.id}" data-tab="sections">Seções da ficha</button>
    <button class="tab ${cfgTab === 'calculos' ? 'active' : ''}" data-act="cfg-tab" data-id="${rpg.id}" data-tab="calculos">Cálculos (${(rpg.schema.formulas || []).length})</button>
    <button class="tab ${cfgTab === 'rules' ? 'active' : ''}" data-act="cfg-tab" data-id="${rpg.id}" data-tab="rules">Regras</button>
  </div>
  <div id="config-body">${viewConfigBody(rpg)}</div>`;
}

export function viewConfigBody(rpg) {
  if (cfgTab === 'attrs') {
    const list = [...rpg.schema.attrs].sort((a, b) => a.order - b.order);
    return `
    <div class="card">
      <div class="card-head"><h2>Atributos da mesa</h2><button class="btn btn-primary btn-sm" data-act="attr-edit-modal">${ICONS.plus} Novo atributo</button></div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th></th><th>Nome</th><th>Tipo</th><th>Regras</th><th>Sub</th><th>Obrigatório</th><th>Ativo</th><th></th></tr></thead>
        <tbody>${list.length ? list.map((a) => `
          <tr>
            <td style="width:70px">
              <button class="icon-btn" data-act="attr-move" data-id="${rpg.id}" data-sub="${a.id}" data-delta="-1" title="Subir">${ICONS.up}</button>
              <button class="icon-btn" data-act="attr-move" data-id="${rpg.id}" data-sub="${a.id}" data-delta="1" title="Descer">${ICONS.down}</button>
            </td>
            <td class="cell-strong">${esc(a.name)}${a.desc ? `<div class="cell-muted" style="font-weight:400">${esc(a.desc)}</div>` : ''}</td>
            <td><span class="tag-cat">${ATTR_TYPE_LABELS[a.type]}</span></td>
            <td class="cell-muted">${a.type === 'number' ? (a.min !== null || a.max !== null ? `min ${a.min ?? '—'} · máx ${a.max ?? '—'}` : 'livre')
              : a.type === 'level' ? `${a.min ?? 0} a ${a.max ?? '?'}`
              : a.type === 'counter' || a.type === 'moeda' ? (a.min !== null ? `min ${a.min}` : '0+')
              : a.type === 'select' ? esc(a.options.join(', '))
              : a.type === 'longtext' ? 'multilina'
              : a.type === 'vinculo' ? 'liga a outra ficha'
              : '—'}</td>
            <td>${a.type === 'level' ? (a.hasSub === false ? '<span class="badge badge-gray" title="Sem sub-atributo">Não</span>' : '<span class="badge badge-blue" title="Com sub-atributo (subpontos → pool)">Sim</span>') : '<span class="cell-muted">—</span>'}</td>
            <td>${a.required ? '<span class="badge badge-blue">Sim</span>' : '<span class="badge badge-gray">Não</span>'}</td>
            <td><label class="switch"><input type="checkbox" data-field="attr-active" data-rpg="${rpg.id}" data-aid="${a.id}" ${a.active ? 'checked' : ''}><span class="track"></span></label></td>
            <td><div class="row-actions">
              <button class="icon-btn" data-act="attr-edit-modal" data-id="${rpg.id}" data-sub="${a.id}">${ICONS.pencil}</button>
              <button class="icon-btn danger" data-act="attr-del" data-id="${rpg.id}" data-sub="${a.id}">${ICONS.trash}</button>
            </div></td>
          </tr>`).join('') : `<tr><td colspan="8">${emptyBox('Nenhum atributo configurado.', 'sliders')}</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  }

  if (cfgTab === 'sections') {
    const list = getSections(rpg.schema.sections);
    const rowHtml = (s, idx) => `
      <div class="sect-row ${s.enabled ? '' : 'sect-off'}">
        <div class="sect-moves">
          <button type="button" class="icon-btn" data-act="sec-move" data-rpg="${rpg.id}" data-idx="${idx}" data-dir="-1" title="Mover para cima" ${idx === 0 ? 'disabled' : ''}>${ICONS.up}</button>
          <button type="button" class="icon-btn" data-act="sec-move" data-rpg="${rpg.id}" data-idx="${idx}" data-dir="1" title="Mover para baixo" ${idx === list.length - 1 ? 'disabled' : ''}>${ICONS.down}</button>
        </div>
        <span class="sect-ico">${ICONS[(SECTIONS_META[s.id] || {}).icon || 'sliders']}</span>
        <div class="sect-main">
          <input type="text" class="input sect-label" value="${esc(s.label)}" data-sec-label data-rpg="${rpg.id}" data-sec="${s.id}" title="Nome exibido no título da seção">
          <span class="sect-state ${s.enabled ? 'on' : 'off'}">${s.enabled ? 'Visível na ficha' : 'Oculta na ficha'}</span>
        </div>
        <select class="input sect-col" data-sec-col data-rpg="${rpg.id}" data-sec="${s.id}" title="Coluna da ficha">
          <option value="left" ${s.col === 'left' ? 'selected' : ''}>Col. esq.</option>
          <option value="right" ${s.col === 'right' ? 'selected' : ''}>Col. dir.</option>
        </select>
        ${s.type === 'custom' ? `<div class="sect-acts">
          <button type="button" class="icon-btn" data-act="custom-sec-edit-modal" data-id="${rpg.id}" data-sub="${s.id}" title="Editar campos do bloco">${ICONS.pencil}</button>
          <button type="button" class="icon-btn danger" data-act="custom-sec-del" data-id="${rpg.id}" data-sub="${s.id}" title="Remover bloco">${ICONS.x}</button>
        </div>` : ''}
        <label class="sect-check" title="${s.enabled ? 'Desmarcar para ocultar' : 'Marcar para mostrar'}">
          <input type="checkbox" data-sec-enable data-rpg="${rpg.id}" data-sec="${s.id}" ${s.enabled ? 'checked' : ''}>
          <span class="sect-check-txt">${s.enabled ? 'Habilitado' : 'Desabilitado'}</span>
        </label>
      </div>`;
    return `
    <div class="card">
      <div class="card-head">
        <div>
          <h2>Seções da ficha</h2>
          <div class="card-sub">A ordem aqui é a ordem exibida em cada coluna da ficha. Desative para ocultar uma seção sem apagar seus dados.</div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-act="custom-sec-add-modal" data-id="${rpg.id}">${ICONS.plus} Adicionar bloco</button>
      </div>
      <div class="sections-list">
        ${list.map(rowHtml).join('')}
      </div>
      <div class="sections-hint">${ICONS.sparkles} Seções ocultas continuam guardando seus dados — apenas não aparecem nas fichas.</div>
    </div>`;
  }

  if (cfgTab === 'calculos') {
    const formulas = rpg.schema.formulas || [];
    const attrNames = (rpg.schema.attrs || []).filter((a) => a.active !== false).map((a) => a.name.toUpperCase()).sort();
    return `
    <div class="card">
      <div class="card-head">
        <div>
          <h2>Cálculos da ficha</h2>
          <div class="card-sub">Crie fórmulas que calculam valores automaticamente a partir dos atributos de nível das fichas. Use os nomes dos atributos em MAIÚSCULAS.</div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-act="formula-edit-modal" data-id="${rpg.id}">${ICONS.plus} Nova fórmula</button>
      </div>
      ${formulas.length ? `<div class="table-wrap"><table class="tbl">
        <thead><tr><th>Nome</th><th>Expressão</th><th>Exemplo (valores)</th><th></th></tr></thead>
        <tbody>${formulas.map((f) => `
          <tr>
            <td class="cell-strong">${esc(f.name)}</td>
            <td><code style="font-size:12px;background:var(--bg-2,rgba(0,0,0,.05));padding:2px 6px;border-radius:5px">${esc(f.expr)}</code></td>
            <td class="cell-muted">${(() => { const vm = {}; for (const n of attrNames.slice(0, 4)) vm[n] = 3; const v = evalExpression(f.expr, vm); return v === null ? '—' : v; })()}</td>
            <td><div class="row-actions">
              <button class="icon-btn" data-act="formula-edit-modal" data-id="${rpg.id}" data-sub="${f.id}">${ICONS.pencil}</button>
              <button class="icon-btn danger" data-act="formula-del" data-id="${rpg.id}" data-sub="${f.id}">${ICONS.trash}</button>
            </div></td>
          </tr>`).join('')}</tbody>
      </table></div>`
      : `<div class="empty">Nenhuma fórmula configurada.</div>`}
      ${attrNames.length ? `<div class="sections-hint">${ICONS.sparkles} Atributos disponíveis: <code>${esc(attrNames.join(', '))}</code></div>` : ''}
      <div class="sections-hint">Operadores: <code>+ - * / ( )</code>. Ex.: <code>(FORÇA + SABEDORIA) * 2</code> ou <code>(VIGOR * 4) + 5</code>.</div>
    </div>`;
}

  if (cfgTab === 'rules') {
    const rules = rpg.schema.rules || {};
    const sd = Math.max(1, Math.floor(Number(rules.subDivisor) || 10));
    return `
    <div class="card">
      <div class="card-head"><h2>Regras da mesa</h2></div>
      <div class="card-sub" style="padding:0 16px 14px;color:var(--faint);font-size:13px">Regras numéricas aplicadas às fichas desta mesa. Cada mesa pode ter as suas.</div>
      <div class="config-box" style="padding:0 16px 16px">
        <div class="form-row" style="flex-wrap:wrap;gap:8px">
          <div class="field"><label>Divisor de pool de perícias <span class="req">*</span></label>
            <input type="number" class="input" id="rl-subdiv" min="1" value="${sd}" style="width:120px" title="Subpontos do atributo ÷ este divisor = pontos de perícia">
            <div class="hint" style="font-size:12px;color:var(--faint);margin-top:3px">Ex.: ÷10 ou ÷15. Cada grupo de atributos da perícia cria um pool.</div>
          </div>
        </div>
        <div class="field"><label>Notas de regra</label>
          <textarea class="input" id="rl-notes" rows="4" placeholder="Descreva como funcionam os dados e perícias desta mesa…">${esc(typeof rules.rules === 'string' ? rules.rules : '')}</textarea>
        </div>
        <div class="row-actions" style="margin-top:14px">
          <button type="button" class="btn btn-primary btn-sm" data-act="save-rules" data-id="${rpg.id}">Salvar regras</button>
        </div>
      </div>
    </div>`;
  }

  if (cfgTab === 'skills') {
    const list = [...rpg.schema.skills].sort((a, b) => a.order - b.order);
    return `
    <div class="card">
      <div class="card-head"><h2>Perícias da mesa</h2><button class="btn btn-primary btn-sm" data-act="skill-edit-modal">${ICONS.plus} Nova perícia</button></div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th></th><th>Nome</th><th>Categoria</th><th>Nível máx.</th><th>Ativo</th><th></th></tr></thead>
        <tbody>${list.length ? list.map((s) => `
          <tr>
            <td style="width:70px">
              <button class="icon-btn" data-act="skill-move" data-id="${rpg.id}" data-sub="${s.id}" data-delta="-1">${ICONS.up}</button>
              <button class="icon-btn" data-act="skill-move" data-id="${rpg.id}" data-sub="${s.id}" data-delta="1">${ICONS.down}</button>
            </td>
            <td class="cell-strong">${esc(s.name)}${s.desc ? `<div class="cell-muted" style="font-weight:400">${esc(s.desc)}</div>` : ''}</td>
            <td><span class="tag-cat">${esc(s.cat)}</span></td>
            <td class="cell-num">${s.max ?? '—'}</td>
            <td><label class="switch"><input type="checkbox" data-field="skill-active" data-rpg="${rpg.id}" data-sid="${s.id}" ${s.active ? 'checked' : ''}><span class="track"></span></label></td>
            <td><div class="row-actions">
              <button class="icon-btn" data-act="skill-edit-modal" data-id="${rpg.id}" data-sub="${s.id}">${ICONS.pencil}</button>
              <button class="icon-btn danger" data-act="skill-del" data-id="${rpg.id}" data-sub="${s.id}">${ICONS.trash}</button>
            </div></td>
          </tr>`).join('') : `<tr><td colspan="6">${emptyBox('Nenhuma perícia configurada.')}</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  }

  const list = rpg.schema.classes;
  return `
  <div class="card">
    <div class="card-head"><h2>Funções / Classes da mesa</h2><button class="btn btn-primary btn-sm" data-act="class-edit-modal">${ICONS.plus} Nova função</button></div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Nome</th><th>Descrição</th><th>Fichas vinculadas</th><th></th></tr></thead>
      <tbody>${list.length ? list.map((cl) => `
        <tr>
          <td class="cell-strong">${esc(cl.name)}</td>
          <td class="cell-muted">${esc(cl.desc || '—')}</td>
          <td class="cell-num">${charsOf(rpg.id).filter((c) => c.classId === cl.id).length}</td>
          <td><div class="row-actions">
            <button class="icon-btn" data-act="class-edit-modal" data-id="${rpg.id}" data-sub="${cl.id}">${ICONS.pencil}</button>
            <button class="icon-btn danger" data-act="class-del" data-id="${rpg.id}" data-sub="${cl.id}">${ICONS.trash}</button>
          </div></td>
        </tr>`).join('') : `<tr><td colspan="4">${emptyBox('Nenhuma função cadastrada.')}</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
}
