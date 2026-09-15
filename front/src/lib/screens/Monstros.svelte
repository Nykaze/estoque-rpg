<script lang="ts">
  import { app, pushToast } from '../stores'
  import { findRpg, monstrosOf, slotsUsed, fmt, classLblSing } from '../utils'
  import { send } from '../socket'
  import { navigate } from '../router'
  import Empty from '../components/Empty.svelte'
  import Icon from '../components/Icon.svelte'

  let { rpgId }: { rpgId: string } = $props()
  let rpg = $derived($app && findRpg(rpgId))
  let chars = $derived($app && monstrosOf(rpgId))
  let q = $state('')
  function slotsOf(m: any): number {
    return slotsUsed(m, rpg)
  }

  let dg = $state<null | 'add' | 'edit'>(null)
  let editId = $state<string | null>(null)
  let fm = $state({ name: '', desafio: '', tipo: '', habitat: '', capacity: 10, status: 'ativo' })

  function openNew() {
    fm = { name: '', desafio: '', tipo: '', habitat: '', capacity: 10, status: 'ativo' }
    editId = null
    dg = 'add'
  }
  function openEdit(m: any) {
    fm = {
      name: m.name || '',
      desafio: m.monster?.desafio || '',
      tipo: m.monster?.tipo || '',
      habitat: m.monster?.habitat || '',
      capacity: m.capacity || 10,
      status: m.status === 'inativo' ? 'inativo' : 'ativo'
    }
    editId = m.id
    dg = 'edit'
  }
  function save(e: SubmitEvent) {
    e.preventDefault()
    if (!fm.name.trim()) { pushToast('Informe o nome do monstro.', 'err'); return }
    const capacity = Math.max(1, Number(fm.capacity) || 10)
    const monster = { desafio: fm.desafio.trim(), tipo: fm.tipo.trim(), habitat: fm.habitat.trim() }
    if (editId) {
      send({ type: 'updateCharacter', charId: editId, patch: { name: fm.name.trim(), status: fm.status, capacity, monster } })
      pushToast('Ficha de monstro atualizada.')
    } else {
      send({ type: 'createCharacter', rpgId, name: fm.name.trim(), status: fm.status, capacity, isMonster: true, monster })
      pushToast('Ficha de monstro criada.')
    }
    dg = null
  }
  function remove(m: any) {
    if (!confirm(`Remover a ficha de monstro "${m.name}"? Esta ação não pode ser desfeita.`)) return
    send({ type: 'deleteCharacter', charId: m.id })
    pushToast('Ficha de monstro removida.')
  }

  let filtered = $derived(
    q.trim()
      ? chars.filter((m: any) =>
          (m.name + ' ' + (m.monster?.tipo || '') + ' ' + (m.monster?.desafio || '') + ' ' + (m.monster?.habitat || '')).toLowerCase().includes(q.trim().toLowerCase())
        )
      : chars
  )
</script>

