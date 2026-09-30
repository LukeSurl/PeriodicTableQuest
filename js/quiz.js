// Question engine: picks a question for a tapped element.
// Mixes (a) your own questions for that element, (b) questions generated from
// the element's isotope data, and (c) occasional general questions.
(function () {
  const ELS = window.PQ_ELEMENTS;
  const BY_Z = {}, BY_S = {};
  ELS.forEach(e => { BY_Z[e.z] = e; BY_S[e.s] = e; });

  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lc = e => e.n.toLowerCase();

  // Nuclide notation with mass number over atomic number.
  const nuc = (A, Z, S) => `<span class="nuc"><span class="nuc-n"><span>${A}</span><span>${Z}</span></span>${S}</span>`;
  const sup = (A, S) => `<sup>${A}</sup>${S}`;

  // Fill a set of wrong answers from candidates, skipping duplicates of the answer.
  function distractors(answer, cands, n = 3) {
    const out = [];
    for (const c of cands) {
      const s = String(c);
      if (s !== String(answer) && !out.includes(s) && !(typeof c === 'number' && c < 0)) out.push(s);
      if (out.length === n) break;
    }
    // Numeric fallback so small numbers (e.g. hydrogen) still get three wrong answers
    if (/^\d+$/.test(String(answer))) for (let k = 1; out.length < n && k < 20; k++) {
      const v = String(+answer + k);
      if (!out.includes(v) && v !== String(answer)) out.push(v);
    }
    return out;
  }

  // A reasonably common isotope of this element to ask about.
  function someIsotope(e) {
    const common = e.iso.filter(i => i[1] >= 0.5).map(i => i[0]);
    if (common.length) return pick(common);
    return e.A;
  }

  const MONO = ['Be', 'F', 'Na', 'Al', 'P', 'Sc', 'Mn', 'Co', 'As', 'Y', 'Nb', 'Rh', 'I', 'Cs', 'Pr', 'Tb', 'Ho', 'Tm', 'Au', 'Bi'];
  const IONS = { H: 1, Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1, Ag: 1, Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2, Zn: 2, Cu: 2, Fe: [2, 3], Al: 3,
    F: -1, Cl: -1, Br: -1, I: -1, O: -2, S: -2, N: -3 };
  const chargeStr = q => (Math.abs(q) === 1 ? '' : Math.abs(q)) + (q > 0 ? '+' : '−');

  // Isotopes to use for a relative atomic mass calculation (2 or 3 isotopes covering ~all of the element).
  function ramIsotopes(e) {
    const main = e.iso.filter(i => i[1] >= 0.1);
    if (main.length < 2 || main.length > 3) return null;
    const total = main.reduce((s, i) => s + i[1], 0);
    if (total < 99.8) return null;
    // Round to 1 d.p. and make them sum to exactly 100.0
    const r = main.map(i => [i[0], Math.round(i[1] * 10) / 10]);
    const diff = Math.round((100 - r.reduce((s, i) => s + i[1], 0)) * 10) / 10;
    r[0][1] = Math.round((r[0][1] + diff) * 10) / 10;
    // Skip cases that land close to a rounding boundary (e.g. 6.95), which would be ambiguous
    const v = r.reduce((s, i) => s + i[0] * i[1], 0) / 100;
    if (Math.abs((v * 10) % 1 - 0.5) < 0.1) return null;
    return r;
  }

  const GEN = {
    neutrons(e) {
      const A = someIsotope(e), N = A - e.z;
      return { id: `g:n:${e.s}:${A}`,
        q: `How many neutrons are in one atom of ${lc(e)}-${A} (${sup(A, e.s)})?`,
        a: String(N), w: distractors(N, shuffle([e.z, A, N + 1, N - 1, A + e.z, N + 2])),
        x: `Neutrons = mass number − atomic number = ${A} − ${e.z} = ${N}.` };
    },
    protons(e) {
      const A = someIsotope(e), N = A - e.z;
      return { id: `g:p:${e.s}:${A}`,
        q: `How many protons are in the nucleus of ${sup(A, e.s)}?`,
        a: String(e.z), w: distractors(e.z, shuffle([A, N, e.z + 1, e.z - 1, A - 1]).filter(v => v > 0)),
        x: `${e.n} has atomic number ${e.z}, so every ${lc(e)} atom has ${e.z} protons, whatever its mass number.` };
    },
    notation(e) {
      const A = someIsotope(e), Z = e.z, N = A - Z;
      const right = nuc(A, Z, e.s);
      const cands = [nuc(N, Z, e.s), nuc(Z, A, e.s), nuc(A, N, e.s), nuc(A + Z, Z, e.s), nuc(A - 1, Z, e.s)];
      return { id: `g:no:${e.s}:${A}`,
        q: `Which symbol represents an atom with ${Z} proton${Z > 1 ? 's' : ''} and ${N} neutron${N === 1 ? '' : 's'}?`,
        a: right, w: distractors(right, cands),
        x: `Mass number (top) = ${Z} + ${N} = ${A}; atomic number (bottom) = ${Z}.` };
    },
    ions(e) {
      if (!(e.s in IONS)) return null;
      const q = [].concat(IONS[e.s]); const c = pick(q);
      const A = someIsotope(e), el = e.z - c;
      return { id: `g:ion:${e.s}:${A}:${c}`,
        q: `How many electrons are in one ${sup(A, e.s)}<sup>${chargeStr(c)}</sup> ion?`,
        a: String(el), w: distractors(el, shuffle([e.z, e.z + c, A - e.z, el + 1, el - 1, A - el])),
        x: `A neutral ${lc(e)} atom has ${e.z} electrons. A charge of ${chargeStr(c)} means ${Math.abs(c)} electron${Math.abs(c) > 1 ? 's' : ''} ${c > 0 ? 'lost' : 'gained'}: ${e.z} ${c > 0 ? '−' : '+'} ${Math.abs(c)} = ${el}. The mass number does not matter here.` };
    },
    ram(e) {
      const iso = ramIsotopes(e); if (!iso) return null;
      const val = iso.reduce((s, i) => s + i[0] * i[1], 0) / 100;
      const ans = val.toFixed(1);
      const mean = (iso.reduce((s, i) => s + i[0], 0) / iso.length).toFixed(1);
      const rev = iso.map((i, k) => [i[0], iso[iso.length - 1 - k][1]]);
      const revv = (rev.reduce((s, i) => s + i[0] * i[1], 0) / 100).toFixed(1);
      const cands = [revv, mean, (val + 0.3).toFixed(1), (val - 0.3).toFixed(1), (val + 0.6).toFixed(1)];
      const list = iso.map(i => `${i[1].toFixed(1)}% ${sup(i[0], e.s)}`).join(', ');
      const work = iso.map(i => `(${i[0]} × ${i[1].toFixed(1)})`).join(' + ');
      return { id: `g:ram:${e.s}`, calc: true,
        q: `${e.n} is ${list}. Using mass numbers as the isotope masses, what is its relative atomic mass (1 d.p.)?`,
        a: ans, w: distractors(ans, cands),
        x: `[${work}] ÷ 100 = ${val.toFixed(2)}, so ${ans}.${e.ram ? ` (With precise isotope masses the value is ${e.ram.toFixed(2)}.)` : ''}` };
    },
    abundance(e) {
      const top = e.iso.slice(0, 2);
      if (top.length < 2 || top[0][1] + top[1][1] < 95 || top[1][1] < 1 || !e.ram) return null;
      const [lo, hi] = top[0][0] < top[1][0] ? [top[0], top[1]] : [top[1], top[0]];
      const eq = Math.abs(lo[1] - hi[1]) < 10;
      const more = lo[1] > hi[1] ? lo : hi;
      const opts = [sup(lo[0], e.s), sup(hi[0], e.s), 'Roughly equal amounts of each', 'You can\'t tell from the relative atomic mass'];
      const a = eq ? opts[2] : sup(more[0], e.s);
      return { id: `g:ab:${e.s}`,
        q: `${e.n} is almost entirely ${sup(lo[0], e.s)} and ${sup(hi[0], e.s)}. Its relative atomic mass is ${e.ram.toFixed(2)}. Which isotope is more abundant?`,
        a, w: opts.filter(o => o !== a),
        x: eq ? `${e.ram.toFixed(2)} sits close to the midpoint of ${lo[0]} and ${hi[0]}, so the two are present in similar amounts (${lo[1]}% and ${hi[1]}%).`
              : `The weighted average (${e.ram.toFixed(2)}) lies nearer ${more[0]}, so ${sup(more[0], e.s)} is the major isotope (${more[1]}%).` };
    },
    mono(e) {
      if (!MONO.includes(e.s) || !e.ram) return null;
      return { id: `g:mono:${e.s}`,
        q: `The relative atomic mass of ${lc(e)} is ${e.ram.toFixed(2)}, very close to a whole number. The most likely reason is that…`,
        a: `${lc(e)} occurs naturally as essentially a single isotope, ${sup(e.A, e.s)}`,
        w: [`${lc(e)} atoms contain no neutrons`, `the electrons make up the rest of the mass`, `all ${lc(e)} isotopes have the same mass number`],
        x: `With only one isotope in the sample there is nothing to average, so A<sub>r</sub> is close to that isotope's mass number, ${e.A}.` };
    }
  };

  const defaultTopic = () => (window.PQ_CONFIG || {}).topic || Object.keys(window.PQ_BANKS)[0];
  const bank = topic => window.PQ_BANKS[topic || defaultTopic()] || window.PQ_BANKS[defaultTopic()];

  // Pick a question bank at random according to the mix, e.g. { skills1: 75, isotopes: 25 }
  function chooseTopic(mix) {
    const entries = Object.entries(mix || {}).filter(([t, w]) => window.PQ_BANKS[t] && +w > 0);
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
      if (q && q.w.length === 3) weighted.push([q, (q.calc ? 0.6 : 1) * (q.weight || 1)]);
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


  // ---------- Steal challenges: numeric answers that need a calculation ----------
  const f = (v, dp) => v.toFixed(dp);
  const rint = (a, b) => a + rnd(b - a + 1);
  // Main isotopes (2 or 3) that make up essentially all of the element
  // (the minor isotopes must make up at least 5%, otherwise the answer is just the major mass number)
  function mainIsotopes(e) {
    const m = e.iso.filter(i => i[1] >= 0.1);
    if (m.length < 2 || m.length > 3 || m.reduce((s, i) => s + i[1], 0) < 99.8) return null;
    if (100 - Math.max(...m.map(i => i[1])) < 5) return null;
    return m.map(i => [i[0], Math.round(i[1] * 10) / 10]);
  }
  // Isotopes visible as peaks (at least 1%), up to four of them
  function peakIsotopes(e) {
    const m = e.iso.filter(i => i[1] >= 1);
    if (m.length < 2 || m.length > 4 || 100 - m[0][1] < 5) return null;
    return m;
  }
  // Two-isotope systems for "find the abundance" questions, including labelled samples used in biochemistry
  const LABELLED = { H: [1, 2, 'hydrogen from partly deuterated water'], C: [12, 13, 'carbon from a <sup>13</sup>C-labelled glucose sample'],
    N: [14, 15, 'nitrogen from a <sup>15</sup>N-labelled bacterial culture'], O: [16, 18, 'oxygen from <sup>18</sup>O-enriched water (ignore <sup>17</sup>O)'] };
  function twoIsotopes(e) {
    if (LABELLED[e.s]) return LABELLED[e.s];
    const t = e.iso.slice(0, 2);
    if (t.length < 2 || t[0][1] + t[1][1] < 99 || t[1][1] < 1) return null;
    const [a, b] = t[0][0] < t[1][0] ? [t[0], t[1]] : [t[1], t[0]];
    return [a[0], b[0], null, a[1], b[1]];
  }

  const STEAL = {
    // Relative atomic mass from percentage abundances
    stealRam(e) {
      const iso = mainIsotopes(e); if (!iso) return null;
      const v = iso.reduce((s, i) => s + i[0] * i[1], 0) / iso.reduce((s, i) => s + i[1], 0);
      iso.sort((a, b) => a[0] - b[0]);
      const list = iso.map(i => `${f(i[1], 1)}% ${sup(i[0], e.s)}`).join(', ').replace(/, ([^,]+)$/, ' and $1');
      return { id: `s:ram:${e.s}`, num: +f(v, 2), tol: 0.011, dp: 2,
        q: `A sample of ${lc(e)} is ${list}. Calculate its relative atomic mass to 2 decimal places. Take each isotope's mass as its mass number.`,
        x: `A<sub>r</sub> = [${iso.map(i => `(${i[0]} × ${f(i[1], 1)})`).join(' + ')}] ÷ ${f(iso.reduce((s, i) => s + i[1], 0), 1)} = ${f(v, 2)}` };
    },
    // Relative atomic mass from mass spectrum peak heights (tallest peak = 100)
    stealPeaks(e) {
      const iso = peakIsotopes(e); if (!iso) return null;
      const top = Math.max(...iso.map(i => i[1]));
      const pk = iso.map(i => [i[0], Math.round(i[1] / top * 1000) / 10]).sort((a, b) => a[0] - b[0]);
      const tot = pk.reduce((s, i) => s + i[1], 0);
      const v = pk.reduce((s, i) => s + i[0] * i[1], 0) / tot;
      const mz = pk.map(i => i[0]), h = pk.map(i => f(i[1], 1));
      return { id: `s:pk:${e.s}`, num: +f(v, 2), tol: 0.011, dp: 2,
        q: `The mass spectrum of a sample of ${lc(e)} has peaks at <i>m/z</i> ${mz.join(', ').replace(/, (\d+)$/, ' and $1')} with relative heights ${h.join(', ').replace(/, ([\d.]+)$/, ' and $1')}. Calculate the relative atomic mass to 2 decimal places.`,
        x: `A<sub>r</sub> = [${pk.map(i => `(${i[0]} × ${f(i[1], 1)})`).join(' + ')}] ÷ ${f(tot, 1)} = ${f(v, 2)}. Divide by the total peak height, not by 100.` };
    },
    // Percentage abundance from a sample's relative atomic mass
    stealAbundance(e) {
      const t = twoIsotopes(e); if (!t) return null;
      const [m1, m2, label, p1, p2] = t;
      // Natural composition for ordinary elements (half the time), otherwise an enriched or labelled sample
      const natural = !label && Math.random() < 0.5;
      const x = natural ? Math.round(p2) : rint(15, 85);
      const ar = +(m1 + (m2 - m1) * x / 100).toFixed(2);
      const ans = (ar - m1) / (m2 - m1) * 100;
      const what = label || (natural ? `a natural sample of ${lc(e)}` : `an isotopically enriched sample of ${lc(e)}`);
      return { id: `s:ab:${e.s}:${x}`, num: +f(ans, 1), tol: 0.11, dp: 1, unit: '%',
        q: `${what[0].toUpperCase() + what.slice(1)} contains only ${sup(m1, e.s)} and ${sup(m2, e.s)}, and has a relative atomic mass of ${f(ar, 2)}. What percentage of its atoms are ${sup(m2, e.s)}? Take the isotope masses as ${m1} and ${m2}; give your answer to 1 d.p.`,
        x: `Let x be the percentage of ${sup(m2, e.s)}: ${m1}(100 − x) + ${m2}x = 100 × ${f(ar, 2)}, so x = (${f(ar, 2)} − ${m1}) ÷ ${m2 - m1} × 100 = ${f(ans, 1)}%.` };
    },
    // Peak heights for a diatomic halogen molecule
    stealDiatomic(e) {
      const D = { Cl: [35, 37, 75, 25], Br: [79, 81, 50, 50] }[e.s]; if (!D) return null;
      const [a, b, pa, pb] = D, P = pa / 100, Q = pb / 100;
      const which = pick(['mid', 'heavy']);
      const mMid = a + b, mHeavy = 2 * b, mLight = 2 * a;
      const rel = which === 'mid' ? 2 * P * Q / (P * P) * 100 : (Q * Q) / (P * P) * 100;
      const target = which === 'mid' ? mMid : mHeavy;
      const S = `${e.s}<sub>2</sub>`;
      return { id: `s:di:${e.s}:${which}`, num: +f(rel, 0), tol: 0.6, dp: 0,
        q: `Assume ${lc(e)} is ${pa}% ${sup(a, e.s)} and ${pb}% ${sup(b, e.s)}. In the mass spectrum of ${S}, the molecular ion peak at <i>m/z</i> ${mLight} has a relative height of 100. What is the relative height of the peak at <i>m/z</i> ${target}? Give a whole number.`,
        x: `Probabilities: ${sup(a, e.s)}${sup(a, e.s)} = ${f(P, 2)}² = ${f(P * P, 4)}; ${sup(a, e.s)}${sup(b, e.s)} (either way round) = 2 × ${f(P, 2)} × ${f(Q, 2)} = ${f(2 * P * Q, 4)}; ${sup(b, e.s)}${sup(b, e.s)} = ${f(Q, 2)}² = ${f(Q * Q, 4)}. Scaling so <i>m/z</i> ${mLight} = 100 gives ${f(100, 0)} : ${f(2 * P * Q / (P * P) * 100, 1)} : ${f(Q * Q / (P * P) * 100, 1)}, so the answer is ${f(rel, 0)}.` };
    }
  };

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

  window.PQ_QUIZ = { typeset, getQuestion, getStealQuestion, chooseTopic, checkNumeric, STEAL, BY_Z, BY_S, GEN, nuc, sup, ramIsotopes,
    util: { rnd, pick, shuffle, distractors } };
})();
