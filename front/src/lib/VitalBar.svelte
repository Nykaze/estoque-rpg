<script lang="ts">
  import type { Recurso } from './data'

  let { recurso, onDelta }: { recurso: Recurso; onDelta: (d: number) => void } = $props()

  let pct = $derived(Math.max(0, Math.min(100, (recurso.valor / Math.max(1, recurso.max)) * 100)))
</script>

<div class="vital" class:low={pct <= 25}>
  <div class="vital-head">
    <span class="vital-ico" aria-hidden="true">{recurso.icone}</span>
    <span class="vital-nome">{recurso.nome}</span>
    <span class="vital-val">{recurso.valor}<small>/{recurso.max}</small></span>
  </div>

  <div class="vital-row">
    <button class="step" type="button" aria-label="Diminuir {recurso.nome}" onclick={() => onDelta(-1)}>−</button>
    <div class="bar-track" role="meter" aria-valuemin={0} aria-valuemax={recurso.max} aria-valuenow={recurso.valor}>
      <div class="bar-fill" style="width:{pct}%"></div>
    </div>
    <button class="step" type="button" aria-label="Aumentar {recurso.nome}" onclick={() => onDelta(1)}>+</button>
  </div>
</div>

<style>
  .vital {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 10px 12px;
    box-shadow: var(--shadow-sm);
  }
  .vital-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .vital-ico { font-size: 18px; }
  .vital-nome {
    font-weight: 700;
    letter-spacing: 0.06em;
    font-size: 0.85rem;
    text-transform: uppercase;
    color: var(--ink);
  }
  .vital-val {
    margin-left: auto;
    font-weight: 800;
    font-size: 1.1rem;
    font-variant-numeric: tabular-nums;
    color: var(--gold);
  }
  .vital-val small { font-size: 0.7rem; color: var(--ink-soft); font-weight: 600; }
  .vital-row { display: flex; align-items: center; gap: 10px; }
  .step {
    min-width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--card-2);
    color: var(--ink);
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1;
    cursor: pointer;
    touch-action: manipulation;
  }
  .step:active { transform: scale(0.94); }
  .bar-track {
    flex: 1;
    height: 18px;
    background: var(--track);
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid var(--line);
  }
  .bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 999px;
    transition: width 0.2s ease;
  }
  .vital.low .bar-fill { background: var(--danger); }
</style>
