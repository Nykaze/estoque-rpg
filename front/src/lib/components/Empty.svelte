<script lang="ts">
  import Icon from './Icon.svelte'
  let { message = 'Nada por aqui ainda', icon = 'box', hint = '' }: { message?: string; icon?: string; hint?: string } = $props()
</script>

<div class="empty">
  <div class="empty-ico"><Icon name={icon} size={26} /></div>
  <div class="empty-msg">{message}</div>
  {#if hint}<div class="empty-hint">{hint}</div>{/if}
</div>

<style>
  .empty {
    display: grid;
    place-items: center;
    text-align: center;
    padding: 32px 20px;
    border: 1px dashed var(--line);
    border-radius: 14px;
    background: var(--card);
    color: var(--ink-soft);
  }
  .empty-ico {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--card-2);
    border: 1px solid var(--line);
    color: var(--gold);
    margin-bottom: 10px;
  }
  .empty-msg { font-weight: 700; color: var(--ink); }
  .empty-hint { font-size: 0.8rem; margin-top: 4px; }
</style>
