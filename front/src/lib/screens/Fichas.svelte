<script lang="ts">
  import { app, pushToast } from '../stores'
  import { fichasOf, findRpg, slotsUsed, pct, fmt, classLblSing } from '../utils'
  import Empty from '../components/Empty.svelte'
  import Icon from '../components/Icon.svelte'
  import { navigate } from '../router'
  import { send } from '../socket'

  let { rpgId }: { rpgId: string } = $props()
  let st = $derived($app)
  let rpg = $derived($app && findRpg(rpgId))
  let chars = $derived($app && fichasOf(rpgId))
  let q = $state('')

  let newChar = $state(false)
  let nc = $state({ name: '', player: '', ident: '', classId: '', capacity: 10 })

  function openNewChar() {
    nc = { name: '', player: '', ident: '', classId: '', capacity: 10 }
    newChar = true
  }

  function submitChar(e: SubmitEvent) {
    e.preventDefault()
    if (!nc.name.trim()) {
      pushToast('Informe o nome do personagem.', 'err')
      return
    }
    send({
      type: 'createCharacter',
      rpgId,
      name: nc.name.trim(),
      player: nc.player.trim(),
      ident: nc.ident.trim(),
      classId: nc.classId,
      capacity: Math.max(1, Number(nc.capacity) || 10)
    })
    newChar = false
    pushToast('Ficha criada.')
  }

  let filtered = $derived(
    (q.trim() ? chars.filter((c: any) => (c.name + ' ' + (c.player || '') + ' ' + (c.ident || '')).toLowerCase().includes(q.trim().toLowerCase())) : chars)
  )
</script>

<svelte:head><title>Fichas</title></svelte:head>
{#if rpg}
  <div class="page-head">
    <div>
      <h1>{rpg.name}</h1>
      <div class="sub">Fichas de personagens</div>
    </div>
    {#if rpg}
      <button type="button" class="btn-primary" onclick={openNewChar}><Icon name="plus" size={16} /> Nova ficha</button>
    {/if}
  </div>

  <div class="search">
    <Icon name="search" size={16} />
    <input type="search" bind:value={q} placeholder="Buscar ficha por nome, jogador ou ident..." />
  </div>

  {#if filtered.length}
    <div class="grid">
      {#each filtered as c (c.id)}
        <button type="button" class="char-card" onclick={() => navigate({ view: 'ficha', rpgId, charId: c.id })}>
          <div class="cc-top">
            <span class="avatar">{c.name?.charAt(0) || '?'}</span>
            <div class="cc-info">
              <div class="cc-name">{c.name}</div>
              <div class="cc-sub">{c.player || 'Sem jogador'}{c.ident ? ` · ${c.ident}` : ''}</div>
            </div>
            <span class="badge" class:inactive={c.status !== 'ativo'}>{c.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
          </div>
          <div class="bar"><div class="fill" class:full={pct(slotsUsed(c, rpg), c.capacity) >= 100} style="width:{pct(slotsUsed(c, rpg), c.capacity)}%"></div></div>
          <div class="cc-meta">
            <span>{fmt(slotsUsed(c, rpg))}/{c.capacity || 10} slots</span>
            <span>{c.inventory.length} itens · {c.spells?.length || 0} magias · {c.runes?.length || 0} runas</span>
          </div>
        </button>
      {/each}
    </div>
  {:else}
    <Empty message={chars.length ? 'Nenhuma ficha encontrada' : 'Nenhuma ficha nesta mesa'} icon="sheets" hint={chars.length ? 'Tente outra busca.' : ''} />
  {/if}

  {#if newChar && rpg}
    <div class="overlay" onclick={() => (newChar = false)}>
      <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={submitChar}>
        <div class="modal-head"><h3>Nova ficha</h3><button type="button" class="icon-close" onclick={() => (newChar = false)}><Icon name="x" size={16} /></button></div>
        <label class="field">Personagem <span class="req">*</span>
          <input type="text" bind:value={nc.name} maxlength="60" placeholder="Ex: Kaelen Vale" autofocus />
        </label>
        <div class="form-row">
          <label class="field">Jogador
            <input type="text" bind:value={nc.player} maxlength="60" placeholder="Nome do jogador" />
          </label>
          <label class="field">Identificação
            <input type="text" bind:value={nc.ident} maxlength="30" placeholder="Ex: K-01" />
          </label>
        </div>
        <div class="form-row">
          <label class="field">{classLblSing(rpg)}
            <select bind:value={nc.classId}>
              <option value="">—</option>
              {#each (rpg.schema?.classes || []) as cl (cl.id)}
                <option value={cl.id}>{cl.name}</option>
              {/each}
            </select>
          </label>
          <label class="field">Capacidade (slots)
            <input type="number" min="1" bind:value={nc.capacity} />
          </label>
        </div>
        <p class="hint">A ficha já nasce preenchida com os atributos e perícias configurados para a mesa. Você é o dono dela e poderá editar seus dados.</p>
        <div class="modal-foot">
          <button type="button" class="btn" onclick={() => (newChar = false)}>Cancelar</button>
          <button type="submit" class="btn-primary">Criar ficha</button>
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
  .char-card {
    background: linear-gradient(160deg, var(--card-2), var(--card));
    border: 1px solid var(--line); border-radius: 14px; padding: 14px;
    color: var(--ink); cursor: pointer; box-shadow: var(--shadow-sm);
    text-align: left; font-family: inherit; width: 100%;
  }
  .cc-top { display: flex; align-items: center; gap: 12px; }
  .avatar {
    width: 44px; height: 44px; flex-shrink: 0;
    background: var(--card); border: 1px solid var(--line);
    color: var(--gold); font-weight: 900; font-size: 1.1rem;
    display: grid; place-items: center;
    clip-path: polygon(50% 0, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%);
  }
  .cc-info { flex: 1; min-width: 0; }
  .cc-name { font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cc-sub { color: var(--ink-soft); font-size: 0.78rem; }
  .badge { font-size: 0.62rem; font-weight: 800; padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--green,#4a9e7a) 20%, transparent); color: var(--green,#4a9e7a); }
  .badge.inactive { background: color-mix(in srgb, var(--faint,#888) 20%, transparent); color: var(--faint,#888); }
  .bar { height: 6px; background: var(--track); border-radius: 999px; overflow: hidden; margin: 10px 0 8px; }
  .fill { height: 100%; background: var(--green,#4a9e7a); }
  .fill.full { background: var(--red,#c1453f); }
  .cc-meta { display: flex; justify-content: space-between; color: var(--ink-soft); font-size: 0.72rem; }

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
