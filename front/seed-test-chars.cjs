const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, 'fixtures', 'data.json')
const raw = fs.readFileSync(FILE, 'utf8')
const st = JSON.parse(raw)
const rpg = st.rpgs[0]

// ---------- 1. Schema novo (decisão da migração): 6 atrs + 18 perícias ----------
const newAttrs = [
  { id: 'vida', name: 'VIDA', type: 'number', min: 0, max: null, options: [], required: false, order: 0, active: true, desc: 'Pontos de vida atuais', hasSub: false },
  { id: 'mana', name: 'MANA', type: 'number', min: 0, max: null, options: [], required: false, order: 1, active: true, desc: 'Pontos de mana atuais', hasSub: false },
  { id: 'esforco', name: 'ESFORÇO', type: 'number', min: 0, max: null, options: [], required: false, order: 2, active: true, desc: 'Pontos de esforço atuais', hasSub: false },
  { id: 'forca', name: 'Força', type: 'level', min: 0, max: 100, options: [], required: false, order: 3, active: true, desc: '+2 Espaço por nível', hasSub: true },
  { id: 'vigor', name: 'Vigor', type: 'level', min: 0, max: 100, options: [], required: false, order: 4, active: true, desc: '+2 HP por nível', hasSub: true },
  { id: 'agilidade', name: 'Agilidade', type: 'level', min: 0, max: 100, options: [], required: false, order: 5, active: true, desc: '+1 AC Movimento', hasSub: true },
  { id: 'inteligencia', name: 'Inteligência', type: 'level', min: 0, max: 100, options: [], required: false, order: 6, active: true, desc: '+1 slot de runa por nível (múltiplos de 10)', hasSub: true },
  { id: 'sabedoria', name: 'Sabedoria', type: 'level', min: 0, max: 100, options: [], required: false, order: 7, active: true, desc: '+1 slot de runa por nível (múltiplos de 10)', hasSub: true },
  { id: 'influencia', name: 'Influência', type: 'level', min: 0, max: 100, options: [], required: false, order: 8, active: true, desc: '+1 perícia por nível (múltiplos de 10)', hasSub: true },
]

const newSkills = [
  { id: 'intimidacao', name: 'Intimidação', cat: 'Combate', max: 5, desc: '(FOR & SAB)', active: true, order: 0 },
  { id: 'luta', name: 'Luta', cat: 'Combate', max: 5, desc: '(FOR & AGI)', active: true, order: 1 },
  { id: 'resistencia', name: 'Resistência', cat: 'Combate', max: 5, desc: '(FOR & VIG)', active: true, order: 2 },
  { id: 'atletismo', name: 'Atletismo', cat: 'Combate', max: 5, desc: '(VIG & AGI)', active: true, order: 3 },
  { id: 'movimentacao', name: 'Movimentação', cat: 'Combate', max: 5, desc: '(AGI & FOR)', active: true, order: 4 },
  { id: 'mecanica', name: 'Mecânica', cat: 'Saber', max: 5, desc: '(FOR & INT)', active: true, order: 5 },
  { id: 'pontaria', name: 'Pontaria', cat: 'Combate', max: 5, desc: '(AGI & INT)', active: true, order: 6 },
  { id: 'reflexo', name: 'Reflexo', cat: 'Combate', max: 5, desc: '(AGI)', active: true, order: 7 },
  { id: 'comunicacao', name: 'Comunicação', cat: 'Social', max: 5, desc: '(INF)', active: true, order: 8 },
  { id: 'seducao', name: 'Sedução', cat: 'Social', max: 5, desc: '(INF)', active: true, order: 9 },
  { id: 'musica', name: 'Música', cat: 'Social', max: 5, desc: '(INF & SAB)', active: true, order: 10 },
  { id: 'vontade', name: 'Vontade', cat: 'Mental', max: 5, desc: '(VIG & INF)', active: true, order: 11 },
  { id: 'sanidade', name: 'Sanidade', cat: 'Mental', max: 5, desc: '(VIG & SAB)', active: true, order: 12 },
  { id: 'conhecimento', name: 'Conhecimento', cat: 'Saber', max: 5, desc: '(SAB)', active: true, order: 13 },
  { id: 'magia', name: 'Magia', cat: 'Arcana', max: 5, desc: '(INT & SAB)', active: true, order: 14 },
  { id: 'conjuracao', name: 'Conjuração', cat: 'Arcana', max: 5, desc: '(INT & SAB)', active: true, order: 15 },
  { id: 'percepcao', name: 'Percepção', cat: 'Saber', max: 5, desc: '(INT & INF)', active: true, order: 16 },
  { id: 'sobrevivencia', name: 'Sobrevivência', cat: 'Saber', max: 5, desc: '(SAB & VIG)', active: true, order: 17 },
]

rpg.schema.attrs = newAttrs
rpg.schema.skills = newSkills

// ---------- 2. Catálogo de itens (keep) ----------
const cat = {}
for (const it of rpg.catalog) cat[it.id] = it

