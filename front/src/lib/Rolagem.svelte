<script lang="ts">
  let { etiqueta = 'Rolar' }: { etiqueta?: string } = $props()
  let mod = $state(0)
  let resultado = $state<{ dado: number; mod: number; total: number } | null>(null)

  function rolar() {
    const dado = Math.floor(Math.random() * 20) + 1
    resultado = { dado, mod, total: dado + mod }
  }
</script>

<div class="roll">
  <div class="roll-mod">
    <label for="roll-mod">Bônus</label>
    <input id="roll-mod" type="number" bind:value={mod} />
  </div>
  <button class="roll-btn" type="button" onclick={rolar}>
    <span class="d20" aria-hidden="true">⛃</span>
    {etiqueta}
  </button>

  {#if resultado}
    <div class="roll-res" aria-live="polite">
      <span class="dice">{resultado.dado}</span>
      <span class="plus">{resultado.mod >= 0 ? '+' : '−'}{Math.abs(resultado.mod)}</span>
      <span class="total">{resultado.total}</span>
    </div>
  {/if}
</div>

<style>
  .roll { display: flex; flex-direction: column; gap: 10px; }
  .roll-mod {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 8px 10px;
  }
  .roll-mod label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--ink-soft); }
  .roll-mod input {
    width: 70px;
    text-align: center;
    font-size: 1.1rem;
    font-weight: 800;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--card-2);
    color: var(--gold);
    padding: 6px;
  }
  .roll-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 56px;
    border-radius: 14px;
    border: none;
    background: var(--accent);
    color: #fff;
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    cursor: pointer;
    touch-action: manipulation;
  }
  .roll-btn:active { transform: scale(0.97); }
  .d20 { font-size: 1.4rem; }
  .roll-res {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 14px;
    border-radius: 14px;
    background: var(--card);
    border: 1px solid var(--line);
  }
  .dice { font-size: 2.2rem; font-weight: 900; color: var(--gold); font-variant-numeric: tabular-nums; }
  .plus { color: var(--ink-soft); font-size: 1rem; font-weight: 700; }
  .total { font-size: 2.2rem; font-weight: 900; color: var(--ink); font-variant-numeric: tabular-nums; }
</style>
