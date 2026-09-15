<script lang="ts">
  import { app, me, pushToast } from '../stores'
  import { fmtDate, initials } from '../utils'
  import { ROLE_LABELS } from '../constants'
  import { send } from '../socket'
  import Empty from '../components/Empty.svelte'
  import Icon from '../components/Icon.svelte'

  let st = $derived($app)
  let users = $derived(st?.users || [])
  let self = $derived($me)

  let mode = $state<'new' | 'edit' | null>(null)
  let editing = $state<any>(null)

  const emptyForm = () => ({ username: '', name: '', role: 'jogador', password: '' })
  let form = $state(emptyForm())

  let editName = $state('')
  let editRole = $state('jogador')
  let editActive = $state(true)
  let editPass = $state('')

  function openNew() {
    form = emptyForm()
    mode = 'new'
  }

  function openEdit(u: any) {
    editing = u
    editName = u.name || u.username
    editRole = u.role
    editActive = u.active !== false
    editPass = ''
    mode = 'edit'
  }

  function submitNew() {
    const username = form.username.trim().toLowerCase()
    if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
      pushToast('Usuário inválido (3-24 letras/números, sem espaços).', 'err')
      return
    }
    if (form.password.length < 6) {
      pushToast('A senha deve ter no mínimo 6 caracteres.', 'err')
      return
    }
    send({ type: 'createUser', username, name: form.name.trim() || username, role: form.role, password: form.password })
    pushToast('Usuário criado.')
    mode = null
  }

  function submitEdit() {
    const patch: Record<string, any> = { name: editName.trim(), role: editRole, active: editActive }
    if (editPass.length >= 6) patch.password = editPass
    send({ type: 'updateUser', userId: editing.id, patch })
    pushToast('Usuário atualizado.')
    mode = null
  }

  function removeUser(u: any) {
    if (u.id === self?.id) {
      pushToast('Você não pode excluir a si mesmo.', 'err')
      return
    }
    if (confirm(`Excluir o usuário @${u.username}?`)) {
      send({ type: 'deleteUser', userId: u.id })
      pushToast('Usuário excluído.')
    }
  }
</script>

<svelte:head><title>Usuários</title></svelte:head>

<div class="head">
  <h1>Usuários</h1>
  <div class="sub">Gerenciar contas de acesso</div>
  <div class="page-actions">
    <button type="button" class="btn-primary" onclick={openNew}><Icon name="plus" size={15} /> Novo usuário</button>
  </div>
</div>

