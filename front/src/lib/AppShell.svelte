<script lang="ts">
  import { onMount } from 'svelte'
  import { me, connected, app } from './stores'
  import { route, navigate } from './router'
  import { canManage, isAdmin, initials } from './utils'
  import { apiLogout } from './api'
  import Icon from './components/Icon.svelte'

  let { children }: { children?: import('svelte').Snippet } = $props()

  let user = $derived($me)
  let st = $derived($app)
  let systemName = $derived(st?.settings?.systemName || 'Estoque RPG')

  let pinned = $state<string | null>(null)
  let hovered = $state<string | null>(null)
  let openKey = $derived<string | null>(pinned ?? hovered)
  let menuOpen = $state(false)

  let refs = $state<Record<string, HTMLElement>>({})
  let menuPos = $state({ left: 0, top: 0 })

  let closeTimer: ReturnType<typeof setTimeout> | undefined
  let rootEl: HTMLElement

  const openRpg = $derived(st?.rpgs?.find((r: any) => r.id === openKey) || null)

  $effect(() => {
    const id = openKey
    const el = id ? refs[id] : null
    if (!el) return
    const rect = el.getBoundingClientRect()
    menuPos = {
      left: Math.min(rect.left, window.innerWidth - 250),
      top: rect.bottom + 8
    }
  })

  onMount(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootEl && !rootEl.contains(e.target as Node)) pinned = null
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  })

  function enter(id: string) {
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = undefined
    }
    hovered = id
  }

  function armClose() {
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(() => {
      if (pinned === null) hovered = null
      closeTimer = undefined
    }, 160)
  }

  function togglePinned(id: string) {
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = undefined
    }
    pinned = pinned === id ? null : id
    if (pinned) hovered = id
  }

  function go(view: string, rpgId?: string) {
    pinned = null
    hovered = null
    menuOpen = false
    navigate({ view, rpgId } as any)
  }
</script>

