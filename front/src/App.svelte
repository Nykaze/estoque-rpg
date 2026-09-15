<script lang="ts">
  import { onMount } from 'svelte'
  import { app } from './lib/stores'
  import { apiMe } from './lib/api'
  import { connectSocket } from './lib/socket'
  import { route, initRouter } from './lib/router'
  import AppShell from './lib/AppShell.svelte'
  import Login from './lib/screens/Login.svelte'
  import Dashboard from './lib/screens/Dashboard.svelte'
  import Mesa from './lib/screens/Mesa.svelte'
  import Fichas from './lib/screens/Fichas.svelte'
  import Ficha from './lib/screens/Ficha.svelte'
  import Monstros from './lib/screens/Monstros.svelte'
  import Estoque from './lib/screens/Estoque.svelte'
  import Config from './lib/screens/Config.svelte'
  import Usuarios from './lib/screens/Usuarios.svelte'
  import Ajustes from './lib/screens/Ajustes.svelte'
  import Toasts from './lib/components/Toasts.svelte'

  let phase = $state<'loading' | 'login' | 'app'>('loading')

  onMount(async () => {
    const res = await apiMe()
    if (res.ok) {
      await connectSocket()
      initRouter()
      phase = 'app'
    } else {
      phase = 'login'
    }
  })
</script>

{#if phase === 'loading'}
  <div class="boot"><div class="boot-mark">E</div><p>Carregando o Grimório...</p></div>
{:else if phase === 'login'}
  <Login />
{:else}
  <AppShell>
    {#if $route?.view === 'dashboard'}
      <Dashboard />
    {:else if $route?.view === 'mesa' && $route.rpgId}
      <Mesa rpgId={$route.rpgId} />
    {:else if $route?.view === 'fichas' && $route.rpgId}
      <Fichas rpgId={$route.rpgId} />
    {:else if $route?.view === 'ficha' && $route.rpgId && $route.charId}
      <Ficha rpgId={$route.rpgId} charId={$route.charId} />
    {:else if $route?.view === 'monstros' && $route.rpgId}
      <Monstros rpgId={$route.rpgId} />
    {:else if $route?.view === 'estoque' && $route.rpgId}
      <Estoque rpgId={$route.rpgId} />
    {:else if $route?.view === 'config' && $route.rpgId}
      <Config rpgId={$route.rpgId} />
    {:else if $route?.view === 'usuarios'}
      <Usuarios />
    {:else if $route?.view === 'ajustes'}
      <Ajustes />
    {:else}
      <Dashboard />
    {/if}
  </AppShell>
{/if}

<Toasts />

<style>
  .boot { min-height: 100vh; display: grid; place-items: center; align-content: center; gap: 14px; color: var(--ink-soft); }
  .boot-mark {
    width: 64px; height: 64px;
    background: linear-gradient(135deg, var(--accent2), var(--accent));
    color: #fff; display: grid; place-items: center;
    font-family: 'Playfair Display', serif; font-weight: 900; font-size: 1.8rem;
    clip-path: polygon(50% 0, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%);
  }
  .boot p { font-size: 0.9rem; }
</style>
