<script lang="ts">
  import { PERICIAS, type Pericia } from './data'

  let { valores, onDelta }: { valores: Record<string, number>; onDelta: (id: string, d: number) => void } = $props()

  let pericias = $derived(
    PERICIAS.map((p) => ({ ...p, valor: valores[p.id] ?? 0 }) as Pericia)
  )
</script>

<ul class="per">
  {#each pericias as p (p.id)}
    <li class="per-item">
      <div class="per-info">
        <button class="per-nome" type="button" onclick={() => onDelta(p.id, 1)}>
          {p.nome}
          <small>{p.com}</small>
        </button>
      </div>
      <div class="per-ctrl">
        <button class="per-step" type="button" aria-label="Diminuir {p.nome}" onclick={() => onDelta(p.id, -1)}>−</button>
        <span class="pips" aria-hidden="true">
          {#each Array(5) as _, i}
            <span class="pip" class:on={i < p.valor}></span>
          {/each}
        </span>
        <button class="per-step" type="button" aria-label="Aumentar {p.nome}" onclick={() => onDelta(p.id, 1)}>+</button>
      </div>
    </li>
  {/each}
</ul>

<style>
  .per { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .per-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 8px 10px;
  }
  .per-info { flex: 1; min-width: 0; }
  .per-nome {
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--ink);
    cursor: pointer;
    width: 100%;
    font-family: inherit;
  }
  .per-nome small {
    display: block;
    color: var(--ink-soft);
    font-size: 0.68rem;
    font-weight: 600;
  }
  .per-ctrl { display: flex; align-items: center; gap: 6px; }
  .per-step {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: var(--card-2);
    color: var(--ink);
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
  }
  .per-step:active { transform: scale(0.92); }
  .pips { display: inline-flex; gap: 3px; }
  .pip {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--track);
    border: 1px solid var(--line);
  }
  .pip.on { background: var(--gold); border-color: var(--gold); }
</style>
