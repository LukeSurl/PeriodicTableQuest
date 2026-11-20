// Turns the classic Periodic Table Quest question sets (questions/*.js) into text files that the
// new Periodic Table Quest editor can import ("Import questions from text").
//
//   node tools/export-ptq-topics.js [output folder]     (default: quest/topics)
//
// Hand-written questions come over as they are, with their elements and steal flags.
// Generated questions (js/question_generators.js) can't be imported as code, so a few fixed
// examples of each generator are written out instead, each tied to the element it was made for.
// Explanations become "#" note lines, which the import ignores.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'quest', 'topics'));
const PER_GENERATOR = 6, PER_STEAL_GENERATOR = 4;

// A seeded random number generator, so the examples are the same each time
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
Math.random = rand;

// Load the classic engine with just enough of a browser around it
const ctx = { console, Math };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.document = { currentScript: null, createElement: () => ({}), head: { appendChild() {} } };
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
['js/config.js', 'js/elements.js', 'js/engine/tools.js', 'js/engine/quiz.js', 'js/question_generators.js'].forEach(load);
const PQ = ctx.PQ, ELS = ctx.PQ_ELEMENTS;
const GEN = PQ.generators, STEAL = PQ.stealGenerators;

// ---------- HTML → plain text with Unicode super- and subscripts ----------
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', ' ': '', '*': '*', a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', h: 'ₕ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', p: 'ₚ', s: 'ₛ', t: 'ₜ', ' ': '', r: 'ᵣ', u: 'ᵤ', v: 'ᵥ', i: 'ᵢ', j: 'ⱼ', '*': '*' };
const conv = (s, map, fallback) => { const t = decode(strip(s)); return [...t].every(c => c in map) ? [...t].map(c => map[c]).join('') : fallback(t); };
const strip = s => String(s).replace(/<[^>]+>/g, '');
const decode = s => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&minus;/g, '−').replace(/&times;/g, '×').replace(/&deg;/g, '°').replace(/&amp;/g, '&');
function text(html) {
  if (html == null) return '';
  let s = String(html)
    .replace(/<span class="nuc"><span class="nuc-n"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>([^<]*)<\/span>/g, (m, A, Z, S) => conv(A, SUP, t => `^${t}`) + conv(Z, SUB, t => `_${t}`) + S)
    .replace(/<sup>(.*?)<\/sup>/g, (m, x) => conv(x, SUP, t => `^(${t})`))
    .replace(/<sub>(.*?)<\/sub>/g, (m, x) => conv(x, SUB, t => t))
    .replace(/<br\s*\/?>/g, ' ');
  return decode(strip(s)).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
}
const num = v => String(+(+v).toPrecision(10));

// ---------- One question → a block of text ----------
const symList = els => [].concat(els || []).filter(Boolean);
function mcBlock(q, els, steal) {
  const opts = [text(q.a), ...(q.w || []).slice(0, 5).map(text)];
  const at = Math.floor(rand() * opts.length);
  const right = opts.shift(); opts.splice(at, 0, right);
  return [text(q.q), ...(els.length ? ['Elements: ' + els.join(', ')] : []), ...(steal ? ['Steal'] : []),
    ...opts.map((o, i) => (i === at ? '* ' : '- ') + o), ...(q.x ? ['# Explanation: ' + text(q.x)] : [])].join('\n');
}
function numBlock(q, value, els) {
  const v = +value, abs = Math.max(+q.tol || 0, (+q.rel || 0) * Math.abs(v));
  let tol = '';
  if (q.rel && !(+q.tol > (+q.rel) * Math.abs(v))) tol = ` ± ${num(q.rel * 100)}%`;
  else if (abs) tol = ` ± ${num(abs)}`;
  const unit = text(q.unit || '');
  if (!tol && /^×/.test(unit)) tol = ' ± 0';   // so "= 2.7 × 10⁻¹⁹ J" isn't read as one number
  return [text(q.q), ...(els.length ? ['Elements: ' + els.join(', ')] : []), 'Steal',
    `= ${num(v)}${tol}${unit ? ' ' + unit : ''}`, ...(q.show ? ['# Shown answer: ' + text(q.show)] : []), ...(q.x ? ['# Explanation: ' + text(q.x)] : [])].join('\n');
}

