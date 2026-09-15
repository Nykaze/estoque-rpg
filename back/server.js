const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cookieMod = require('cookie');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'data.json');
const USERS_FILE = process.env.USERS_FILE || path.join(__dirname, 'data', 'users.json');
const SESSIONS_FILE = process.env.SESSIONS_FILE || path.join(path.dirname(DATA_FILE), 'sessions.json');
const PORT = process.env.PORT || 3000;
const SESSION_NAME = 'estoque.sid';
const DEFAULT_PUBLIC_DIR = () => (fs.existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : path.join(__dirname, '..', 'public'));

const CATS = ['consumivel', 'acessorio', 'material', 'combinacao', 'arma', 'armadura', 'cajado', 'grimorio', 'escudo', 'magico'];
const ROLES = ['admin', 'gestor', 'jogador'];
const CHAR_STATUS = ['ativo', 'inativo'];
const ATTR_TYPES = ['number', 'text', 'level', 'bool', 'select', 'counter', 'moeda', 'longtext', 'vinculo'];
const MOVEMENTS_CAP = 800;
const EQUIP_SLOTS = ['mao1', 'mao2', 'acessorio', 'escudo', 'armadura'];
const EQUIP_SLOTS_STARS = ['mao1', 'mao2', 'acessorio1', 'acessorio2', 'acessorio3', 'escudo', 'armadura'];
const EQUIP_SLOT_CATS = {
  mao1: ['arma', 'cajado', 'grimorio'],
  mao2: ['arma', 'cajado', 'grimorio'],
  acessorio: ['acessorio'],
  acessorio1: ['acessorio'],
  acessorio2: ['acessorio'],
  acessorio3: ['acessorio'],
  escudo: ['escudo'],
  armadura: ['armadura']
};
const WEAPON_CATS = EQUIP_SLOT_CATS.mao1;
const MAX_EQUIP_STARS = 3;
function normalizeStars(n) {
  return Math.min(MAX_EQUIP_STARS, Math.max(1, Math.floor(Number(n) || 1)));
}
function wantsStars(r) {
  return !!(r && r.equipStars);
}
function equipSlotsOf(r) {
  return wantsStars(r) ? EQUIP_SLOTS_STARS : EQUIP_SLOTS;
}
const BUILTIN_SECTIONS = [
  { id: 'atributos', label: 'Atributos' },
  { id: 'pericias', label: 'Perícias' },
  { id: 'camposlivres', label: 'Campos livres' },
  { id: 'inventario', label: 'Inventário' },
  { id: 'equipamento', label: 'Equipamento' },
  { id: 'magias', label: 'Magias & técnicas' },
  { id: 'runas', label: 'Runas' },
  { id: 'anotacoes', label: 'Anotações' },
  { id: 'historico', label: 'Histórico de itens' }
];
const BUILTIN_META = {};
BUILTIN_SECTIONS.forEach((b) => (BUILTIN_META[b.id] = b));
const SEC_DEFAULT_COL = { atributos: 'left', pericias: 'left', camposlivres: 'left' };

function defaultSections() {
  return BUILTIN_SECTIONS.map((s) => ({ id: s.id, label: s.label, type: 'builtin', enabled: true, col: SEC_DEFAULT_COL[s.id] || 'right' }));
}

function normalizeSectionDef(def) {
  if (!Array.isArray(def)) def = [];
  const seen = {};
  const out = [];
  for (const f of def) {
    if (!f || !f.id || seen[f.id]) continue;
    seen[f.id] = true;
    out.push({
      id: String(f.id).slice(0, 24),
      name: String((f.name && String(f.name).trim()) ? f.name : 'Campo').slice(0, 40),
      editable: f.editable !== false
    });
  }
  return out;
}