<svelte:head><title>Fichas de Monstros</title></svelte:head>
{#if rpg}
  <div class="page-head">
    <div>
      <h1>{rpg.name}</h1>
      <div class="sub">Fichas de monstros <span class="restricted">(apenas gestores)</span></div>
    </div>
    <button type="button" class="btn-primary" onclick={openNew}><Icon name="monster" size={16} /> Nova ficha de monstro</button>
  </div>

  <div class="search">
    <Icon name="search" size={16} />
    <input type="search" bind:value={q} placeholder="Buscar por nome, tipo, desafio ou habitat..." />
  </div>

  {#if filtered.length}
    <div class="grid">
      {#each filtered as m (m.id)}
        <button type="button" class="monster-card" onclick={() => navigate({ view: 'ficha', rpgId, charId: m.id })}>
          <div class="mc-top">
            <span class="avatar"><Icon name="monster" size={20} /></span>
            <div class="mc-info">
              <div class="mc-name">{m.name}</div>
              <div class="mc-sub">{m.monster?.tipo || '—'}{m.monster?.habitat ? ` · ${m.monster.habitat}` : ''}</div>
            </div>
            <span class="badge" class:inactive={m.status !== 'ativo'}>{m.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
          </div>
          <div class="mc-meta">
            <span class="chip">{m.monster?.desafio ? `⚔ Desafio ${m.monster.desafio}` : 'Sem desafio'}</span>
            <span class="counts">{m.inventory.length} itens · {m.spells?.length || 0} magias · {m.runes?.length || 0} runas</span>
          </div>
          <div class="mc-ops">
            <span class="cap">{fmt(slotsOf(m))}/{m.capacity || 10} slots</span>
            <span class="ops">
              <span class="op" role="button" title="Editar" onclick={(e) => { e.stopPropagation(); openEdit(m) }}><Icon name="pencil" size={13} /></span>
              <span class="op danger" role="button" title="Remover" onclick={(e) => { e.stopPropagation(); remove(m) }}><Icon name="trash" size={13} /></span>
            </span>
          </div>
        </button>
      {/each}
    </div>
  {:else}
    <Empty message={chars.length ? 'Nenhum monstro encontrado' : 'Nenhuma ficha de monstro nesta mesa'} icon="monster" hint={chars.length ? 'Tente outra busca.' : 'Crie a primeira ficha de monstro do seu bestiário.'} />
  {/if}

  {#if dg === 'add' || dg === 'edit'}
    <div class="overlay" onclick={() => (dg = null)}>
      <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={save}>
        <div class="modal-head"><h3>{dg === 'edit' ? 'Editar ficha de monstro' : 'Nova ficha de monstro'}</h3><button type="button" class="icon-close" onclick={() => (dg = null)}><Icon name="x" size={16} /></button></div>
        <label class="field">Nome <span class="req">*</span>
          <input type="text" bind:value={fm.name} maxlength="60" placeholder="Ex: Goblin Arqueiro" autofocus />
        </label>
        <div class="form-row">
          <label class="field">Desafio
            <input type="text" bind:value={fm.desafio} maxlength="30" placeholder="Ex: 2" />
          </label>
          <label class="field">Tipo
            <input type="text" bind:value={fm.tipo} maxlength="40" placeholder="Ex: Humanóide" />
          </label>
        </div>
        <label class="field">Habitat
          <input type="text" bind:value={fm.habitat} maxlength="60" placeholder="Ex: Floresta de Kiah" />
        </label>
        <div class="form-row">
          <label class="field">Capacidade (slots)
            <input type="number" min="1" bind:value={fm.capacity} />
          </label>
          <label class="field">Status
            <select bind:value={fm.status}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </label>
        </div>
        <p class="hint">A ficha usa a mesma estrutura de {classLblSing(rpg)} + {rpg.schema?.attrs?.length || 0} atributos e perícias da mesa. Dê itens pelo estoque do catálogo na própria ficha.</p>
        <div class="modal-foot">
          <button type="button" class="btn" onclick={() => (dg = null)}>Cancelar</button>
          <button type="submit" class="btn-primary">{dg === 'edit' ? 'Salvar' : 'Criar'}</button>
        </div>
      </form>
    </div>
  {/if}
{:else}
  <Empty message="Mesa não encontrada" icon="alert" />
{/if}

<style>
  .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  h1 { margin: 0; font-size: 1.5rem; color: var(--ink); }
  .sub { color: var(--ink-soft); font-size: 0.85rem; }
  .restricted { color: var(--red, #c1453f); font-size: 0.72rem; font-weight: 700; }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--accent2-2, var(--accent)); color: #fff;
    border: none; border-radius: 12px; padding: 11px 16px;
    font-weight: 700; font-size: 0.9rem; cursor: pointer; height: 44px;
  }
  .search {
    display: flex; align-items: center; gap: 8px;
    background: var(--card); border: 1px solid var(--line);
    border-radius: 12px; padding: 0 12px; margin-bottom: 14px;
    color: var(--ink-soft);
  }
  .search input { flex: 1; background: none; border: none; outline: none; color: var(--ink); height: 46px; font-family: inherit; font-size: 0.92rem; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .monster-card {
    background: linear-gradient(160deg, var(--card-2), var(--card));
    border: 1px solid var(--line); border-radius: 14px; padding: 14px;
    color: var(--ink); cursor: pointer; box-shadow: var(--shadow-sm);
    text-align: left; font-family: inherit; width: 100%;
  }
  .mc-top { display: flex; align-items: center; gap: 12px; }
  .avatar {
    width: 44px; height: 44px; flex-shrink: 0;
    background: var(--card); border: 1px solid var(--line);
    color: var(--red, #c1453f); font-weight: 900;
    display: grid; place-items: center;
    clip-path: polygon(50% 0, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%);
  }
  .mc-info { flex: 1; min-width: 0; }
  .mc-name { font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mc-sub { color: var(--ink-soft); font-size: 0.78rem; }
  .badge { font-size: 0.62rem; font-weight: 800; padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--green,#4a9e7a) 20%, transparent); color: var(--green,#4a9e7a); }
  .badge.inactive { background: color-mix(in srgb, var(--faint,#888) 20%, transparent); color: var(--faint,#888); }
  .mc-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .chip { background: var(--card); border: 1px solid var(--line); color: var(--red, #c1453f); padding: 2px 9px; border-radius: 999px; font-weight: 800; font-size: 0.72rem; }
  .counts { color: var(--ink-soft); font-size: 0.7rem; }
  .mc-ops { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; gap: 8px; }
  .cap { color: var(--ink-soft); font-size: 0.72rem; font-weight: 700; }
  .ops { display: inline-flex; gap: 5px; }
  .op {
    display: inline-grid; place-items: center; width: 28px; height: 28px;
    border: 1px solid var(--line); background: var(--card-2);
    color: var(--ink-soft); border-radius: 8px; cursor: pointer;
  }
  .op:hover { color: var(--ink); }
  .op.danger:hover { color: var(--red, #c1453f); }

  .overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.55); display: grid; place-items: center; padding: 18px; }
  .modal { width: 100%; max-width: 420px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-md); display: grid; gap: 12px; }
  .modal-head { display: flex; align-items: center; justify-content: space-between; }
  .modal-head h3 { margin: 0; font-family: 'Playfair Display', serif; color: var(--gold); font-size: 1.15rem; }
  .icon-close { width: 34px; height: 34px; border: 1px solid var(--line); background: var(--card-2); color: var(--ink-soft); border-radius: 9px; cursor: pointer; display: grid; place-items: center; }
  .field { display: grid; gap: 5px; color: var(--ink-soft); font-size: 0.78rem; font-weight: 700; }
  .req { color: var(--red,#c1453f); }
  .field input, .field select { height: 44px; border: 1px solid var(--line); background: var(--bg-soft); border-radius: 10px; color: var(--ink); padding: 0 12px; font-family: inherit; font-size: 0.92rem; }
  .field input:focus, .field select:focus { outline: none; border-color: var(--gold); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .hint { margin: 0; color: var(--ink-soft); font-size: 0.76rem; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
  .modal-foot .btn { height: 44px; border: 1px solid var(--line); background: var(--card-2); color: var(--ink); border-radius: 12px; padding: 0 16px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .modal-foot .btn-primary { height: 44px; }

  @media (min-width: 600px) {
    .grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
  }
</style>