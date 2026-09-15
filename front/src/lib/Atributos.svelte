<script lang="ts">
  import { ATRIBUTOS, bonusDe, type AttrKey } from './data'

  let { valores, onDelta }: { valores: Record<AttrKey, number>; onDelta: (k: AttrKey, d: number) => void } = $props()
</script>

<div class="attrs">
  {#each ATRIBUTOS as a (a.key)}
    <div class="attr">
      <div class="attr-ico" aria-hidden="true">{a.icone}</div>
      <div class="attr-mid">
        <div class="attr-nome">{a.nome}<small>{a.abrev}</small></div>
        <div class="attr-bonus">{bonusDe(valores[a.key], a.key)}</div>
      </div>
      <div class="attr-ctrl">
        <button type="button" aria-label="Diminuir {a.nome}" onclick={() => onDelta(a.key, -1)}>−</button>
        <span class="attr-lvl" title="Nível">{valores[a.key]}</span>
        <button type="button" aria-label="Aumentar {a.nome}" onclick={() => onDelta(a.key, 1)}>+</button>
      </div>
    </div>
  {/each}
</div>

<style>
  .attrs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .attr {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 10px;
    box-shadow: var(--shadow-sm);
  }
  .attr-ico { font-size: 22px; }
  .attr-mid { flex: 1; min-width: 0; }
  .attr-nome {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--ink);
    white-space: nowrap;
  }
  .attr-nome small { margin-left: 4px; color: var(--gold); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.05em; }
  .attr-bonus {
    margin-top: 2px;
    font-size: 0.68rem;
    color: var(--ink-soft);
    line-height: 1.25;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .attr-ctrl { display: flex; align-items: center; gap: 4px; }
  .attr-ctrl button {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: var(--card-2);
    color: var(--ink);
    font-size: 1.1rem;
    font-weight: 800;
    cursor: pointer;
    touch-action: manipulation;
  }
  .attr-ctrl button:active { transform: scale(0.92); }
  .attr-lvl {
    min-width: 30px;
    text-align: center;
    font-weight: 800;
    font-size: 1rem;
    color: var(--gold);
    font-variant-numeric: tabular-nums;
  }
</style>