function normalizeSections(s) {
  const isArray = Array.isArray(s);
  const src = isArray
    ? s
    : (s && typeof s === 'object'
      ? Object.keys(s).map((k) => ({ id: k, label: (BUILTIN_META[k] || {}).label || k, type: 'builtin', enabled: s[k] !== false }))
      : []);
  const mk = (it) => {
    const custom = it.type === 'custom' || !BUILTIN_META[it.id];
    return {
      id: it.id,
      label: String((it.label && String(it.label).trim()) ? it.label : ((BUILTIN_META[it.id] || {}).label || it.id)).slice(0, 40),
      type: custom ? 'custom' : 'builtin',
      enabled: it.enabled !== false,
      col: (it.col === 'left' || it.col === 'right') ? it.col : (SEC_DEFAULT_COL[it.id] || 'right'),
      definition: custom ? normalizeSectionDef(it.definition) : undefined
    };
  };
  const def = (b) => ({ id: b.id, label: b.label, type: 'builtin', enabled: true, col: SEC_DEFAULT_COL[b.id] || 'right' });
  if (isArray) {
    const out = [];
    const seen = {};
    for (const it of src) {
      if (!it || !it.id || seen[it.id]) continue;
      seen[it.id] = true;
      out.push(mk(it));
    }
    BUILTIN_SECTIONS.forEach((b) => { if (!seen[b.id]) { seen[b.id] = true; out.push(def(b)); } });
    return out;
  }
  const byId = {};
  for (const it of src) {
    if (!it || !it.id || byId[it.id]) continue;
    byId[it.id] = mk(it);
  }
  const out = [];
  BUILTIN_SECTIONS.forEach((b) => {
    const e = byId[b.id];
    out.push(e || def(b));
    delete byId[b.id];
  });
  Object.values(byId).forEach((o) => out.push(o));
  return out;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function hashPassword(pass) {
  return bcrypt.hashSync(String(pass), 10);
}
function verifyPassword(pass, hash) {
  try {
    return bcrypt.compareSync(String(pass), hash);
  } catch {
    return false;
  }
}

function seedCatalog() {
  const seeds = [
    {"name":"Poção Vermelha","category":"consumivel","description":"Um liquido avermelhado que quando ingerido restaura as feridas e alivia as dores","weight":2,"value":12,"effect":"Recupera +7 de VIDA"},
    {"name":"Poção Azure","category":"consumivel","description":"Uma bebida suspeitamente azul brilhante, bebe-la irá restaurar suas capacidades de pensamento e melhorar seu estado mental","weight":2,"value":15,"effect":"Recupera +10 de MANA"},
    {"name":"Poção Amarela","category":"consumivel","description":"Sua essência de cor amarelada afasta as pessoas, mais curiosos o bastante para bebe-la irá se sentir mais leves e rapidos","weight":3,"value":20,"effect":"+1 Ação de movimento (3 turnos) | +1 em Desvio (3 turnos)"},
    {"name":"Erva Verde","category":"consumivel","description":"Suas Folhas ao serem ingeridas revigoram o corpo trazendo um alivio momentâneo","weight":1,"value":3,"effect":"Recupera +3 de ESFORÇO"},
    {"name":"Erva Blueice","category":"consumivel","description":"Suas Folhas ao serem ingeridas revigoram a Mente tirando suas dores de cabeça e elevando sua mana por um momento","weight":1,"value":4,"effect":"Recupera +3 de MANA"},
    {"name":"Erva Vermelha","category":"consumivel","description":"Suas Folhas ao serem ingeridas revigoram você por inteiro, aliviando as dores do corpo e ajuda a fechar feridas","weight":1,"value":5,"effect":"Recupera +3 de VIDA"},
    {"name":"Poção de Mel Real","category":"consumivel","description":"Um liquido Espeço, é mel, extremamente doce a um ponto que lhe faz sentir enjoou, não bebe nada após isso por pelo menos um bom tempo","weight":2,"value":65,"effect":"Recupera +20 de VIDA"},
    {"name":"Poção Azul da Lua","category":"consumivel","description":"Uma bebida suspeitamente azul brilhante, bebe-la irá restaurar suas capacidades de mana até acima do que você é capaz de ter, um feito estranho","weight":2,"value":80,"effect":"Recupera +30 de MANA"},
    {"name":"Kit de Bandagens","category":"consumivel","description":"Panos feitos e apropriados para tapar feridas e sangramentos, o correto é alguém usar em você nunca aplique eles sozinhos","weight":4,"value":50,"effect":"Auto uso = -2 Acumulo de sangue | Alguém usa = -5 Acumulo de sangue +2 de Vida"},
    {"name":"Baga Pexa","category":"consumivel","description":"Um fruto que só floresce na floresta Deku, ela é conhecida por aliviar as dores causadas por envenenamento","weight":2,"value":30,"effect":"-3 Acumulo de Veneno"},
    {"name":"Pedra","category":"material","description":"Rocha","weight":3,"value":4,"effect":"Ela é uma Pedra."},
    {"name":"Ferro","category":"material","description":"Um Minério raro usado para forjar equipamentos para os experiente em batalha","weight":4,"value":20,"effect":"Um Minério."},
    {"name":"Cobre","category":"material","description":"Um Minério comum usado para forjar equipamentos para os experiente em batalha","weight":5,"value":20,"effect":"Outro Minério."},
    {"name":"Colar da boa sorte","category":"acessorio","description":"Um colar feito a mão com um raro trevo de 4 folhas, dizem que quem usa é abençoado com muita sorte","weight":1,"value":15,"effect":"+1 em Sorte, +Um Efeito de salvação"},
    {"name":"Bolsinha","category":"acessorio","description":"Uma pequena bolsa usada para guardar itens pequenos","weight":1,"value":15,"effect":"+5 de Espaço"},
    {"name":"Emblema de Crolofih","category":"acessorio","description":"Emblema bem ornamentado, quem o usa sente que consegue se esforçar um pouco mais, muitas pessoas o utilizam quando precisam fazer um trabalho pesado","weight":1,"value":15,"effect":"+5 de Esforço"},
    {"name":"Anel da Pedra Eletrica","category":"acessorio","description":"Um anel dado a estudante da academia de Magia quando terminam seus estudo da Runa de 1° circulo \"Raio\"","weight":1,"value":18,"effect":"+1 de dano em Magias que usam a Runa de Raio como elemento principal"},
    {"name":"Anel da Pedra De Gelo","category":"acessorio","description":"Um anel dado a estudante da academia de Magia quando terminam seus estudo da Runa de 1° circulo \"Gelo\"","weight":1,"value":18,"effect":"+1 de dano em Magias que usam a Runa de Gelo como elemento principal"},
    {"name":"Anel da Pedra de Fogo","category":"acessorio","description":"Um anel dado a estudante da academia de Magia quando terminam seus estudo da Runa de 1° circulo \"Fogo\"","weight":1,"value":18,"effect":"+1 de dano em Magias que usam a Runa de Fogo como elemento principal"},
    {"name":"Flechanel Retorcido","category":"acessorio","description":"Um anel estranho com formato de flecha, arqueiros orgulhosos com otimas miras tem um desse entre seus dedos","weight":1,"value":20,"effect":"+1 de dano em flechas, +2 de pontaria"},
    {"name":"Faixa do Lutador","category":"acessorio","description":"Essa faixa é dada de seu mestre ao lutador que completou todo o seu treinamento e agora está pronto para seguir a sua jornada","weight":1,"value":5,"effect":"Quando o Usuário desviar ele pode contra-atacar seu adversário com um golpe simples (metade do que você tirar no dado)"},
    {"name":"Mascará Tribal","category":"acessorio","description":"Uma mascará carregada por um tribo de goblins, essa tribo é conhecida por dominar a floresta de Kiah","weight":2,"value":25,"effect":"+2 de furtividade, engana goblins burros"},
    {"name":"Anel da Pedra Mística","category":"acessorio","description":"Um anel criado por feiticeiros para potencializar seus feitiços, hà histórias que todo feiticeiro que estava na primeira guerra magica tinha um desse","weight":2,"value":30,"effect":"+1 de dano em Feitiços"},
    {"name":"Medalhão Ambar","category":"acessorio","description":"Feito de uma Pedra âmbar, esse anel carrega um pouco de vitalidade em sua essência, tê-lo por perto melhora a sua saude","weight":2,"value":40,"effect":"+5 de vida"},
    {"name":"Anel do Sabio da Mana","category":"acessorio","description":"Forjado por um velho, ele tem Mana imbuída em seu material de criação, quem usa diz sentir a mana do corpo com mais facilidade","weight":2,"value":35,"effect":"+5 de Mana"},
    {"name":"Anel do Cavaleiro","category":"acessorio","description":"Anel usado por cavaleiro que vigiam castelos, deve-se orgulhar por usar um desse pois isso implica que você foi reconhecido como cavaleiro por um rei","weight":2,"value":40,"effect":"Escudos tem +3 de defesa."},
    {"name":"Colar do Brasão","category":"acessorio","description":"Um colar que influencia a potencia das magias de barreiras, Criada por um professor da academia de magia Tempest, temendo o estado dos alunos da escola ele criou esse colar","weight":2,"value":60,"effect":"+4 de vida para barreiras"},
    {"name":"Bracelete do Tutuba","category":"acessorio","description":"Um bracelete que muda a formula das magias do elemento de Água para formas de tubarão","weight":3,"value":70,"effect":"+2 de efeito (dano/vida)"},
    {"name":"Máscara Surrupia","category":"acessorio","description":"Como um lendário ninja já dizia - Mascara na cara, Ninja da quebrada, olha no meu olho que eu te meto a facada.","weight":2,"value":80,"effect":"+2 de Furtividade, +1 de dano critico para armas do tipo \"adaga\""},
    {"name":"Colar Magico Real","category":"acessorio","description":"Usado por pessoas de alta classe, ele é capaz de proteger o usuário com um escudo magico, progetado por um antigo mago criador de artefatos","weight":2,"value":110,"effect":"Vida = 6 | -8 de Mana"},
    {"name":"Manto Azure","category":"acessorio","description":"Um Manto feito de fibras banhadas em pedra de mana, ao vesti-lo o usuário sente a mana dos fios sendo absorvidas pelo corpo","weight":2,"value":115,"effect":"+10 de mana, +1 de dano magico"},
    {"name":"Anel Escudo de Hasvel","category":"acessorio","description":"Um Anel raro, usado por um guerreiro do passado que nunca caiu em batalha e caçava dragões - Hasvel, o Puro Aço","weight":6,"value":120,"effect":"+5 de Defesa"},
    {"name":"Anel do Acumulo","category":"acessorio","description":"Um anel criado pelo Feiticeiro Centenário, ele confeccionou um item incrível, ele absorve qualquer acumulo escolhido pelo Usuário e solta qualquer ele quiser","weight":2,"value":140,"effect":"Junta Acumulos vinculados ao usuário (Vida/Mana/Veneno/Sangramento). Máximo de 12."},
    {"name":"Manto do Campeão","category":"acessorio","description":"Apenas campeões podem usar essa capa, e agora você é o novo portador","weight":2,"value":150,"effect":"+1 de dano, se ficar abaixo de 50% de hp ganhe +2 de dano (não acumula com o +1 anterior)"},
    {"name":"Anel do Olho Fixo","category":"acessorio","description":"Um anel criado por um triste artesão que nunca teve a atenção de mulheres, ao forjar esse anel ele fica triste por não ter o efeito que ele esperava","weight":2,"value":50,"effect":"O alvo focará suas ações em você (+12 em testes de vontade para sair do transe)"},
    {"name":"Bolsa de Exploração","category":"acessorio","description":"O melhor equipamento para aqueles que querem se aventurar em busca de riqueza, fama e todo o que há de bom","weight":2,"value":35,"effect":"+12 de Espaço"},
    {"name":"Água + Fogo","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar um alvo \"Queimando\", cria Vapor que dá 2 de dano em 4x4 do alvo."},
    {"name":"Água + Gelo","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar um alvo \"Molhado\" o deixe com Calafrio, -5 na defesa por 2 turnos (não acumula). • Acertar um alvo \"Gelado\" facilita a paralisia (+13)."},
    {"name":"Água + Raio","category":"combinacao","description":"","weight":0,"value":0,"effect":"Acertar um alvo \"Molhado\": Paralisa na hora mas apenas por 1 golpe."},
    {"name":"Vento + Água","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar um alvo \"Molhado\", o efeito se espalha em 3x3 do alvo por 2 turnos."},
    {"name":"Madeira + Água","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar Alvos \"Molhados\", Lhe cura 2 de vida, e remove o efeito."},
    {"name":"Água + Terra","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar um alvo \"Molhado\", envolve ele de lama, -2 em desvio, Até 1 golpe."},
    {"name":"Raio + Gelo","category":"combinacao","description":"","weight":0,"value":0,"effect":"Tira o efeito \"Gelado\" ao acertar e tira permanente -1 de defesa (-5 Max)."},
    {"name":"Gelo + Vento + Gelo","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar um alvo Gelado, o Efeito se espalha em 3x3 do alvo, por 2 turnos."},
    {"name":"Madeira + Gelo","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar Alvos \"Gelados\", dá 3 de dano na defesa, e remove o efeito."},
    {"name":"Raio + Fogo","category":"combinacao","description":"","weight":0,"value":0,"effect":"Paralisar um alvo \"Queimando\", faz ele levar 3 de dano ao invés de paralisar."},
    {"name":"Raio + Madeira","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar Alvos \"Paralisados\", dá 2 de dano na defesa, e remove o efeito."},
    {"name":"Vento + Raio","category":"combinacao","description":"","weight":0,"value":0,"effect":"Roube a Paralisia de um alvo para potencializar sua magia de vento (+1, max +4)."},
    {"name":"Terra + Raio","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar um alvo \"Paralisado\" gire um 1d20, se tirar +15 a paralisia se espalha em 3x3."},
    {"name":"Vento + Fogo","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar um alvo Queimando, espalha a queima para aliados próximos (até 3)."},
    {"name":"Madeira + Fogo","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar um alvo Queimando, aumenta a queimadura para 3 de dano p/turno."},
    {"name":"Terra + Fogo","category":"combinacao","description":"","weight":0,"value":0,"effect":"Acertar um Alvo \"Queimando\", faz o fogo explodir dando 4 de dano na hora."},
    {"name":"Terra + Madeira","category":"combinacao","description":"","weight":0,"value":0,"effect":"Dá +6 de vida a magias defensivas, mas leva o dobro de dano de magias de fogo."},
    {"name":"Vento + Madeira","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao acertar um o alvo \"Sangrando\" as Farpas potencializam o sangue (+3 acumulo)."},
    {"name":"Terra + Vento","category":"combinacao","description":"","weight":0,"value":0,"effect":"Ao ter uma magia defensiva de terra ativada e usar uma magia de vento, o pó de terra irá potencializar a magia de vento (-2 em desvio)."},
    {"name":"Manoplas de Prata","category":"arma","description":"Par de manoplas leves revestidas de prata.","weight":2,"value":30,"effect":"Dano 1d4 · Crítico 18 · Req. FORÇA 08 / AGILIDADE 08"},
    {"name":"Lamina de Ferro","category":"arma","description":"Lâmina de ferro simples e bem equilibrada.","weight":2,"value":45,"effect":"Dano 1d6 · Crítico 20 · Req. FORÇA 14 / AGILIDADE 12"},
    {"name":"Cauda Trançada","category":"arma","description":"Arma flexível de alcance longo, capaz de acertar até 3 quadrantes.","weight":2,"value":50,"effect":"Acerta até 3Q · Dano 1d4 · Crítico 20 · Req. FORÇA 07 / AGILIDADE 18"},
    {"name":"Ponta de Ferro","category":"arma","description":"Lança curta com ponta de ferro, alcança até 2 quadrantes.","weight":2,"value":48,"effect":"Acerta até 2Q · Dano 1d7 · Crítico 20 · Req. FORÇA 16 / AGILIDADE 13"},
    {"name":"Dente de Ferro","category":"arma","description":"Adaga serrilhada em formato de presa.","weight":1,"value":25,"effect":"Dano 1d4 · Crítico 16 · Req. FORÇA 05 / AGILIDADE 12"},
    {"name":"Placa Afiada","category":"arma","description":"Pesada lâmina cortante de placa metálica.","weight":3,"value":60,"effect":"Dano 1d8 · Crítico 20 · Req. FORÇA 21 / AGILIDADE 13"},
    {"name":"Florina","category":"arma","description":"Espada fina e elegante, feita para duelos.","weight":1,"value":35,"effect":"Dano 1d5 · Crítico 18 · Req. FORÇA 07 / AGILIDADE 18"},
    {"name":"Taco Fervente","category":"arma","description":"Bastão que queima ao causar um golpe crítico.","weight":2,"value":55,"effect":"Dano 1d8 · Crítico 19 · Req. FORÇA 18 / AGILIDADE 12 · Crítico deixa Queimando"},
    {"name":"Duo Hercules","category":"arma","description":"Par de manoplas pesadas dignas de um titã.","weight":3,"value":70,"effect":"Dano 1d8 · Crítico 20 · Req. FORÇA 22 / AGILIDADE 16 · Após quebrar a defesa, ganha +2 de dano"},
    {"name":"Claurita","category":"arma","description":"Claymore colossal de duas mãos.","weight":4,"value":110,"effect":"Dano 1d12 · Crítico 20 · Req. FORÇA 32 / AGILIDADE 18"},
    {"name":"Aço Traçado","category":"arma","description":"Fio de aço trançado com grande alcance.","weight":2,"value":58,"effect":"Acerta até 3Q · Dano 1d6 · Crítico 20 · Req. FORÇA 14 / AGILIDADE 21"},
    {"name":"Escorpione","category":"arma","description":"Adaga com ferrão envenenado de escorpião.","weight":1,"value":52,"effect":"Dano 1d5 · Crítico 17 · Req. FORÇA 11 / AGILIDADE 18 · Crítico dá Veneno"},
    {"name":"Rock'and'spike","category":"arma","description":"Maça cravejada de espinhos que recompensa quem defende.","weight":2,"value":56,"effect":"Dano 1d6 · Crítico 18 · Req. FORÇA 15 / AGILIDADE 20 · Dá +2 de dano caso defender"},
    {"name":"Presa Laminada","category":"arma","description":"Corte profundo que causa sangramento no crítico.","weight":2,"value":54,"effect":"Dano 1d6 · Crítico 19 · Req. FORÇA 17 / AGILIDADE 15 · Crítico dá 1 Sangramento"},
    {"name":"Bald Lance","category":"arma","description":"Lança de cavalaria resistente.","weight":3,"value":62,"effect":"Dano 1d8 · Crítico 20 · Req. FORÇA 17 / AGILIDADE 17"},
    {"name":"Breaker","category":"arma","description":"Martelo rompedor de armaduras.","weight":3,"value":78,"effect":"Dano 1d9 · Crítico 19 · Req. FORÇA 23 / AGILIDADE 16"},
    {"name":"Serra-Mandíbula","category":"arma","description":"Arma serrilhada que morde o alvo como mandíbulas.","weight":3,"value":85,"effect":"Acerta até 3Q · Dano 1d8 · Crítico 20 · Req. FORÇA 18 / AGILIDADE 30 · Crítico aplica 3 Sangramento"},
    {"name":"Chifre Pesado","category":"arma","description":"Marreta de chifre maciço de besta ancestral.","weight":3,"value":92,"effect":"Dano 1d10 · Crítico 20 · Req. FORÇA 28 / AGILIDADE 15"},
    {"name":"Brasão de Ferro","category":"escudo","description":"Escudo pesado de ferro maciço.","weight":3,"value":95,"effect":"Defesa +9 · -2 em Desvio · Req. FORÇA 20 / AGILIDADE 05"},
    {"name":"Escudo Redondo","category":"escudo","description":"Escudo redondo leve de madeira reforçada.","weight":2,"value":40,"effect":"Defesa +4 · Req. FORÇA 12 / AGILIDADE 05"},
    {"name":"Besta Simples","category":"arma","description":"Besta leve e confiável para atiradores iniciantes.","weight":2,"value":60,"effect":"Acerta até 5Q · Dano +2 · Crítico 18 · Req. FORÇA 08 / AGILIDADE 15"},
    {"name":"Duplo-Besta","category":"arma","description":"Besta modificada que dispara duas flechas por vez.","weight":3,"value":80,"effect":"Acerta até 4Q, mas dispara 2 flechas · Dano +1 · Crítico 20 · Req. FORÇA 12 / AGILIDADE 19"},
    {"name":"Nota Longa","category":"arma","description":"Arco longo de precisão para grandes distâncias.","weight":2,"value":68,"effect":"Acerta até 9Q · Dano +1 · Crítico 20 · Req. FORÇA 10 / AGILIDADE 25"},
    {"name":"Arco Curto","category":"arma","description":"Arco curto ágil, ideal para combate em movimento.","weight":2,"value":35,"effect":"Acerta até 9Q · Dano +0 · Crítico 18 · Req. FORÇA 05 / AGILIDADE 20"},
    {"name":"Flecha de Fogo","category":"arma","description":"Munição encantada que incendeia o alvo.","weight":0.2,"value":8,"effect":"Dano 1d2 · Deixa o alvo Queimando (1 d/turno)"},
    {"name":"Flecha de Madeira","category":"arma","description":"Munição simples e barata.","weight":0.2,"value":2,"effect":"Dano 1d2"},
    {"name":"Flecha de Ferro","category":"arma","description":"Munição reforçada com ponta de ferro.","weight":0.2,"value":5,"effect":"Dano 1d4 · Req. FORÇA 12 / AGILIDADE 08"},
    {"name":"Roupão de Mago","category":"armadura","description":"Armadura leve. Traje confortável favorito dos conjuradores.","weight":2,"value":28,"effect":"Defesa +1d3"},
    {"name":"Roupas de Explorador","category":"armadura","description":"Armadura leve. Vestimenta prática para longas jornadas.","weight":2,"value":30,"effect":"Defesa +1d3"},
    {"name":"Roupão Verdario","category":"armadura","description":"Armadura leve. Tecidos verdes entrelaçados com fibras da floresta.","weight":2,"value":32,"effect":"Defesa +1d3"},
    {"name":"Armadura Coberta","category":"armadura","description":"Armadura leve. Placas parciais cobrindo os pontos vitais.","weight":2,"value":42,"effect":"Defesa +1d5"},
    {"name":"Armadura Akrina","category":"armadura","description":"Armadura leve. Forjada com liga leve do deserto de Akrin.","weight":2,"value":38,"effect":"Defesa +1d4"},
    {"name":"Armadura do Pequeno Manto","category":"armadura","description":"Armadura leve. Um manto curtido com placas discretas.","weight":2,"value":24,"effect":"Defesa +1d2"},
    {"name":"Armadura de Plamidia","category":"armadura","description":"Armadura leve. Escamas de Plamidia polidas à mão.","weight":2,"value":44,"effect":"Defesa +1d5"},
    {"name":"Armadura de Couro","category":"armadura","description":"Armadura média. Couro curtido, flexível e confiável.","weight":3,"value":60,"effect":"Defesa +1d10"},
    {"name":"Armadura só de Couro","category":"armadura","description":"Armadura média. Apenas tiras de couro grosso, sem reforços.","weight":3,"value":75,"effect":"Defesa +1d14 · -1 em Desvio"},
    {"name":"Armadura do Ganbino","category":"armadura","description":"Armadura média. Leve o bastante para escapar, firme o bastante para aguentar.","weight":3,"value":55,"effect":"Defesa +1d8"},
    {"name":"Armadura do Combatente","category":"armadura","description":"Armadura média. Padrão dos lutadores de arena.","weight":3,"value":70,"effect":"Defesa +1d12 · -1 em Desvio"},
    {"name":"Armadura do Guarda Iniciante","category":"armadura","description":"Armadura média. Equipamento padrão da guarda da cidade.","weight":3,"value":85,"effect":"Defesa +1d15 · -1 em Desvio"},
    {"name":"Roupa do Esforçado","category":"armadura","description":"Armadura média. Costurada para quem nunca desiste.","weight":3,"value":50,"effect":"Defesa +1d7"},
    {"name":"Roupa de Bladd","category":"armadura","description":"Armadura média. Réplica do traje do famoso mercenário Bladd.","weight":3,"value":110,"effect":"Defesa +1d15 · -1 em Desvio"},
    {"name":"Armadura da Legião","category":"armadura","description":"Armadura pesada. Uniforme de batalha das legiões imperiais.","weight":4,"value":130,"effect":"Defesa +1d18 · -2 em Desvio"},
    {"name":"Armadura de Placa","category":"armadura","description":"Armadura pesada. Placas completas de aço.","weight":5,"value":200,"effect":"Defesa +1d25 · -3 em Desvio"},
    {"name":"Armadura de Carmin","category":"armadura","description":"Armadura pesada. Aço vermelho carmin forjado em fornos antigos.","weight":5,"value":230,"effect":"Defesa +1d26 · -3 em Desvio"},
    {"name":"Armadura de Escama","category":"armadura","description":"Armadura pesada. Escamas sobrepostas de criatura dracônica.","weight":5,"value":260,"effect":"Defesa +1d28 · -3 em Desvio"},
    {"name":"Armadura do Capitão","category":"armadura","description":"Armadura pesada. Concedida apenas a capitãos de elite.","weight":4,"value":170,"effect":"Defesa +1d20 · -2 em Desvio"},
    {"name":"Placa de Aço Albino","category":"armadura","description":"Armadura pesada. Placa de aço branco raro como neve.","weight":5,"value":255,"effect":"Defesa +1d28 · -3 em Desvio"},
    {"name":"Armadura de Kinite","category":"armadura","description":"Armadura pesada. Cristal kinite temperado, dura como pedra.","weight":4,"value":185,"effect":"Defesa +1d24 · -2 em Desvio"},
    {"name":"Cajado Laminado","category":"cajado","description":"Cajado de madeira laminada para magos aprendizes.","weight":2,"value":30,"effect":"Dano 1d2 · Crítico 20 · Req. INTELIGÊNCIA 04 / SABEDORIA 06"},
    {"name":"Cajado do Olho de Dragão","category":"cajado","description":"Orbe de olho de dragão no topo; o poder cobra seu preço em mana.","weight":2,"value":90,"effect":"Dano +3 · Crítico 20 · Custo de +4 de Mana · Req. INTELIGÊNCIA 16 / SABEDORIA 10"},
    {"name":"Cajado Temporal","category":"cajado","description":"Sintonizado com as correntes do vento.","weight":2,"value":80,"effect":"Dano +2 · Crítico 20 · Apenas para magias de Vento · Req. INTELIGÊNCIA 18 / SABEDORIA 11"},
    {"name":"Cajado Arvório","category":"cajado","description":"Ramo vivo que responde às magias da floresta.","weight":2,"value":78,"effect":"Dano +2 · Crítico 20 · Apenas para magias de Madeira · Req. INTELIGÊNCIA 18 / SABEDORIA 10"},
    {"name":"Cajado Geométrico","category":"cajado","description":"Entalhado com formas perfeitas que fortalecem barreiras.","weight":2,"value":95,"effect":"Dano +0 · Crítico 20 · Magias de Barreira têm +3 de Vida · Req. INTELIGÊNCIA 20 / SABEDORIA 18"},
    {"name":"Cajado Chamárito","category":"cajado","description":"Pedra chamárita incandescente na ponta.","weight":2,"value":72,"effect":"Dano +2 · Crítico 20 · Apenas para magias de Fogo · Req. INTELIGÊNCIA 15 / SABEDORIA 08"},
    {"name":"Cajado da Essência de Dragão","category":"cajado","description":"Guarda a essência bruta de um dragão ancião.","weight":2,"value":150,"effect":"Dano +5 · Crítico 20 · Custo de +8 de Mana · Req. INTELIGÊNCIA 23 / SABEDORIA 15"},
    {"name":"Cajado Eletricante","category":"cajado","description":"Faíscas crepitam ao longo de seu comprimento.","weight":2,"value":76,"effect":"Dano +2 · Crítico 20 · Apenas para magias de Raio · Req. INTELIGÊNCIA 16 / SABEDORIA 09"},
    {"name":"Cajado Rochaka","category":"cajado","description":"Talhado em rocha vulcânica sólida.","weight":3,"value":88,"effect":"Dano +2 · Crítico 20 · Apenas para magias de Terra · Req. INTELIGÊNCIA 20 / SABEDORIA 14"},
    {"name":"Cajado da Amizade","category":"cajado","description":"Feito para curar e apoiar aliados.","weight":2,"value":82,"effect":"Dano +2 · Crítico 20 · Usadas em aliados · Req. INTELIGÊNCIA 19 / SABEDORIA 12"},
    {"name":"Cajado da Gota Azure","category":"cajado","description":"Leve gota de água azul cristalizada na ponta.","weight":2,"value":35,"effect":"Dano +1 · Crítico 20 · Req. INTELIGÊNCIA 08 / SABEDORIA 03"},
    {"name":"Bastão do Dragão","category":"cajado","description":"Um bastão que só desperta diante de dragões.","weight":3,"value":160,"effect":"Dano +3 · Crítico 20 · Apenas em Dragões · Req. INTELIGÊNCIA 24 / SABEDORIA 18"},
    {"name":"Cajado Boludo","category":"cajado","description":"Adora uma boa bola de energia.","weight":2,"value":105,"effect":"Dano +3 · Crítico 20 · Apenas para magia de Bola · Req. INTELIGÊNCIA 21 / SABEDORIA 14"},
    {"name":"Cajado de Veldora","category":"cajado","description":"Relíquia pessoal do arquimago Veldora.","weight":2,"value":400,"effect":"Dano +3 · Crítico 19 · Req. INTELIGÊNCIA 64 / SABEDORIA 45"},
    {"name":"Cogujado Albino","category":"cajado","description":"Corvo albino esculpido guardando um orbe de água.","weight":2,"value":84,"effect":"Dano +2 · Crítico 20 · Apenas para magias de Água · Req. INTELIGÊNCIA 17 / SABEDORIA 12"},
    {"name":"Cajado Luneta","category":"cajado","description":"Lente de luneta que estende o alcance das magias.","weight":2,"value":60,"effect":"Dano +0 · Crítico 20 · Magias têm +2 de Alcance · Req. INTELIGÊNCIA 12 / SABEDORIA 08"},
    {"name":"Cajado Pontudo","category":"cajado","description":"Simples, reto e afiado.","weight":2,"value":28,"effect":"Dano 1d4 · Crítico 20 · Req. INTELIGÊNCIA 05 / SABEDORIA 05"},
    {"name":"Cajado Centrado","category":"cajado","description":"Balanceado para canalizar qualquer runa.","weight":2,"value":70,"effect":"Dano +2 · Crítico 20 · Req. INTELIGÊNCIA 16 / SABEDORIA 10"},
    {"name":"Cajado Torto","category":"cajado","description":"Torto, capenga... mas ainda canaliza magia.","weight":2,"value":22,"effect":"Dano +0 · Crítico 18 · Req. INTELIGÊNCIA 10 / SABEDORIA 10"},
    {"name":"Cajado Frio","category":"cajado","description":"Nunca derrete, nunca esquenta.","weight":2,"value":74,"effect":"Dano +2 · Crítico 20 · Apenas para magias de Gelo · Req. INTELIGÊNCIA 14 / SABEDORIA 10"},
    {"name":"Grimorio da Ordem","category":"grimorio","description":"Tomo oficial da Ordem Arcana, repleto de feitiços complexos.","weight":2,"value":120,"effect":"Feitiços: 3 Complexos · Simples: — · Dano — · Crítico 20 · Req. INTELIGÊNCIA 11 / SABEDORIA 19"},
    {"name":"Livro Preto","category":"grimorio","description":"Capa negra gasta pelo uso constante.","weight":2,"value":70,"effect":"Feitiços: 1 Complexo · 4 Simples · Dano +1 · Crítico 20 · Req. INTELIGÊNCIA 08 / SABEDORIA 12"},
    {"name":"Grimorio Amarelo","category":"grimorio","description":"Páginas amareladas cheias de anotações nas margens.","weight":2,"value":85,"effect":"Feitiços: 2 Complexos · 3 Simples · Dano +1 · Crítico 20 · Req. INTELIGÊNCIA 12 / SABEDORIA 16"},
    {"name":"Grimorio do Lual","category":"grimorio","description":"Escrito sob a luz da lua, brilha levemente no escuro.","weight":2,"value":90,"effect":"Feitiços: 2 Complexos · 2 Simples · Dano +2 · Crítico 20 · Req. INTELIGÊNCIA 10 / SABEDORIA 14"},
    {"name":"Caderno de Als","category":"grimorio","description":"Anotações meticulosas da estudante Als.","weight":2,"value":115,"effect":"Feitiços: 3 Complexos · 2 Simples · Dano — · Crítico 20 · Req. INTELIGÊNCIA 15 / SABEDORIA 20"},
    {"name":"Gemarina","category":"grimorio","description":"Grimório de capa gema que cintila ao canalizar.","weight":2,"value":80,"effect":"Feitiços: 2 Complexos · 3 Simples · Dano +1 · Crítico 18 · Req. INTELIGÊNCIA 13 / SABEDORIA 17"},
    {"name":"Verdogrifo","category":"grimorio","description":"Capa verde com um grifo entalhado em relevo.","weight":2,"value":110,"effect":"Feitiços: 3 Complexos · 3 Simples · Dano — · Crítico 20 · Req. INTELIGÊNCIA 12 / SABEDORIA 18"},
    {"name":"Cadernaco da Fruta","category":"grimorio","description":"Caderno gigante com cheiro de frutas silvestres.","weight":2,"value":135,"effect":"Feitiços: 3 Complexos · 1 Simples · Dano +1 · Crítico 20 · Req. INTELIGÊNCIA 18 / SABEDORIA 23"},
    {"name":"Invertaria","category":"grimorio","description":"As páginas parecem escritas de dentro para fora.","weight":2,"value":100,"effect":"Feitiços: 1 Complexo · 5 Simples · Dano +2 · Crítico 20 · Req. INTELIGÊNCIA 11 / SABEDORIA 15"},
    {"name":"Beastrugo","category":"grimorio","description":"Encadernado com couro de besta desconhecida.","weight":2,"value":82,"effect":"Feitiços: 3 Complexos · 2 Simples · Dano +1 · Crítico 20 · Req. INTELIGÊNCIA 13 / SABEDORIA 17"}
  ];
  return seeds.map((s) => ({ id: uid(), ...s }));
}
function defaultSchema() {
  const a = (name, type, min, max, desc) => ({ id: uid(), name, type, min: min ?? null, max: max ?? null, options: [], required: false, order: 0, active: true, desc: desc || '', hasSub: type === 'level' });
  const k = (name, cat, max, desc) => ({ id: uid(), name, cat, max: max ?? 5, required: false, order: 0, active: true, desc: desc || '' });
  const cl = (name, desc) => ({ id: uid(), name, desc: desc || '' });
  const attrs = [
    a('VIDA', 'number', 0, null, 'Pontos de vida atuais'),
    a('MANA', 'number', 0, null, 'Pontos de mana atuais'),
    a('ESFORÇO', 'number', 0, null, 'Pontos de esforço atuais'),
    a('FORÇA', 'level', 0, 10, ''),
    a('AGILIDADE', 'level', 0, 10, ''),
    a('INTELIGÊNCIA', 'level', 0, 10, ''),
    a('RESISTÊNCIA', 'level', 0, 10, '')
  ].map((x, i) => ({ ...x, order: i }));
  const skills = [
    k('Intimidação', 'Combate', 5, '(FOR & SAB)'),
    k('Luta', 'Combate', 5, '(FOR & AGI)'),
    k('Resistência', 'Combate', 5, '(FOR & VIG)'),
    k('Atletismo', 'Combate', 5, '(VIG & AGI)'),
    k('Movimentação', 'Combate', 5, '(AGI & FOR)'),
    k('Mecânica', 'Saber', 5, '(FOR & INT)'),
    k('Pontaria', 'Combate', 5, '(AGI & INT)'),
    k('Reflexo', 'Combate', 5, '(AGI)'),
    k('Comunicação', 'Social', 5, '(INF)'),
    k('Sedução', 'Social', 5, '(INF)'),
    k('Música', 'Social', 5, '(INF & SAB)'),
    k('Vontade', 'Mental', 5, '(VIG & INF)'),
    k('Sanidade', 'Mental', 5, '(VIG & SAB)'),
    k('Conhecimento', 'Saber', 5, '(SAB)'),
    k('Magia', 'Arcana', 5, '(INT & SAB)'),
    k('Conjuração', 'Arcana', 5, '(INT & SAB)'),
    k('Percepção', 'Saber', 5, '(INT & INF)'),
    k('Sobrevivência', 'Saber', 5, '(SAB & VIG)')
  ].map((x, i) => ({ ...x, order: i }));
  const classes = [
    cl('Guerreiro', 'Linha de frente, foco em combate corpo a corpo.'),
    cl('Mago', 'Usuário de runas e magias elementais.'),
    cl('Arqueiro', 'Especialista em ataques à distância.'),
    cl('Ladino', 'Furtividade, precisão e golpes críticos.')
  ];
  return { attrs, skills, classes, sections: defaultSections(), rules: { subDivisor: 10 }, classLabel: 'Funções' };
}

function loadState() {
  let st;
  try {
    st = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    st = {};
  }
  if (!st.settings || typeof st.settings !== 'object') st.settings = {};
  if (!st.settings.systemName) st.settings.systemName = 'Estoque RPG';
  if (!Array.isArray(st.users)) st.users = [];
  if (!Array.isArray(st.rpgs)) st.rpgs = [];
  if (!Array.isArray(st.characters)) st.characters = [];
  if (!Array.isArray(st.movements)) st.movements = [];

  for (const r of st.rpgs) {
    if (!r.schema || !Array.isArray(r.schema.attrs)) {
      r.schema = defaultSchema();
    }
    if (!r.schema.sections) r.schema.sections = normalizeSections(r.schema.sections || defaultSections());
    if (!Array.isArray(r.catalog)) r.catalog = [];
    if (!r.schema.rules || typeof r.schema.rules !== 'object') r.schema.rules = {};
    if (typeof r.schema.rules.subDivisor !== 'number') r.schema.rules.subDivisor = 10;
    if (!r.schema.classLabel) r.schema.classLabel = 'Funções';
    if (r.equipStars === undefined && String(r.name || '').toLowerCase().includes('desajust')) r.equipStars = true;
    for (const attr of r.schema.attrs) {
      if (typeof attr.hasSub !== 'boolean') attr.hasSub = attr.type === 'level';
    }
    for (const item of r.catalog) {
      if (wantsStars(r) && item.category === 'acessorio') {
        item.stars = normalizeStars(item.stars);
      } else {
        item.stars = null;
      }
    }
  }

  if (!st.rpgs.length) {
    st.rpgs.push({
      id: uid(),
      name: 'Desajustados',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schema: defaultSchema(),
      catalog: seedCatalog()
    });
  }

  for (const c of st.characters) {
    if (!st.rpgs.some((r) => r.id === c.rpgId)) c.rpgId = st.rpgs[0].id;
    if (typeof c.attrVals !== 'object' || !c.attrVals) c.attrVals = {};
    if (typeof c.skillVals !== 'object' || !c.skillVals) c.skillVals = {};
    if (!Array.isArray(c.inventory)) c.inventory = [];
    if (!Array.isArray(c.customAttrs)) c.customAttrs = [];
    if (!c.customSections || typeof c.customSections !== 'object') c.customSections = {};
    if (!Array.isArray(c.spells)) c.spells = [];
    if (!Array.isArray(c.runes)) c.runes = [];
    if (!c.equipment || typeof c.equipment !== 'object') c.equipment = {};
    const cRpg = st.rpgs.find((r) => r.id === c.rpgId);
    if (wantsStars(cRpg) && typeof c.equipment['acessorio'] === 'string') {
      if (!c.equipment['acessorio1']) c.equipment['acessorio1'] = c.equipment['acessorio'];
      delete c.equipment['acessorio'];
    }
    if (!c.status) c.status = 'ativo';
    if (typeof c.ident !== 'string') c.ident = '';
    if (typeof c.photo !== 'string') c.photo = '';
    if (typeof c.classId !== 'string') c.classId = '';
    if (typeof c.cash !== 'number') c.cash = 0;
    if (typeof c.ownerId !== 'string') c.ownerId = null;
    if (typeof c.skillPointsExtra !== 'number') c.skillPointsExtra = 0;
    if (typeof c.isMonster !== 'boolean') c.isMonster = false;
    if (!c.monster || typeof c.monster !== 'object') c.monster = {};
    if (typeof c.monster.desafio !== 'string') c.monster.desafio = '';
    if (typeof c.monster.tipo !== 'string') c.monster.tipo = '';
    if (typeof c.monster.habitat !== 'string') c.monster.habitat = '';
    for (const sp of c.spells) if (typeof sp.ownerId !== 'string') sp.ownerId = null;
    for (const ru of c.runes) if (typeof ru.ownerId !== 'string') ru.ownerId = null;
    const rpg = st.rpgs.find((r) => r.id === c.rpgId);
    if (rpg && Array.isArray(c.attributes) && c.attributes.length) {
      for (const legacy of c.attributes) {
        let target = rpg.schema.attrs.find((s) => s.name.toLowerCase() === String(legacy.name || '').toLowerCase());
        if (!target) {
          target = { id: uid(), name: String(legacy.name || 'Atributo'), type: 'text', min: null, max: null, options: [], required: false, order: rpg.schema.attrs.length, active: true, desc: '' };
          rpg.schema.attrs.push(target);
        }
        c.attrVals[target.id] = String(legacy.value ?? '');
      }
    }
    if (rpg) {
      for (const attr of rpg.schema.attrs) {
        if (c.attrVals[attr.id] === undefined) c.attrVals[attr.id] = initAttrVal(attr);
      }
      for (const sk of rpg.schema.skills) {
        if (c.skillVals[sk.id] === undefined) c.skillVals[sk.id] = 0;
      }
    }
    c.attributes = [];
  }
  st.version = 3;
  return st;
}

let state = loadState();
let saveTimer = null;
save();

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), (err) => {
      if (err) console.error('Erro ao salvar:', err.message);
    });
  }, 200);
}

