<script lang="ts">
  import { app } from '../stores'
  import { findRpg, fichasOf, slotsUsed, pct, canManage, fmt } from '../utils'
  import Tile from '../components/Tile.svelte'
  import Empty from '../components/Empty.svelte'
  import MovementRow from '../components/MovementRow.svelte'
  import { navigate } from '../router'

  let { rpgId }: { rpgId: string } = $props()
  let st = $derived($app)
  let rpg = $derived($app && findRpg(rpgId))
  let chars = $derived($app && fichasOf(rpgId))
  let movements = $derived((st.movements || []).filter((m: any) => m.rpgId === rpgId).slice(-7).reverse())

  let totalSlots = $derived(chars.reduce((s: number, c: any) => s + slotsUsed(c, rpg), 0))
  let totalCap = $derived(chars.reduce((s: number, c: any) => s + (c.capacity || 10), 0))
  let totalItems = $derived(chars.reduce((s: number, c: any) => s + c.inventory.reduce((x: number, i: any) => x + (Number(i.qty) || 0), 0), 0))
</script>

<svelte:head><title>Mesa {rpgId}</title></svelte:head>

{#if rpg}
  <div class="page-head">
    <div>
      <h1>{rpg.name}</h1>
      <div class="sub">{chars.length} ficha(s) · {rpg.catalog?.length || 0} itens no catálogo</div>
    </div>
  </div>

  <div class="tiles">
    <Tile label="Fichas" value={chars.length} />
    <Tile label="Itens nas mochilas" value={totalItems} />
    <Tile label="Ocupação de slots" value={Math.round(pct(totalSlots, totalCap))} suffix="%" tone={pct(totalSlots, totalCap) >= 90 ? 'red' : totalSlots === 0 ? 'normal' : 'green'} />
  </div>

  <div class="row">
    <div class="panel">
      <h2 class="sec-title">Ocupação por ficha</h2>
      {#if chars.length}
        <div class="bag-list">
          {#each chars as c (c.id)}
            <button type="button" class="bag-row" onclick={() => navigate({ view: 'ficha', rpgId, charId: c.id })}>
              <div class="bag-info">
                <div class="bag-name">{c.name}</div>
                <div class="bag-cap">{fmt(slotsUsed(c, rpg))}/{c.capacity || 10} slots</div>
              </div>
              <div class="bag-bar"><div class="fill" class:full={pct(slotsUsed(c, rpg), c.capacity) >= 100} class:warn={pct(slotsUsed(c, rpg), c.capacity) >= 80 && pct(slotsUsed(c, rpg), c.capacity) < 100} style="width:{pct(slotsUsed(c, rpg), c.capacity)}%"></div></div>
            </button>
          {/each}
        </div>
      {:else}
        <Empty message="Nenhuma ficha nesta mesa" icon="sheets" />
      {/if}
    </div>
    <div class="panel">
      <h2 class="sec-title">Últimas movimentações</h2>
      {#if movements.length}
        {#each movements as mv (mv.id)}
          <MovementRow {mv} />
        {/each}
      {:else}
        <Empty message="Sem movimentações" icon="history" />
      {/if}
    </div>
  </div>
{:else}
  <Empty message="Mesa não encontrada" icon="alert" />
{/if}

<style>
  .page-head { margin-bottom: 16px; }
  h1 { margin: 0; font-size: 1.5rem; color: var(--ink); }
  .sub { color: var(--ink-soft); font-size: 0.85rem; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .row { display: grid; grid-template-columns: 1fr; gap: 14px; }
  .panel { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; box-shadow: var(--shadow-sm); }
  .sec-title { font-family: 'Playfair Display', serif; font-size: 1rem; color: var(--gold); margin: 0 0 12px; }
  .bag-list { display: grid; gap: 10px; }
  .bag-row { display: block; width: 100%; background: var(--card-2); border: 1px solid var(--line); border-radius: 12px; padding: 12px; cursor: pointer; font-family: inherit; text-align: left; }
  .bag-info { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .bag-name { color: var(--ink); font-weight: 700; }
  .bag-cap { color: var(--ink-soft); font-size: 0.75rem; }
  .bag-bar { height: 8px; background: var(--track); border-radius: 999px; overflow: hidden; }
  .fill { height: 100%; background: var(--green, #4a9e7a); border-radius: 999px; }
  .fill.warn { background: var(--gold, #c9a55a); }
  .fill.full { background: var(--red, #c1453f); }

  @media (min-width: 900px) {
    .row { grid-template-columns: 1fr 1fr; }
  }
</style>
