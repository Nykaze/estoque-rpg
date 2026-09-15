<script lang="ts">
  import { app } from '../stores'
  import { findRpg, fmt, canManage, assignedQty, charsOf } from '../utils'
  import { send } from '../socket'
  import { pushToast } from '../stores'
  import { CAT_LABELS, CAT_ORDER } from '../constants'
  import Empty from '../components/Empty.svelte'
  import MovementRow from '../components/MovementRow.svelte'
  import Icon from '../components/Icon.svelte'

  let { rpgId }: { rpgId: string } = $props()
  let st = $derived($app)
  let rpg = $derived($app && findRpg(rpgId))

  let tab = $state<'catalogo' | 'log'>('catalogo')
  let q = $state('')
  let catFilter = $state('all')
  let page = $state(0)
  const PER_PAGE = 15

  let items = $derived(
    (rpg?.catalog || []).filter((i: any) => {
      if (catFilter !== 'all' && i.category !== catFilter) return false
      if (q.trim() && !(i.name + ' ' + (i.effect || '')).toLowerCase().includes(q.trim().toLowerCase())) return false
      return true
    })
  )
  let pages = $derived(Math.max(1, Math.ceil(items.length / PER_PAGE)))
  let pageItems = $derived(items.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE))
  $effect(() => { if (page >= pages) page = 0 })

  let movements = $derived((st.movements || []).filter((m: any) => m.rpgId === rpgId).slice().reverse())

  let dg = $state<null | 'add' | 'edit'>(null)
  let editId = $state<string | null>(null)
  let iForm = $state({ name: '', category: 'acessorio', description: '', weight: '', value: '', effect: '', qty: '', stars: '' })

  function openNew() {
    iForm = { name: '', category: 'acessorio', description: '', weight: '', value: '', effect: '', qty: '', stars: '' }
    editId = null
    dg = 'add'
  }
  function openEdit(it: any) {
    iForm = {
      name: it.name || '',
      category: it.category || 'acessorio',
      description: it.description || '',
      weight: it.weight === null || it.weight === undefined ? '' : String(it.weight),
      value: it.value === null || it.value === undefined ? '' : String(it.value),
      effect: it.effect || '',
      qty: it.qty === null || it.qty === undefined ? '' : String(it.qty),
      stars: it.category === 'acessorio' && it.stars ? String(it.stars) : '1'
    }
    editId = it.id
    dg = 'edit'
  }
  function saveItem() {
    if (!iForm.name.trim()) { pushToast('Informe o nome do item.', 'err'); return }
    const weight = iForm.weight === '' ? 0 : Number(iForm.weight) || 0
    const value = iForm.value === '' ? 0 : Number(iForm.value) || 0
    const qty = iForm.qty === '' ? null : Number(iForm.qty) || 0
    const stars = rpg.equipStars && iForm.category === 'acessorio' ? Math.min(3, Math.max(1, Math.floor(Number(iForm.stars) || 1))) : null
    if (editId) {
      send({ type: 'updateCatalogItem', rpgId, itemId: editId, patch: { name: iForm.name.trim(), category: iForm.category, description: iForm.description.trim(), effect: iForm.effect.trim(), weight, value, qty, stars } })
      pushToast('Item atualizado.')
    } else {
      send({ type: 'addCatalogItem', rpgId, name: iForm.name.trim(), category: iForm.category, description: iForm.description.trim(), effect: iForm.effect.trim(), weight, value, qty, stars })
      pushToast('Item adicionado ao catálogo.')
    }
    dg = null
  }
  function removeItem(it: any) {
    if (!confirm(`Remover "${it.name}" do catálogo?`)) return
    send({ type: 'removeCatalogItem', rpgId, itemId: it.id })
    pushToast('Item removido.')
  }

  let giveFor = $state<null | { itemId: string; name: string }>(null)
  let giveCharId = $state('')
  let giveQty = $state('1')
  function giveSubmit() {
    if (!giveFor) return
    if (!giveCharId) { pushToast('Escolha uma ficha.', 'err'); return }
    send({ type: 'giveItem', charId: giveCharId, itemId: giveFor.itemId, qty: Math.max(1, Math.floor(Number(giveQty) || 1)) })
    pushToast('Item entregue à ficha.')
    giveFor = null
  }

  const isManager = $derived(canManage())
</script>