function sanitizeUser(u) {
  return { id: u.id, username: u.username, name: u.name, role: u.role, active: u.active !== false, createdAt: u.createdAt };
}

// ---- users.json (separado dos dados de jogo) ----
let usersData = null;
try {
  usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
} catch {
  usersData = null;
}
let usersStore = usersData && Array.isArray(usersData.users) ? usersData.users : [];
let sessionSecret = (usersData && typeof usersData.secret === 'string' && usersData.secret) || crypto.randomBytes(24).toString('hex');
let usersWriteTimer = null;
function persistUsersNow() {
  fs.writeFile(USERS_FILE, JSON.stringify({ secret: sessionSecret, users: usersStore }, null, 2), (err) => {
    if (err) console.error('Erro ao salvar users.json:', err.message);
  });
}
function saveUsers() {
  clearTimeout(usersWriteTimer);
  usersWriteTimer = setTimeout(persistUsersNow, 200);
}

function findUser(id) {
  return usersStore.find((u) => u.id === id);
}
function findUserByUsername(username) {
  const un = String(username || '').trim().toLowerCase();
  return usersStore.find((u) => u.username.toLowerCase() === un);
}

function migrateOwnership() {
  let changed = false;
  for (const c of state.characters) {
    if (typeof c.ownerId === 'string') continue;
    const playerName = String(c.player || '').trim().toLowerCase();
    const match = playerName ? usersStore.find((u) => u.username.toLowerCase() === playerName || String(u.name || '').trim().toLowerCase() === playerName) : null;
    c.ownerId = match ? match.id : null;
    if (c.ownerId) changed = true;
  }
  return changed;
}
migrateOwnership();