<div class="shell" bind:this={rootEl}>
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark">{systemName.charAt(0)}</div>
      <div class="brand-text"><div class="brand-name">{systemName}</div><div class="brand-sub">Grimório do Mestre</div></div>
    </div>

    <button type="button" class="ham" aria-label="Menu" class:on={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
      <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
    </button>

    <nav class="topnav">
      <div class="topnav-scroll">
        <button
          type="button"
          class="top-item"
          class:on={$route.view === 'dashboard' && !$route.rpgId}
          onclick={() => go('dashboard')}
        >
          <Icon name="dash" size={16} /><span>Dashboard</span>
        </button>

        {#each st?.rpgs || [] as r (r.id)}
          <button
            type="button"
            class="top-item dd-trigger"
            class:on={$route.rpgId === r.id}
            class:open={openKey === r.id}
            bind:this={refs[r.id]}
            onmouseenter={() => enter(r.id)}
            onmouseleave={armClose}
            onclick={() => togglePinned(r.id)}
          >
            <Icon name="rpg" size={16} /><span class="truncate">{r.name}</span>
            <Icon name="chev" size={12} />
          </button>
        {/each}
      </div>

      {#if openRpg}
        <div class="dd-menu" role="menu" tabindex="-1" style:left={menuPos.left + 'px'} style:top={menuPos.top + 'px'} onmouseenter={() => enter(openRpg.id)} onmouseleave={armClose}>
          <div class="dd-head">{openRpg.name}</div>
          <button type="button" class="dd-item" onclick={() => go('dashboard')}>
            <Icon name="dash" size={15} /><span>Dashboard</span>
          </button>
          <button type="button" class="dd-item" onclick={() => go('mesa', openRpg.id)}>
            <Icon name="rpg" size={15} /><span>Mesa</span>
          </button>
          <button type="button" class="dd-item" onclick={() => go('fichas', openRpg.id)}>
            <Icon name="sheets" size={15} /><span>Fichas</span>
          </button>
          {#if canManage()}
            <button type="button" class="dd-item" onclick={() => go('monstros', openRpg.id)}>
              <Icon name="monster" size={15} /><span>Monstros</span>
            </button>
          {/if}
          <button type="button" class="dd-item" onclick={() => go('estoque', openRpg.id)}>
            <Icon name="box" size={15} /><span>Estoque <span class="dd-count">{openRpg.catalog?.length || 0} itens</span></span>
          </button>
          {#if canManage()}
            <button type="button" class="dd-item" onclick={() => go('config', openRpg.id)}>
              <Icon name="sliders" size={15} /><span>Configurar ficha</span>
            </button>
          {/if}
        </div>
      {/if}
    </nav>

    {#if menuOpen}
      <div class="mobile-menu" role="menu">
        <button type="button" class="mm-item" class:on={$route.view === 'dashboard' && !$route.rpgId} onclick={() => go('dashboard')}>
          <Icon name="dash" size={16} /><span>Dashboard</span>
        </button>
        {#each st?.rpgs || [] as r (r.id)}
          <div class="mm-group">
            <button type="button" class="mm-title" onclick={() => go('mesa', r.id)}>
              <Icon name="rpg" size={16} /><span class="truncate">{r.name}</span>
            </button>
            <div class="mm-links">
              <button type="button" class="mm-link" class:on={$route.rpgId === r.id && $route.view === 'mesa'} onclick={() => go('mesa', r.id)}>Mesa</button>
              <button type="button" class="mm-link" class:on={$route.rpgId === r.id && $route.view === 'fichas'} onclick={() => go('fichas', r.id)}>Fichas</button>
              {#if canManage()}
                <button type="button" class="mm-link" class:on={$route.rpgId === r.id && $route.view === 'monstros'} onclick={() => go('monstros', r.id)}>Monstros</button>
              {/if}
              <button type="button" class="mm-link" class:on={$route.rpgId === r.id && $route.view === 'estoque'} onclick={() => go('estoque', r.id)}>Estoque · {r.catalog?.length || 0}</button>
              {#if canManage()}
                <button type="button" class="mm-link" class:on={$route.rpgId === r.id && $route.view === 'config'} onclick={() => go('config', r.id)}>Configurar ficha</button>
              {/if}
            </div>
          </div>
        {/each}
        {#if canManage()}
          <button type="button" class="mm-item" class:on={$route.view === 'ajustes'} onclick={() => go('ajustes')}>
            <Icon name="gear" size={16} /><span>Ajustes</span>
          </button>
          {#if isAdmin()}
            <button type="button" class="mm-item" class:on={$route.view === 'usuarios'} onclick={() => go('usuarios')}>
              <Icon name="users" size={16} /><span>Usuários</span>
            </button>
          {/if}
        {/if}
        {#if user}
          <div class="mm-user">
            <span class="avatar">{initials(user.name)}</span>
            <div class="mm-user-meta"><div class="user-name">{user.name}</div><div class="user-role">{user.role}</div></div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="top-right">
      <div class="conn" class:off={!$connected}>
        <span class="conn-dot"></span><span class="conn-label">{$connected ? 'Conectado' : 'Offline'}</span>
      </div>
      {#if canManage()}
        <button type="button" class="icon-btn" title="Ajustes" class:on={$route.view === 'ajustes'} onclick={() => go('ajustes')}>
          <Icon name="gear" size={16} />
        </button>
        {#if isAdmin()}
          <button type="button" class="icon-btn" title="Usuários" class:on={$route.view === 'usuarios'} onclick={() => go('usuarios')}>
            <Icon name="users" size={16} />
          </button>
        {/if}
      {/if}
      {#if user}
        <div class="user-chip">
          <span class="avatar">{initials(user.name)}</span>
          <div class="user-meta"><div class="user-name">{user.name}</div><div class="user-role">{user.role}</div></div>
        </div>
        <button type="button" class="icon-btn danger" title="Sair" onclick={async () => { await apiLogout(); window.location.reload() }}>
          <Icon name="logout" size={16} />
        </button>
      {/if}
    </div>
  </header>

  <main class="content">
    {@render children?.()}
  </main>
</div>

<style>
  .shell { min-height: 100vh; display: flex; flex-direction: column; }
  .topbar {
    position: sticky; top: 0; z-index: 50;
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px;
    background: var(--bg-soft);
    border-bottom: 1px solid var(--line);
    box-shadow: var(--shadow-sm);
  }
  .brand { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
  .brand-mark {
    width: 38px; height: 38px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent2), var(--accent));
    color: #fff; display: grid; place-items: center;
    font-family: 'Playfair Display', serif; font-weight: 900; font-size: 1.2rem;
    clip-path: polygon(50% 0, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%);
  }
  .brand-name { font-family: 'Playfair Display', serif; font-weight: 900; color: var(--ink); font-size: 0.98rem; line-height: 1.1; }
  .brand-sub { color: var(--gold); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .topnav { position: relative; flex: 1; min-width: 0; }
  .topnav-scroll { display: flex; align-items: center; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .topnav-scroll::-webkit-scrollbar { display: none; }
  .top-item {
    display: inline-flex; align-items: center; gap: 6px;
    height: 40px; padding: 0 12px;
    background: none; border: 1px solid transparent;
    border-radius: 10px; color: var(--ink-soft);
    font-weight: 700; font-size: 0.85rem; cursor: pointer;
    font-family: inherit; white-space: nowrap; flex-shrink: 0;
  }
  .top-item.on { background: var(--card-2); color: var(--ink); }
  .top-item.open { background: var(--card-2); color: var(--ink); }
  .truncate { max-width: 130px; overflow: hidden; text-overflow: ellipsis; }
  .dd-menu {
    position: fixed; z-index: 70;
    min-width: 230px; max-width: calc(100vw - 16px);
    background: var(--card); border: 1px solid var(--line);
    border-radius: 14px; padding: 6px;
    box-shadow: var(--shadow-md);
    animation: ddpop 0.14s ease;
  }
  @keyframes ddpop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  .dd-head {
    padding: 8px 10px 6px; margin-bottom: 2px;
    font-family: 'Playfair Display', serif; font-weight: 800;
    color: var(--gold); font-size: 0.9rem;
    border-bottom: 1px solid var(--line);
  }
  .dd-item {
    display: flex; align-items: center; gap: 9px; width: 100%;
    background: none; border: none; text-align: left;
    color: var(--ink); font-weight: 600; font-size: 0.88rem;
    padding: 10px 10px; border-radius: 9px; cursor: pointer;
    font-family: inherit;
  }
  .dd-item:hover { background: var(--card-2); }
  .dd-count { margin-left: auto; color: var(--ink-soft); font-size: 0.7rem; font-weight: 700; }
  .top-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .conn { display: flex; align-items: center; gap: 5px; font-size: 0.68rem; color: var(--ink-soft); font-weight: 700; }
  .conn-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green, #4a9e7a); }
  .conn.off .conn-dot { background: var(--red, #c1453f); }
  .icon-btn {
    width: 36px; height: 36px; display: grid; place-items: center;
    background: none; border: 1px solid var(--line);
    border-radius: 10px; color: var(--ink-soft); cursor: pointer;
  }
  .icon-btn.on { background: var(--card-2); color: var(--gold); }
  .icon-btn.danger { color: var(--red, #c1453f); }
  .user-chip { display: flex; align-items: center; gap: 8px; }
  .avatar {
    width: 34px; height: 34px; flex-shrink: 0;
    background: var(--card-2); border: 1px solid var(--line);
    color: var(--gold); font-weight: 800; font-size: 0.85rem;
    display: grid; place-items: center; border-radius: 50%;
  }
  .user-name { color: var(--ink); font-weight: 700; font-size: 0.8rem; line-height: 1.1; }
  .user-role { color: var(--ink-soft); font-size: 0.65rem; text-transform: capitalize; }
  .ham {
    display: none; width: 38px; height: 38px; flex-shrink: 0;
    place-items: center;
    background: none; border: 1px solid var(--line);
    border-radius: 10px; color: var(--ink); cursor: pointer;
  }
  .ham.on { background: var(--card-2); color: var(--gold); }
  .mobile-menu {
    position: absolute; top: calc(100% + 8px); left: 8px; right: 8px; z-index: 90;
    background: var(--card); border: 1px solid var(--line);
    border-radius: 14px; padding: 8px;
    box-shadow: var(--shadow-md);
    max-height: calc(100vh - 90px); overflow-y: auto;
  }
  .mm-item, .mm-title {
    display: flex; align-items: center; gap: 9px; width: 100%;
    background: none; border: none; text-align: left;
    color: var(--ink); font-weight: 700; font-size: 0.9rem;
    padding: 10px; border-radius: 9px; cursor: pointer;
    font-family: inherit;
  }
  .mm-item.on { background: var(--card-2); color: var(--gold); }
  .mm-title { color: var(--gold); font-family: 'Playfair Display', serif; font-weight: 800; font-size: 0.95rem; }
  .mm-group { border-top: 1px solid var(--line); margin-top: 4px; padding-top: 6px; }
  .mm-links { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; padding: 2px 4px 8px; }
  .mm-link {
    background: none; border: 1px solid transparent; text-align: center;
    color: var(--ink-soft); font-weight: 600; font-size: 0.8rem;
    padding: 9px; border-radius: 8px; cursor: pointer; font-family: inherit;
  }
  .mm-link.on { color: var(--gold); border-color: var(--line); background: var(--card-2); }
  .mm-link:hover { background: var(--card-2); color: var(--ink); }
  .mm-user { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-top: 1px solid var(--line); }
  .content { flex: 1; padding: 16px 14px 32px; width: 100%; max-width: 1100px; margin: 0 auto; }

  @media (max-width: 900px) {
    .ham { display: grid; }
    .topnav { display: none; }
  }

  @media (max-width: 620px) {
    .conn-label, .user-meta { display: none; }
    .brand-name { font-size: 0.85rem; }
  }
</style>