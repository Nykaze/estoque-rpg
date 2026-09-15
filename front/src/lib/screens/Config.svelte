<script lang="ts">
  import { findRpg, getSections, sectionsPayload, evalExpression, classLbl, classLblSing } from '../utils'
  import { send } from '../socket'
  import { pushToast, app } from '../stores'
  import { ATTR_TYPE_LABELS } from '../constants'
  import Empty from '../components/Empty.svelte'
  import Icon from '../components/Icon.svelte'

  let { rpgId }: { rpgId: string } = $props()
  let rpg = $derived($app && findRpg(rpgId))
  let tab = $state<'attrs' | 'skills' | 'classes' | 'sections' | 'calculos' | 'rules'>('attrs')

  const mkId = () => Math.random().toString(36).slice(2, 10)
  const ATTR_TYPES = ['number', 'text', 'level', 'bool', 'select', 'counter', 'moeda', 'longtext', 'vinculo']
  const SKILL_CATS = ['Combate', 'Utilidade', 'Saber', 'Social', 'Mental', 'Arcana', 'Geral']

  let dg = $state<null | 'attr' | 'skill' | 'cl' | 'formula' | 'secnew' | 'secedit'>(null)
  let editId = $state<string | null>(null)

  let aForm = $state({ name: '', type: 'number', min: '', max: '', options: '', required: false, active: true, hasSub: false, desc: '' })
  let sForm = $state({ name: '', cat: 'Geral', max: '5', desc: '', required: false, active: true })
  let cForm = $state({ name: '', desc: '' })
  let fForm = $state({ name: '', expr: '' })
  let secForm = $state({ id: '', label: '', col: 'right', fields: [] as any[] })
  let subDivisor = $state(10)
  let notes = $state('')

  function openAttr(id?: string) {
    const a = id ? (rpg?.schema?.attrs || []).find((x: any) => x.id === id) : null
    aForm = {
      name: a?.name || '',
      type: a?.type || 'number',
      min: a?.min === null || a?.min === undefined ? '' : String(a.min),
      max: a?.max === null || a?.max === undefined ? '' : String(a.max),
      options: (a?.options || []).join(', '),
      required: !!a?.required,
      active: a?.active !== false,
      hasSub: a?.hasSub ?? (a?.type === 'level'),
      desc: a?.desc || ''
    }
    editId = id || null
    dg = 'attr'
  }
  function saveAttr() {
    if (!aForm.name.trim()) { pushToast('Informe o nome do atributo.', 'err'); return }
    const item: any = {
      name: aForm.name.trim(),
      type: aForm.type,
      required: aForm.required,
      active: aForm.active,
      desc: aForm.desc.trim()
    }
    if (aForm.type === 'select') item.options = aForm.options.split(',').map((o) => o.trim()).filter(Boolean)
    if (['number', 'level', 'counter', 'moeda'].includes(aForm.type)) {
      item.min = aForm.min === '' ? null : Number(aForm.min)
      item.max = aForm.max === '' ? null : Number(aForm.max)
    }
    if (aForm.type === 'level') item.hasSub = aForm.hasSub
    if (editId) item.id = editId
    send({ type: 'setAttr', rpgId, item })
    pushToast(editId ? 'Atributo atualizado.' : 'Atributo adicionado.')
    dg = null
  }
  function osAttr(id: string) { dg = null; if (confirm('Remover este atributo? Os valores nas fichas serão apagados.')) send({ type: 'removeAttr', rpgId, attrId: id }) }

  function openSkill(id?: string) {
    const s = id ? (rpg?.schema?.skills || []).find((x: any) => x.id === id) : null
    sForm = {
      name: s?.name || '',
      cat: s?.cat || 'Geral',
      max: String(s?.max ?? 5),
      desc: s?.desc || '',
      required: !!s?.required,
      active: s?.active !== false
    }
    editId = id || null
    dg = 'skill'
  }
  function saveSkill() {
    if (!sForm.name.trim()) { pushToast('Informe o nome da perícia.', 'err'); return }
    const item: any = {
      name: sForm.name.trim(),
      cat: sForm.cat.trim() || 'Geral',
      max: Math.max(1, Math.min(5, Number(sForm.max) || 5)),
      desc: sForm.desc.trim(),
      required: sForm.required,
      active: sForm.active
    }
    if (editId) item.id = editId
    send({ type: 'setSkill', rpgId, item })
    pushToast(editId ? 'Perícia atualizada.' : 'Perícia adicionada.')
    dg = null
  }
  function osSkill(id: string) { dg = null; if (confirm('Remover esta perícia? Os valores nas fichas serão apagados.')) send({ type: 'removeSkill', rpgId, skillId: id }) }

  function openCl(id?: string) {
    const cl = id ? (rpg?.schema?.classes || []).find((x: any) => x.id === id) : null
    cForm = { name: cl?.name || '', desc: cl?.desc || '' }
    editId = id || null
    dg = 'cl'
  }
  function saveCl() {
    if (!cForm.name.trim()) { pushToast(`Informe o nome da ${classLblSing(rpg)}.`, 'err'); return }
    send({ type: 'setClass', rpgId, cl: { ...(editId ? { id: editId } : {}), name: cForm.name.trim(), desc: cForm.desc.trim() } })
    pushToast(editId ? `${classLblSing(rpg)} atualizada.` : `${classLblSing(rpg)} adicionada.`)
    dg = null
  }
  function osCl(id: string) { dg = null; if (confirm(`Remover esta ${classLblSing(rpg)}? As fichas vinculadas ficam sem ${classLblSing(rpg)}.`)) send({ type: 'removeClass', rpgId, classId: id }) }

  function saveClassLabel() {
    const v = (rpg?.schema?.classLabel || 'Funções').trim()
    if (!v) { pushToast('Informe um nome para o campo.', 'err'); return }
    send({ type: 'setSchemaLabel', rpgId, key: 'classLabel', value: v })
    pushToast('Rótulo atualizado.')
  }

  let secs = $derived(getSections(rpg?.schema?.sections))
  function sendSections(list: any[]) {
    send({ type: 'setSections', rpgId, sections: sectionsPayload({ schema: { sections: list } } as any) })
  }
  function moveSec(idx: number, dir: number) {
    const list = secs.slice()
    const to = idx + dir
    if (to < 0 || to >= list.length) return
    const [m] = list.splice(idx, 1)
    list.splice(to, 0, m)
    sendSections(list)
  }
  function patchSec(id: string, patch: any) {
    const list = secs.map((s: any) => (s.id === id ? { ...s, ...patch } : s))
    sendSections(list)
  }
  function toggleSec(s: any) { patchSec(s.id, { enabled: !s.enabled }) }
  function openSecNew() {
    secForm = { id: mkId(), label: '', col: 'right', fields: [] }
    dg = 'secnew'
  }
  function openSecEdit(s: any) {
    secForm = { id: s.id, label: s.label, col: s.col || 'right', fields: (s.definition || []).map((f: any) => ({ ...f })) }
    dg = 'secedit'
  }
  function addSecField() { secForm.fields = [...secForm.fields, { id: mkId(), name: '', editable: true }] }
  function rmSecField(i: number) { secForm.fields = secForm.fields.filter((_, x) => x !== i) }
  function saveSec() {
    if (!secForm.label.trim()) { pushToast('Informe o nome do bloco.', 'err'); return }
    const fields = secForm.fields.filter((f: any) => f.name.trim()).map((f: any) => ({ id: f.id, name: f.name.trim(), editable: f.editable }))
    const item = { id: secForm.id, label: secForm.label.trim(), type: 'custom', enabled: true, col: secForm.col, definition: fields }
    const list = secs.some((s: any) => s.id === secForm.id) ? secs.map((s: any) => (s.id === secForm.id ? item : s)) : [...secs, item]
    sendSections(list)
    pushToast('Bloco salvo.')
    dg = null
  }
  function osSec(id: string) {
    dg = null
    if (confirm('Remover este bloco? Os dados salvos nas fichas serão mantidos.')) {
      sendSections(secs.filter((s: any) => s.id !== id))
    }
  }

  function openFormula(id?: string) {
    const f = id ? (rpg?.schema?.formulas || []).find((x: any) => x.id === id) : null
    fForm = { name: f?.name || '', expr: f?.expr || '' }
    editId = id || null
    dg = 'formula'
  }
  function saveFormula() {
    if (!fForm.expr.trim()) { pushToast('Informe a expressão de cálculo.', 'err'); return }
    send({ type: 'setFormula', rpgId, formula: { ...(editId ? { id: editId } : {}), name: fForm.name.trim() || 'Cálculo', expr: fForm.expr.trim() } })
    pushToast('Cálculo salvo.')
    dg = null
  }
  function osFormula(id: string) { dg = null; if (confirm('Remover este cálculo?')) send({ type: 'removeFormula', rpgId, formulaId: id }) }

  function formulaExample(expr: string): string {
    const vars: Record<string, number> = {}
    for (const a of rpg?.schema?.attrs || []) if (a.active !== false) vars[(a.name || '').trim().toUpperCase()] = 3
    const v = evalExpression(expr, vars)
    return v === null ? 'expressão inválida' : String(v)
  }

  function saveRules() {
    send({ type: 'setRpgRule', rpgId, key: 'subDivisor', value: Math.max(1, Number(subDivisor) || 10) })
    send({ type: 'setRpgRule', rpgId, key: 'rules', value: notes })
    pushToast('Regras salvas.')
  }

  $effect(() => {
    if (rpg) {
      subDivisor = rpg.schema?.rules?.subDivisor ?? 10
      notes = typeof rpg.schema?.rules?.rules === 'string' ? rpg.schema.rules.rules : ''
    }
  })
