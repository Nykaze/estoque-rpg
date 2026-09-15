const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const PORT = 4012;
const DIR = path.join(__dirname, '..', 'rt-equip-tmp');
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
    const a = io(`http://localhost:${PORT}`, { transports: ['polling'], extraHeaders: { Cookie: cookie }, reconnection: false });
    let latest = null;
    a.on('state', (s) => { latest = s });
    await new Promise((res) => a.on('state', (s) => { latest = s; res() }));
    const errs = [];
    a.on('actionError', (e) => errs.push(e.error));

    const char = () => latest && latest.characters[0];
    const rpg = () => latest && latest.rpgs[0];
    const catId = (name) => rpg().catalog.find((i) => i.name === name).id;

    a.emit('action', { type: 'addCatalogItem', rpgId: rpg().id, name: 'Espada Curta', category: 'arma', qty: 10, weight: 1, effect: 'Dano 1d6', description: '' });
    a.emit('action', { type: 'addCatalogItem', rpgId: rpg().id, name: 'Escudo de Madeira', category: 'escudo', qty: 5, weight: 2, effect: 'Defesa +2', description: '' });
    a.emit('action', { type: 'addCatalogItem', rpgId: rpg().id, name: 'Armadura de Couro', category: 'armadura', qty: 5, weight: 3, effect: 'Defesa +1d4', description: '' });
    await sleep(800);
    a.emit('action', { type: 'createCharacter', rpgId: rpg().id, name: 'Kaelen' });
    await sleep(800);

    const badCat = errs.filter((e) => !/Categoria incompatível/.test(e));
    if (badCat.length) throw new Error('erros adicionando catálogo: ' + JSON.stringify(badCat));

    a.emit('action', { type: 'giveItem', charId: char().id, itemId: catId('Espada Curta'), qty: 1 });
    await sleep(500);
    a.emit('action', { type: 'giveItem', charId: char().id, itemId: catId('Espada Curta'), qty: 1 });
    await sleep(500);
    a.emit('action', { type: 'giveItem', charId: char().id, itemId: catId('Escudo de Madeira'), qty: 1 });
    await sleep(500);
    a.emit('action', { type: 'giveItem', charId: char().id, itemId: catId('Armadura de Couro'), qty: 1 });
    await sleep(500);
    a.emit('action', { type: 'addItem', charId: char().id, name: 'Pocao', qty: 3, perSlot: 1 });
    await sleep(500);

    const list = () => char().inventory;
    const espadas = () => list().filter((i) => i.name === 'Espada Curta');
    const escudo = () => list().find((i) => i.name === 'Escudo de Madeira');
    const armadura = () => list().find((i) => i.name === 'Armadura de Couro');
    if (espadas().length !== 2 || !escudo() || !armadura() || !list().find((i) => i.name === 'Pocao')) {
      console.log('INV:', JSON.stringify(list().map((i) => ({ id: i.id, n: i.name, q: i.qty })), null, 1));
      throw new Error('giveItem/addItem invalido | errs=' + JSON.stringify(errs));
    }

    a.emit('action', { type: 'setEquip', charId: char().id, slot: 'mao1', entryId: espadas()[0].id });
    await sleep(500);
    a.emit('action', { type: 'setEquip', charId: char().id, slot: 'escudo', entryId: escudo().id });
    await sleep(500);
    a.emit('action', { type: 'setEquip', charId: char().id, slot: 'mao2', entryId: espadas()[1].id });
    await sleep(500);
    a.emit('action', { type: 'setEquip', charId: char().id, slot: 'armadura', entryId: armadura().id });
    await sleep(500);

    const eq = () => char().equipment;
    console.log('equipment apo espada na mao2:', JSON.stringify(eq()));
    const okEscudo = eq().mao2 === espadas()[1].id && eq().escudo === null && eq().mao1 === espadas()[0].id && eq().armadura === armadura().id;

    a.emit('action', { type: 'setEquip', charId: char().id, slot: 'escudo', entryId: escudo().id });
    await sleep(500);
    console.log('equipment apo escudo:', JSON.stringify(eq()), '| mao2 deve ser null:', eq().mao2 === null);

    const realErrs = errs.filter((e) => !/Categoria incompatível/.test(e));
    console.log('erros nao-categoria:', JSON.stringify(realErrs));
    pass = okEscudo && eq().mao2 === null && eq().escudo === escudo().id && realErrs.length === 0;
    console.log(pass ? 'EQUIP+ITEM OK' : 'EQUIP+ITEM FALHOU');
    a.close();
  } catch (e) {
    console.error('ERRO TESTE:', e.message);
  } finally {
    child.kill();
    if (child.exitCode === null) await new Promise((r) => child.once('exit', r));
    await sleep(400);
    fs.rmSync(DIR, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
    process.exit(pass ? 0 : 1);
  }
})();