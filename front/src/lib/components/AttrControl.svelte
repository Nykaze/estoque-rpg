<script lang="ts">
  // Renderiza o controle de um atributo conforme o tipo (espelha attrControl da produção)
  import { app } from '../stores'
  import { canManage, canEditChar } from '../utils'
  import { send } from '../socket'
  import Icon from './Icon.svelte'

  let { c, attr, editable = true }: { c: any; attr: any; editable?: boolean } = $props()
  let st = $derived($app)

  const v = $derived(c.attrVals[attr.id])

  function setVal(val: any) {
    send({ type: 'setAttrVal', charId: c.id, attrId: attr.id, value: val })
  }
  function setSub(sub: any) {
    send({ type: 'setAttrVal', charId: c.id, attrId: attr.id + ':sub', value: sub })
  }
</script>

{#if attr.type === 'level'}
  <div class="lvl-row">
    {#if editable}
      <input type="number" class="a-input" value={Number(v ?? 0)} max={attr.max} title={attr.desc || attr.name} onchange={(e) => setVal(Number(e.currentTarget.value))} />
    {:else}
      <div class="v-lvl">{Number(v ?? 0)}</div>
    {/if}
    {#if attr.hasSub !== false}
      <span class="a-sub-chip" title="Subpontos — 10 sub = 1 pt de perícia">
        <span class="a-sub-ic">s</span>
        {#if canManage()}
          <input type="number" class="a-sub" value={Number(c.attrVals[`${attr.id}:sub`] ?? 0)} min="0" max="9999" onchange={(e) => setSub(Number(e.currentTarget.value))} />
        {:else}
          <span class="a-sub-view">{Number(c.attrVals[`${attr.id}:sub`] ?? 0)}</span>
        {/if}
        <span class="a-sub-unit">sub</span>
      </span>
    {/if}
  </div>
{:else if attr.type === 'number'}
  {#if editable}
    <input type="number" class="a-input" value={Number(v ?? 0)} min={attr.min} max={attr.max} title={attr.desc || attr.name} onchange={(e) => setVal(Number(e.currentTarget.value))} />
  {:else}
    <span class="sh-res-v">{Number(v ?? 0)}</span>
  {/if}
{:else if attr.type === 'bool'}
  {#if canManage() && editable}
    <input type="checkbox" checked={v ? true : false} onchange={(e) => setVal(e.currentTarget.checked)} />
  {:else}
    <div class="v-lvl">{v ? 'Sim' : 'Não'}</div>
  {/if}
{:else if attr.type === 'select'}
  {#if canManage() && editable}
    <select class="a-input sel" value={v ?? ''} onchange={(e) => setVal(e.currentTarget.value)}>
      {#each attr.options || [] as o}<option value={o}>{o}</option>{/each}
    </select>
  {:else}
    <div class="v-lvl small">{v ?? '—'}</div>
  {/if}
{:else if attr.type === 'counter'}
  {#if canManage() && editable}
    <span class="a-stepper">
      <button type="button" onclick={() => setVal(Number(v ?? 0) - 1)}>−</button>
      <input type="number" min="0" step="1" class="a-input" value={Number(v ?? 0)} onchange={(e) => setVal(Number(e.currentTarget.value))} />
      <button type="button" onclick={() => setVal(Number(v ?? 0) + 1)}>+</button>
    </span>
  {:else}
    <b>{Number(v ?? 0)}</b>
  {/if}
{:else if attr.type === 'moeda'}
  {#if canManage() && editable}
    <span class="a-moeda">
      <Icon name="cash" size={13} />
      <input type="number" min="0" step="1" class="a-input" value={Number(v ?? 0)} onchange={(e) => setVal(Number(e.currentTarget.value))} />
    </span>
  {:else}
    <div class="v-lvl">{String(Number(v ?? 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</div>
  {/if}
{:else if attr.type === 'longtext'}
  {#if canManage() && editable}
    <textarea class="a-long" rows="3" value={v ?? ''} onchange={(e) => setVal(e.currentTarget.value)}></textarea>
  {:else}
    <div class="a-longview">{v ?? '—'}</div>
  {/if}
{:else if attr.type === 'vinculo'}
  {#if canManage() && editable}
    <select class="a-input sel" value={v ?? ''} onchange={(e) => setVal(e.currentTarget.value)}>
      <option value="">— nenhum —</option>
      {#each (st.characters || []).filter((x: any) => x.rpgId === c.rpgId && x.id !== c.id) as x (x.id)}
        <option value={x.id}>{x.name}</option>
      {/each}
    </select>
  {:else}
    <div class="v-lvl small">{st.characters?.find((x: any) => x.id === v)?.name || '—'}</div>
  {/if}
{:else}
  {#if canManage() && editable}
    <input type="text" class="a-input" value={v ?? ''} onchange={(e) => setVal(e.currentTarget.value)} />
  {:else}
    <div class="v-lvl small">{v ?? '—'}</div>
  {/if}
{/if}

<style>
  .a-input { width: 100%; background: var(--bg-soft); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); padding: 6px 8px; font-size: 0.95rem; font-family: inherit; min-height: 34px; }
  .a-input:focus { outline: none; border-color: var(--gold); }
  .a-input.sel { padding: 6px 8px; }
  .v-lvl { font-size: 1.2rem; font-weight: 800; color: var(--ink); }
  .lvl-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .lvl-row .a-input { width: 64px; }
  .v-lvl.small { font-size: 0.95rem; font-weight: 600; }
  .sh-res-v { font-size: 1.3rem; font-weight: 900; color: var(--gold); }
  .a-sub-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--card-2); border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; margin-left: 6px; color: var(--gold); font-size: 0.72rem; }
  .a-sub { width: 46px; background: none; border: none; color: var(--gold); font-weight: 700; text-align: center; font-size: 0.8rem; }
  .a-sub-view { font-weight: 800; }
  .a-sub-unit { color: var(--ink-soft); }
  .a-stepper { display: inline-flex; align-items: center; gap: 4px; }
  .a-stepper button { width: 30px; height: 30px; border: 1px solid var(--line); background: var(--card-2); color: var(--ink); border-radius: 8px; cursor: pointer; }
  .a-stepper .a-input { width: 46px; text-align: center; }
  .a-moeda { display: inline-flex; align-items: center; gap: 5px; color: var(--gold); }
  .a-long { width: 100%; background: var(--bg-soft); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); padding: 8px; font-family: inherit; resize: vertical; }
  .a-longview { color: var(--ink); font-size: 0.9rem; white-space: pre-wrap; }
</style>
