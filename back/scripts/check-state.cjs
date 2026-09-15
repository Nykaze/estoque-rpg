const fs = require('fs');
const d = JSON.parse(fs.readFileSync('/data/data.json', 'utf8'));
const r = d.rpgs[0];
const cp = (s) => [...s].map((c) => c.codePointAt(0).toString(16)).join(' ');
for (const a of r.schema.attrs) console.log(a.name, '=>', cp(a.name));
console.log('classLabel:', r.schema.classLabel, '=>', cp(r.schema.classLabel));
console.log('frm1:', r.schema.formulas[1].expr);
const str = JSON.stringify(d);
console.log('FFFD:', str.includes('\uFFFD'), '| U+251C:', str.includes('\u251C'), '| U+00C3:', (str.match(/\u00c3/g) || []).length);