{#if users.length}
  <div class="table-wrap">
    <table>
      <thead>
        <tr><th>Usuário</th><th>Nome</th><th>Perfil</th><th>Criado em</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        {#each users as u (u.id)}
          <tr>
            <td><span class="u">{initials(u.name)}</span> @{u.username}{#if u.id === self?.id} <span class="you">você</span>{/if}</td>
            <td>{u.name}</td>
            <td><span class="role">{ROLE_LABELS[u.role] || u.role}</span></td>
            <td>{fmtDate(u.createdAt)}</td>
            <td><span class="st" class:off={u.active === false}>{u.active === false ? 'Inativo' : 'Ativo'}</span></td>
            <td>
              <div class="row-actions">
                <button type="button" class="icon-btn" title="Editar" onclick={() => openEdit(u)}><Icon name="pencil" size={14} /></button>
                {#if u.id !== self?.id}
                  <button type="button" class="icon-btn danger" title="Excluir" onclick={() => removeUser(u)}><Icon name="trash" size={14} /></button>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <Empty message="Nenhum usuário" icon="users" />
{/if}

{#if mode === 'new'}
  <div class="overlay" onclick={() => (mode = null)}>
    <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); submitNew() }}>
      <div class="modal-head"><h3>Novo usuário</h3><button type="button" class="icon-close" onclick={() => (mode = null)}><Icon name="x" size={16} /></button></div>
      <label class="field">Usuário <span class="req">*</span>
        <input type="text" bind:value={form.username} maxlength="24" placeholder="Ex: joao" />
      </label>
      <label class="field">Nome de exibição
        <input type="text" bind:value={form.name} maxlength="40" placeholder="Nome do jogador/mestre" />
      </label>
      <label class="field">Perfil
        <select bind:value={form.role}>
          <option value="jogador">Jogador</option>
          <option value="gestor">Gestor (mestre)</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      <label class="field">Senha <span class="req">*</span>
        <input type="password" bind:value={form.password} placeholder="Mínimo 6 caracteres" />
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" onclick={() => (mode = null)}>Cancelar</button>
        <button type="submit" class="btn-primary">Criar usuário</button>
      </div>
    </form>
  </div>
{/if}

{#if mode === 'edit'}
  <div class="overlay" onclick={() => (mode = null)}>
    <form class="modal" onclick={(e) => e.stopPropagation()} onsubmit={(e) => { e.preventDefault(); submitEdit() }}>
      <div class="modal-head"><h3>Editar @{editing.username}</h3><button type="button" class="icon-close" onclick={() => (mode = null)}><Icon name="x" size={16} /></button></div>
      <label class="field">Nome de exibição
        <input type="text" bind:value={editName} maxlength="40" />
      </label>
      <label class="field">Perfil
        <select bind:value={editRole}>
          <option value="jogador">Jogador</option>
          <option value="gestor">Gestor (mestre)</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={editActive} /> Conta ativa
      </label>
      <label class="field">Nova senha <span class="hint">(deixe em branco para manter)</span>
        <input type="password" bind:value={editPass} placeholder="Mínimo 6 caracteres" />
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" onclick={() => (mode = null)}>Cancelar</button>
        <button type="submit" class="btn-primary">Salvar</button>
      </div>
    </form>
  </div>
{/if}

<style>
  .head { margin-bottom: 14px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  h1 { margin: 0; font-size: 1.5rem; color: var(--ink); }
  .sub { color: var(--ink-soft); font-size: 0.85rem; }
  .page-actions { display: flex; gap: 8px; }
  .btn-primary, .btn {
    display: inline-flex; align-items: center; gap: 6px;
    border: 1px solid var(--line); border-radius: 10px;
    padding: 8px 14px; font-weight: 700; font-size: 0.82rem; cursor: pointer;
    font-family: inherit;
  }
  .btn-primary { background: linear-gradient(135deg, var(--accent2), var(--accent)); color: #fff; border-color: transparent; }
  .btn { background: var(--card); color: var(--ink); }
  .table-wrap { background: var(--card); border: 1px solid var(--line); border-radius: 14px; overflow-x: auto; box-shadow: var(--shadow-sm); }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 640px; }
  th { text-align: left; color: var(--gold); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px; border-bottom: 1px solid var(--line); }
  td { padding: 12px; border-bottom: 1px solid var(--line); color: var(--ink); }
  tr:last-child td { border-bottom: none; }
  .u { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--card-2); border: 1px solid var(--line); color: var(--gold); font-weight: 800; font-size: 0.7rem; margin-right: 6px; vertical-align: middle; }
  .you { color: var(--gold); font-size: 0.72rem; font-weight: 700; }
  .role { background: color-mix(in srgb, var(--gold,#c9a55a) 15%, transparent); color: var(--gold); padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
  .st { color: var(--green,#4a9e7a); font-weight: 800; font-size: 0.75rem; }
  .st.off { color: var(--faint,#888); }
  .row-actions { display: flex; gap: 6px; justify-content: flex-end; }
  .icon-btn {
    width: 30px; height: 30px; display: grid; place-items: center;
    background: var(--card-2); border: 1px solid var(--line);
    border-radius: 8px; color: var(--ink-soft); cursor: pointer;
  }
  .icon-btn.danger { color: var(--red,#c1453f); }
  .overlay { position: fixed; inset: 0; z-index: 80; background: rgba(6,6,10,.55); display: grid; place-items: center; padding: 16px; backdrop-filter: blur(2px); }
  .modal { width: 100%; max-width: 380px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; gap: 12px; }
  .modal-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .modal-head h3 { margin: 0; font-family: 'Playfair Display', serif; font-size: 1.15rem; color: var(--ink); }
  .icon-close { width: 30px; height: 30px; display: grid; place-items: center; background: none; border: none; color: var(--ink-soft); cursor: pointer; }
  .field { display: flex; flex-direction: column; gap: 5px; color: var(--ink); font-weight: 600; font-size: 0.8rem; }
  .field input, .field select {
    padding: 9px 11px; border-radius: 9px; border: 1px solid var(--line);
    background: var(--bg-soft); color: var(--ink); font-family: inherit; font-size: 0.9rem;
  }
  .req { color: var(--red,#c1453f); }
  .hint { color: var(--ink-soft); font-size: 0.72rem; font-weight: 500; }
  .check { display: flex; align-items: center; gap: 8px; color: var(--ink); font-size: 0.85rem; font-weight: 600; cursor: pointer; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
</style>