// Elements a generated question is about: the element it was made for, if the question's id
// includes its symbol and the question names it. Otherwise it is a general question.
function aboutElement(q, e) {
  const t = text(q.q);
  const named = new RegExp(`\\b${e.n}\\b`, 'i').test(t) || new RegExp(`(^|[^A-Za-z])${e.s}(?![a-z])`).test(t);
  return String(q.id || '').includes(e.s) && named ? [e.s] : [];
}
// A spread of examples from a generator: different elements, lighter elements first
function samples(gen, count) {
  const byId = new Map();
  ELS.forEach(e => { let q = null; try { q = gen(e); } catch (err) { q = null; } if (q && !byId.has(q.id)) byId.set(q.id, { q, e }); });
  const all = [...byId.values()];
  const light = all.filter(x => x.e.z <= 56), heavy = all.filter(x => x.e.z > 56);
  const pickFrom = list => { const out = []; const l = list.slice(); while (l.length && out.length < count) out.push(l.splice(Math.floor(rand() * l.length), 1)[0]); return out; };
  const out = pickFrom(light); if (out.length < count) out.push(...pickFrom(heavy).slice(0, count - out.length));
  return out.sort((a, b) => a.e.z - b.e.z);
}

fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(path.join(ROOT, 'questions')).filter(f => /\.js$/.test(f) && !f.startsWith('_')).sort();
const summary = [];
for (const f of files) {
  let set = null;
  PQ.questionSet = def => { set = def; };
  load('questions/' + f);
  if (!set) { console.warn('No question set in', f); continue; }
  const blocks = [], counts = { written: 0, generated: 0, steal: 0 };
  blocks.push(`# ${set.title}\n# Exported from the classic Periodic Table Quest (questions/${f}).\n# Import into a new Periodic Table Quest quiz: "Import questions from text", paste, then "Replace all questions".\n# Lines starting with # are notes and are ignored by the import.`);
  blocks.push('# ---------- Hand-written questions ----------');
  for (const q of set.questions || []) {
    const els = symList(q.el);
    if (q.steal) { blocks.push(numBlock(q, q.n, els)); counts.steal++; }
    else { blocks.push(mcBlock(q, els, false)); counts.written++; }
  }
  if ((set.generators || []).length) {
    blocks.push(`# ---------- Generated examples ----------\n# The classic game made these questions afresh for each element. Here are ${PER_GENERATOR} fixed examples of each kind.`);
    for (const g of set.generators) {
      if (!GEN[g]) { console.warn(`${f}: no generator ${g}`); continue; }
      for (const { q, e } of samples(GEN[g], PER_GENERATOR)) { blocks.push(mcBlock(q, aboutElement(q, e), false)); counts.generated++; }
    }
  }
  if ((set.stealGenerators || []).length) {
    blocks.push(`# ---------- Generated steal questions ----------\n# ${PER_STEAL_GENERATOR} fixed examples of each kind of steal challenge.`);
    for (const g of set.stealGenerators) {
      if (!STEAL[g]) { console.warn(`${f}: no steal generator ${g}`); continue; }
      for (const { q, e } of samples(STEAL[g], PER_STEAL_GENERATOR)) { blocks.push(numBlock(q, q.num, aboutElement(q, e))); counts.steal++; }
    }
  }
  const name = f.replace(/\.js$/, '') + '.txt';
  fs.writeFileSync(path.join(OUT, name), blocks.join('\n\n') + '\n');
  summary.push({ file: name, title: set.title, ...counts, total: counts.written + counts.generated + counts.steal });
}
console.table(summary);