<svelte:head><title>Estoque</title></svelte:head>
{#if rpg}
  <div class="page-head">
    <div>
      <h1>{rpg.name}</h1>
      <div class="sub">Estoque do grupo</div>
    </div>
    {#if isManager}
      <button type="button" class="btn-primary" onclick={() => openNew()}><Icon name="plus" size={15} /> Adicionar item</button>
    {/if}
  </div>

  <div class="tabs" role="tablist">
    <button type="button" class:on={tab === 'catalogo'} onclick={() => (tab = 'catalogo')} role="tab">Catálogo</button>
    <button type="button" class:on={tab === 'log'} onclick={() => (tab = 'log')} role="tab">Log</button>
  </div>

  {#if tab === 'catalogo'}
    <div class="filters">
      <div class="search">
        <Icon name="search" size={16} />
        <input type="search" bind:value={q} placeholder="Buscar item..." />
      </div>
      <select bind:value={catFilter} aria-label="Filtrar por categoria">
        <option value="all">Todas categorias</option>
        {#each CAT_ORDER as c}
          {#if CAT_LABELS[c]}
            <option value={c}>{CAT_LABELS[c]} ({rpg.catalog?.filter((i: any) => i.category === c).length || 0})</option>
          {/if}
        {/each}
      </select>
    </div>

    {#if pageItems.length}
      <div class="catalog">
        {#each pageItems as it (it.id)}
          <div class="cat-row">
            <div class="cat-main">
              <div class="cat-name">{it.name}</div>
              <div class="cat-desc">{it.effect || it.description}</div>
            </div>
            <div class="cat-meta">
              <span class="chip">{CAT_LABELS[it.category] || it.category}</span>
              {#if rpg.equipStars && it.category === 'acessorio' && it.stars}<span class="stars" title="Estrelas">{'★'.repeat(Math.min(3, Math.max(1, Number(it.stars) || 1)))}</span>{/if}
              <span title="Peso"><Icon name="bag" size={12} /> {it.weight}</span>
              <span title="Valor"><Icon name="cash" size={12} /> {it.value}</span>
              <span class="stock">{it.qty == null ? '∞' : it.qty}{it.qty != null ? ` (${assignedQty(rpgId, it.id)} atrib.)` : ''}</span>
              {#if isManager}
                <span class="ops">
                  <button type="button" title="Dar a uma ficha" onclick={() => { giveFor = { itemId: it.id, name: it.name }; giveQty = '1'; giveCharId = '' }}><Icon name="gift" size={13} /></button>
                  <button type="button" title="Editar" onclick={() => openEdit(it)}><Icon name="pencil" size={13} /></button>
                  <button type="button" title="Remover" onclick={() => removeItem(it)}><Icon name="trash" size={13} /></button>
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
      <div class="pager">
        <button type="button" disabled={page <= 0} onclick={() => page--}><Icon name="chev" size={14} /><span class="rot"></span> Ant</button>
        <span class="pg">{page + 1} / {pages}</span>
        <button type="button" disabled={page >= pages - 1} onclick={() => page++}>Próx <Icon name="chev" size={14} /></button>
      </div>
    {:else}
      <Empty message="Nenhum item no catálogo" icon="box" hint={isManager ? 'Use "Adicionar item" para criar o primeiro.' : undefined} />
    {/if}
  {:else}
    {#if movements.length}
      <div class="log">
        {#each movements as mv (mv.id)}
          <MovementRow {mv} />
        {/each}
      </div>
    {:else}
      <Empty message="Nenhuma movimentação" icon="history" />
    {/if}
  {/if}

  {#if dg === 'add' || dg === 'edit'}
    <div class="overlay" onclick={() => (dg = null)}>
      <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); saveItem() }}>
        <div class="modal-head"><h3>{dg === 'edit' ? 'Editar item' : 'Adicionar item'}</h3><button type="button" class="icon-close" onclick={() => (dg = null)}><Icon name="x" size={16} /></button></div>
        <label class="field">Nome <span class="req">*</span>
          <input type="text" bind:value={iForm.name} maxlength="60" placeholder="Ex: Poção Vermelha" />
        </label>
        <div class="form-row">
          <label class="field">Categoria
            <select bind:value={iForm.category}>
              {#each CAT_ORDER as c (c)}
                <option value={c}>{CAT_LABELS[c]}</option>
              {/each}
            </select>
          </label>
          <label class="field">Qtd
            <input type="number" min="0" bind:value={iForm.qty} placeholder="vazio = infinito" />
          </label>
        </div>
        <div class="form-row">
          <label class="field">Peso
            <input type="number" min="0" step="0.1" bind:value={iForm.weight} placeholder="0" />
          </label>
          <label class="field">Valor
            <input type="number" min="0" step="0.5" bind:value={iForm.value} placeholder="0" />
          </label>
        </div>
        <label class="field">Efeito
          <input type="text" bind:value={iForm.effect} maxlength="300" placeholder="Opcional" />
        </label>
        {#if rpg.equipStars && iForm.category === 'acessorio'}
          <label class="field">Estrelas <span class="req">*</span>
            <input type="number" min="1" max="3" step="1" bind:value={iForm.stars} placeholder="1" />
          </label>
        {/if}
        <label class="field">Descrição
          <textarea bind:value={iForm.description} maxlength="500" placeholder="Opcional"></textarea>
        </label>
        <div class="modal-foot">
          <button type="button" class="btn" onclick={() => (dg = null)}>Cancelar</button>
          <button type="submit" class="btn-primary">Salvar</button>
        </div>
      </form>
    </div>
  {/if}

  {#if giveFor}
    <div class="overlay" onclick={() => (giveFor = null)}>
      <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); giveSubmit() }}>
        <div class="modal-head"><h3>Dar item</h3><button type="button" class="icon-close" onclick={() => (giveFor = null)}><Icon name="x" size={16} /></button></div>
        <p class="hint">Entregar <b>{giveFor.name}</b> à mochila de uma ficha.</p>
        <label class="field">Ficha <span class="req">*</span>
          <select bind:value={giveCharId}>
            <option value="">— escolher —</option>
            {#each charsOf(rpgId) as ch (ch.id)}
              <option value={ch.id}>{ch.name}{ch.player ? ` · ${ch.player}` : ''}</option>
            {/each}
          </select>
        </label>
        <label class="field">Quantidade
          <input type="number" bind:value={giveQty} min="1" step="1" />
        </label>
        <div class="modal-foot">
          <button type="button" class="btn" onclick={() => (giveFor = null)}>Cancelar</button>
          <button type="submit" class="btn-primary">Entregar</button>
        </div>
      </form>
    </div>
  {/if}
{:else}
  <Empty message="Mesa não encontrada" icon="alert" />
{/if}

<style>
  .page-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
  h1 { margin: 0; font-size: 1.5rem; color: var(--ink); }
  .sub { color: var(--ink-soft); font-size: 0.85rem; }
  .tabs { display: flex; gap: 6px; background: var(--card); padding: 5px; border-radius: 12px; border: 1px solid var(--line); margin-bottom: 14px; }
  .tabs button { flex: 1; height: 42px; border: none; background: none; color: var(--ink-soft); font-weight: 700; border-radius: 9px; cursor: pointer; font-family: inherit; }
  .tabs button.on { background: var(--accent2-2, var(--accent)); color: #fff; }
  .filters { display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 12px; }
  .search { display: flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 0 12px; color: var(--ink-soft); }
  .search input { flex: 1; background: none; border: none; outline: none; color: var(--ink); height: 44px; font-family: inherit; }
  select { height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--card); color: var(--ink); padding: 0 10px; font-family: inherit; }
  textarea { width: 100%; min-height: 72px; resize: vertical; box-sizing: border-box; }
  .catalog { display: grid; gap: 8px; }
  .cat-row { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
  .cat-name { font-weight: 800; color: var(--ink); }
  .cat-desc { color: var(--ink-soft); font-size: 0.8rem; margin-top: 2px; }
  .cat-meta { display: flex; align-items: center; gap: 10px; margin-top: 8px; flex-wrap: wrap; color: var(--ink-soft); font-size: 0.75rem; }
  .chip { background: var(--card-2); border: 1px solid var(--line); color: var(--gold); padding: 2px 8px; border-radius: 999px; font-weight: 700; }
  .stars { color: var(--gold); font-weight: 800; letter-spacing: 0.05em; }
  .stock { color: var(--ink); font-weight: 800; }
  .ops { display: inline-flex; gap: 4px; margin-left: auto; }
  .ops button { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 1px solid var(--line); background: var(--card-2); color: var(--ink-soft); border-radius: 8px; cursor: pointer; }
  .ops button:hover { color: var(--ink); }
  .pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 12px; }
  .pager button { display: inline-flex; align-items: center; gap: 4px; height: 40px; padding: 0 14px; border: 1px solid var(--line); background: var(--card); color: var(--ink); border-radius: 10px; cursor: pointer; font-family: inherit; }
  .pager button:disabled { opacity: 0.4; cursor: default; }
  .pg { color: var(--ink-soft); font-weight: 700; }
  .rot { display: inline-block; transform: rotate(180deg); }
  .log { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 6px 14px; }

  @media (min-width: 600px) {
    .filters { grid-template-columns: 1fr auto; }
    select { min-width: 220px; }
  }
</style>