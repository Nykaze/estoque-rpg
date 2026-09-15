const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.env.DATA_FILE || '/data/data.json', 'utf8'));
const r = d.rpgs[0];
console.log('rpg:', r.name, '| id:', r.id);
console.log('chars:', d.characters.length, '|', d.characters[0] && d.characters[0].name, '(formulaBuffs:', JSON.stringify(d.characters[0].formulaBuffs || {}), ')');
console.log('skills:', r.schema.skills.length, '| attrs:', r.schema.attrs.length, '| catalog:', r.catalog.length);
console.log('formulas:', r.schema.formulas.map((f) => f.name + '=' + f.expr).join(' | '));
console.log('classLabel:', r.schema.classLabel);
let bad = 0;
const blob = JSON.stringify(d);
for (let i = 0; i < blob.length; i++) {
  const c = blob.charCodeAt(i);
  if (c === 0xfffd || c === 0x251c || c === 0x00c3) bad++;
}
console.log('codepoints problematicos:', bad);