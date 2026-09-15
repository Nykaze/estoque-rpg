<script lang="ts">
  import { MV_META } from '../constants'
  import { fmtDateTime, relTime } from '../utils'

  let { mv }: { mv: any } = $props()
  const meta = MV_META[mv.type] || { label: mv.type, cls: '', color: 'var(--faint)' }
</script>

<div class="mv">
  <span class="mv-dot" style="background:{meta.color}"></span>
  <div class="mv-body">
    <div class="mv-line">
      <span class="mv-item">{mv.itemName}</span>
      {#if mv.charName && mv.charName !== '—' && mv.charName !== '-'}
        <span class="mv-to">→ {mv.charName}</span>
      {/if}
      {#if mv.qty > 1}<span class="mv-qty">×{mv.qty}</span>{/if}
    </div>
    <div class="mv-sub">
      {#if mv.at}<span>{fmtDateTime(mv.at)}</span>{/if}
      {#if mv.byName}<span>· {mv.byName}</span>{/if}
      {#if mv.reason}<span class="mv-reason">· {mv.reason}</span>{/if}
    </div>
  </div>
  <span class="mv-badge" class:mv-saida={meta.cls === 'mv-saida'} class:mv-entrada={meta.cls === 'mv-entrada'} class:mv-devolucao={meta.cls === 'mv-devolucao'} class:mv-baixa={meta.cls === 'mv-baixa'} class:mv-remocao={meta.cls === 'mv-remocao'} class:mv-limpeza={meta.cls === 'mv-limpeza'}>
    {meta.label}
  </span>
</div>

<style>
  .mv {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid var(--line);
  }
  .mv:last-child { border-bottom: none; }
  .mv-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .mv-body { flex: 1; min-width: 0; }
  .mv-line { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
  .mv-item { font-weight: 700; color: var(--ink); font-size: 0.9rem; }
  .mv-to { color: var(--ink-soft); font-size: 0.82rem; }
  .mv-qty { color: var(--gold); font-weight: 800; font-size: 0.82rem; }
  .mv-sub { color: var(--ink-soft); font-size: 0.72rem; margin-top: 1px; }
  .mv-reason { font-style: italic; }
  .mv-badge {
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 3px 8px;
    border-radius: 999px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .mv-saida { background: color-mix(in srgb, var(--blue,#7a9cc0) 20%, transparent); color: var(--blue,#7a9cc0); }
  .mv-entrada, .mv-devolucao { background: color-mix(in srgb, var(--green,#4a9e7a) 20%, transparent); color: var(--green,#4a9e7a); }
  .mv-baixa, .mv-limpeza { background: color-mix(in srgb, var(--red,#c1453f) 20%, transparent); color: var(--red,#c1453f); }
  .mv-remocao { background: color-mix(in srgb, var(--faint,#888) 20%, transparent); color: var(--faint,#888); }
</style>
