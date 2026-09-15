const fs = require('fs');

function mkSkill(id, name, cat, desc, order) {
  return { id, name, cat, max: 5, desc, required: false, order, active: true };
}
const SKILLS = [
  mkSkill('intimidacao', 'Intimidação', 'Combate', '(FOR & SAB)', 0),
  mkSkill('luta', 'Luta', 'Combate', '(FOR & AGI)', 1),
  mkSkill('resistencia', 'Resistência', 'Combate', '(FOR & VIG)', 2),
  mkSkill('atletismo', 'Atletismo', 'Combate', '(VIG & AGI)', 3),
  mkSkill('movimentacao', 'Movimentação', 'Combate', '(AGI & FOR)', 4),
  mkSkill('mecanica', 'Mecânica', 'Saber', '(FOR & INT)', 5),
  mkSkill('pontaria', 'Pontaria', 'Combate', '(AGI & INT)', 6),
  mkSkill('reflexo', 'Reflexo', 'Combate', '(AGI)', 7),
  mkSkill('comunicacao', 'Comunicação', 'Social', '(INF)', 8),
  mkSkill('seducao', 'Sedução', 'Social', '(INF)', 9),
  mkSkill('musica', 'Música', 'Social', '(INF & SAB)', 10),
  mkSkill('vontade', 'Vontade', 'Mental', '(VIG & INF)', 11),
  mkSkill('sanidade', 'Sanidade', 'Mental', '(VIG & SAB)', 12),
  mkSkill('conhecimento', 'Conhecimento', 'Saber', '(SAB)', 13),
  mkSkill('magia', 'Magia', 'Arcana', '(INT & SAB)', 14),
  mkSkill('conjuracao', 'Conjuração', 'Arcana', '(INT & SAB)', 15),
  mkSkill('percepcao', 'Percepção', 'Saber', '(INT & INF)', 16),
  mkSkill('sobrevivencia', 'Sobrevivência', 'Saber', '(SAB & VIG)', 17),
];
const norm = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('Uso: node migrate-desajustados.cjs <input.json> <output.json>');
  process.exit(1);
}
const raw = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '');
const st = JSON.parse(raw);

for (const r of st.rpgs || []) {
  if (!r || !r.schema) continue;
  const oldSkills = (r.schema.skills || []).map((s) => ({ id: s.id, name: s.name, max: s.max, cat: s.cat }));
  const oldByName = oldSkills.reduce((m, s) => { m[norm(s.name)] = s; return m; }, {});
  r.schema.classLabel = 'Raças';
  r.schema.skills = SKILLS.map((s) => ({ ...s }));
  for (const c of st.characters || []) {
    if (c.rpgId !== r.id) continue;
    const cur = c.skillVals && typeof c.skillVals === 'object' ? c.skillVals : {};
    const next = {};
    for (const s of SKILLS) {
      let v = Number(cur[s.id] ?? 0);
      const old = oldByName[norm(s.name)];
      if (v === 0 && old && cur[old.id] !== undefined) v = Number(cur[old.id]) || 0;
      next[s.id] = v;
    }
    c.skillVals = next;
  }
}

fs.writeFileSync(output, JSON.stringify(st, null, 2), 'utf8');
console.log(
  `Migrado: ${(st.rpgs || [])
    .map((r) => `${r.name} -> ${r.schema.skills.length} perícias, classesLabel=${r.schema.classLabel}`)
    .join(' | ')}`
);