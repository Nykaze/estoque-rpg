<script lang="ts">
  interface Props {
    label: string
    value: string | number
    suffix?: string
    tone?: 'normal' | 'warn' | 'red' | 'green'
    foot?: string
  }
  let { label, value, suffix = '', tone = 'normal', foot = '' }: Props = $props()
</script>

<div class="tile {tone !== 'normal' ? tone : ''}">
  <div class="tile-val">{value}<small>{suffix}</small></div>
  <div class="tile-label">{label}</div>
  {#if foot}
    <div class="tile-foot">{foot}</div>
  {/if}
</div>

<style>
  .tile {
    background: linear-gradient(160deg, var(--card-2), var(--card));
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 14px;
    box-shadow: var(--shadow-sm);
    min-width: 0;
  }
  .tile-val {
    font-size: 1.7rem;
    font-weight: 900;
    color: var(--gold);
    font-variant-numeric: tabular-nums;
    font-family: 'Playfair Display', serif;
    line-height: 1;
  }
  .tile-val small { font-size: 0.75rem; color: var(--ink-soft); font-weight: 700; margin-left: 3px; }
  .tile-label { margin-top: 6px; color: var(--ink-soft); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .tile-foot { margin-top: 4px; color: var(--ink-soft); font-size: 0.72rem; }
  .tile.warn .tile-val { color: var(--orange, #d9a441); }
  .tile.red .tile-val { color: var(--red, #c1453f); }
  .tile.green .tile-val { color: var(--green, #4a9e7a); }
</style>