</script>

<svelte:head><title>Configuração</title></svelte:head>
{#if rpg}
  <div class="head"><h1>{rpg.name}</h1><div class="sub">Configuração da ficha</div></div>

  <div class="tabs">
    {#each [['attrs', `Atributos (${rpg.schema.attrs.length})`], ['skills', `Perícias (${rpg.schema.skills.length})`], ['classes', `${classLbl(rpg)} (${rpg.schema.classes.length})`], ['sections', 'Seções da ficha'], ['calculos', `Cálculos (${(rpg.schema.formulas || []).length})`], ['rules', 'Regras']] as [k, label] (k)}
      <button type="button" class:on={tab === k} onclick={() => (tab = k as typeof tab)}>{label}</button>
    {/each}
  </div>

  {#if tab === 'attrs'}
    <div class="card">
      <div class="card-head-row">
        <span class="card-title">Atributos da mesa</span>
        <button type="button" class="btn-primary" onclick={() => openAttr()}><Icon name="plus" size={15} /> Novo atributo</button>
      </div>
      {#if rpg.schema.attrs.length}
        <table class="tbl">
          <thead><tr><th></th><th>Nome</th><th>Tipo</th><th>Regras</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            {#each rpg.schema.attrs as a (a.id)}
              <tr>
                <td class="ops">
                  <button type="button" title="Mover pra cima" onclick={() => send({ type: 'reorderAttr', rpgId, attrId: a.id, delta: -1 })}><Icon name="up" size={13} /></button>
                  <button type="button" title="Mover pra baixo" onclick={() => send({ type: 'reorderAttr', rpgId, attrId: a.id, delta: 1 })}><Icon name="down" size={13} /></button>
                </td>
                <td class="strong">{a.name}{#if a.desc}<div class="muted">{a.desc}</div>{/if}</td>
                <td><span class="tag">{ATTR_TYPE_LABELS[a.type] || a.type}</span></td>
                <td class="muted">
                  {#if a.type === 'level'}{a.min ?? 0} a {a.max ?? '?'}{#if a.hasSub !== false} · c/ sub{/if}
                  {:else if a.type === 'number' || a.type === 'counter' || a.type === 'moeda'}{a.min !== null ? `min ${a.min}` : '0+'}
                  {:else if a.type === 'select'}{a.options.join(', ')}
                  {:else if a.type === 'longtext'}multilina
                  {:else if a.type === 'vinculo'}liga a outra ficha
                  {:else if a.type === 'bool'}Sim/Não
                  {:else}—{/if}
                </td>
                <td><span class={`dot ${a.active !== false ? 'on' : ''}`}></span></td>
                <td class="ops">
                  <button type="button" title="Editar" onclick={() => openAttr(a.id)}><Icon name="pencil" size={13} /></button>
                  <button type="button" title="Remover" onclick={() => osAttr(a.id)}><Icon name="trash" size={13} /></button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <span class="muted">Nenhum atributo</span>
      {/if}
    </div>

    {#if dg === 'attr'}
      <div class="overlay" onclick={() => (dg = null)}>
        <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); saveAttr() }}>
          <div class="modal-head"><h3>{editId ? 'Editar atributo' : 'Novo atributo'}</h3><button type="button" class="icon-close" onclick={() => (dg = null)}><Icon name="x" size={16} /></button></div>
          <label class="field">Nome <span class="req">*</span>
            <input type="text" bind:value={aForm.name} maxlength="40" placeholder="Ex: FORÇA" />
          </label>
          <div class="form-row">
            <label class="field">Tipo
              <select bind:value={aForm.type}>
                {#each ATTR_TYPES as t (t)}<option value={t}>{ATTR_TYPE_LABELS[t] || t}</option>{/each}
              </select>
            </label>
            {#if aForm.type === 'number' || aForm.type === 'level' || aForm.type === 'counter' || aForm.type === 'moeda'}
              <label class="field">Máximo
                <input type="number" bind:value={aForm.max} placeholder="sem teto" />
              </label>
            {/if}
          </div>
          {#if aForm.type === 'select'}
            <label class="field">Opções (separadas por vírgula)
              <input type="text" bind:value={aForm.options} placeholder="Fogo, Água, Terra" />
            </label>
          {/if}
          {#if aForm.type === 'level'}
            <label class="check">
              <input type="checkbox" bind:checked={aForm.hasSub} /> Com sub-atributo (subpontos → pool)
            </label>
          {/if}
          <label class="field">Descrição
            <input type="text" bind:value={aForm.desc} maxlength="200" placeholder="Opcional" />
          </label>
          <label class="check">
            <input type="checkbox" bind:checked={aForm.required} /> Obrigatório
          </label>
          <label class="check">
            <input type="checkbox" bind:checked={aForm.active} /> Ativo
          </label>
          <div class="modal-foot">
            <button type="button" class="btn" onclick={() => (dg = null)}>Cancelar</button>
            <button type="submit" class="btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    {/if}

  {:else if tab === 'skills'}
    <div class="card">
      <div class="card-head-row">
        <span class="card-title">Perícias da mesa</span>
        <button type="button" class="btn-primary" onclick={() => openSkill()}><Icon name="plus" size={15} /> Nova perícia</button>
      </div>
      {#if rpg.schema.skills.length}
        <table class="tbl">
          <thead><tr><th></th><th>Nome</th><th>Categoria</th><th>Máx.</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            {#each rpg.schema.skills as sk (sk.id)}
              <tr>
                <td class="ops">
                  <button type="button" title="Mover pra cima" onclick={() => send({ type: 'reorderSkill', rpgId, skillId: sk.id, delta: -1 })}><Icon name="up" size={13} /></button>
                  <button type="button" title="Mover pra baixo" onclick={() => send({ type: 'reorderSkill', rpgId, skillId: sk.id, delta: 1 })}><Icon name="down" size={13} /></button>
                </td>
                <td class="strong">{sk.name}{#if sk.desc}<div class="muted">{sk.desc}</div>{/if}</td>
                <td><span class="tag">{sk.cat || 'Geral'}</span></td>
                <td class="muted">{sk.max ?? '—'}</td>
                <td><span class={`dot ${sk.active !== false ? 'on' : ''}`}></span></td>
                <td class="ops">
                  <button type="button" title="Editar" onclick={() => openSkill(sk.id)}><Icon name="pencil" size={13} /></button>
                  <button type="button" title="Remover" onclick={() => osSkill(sk.id)}><Icon name="trash" size={13} /></button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <span class="muted">Nenhuma perícia</span>
      {/if}
    </div>

    {#if dg === 'skill'}
      <div class="overlay" onclick={() => (dg = null)}>
        <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); saveSkill() }}>
          <div class="modal-head"><h3>{editId ? 'Editar perícia' : 'Nova perícia'}</h3><button type="button" class="icon-close" onclick={() => (dg = null)}><Icon name="x" size={16} /></button></div>
          <label class="field">Nome <span class="req">*</span>
            <input type="text" bind:value={sForm.name} maxlength="40" placeholder="Ex: Pontaria" />
          </label>
          <div class="form-row">
            <label class="field">Categoria
              <input type="text" list="skill-cats" bind:value={sForm.cat} maxlength="30" placeholder="Ex: Combate" />
              <datalist id="skill-cats">{#each SKILL_CATS as c (c)}<option value={c}></option>{/each}</datalist>
            </label>
            <label class="field">Nível máximo
              <input type="number" min="1" max="5" bind:value={sForm.max} />
            </label>
          </div>
          <label class="field">Dica / atributos
            <input type="text" bind:value={sForm.desc} maxlength="200" placeholder="Ex: (FOR & SAB)" />
          </label>
          <label class="check">
            <input type="checkbox" bind:checked={sForm.active} /> Ativa
          </label>
          <div class="modal-foot">
            <button type="button" class="btn" onclick={() => (dg = null)}>Cancelar</button>
            <button type="submit" class="btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    {/if}

  {:else if tab === 'classes'}
    <div class="card">
      <div class="card-head-row">
        <span class="card-title">Nome do campo de ficha</span>
      </div>
      <div class="label-edit">
        <input type="text" bind:value={rpg.schema.classLabel} maxlength="24" placeholder="Funções" />
        <button type="button" class="btn-primary" onclick={saveClassLabel}><Icon name="check" size={15} /> Salvar nome</button>
        <span class="hint">Como o campo é chamado nas fichas desta mesa. Ex.: Funções, Raças, Modelos…</span>
      </div>
    </div>

    <div class="card">
      <div class="card-head-row">
        <span class="card-title">{classLbl(rpg)} da mesa</span>
        <button type="button" class="btn-primary" onclick={() => openCl()}><Icon name="plus" size={15} /> Nova {classLblSing(rpg)}</button>
      </div>
      {#if rpg.schema.classes.length}
        <table class="tbl">
          <thead><tr><th>Nome</th><th>Descrição</th><th></th></tr></thead>
          <tbody>
            {#each rpg.schema.classes as cl (cl.id)}
              <tr>
                <td class="strong">{cl.name}</td>
                <td class="muted">{cl.desc || '—'}</td>
                <td class="ops">
                  <button type="button" title="Editar" onclick={() => openCl(cl.id)}><Icon name="pencil" size={13} /></button>
                  <button type="button" title="Remover" onclick={() => osCl(cl.id)}><Icon name="trash" size={13} /></button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <span class="muted">Nenhuma {classLblSing(rpg)} cadastrada</span>
      {/if}
    </div>

    {#if dg === 'cl'}
      <div class="overlay" onclick={() => (dg = null)}>
        <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); saveCl() }}>
          <div class="modal-head"><h3>{editId ? `Editar ${classLblSing(rpg)}` : `Nova ${classLblSing(rpg)}`}</h3><button type="button" class="icon-close" onclick={() => (dg = null)}><Icon name="x" size={16} /></button></div>
          <label class="field">Nome <span class="req">*</span>
            <input type="text" bind:value={cForm.name} maxlength="40" placeholder={`Ex: ${classLblSing(rpg)}`} />
          </label>
          <label class="field">Descrição
            <input type="text" bind:value={cForm.desc} maxlength="300" placeholder="Opcional" />
          </label>
          <div class="modal-foot">
            <button type="button" class="btn" onclick={() => (dg = null)}>Cancelar</button>
            <button type="submit" class="btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    {/if}

  {:else if tab === 'sections'}
    <div class="card">
      <div class="card-head-row">
        <span class="card-title">Seções da ficha</span>
        <button type="button" class="btn-primary" onclick={openSecNew}><Icon name="plus" size={15} /> Adicionar bloco</button>
      </div>
      <div class="sect-list">
        {#each secs as s, i (s.id)}
          <div class="sec-row" class:off={!s.enabled}>
            <div class="sec-moves">
              <button type="button" title="Mover pra cima" disabled={i === 0} onclick={() => moveSec(i, -1)}><Icon name="up" size={13} /></button>
              <button type="button" title="Mover pra baixo" disabled={i === secs.length - 1} onclick={() => moveSec(i, 1)}><Icon name="down" size={13} /></button>
            </div>
            <div class="sec-main">
              <input type="text" class="input" value={s.label} onchange={(e) => patchSec(s.id, { label: e.currentTarget.value })} title="Nome exibido no título da seção" />
              <span class={`sec-state ${s.enabled ? 'on' : 'off'}`}>{s.type === 'custom' ? 'Bloco personalizado' : 'Seção padrão'}</span>
            </div>
            <select class="input sec-col" value={s.col} onchange={(e) => patchSec(s.id, { col: e.currentTarget.value })} title="Coluna da ficha">
              <option value="left">Col. esq.</option>
              <option value="right">Col. dir.</option>
            </select>
            {#if s.type === 'custom'}
              <div class="sec-acts">
                <button type="button" title="Editar campos" onclick={() => openSecEdit(s)}><Icon name="pencil" size={13} /></button>
                <button type="button" title="Remover bloco" onclick={() => osSec(s.id)}><Icon name="trash" size={13} /></button>
              </div>
            {/if}
            <label class="switch" title="Mostrar/ocultar">
              <input type="checkbox" checked={s.enabled} onchange={() => toggleSec(s)} />
              <span class="track"></span>
            </label>
          </div>
        {/each}
      </div>
      <span class="hint">A ordem aqui é a ordem exibida em cada coluna da ficha. Desative para ocultar sem apagar dados.</span>
    </div>

    {#if dg === 'secnew' || dg === 'secedit'}
      <div class="overlay" onclick={() => (dg = null)}>
        <form class="modal wide" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); saveSec() }}>
          <div class="modal-head"><h3>{dg === 'secedit' ? 'Editar bloco' : 'Novo bloco'}</h3><button type="button" class="icon-close" onclick={() => (dg = null)}><Icon name="x" size={16} /></button></div>
          <label class="field">Nome do bloco <span class="req">*</span>
            <input type="text" bind:value={secForm.label} maxlength="40" placeholder="Ex: Notas pessoais" />
          </label>
          <label class="field">Coluna
            <select bind:value={secForm.col}><option value="left">Col. esquerda</option><option value="right">Col. direita</option></select>
          </label>
          <div class="field">
            <span class="lbl">Campos do bloco</span>
            {#each secForm.fields as f, i (f.id)}
              <div class="sec-field-row">
                <input type="text" bind:value={f.name} maxlength="40" placeholder="Nome do campo" />
                <label class="check"><input type="checkbox" bind:checked={f.editable} /> editável</label>
                <button type="button" class="icon-close" title="Remover campo" onclick={() => rmSecField(i)}><Icon name="x" size={13} /></button>
              </div>
            {/each}
            <button type="button" class="btn-ghost" onclick={addSecField}><Icon name="plus" size={13} /> Adicionar campo</button>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" onclick={() => (dg = null)}>Cancelar</button>
            <button type="submit" class="btn-primary">Salvar bloco</button>
          </div>
        </form>
      </div>
    {/if}

  {:else if tab === 'calculos'}
    <div class="card">
      <div class="card-head-row">
        <span class="card-title">Cálculos da ficha</span>
        <button type="button" class="btn-primary" onclick={() => openFormula()}><Icon name="plus" size={15} /> Nova fórmula</button>
      </div>
      {#if rpg.schema.formulas?.length}
        <table class="tbl">
          <thead><tr><th>Nome</th><th>Expressão</th><th>Exemplo (atributos = 3)</th><th></th></tr></thead>
          <tbody>
            {#each rpg.schema.formulas as f (f.id)}
              <tr>
                <td class="strong">{f.name}</td>
                <td><code>{f.expr}</code></td>
                <td class="muted">{formulaExample(f.expr)}</td>
                <td class="ops">
                  <button type="button" title="Editar" onclick={() => openFormula(f.id)}><Icon name="pencil" size={13} /></button>
                  <button type="button" title="Remover" onclick={() => osFormula(f.id)}><Icon name="trash" size={13} /></button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <span class="muted">Nenhuma fórmula definida</span>
      {/if}
      {#if (rpg.schema.attrs || []).some((a: any) => a.active !== false)}
        <span class="hint">Atributos disponíveis: <b>{rpg.schema.attrs.filter((a: any) => a.active !== false).map((a: any) => a.name.toUpperCase()).join(', ')}</b></span>
      {/if}
      <span class="hint">Operadores: <code>+ - * / ( )</code>. Ex.: <code>(FORÇA + SABEDORIA) * 2</code></span>
    </div>

    {#if dg === 'formula'}
      <div class="overlay" onclick={() => (dg = null)}>
        <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); saveFormula() }}>
          <div class="modal-head"><h3>{editId ? 'Editar cálculo' : 'Novo cálculo'}</h3><button type="button" class="icon-close" onclick={() => (dg = null)}><Icon name="x" size={16} /></button></div>
          <label class="field">Nome
            <input type="text" bind:value={fForm.name} maxlength="40" placeholder="Ex: Vida Máxima" />
          </label>
          <label class="field">Expressão <span class="req">*</span>
            <input type="text" bind:value={fForm.expr} maxlength="120" placeholder="Ex: (VIGOR * 4) + 5" />
          </label>
          <span class="hint">Exemplo: <b>{fForm.expr ? `${fForm.expr} = ${formulaExample(fForm.expr)}` : '(VIGOR * 4) + 5 = 17'}</b></span>
          <div class="modal-foot">
            <button type="button" class="btn" onclick={() => (dg = null)}>Cancelar</button>
            <button type="submit" class="btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    {/if}

  {:else if tab === 'rules'}
    <div class="card">
      <span class="card-title" style="margin-bottom:8px;">Regras da mesa</span>
      <label class="field">Divisor do pool de perícias
        <input type="number" min="1" bind:value={subDivisor} title="Subpontos do atributo ÷ este divisor = pontos de perícia" />
      </label>
      <span class="hint">Ex.: ÷10 ou ÷15. Cada categoria de perícia cria um pool a partir dos subpontos dos atributos.</span>
      <label class="field" style="margin-top:12px;">Notas de regra
        <textarea bind:value={notes} rows="4" placeholder="Descreva como funcionam os dados e perícias desta mesa…"></textarea>
      </label>
      <div style="margin-top:12px;"><button type="button" class="btn-primary" onclick={saveRules}><Icon name="check" size={15} /> Salvar regras</button></div>
    </div>
  {/if}
{:else}
  <Empty message="Mesa não encontrada" icon="alert" />
{/if}

<style>
  .head { margin-bottom: 14px; }
  h1 { margin: 0; font-size: 1.5rem; color: var(--ink); }
  .sub { color: var(--ink-soft); font-size: 0.85rem; }
  .tabs { display: flex; gap: 4px; overflow-x: auto; background: var(--card); padding: 5px; border-radius: 12px; border: 1px solid var(--line); margin-bottom: 14px; }
  .tabs button { flex-shrink: 0; height: 40px; padding: 0 12px; border: none; background: none; color: var(--ink-soft); font-weight: 700; font-size: 0.82rem; border-radius: 9px; cursor: pointer; font-family: inherit; }
  .tabs button.on { background: var(--accent2-2, var(--accent)); color: #fff; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; box-shadow: var(--shadow-sm); display: grid; gap: 10px; margin-bottom: 14px; }
  .card-head-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .card-title { font-weight: 800; color: var(--ink); }
  .btn-primary { height: 42px; padding: 0 14px; border: none; border-radius: 10px; background: var(--accent2-2, var(--accent)); color: #fff; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .tbl th { text-align: left; color: var(--ink-soft); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  .tbl td { padding: 8px; border-bottom: 1px solid var(--line); color: var(--ink); vertical-align: top; }
  .tbl tr:last-child td { border-bottom: none; }
  .strong { font-weight: 700; }
  .ops { display: flex; gap: 4px; white-space: nowrap; width: 1%; }
  .ops button { width: 30px; height: 30px; padding: 0; border: 1px solid var(--line); background: var(--card); color: var(--ink-soft); border-radius: 8px; cursor: pointer; display: inline-grid; place-items: center; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--gold) 14%, transparent); color: var(--gold); font-size: 0.72rem; font-weight: 700; }
  .muted { color: var(--ink-soft); font-size: 0.76rem; }
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: var(--track); }
  .dot.on { background: var(--green, #4a9e7a); }
  code { background: var(--bg-soft, rgba(0,0,0,.06)); padding: 2px 6px; border-radius: 5px; font-size: 0.78rem; }
  .hint { color: var(--ink-soft); font-size: 0.76rem; }
  .label-edit { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .label-edit input { flex: 1; min-width: 180px; height: 44px; border: 1px solid var(--line); background: var(--bg-soft); color: var(--ink); border-radius: 10px; padding: 0 12px; font-family: inherit; }
  .label-edit .hint { flex-basis: 100%; }

  .sect-list { display: grid; gap: 8px; }
  .sec-row { display: flex; align-items: center; gap: 8px; background: var(--card-2); border: 1px solid var(--line); border-radius: 10px; padding: 8px; }
  .sec-row.off { opacity: 0.6; }
  .sec-moves { display: flex; gap: 4px; }
  .sec-moves button, .sec-acts button { width: 30px; height: 30px; padding: 0; border: 1px solid var(--line); background: var(--card); color: var(--ink-soft); border-radius: 8px; cursor: pointer; display: inline-grid; place-items: center; }
  .sec-moves button:disabled { opacity: 0.35; cursor: default; }
  .sec-main { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .sec-main .input { width: 100%; height: 34px; border: 1px solid transparent; background: none; color: var(--ink); border-radius: 8px; padding: 0 8px; font-family: inherit; font-weight: 700; }
  .sec-main .input:focus { outline: none; border-color: var(--gold); background: var(--bg-soft); }
  .sec-state { font-size: 0.66rem; font-weight: 700; color: var(--ink-soft); padding-left: 8px; }
  .sec-state.on { color: var(--green, #4a9e7a); }
  .sec-col { height: 34px; border: 1px solid var(--line); background: var(--bg-soft); color: var(--ink); border-radius: 8px; padding: 0 8px; font-family: inherit; font-size: 0.8rem; }
  .sec-field-row { display: flex; align-items: center; gap: 8px; }
  .sec-field-row input { flex: 1; height: 38px; border: 1px solid var(--line); background: var(--bg-soft); color: var(--ink); border-radius: 9px; padding: 0 10px; font-family: inherit; }
  .btn-ghost { height: 38px; padding: 0 12px; border: 1px dashed var(--line); background: none; color: var(--ink-soft); border-radius: 9px; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; }

  .overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.55); display: grid; place-items: center; padding: 18px; }
  .modal { width: 100%; max-width: 430px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-md); display: grid; gap: 12px; }
  .modal.wide { max-width: 520px; }
  .modal-head { display: flex; align-items: center; justify-content: space-between; }
  .modal-head h3 { margin: 0; font-family: 'Playfair Display', serif; color: var(--gold); font-size: 1.15rem; }
  .icon-close { width: 34px; height: 34px; border: 1px solid var(--line); background: var(--card-2); color: var(--ink-soft); border-radius: 9px; cursor: pointer; display: grid; place-items: center; }
  .field { display: grid; gap: 5px; color: var(--ink-soft); font-size: 0.78rem; font-weight: 700; }
  .lbl { font-size: 0.78rem; font-weight: 700; color: var(--ink-soft); }
  .req { color: var(--red, #c1453f); }
  .field input, .field select, .field textarea { border: 1px solid var(--line); background: var(--bg-soft); color: var(--ink); border-radius: 10px; padding: 10px 12px; font-family: inherit; font-size: 0.92rem; }
  .field input, .field select { height: 44px; width: 100%; box-sizing: border-box; }
  .field select { padding: 0 10px; }
  .field textarea { resize: vertical; width: 100%; box-sizing: border-box; }
  .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--gold); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .check { display: flex; align-items: center; gap: 8px; color: var(--ink-soft); font-size: 0.84rem; font-weight: 600; cursor: pointer; }
  .check input { width: 17px; height: 17px; accent-color: var(--gold); }
  .modal-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
  .modal-foot .btn { height: 44px; border: 1px solid var(--line); background: var(--card-2); color: var(--ink); border-radius: 12px; padding: 0 16px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .switch { position: relative; display: inline-block; flex-shrink: 0; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .track { width: 44px; height: 26px; background: var(--track); border-radius: 999px; position: relative; display: inline-block; transition: 0.2s; }
  .track:before { content: ''; position: absolute; width: 20px; height: 20px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: 0.2s; }
  .switch input:checked + .track { background: var(--green, #4a9e7a); }
  .switch input:checked + .track:before { transform: translateX(18px); }
</style>