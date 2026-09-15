<script lang="ts">
  import { me } from '../stores'
  import { apiLogin } from '../api'

  let user = $state('')
  let pass = $state('')
  let err = $state('')
  let busy = $state(false)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    err = ''
    if (!user.trim() || !pass) { err = 'Informe usuário e senha.'; return }
    busy = true
    const res = await apiLogin(user.trim(), pass)
    busy = false
    if (res.ok) {
      window.location.reload()
    } else {
      err = res.error || 'Usuário ou senha inválidos.'
    }
  }
</script>

<div class="login-bg">
  <form class="login-card" onsubmit={submit}>
    <div class="login-brand">
      <div class="brand-mark">E</div>
      <div>
        <h1>Estoque RPG</h1>
        <p>Acesse com sua conta para continuar</p>
      </div>
    </div>
    {#if err}<div class="login-error">{err}</div>{/if}
    <label class="field">Usuário
      <input type="text" bind:value={user} autocomplete="username" autofocus />
    </label>
    <label class="field">Senha
      <input type="password" bind:value={pass} autocomplete="current-password" />
    </label>
    <button type="submit" class="btn" disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</button>
  </form>
</div>

<style>
  .login-bg { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
  .login-card {
    width: 100%; max-width: 340px;
    background: var(--card); border: 1px solid var(--line);
    border-radius: 18px; padding: 26px; box-shadow: var(--shadow-md);
    display: grid; gap: 12px;
  }
  .login-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .brand-mark {
    width: 48px; height: 48px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent2), var(--accent));
    color: #fff; display: grid; place-items: center;
    font-family: 'Playfair Display', serif; font-weight: 900; font-size: 1.5rem;
    clip-path: polygon(50% 0, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%);
  }
  .login-brand h1 { margin: 0; font-family: 'Playfair Display', serif; font-size: 1.3rem; color: var(--ink); }
  .login-brand p { margin: 0; color: var(--ink-soft); font-size: 0.8rem; }
  .login-error { background: color-mix(in srgb, var(--red,#c1453f) 15%, transparent); color: var(--red,#c1453f); padding: 10px 12px; border-radius: 10px; font-size: 0.85rem; }
  .field { display: grid; gap: 5px; color: var(--ink-soft); font-size: 0.8rem; font-weight: 600; }
  .field input {
    height: 46px; border: 1px solid var(--line); background: var(--bg-soft);
    border-radius: 10px; color: var(--ink); padding: 0 12px; font-family: inherit; font-size: 0.95rem;
  }
  .field input:focus { outline: none; border-color: var(--gold); }
  .btn {
    height: 48px; border: none; border-radius: 12px;
    background: var(--accent2-2, var(--accent)); color: #fff;
    font-weight: 800; font-size: 1rem; cursor: pointer; font-family: inherit;
  }
  .btn:disabled { opacity: 0.6; }
</style>
