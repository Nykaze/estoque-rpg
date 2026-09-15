let _socket = null;
let _state = null;
let _me = null;
let _pendingRender = false;
let _toastFn = null;

export const $appEl = document.getElementById('page');
export const $shell = document.getElementById('shell');
export const $authView = document.getElementById('auth-view');
export const $sidebar = document.getElementById('sidebar');
export const $topbar = document.getElementById('topbar');
export const $modalRoot = document.getElementById('modal-root');
export const $toastRoot = document.getElementById('toast-root');

export function getState() { return _state; }
export function setState(s) { _state = s; if (s.me) _me = s.me; }
export function getMe() { return _me; }
export function getSocket() { return _socket; }
export function setPendingRender(v) { _pendingRender = v; }
export function getPendingRender() { return _pendingRender; }
export function setToastFn(fn) { _toastFn = fn; }

export function send(action) {
  _socket.emit('action', action);
}

export function connectSocket() {
  _socket = io();
  _socket.on('connect', () => setConn(true));
  _socket.on('disconnect', () => setConn(false));

  _socket.on('hello', () => {});
  _socket.on('connect_error', () => {
    showLogin();
  });
  _socket.on('state', (s) => {
    _state = s;
    if (s.me) _me = s.me;
    showApp();
    scheduleRender();
  });
  _socket.on('actionError', (res) => { if (_toastFn) _toastFn(res.error || 'Erro na ação.', 'err'); });
}

function setConn(on) {
  const pill = document.getElementById('conn-pill');
  if (!pill) return;
  pill.classList.toggle('off', !on);
  document.getElementById('conn-label').textContent = on ? 'Conectado' : 'Offline';
}

export function showLogin() {
  if (window.location.pathname !== '/login.html') {
    window.location.replace('/login.html');
  }
}

export function showApp() {
  if (!_state) return;
  $authView.hidden = true;
  $shell.hidden = false;
}

export function scheduleRender() {
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && document.body.contains(ae)) {
    _pendingRender = true;
    ae.addEventListener('blur', () => {
      if (_pendingRender) { _pendingRender = false; import('./router.js').then((m) => m.render()); }
    }, { once: true });
    return;
  }
  import('./router.js').then((m) => m.render());
}

export function getMode() { return (document.documentElement.getAttribute('data-mode') || 'light'); }
export function getTheme() { return (document.documentElement.getAttribute('data-theme') || 'default'); }
export function setMode(mode) {
  document.documentElement.setAttribute('data-mode', mode);
  try { localStorage.setItem('estoque_mode', mode); } catch (e) {}
}
export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('estoque_theme', theme); } catch (e) {}
}

export function doLogin() {
  const userEl = document.getElementById('login-user');
  const passEl = document.getElementById('login-pass');
  const errEl = document.getElementById('login-error');
  if (!userEl || !passEl) return;
  if (!userEl.value.trim() || !passEl.value) {
    errEl.hidden = false;
    errEl.textContent = 'Informe usuário e senha.';
    return;
  }
  _socket.emit('login', { username: userEl.value.trim(), password: passEl.value });
}

export function renderLogin() {
  $authView.innerHTML = `
  <div class="login-bg">
    <form class="login-card" id="login-form">
      <div class="login-brand">
        <div class="brand-mark">E</div>
        <div><h1>${_state ? _state.settings.systemName : 'Estoque RPG'}</h1><p>Acesse com sua conta para continuar</p></div>
      </div>
      <div class="login-error" id="login-error" hidden></div>
      <div class="field">
        <label>Usuário</label>
        <input type="text" class="input" id="login-user" autocomplete="username" autofocus>
      </div>
      <div class="field">
        <label>Senha</label>
        <input type="password" class="input" id="login-pass" autocomplete="current-password">
      </div>
      <button type="submit" class="btn btn-primary btn-block">Entrar</button>
    </form>
  </div>`;
}
