<script lang="ts">
  import { canManage } from '../utils'
  import { send } from '../socket'

  let { c, sk, editable = true }: { c: any; sk: any; editable?: boolean } = $props()
  const v = $derived(Number(c.skillVals[sk.id] ?? 0))
  const isPips = $derived(sk.max != null && sk.max <= 10)

  function set(lvl: number) {
    if (!editable) return
    send({ type: 'setSkillVal', charId: c.id, skillId: sk.id, value: lvl })
  }
</script>

{#if isPips}
  <span class="pips" role="button" title="Clique para definir o nível">
    {#each Array(Math.max(1, sk.max)) as _, i}
      <button type="button" class="pip" class:on={i < v} disabled={!editable} onclick={() => set(i + 1)} aria-label="Nível {i + 1}"></button>
    {/each}
  </span>
{/if}
<input type="number" class="s-val" min="0" max={sk.max ?? undefined} value={v} disabled={!editable} onchange={(e) => set(Number(e.currentTarget.value))} />

<style>
  .pips { display: inline-flex; gap: 3px; }
  .pip { width: 14px; height: 14px; padding: 0; border-radius: 50%; background: var(--track); border: 1px solid var(--line); cursor: pointer; }
  .pip.on { background: var(--gold); border-color: var(--gold); }
  .pip:disabled { cursor: default; }
  .s-val { width: 48px; background: var(--bg-soft); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); text-align: center; padding: 5px; font-family: inherit; }
  .s-val:disabled { opacity: 0.8; }
</style>