// ---------- 3. Fichas de teste ----------
function uid() { return Math.random().toString(36).slice(2, 10) }

function makeItem(catalogId, qty, extra = {}) {
  const it = cat[catalogId]
  return {
    id: uid(),
    movId: uid(),
    src: catalogId,
    name: it.name,
    qty,
    perSlot: it.weight > 0 ? Math.round((1 / it.weight) * 100) / 100 : 1,
    effect: it.effect || '',
    ...extra,
  }
}

const ATTRS = ['forca', 'vigor', 'agilidade', 'inteligencia', 'sabedoria', 'influencia']
function attrVals(points = {}, res = {}) {
  const v = { vida: res.vida ?? 0, mana: res.mana ?? 0, esforco: res.esforco ?? 0 }
  for (const a of ATTRS) {
    const p = points[a] ?? 0
    v[a] = p
    v[a + ':sub'] = (points[a + ':sub'] ?? 0)
  }
  return v
}
function skillVals(v = {}) {
  const o = {}
  for (const s of newSkills) o[s.id] = v[s.id] ?? 0
  return o
}

const now = Date.now()
const classes = rpg.schema.classes
const cls = (name) => { const c = classes.find((x) => x.name === name); if (!c) throw new Error('classe n ' + name); return c.id }

const chars = [
  {
    id: uid(), rpgId: rpg.id, ownerId: 'u_jogador',
    name: 'Kaelen Vale', player: 'Jogador', ident: '2024', status: 'ativo',
    classId: cls('Mago'), photo: '', capacity: 14,
    attrVals: attrVals({ forca: 10, vigor: 20, agilidade: 20, inteligencia: 60, sabedoria: 40, influencia: 10 }, { vida: 32, mana: 24, esforco: 10 }),
    skillVals: skillVals({ magia: 4, conjuracao: 3, conhecimento: 3, percepcao: 2, sanidade: 1, vontade: 2, comunicacao: 1 }),
    customAttrs: [], customSections: {},
    spells: [
      { id: uid(), ownerId: 'u_jogador', name: 'Bola de Fogo', cost: '5 MANA', description: 'Explosão de chamas num alvo à vista.' },
      { id: uid(), ownerId: 'u_jogador', name: 'Escudo Arcano', cost: '3 MANA', description: '+2 defesa por 1 min.' },
      { id: uid(), ownerId: 'u_jogador', name: 'Raio de Gelo', cost: '4 MANA', description: 'Dano de frio e chance de congelar.' },
    ],
    runes: [
      { id: uid(), ownerId: 'u_jogador', name: 'Runa de Fogo', circle: '1º Círculo', description: 'Dano +1 por runa de fogo equipada.' },
      { id: uid(), ownerId: 'u_jogador', name: 'Runa de Frio', circle: '2º Círculo', description: 'Aplica Lentidão ao acertar.' },
    ],
    inventory: [
      makeItem('w4ulkhnq', 1),
      makeItem('09g68bm1', 4),
      makeItem('g2p4e3qg', 2),
      makeItem('sm6jaol9', 5),
    ],
    equipment: { mao1: null, mao2: null, escudo: null, grimorio: null, armadura: null },
    cash: 1280, skillPointsExtra: 0,
    notes: 'Nascido em Vale do Crepúsculo. Busca o Tomo Perdido dos Magi-Arcanos.',
    createdAt: now - 8e7, updatedAt: now - 8e7,
  },
  {
    id: uid(), rpgId: rpg.id, ownerId: null,
    name: 'Rurik Ferrão', player: '', ident: '001', status: 'ativo',
    classId: cls('Guerreiro'), photo: '', capacity: 20,
    attrVals: attrVals({ forca: 60, vigor: 70, agilidade: 20, inteligencia: 10, sabedoria: 10, influencia: 10 }, { vida: 44, mana: 6, esforco: 18 }),
    skillVals: skillVals({ luta: 4, resistencia: 5, atletismo: 4, movimentacao: 2, intimidacao: 3, vontade: 3 }),
    customAttrs: [], customSections: {},
    spells: [],
    runes: [],
    inventory: [
      makeItem('i10f7gt0', 1),
      makeItem('0ktnpayp', 3),
      makeItem('d6yol99y', 6),
    ],
    equipment: { mao1: null, mao2: null, escudo: null, grimorio: null, armadura: null },
    cash: 340, skillPointsExtra: 0,
    notes: 'Mercenário de Braume. Deve uma vida a Rurik Velho.',
    createdAt: now - 5e7, updatedAt: now - 5e7,
  },
  {
    id: uid(), rpgId: rpg.id, ownerId: null,
    name: 'Lyra Mezkal', player: '', ident: '002', status: 'ativo',
    classId: cls('Arqueiro'), photo: '', capacity: 16,
    attrVals: attrVals({ forca: 20, vigor: 30, agilidade: 80, inteligencia: 20, sabedoria: 30, influencia: 10 }, { vida: 28, mana: 8, esforco: 14 }),
    skillVals: skillVals({ pontaria: 5, reflexo: 4, movimentacao: 3, percepcao: 4, sobrevivencia: 3, comunicacao: 2 }),
    customAttrs: [], customSections: {},
    spells: [],
    runes: [],
    inventory: [
      makeItem('lv1a91i0', 1),
      makeItem('1nmklpey', 4),
      makeItem('09g68bm1', 2),
      makeItem('5vydwpcz', 2),
    ],
    equipment: { mao1: null, mao2: null, escudo: null, grimorio: null, armadura: null },
    cash: 590, skillPointsExtra: 0,
    notes: 'Caçadora de aberrações na Estrada dos Sussurros.',
    createdAt: now - 3e7, updatedAt: now - 3e7,
  },
  {
    id: uid(), rpgId: rpg.id, ownerId: null,
    name: 'Sombra de Jukai', player: '', ident: '003', status: 'ativo',
    classId: cls('Ladino'), photo: '', capacity: 14,
    attrVals: attrVals({ forca: 20, vigor: 40, agilidade: 60, inteligencia: 30, sabedoria: 30, influencia: 20 }, { vida: 30, mana: 10, esforco: 12 }),
    skillVals: skillVals({ movimentacao: 5, reflexo: 4, comunicacao: 3, seducao: 3, percepcao: 3, sobrevivencia: 2 }),
    customAttrs: [], customSections: {},
    spells: [],
    runes: [],
    inventory: [
      makeItem('2flxzw3p', 1),
      makeItem('yxdnnmm8', 3),
    ],
    equipment: { mao1: null, mao2: null, escudo: null, grimorio: null, armadura: null },
    cash: 2590, skillPointsExtra: 0,
    notes: 'Identidade desconhecida. Trabalha para a Guilda das Sombras.',
    createdAt: now - 2e7, updatedAt: now - 2e7,
  },
  {
    id: uid(), rpgId: rpg.id, ownerId: 'u_jogador',
    name: 'Enzo Curado', player: 'Jogador', ident: '004', status: 'ativo',
    classId: cls('Mago'), photo: '', capacity: 12,
    attrVals: attrVals({ forca: 0, vigor: 30, agilidade: 20, inteligencia: 50, sabedoria: 60, influencia: 10 }, { vida: 26, mana: 30, esforco: 8 }),
    skillVals: skillVals({ magia: 3, conjuracao: 4, conhecimento: 3, sanidade: 2, vontade: 2, comunicacao: 2 }),
    customAttrs: [], customSections: {},
    spells: [
      { id: uid(), ownerId: 'u_jogador', name: 'Toque Curativo', cost: '3 MANA', description: 'Restaura 2d4 de VIDA.' },
      { id: uid(), ownerId: 'u_jogador', name: 'Luz Divina', cost: '1 MANA', description: 'Ilumina e revela itens mágicos.' },
    ],
    runes: [
      { id: uid(), ownerId: 'u_jogador', name: 'Runa de Luz', circle: '1º Círculo', description: 'Brilha fracamente em presença de magia.' },
    ],
    inventory: [
      makeItem('gb5kngk8', 1),
      makeItem('0ktnpayp', 4),
      makeItem('sm6jaol9', 3),
    ],
    equipment: { mao1: null, mao2: null, escudo: null, grimorio: null, armadura: null },
    cash: 750, skillPointsExtra: 0,
    notes: 'Acolito de Cura. Fala com espíritos da natureza.',
    createdAt: now - 1e7, updatedAt: now - 1e7,
  },
]

