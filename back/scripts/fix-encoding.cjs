const fs = require('fs');
const path = require('path');

const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'cp850-map.json'), 'utf8'));
const byteToCp = Object.fromEntries(Object.entries(map).map(([b, cp]) => [Number(b), cp]));
const cpToByte = {};
for (const [b, cp] of Object.entries(byteToCp)) {
  if (!(cp in cpToByte)) cpToByte[cp] = Number(b);
}
const enc = (b) => new TextDecoder('windows-1252').decode(new Uint8Array(b));

function tryReverse(str) {
  const bytes = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) {
      bytes.push(cp);
      continue;
    }
    if (!(cp in cpToByte)) return null;
    bytes.push(cpToByte[cp]);
  }
  const out = Buffer.from(bytes);
  const dec = out.toString('utf8');
  if (dec.includes('\uFFFD')) return null;
  const reparsed = Buffer.from(dec, 'utf8');
  if (reparsed.compare(out) !== 0) return null;
  return dec;
}

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error('Uso: node fix-encoding.cjs <input.json> <output.json>');
  process.exit(1);
}
const raw = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(raw);

let changed = 0;
const samples = [];
function walk(node) {
  if (typeof node === 'string') {
    const fixed = tryReverse(node);
    if (fixed !== null && fixed !== node) {
      changed++;
      if (samples.length < 15) samples.push(`${node}  =>  ${fixed}`);
      return fixed;
    }
    return node;
  }
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) node[k] = walk(node[k]);
  }
  return node;
}
const fixedData = walk(data);

fs.writeFileSync(output, JSON.stringify(fixedData, null, 2), 'utf8');
console.log(`Strings alteradas: ${changed}`);
for (const s of samples) console.log('  ' + s);