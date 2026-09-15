<script lang="ts">
  import { personagemMock } from './seed'
  import { ATRIBUTOS, BONUS_NIVEL, bonusDe, type AttrKey, type Recurso } from './data'
  import VitalBar from './VitalBar.svelte'
  import Atributos from './Atributos.svelte'
  import Pericias from './Pericias.svelte'
  import Rolagem from './Rolagem.svelte'

  let p = $state({ ...personagemMock })

  function deltaRecurso(key: Recurso['key'], d: number) {
    const r = p.recursos[key]
    r.valor = Math.max(0, Math.min(r.max, r.valor + d))
  }

  function deltaAtributo(key: AttrKey, d: number) {
    p.atributos[key] = Math.max(0, Math.min(10, p.atributos[key] + d))
  }

  function deltaPericia(id: string, d: number) {
    p.pericias[id] = Math.max(0, Math.min(5, (p.pericias[id] ?? 0) + d))
  }

  let aba = $state<'atributos' | 'pericias' | 'runas' | 'rolagem'>('atributos')

  const recursos: Recurso[] = [
    { key: 'vida', nome: 'Vida', abrev: 'VIDA', icone: '🛡️', ...p.recursos.vida },
    { key: 'mana', nome: 'Mana', abrev: 'MANA', icone: '✨', ...p.recursos.mana },
    { key: 'esforco', nome: 'Esforço', abrev: 'ESF', icone: '⚡', ...p.recursos.esforco }
  ]
</script>

<main class="ficha">
  <header class="hero">
    <div class="avatar" aria-hidden="true">
      <span class="avatar-inner">{p.nome.charAt(0)}</span>
    </div>
    <div class="hero-info">
      <h1>{p.nome}</h1>
      <p>{p.classe} · Nv {p.nivel}</p>
      <p class="reil">◉ {p.reil} Reil</p>
    </div>
  </header>

  <section class="vitais" aria-label="Recursos">
    {#each recursos as r (r.key)}
      <VitalBar recurso={r} onDelta={(d) => deltaRecurso(r.key, d)} />
    {/each}
  </section>

  <Rolagem />

  <nav class="tabs" aria-label="Seções da ficha">
    <button type="button" class:on={aba === 'atributos'} onclick={() => (aba = 'atributos')}>Atributos</button>
    <button type="button" class:on={aba === 'pericias'} onclick={() => (aba = 'pericias')}>Perícias</button>
    <button type="button" class:on={aba === 'runas'} onclick={() => (aba = 'runas')}>Runas</button>
  </nav>

  <section class="panel">
    {#if aba === 'atributos'}
      <Atributos valores={p.atributos} onDelta={deltaAtributo} />
      <details class="bonus" open>
        <summary>Tabela de bônus por nível</summary>
        <table>
          <thead>
            <tr><th>Nv</th>{#each ATRIBUTOS as a}<th>{a.abrev}</th>{/each}</tr>
          </thead>
          <tbody>
            {#each BONUS_NIVEL as b}
              <tr>
                <td class="nlv">{b.nivel}</td>
                <td>{b.forca}</td>
                <td>{b.vigor}</td>
                <td>{b.agilidade}</td>
                <td>{b.inteligencia}</td>
                <td>{b.sabedoria}</td>
                <td>{b.influencia}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </details>
    {:else if aba === 'pericias'}
      <Pericias valores={p.pericias} onDelta={deltaPericia} />
    {:else if aba === 'runas'}
      <div class="runas">
        <p>Slots de runa: <strong>{p.slotsRuna}</strong></p>
        {#each p.runas as r}
          <div class="runa">{r}</div>
        {/each}
      </div>
    {/if}
  </section>
</main>

<style>
  .ficha { max-width: 640px; margin: 0 auto; padding: 16px 14px 96px; display: grid; gap: 12px; }
  .hero {
    display: flex;
    align-items: center;
    gap: 14px;
    background: linear-gradient(135deg, var(--card-2), var(--card));
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 14px;
    box-shadow: var(--shadow-md);
  }
  .avatar {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    background: repeating-linear-gradient(45deg, var(--gold), var(--gold) 6px, var(--card-2) 6px, var(--card-2) 12px);
    clip-path: polygon(50% 0, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%);
    display: grid;
    place-items: center;
  }
  .avatar-inner {
    width: 54px;
    height: 54px;
    clip-path: polygon(50% 0, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%);
    background: var(--card);
    display: grid;
    place-items: center;
    font-size: 1.6rem;
    font-weight: 900;
    color: var(--gold);
  }
  .hero-info h1 { margin: 0; font-size: 1.3rem; color: var(--ink); }
  .hero-info p { margin: 2px 0; color: var(--ink-soft); font-size: 0.85rem; }
  .hero-info .reil { color: var(--gold); font-weight: 800; }
  .vitais { display: grid; gap: 10px; }
  .tabs {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    gap: 6px;
    background: rgba(20, 17, 16, 0.95);
    backdrop-filter: blur(6px);
    padding: 6px;
    border-radius: 14px;
    border: 1px solid var(--line);
  }
  .tabs button {
    flex: 1;
    height: 44px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: var(--ink-soft);
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    font-family: inherit;
  }
  .tabs button.on { background: var(--accent); color: #fff; }
  .panel { display: grid; gap: 12px; }
  .bonus { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; }
  .bonus summary { cursor: pointer; font-weight: 700; color: var(--ink); }
  .bonus table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 0.6rem;
  }
  .bonus th, .bonus td { border: 1px solid var(--line); padding: 4px; color: var(--ink-soft); text-align: center; }
  .bonus th { color: var(--gold); font-weight: 800; }
  .bonus td.nlv { font-weight: 900; color: var(--gold); }
  .runas { display: grid; gap: 8px; }
  .runas p { color: var(--ink-soft); }
  .runa {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 14px;
    font-weight: 700;
    color: var(--ink);
  }
</style>