// ---- sessão HTTP (aplicada após a criação do app, mais abaixo) ----
// Store persistente em disco: sobrevive a restarts/deploys (não desloga usuários)
class FileSessionStore extends session.Store {
  constructor(file) {
    super();
    this.file = file;
    this.sessions = new Map();
    this.timer = null;
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (raw && typeof raw === 'object') for (const [sid, s] of Object.entries(raw)) this.sessions.set(sid, s);
    } catch { /* primeiro uso: arquivo ainda não existe */ }
    setInterval(() => this.prune(), 60 * 60 * 1000).unref();
  }
  _expired(s) {
    const exp = s && s.cookie && s.cookie.expires;
    if (!exp) return false;
    const t = exp instanceof Date ? exp.getTime() : Date.parse(exp);
    return !isNaN(t) && t <= Date.now();
  }
  get(sid, cb) {
    const s = this.sessions.get(sid);
    if (!s) return cb(null, null);
    if (this._expired(s)) {
      this.sessions.delete(sid);
      this.scheduleSave();
      return cb(null, null);
    }
    cb(null, JSON.parse(JSON.stringify(s)));
  }
  set(sid, sess, cb) {
    this.sessions.set(sid, JSON.parse(JSON.stringify(sess)));
    this.scheduleSave();
    if (cb) cb(null);
  }
  touch(sid, sess, cb) { this.set(sid, sess, cb); }
  destroy(sid, cb) {
    this.sessions.delete(sid);
    this.scheduleSave();
    if (cb) cb(null);
  }
  prune() {
    let changed = false;
    for (const [sid, s] of this.sessions) {
      if (this._expired(s)) { this.sessions.delete(sid); changed = true; }
    }
    if (changed) this.scheduleSave();
  }
  scheduleSave() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.persistNow(), 300);
  }
  persistNow() {
    const out = {};
    for (const [sid, s] of this.sessions) out[sid] = s;
    const tmp = this.file + '.tmp';
    fs.writeFile(tmp, JSON.stringify(out, null, 2), (err) => {
      if (err) return console.error('Erro ao salvar sessions.json:', err.message);
      fs.rename(tmp, this.file, (err2) => { if (err2) console.error('Erro ao salvar sessions.json:', err2.message); });
    });
  }
  persistNowSync() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const out = {};
    for (const [sid, s] of this.sessions) out[sid] = s;
    const tmp = this.file + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(out, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('Erro ao salvar sessions.json:', err.message);
    }
  }
}

