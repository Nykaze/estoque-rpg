<script lang="ts">
  import { app, me } from '../stores'
  import { canManage, relTime, fichasOf, initials } from '../utils'
  import Tile from '../components/Tile.svelte'
  import Empty from '../components/Empty.svelte'
  import MovementRow from '../components/MovementRow.svelte'
  import Icon from '../components/Icon.svelte'
  import { navigate } from '../router'

  let st = $derived($app)
  let user = $derived($me)

  let totalChars = $derived((st?.characters || []).filter((c: any) => !c.isMonster).length)
  let totalItems = $derived(st?.rpgs?.reduce((s: number, r: any) => s + (r.catalog?.length || 0), 0) || 0)
  let recent = $derived((st?.movements ? [...st.movements].slice(-8).reverse() : []))

  function today() {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
</script>

<svelte:head><title>{st?.settings?.systemName || 'Estoque RPG'} · Dashboard</title></svelte:head>

<div class="page-head">
  <div>
    <h1>Bem-vindo, {user?.name?.split(' ')[0] || ''}</h1>
    <div class="sub">{today()}</div>
  </div>
  {#if user && canManage()}
    <button type="button" class="btn-primary" onclick={() => navigate({ view: 'dashboard' })}><Icon name="plus" size={16} /> Nova mesa</button>
  {/if}
</div>

<div class="tiles">
  <Tile label="Mesas" value={st?.rpgs?.length || 0} />
  <Tile label="Fichas" value={totalChars} />
  <Tile label="Itens no catálogo" value={totalItems} />
</div>

{#if st?.rpgs?.length}
  <h2 class="sec-title">Suas mesas</h2>
  <div class="grid">
    {#each st.rpgs as r (r.id)}
      <button type="button" class="rpg-card" onclick={() => navigate({ view: 'mesa', rpgId: r.id })}>
        <div class="cc-icon"><Icon name="rpg" size={20} /></div>
        <div class="cc-info">
          <div class="cc-name">{r.name}</div>
          <div class="cc-sub">
            {fichasOf(r.id).length} ficha(s) · {r.catalog?.length || 0} itens · {relTime(r.updatedAt)}
          </div>
        </div>
      </button>
    {/each}
  </div>
{/if}

<h2 class="sec-title">Movimentações recentes</h2>
{#if recent.length}
  <div class="mv-list">
    {#each recent as mv (mv.id)}
      <MovementRow {mv} />
    {/each}
  </div>
{:else}
  <Empty message="Nenhuma movimentação ainda" icon="history" hint="As entradas e saídas de itens aparecerão aqui." />
{/if}

<style>
  .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  h1 { margin: 0; font-size: 1.5rem; color: var(--ink); }
  .sub { color: var(--ink-soft); font-size: 0.85rem; margin-top: 2px; }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--accent2-2, var(--accent)); color: #fff;
    border: none; border-radius: 12px; padding: 11px 16px;
    font-weight: 700; font-size: 0.9rem; cursor: pointer; height: 44px;
  }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .sec-title { font-family: 'Playfair Display', serif; font-size: 1.05rem; color: var(--gold); margin: 22px 0 10px; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .rpg-card {
    display: flex; align-items: center; gap: 12px;
    background: linear-gradient(160deg, var(--card-2), var(--card));
    border: 1px solid var(--line); border-radius: 14px;
    padding: 16px; color: var(--ink); cursor: pointer;
    box-shadow: var(--shadow-sm); text-align: left; font-family: inherit; width: 100%;
  }
  .cc-icon { color: var(--gold); }
  .cc-name { font-weight: 800; font-size: 1rem; }
  .cc-sub { color: var(--ink-soft); font-size: 0.78rem; }
  .mv-list { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 6px 14px; box-shadow: var(--shadow-sm); }

  @media (min-width: 600px) {
    .grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  }
</style>