// equipar alguns (mao1 arma, armadura)
function equip(char, slot, catalogId, qty) {
  const it = makeItem(catalogId, qty)
  char.inventory.push(it)
  char.equipment[slot] = it.id
}

chars[0].equipment.grimorio = chars[0].inventory[0].id
equip(chars[0], 'mao1', 'zu2abaae', 1)          // Cajado do Olho de Dragão
equip(chars[0], 'armadura', 'ar72z7rw', 1)      // Roupão de Mago

equip(chars[1], 'mao1', 'i10f7gt0', 1)          // Lâmina de Ferro
equip(chars[1], 'mao2', 'bddz1jfk', 1)          // Brasão de Ferro (escudo)
equip(chars[1], 'armadura', '4axexvd8', 1)      // Armadura Coberta
chars[1].equipment.escudo = chars[1].equipment.mao2
chars[1].equipment.mao2 = null

equip(chars[2], 'mao2', 'lv1a91i0', 1)          // Placa Afiada
equip(chars[2], 'armadura', 'u3mtd6v3', 1)      // Roupas de Explorador

equip(chars[3], 'mao1', '2flxzw3p', 1)          // Taco Fervente
equip(chars[3], 'armadura', 'u3mtd6v3', 1)      // Roupas de Explorador
equip(chars[3], 'grimorio', 'dyqbm6k0', 1)      // Livro Preto

st.characters = chars

fs.writeFileSync(FILE, JSON.stringify(st, null, 2))
console.log('OK: schema attrs', rpg.schema.attrs.length, 'skills', rpg.schema.skills.length, 'characters', st.characters.length)