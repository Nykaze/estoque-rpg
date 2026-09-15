const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const PORT = 4011;
const DIR = path.join(__dirname, '..', 'rt-test-tmp');
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });

const users = {
  secret: 'test-secret',
  users: [
    { id: 'u_admin', username: 'admin', name: 'Administrador', role: 'admin', active: true, passHash: bcrypt.hashSync('admin123', 10), createdAt: Date.now() },
  ],
};
fs.writeFileSync(path.join(DIR, 'users.json'), JSON.stringify(users, null, 2), 'utf8');
fs.writeFileSync(path.join(DIR, 'data.json'), '{}', 'utf8');

const child = spawn(process.execPath, [path.join(__dirname, '..', 'deploy-app.js')], {
  env: {
    ...process.env,
    PORT: String(PORT),
    DATA_FILE: path.join(DIR, 'data.json'),
    USERS_FILE: path.join(DIR, 'users.json'),
    RUNAS_FILE: path.join(DIR, 'runas.json'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', () => {});
child.stderr.on('data', () => {});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitUp() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/api/me`);
      if (r.status === 200 || r.status === 401) return true;
    } catch {}
    await sleep(250);
  }
  throw new Error('server nao subiu');
}

(async () => {
  let pass = false;
  try {
    await waitUp();
    const { io } = require('socket.io-client');

    const login = await fetch(`http://localhost:${PORT}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    console.log('login ok');

    const mk = () =>
      io(`http://localhost:${PORT}`, {
        transports: ['polling'],
        extraHeaders: { Cookie: cookie },
        reconnection: false,
      });
    const a = mk();
    const b = mk();
    const stA = await new Promise((res) => a.on('state', (s) => res(s)));
    await new Promise((res) => b.on('state', (s) => res(s)));
    const rpg = stA.rpgs[0];
    console.log('estado inicial ok, rpgs:', stA.rpgs.length);

    let gotB = 0;
    let bLast = null;
    let errs = [];
    b.on('state', (s) => { gotB++; bLast = s });
    b.on('actionError', (e) => errs.push('B:' + e.error));
    a.on('actionError', (e) => errs.push('A:' + e.error));

    a.emit('action', { type: 'createCharacter', rpgId: rpg.id, name: 'Teste Nan' });
    await sleep(900);
    const char = bLast.characters[0];
    console.log('char criado:', char && char.name, '| broadcasts ao total:', gotB, '| errs:', errs.length);

    const charId = char.id;
    a.emit('action', { type: 'setFormula', rpgId: rpg.id, formula: { name: 'Defesa', expr: '(FORÇA + SABEDORIA) * 2' } });
    await sleep(900);
    a.emit('action', { type: 'setFormulaBuff', charId, name: 'DEFESA', value: 7 });
    await sleep(900);
    const nb = bLast.characters[0];
    console.log('buffs DEFESA apos set:', nb.formulaBuffs && nb.formulaBuffs.DEFESA, '| broadcasts:', gotB, '| errs:', JSON.stringify(errs));
    pass = !!(nb && nb.formulaBuffs && nb.formulaBuffs.DEFESA === 7 && gotB >= 3);
    console.log(pass ? 'ACTION+RT OK' : 'ACTION+RT FALHOU');

    a.close();
    b.close();
  } catch (e) {
    console.error('ERRO TESTE:', e.message);
  } finally {
    child.kill();
    fs.rmSync(DIR, { recursive: true, force: true });
    process.exit(pass ? 0 : 1);
  }
})();