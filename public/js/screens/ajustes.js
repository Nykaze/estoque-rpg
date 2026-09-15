import { getState } from '../state.js';
import { ICONS } from '../constants.js';
import { esc, isAdmin } from '../utils.js';

export function viewAjustes() {
  const state = getState();
  return `
  <div class="page-head"><div><h1>Ajustes</h1><div class="sub">Preferências gerais do sistema e da sua conta.</div></div></div>

  ${isAdmin() ? `
  <div class="card">
    <div class="card-head"><h2>Identidade do sistema</h2></div>
    <div class="card-body">
      <div class="field" style="max-width:340px;margin-bottom:12px">
        <label>Nome exibido no sistema</label>
        <input type="text" class="input" id="set-name" value="${esc(state.settings.systemName)}" maxlength="40">
      </div>
      <button class="btn btn-primary btn-sm" data-act="save-settings">Salvar alterações</button>
    </div>
  </div>` : ''}

  <div class="card">
    <div class="card-head"><h2>Trocar minha senha</h2></div>
    <div class="card-body" style="max-width:380px">
      <div class="field"><label>Senha atual</label><input type="password" class="input" id="pw-current" autocomplete="current-password"></div>
      <div class="field"><label>Nova senha (mín. 6 caracteres)</label><input type="password" class="input" id="pw-next" autocomplete="new-password"></div>
      <div class="field"><label>Confirmar nova senha</label><input type="password" class="input" id="pw-confirm" autocomplete="new-password"></div>
      <button class="btn btn-primary btn-sm" data-act="change-password">Alterar senha</button>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h2>Sobre</h2></div>
    <div class="card-body cell-muted" style="font-size:13px">
      ${esc(state.settings.systemName)} · plataforma web de gestão de fichas, atributos dinâmicos e estoque para mesas de RPG.<br>
      Sincronização em tempo real entre todos os dispositivos conectados.
    </div>
  </div>`;
}
