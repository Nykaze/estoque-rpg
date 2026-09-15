import { getState, getMe } from '../state.js';
import { ICONS, ROLE_LABELS } from '../constants.js';
import { esc, fmtDate } from '../utils.js';

export function viewUsuarios() {
  const state = getState();
  const me = getMe();
  const users = state.users || [];
  return `
  <div class="page-head">
    <div><h1>Usuários</h1><div class="sub">Contas com acesso ao sistema e seus níveis de permissão.</div></div>
    <div class="page-actions"><button class="btn btn-primary" data-act="user-edit-modal">${ICONS.plus} Novo usuário</button></div>
  </div>
  <div class="card">
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Usuário</th><th>Nome</th><th>Perfil</th><th>Criado em</th><th>Ativo</th><th></th></tr></thead>
      <tbody>${users.map((u) => `
        <tr>
          <td class="cell-strong">@${esc(u.username)}</td>
          <td>${esc(u.name)}${u.id === me.id ? ' <span class="badge badge-blue">você</span>' : ''}</td>
          <td><span class="badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'gestor' ? 'badge-blue' : 'badge-gray'}">${ROLE_LABELS[u.role]}</span></td>
          <td class="cell-muted">${fmtDate(u.createdAt)}</td>
          <td>${u.active ? '<span class="badge badge-green">Sim</span>' : '<span class="badge badge-red">Não</span>'}</td>
          <td><div class="row-actions">
            <button class="icon-btn" data-act="user-edit-modal" data-sub="${u.id}" title="Editar">${ICONS.pencil}</button>
            ${u.id !== me.id ? `<button class="icon-btn danger" data-act="user-del" data-sub="${u.id}" title="Excluir">${ICONS.trash}</button>` : ''}
          </div></td>
        </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}
