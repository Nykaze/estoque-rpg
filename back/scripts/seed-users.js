#!/usr/bin/env node
// Seed interativo do users.json (sem senha hardcoded no git).
// Uso: node scripts/seed-users.js [--add] [--file CAMINHO]
//   sem --add: cria users.json do zero (ou recria vazio pedindo admin)
//   com --add: acrescenta um usuário ao users.json existente
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const argv = process.argv.slice(2);
const fileArg = argv.find((a, i) => a === '--file') ? argv[argv.indexOf('--file') + 1] : null;
const FILE = fileArg || process.env.USERS_FILE || path.join(__dirname, '..', 'data', 'users.json');
const ADD = argv.includes('--add');

const ROLES = ['admin', 'gestor', 'jogador'];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise((res) => rl.question(q, res));
}

function loadData() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return null; }
}
function saveData(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function uid() {
  return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

(async () => {
  let data = loadData();
  let users = data && Array.isArray(data.users) ? data.users : [];
  if (ADD && !data) {
    console.error('Arquivo não encontrado: ' + FILE);
    process.exit(1);
  }
  if (!ADD) {
    if (users.length) {
      console.log('users.json já existe com ' + users.length + ' usuário(s). Use --add para acrescentar ou apague o arquivo para refazer.');
      process.exit(1);
    }
    users = [];
  }

  console.log('Arquivo alvo: ' + FILE + (ADD ? ' (adicional)' : ' (novo)'));
  console.log('Perfis: admin (mestre/gestor geral) | gestor (mestre) | jogador');
  console.log('');

  while (true) {
    const username = (await ask('Nome de usuário (min 3, letras/números): ')).trim().toLowerCase();
    if (/^[a-z0-9_.-]{3,24}$/.test(username)) {
      if (users.some((u) => u.username.toLowerCase() === username)) { console.log('Já existe. Escoha outro.'); continue; }
      const name = (await ask('Nome de exibição [' + username + ']: ')).trim().slice(0, 40) || username;
      const role = (await ask('Perfil (admin/gestor/jogador) [jogador]: ')).trim().toLowerCase() || 'jogador';
      if (!ROLES.includes(role)) { console.log('Perfil inválido.'); continue; }
      const password = await ask('Senha (min 6): ');
      if (password.length < 6) { console.log('Senha muito curta.'); continue; }
      users.push({
        id: uid(),
        username,
        name,
        role,
        passHash: bcrypt.hashSync(password, 10),
        active: true,
        createdAt: Date.now()
      });
      console.log('Usuário "' + username + '" (' + role + ') criado.');
    } else {
      console.log('Formato inválido');
      continue;
    }
    const again = (await ask('Criar outro? (s/N): ')).trim().toLowerCase();
    if (again !== 's') break;
  }

  if (!data) data = {};
  if (typeof data.secret !== 'string' || !data.secret) data.secret = require('crypto').randomBytes(24).toString('hex');
  data.users = users;
  saveData(data);
  console.log('');
  console.log('users.json salvo em: ' + FILE + ' (' + users.length + ' usuário(s))');
  rl.close();
})().catch((e) => { console.error(e); process.exit(1); });