<script lang="ts">
  import { toasts } from '../stores'
</script>

<div class="toasts">
  {#each $toasts as t (t.id)}
    <div class="toast" class:err={t.kind === 'err'}>{t.msg}</div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: calc(100% - 24px);
    max-width: 360px;
    pointer-events: none;
  }
  .toast {
    background: var(--card-2);
    border: 1px solid var(--line);
    border-left: 4px solid var(--green, #4a9e7a);
    color: var(--ink);
    padding: 12px 14px;
    border-radius: 10px;
    box-shadow: var(--shadow-md);
    font-size: 0.88rem;
    font-weight: 600;
    animation: slidein 0.18s ease;
  }
  .toast.err { border-left-color: var(--red, #c1453f); }
  @keyframes slidein {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
