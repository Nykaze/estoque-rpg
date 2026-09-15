<script lang="ts">
  import { app, pushToast } from '../stores'
  import { send } from '../socket'

  let st = $derived($app)
  let name = $state('')
  let passNew = $state('')
  let passConf = $state('')

  function saveName() {
    if (!name.trim()) { pushToast('Nome do sistema não pode ficar vazio.', 'err'); return }
    send({ type: 'updateSettings', systemName: name.trim() })
    pushToast('Nome do sistema salvo.')
  }
  function changePass() {
    if (passNew.length < 8) { pushToast('A senha deve ter no mínimo 8 caracteres.', 'err'); return }
    if (passNew !== passConf) { pushToast('As senhas não conferem.', 'err'); return }
    send({ type: 'changeOwnPassword', newPassword: passNew })
    pushToast('Senha alterada.')
    passNew = ''; passConf = ''
  }
</script>

<svelte:head><title>Ajustes</title></svelte:head>
<div class="head">
  <h1>Ajustes</h1>
  <div class="sub">Preferências do sistema</div>
</div>

{#if $app?.me?.role === 'admin'}
  <section class="card">
    <h2>Nome do sistema</h2>
    <div class="row">
      <input type="text" bind:value={name} placeholder={st?.settings?.systemName || 'Estoque RPG'} />
      <button type="button" onclick={saveName}>Salvar</button>
    </div>
  </section>
{/if}

<section class="card">
  <h2>Alterar senha</h2>
  <div class="fields">
    <label>Nova senha <input type="password" bind:value={passNew} autocomplete="new-password" /></label>
    <label>Confirmar senha <input type="password" bind:value={passConf} autocomplete="new-password" /></label>
    <button type="button" onclick={changePass}>Alterar</button>
  </div>
</section>

<section class="card">
  <h2>Sobre</h2>
  <p class="about">Estoque RPG — gestão de fichas e estoque para mesas de RPG.</p>
</section>

<style>
  .head { margin-bottom: 14px; }
  h1 { margin: 0; font-size: 1.5rem; color: var(--ink); }
  .sub { color: var(--ink-soft); font-size: 0.85rem; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; margin-bottom: 14px; box-shadow: var(--shadow-sm); }
  .card h2 { font-family: 'Playfair Display', serif; font-size: 1rem; color: var(--gold); margin: 0 0 12px; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
  input { flex: 1; min-width: 180px; height: 46px; border: 1px solid var(--line); background: var(--bg-soft); color: var(--ink); border-radius: 10px; padding: 0 12px; font-family: inherit; }
  input:focus { outline: none; border-color: var(--gold); }
  button { height: 46px; padding: 0 18px; border: none; border-radius: 10px; background: var(--accent2-2, var(--accent)); color: #fff; font-weight: 700; cursor: pointer; font-family: inherit; }
  .fields { display: grid; gap: 10px; }
  .fields label { display: grid; gap: 5px; color: var(--ink-soft); font-size: 0.82rem; font-weight: 600; }
  .about { color: var(--ink-soft); font-size: 0.88rem; margin: 0; }
</style>