const sessionStore = new FileSessionStore(SESSIONS_FILE);
const sessionMiddleware = session({
  name: SESSION_NAME,
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 7 * 24 * 60 * 60 * 1000 }
});

function stateFor(user) {
  const isMestre = user && canManage(user);
  const hiddenMonsters = new Set();
  let chars = state.characters;
  let movements = state.movements.slice(-400);
  if (!isMestre) {
    chars = state.characters.filter((c) => {
      if (c.isMonster) {
        hiddenMonsters.add(c.id);
        return false;
      }
      return true;
    });
    if (hiddenMonsters.size) {
      movements = movements.filter((m) => !m.charId || !hiddenMonsters.has(m.charId));
    }
  }
  const base = {
    version: 3,
    settings: { systemName: state.settings.systemName },
    rpgs: state.rpgs,
    characters: chars,
    movements,
    me: user ? sanitizeUser(user) : null
  };
  if (isMestre) {
    base.users = usersStore.map(sanitizeUser);
  }
  return base;
}

function findChar(id) {
  return state.characters.find((c) => c.id === id);
}
function findRpg(id) {
  return state.rpgs.find((r) => r.id === id);
}
  function touchRpg(r) {
    if (r) r.updatedAt = Date.now();
  }

  function touch(c) {
    if (c) c.updatedAt = Date.now();
  }

function logMovement(rpgId, type, extra) {
  state.movements.push({
    id: uid(),
    rpgId,
    type,
    charId: extra.charId || '',
    charName: extra.charName || '',
    itemName: String(extra.itemName || '').slice(0, 60),
    qty: Math.max(1, Number(extra.qty) || 1),
    byName: String(extra.byName || '').slice(0, 60),
    reason: String(extra.reason || '').slice(0, 200),
    at: Date.now()
  });
  if (state.movements.length > MOVEMENTS_CAP) state.movements.splice(0, state.movements.length - MOVEMENTS_CAP);
}

function assignedQty(rpg, itemId) {
  let sum = 0;
  for (const c of state.characters) {
    if (c.rpgId !== rpg.id) continue;
    for (const it of c.inventory) {
      if (it.src === itemId) sum += Number(it.qty) || 0;
    }
  }
  return sum;
}

function availableQty(rpg, item) {
  if (item.qty === null || item.qty === undefined) return Infinity;
  return Math.max(0, (Number(item.qty) || 0) - assignedQty(rpg, item.id));
}

function num(v, min, def) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, n) : def;
}

function clampAttrValue(attr, value) {
  switch (attr.type) {
    case 'number':
    case 'level':
    case 'counter':
    case 'moeda': {
      let n = Number(value);
      if (!Number.isFinite(n)) n = attr.min != null ? attr.min : 0;
      if (attr.min != null) n = Math.max(attr.min, n);
      if (attr.max != null && (attr.type === 'level' || attr.type === 'counter')) n = Math.min(attr.max, n);
      if (attr.type === 'counter' || attr.type === 'moeda') n = Math.trunc(n);
      return n;
    }
    case 'bool':
      return !!value;
    case 'select':
      return attr.options.includes(value) ? value : (attr.options[0] ?? '');
    case 'vinculo':
      return String(value ?? '').slice(0, 24);
    case 'longtext':
      return String(value ?? '').slice(0, 2000);
    default:
      return String(value ?? '').slice(0, 200);
  }
}

function initAttrVal(attr) {
  switch (attr.type) {
    case 'number':
    case 'level':
    case 'counter':
    case 'moeda':
      return attr.min != null ? attr.min : 0;
    case 'bool':
      return false;
    case 'select':
      return attr.options[0] ?? '';
    default:
      return '';
  }
}

function canManage(user) {
  return user && (user.role === 'admin' || user.role === 'gestor');
}
function isAdmin(user) {
  return user && user.role === 'admin';
}
function canEditChar(user, c) {
  if (!user) return false;
  if (c && c.isMonster) return canManage(user);
  return canManage(user) || (!!c && c.ownerId === user.id);
}
function canTouchItem(user, c, itemOwnerId) {
  if (!canEditChar(user, c)) return false;
  if (canManage(user)) return true;
  return itemOwnerId === user.id;
}

const app = express();
app.set('trust proxy', parseInt(process.env.TRUST_PROXY || '1', 10));
app.use(express.json());
app.use(sessionMiddleware);

// ---- rate limit de login (por IP + usuário, em memória) ----
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map();
function loginLockRemaining(req) {
  const now = Date.now();
  if (loginAttempts.size > 5000) {
    for (const [k, v] of loginAttempts) if (v.until <= now) loginAttempts.delete(k);
  }
  const key = req.ip + '|' + String((req.body && req.body.username) || '').trim().toLowerCase();
  const rec = loginAttempts.get(key);
  return rec && rec.until > now ? rec.until : 0;
}

