// Periodic Table Quest engine: chooses a question for a tapped element.
// You shouldn't need to edit this file. Questions live in the questions/ folder and
// generators in js/question_generators.js.
//
// For each tap: pick a question set according to the mix, then pick from that set's
// hand-written questions for this element, its generators, and its general questions.
(function () {
  const PQ = window.PQ = window.PQ || {};
  const { rnd, pick, shuffle, ELEMENTS: ELS, BY_Z, BY_S } = PQ.tools;
  PQ.sets = PQ.sets || {};
  const GEN = PQ.generators = PQ.generators || {};
  const STEAL = PQ.stealGenerators = PQ.stealGenerators || {};
  PQ.addGenerators = obj => Object.assign(GEN, obj);
  PQ.addStealGenerators = obj => Object.assign(STEAL, obj);

  // First loaded set in the configured mix, else any loaded set
  const defaultTopic = () => Object.keys((window.PQ_CONFIG || {}).mix || {}).find(t => PQ.sets[t]) || Object.keys(PQ.sets)[0];
  const bank = topic => PQ.sets[topic || defaultTopic()] || PQ.sets[defaultTopic()];

  // Pick a question bank at random according to the mix, e.g. { skills1: 75, isotopes: 25 }
  function chooseTopic(mix) {
    const entries = Object.entries(mix || {}).filter(([t, w]) => PQ.sets[t] && +w > 0);
    if (!entries.length) return defaultTopic();
    let r = Math.random() * entries.reduce((s, [, w]) => s + +w, 0);
    for (const [t, w] of entries) { r -= +w; if (r <= 0) return t; }
    return entries[0][0];
  }

  const curated = topic => bank(topic).questions.map((q, i) => ({ ...q, id: `${topic}:c:${i}` }));
  function curatedFor(e, topic) {
    return curated(topic).filter(q => !q.steal && q.el && [].concat(q.el).includes(e.s));
  }
  function general(topic) {
    return curated(topic).filter(q => !q.steal && !q.el);
  }

  // seen: Set of question ids this player has already had (avoid repeats where possible)
  function getQuestion(z, seen = new Set(), topic = defaultTopic()) {
    const e = BY_Z[z];
    const b = bank(topic);
    const weighted = [];
    curatedFor(e, topic).forEach(q => weighted.push([q, 3]));
    (b.generators || []).forEach(g => {
      const q = GEN[g] && GEN[g](e);
      if (q && q.w.length >= 2) weighted.push([q, (q.calc ? 0.6 : 1) * (q.weight || 1)]);
    });
    const gen = general(topic);
    if (gen.length) {
      const unseen = gen.filter(q => !seen.has(q.id));
      weighted.push([pick(unseen.length ? unseen : gen), b.generalWeight || (weighted.length ? 1.2 : 1)]);
    }
    // A bank with nothing for this element (e.g. one made only of element-linked questions): use any of its questions
    if (!weighted.length) curated(topic).filter(q => !q.steal).forEach(q => weighted.push([q, 1]));
    if (!weighted.length) return topic === defaultTopic() ? null : getQuestion(z, seen, defaultTopic());
    let pool = weighted.filter(([q]) => !seen.has(q.id));
    if (!pool.length) pool = weighted;
    const tot = pool.reduce((s, p) => s + p[1], 0);
    let r = Math.random() * tot, q = pool[0][0];
    for (const [qq, w] of pool) { r -= w; if (r <= 0) { q = qq; break; } }
    const options = shuffle([{ html: typeset(q.a), correct: true }, ...q.w.slice(0, 3).map(w => ({ html: typeset(w), correct: false }))]);
    return { id: q.id, q: typeset(q.q), options, explain: typeset(q.x || ''), answer: typeset(q.a) };
  }


  function stealPool(e, topic) {
    const out = [], b = bank(topic);
    (b.stealGenerators || []).forEach(g => { const q = STEAL[g] && STEAL[g](e); if (q) for (let k = 0; k < (q.weight || 1); k++) out.push(q); });
    curated(topic).forEach(q => { if (q.steal && (!q.el || [].concat(q.el).includes(e.s))) out.push({ ...q, num: q.n }); });
    return out;
  }

  // A harder, numeric question for stealing an element. If the tapped element has no
  // suitable isotope data (e.g. sodium, or the superheavy elements), a challenge
  // about another element is used instead.
  function getStealQuestion(z, seen = new Set(), topic = defaultTopic()) {
    let e = BY_Z[z], pool = stealPool(e, topic), other = null;
    if (!pool.length) {
      const cands = ELS.filter(x => stealPool(x, topic).length);
      if (!cands.length) return null;
      other = pick(cands); pool = stealPool(other, topic);
    }
    const fresh = pool.filter(q => !seen.has(q.id));
    const q = pick(fresh.length ? fresh : pool);
    return { id: q.id, numeric: true, q: typeset(q.q), num: q.num, tol: q.tol ?? 0, rel: q.rel ?? 0, dp: q.dp ?? 0, unit: typeset(q.unit || ''),
      show: q.show ? typeset(q.show) : null, explain: typeset(q.x || ''), about: other ? other.n : null };
  }

  // Parse a typed number ("24,0", "24 %", " 35.48") and check it
  function checkNumeric(q, text) {
    let t = String(text).trim().replace(/\s+/g, '').replace(',', '.').replace(/[×x]10\^?/i, 'e').replace(/−/g, '-');
    let v = /^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(t) ? Number(t) : parseFloat(t.replace(/[^0-9.\-]/g, ''));
    if (isNaN(v)) return null;
    const tol = Math.max(q.tol || 0, (q.rel || 0) * Math.abs(q.num));
    return Math.abs(v - q.num) <= tol + 1e-9;
  }

  // ---------- Typesetting: non-breaking spaces in quantities ----------
  // Joins a number to its unit (0.10 mol, 10<sup>8</sup> m) and the parts of compound units
  // (mol dm<sup>−3</sup>, J s, g cm<sup>−3</sup>) with non-breaking spaces, so they never split across lines.
  const NB = ' ';
  const U = '(?:(?:[kmµnpMGTdcf]?(?:mol|Hz|Pa|eV|Da|g|m|s|J|L|M|W|V))|°C|K|u|Å|min|atm)';
  const END = '(?!\\.[A-Za-z])(?=<sup>|<sub>|</|[\\s\\u00A0,.;:)!?/"\'”’]|$)';
  const numUnit = new RegExp(`(\\d|</sup>|[⁰¹²³⁴⁵⁶⁷⁸⁹])[ ](${U})${END}`, 'g');
  const unitUnit = new RegExp(`((?:^|[\\s\\u00A0(>])${U}(?:<sup>[^<]*</sup>)?)[ ](${U})${END}`, 'g');
  function typeset(html) {
    if (!html) return html;
    let out = String(html).replace(/([\d.]+) × 10/g, `$1${NB}×${NB}10`).replace(numUnit, `$1${NB}$2`).replace(/(\d) (s\.f\.|d\.p\.)/g, `$1${NB}$2`), prev;
    do { prev = out; out = out.replace(unitUnit, `$1${NB}$2`); } while (out !== prev);
    return out;
  }

  const api = { typeset, getQuestion, getStealQuestion, chooseTopic, checkNumeric, BY_Z, BY_S, GEN, STEAL };
  Object.assign(PQ, api);
  window.PQ_QUIZ = api;   // older name, kept for compatibility
})();
