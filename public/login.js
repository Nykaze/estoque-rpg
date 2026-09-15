(function () {
  var form = document.getElementById('login-form');
  var errBox = document.getElementById('login-error');
  var btn = document.getElementById('login-btn');
  var btnLabel = document.getElementById('login-btn-label');

  function showError(msg) {
    errBox.textContent = msg;
    errBox.hidden = false;
  }

  function setLoading(on) {
    btn.disabled = on;
    btnLabel.textContent = on ? 'Entrando…' : 'Entrar';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errBox.hidden = true;

    var username = form.username.value.trim();
    var password = form.password.value;

    if (!username || !password) {
      showError('Informe usuário e senha.');
      return;
    }

    setLoading(true);
    try {
      var resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password }),
        credentials: 'same-origin'
      });

      if (resp.status === 429) {
        showError('Muitas tentativas. Aguarde um instante e tente novamente.');
        return;
      }

      var data = null;
      try { data = await resp.json(); } catch (_) {}
      if (!resp.ok || !data || !data.ok) {
        showError((data && data.error) || 'Usuário ou senha incorretos.');
        return;
      }

      window.location.href = '/';
    } catch (_) {
      showError('Não foi possível conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  });

  form.username.focus();
})();