// ---- rotas de autenticação HTTP ----
app.post('/api/login', (req, res) => {
  const until = loginLockRemaining(req);
  if (until) {
    const secs = Math.max(1, Math.ceil((until - Date.now()) / 1000));
    return res.status(429).json({ error: `Muitas tentativas. Tente novamente em ${secs}s.` });
  }
  const username = String((req.body && req.body.username) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  const user = findUserByUsername(username);
  if (!user || user.active === false || !verifyPassword(password, user.passHash)) {
    const key = req.ip + '|' + username;
    const rec = loginAttempts.get(key) || { count: 0, until: 0 };
    rec.count += 1;
    if (rec.count >= LOGIN_MAX_ATTEMPTS) {
      rec.until = Date.now() + LOGIN_WINDOW_MS;
      rec.count = 0;
    }
    loginAttempts.set(key, rec);
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }
  loginAttempts.delete(req.ip + '|' + username);
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Erro interno ao iniciar sessão.' });
    req.session.userId = user.id;
    res.json({ ok: true, user: sanitizeUser(user) });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  const user = req.session.userId ? findUser(req.session.userId) : null;
  if (!user || user.active === false) return res.status(401).json({ error: 'Não autenticado.' });
  res.json({ ok: true, user: sanitizeUser(user) });
});

// ---- proteção das rotas estáticas: o frontend Svelte tem tela de login própria ----
// Container: public/ ao lado do server.js (/app); local: public/ na raiz do projeto
const publicDir = process.env.PUBLIC_DIR || DEFAULT_PUBLIC_DIR();
app.use(express.static(publicDir));

const server = http.createServer(app);
const io = new Server(server);

function currentUser(socket) {
  const u = socket && socket.data && socket.data.user;
  return u && u.active !== false ? u : null;
}

function broadcast() {
  for (const s of io.sockets.sockets.values()) {
    const user = currentUser(s);
    if (user) s.emit('state', stateFor(user));
  }
}

io.use((socket, next) => {
  const req = socket.request;
  try {
    const raw = req && req.headers && req.headers.cookie;
    const cookies = raw ? cookieMod.parse(raw) : {};
    let sid = cookies[SESSION_NAME];
    if (!sid) return next(new Error('unauthorized'));
    const m = String(sid).match(/^s:([^.]+)/);
    if (m) sid = m[1];
    sessionStore.get(sid, (err, sess) => {
      if (err || !sess || !sess.userId) return next(new Error('unauthorized'));
      const user = findUser(sess.userId);
      if (!user || user.active === false) return next(new Error('unauthorized'));
      socket.data.user = user;
      next();
    });
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.emit('hello', { systemName: state.settings.systemName });
  socket.emit('state', stateFor(socket.data.user));

  socket.on('action', (action) => {
    const user = currentUser(socket);
    if (!user) {
      socket.emit('actionError', { error: 'Sessão expirada. Entre novamente.' });
      return;
    }
    if (!action || typeof action.type !== 'string') return;
    try {
      apply(action, user);
      save();
      saveUsers();
      broadcast();
    } catch (err) {
      console.error('Erro na ação', action.type, err.message);
      socket.emit('actionError', { error: err.message });
    }
  });
});

function requireManage(a, user) {
  if (!canManage(user)) throw new Error('Sem permissão para esta ação.');
  const r = findRpg(a.rpgId);
  if (!r) throw new Error('Mesa não encontrada.');
  return r;
}

function poolForCatServer(rpg, c, cat) {
  if (!rpg || !rpg.schema) return null;
  const lvlByName = {};
  (rpg.schema.attrs || []).forEach((at) => {
    if (at.type === 'level') lvlByName[String(at.name).toUpperCase()] = at;
  });
  const parts = String(cat || '').split('&').map((s2) => s2.trim().toUpperCase()).filter(Boolean);
  const div = (rpg.schema.rules && rpg.schema.rules.subDivisor) || 10;
  let sum = 0;
  let any = false;
  parts.forEach((p2) => {
    const at = lvlByName[p2];
    if (at && at.hasSub !== false) { any = true; sum += Number((c.attrVals || {})[at.id + ':sub'] || 0); }
  });
  return any ? Math.floor(sum / div) : null;
}

function upsertSchemaItem(list, item, fields, defaults) {
  if (!item || typeof item !== 'object') throw new Error('Dados inválidos.');
  if (item.id) {
    const existing = list.find((x) => x.id === item.id);
    if (!existing) throw new Error('Registro não encontrado.');
    Object.assign(existing, pickFields(item, fields));
    return existing;
  }
  const created = { id: uid(), ...defaults, ...pickFields(item, fields) };
  list.push(created);
  return created;
}

function pickFields(src, fields) {
  const out = {};
  for (const f of fields) {
    if (src[f] !== undefined) out[f] = src[f];
  }
  return out;
}

function normalizeAttr(a) {
  const type = ATTR_TYPES.includes(a.type) ? a.type : 'text';
  const out = {
    id: a.id,
    name: String(a.name || 'Atributo').slice(0, 40),
    type,
    min: a.min === null || a.min === undefined || a.min === '' ? null : num(a.min, -9999, 0),
    max: a.max === null || a.max === undefined || a.max === '' ? null : num(a.max, -9999, 100),
    options: Array.isArray(a.options) ? a.options.map((o) => String(o).slice(0, 40)).slice(0, 12) : [],
    required: !!a.required,
    order: num(a.order, 0, 0),
    active: a.active !== false,
    desc: String(a.desc || '').slice(0, 200),
    hasSub: typeof a.hasSub === 'boolean' ? a.hasSub : (type === 'level')
  };
  if (out.type === 'select' && !out.options.length) out.options = ['Opção 1'];
  if ((out.type === 'number' || out.type === 'level') && out.max !== null && out.min !== null && out.max < out.min) out.max = out.min;
  return out;
}

function normalizeSkill(k) {
  return {
    id: k.id,
    name: String(k.name || 'Perícia').slice(0, 40),
    cat: String(k.cat || 'Geral').slice(0, 30),
    max: k.max === null || k.max === undefined || k.max === '' ? null : num(k.max, 1, 5),
    required: !!k.required,
    order: num(k.order, 0, 0),
    active: k.active !== false,
    desc: String(k.desc || '').slice(0, 200)
  };
}

function normalizeClass(cl) {
  return {
    id: cl.id,
    name: String(cl.name || 'Função').slice(0, 40),
    desc: String(cl.desc || '').slice(0, 300)
  };
}

function normalizeFormula(f) {
  return {
    id: f.id,
    name: String(f.name || 'Cálculo').slice(0, 40),
    expr: String(f.expr || '').slice(0, 120)
  };
}

function apply(a, user) {
  const tgt = a && a.charId ? findChar(a.charId) : null;
  if (tgt && tgt.isMonster && !canManage(user)) throw new Error('Fichas de monstro: apenas gestores podem acessar.');
  switch (a.type) {
    case 'updateSettings': {
      if (!isAdmin(user)) throw new Error('Somente administradores.');
      if (typeof a.patch === 'object') {
        if (typeof a.patch.systemName === 'string') state.settings.systemName = a.patch.systemName.slice(0, 40) || 'Estoque RPG';
      }
      break;
    }
    case 'changeOwnPassword': {
      const current = String(a.current || '');
      const next = String(a.next || '');
      if (!verifyPassword(current, user.passHash)) throw new Error('Senha atual incorreta.');
      if (next.length < 6) throw new Error('A nova senha precisa ter ao menos 6 caracteres.');
      user.passHash = hashPassword(next);
      saveUsers();
      break;
    }
    case 'createUser': {
      if (!isAdmin(user)) throw new Error('Somente administradores.');
      const username = String(a.username || '').trim().toLowerCase();
      if (!/^[a-z0-9_.-]{3,24}$/.test(username)) throw new Error('Usuário inválido (3-24 letras/números).');
      if (usersStore.some((u) => u.username.toLowerCase() === username)) throw new Error('Este usuário já existe.');
      if (!ROLES.includes(a.role)) throw new Error('Perfil inválido.');
      const password = String(a.password || '');
      if (password.length < 6) throw new Error('A senha precisa ter ao menos 6 caracteres.');
      usersStore.push({
        id: uid(),
        username,
        name: String(a.name || username).slice(0, 40),
        role: a.role,
        passHash: hashPassword(password),
        active: true,
        createdAt: Date.now()
      });
      saveUsers();
      break;
    }
    case 'updateUser': {
      if (!isAdmin(user)) throw new Error('Somente administradores.');
      const target = findUser(a.userId);
      if (!target) throw new Error('Usuário não encontrado.');
      if (typeof a.patch === 'object') {
        if (typeof a.patch.name === 'string') target.name = a.patch.name.slice(0, 40);
        if (ROLES.includes(a.patch.role)) {
          if (target.id === user.id && a.patch.role !== 'admin') throw new Error('Você não pode remover seu próprio acesso admin.');
          target.role = a.patch.role;
        }
        if (typeof a.patch.active === 'boolean') {
          if (target.id === user.id && !a.patch.active) throw new Error('Você não pode desativar a si mesmo.');
          target.active = a.patch.active;
        }
        if (typeof a.patch.password === 'string' && a.patch.password.length >= 6) {
          target.passHash = hashPassword(a.patch.password);
        }
      }
      saveUsers();
      break;
    }
    case 'deleteUser': {
      if (!isAdmin(user)) throw new Error('Somente administradores.');
      if (a.userId === user.id) throw new Error('Você não pode excluir a si mesmo.');
      const target = findUser(a.userId);
      const adminsLeft = usersStore.filter((u) => u.role === 'admin' && u.id !== a.userId).length;
      if (target && target.role === 'admin' && !adminsLeft) throw new Error('Deve existir pelo menos um administrador.');
      usersStore = usersStore.filter((u) => u.id !== a.userId);
      saveUsers();
      break;
    }
    case 'createRpg': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      state.rpgs.push({
        id: uid(),
        name: String(a.name || 'Nova mesa').slice(0, 60),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        schema: defaultSchema(),
        catalog: []
      });
      break;
    }
    case 'updateRpg': {
      const r = findRpg(a.rpgId);
      if (!r || !canManage(user)) throw new Error(!r ? 'Mesa não encontrada.' : 'Sem permissão.');
      const p = a.patch || {};
      if (typeof p.name === 'string') r.name = p.name.slice(0, 60);
      touchRpg(r);
      break;
    }
    case 'deleteRpg': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      state.rpgs = state.rpgs.filter((r) => r.id !== a.rpgId);
      state.characters = state.characters.filter((c) => c.rpgId !== a.rpgId);
      state.movements = state.movements.filter((m) => m.rpgId !== a.rpgId);
      break;
    }
    case 'setAttr': {
      const r = requireManage(a, user);
      const src = a.attr || a.item || {};
      let merged;
      if (src.id) {
        const existing = r.schema.attrs.find((x) => x.id === src.id);
        if (!existing) throw new Error('Atributo não encontrado.');
        merged = { ...existing, ...src };
      } else {
        merged = { order: r.schema.attrs.length, ...src };
      }
      const saved = upsertSchemaItem(
        r.schema.attrs,
        normalizeAttr(merged),
        ['name', 'type', 'min', 'max', 'options', 'required', 'order', 'active', 'desc', 'hasSub'],
        { type: 'text', min: null, max: null, options: [], required: false, order: r.schema.attrs.length, active: true, desc: '', hasSub: false }
      );
      for (const c of state.characters) {
        if (c.rpgId === r.id && c.attrVals[saved.id] === undefined) c.attrVals[saved.id] = initAttrVal(saved);
      }
      touchRpg(r);
      break;
    }
    case 'removeAttr': {
      const r = requireManage(a, user);
      r.schema.attrs = r.schema.attrs.filter((x) => x.id !== a.attrId);
      for (const c of state.characters) {
        if (c.rpgId === r.id) delete c.attrVals[a.attrId];
      }
      touchRpg(r);
      break;
    }
    case 'reorderAttr': {
      const r = requireManage(a, user);
      const list = r.schema.attrs;
      const idx = list.findIndex((x) => x.id === a.attrId);
      const to = idx + (Number(a.delta ?? a.dir) || 0);
      if (idx < 0 || to < 0 || to >= list.length) return;
      const [moved] = list.splice(idx, 1);
      list.splice(to, 0, moved);
      list.forEach((x, i) => (x.order = i));
      touchRpg(r);
      break;
    }
    case 'setSkill': {
      const r = requireManage(a, user);
      const src = a.skill || a.item || {};
      let merged;
      if (src.id) {
        const existing = r.schema.skills.find((x) => x.id === src.id);
        if (!existing) throw new Error('Perícia não encontrada.');
        merged = { ...existing, ...src };
      } else {
        merged = { order: r.schema.skills.length, ...src };
      }
      const saved = upsertSchemaItem(
        r.schema.skills,
        normalizeSkill(merged),
        ['name', 'cat', 'max', 'required', 'order', 'active', 'desc'],
        { cat: 'Geral', max: 5, required: false, order: r.schema.skills.length, active: true, desc: '' }
      );
      for (const c of state.characters) {
        if (c.rpgId === r.id && c.skillVals[saved.id] === undefined) c.skillVals[saved.id] = 0;
      }
      touchRpg(r);
      break;
    }
    case 'removeSkill': {
      const r = requireManage(a, user);
      r.schema.skills = r.schema.skills.filter((x) => x.id !== a.skillId);
      for (const c of state.characters) {
        if (c.rpgId === r.id) delete c.skillVals[a.skillId];
      }
      touchRpg(r);
      break;
    }
    case 'reorderSkill': {
      const r = requireManage(a, user);
      const list = r.schema.skills;
      const idx = list.findIndex((x) => x.id === a.skillId);
      const to = idx + (Number(a.delta ?? a.dir) || 0);
      if (idx < 0 || to < 0 || to >= list.length) return;
      const [moved] = list.splice(idx, 1);
      list.splice(to, 0, moved);
      list.forEach((x, i) => (x.order = i));
      touchRpg(r);
      break;
    }
    case 'setClass': {
      const r = requireManage(a, user);
      upsertSchemaItem(r.schema.classes, normalizeClass({ ...(a.cl || {}), id: a.cl && a.cl.id }), ['name', 'desc'], {});
      touchRpg(r);
      break;
    }
    case 'removeClass': {
      const r = requireManage(a, user);
      r.schema.classes = r.schema.classes.filter((x) => x.id !== a.classId);
      for (const c of state.characters) {
        if (c.rpgId === r.id && c.classId === a.classId) c.classId = '';
      }
      touchRpg(r);
      break;
    }
    case 'setFormula': {
      const r = requireManage(a, user);
      if (!Array.isArray(r.schema.formulas)) r.schema.formulas = [];
      const src = a.formula || {};
      if (!src.expr) throw new Error('Informe a expressão de cálculo.');
      const merged = {
        ...(src.id && r.schema.formulas.find((x) => x.id === src.id)),
        ...src
      };
      upsertSchemaItem(r.schema.formulas, normalizeFormula(merged), ['name', 'expr'], {});
      touchRpg(r);
      break;
    }
    case 'removeFormula': {
      const r = requireManage(a, user);
      r.schema.formulas = (r.schema.formulas || []).filter((x) => x.id !== a.formulaId);
      touchRpg(r);
      break;
    }
    case 'setRpgRule': {
      const r = requireManage(a, user);
      if (!r.schema.rules || typeof r.schema.rules !== 'object') r.schema.rules = {};
      const key = String(a.key || '').trim();
      if (!key) throw new Error('Informe a regra a alterar.');
      if (key === 'subDivisor') {
        const n = Math.max(1, Math.floor(Number(a.value) || 10));
        r.schema.rules.subDivisor = n;
      } else {
        r.schema.rules[key] = String(a.value ?? '');
      }
      touchRpg(r);
      break;
    }
    case 'setSchemaLabel': {
      const r = requireManage(a, user);
      const key = String(a.key || '');
      if (key !== 'classLabel') throw new Error('Rótulo desconhecido.');
      r.schema.classLabel = String(a.value || 'Funções').slice(0, 24) || 'Funções';
      touchRpg(r);
      break;
    }
    case 'setSections': {
      const r = requireManage(a, user);
      if (!Array.isArray(r.schema.sections)) r.schema.sections = normalizeSections(r.schema.sections);
      const desired = a.sections;
      const isList = Array.isArray(desired);
      const byId = {};
      r.schema.sections.forEach((s) => (byId[s.id] = s));
      if (isList) {
        const merged = [];
        for (const it of desired) {
          if (!it || !it.id) continue;
          const custom = it.type === 'custom' || !BUILTIN_META[it.id];
          merged.push({
            id: it.id,
            label: String((it.label && String(it.label).trim()) ? it.label : (BUILTIN_META[it.id] || {}).label || it.id).slice(0, 40),
            type: custom ? 'custom' : 'builtin',
            enabled: it.enabled !== false,
            col: (it.col === 'left' || it.col === 'right') ? it.col : (SEC_DEFAULT_COL[it.id] || 'right'),
            definition: custom ? it.definition : undefined
          });
        }
        r.schema.sections = normalizeSections(merged);
      } else if (desired && typeof desired === 'object') {
        for (const key of Object.keys(desired)) {
          if (typeof desired[key] === 'boolean' && byId[key]) byId[key].enabled = desired[key];
        }
      }
      touchRpg(r);
      break;
    }
    case 'addCatalogItem': {
      const r = requireManage(a, user);
      const cat = CATS.includes(a.category) ? a.category : 'acessorio';
      r.catalog.push({
        id: uid(),
        name: String(a.name || 'Item').slice(0, 60),
        category: cat,
        description: String(a.description || '').slice(0, 500),
        weight: num(a.weight, 0, 0),
        value: num(a.value, 0, 0),
        effect: String(a.effect || '').slice(0, 300),
        qty: a.qty === null || a.qty === undefined || a.qty === '' ? null : num(a.qty, 0, 0),
        stars: wantsStars(r) && cat === 'acessorio' ? normalizeStars(a.stars) : null
      });
      logMovement(r.id, 'entrada', { itemName: a.name, qty: a.qty || 1, byName: user.name });
      touchRpg(r);
      break;
    }
    case 'updateCatalogItem': {
      const r = requireManage(a, user);
      const i = r && r.catalog.find((x) => x.id === a.itemId);
      if (!i) throw new Error('Item não encontrado.');
      const p = a.patch || {};
      if (typeof p.name === 'string') i.name = p.name.slice(0, 60);
      if (CATS.includes(p.category)) i.category = p.category;
      if (typeof p.description === 'string') i.description = p.description.slice(0, 500);
      if (typeof p.effect === 'string') i.effect = p.effect.slice(0, 300);
      if (p.weight !== undefined) i.weight = num(p.weight, 0, i.weight);
      if (p.value !== undefined) i.value = num(p.value, 0, i.value);
      if (p.qty !== undefined) i.qty = p.qty === null ? null : num(p.qty, 0, i.qty === null ? 0 : i.qty);
      if (p.stars !== undefined) i.stars = wantsStars(r) && i.category === 'acessorio' ? normalizeStars(p.stars) : null;
      touchRpg(r);
      break;
    }
    case 'removeCatalogItem': {
      const r = requireManage(a, user);
      const i = r.catalog.find((x) => x.id === a.itemId);
      if (!i) throw new Error('Item não encontrado.');
      r.catalog = r.catalog.filter((x) => x.id !== a.itemId);
      logMovement(r.id, 'remocao', { itemName: i.name, qty: 1, byName: user.name });
      touchRpg(r);
      break;
    }
    case 'clearCharHistory': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const reason = String(a.reason || '').trim().slice(0, 200);
      if (!reason) throw new Error('Informe um motivo para limpar o histórico.');
      const count = state.movements.filter((m) => m.charId === c.id).length;
      if (!count) throw new Error('Histórico de itens já está vazio.');
      state.movements = state.movements.filter((m) => m.charId !== c.id);
      const r = findRpg(c.rpgId);
      logMovement(r ? r.id : '', 'limpeza', { charName: c.name, itemName: 'Histórico de itens', qty: count, byName: user.name, reason });
      touch(c);
      if (r) touchRpg(r);
      break;
    }
    case 'createCharacter': {
      const r = findRpg(a.rpgId);
      if (!r) throw new Error('Mesa inválida.');
      let ownerId = user && user.id ? user.id : null;
      if (canManage(user) && typeof a.ownerId === 'string' && findUser(a.ownerId)) ownerId = a.ownerId;
      const isMonster = canManage(user) && a.isMonster === true;
      const mMeta = isMonster && a.monster && typeof a.monster === 'object' ? a.monster : {};
      const c = {
        id: uid(),
        rpgId: r.id,
        ownerId,
        name: String(a.name || 'Sem nome').slice(0, 60),
        player: String(a.player || '').slice(0, 60),
        ident: String(a.ident || '').slice(0, 30),
        status: CHAR_STATUS.includes(a.status) ? a.status : 'ativo',
        classId: typeof a.classId === 'string' ? a.classId : '',
        photo: '',
        capacity: Math.max(1, Number(a.capacity) || 10),
        attrVals: {},
        skillVals: {},
        customAttrs: [],
        customSections: {},
        spells: [],
        runes: [],
        inventory: [],
        equipment: {},
        cash: 0,
        skillPointsExtra: 0,
        notes: '',
        isMonster,
        monster: {
          desafio: isMonster ? String(mMeta.desafio || '').slice(0, 30) : '',
          tipo: isMonster ? String(mMeta.tipo || '').slice(0, 40) : '',
          habitat: isMonster ? String(mMeta.habitat || '').slice(0, 60) : ''
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      for (const attr of r.schema.attrs) c.attrVals[attr.id] = initAttrVal(attr);
      for (const sk of r.schema.skills) c.skillVals[sk.id] = 0;
      state.characters.push(c);
      touchRpg(r);
      break;
    }
    case 'deleteCharacter': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      state.characters = state.characters.filter((x) => x.id !== a.charId);
      break;
    }
    case 'updateCharacter': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const isMestre = canManage(user);
      const isDono = !isMestre && c.ownerId === user.id;
      if (!isMestre && !isDono) throw new Error('Sem permissão.');
      const p = a.patch || a.fields || {};
      c.updatedAt = Date.now();
      if (isMestre) {
        if (typeof p.name === 'string') c.name = p.name.slice(0, 60);
        if (typeof p.player === 'string') c.player = p.player.slice(0, 60);
        if (typeof p.ident === 'string') c.ident = p.ident.slice(0, 30);
        if (CHAR_STATUS.includes(p.status)) c.status = p.status;
        if (typeof p.classId === 'string') c.classId = p.classId;
        if (typeof p.photo === 'string') {
          if (!p.photo.startsWith('data:image/')) c.photo = '';
          else if (p.photo.length > 90000) throw new Error('Imagem muito grande (máx. ~60KB).');
          else c.photo = p.photo;
        }
        if (p.capacity !== undefined) c.capacity = Math.max(1, Number(p.capacity) || 1);
        if (typeof p.notes === 'string') c.notes = p.notes.slice(0, 5000);
        if (p.cash !== undefined) c.cash = Math.max(0, Number(p.cash) || 0);
        if (p.skillPointsExtra !== undefined) c.skillPointsExtra = Math.max(0, Math.floor(Number(p.skillPointsExtra) || 0));
        if (typeof p.isMonster === 'boolean') c.isMonster = p.isMonster;
        if (p.monster && typeof p.monster === 'object') {
          if (!c.monster || typeof c.monster !== 'object') c.monster = {};
          if (typeof p.monster.desafio === 'string') c.monster.desafio = p.monster.desafio.slice(0, 30);
          if (typeof p.monster.tipo === 'string') c.monster.tipo = p.monster.tipo.slice(0, 40);
          if (typeof p.monster.habitat === 'string') c.monster.habitat = p.monster.habitat.slice(0, 60);
        }
        if (typeof p.ownerId === 'string') {
          if (p.ownerId === '' || findUser(p.ownerId)) c.ownerId = p.ownerId || null;
        }
      } else {
        if (typeof p.name === 'string') c.name = p.name.slice(0, 60);
        if (typeof p.ident === 'string') c.ident = p.ident.slice(0, 30);
        if (typeof p.classId === 'string') c.classId = p.classId;
        if (typeof p.notes === 'string') c.notes = p.notes.slice(0, 5000);
      }
      break;
    }
    case 'setAttrVal': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const isMestre = canManage(user);
      const isDono = !isMestre && c.ownerId === user.id;
      if (!isMestre && !isDono) throw new Error('Sem permissão.');
      const r = findRpg(c.rpgId);
      let aid = a.attrId;
      const isSub = typeof aid === 'string' && aid.endsWith(':sub');
      if (isSub) aid = aid.slice(0, -4);
      const attr = r && r.schema.attrs.find((x) => x.id === aid);
      if (!attr) throw new Error('Atributo não encontrado.');
      if (isDono && !isMestre) {
        if (isSub || attr.type !== 'number') throw new Error('Você só pode alterar seus recursos (VIDA/MANA/ESFORÇO).');
      }
      if (isSub) {
        if (attr.type !== 'level') throw new Error('Subpontos só existem para atributos de nível.');
        c.attrVals[a.attrId] = Math.max(0, Math.min(9999, Math.floor(Number(a.value) || 0)));
      } else {
        c.attrVals[a.attrId] = clampAttrValue(attr, a.value);
      }
      c.updatedAt = Date.now();
      break;
    }
    case 'setFormulaBuff': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const isMestre = canManage(user);
      const isDono = !isMestre && c.ownerId === user.id;
      if (!isMestre && !isDono) throw new Error('Sem permissão.');
      const r = findRpg(c.rpgId);
      const name = String(a.name || '').trim().toUpperCase();
      const ok = r && (r.schema.formulas || []).some((f) => String(f.name || '').trim().toUpperCase() === name);
      if (!ok) throw new Error('Cálculo não encontrado.');
      const v = Math.floor(Number(a.value));
      if (!Number.isFinite(v)) throw new Error('Valor inválido.');
      c.formulaBuffs = c.formulaBuffs || {};
      if (v === 0) delete c.formulaBuffs[name];
      else c.formulaBuffs[name] = Math.max(-99999, Math.min(99999, v));
      c.updatedAt = Date.now();
      break;
    }
    case 'setSkillVal': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const r = findRpg(c.rpgId);
      const sk = r && r.schema.skills.find((x) => x.id === a.skillId);
      if (!sk) throw new Error('Perícia não encontrada.');

      const isMestre = canManage(user);
      const isDono = !isMestre && c.ownerId === user.id;
      if (!isMestre && !isDono) throw new Error('Sem permissão.');

      let n = Number(a.value);
      if (!Number.isFinite(n)) n = 0;
      n = Math.max(0, Math.floor(n));
      if (isDono) {
        const base = poolForCatServer(r, c, sk.cat) || 0;
        const extra = Number(c.skillPointsExtra) || 0;
        const ceiling = base + extra;
        const spent = Object.entries(c.skillVals)
          .filter(([kid]) => r.schema.skills.some((s) => s.id === kid && s.cat === sk.cat))
          .reduce((s, [, v]) => s + (Number(v) || 0), 0);
        const cur = Number(c.skillVals[sk.id]) || 0;
        if (n > cur) {
          const wouldSpend = spent + (n - cur);
          if (wouldSpend > ceiling) throw new Error('Sem pontos de perícia suficientes para gastar nesta categoria.');
        } else {
          throw new Error('Você não pode remover pontos de perícia registrados pelo mestre.');
        }
      }
      if (sk.max != null) n = Math.min(sk.max, n);
      c.skillVals[sk.id] = n;
      c.updatedAt = Date.now();
      break;
    }
    case 'addCustomAttr': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      c.customAttrs.push({ id: uid(), name: String(a.name || 'Campo').slice(0, 30), value: String(a.value ?? '').slice(0, 200) });
      c.updatedAt = Date.now();
      break;
    }
    case 'updateCustomAttr': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      const c = findChar(a.charId);
      const attr = c && c.customAttrs.find((x) => x.id === a.fieldId);
      if (!attr) throw new Error('Campo não encontrado.');
      if (typeof a.name === 'string') attr.name = a.name.slice(0, 30);
      if (a.value !== undefined) attr.value = String(a.value).slice(0, 200);
      c.updatedAt = Date.now();
      break;
    }
    case 'removeCustomAttr': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      c.customAttrs = c.customAttrs.filter((x) => x.id !== a.fieldId);
      c.updatedAt = Date.now();
      break;
    }
    case 'setCustomField': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const r = findRpg(c.rpgId);
      const secs = Array.isArray(r && r.schema.sections) ? r.schema.sections : [];
      const sec = secs.find((s) => s.id === a.sectionId && s.type === 'custom' && s.enabled !== false);
      if (!sec) throw new Error('Seção não encontrada.');
      const field = sec.definition.find((f) => f.id === a.fieldId);
      if (!field) throw new Error('Campo não encontrado.');
      if (field.editable) {
        if (!canManage(user) && user.role !== 'jogador') throw new Error('Sem permissão.');
      } else if (!canManage(user)) {
        throw new Error('Sem permissão.');
      }
      if (!c.customSections) c.customSections = {};
      if (!c.customSections[sec.id]) c.customSections[sec.id] = {};
      c.customSections[sec.id][field.id] = String(a.value ?? '').slice(0, 500);
      c.updatedAt = Date.now();
      break;
    }
    case 'giveItem': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      const c = findChar(a.charId);
      const r = c && findRpg(c.rpgId);
      const item = r && r.catalog.find((x) => x.id === a.itemId);
      if (!item) throw new Error('Item não encontrado no catálogo.');
      const qty = Math.max(1, Number(a.qty) || 1);
      if (availableQty(r, item) < qty) throw new Error(`Estoque insuficiente de "${item.name}".`);
      const perSlot = item.weight > 0 ? Math.round((1 / item.weight) * 100) / 100 : 1;
      const movId = uid();
      c.inventory.push({
        id: uid(),
        movId,
        src: item.id,
        name: item.name,
        qty,
        perSlot,
        effect: item.effect || ''
      });
      logMovement(r.id, 'saida', { charId: c.id, charName: c.name, itemName: item.name, qty, byName: user.name });
      touch(c);
      touchRpg(r);
      break;
    }
    case 'returnItem': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const entry = c.inventory.find((x) => x.id === a.entryId);
      if (!entry) throw new Error('Item não está na mochila.');
      const qty = Math.min(Number(entry.qty) || 1, Math.max(1, Number(a.qty) || 1));
      entry.qty -= qty;
      for (const s of EQUIP_SLOTS) {
        if (c.equipment[s] === entry.id) c.equipment[s] = null;
      }
      const r = findRpg(c.rpgId);
      if (r) {
        logMovement(r.id, 'devolucao', { charId: c.id, charName: c.name, itemName: entry.name, qty, byName: user.name });
      }
      if (entry.qty <= 0) c.inventory = c.inventory.filter((x) => x.id !== a.entryId);
      touch(c);
      touchRpg(r);
      break;
    }
    case 'addItem': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      c.inventory.push({
        id: uid(),
        movId: '',
        src: '',
        name: String(a.name || 'Item').slice(0, 60),
        qty: Math.max(0, Number(a.qty) || 1),
        perSlot: Math.max(0.01, Number(a.perSlot) || 1),
        effect: ''
      });
      touch(c);
      break;
    }
    case 'updateItem': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      const c = findChar(a.charId);
      const item = c && c.inventory.find((x) => x.id === a.itemId);
      if (!item) throw new Error('Item não encontrado.');
      if (typeof a.name === 'string') item.name = a.name.slice(0, 60);
      if (a.qty !== undefined) item.qty = Math.max(0, Number(a.qty) || 0);
      if (a.perSlot !== undefined) item.perSlot = Math.max(0.01, Number(a.perSlot) || 0.01);
      touch(c);
      break;
    }
    case 'removeItem': {
      if (!canManage(user)) throw new Error('Sem permissão.');
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const entry = c.inventory.find((x) => x.id === a.itemId);
      if (entry) {
        for (const s of EQUIP_SLOTS) {
          if (c.equipment[s] === entry.id) c.equipment[s] = null;
        }
        const r = findRpg(c.rpgId);
        logMovement(r ? r.id : '', 'baixa', { charId: c.id, charName: c.name, itemName: entry.name, qty: entry.qty, byName: user.name });
      }
      c.inventory = c.inventory.filter((x) => x.id !== a.itemId);
      touch(c);
      break;
    }
    case 'addSpell': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      if (!canEditChar(user, c)) throw new Error('Sem permissão.');
      const ownerId = canManage(user) ? (typeof a.ownerId === 'string' ? a.ownerId : null) : user.id;
      c.spells.push({
        id: uid(),
        ownerId,
        name: String(a.name || 'Magia').slice(0, 60),
        cost: String(a.cost ?? '').slice(0, 20),
        description: String(a.description || '').slice(0, 1000)
      });
      touch(c);
      break;
    }
    case 'updateSpell': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const spell = c && c.spells.find((x) => x.id === a.spellId);
      if (!spell) throw new Error('Magia não encontrada.');
      if (!canTouchItem(user, c, spell.ownerId)) throw new Error('Sem permissão.');
      if (typeof a.name === 'string') spell.name = a.name.slice(0, 60);
      if (a.cost !== undefined) spell.cost = String(a.cost).slice(0, 20);
      if (typeof a.description === 'string') spell.description = a.description.slice(0, 1000);
      touch(c);
      break;
    }
    case 'removeSpell': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const spell = c.spells.find((x) => x.id === a.spellId);
      if (!spell) throw new Error('Magia não encontrada.');
      if (!canTouchItem(user, c, spell.ownerId)) throw new Error('Sem permissão.');
      c.spells = c.spells.filter((x) => x.id !== a.spellId);
      touch(c);
      break;
    }
    case 'addRune': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      if (!canEditChar(user, c)) throw new Error('Sem permissão.');
      const ownerId = canManage(user) ? (typeof a.ownerId === 'string' ? a.ownerId : null) : user.id;
      c.runes.push({
        id: uid(),
        ownerId,
        name: String(a.name || 'Runa').slice(0, 60),
        circle: String(a.circle || '').slice(0, 40),
        description: String(a.description || '').slice(0, 1000)
      });
      touch(c);
      break;
    }
    case 'updateRune': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const rune = c && c.runes.find((x) => x.id === a.runeId);
      if (!rune) throw new Error('Runa não encontrada.');
      if (!canTouchItem(user, c, rune.ownerId)) throw new Error('Sem permissão.');
      if (typeof a.name === 'string') rune.name = a.name.slice(0, 60);
      if (typeof a.circle === 'string') rune.circle = a.circle.slice(0, 40);
      if (typeof a.description === 'string') rune.description = a.description.slice(0, 1000);
      touch(c);
      break;
    }
    case 'removeRune': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      const rune = c.runes.find((x) => x.id === a.runeId);
      if (!rune) throw new Error('Runa não encontrada.');
      if (!canTouchItem(user, c, rune.ownerId)) throw new Error('Sem permissão.');
      c.runes = c.runes.filter((x) => x.id !== a.runeId);
      touch(c);
      break;
    }
    case 'setEquip': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      if (!canEditChar(user, c)) throw new Error('Sem permissão.');
      const slot = String(a.slot || '');
      const entry = c.inventory.find((x) => x.id === a.entryId);
      if (!entry) throw new Error('Item não está na mochila.');
      const r = findRpg(c.rpgId);
      const slots = equipSlotsOf(r);
      if (!slots.includes(slot)) throw new Error('Slot inválido.');
      const catItem = r && r.catalog.find((x) => x.id === entry.src);
      const itemCat = catItem ? catItem.category : '';
      if (!EQUIP_SLOT_CATS[slot].includes(itemCat)) throw new Error('Categoria incompatível com este slot.');
      const proposed = { ...(c.equipment || {}) };
      for (const s of slots) {
        if (proposed[s] === a.entryId) proposed[s] = null;
      }
      if (slot === 'escudo') {
        proposed['mao2'] = null;
      } else if (WEAPON_CATS.includes(itemCat) && proposed['escudo']) {
        proposed['escudo'] = null;
      }
      proposed[slot] = entry.id;
      if (equipmentStarsOf(r, c, proposed) > MAX_EQUIP_STARS) {
        throw new Error(`Limite de estrelas de acessório excedido (máximo ${MAX_EQUIP_STARS}).`);
      }
      c.equipment = proposed;
      touch(c);
      break;
    }
    case 'unequip': {
      const c = findChar(a.charId);
      if (!c) throw new Error('Ficha não encontrada.');
      if (!canEditChar(user, c)) throw new Error('Sem permissão.');
      const slot = String(a.slot || '');
      const rE = findRpg(c.rpgId);
      if (!equipSlotsOf(rE).includes(slot)) throw new Error('Slot inválido.');
      c.equipment[slot] = null;
      touch(c);
      break;
    }
    default:
      break;
  }
}

function equipmentStarsOf(r, c, equipment) {
  if (!wantsStars(r)) return 0;
  if (!equipment || typeof equipment !== 'object') return 0;
  let total = 0;
  for (const s of equipSlotsOf(r)) {
    const eid = equipment[s];
    if (!eid) continue;
    const e = c.inventory.find((x) => x.id === eid);
    if (!e) continue;
    const cat = r && r.catalog.find((x) => x.id === e.src);
    if (!cat || cat.category !== 'acessorio') continue;
    total += normalizeStars(cat.stars);
  }
  return total;
}

// ---- no encerramento (docker stop = SIGTERM, Ctrl+C = SIGINT): grava no disco ----
function flushOnShutdown() {
  if (sessionStore && typeof sessionStore.persistNowSync === 'function') sessionStore.persistNowSync();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Erro ao salvar data.json no encerramento:', err.message);
  }
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ secret: sessionSecret, users: usersStore }, null, 2));
  } catch (err) {
    console.error('Erro ao salvar users.json no encerramento:', err.message);
  }
}
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    try { flushOnShutdown(); } catch (e) { console.error('Erro no flush de encerramento:', e.message); }
    process.exit(0);
  });
}

server.listen(PORT, () => {
  console.log('');
  console.log('=== Estoque RPG rodando! Compartilhe um destes endereços ===');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  http://${net.address}:${PORT}   (${name})`);
      }
    }
  }
  console.log(`  http://localhost:${PORT}`);
  console.log('');
});
