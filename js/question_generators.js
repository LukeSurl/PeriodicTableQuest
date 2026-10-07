// Question generators for Periodic Table Quest
// =============================================
//
// A generator writes a fresh question each time it is called, usually with random
// numbers or using the element the student tapped. A question set (a file in the
// questions/ folder) switches generators on by listing their names, e.g.
//     generators: ['neutrons', 'protons'],
//     stealGenerators: ['stealRam'],
//
// ADDING A MULTIPLE-CHOICE GENERATOR
// Add an entry inside a PQ.addGenerators({ ... }) block:
//
//     myGenerator(e) {
//       if (!e.ram) return null;          // return null if this element can't be used
//       return {
//         id: `my:${e.s}`,                 // short and unique; same id = same question
//         q: `Question text (HTML allowed: <sup>, <sub>, <i>)`,
//         a: 'the right answer',
//         w: ['wrong 1', 'wrong 2', 'wrong 3'],   // two or three, all different from a
//         x: 'explanation shown afterwards'
//         // optional: weight: 2 (picked twice as often), calc: true (picked less often)
//       };
//     },
//
// ADDING A STEAL CHALLENGE (typed numeric answer)
// Add an entry inside a PQ.addStealGenerators({ ... }) block:
//
//     myChallenge(e) {
//       return {
//         id: `s-my:${e.s}`,
//         q: `Question text. Say what units and precision you want.`,
//         num: 24.31,                       // the right answer
//         rel: 0.006,                       // accept within ±0.6% (3 s.f.) ...
//         tol: 0.011,                       // ... or within ±0.011; give either or both
//         unit: 'g mol<sup>−1</sup>',       // shown next to the answer box
//         show: '24.31 g mol<sup>−1</sup>',  // the answer as shown after a wrong attempt
//         x: 'working shown afterwards'
//       };
//     },
//
// THE ELEMENT e
//   e.z atomic number, e.s symbol, e.n name, e.ram relative atomic mass,
//   e.iso natural isotopes as [mass number, % abundance] (largest first),
//   e.A a notable isotope's mass number, e.d density in g cm⁻³ (solids and liquids),
//   e.ie first ionisation energy in kJ mol⁻¹. Any of these can be missing.
//
// TOOLS (from PQ.tools, already unpacked below)
//   rnd(n) 0 to n−1;  rint(a, b) a to b;  pick(list);  shuffle(list)
//   lc(e) lower-case name;  sup(12, 'C') gives ¹²C;  nuc(A, Z, S) nuclide notation
//   toSF(v, 3) standard form to 3 s.f.;  num(v, 3) plain or standard form to 3 s.f.
//   round(v, 3) a number rounded to 3 s.f.;  sfHtml(m, n) m × 10ⁿ;  expo(n) 10ⁿ
//   sn(n) signed number with a proper minus;  sg(n) the same in brackets, for working
//   unique(answer, candidates) up to three different wrong answers
//   distractors(answer, candidates) the same for whole numbers
//   BY_S.Na, BY_Z[11] look up any element
//
// Spacing in quantities (0.10 mol dm⁻³) is tidied automatically, and a typing
// mistake here stops the game working, so check the projector's Topics window
// (it lists any generator it can't find) after changing this file.

(function () {
  const PQ = window.PQ;
  const { rnd, rint, pick, shuffle, lc, sup, nuc, MINUS, expo, sfHtml, toSF, num, round, sn, sg, spaced, unique, distractors,
    ELEMENTS: ELS, BY_Z, BY_S } = PQ.tools;

  // ================================================================
  // Atoms 1: isotopes and relative atomic mass
  // ================================================================
  {
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

    PQ.addGenerators({
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
    });

    // ---------- Steal challenges: numeric answers that need a calculation ----------
    const f = (v, dp) => v.toFixed(dp);
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

    PQ.addStealGenerators({
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
    });
  }

  // ================================================================
  // Chemistry Skills 1: maths for chemists
  // ================================================================
  {
    const UNITS = ['m', 'g', 'mol', 'J', 'Hz', 's'];

    // Elements usable for mole questions (real, non-trivial molar masses)
    const moleEl = e => e.ram && e.z <= 92 && !['Tc', 'Pm', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Pa'].includes(e.s);

    PQ.addGenerators({
      // Decimal to standard form
      sfWrite() {
        let m = (rnd(899) + 101) / 100;                   // 1.01 to 9.99, last digit not zero
        if (Math.round(m * 100) % 10 === 0) m += 0.01;
        const n = pick([-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, 3, 4, 5, 6, 7, 8, 9]);
        const digits = String(Math.round(m * 100));        // 3 significant digits
        let dec;
        if (n < 0) dec = '0.' + '0'.repeat(-n - 1) + digits.replace(/0+$/, '');
        else dec = (digits + '0'.repeat(Math.max(0, n - 2))).slice(0, n + 1);
        const u = pick(UNITS);
        const mm = m.toFixed(2);
        const a = sfHtml(mm, n);
        return { id: `g:sfw:${mm}:${n}`,
          q: `Write ${spaced(dec)} ${u} in standard form.`,
          a: `${a} ${u}`, w: unique(`${a} ${u}`, [sfHtml(mm, -n), sfHtml(mm, n + 1), sfHtml(mm, n - 1)].map(x => `${x} ${u}`)),
          x: `The decimal point moves ${Math.abs(n)} place${Math.abs(n) === 1 ? '' : 's'} ${n < 0 ? 'right, so the power is negative' : 'left, so the power is positive'}: ${a} ${u}.` };
      },
      // Multiply or divide without a calculator
      sfMulDiv() {
        const E = [-34, -27, -19, -12, -9, -7, -4, -3, 3, 5, 8, 14, 23];
        const m1 = pick(E), m2 = pick(E);
        if (Math.random() < 0.5) {
          const a = rnd(8) + 2, b = rnd(8) + 2, p = a * b;
          const [mant, ex] = p >= 10 ? [(p / 10).toString(), m1 + m2 + 1] : [String(p), m1 + m2];
          const ans = sfHtml(mant, ex);
          return { id: `g:sfm:${a}:${b}:${m1}:${m2}`,
            q: `Without a calculator, what is (${sfHtml(a, m1)}) × (${sfHtml(b, m2)})?`,
            a: ans, w: unique(ans, [sfHtml(mant, ex - 1), sfHtml(mant, ex + 1), sfHtml(mant, m1 - m2 + (p >= 10 ? 1 : 0)), sfHtml(p, m1 * m2)]),
            x: `Multiply the numbers (${a} × ${b} = ${p}) and add the powers: ${sg(m1)} + ${sg(m2)} = ${sn(m1 + m2)}. That gives ${sfHtml(p, m1 + m2)}${p >= 10 ? ` = ${ans}` : ''}.` };
        }
        const [b, k] = pick([[2, 2], [2, 3], [2, 4], [3, 3], [3, 2], [4, 2]]), a = b * k;
        const ans = sfHtml(k, m1 - m2);
        return { id: `g:sfd:${a}:${b}:${m1}:${m2}`,
          q: `Without a calculator, what is (${sfHtml(a, m1)}) ÷ (${sfHtml(b, m2)})?`,
          a: ans, w: unique(ans, [sfHtml(k, m1 + m2), sfHtml(k, m2 - m1), sfHtml(k, m1 - m2 - 1)]),
          x: `Divide the numbers (${a} ÷ ${b} = ${k}) and subtract the powers: ${sg(m1)} − ${sg(m2)} = ${sn(m1 - m2)}.` };
      },
      // Adding numbers in standard form with different powers
      sfAdd() {
        const n = rnd(12) - 5, a = (rnd(60) + 11) / 10, b = (rnd(80) + 11) / 10;
        const sum = Math.round((a + b / 10) * 100) / 100;
        const s1 = (sum + 1e-9).toFixed(1);
        if (+s1 >= 10) return null;
        const ans = sfHtml(s1, n);
        return { id: `g:sfa:${a}:${b}:${n}`,
          q: `What is (${sfHtml(a.toFixed(1), n)}) + (${sfHtml(b.toFixed(1), n - 1)})?`,
          a: ans, w: unique(ans, [sfHtml((a + b).toFixed(1), n), sfHtml((a + b).toFixed(1), 2 * n - 1), sfHtml(s1, n - 1)]),
          x: `Match the powers first: ${sfHtml(b.toFixed(1), n - 1)} = ${sfHtml((b / 10).toFixed(2), n)}. Then add: ${a.toFixed(1)} + ${(b / 10).toFixed(2)} = ${sum.toFixed(2)}, reported to 1 d.p. as ${s1} because ${a.toFixed(1)} is only known to 1 d.p.` };
      },
      // Converting between prefixes
      prefix() {
        const P = { T: 12, G: 9, M: 6, k: 3, '': 0, d: -1, c: -2, m: -3, 'µ': -6, n: -9, p: -12 };
        const [from, to, unit, ctx] = pick([
          ['m', 'µ', 'L', 'a pipetted volume'], ['µ', 'm', 'L', 'a pipetted volume'], ['n', '', 'm', 'a wavelength'],
          ['k', '', 'J', 'an energy'], ['m', '', 'g', 'a sample mass'], ['', 'm', 'g', 'a sample mass'], ['m', '', 'mol', 'an amount'],
          ['p', 'n', 'm', 'a bond length'], ['µ', 'm', 'M', 'a concentration'], ['M', '', 'Hz', 'a radio frequency'], ['T', '', 'Hz', 'a light frequency']]);
        const v = pick([0.25, 1.5, 3.2, 12, 45, 250, 450, 74, 0.75, 8.5]);
        const shift = P[from] - P[to];
        const res = v * Math.pow(10, shift);
        const fmt = x => num(x, String(v).replace('.', '').replace(/^0+/, '').length);
        const ans = `${fmt(res)} ${to}${unit}`;
        return { id: `g:pf:${from}${unit}:${to}${unit}:${v}`,
          q: `Convert ${v} ${from}${unit} (${ctx}) into ${to || 'plain '}${unit}${to ? '' : ' (no prefix)'}.`,
          a: ans, w: unique(ans, [fmt(v * Math.pow(10, -shift)), fmt(res * 1000), fmt(res / 1000), fmt(res * 10)].map(x => `${x} ${to}${unit}`)),
          x: `1 ${from}${unit} = ${num(Math.pow(10, shift), 1)} ${to}${unit}, so ${v} ${from}${unit} = ${ans}. ${to}${unit} is the ${shift > 0 ? 'smaller unit, so the number gets bigger' : 'bigger unit, so the number gets smaller'}.` };
      },
      // Units raised to a power
      cubed() {
        const [from, to, pow, ctx] = pick([['cm<sup>3</sup>', 'm<sup>3</sup>', -6], ['dm<sup>3</sup>', 'cm<sup>3</sup>', 3], ['mL', 'dm<sup>3</sup>', -3],
          ['m<sup>3</sup>', 'dm<sup>3</sup>', 3], ['cm<sup>3</sup>', 'dm<sup>3</sup>', -3], ['mm<sup>3</sup>', 'cm<sup>3</sup>', -3]]);
        const v = pick([50.0, 25.0, 2.50, 12.5, 0.500, 250]);
        const sig = 3;
        const ans = `${num(v * Math.pow(10, pow), sig)} ${to}`;
        const linear = pow === -6 ? -2 : pow === 3 ? 1 : pow === -3 ? -1 : 0;
        return { id: `g:cu:${from}:${to}:${v}`,
          q: `Convert ${num(v, sig)} ${from} into ${to}.`,
          a: ans, w: unique(ans, [num(v * Math.pow(10, linear), sig), num(v * Math.pow(10, -pow), sig), num(v * Math.pow(10, pow * 2 / 3 || 1), sig), num(v * Math.pow(10, pow + (pow > 0 ? 3 : -3)), sig)].map(x => `${x} ${to}`)),
          x: `When a unit is cubed, so is its conversion factor: 1 ${from} = ${num(Math.pow(10, pow), 1)} ${to}. Forgetting to cube is the classic slip.` };
      },
      // Counting significant figures
      sigCount() {
        const d = () => rnd(9) + 1;
        const [str, n, why] = pick([
          [`0.00${d()}${d()}${d()}`, 3, 'leading zeros never count'],
          [`0.0${d()}${d()}0`, 3, 'leading zeros never count, but a trailing zero after the decimal point does'],
          [`${d()}0.${d()}`, 3, 'zeros between digits always count'],
          [`${d()}.0${d()}`, 3, 'zeros between digits always count'],
          [`${d()}${d()}.${d()}0`, 4, 'a trailing zero after the decimal point counts'],
          [`${d()}.${d()}0 × ${expo(3)}`, 3, 'every digit written in standard form is significant'],
          [`${d()}.${d()}${d()}0 × ${expo(-4)}`, 4, 'every digit written in standard form is significant'],
          [`${d()}0${d()}.0`, 4, 'zeros between digits count, and so does a trailing zero after the point'],
          [`0.${d()}`, 1, 'the leading zero does not count'],
        ]);
        return { id: `g:sc:${str}`,
          q: `How many significant figures does ${str} have?`,
          a: String(n), w: unique(String(n), shuffle([n - 1, n + 1, n + 2, n - 2].filter(x => x > 0).map(String))),
          x: `${n}: ${why}.` };
      },
      // Reporting a product or quotient
      reportMulDiv() {
        const mass = (rnd(8000) + 1500) / 100;            // 15.00 to 94.99 g, 4 s.f.
        const vol = rnd(30) + 10;                           // 2 s.f.
        const r = mass / vol;
        const ans = r.toPrecision(2);
        const cands = [r.toPrecision(4), r.toPrecision(3), r.toPrecision(1), r.toFixed(5)];
        return { id: `g:rmd:${mass}:${vol}`,
          q: `A metal sample weighs ${mass.toFixed(2)} g and has a volume of ${vol} cm<sup>3</sup>. How should its density be reported?`,
          a: `${ans} g cm<sup>−3</sup>`, w: unique(`${ans} g cm<sup>−3</sup>`, cands.map(c => `${c} g cm<sup>−3</sup>`)),
          x: `${mass.toFixed(2)} (4 s.f.) ÷ ${vol} (2 s.f.): keep the fewest significant figures of the inputs, so 2 s.f. Your answer is only as good as your worst measurement.` };
      },
      // Reporting a sum
      reportAdd() {
        const a = (rnd(4000) + 1000) / 100, b = (rnd(90) + 10) / 10;
        const s = a + b;
        const ans = `${s.toFixed(1)} mL`;
        return { id: `g:ra:${a}:${b}`,
          q: `A burette reading of ${a.toFixed(2)} mL is added to ${b.toFixed(1)} mL from a measuring cylinder. How should the total be reported?`,
          a: ans, w: unique(ans, [`${s.toFixed(2)} mL`, `${Math.round(s)} mL`, `${s.toPrecision(2)} mL`, `${s.toFixed(3)} mL`]),
          x: `When adding, keep the fewest decimal places: ${b.toFixed(1)} mL is only known to 0.1 mL, so the total is too.` };
      },
      // Moles from mass, using the tapped element
      molesEl(e) {
        if (!moleEl(e)) return null;
        const M = e.ram, m = (rnd(900) + 100) / 100 * pick([1, 10]);
        const n = m / M;
        const ans = `${num(n, 3)} mol`;
        return { id: `g:me:${e.s}:${m}`, weight: 2,
          q: `How many moles of ${lc(e)} atoms are in ${num(m, 3)} g of ${lc(e)} (A<sub>r</sub> ${M.toFixed(2)})?`,
          a: ans, w: unique(ans, [num(m * M, 3), num(M / m, 3), num(n * 1000, 3), num(n / 1000, 3)].map(x => `${x} mol`)),
          x: `n = m / M = ${num(m, 3)} g ÷ ${M.toFixed(2)} g mol<sup>−1</sup> = ${ans}.` };
      },
      // Moles from concentration and volume
      cv() {
        const V = (rnd(4000) + 500) / 100, cs = pick(['0.100', '0.0100', '0.0500', '0.200', '0.250']), c = +cs;
        const n = c * V / 1000;
        const ans = `${num(n, 3)} mol`;
        return { id: `g:cv:${V}:${c}`,
          q: `How many moles of solute are in ${V.toFixed(2)} mL of a ${cs} mol dm<sup>−3</sup> solution?`,
          a: ans, w: unique(ans, [num(c * V, 3), num(n / 1000, 3), num(V / 1000 / c, 3), num(c / (V / 1000), 3)].map(x => `${x} mol`)),
          x: `Convert the volume first: ${V.toFixed(2)} mL = ${num(V / 1000, 4)} dm<sup>3</sup>. Then n = cV = ${cs} × ${num(V / 1000, 4)} = ${ans}. Forgetting the conversion makes the answer 1000 times too big.` };
      }
    });

    // ---------- Steal challenges (typed numeric answers) ----------
    const REL = 0.006; // accept answers within about ±0.5%, i.e. correct to 3 s.f.
    const SALTS = [
      { f: 'LiCl', el: ['Li', 'Cl'], M: 42.39, k: 1, g: 1 }, { f: 'NaCl', el: ['Na', 'Cl'], M: 58.44, k: 1, g: 1 },
      { f: 'KCl', el: ['K', 'Cl'], M: 74.55, k: 1, g: 1 },
      { f: 'MgCl<sub>2</sub>·6H<sub>2</sub>O', el: ['Mg', 'Cl'], M: 203.31, k: 2, g: 2 },
      { f: 'CaCl<sub>2</sub>·2H<sub>2</sub>O', el: ['Ca', 'Cl'], M: 147.01, k: 2, g: 2 },
      { f: 'SrCl<sub>2</sub>·6H<sub>2</sub>O', el: ['Sr', 'Cl'], M: 266.62, k: 2, g: 2 },
      { f: 'BaCl<sub>2</sub>·2H<sub>2</sub>O', el: ['Ba', 'Cl'], M: 244.26, k: 2, g: 2 }];
    // Hydrates for molar mass questions: [formula, {element: count}]
    const HYD = [
      ['CuSO<sub>4</sub>·5H<sub>2</sub>O', { Cu: 1, S: 1, O: 9, H: 10 }], ['MgSO<sub>4</sub>·7H<sub>2</sub>O', { Mg: 1, S: 1, O: 11, H: 14 }],
      ['FeSO<sub>4</sub>·7H<sub>2</sub>O', { Fe: 1, S: 1, O: 11, H: 14 }], ['Na<sub>2</sub>CO<sub>3</sub>·10H<sub>2</sub>O', { Na: 2, C: 1, O: 13, H: 20 }],
      ['CoCl<sub>2</sub>·6H<sub>2</sub>O', { Co: 1, Cl: 2, O: 6, H: 12 }], ['CaCl<sub>2</sub>·2H<sub>2</sub>O', { Ca: 1, Cl: 2, O: 2, H: 4 }],
      ['ZnSO<sub>4</sub>·7H<sub>2</sub>O', { Zn: 1, S: 1, O: 11, H: 14 }], ['NiCl<sub>2</sub>·6H<sub>2</sub>O', { Ni: 1, Cl: 2, O: 6, H: 12 }]];
    const AR = { H: 1.008, C: 12.01, O: 16.00, Na: 22.99, Mg: 24.31, S: 32.06, Cl: 35.45, Ca: 40.08, Fe: 55.85, Co: 58.93, Ni: 58.69, Cu: 63.55, Zn: 65.38 };

    PQ.addStealGenerators({
      // Mass <-> amount for the tapped element
      stealMolesEl(e) {
        if (!moleEl(e)) return null;
        const M = +e.ram.toFixed(2);
        if (Math.random() < 0.5) {
          const m = (rnd(900) + 100) / 1000;                        // 0.100 to 0.999 g
          const n = m / M * 1000;
          return { id: `s:me:${e.s}:${m}`, weight: 2, num: round(n), rel: REL, unit: 'mmol', show: `${num(n, 3)} mmol`,
            q: `How many <b>millimoles</b> of ${lc(e)} atoms are in ${m.toFixed(3)} g of ${lc(e)} (A<sub>r</sub> ${M.toFixed(2)})? Give 3 s.f.`,
            x: `n = m / M = ${m.toFixed(3)} ÷ ${M.toFixed(2)} = ${toSF(n / 1000)} mol = ${num(n, 3)} mmol.` };
        }
        const n = (rnd(900) + 100) / 100;                           // 1.00 to 9.99 mmol
        const mg = n * M;
        return { id: `s:mm:${e.s}:${n}`, weight: 2, num: round(mg), rel: REL, unit: 'mg', show: `${num(mg, 3)} mg`,
          q: `What mass of ${lc(e)} (A<sub>r</sub> ${M.toFixed(2)}), in <b>mg</b>, contains ${n.toFixed(2)} mmol of atoms? Give 3 s.f.`,
          x: `m = nM = ${n.toFixed(2)} × 10<sup>−3</sup> mol × ${M.toFixed(2)} g mol<sup>−1</sup> = ${num(mg / 1000, 3)} g = ${num(mg, 3)} mg.` };
      },
      // Density: converting units and using it, for the tapped element
      stealDensityEl(e) {
        if (!e.d) return null;
        const d = e.d, ds = d.toPrecision(3);
        if (Math.random() < 0.5) {
          const v = d * 1000;
          return { id: `s:dc:${e.s}`, weight: 2, num: round(v), rel: REL, unit: 'kg m<sup>−3</sup>', show: `${num(v, 3)} kg m<sup>−3</sup>`,
            q: `The density of ${lc(e)} is ${ds} g cm<sup>−3</sup>. What is it in kg m<sup>−3</sup>?`,
            x: `${ds} g cm<sup>−3</sup> × (1 kg / 1000 g) × (10<sup>6</sup> cm<sup>3</sup> / 1 m<sup>3</sup>) = ${num(v, 3)} kg m<sup>−3</sup>. The cm<sup>3</sup> factor is cubed: 10<sup>6</sup>, not 10<sup>2</sup>.` };
        }
        const L = (rnd(150) + 100) / 100;                          // 1.00 to 2.50 cm
        const m = L ** 3 * d;
        return { id: `s:dm:${e.s}:${L}`, weight: 2, num: round(m), rel: REL, unit: 'g', show: `${num(m, 3)} g`,
          q: `A cube of ${lc(e)} has sides of ${L.toFixed(2)} cm. Its density is ${ds} g cm<sup>−3</sup>. What is its mass in grams? Give 3 s.f.`,
          x: `V = ${L.toFixed(2)}<sup>3</sup> = ${num(L ** 3, 3)} cm<sup>3</sup>; m = ρV = ${ds} × ${num(L ** 3, 3)} = ${num(m, 3)} g.` };
      },
      // The Week 3 titration: molar mass of an unknown chloride
      stealTitration(e) {
        const mine = SALTS.filter(s => s.el.includes(e.s) && e.s !== 'Cl');
        const s = pick(mine.length ? mine : SALTS);
        const m = 0.100, c = 0.100;
        const V = +(m / s.M * s.k / c * 1000).toFixed(2);           // end point, mL
        const nCl = c * V / 1000, M = m / (nCl / s.k);
        return { id: `s:ti:${s.f}`, weight: mine.length ? 2 : 1, num: round(M), rel: REL, unit: 'g mol<sup>−1</sup>', show: `${num(M, 3)} g mol<sup>−1</sup>`,
          q: `0.100 g of an unknown group ${s.g} chloride${s.g === 2 ? ' (XCl<sub>2</sub>, possibly hydrated)' : ' (XCl)'} is titrated with 0.100 mol dm<sup>−3</sup> AgNO<sub>3</sub>.<br> The end point is at ${V.toFixed(2)} mL. What is the molar mass of the salt? Give 3 s.f.`,
          x: `n(Ag<sup>+</sup>) = n(Cl<sup>−</sup>) = 0.100 × ${num(V / 1000, 4)} dm<sup>3</sup> = ${toSF(nCl)} mol. ${s.k === 2 ? `Two Cl<sup>−</sup> per formula unit, so n(salt) = ${toSF(nCl / 2)} mol. ` : ''}M = 0.100 ÷ ${toSF(nCl / s.k)} = ${num(M, 3)} g mol<sup>−1</sup>, consistent with ${s.f} (${s.M}).` };
      },
      // Stoichiometry: 2AgNO3 + MgCl2·6H2O
      stealStoich() {
        const V = (rnd(1500) + 500) / 100, c = pick([0.0100, 0.0200, 0.0500]);
        const nAg = c * V / 1000, nMg = nAg / 2, mg = nMg * 203.31 * 1000;
        return { id: `s:st:${V}:${c}`, num: round(mg), rel: REL, unit: 'mg', show: `${num(mg, 3)} mg`,
          q: `2AgNO<sub>3</sub> + MgCl<sub>2</sub>·6H<sub>2</sub>O → 2AgCl + Mg(NO<sub>3</sub>)<sub>2</sub> + 6H<sub>2</sub>O.<br> ${V.toFixed(2)} mL of ${c.toFixed(4)} mol dm<sup>−3</sup> AgNO<sub>3</sub> reacts completely.<br> What mass of MgCl<sub>2</sub>·6H<sub>2</sub>O (203.31 g mol<sup>−1</sup>) reacted, in <b>mg</b>? Give 3 s.f.`,
          x: `n(AgNO<sub>3</sub>) = ${c.toFixed(4)} × ${num(V / 1000, 4)} = ${toSF(nAg)} mol; ÷ 2 = ${toSF(nMg)} mol of MgCl<sub>2</sub>·6H<sub>2</sub>O; × 203.31 = ${num(mg / 1000, 3)} g = ${num(mg, 3)} mg.` };
      },
      // Chained light calculation
      stealPhoton() {
        const lam = rnd(500) + 200;                                 // 200 to 699 nm
        if (Math.random() < 0.6) {
          const E = 6.626e-34 * 3.00e8 / (lam * 1e-9) * 6.022e23 / 1000;
          return { id: `s:ph:${lam}`, num: round(E), rel: REL, unit: 'kJ mol<sup>−1</sup>', show: `${num(E, 3)} kJ mol<sup>−1</sup>`,
            q: `What is the energy of one mole of ${lam} nm photons, in kJ mol<sup>−1</sup>? Use c = 3.00 × 10<sup>8</sup> m s<sup>−1</sup>, h = 6.626 × 10<sup>−34</sup> J s and N<sub>A</sub> = 6.022 × 10<sup>23</sup> mol<sup>−1</sup>. Give 3 s.f.`,
            x: `λ = ${toSF(lam * 1e-9)} m; ν = c/λ = ${toSF(3e8 / (lam * 1e-9), 4)} s<sup>−1</sup>; E = hν = ${toSF(6.626e-34 * 3e8 / (lam * 1e-9), 4)} J; × N<sub>A</sub> = ${num(E * 1000, 3)} J mol<sup>−1</sup> = ${num(E, 3)} kJ mol<sup>−1</sup>. Round only at the end.` };
        }
        const nu = 3.00e8 / (lam * 1e-9) / 1e12;
        return { id: `s:nu:${lam}`, num: round(nu), rel: REL, unit: 'THz', show: `${num(nu, 3)} THz`,
          q: `What is the frequency of ${lam} nm light, in THz? Use c = 3.00 × 10<sup>8</sup> m s<sup>−1</sup>. Give 3 s.f.`,
          x: `ν = c/λ = 3.00 × 10<sup>8</sup> ÷ ${toSF(lam * 1e-9)} = ${toSF(nu * 1e12)} s<sup>−1</sup> = ${num(nu, 3)} THz (1 THz = 10<sup>12</sup> Hz).` };
      },
      // Molar mass of a hydrate
      stealHydrate(e) {
        const mine = HYD.filter(h => h[1][e.s] && !['H', 'O'].includes(e.s));
        const [f, comp] = pick(mine.length ? mine : HYD);
        const M = Object.entries(comp).reduce((s, [k, c]) => s + c * AR[k], 0);
        const given = Object.keys(comp).map(k => `${k} ${AR[k].toFixed(k === 'H' ? 3 : 2)}`).join(', ');
        return { id: `s:hy:${f}`, weight: mine.length ? 2 : 1, num: +M.toFixed(2), tol: 0.02, unit: 'g mol<sup>−1</sup>', show: `${M.toFixed(2)} g mol<sup>−1</sup>`,
          q: `What is the molar mass of ${f}? Use A<sub>r</sub>: ${given}. Give 2 d.p.`,
          x: `${Object.entries(comp).map(([k, c]) => `${c} × ${AR[k].toFixed(k === "H" ? 3 : 2)}`).join(' + ')} = ${M.toFixed(2)} g mol<sup>−1</sup>. The water after the dot is part of the formula unit, so it counts.` };
      }
    });
  }

  // ================================================================
  // Atoms 2: electromagnetic radiation and energy levels
  // ================================================================
  {
    // Constants as quoted on the slides
    const C = 3.00e8, H = 6.626e-34, NA = 6.022e23;
    const K_IE = 3.5e-19;                       // ionisation energy of potassium metal, per atom (slide 19)
    // Hydrogen energy levels as drawn on the slide, kJ mol−1 (n = ∞ is 0)
    const LEVEL = { 1: -1312, 2: -328, 3: -146, 4: -82, 5: -52.5 };
    const SERIES = { 1: ['Lyman', 'ultraviolet'], 2: ['Balmer', 'visible'], 3: ['Paschen', 'infrared'], 4: ['Brackett', 'infrared'] };
    // UK local radio. FM frequencies are current; the BBC medium wave (MW) services have closed,
    // so they carry the year they stopped. Radio Caroline is still on 648 kHz MW.
    // [name, frequency in Hz, area or '', year the service closed or null]
    const STATIONS = [
      ['BBC Radio Cornwall', 95.2e6, 'East Cornwall'], ['BBC Radio Cornwall', 103.9e6, 'West Cornwall'],
      ['BBC Radio Devon', 103.4e6, ''], ['BBC Radio Devon', 95.8e6, 'Exeter'], ['BBC Radio Devon', 94.8e6, 'Barnstaple'], ['BBC Radio Devon', 104.3e6, 'Torbay'],
      ['BBC Radio Bristol', 94.9e6, ''], ['BBC Radio Solent', 96.1e6, ''], ['BBC Radio Manchester', 95.1e6, ''], ['BBC Radio Merseyside', 95.8e6, ''],
      ['BBC Radio Lancashire', 95.5e6, ''], ['BBC Radio WM', 95.6e6, ''], ['BBC Radio Guernsey', 93.2e6, ''],
      ['BBC Radio Devon', 801e3, 'Barnstaple', 2021], ['BBC Radio Devon', 990e3, 'Exeter', 2021], ['BBC Radio Cornwall', 630e3, '', 2020],
      ['BBC Radio Solent', 999e3, '', 2020], ['BBC Radio Merseyside', 1485e3, '', 2020], ['BBC Radio Lancashire', 855e3, '', 2021],
      ['BBC Radio Bristol', 1548e3, '', 2016], ['Radio Caroline', 648e3, 'Suffolk']];
    const freqText = st => st[1] < 1e7 ? `${st[1] / 1e3} kHz MW` : `${st[1] / 1e6} MHz FM`;
    const stationText = st => st[3]
      ? `Until ${st[3]}, ${st[0]} also broadcast on ${freqText(st)}${st[2] ? ` in ${st[2]}` : ''}`
      : `${st[0]} broadcasts on ${freqText(st)}${st[2] ? ` in ${st[2]}` : ''}`;
    const stationOpt = st => `${st[0]} (${freqText(st)})`;

    const kj = v => (Math.round(v * 10) / 10).toString().replace(/\.0$/, '').replace('-', '−');

    const REL = 0.006;

    PQ.addGenerators({
      // Wavelength to frequency
      a2Freq() {
        const [lam, ctx] = pick([[rnd(280) + 400, 'visible light'], [rnd(250) + 120, 'ultraviolet light'], [rnd(4000) + 800, 'infrared radiation']]);
        const nu = C / (lam * 1e-9);
        const ans = `${toSF(nu)} s<sup>−1</sup>`;
        return { id: `a2:f:${lam}`,
          q: `What is the frequency of ${ctx} with a wavelength of ${lam} nm?`,
          a: ans, w: unique(ans, [toSF(C / lam), toSF(nu / 1e3), toSF(nu * 1e3), toSF(lam * 1e-9 / C)].map(x => `${x} s<sup>−1</sup>`)),
          x: `ν = c / λ = 3.00 × 10<sup>8</sup> m s<sup>−1</sup> ÷ ${toSF(lam * 1e-9)} m = ${ans}. Convert nm to m first.` };
      },
      // Frequency to wavelength
      a2Lambda() {
        const thz = rnd(500) + 430;                         // 430 to 929 THz
        const lam = C / (thz * 1e12) * 1e9;
        const ans = `${num(lam)} nm`;
        return { id: `a2:l:${thz}`,
          q: `Light has a frequency of ${thz} THz. What is its wavelength?`,
          a: ans, w: unique(ans, [num(lam * 1000), num(lam / 1000), num(C / thz), num(lam * 10)].map(x => `${x} nm`)),
          x: `λ = c / ν = 3.00 × 10<sup>8</sup> ÷ ${toSF(thz * 1e12)} s<sup>−1</sup> = ${toSF(lam * 1e-9)} m = ${ans}. 1 THz = 10<sup>12</sup> Hz.` };
      },
      // Energy of one photon from a frequency
      a2Energy() {
        if (Math.random() < 0.5) {
          const st = pick(STATIONS), f = st[1], mw = f < 1e7;
          const E = H * f, shown = mw ? f / 1e3 : f / 1e6;
          const ans = `${toSF(E)} J`;
          return { id: `a2:e:${f}`,
            q: `${stationText(st)}. What is the energy of one ${st[3] ? 'of those' : 'of its'} photons?`,
            a: ans, w: unique(ans, [toSF(H * shown), toSF(f / H), toSF(H / f), toSF(E * 1e3)].map(x => `${x} J`)),
            x: `${shown} ${mw ? 'kHz' : 'MHz'} = ${toSF(f, 4)} s<sup>−1</sup>, so E = hν = 6.626 × 10<sup>−34</sup> J s × ${toSF(f, 4)} s<sup>−1</sup> = ${ans}.` };
        }
        const [v, unit, f, ctx] = pick([[(rnd(30) + 10) / 10, 'GHz', 1e9, 'A microwave oven uses radiation at'], [rnd(400) + 430, 'THz', 1e12, 'Visible light has a frequency of']]);
        const E = H * v * f;
        const ans = `${toSF(E)} J`;
        return { id: `a2:e:${unit}:${v}`,
          q: `${ctx} ${v} ${unit}. What is the energy of one photon?`,
          a: ans, w: unique(ans, [toSF(H * v), toSF(v * f / H), toSF(H / (v * f)), toSF(E * 1e3)].map(x => `${x} J`)),
          x: `E = hν = 6.626 × 10<sup>−34</sup> J s × ${toSF(v * f)} s<sup>−1</sup> = ${ans}. Convert ${unit} to Hz (s<sup>−1</sup>) first.` };
      },
      // Which of two UK radio stations has the more energetic photons
      a2Radio() {
        let a, b;
        do { [a, b] = shuffle(STATIONS).slice(0, 2); } while (a[1] === b[1] || a[0] === b[0]);
        const hi = a[1] > b[1] ? a : b, lo = hi === a ? b : a;
        const past = a[3] || b[3];
        return { id: `a2:rd:${a[1]}:${b[1]}`,
          q: `${stationText(a)}. ${stationText(b)}. Which ${past ? 'signal has (or had)' : 'station has'} the more energetic photons?`,
          a: stationOpt(hi), w: [stationOpt(lo), 'Neither: they are the same, as both are radio waves', 'It depends on the transmitter power'],
          x: `E = hν, so the higher frequency wins: ${freqText(hi).split(' ')[0]} ${freqText(hi).split(' ')[1]} beats ${freqText(lo).split(' ')[0]} ${freqText(lo).split(' ')[1]}${hi[1] >= 1e7 && lo[1] < 1e7 ? ' (1 MHz = 1000 kHz)' : ''}. Transmitter power changes how many photons are sent, not the energy of each.` };
      },
      // Hydrogen emits nothing at this wavelength: what does that mean?
      a2Missing() {
        // Visible wavelengths at least 10 nm from every hydrogen emission line (656.3, 486.1, 434.0, 410.2 nm)
        const lam = pick([450, 460, 470, 500, 520, 540, 560, 580, 600, 620, 640, 680, 700]);
        const E = H * C / (lam * 1e-9);
        return { id: `a2:mi:${lam}`,
          q: `Hydrogen emits a red line at 656 nm, but nothing at ${lam} nm. What does the missing ${lam} nm line tell you?`,
          a: `No two of hydrogen's energy levels are ${toSF(E)} J apart`,
          w: [`Hydrogen atoms absorb all ${lam} nm light`, `${lam} nm light is invisible`, `The ${lam} nm transition is too slow to see`],
          x: `A ${lam} nm photon would carry E = hc/λ = ${toSF(E)} J. Every emitted photon matches the gap between two levels, so no pair of hydrogen levels has that gap.` };
      },
      // Region of the spectrum
      a2Region() {
        const R = [['X-rays', () => `${(rnd(40) + 1) / 10} nm`], ['ultraviolet', () => `${rnd(230) + 120} nm`], ['visible', () => `${rnd(240) + 430} nm`],
          ['infrared', () => `${(rnd(40) + 2) / 2} µm`], ['microwaves', () => `${rnd(10) + 2} cm`], ['radio waves', () => `${rnd(40) + 2} m`]];
        const k = rnd(R.length), [name, gen] = R[k], val = gen();
        const others = shuffle(R.map(r => r[0]).filter(n => n !== name)).slice(0, 3);
        return { id: `a2:r:${val}`,
          q: `Electromagnetic radiation has a wavelength of ${val}. Which part of the spectrum is it in?`,
          a: name[0].toUpperCase() + name.slice(1), w: others.map(o => o[0].toUpperCase() + o.slice(1)),
          x: `From short to long wavelength: X-rays (below about 10 nm), ultraviolet (to about 400 nm), visible (about 400–700 nm), infrared (to about 1 mm), microwaves, then radio waves. ${val} is ${name}.` };
      },
      // Highest energy photon from four wavelengths
      a2Highest() {
        const lams = shuffle([rnd(150) + 150, rnd(150) + 400, rnd(400) + 700, rnd(5000) + 2000]).map(String);
        const hi = Math.random() < 0.5;
        const target = hi ? Math.min(...lams) : Math.max(...lams);
        return { id: `a2:h:${lams.join('-')}:${hi}`,
          q: hi ? 'Which wavelength has the highest energy per photon?' : 'Which wavelength has the lowest frequency?',
          a: `${target} nm`, w: lams.filter(l => +l !== target).map(l => `${l} nm`),
          x: hi ? `E = hν and ν = c/λ, so the shortest wavelength (${target} nm) has the highest frequency and the most energetic photons.`
                : `ν = c/λ, so the longest wavelength (${target} nm) has the lowest frequency.` };
      },
      // Photoelectric effect on potassium
      a2Photo() {
        const lam = pick([200, 250, 300, 350, 400, 450, 650, 700, 750, 800, 900, 1000]);
        const E = H * C / (lam * 1e-9), yes = E > K_IE;
        const opts = ['Yes: each photon has more energy than is needed', 'No: each photon has too little energy', 'Only if the light is bright enough', 'Yes, but only after energy has built up for a while'];
        return { id: `a2:pe:${lam}`,
          q: `The ionisation energy of potassium metal is 3.5 × 10<sup>−19</sup> J per atom. Will ${lam} nm light eject electrons from it?`,
          a: yes ? opts[0] : opts[1], w: yes ? opts.slice(1) : [opts[0], opts[2], opts[3]],
          x: `Each photon carries E = hc/λ = ${toSF(E)} J, which is ${yes ? 'more' : 'less'} than 3.5 × 10<sup>−19</sup> J. Brightness only changes how many photons arrive, not the energy of each.` };
      },
      // Photon energy from the energy-level diagram
      a2Gap() {
        const lo = 1 + rnd(3), hi = lo + 1 + rnd(5 - lo), emit = Math.random() < 0.6;
        const El = LEVEL[lo], Eh = LEVEL[hi], d = Eh - El;
        const ans = `${kj(d)} kJ mol<sup>−1</sup>`;
        return { id: `a2:g:${hi}:${lo}:${emit}`,
          q: `Hydrogen's energy levels are n = 1: −1312, n = 2: −328, n = 3: −146, n = 4: −82 and n = 5: −52.5 kJ mol<sup>−1</sup>. What is the photon energy when an atom ${emit ? `drops from n = ${hi} to n = ${lo}` : `in n = ${lo} absorbs a photon and moves to n = ${hi}`}?`,
          a: ans, w: unique(ans, [kj(-El - Eh), kj(-El), kj(-Eh), kj(d / 2)].map(x => `${x} kJ mol<sup>−1</sup>`)),
          x: `The photon energy equals the gap between the levels: ${kj(Eh)} − (${kj(El)}) = ${kj(d)} kJ mol<sup>−1</sup>. ${emit ? 'Emission' : 'Absorption'} uses the same gap in either direction.` };
      },
      // Ionising hydrogen: ground state compared with an excited state
      a2IonCompare() {
        const n = 2 + rnd(4), fromGround = Math.random() < 0.5;
        const opts = ['More energy', 'Less energy', 'The same amount of energy'];
        const ans = fromGround ? 'More energy' : 'Less energy';
        return { id: `a2:ic:${n}:${fromGround}`,
          q: fromGround
            ? `Compared with ionising a hydrogen atom that is already excited to n = ${n}, ionising one in its ground state (n = 1) takes…`
            : `Compared with ionising a hydrogen atom in its ground state (n = 1), ionising one that is already excited to n = ${n} takes…`,
          a: ans, w: opts.filter(o => o !== ans),
          x: `Ionising means taking the electron to n = ∞, where its energy is zero. From n = 1 (−1312 kJ mol<sup>−1</sup>) that takes 1312 kJ mol<sup>−1</sup>; from n = ${n} (${kj(LEVEL[n])} kJ mol<sup>−1</sup>) it takes only ${kj(-LEVEL[n])} kJ mol<sup>−1</sup>, because the atom is already part of the way there.` };
      },
      // Longest wavelength that can ionise an atom of the tapped element
      a2IonLambda(e) {
        if (!e.ie || e.z > 100) return null;
        const lam = H * C * NA / (e.ie * 1e3) * 1e9;
        const ans = `${num(lam)} nm`;
        return { id: `a2:il:${e.s}`, weight: 2,
          q: `The first ionisation energy of ${lc(e)} is ${e.ie} kJ mol<sup>−1</sup>. Roughly what is the longest wavelength of light that can ionise a gas-phase ${lc(e)} atom?`,
          a: ans, w: unique(ans, [num(lam * 1000), num(lam / 1000), num(lam * 10), num(lam / 10)].map(x => `${x} nm`)),
          x: `As in the guanine example: ${e.ie} kJ mol<sup>−1</sup> × 10<sup>3</sup> ÷ N<sub>A</sub> = ${toSF(e.ie * 1e3 / NA)} J per atom; ν = E/h = ${toSF(e.ie * 1e3 / NA / H)} s<sup>−1</sup>; λ = c/ν = ${ans}.` };
      }
    });

    PQ.addStealGenerators({
      // Guanine method, applied to the tapped element
      s2IonLambda(e) {
        if (!e.ie || e.z > 100) return null;
        const lam = H * C * NA / (e.ie * 1e3) * 1e9;
        return { id: `s2:il:${e.s}`, weight: 3, num: round(lam), rel: REL, unit: 'nm', show: `${num(lam)} nm`,
          q: `The first ionisation energy of ${lc(e)} is ${e.ie} kJ mol<sup>−1</sup>. What is the longest wavelength of light, in nm, that can ionise a gas-phase ${lc(e)} atom? Use c = 3.00 × 10<sup>8</sup> m s<sup>−1</sup>, h = 6.626 × 10<sup>−34</sup> J s, N<sub>A</sub> = 6.022 × 10<sup>23</sup> mol<sup>−1</sup>. Give 3 s.f.`,
          x: `${e.ie} × 10<sup>3</sup> J mol<sup>−1</sup> ÷ N<sub>A</sub> = ${toSF(e.ie * 1e3 / NA)} J; ν = E/h = ${toSF(e.ie * 1e3 / NA / H)} s<sup>−1</sup>; λ = c/ν = ${toSF(lam * 1e-9)} m = ${num(lam)} nm.` };
      },
      // Wavelength of a hydrogen emission line
      s2Line() {
        const lo = 1 + rnd(3), hi = lo + 1 + rnd(5 - lo);
        const d = LEVEL[hi] - LEVEL[lo];
        const lam = H * C * NA / (d * 1e3) * 1e9;
        return { id: `s2:ln:${hi}:${lo}`, num: round(lam), rel: REL, unit: 'nm', show: `${num(lam)} nm`,
          q: `Hydrogen's energy levels are n = 1: −1312, n = 2: −328, n = 3: −146, n = 4: −82 and n = 5: −52.5 kJ mol<sup>−1</sup>. What is the wavelength, in nm, of the photon emitted when an atom drops from n = ${hi} to n = ${lo}? Use c = 3.00 × 10<sup>8</sup> m s<sup>−1</sup>, h = 6.626 × 10<sup>−34</sup> J s, N<sub>A</sub> = 6.022 × 10<sup>23</sup> mol<sup>−1</sup>. Give 3 s.f.`,
          x: `Gap = ${kj(d)} kJ mol<sup>−1</sup> = ${toSF(d * 1e3 / NA)} J per photon; ν = E/h = ${toSF(d * 1e3 / NA / H)} s<sup>−1</sup>; λ = c/ν = ${num(lam)} nm (a ${SERIES[lo][0]} line, ${SERIES[lo][1]}).` };
      },
      // Kinetic energy of a photoelectron from potassium
      s2Kinetic() {
        const lam = pick([200, 220, 240, 250, 260, 280, 300, 320, 350, 380]);
        const E = H * C / (lam * 1e-9), KE = (E - K_IE) / 1e-19;
        return { id: `s2:ke:${lam}`, num: Math.round(KE * 10) / 10, tol: 0.06, unit: '× 10<sup>−19</sup> J', show: `${KE.toFixed(1)} × 10<sup>−19</sup> J`,
          q: `Potassium metal needs 3.5 × 10<sup>−19</sup> J per atom to remove an electron. ${lam} nm UV light shines on it. What is the kinetic energy of each ejected electron, in units of 10<sup>−19</sup> J? Use c = 3.00 × 10<sup>8</sup> m s<sup>−1</sup> and h = 6.626 × 10<sup>−34</sup> J s. Give 2 s.f.`,
          x: `E(photon) = hc/λ = ${toSF(E)} J. The excess, ${toSF(E)} − 3.5 × 10<sup>−19</sup> = ${toSF(KE * 1e-19, 2)} J, becomes the electron's kinetic energy.` };
      },
      // Energy of one photon from a UK radio station
      s2Radio() {
        const st = pick(STATIONS), f = st[1], mw = f < 1e7, p = Math.floor(Math.log10(H * f));
        const E = H * f / Math.pow(10, p), shown = mw ? `${f / 1e3} kHz` : `${f / 1e6} MHz`;
        return { id: `s2:rd:${f}`, num: round(E), rel: REL, unit: `× 10<sup>${p}</sup> J`.replace('-', '−'), show: `${E.toFixed(2)} × 10<sup>−${-p}</sup> J`,
          q: `${stationText(st)}. What is the energy of one ${st[3] ? 'of those' : 'of its'} photons, in units of 10<sup>−${-p}</sup> J? Use h = 6.626 × 10<sup>−34</sup> J s. Give 3 s.f.`,
          x: `${shown} = ${toSF(f, 4)} s<sup>−1</sup>; E = hν = 6.626 × 10<sup>−34</sup> × ${toSF(f, 4)} = ${E.toFixed(2)} × 10<sup>−${-p}</sup> J.` };
      }
    });
  }
  // ================================================================
  // Atoms 3: electrons as waves, orbitals and quantum numbers
  // ================================================================
  {
    const L = ['s', 'p', 'd', 'f'];                            // letter for l = 0, 1, 2, 3
    const ml = '<i>m</i><sub>l</sub>', ms = '<i>m</i><sub>s</sub>';
    const label = (n, l) => `${n}${L[l]}`;
    const mlList = l => Array.from({ length: 2 * l + 1 }, (_, i) => i - l).map(v => v > 0 ? `+${v}` : sn(v)).join(', ');
    // A random orbital label that exists (n up to 5, l up to f)
    const realOrbital = () => { const n = 1 + rnd(5), l = rnd(Math.min(n, 4)); return [n, l]; };
    const fakeOrbital = () => { const n = 1 + rnd(3), l = n + rnd(4 - n); return [n, l]; };   // l ≥ n, e.g. 1p, 2d, 3f
    const REL3 = 0.006;
    const higherOrbital = () => { let o; do { o = realOrbital(); } while (o[0] < 2); return o; };
    const CONFIG = { 1: '1s<sup>1</sup>', 2: '1s<sup>2</sup>', 3: '1s<sup>2</sup> 2s<sup>1</sup>', 4: '1s<sup>2</sup> 2s<sup>2</sup>' };

    PQ.addGenerators({
      // Which orbital label can or can't exist
      a3Exists() {
        const odd = Math.random() < 0.5;   // true: find the impossible one
        const pool = new Set(); const want = odd ? fakeOrbital() : realOrbital();
        const ans = label(...want);
        while (pool.size < 3) { const o = label(...(odd ? realOrbital() : fakeOrbital())); if (o !== ans) pool.add(o); }
        const [n, l] = want;
        return { id: `a3:ex:${ans}:${odd}`,
          q: odd ? 'Which of these orbitals cannot exist?' : 'Which of these orbitals can exist?',
          a: ans, w: [...pool],
          x: `l can be any whole number from 0 to n − 1. For ${ans}, n = ${n} and ${L[l]} means l = ${l}, ${l <= n - 1 ? `which is allowed (l can go up to ${n - 1})` : `but l can only go up to ${n - 1}`}.` };
      },
      // Orbitals in a subshell
      a3Subshell() {
        const [n, l] = realOrbital(), lab = label(n, l), k = 2 * l + 1;
        return { id: `a3:sub:${lab}`,
          q: `How many orbitals are there in the ${lab} subshell?`,
          a: String(k), w: unique(String(k), ['1', '3', '5', '7', String(n), String(2 * k)].filter(v => v !== String(k))),
          x: l ? `${L[l]} means l = ${l}, and ${ml} runs from −${l} to +${l} (${mlList(l)}): that is ${k} values, so ${k} orbitals.`
               : `s means l = 0, so ${ml} can only be 0: one orbital.` };
      },
      // Orbitals in a shell
      a3Shell() {
        const n = 2 + rnd(3), k = n * n;
        const parts = Array.from({ length: n }, (_, l) => `${2 * l + 1} ${label(n, l)}`).join(' + ');
        return { id: `a3:sh:${n}`,
          q: `How many orbitals are there in total in the n = ${n} shell?`,
          a: String(k), w: unique(String(k), [String(2 * k), String(n), String(2 * n + 1), String(k + 1), String(n * (n + 1) / 2)]),
          x: `l can be 0 to ${n - 1}, giving ${parts} = ${k} orbitals (n² in general). ${2 * k} is the number of electrons they can hold.` };
      },
      // Allowed values of l or ml
      a3Values() {
        if (Math.random() < 0.5) {
          const n = 1 + rnd(4), right = Array.from({ length: n }, (_, i) => i).join(', ');
          return { id: `a3:lv:${n}`,
            q: `For the shell n = ${n}, which values can l take?`,
            a: right, w: unique(right, [Array.from({ length: n }, (_, i) => i + 1).join(', '), Array.from({ length: n + 1 }, (_, i) => i).join(', '), n > 1 ? `−${n - 1} to +${n - 1}` : '1', '0'].filter(x => x !== right)),
            x: `l can be any whole number from 0 to n − 1, so for n = ${n}: ${right}.` };
        }
        const l = 1 + rnd(3), right = mlList(l);
        return { id: `a3:mv:${l}`,
          q: `For a ${L[l]} subshell (l = ${l}), which values can ${ml} take?`,
          a: right, w: unique(right, [Array.from({ length: l + 1 }, (_, i) => i).join(', '), Array.from({ length: 2 * l + 1 }, (_, i) => i + 1).join(', '), mlList(l - 1) || '0', mlList(l + 1)]),
          x: `${ml} can be any whole number from −l to +l, so for l = ${l}: ${right} (${2 * l + 1} orbitals).` };
      },
      // Naming an orbital from n and l, or the reverse
      a3Name() {
        const [n, l] = higherOrbital();
        if (Math.random() < 0.5) {
          const ans = label(n, l);
          return { id: `a3:nm:${ans}`,
            q: `What is the name of the subshell with n = ${n} and l = ${l}?`,
            a: ans, w: unique(ans, [label(n, l < 3 ? l + 1 : l - 1), label(n + 1, l), label(n, l > 0 ? l - 1 : l + 2), label(n - 1, l), label(n + 2, l)]),
            x: `The number is n and the letter shows l (s = 0, p = 1, d = 2, f = 3), so n = ${n}, l = ${l} is ${ans}.` };
        }
        const ans = `n = ${n}, l = ${l}`;
        return { id: `a3:qn:${label(n, l)}`,
          q: `What are the quantum numbers n and l for a ${label(n, l)} orbital?`,
          a: ans, w: unique(ans, [`n = ${n}, l = ${l + 1}`, `n = ${n}, l = ${n}`, `n = ${n - 1}, l = ${l}`, `n = ${n + 1}, l = ${l}`]),
          x: `The number is n = ${n}; the letter ${L[l]} means l = ${l}.` };
      },
      // Angular nodes
      a3Angular() {
        const [n, l] = realOrbital(), lab = label(n, l);
        return { id: `a3:an:${lab}`,
          q: `How many angular nodes (nodal planes through the nucleus) does a ${lab} orbital have?`,
          a: String(l), w: unique(String(l), ['0', '1', '2', '3', String(n)].filter(v => v !== String(l))),
          x: `The number of angular nodes equals l: s has none, p one, d two, f three. ${lab} has ${l}.` };
      },
      // Configurations of H to Be (linked to those elements)
      a3Config(e) {
        if (e.z > 4) return null;
        const all = Object.values(CONFIG).concat(['1s<sup>3</sup>', '1s<sup>1</sup> 2s<sup>1</sup>', '1s<sup>2</sup> 2p<sup>1</sup>', '2s<sup>1</sup>']);
        const ans = CONFIG[e.z];
        return { id: `a3:cf:${e.s}`, weight: 3,
          q: `What is the ground-state electron configuration of ${lc(e)}?`,
          a: ans, w: unique(ans, shuffle(all)),
          x: `${e.n} has ${e.z} electron${e.z > 1 ? 's' : ''}. 1s holds at most two (one ↑, one ↓), so ${e.z > 2 ? 'the rest go into 2s, the next lowest energy orbital' : 'they all fit in 1s'}: ${ans}.` };
      }
    });

    PQ.addStealGenerators({
      // Maximum number of electrons in a subshell
      s3Electrons() {
        const [n, l] = (() => { let o; do { o = realOrbital(); } while (o[1] === 0); return o; })();
        return { id: `s3:eb:${label(n, l)}`, num: 2 * (2 * l + 1), tol: 0, unit: 'electrons', show: `${2 * (2 * l + 1)} electrons`,
          q: `What is the maximum number of electrons that a ${label(n, l)} subshell can hold?`,
          x: `${L[l]} means l = ${l}, so ${ml} = ${mlList(l)}: ${2 * l + 1} orbitals. Each holds two electrons, so ${2 * (2 * l + 1)}.` };
      },
      // Counting orbitals across shells
      s3Orbitals() {
        const variant = rnd(3);
        if (variant === 0) {
          const n = 5 + rnd(3);
          return { id: `s3:on:${n}`, num: n * n, tol: 0, unit: 'orbitals', show: `${n * n} orbitals`,
            q: `How many orbitals are there in total in the n = ${n} shell?`,
            x: `l = 0 to ${n - 1}: ${Array.from({ length: n }, (_, l) => 2 * l + 1).join(' + ')} = ${n * n}.` };
        }
        if (variant === 1) {
          const top = 3 + rnd(3);
          const tot = Array.from({ length: top }, (_, i) => (i + 1) ** 2).reduce((a, b) => a + b, 0);
          return { id: `s3:or:${top}`, num: tot, tol: 0, unit: 'orbitals', show: `${tot} orbitals`,
            q: `How many orbitals are there altogether in the shells n = 1 to n = ${top}?`,
            x: `Each shell has n² orbitals: ${Array.from({ length: top }, (_, i) => (i + 1) ** 2).join(' + ')} = ${tot}.` };
        }
        const l = 1 + rnd(2), top = 4 + rnd(2);
        const count = (top - l) * (2 * l + 1);
        return { id: `s3:ol:${l}:${top}`, num: count, tol: 0, unit: 'orbitals', show: `${count} orbitals`,
          q: `How many ${L[l]} orbitals are there altogether in the shells n = 1 to n = ${top}?`,
          x: `${L[l]} subshells (l = ${l}) exist only from n = ${l + 1} upwards: ${Array.from({ length: top - l }, (_, i) => label(l + 1 + i, l)).join(', ')}. That is ${top - l} subshells × ${2 * l + 1} orbitals = ${count}.` };
      },
      // Comparing probability densities from ψ values
      s3Psi() {
        let a = (rnd(70) + 15) / 100, b = (rnd(70) + 10) / 100;
        if (Math.abs(a - b) < 0.05) b = Math.max(0.05, a - 0.2);
        if (b > a) [a, b] = [b, a];
        const sa = Math.random() < 0.5 ? 1 : -1, sb = Math.random() < 0.5 ? 1 : -1;
        const A = sa * a, B = sb * b, r = (a * a) / (b * b);
        const fmt = v => (v < 0 ? MINUS : '') + Math.abs(v).toFixed(2);
        return { id: `s3:ps:${A}:${B}`, num: round(r, 3), rel: REL3, show: num(r, 3),
          q: `At point A an electron's wavefunction has ψ = ${fmt(A)}; at point B, ψ = ${fmt(B)}. How many times more likely (per unit volume) is the electron to be found at A than at B? Give 3 s.f.`,
          x: `Probability density is proportional to ψ², and the sign (phase) doesn't matter: ${Math.abs(A).toFixed(2)}² ÷ ${Math.abs(B).toFixed(2)}² = ${(a * a).toFixed(4)} ÷ ${(b * b).toFixed(4)} = ${num(r, 3)}.` };
      }
    });
  }
  // ================================================================
  // Atoms 4: building atoms and the periodic table
  // ================================================================
  {
    const REL4 = 0.006;
    // Filling order up to calcium, as taught (4s before 3d)
    const ORDER = [['1s', 2], ['2s', 2], ['2p', 6], ['3s', 2], ['3p', 6], ['4s', 2]];
    const CORES = [[18, 'Ar'], [10, 'Ne'], [2, 'He']];
    function filled(z) {                                     // [[subshell, electrons], ...]
      const out = []; let left = z;
      for (const [sub, cap] of ORDER) { if (left <= 0) break; const k = Math.min(cap, left); out.push([sub, k]); left -= k; }
      return out;
    }
    const fmtCfg = parts => parts.map(([sub, k]) => `${sub}<sup>${k}</sup>`).join(' ');
    const full = z => fmtCfg(filled(z));
    const coreOf = z => CORES.find(([n]) => n < z) || null;
    function short(z) {
      const c = coreOf(z); if (!c) return full(z);
      return `[${c[1]}] ${fmtCfg(filled(z).filter((_, i) => i >= filled(c[0]).length))}`;
    }
    function unpaired(z) {
      return filled(z).reduce((t, [sub, k]) => t + (sub.endsWith('s') ? k % 2 : (k <= 3 ? k : 6 - k)), 0);
    }
    const outerN = z => Math.max(...filled(z).map(([sub]) => +sub[0]));
    const valence = z => filled(z).filter(([sub]) => +sub[0] === outerN(z)).reduce((t, [, k]) => t + k, 0);
    const el = z => BY_Z[z];
    // Atomic radii (pm) as in the lecture's table; noble gases left out (measured differently)
    const RADIUS = { H: 37, Li: 157, Be: 112, B: 88, C: 77, N: 74, O: 66, F: 64, Na: 191, Mg: 160, Al: 143, Si: 118, P: 110, S: 104, Cl: 99,
      K: 235, Ca: 197, Ga: 153, Ge: 122, As: 121, Se: 117, Br: 114, Rb: 250, Sr: 215, In: 167, Sn: 158, Sb: 141, Te: 137, I: 133,
      Cs: 272, Ba: 224, Tl: 171, Pb: 175, Bi: 182 };
    const mainGroup = e => e.r <= 7 && (e.c <= 2 || e.c >= 13);
    // Pairs of elements in the same group or period, kept only where the data follow the taught trend clearly
    function trendPairs(e, value, upDown, across, margin) {
      if (value(e) == null || !mainGroup(e)) return [];
      return ELS.filter(o => o !== e && value(o) != null && mainGroup(o) && (o.c === e.c || o.r === e.r)).filter(o => {
        const sameGroup = o.c === e.c;
        const predictE = sameGroup ? upDown(e, o) : across(e, o);   // true if e predicted larger
        const actualE = value(e) > value(o);
        return predictE === actualE && Math.abs(value(e) - value(o)) / Math.max(value(e), value(o)) > margin;
      });
    }
    const HAL = { Cl: -349, Br: -325, I: -295 };
    const an = e => (/^[aeiou]/i.test(e.n) ? 'an ' : 'a ') + lc(e);          // "an oxygen atom"
    const signed = v => (v > 0 ? '+' : '') + sn(v);                          // +54, −24

    PQ.addGenerators({
      // Full configuration of the tapped element (H to Ca)
      a4Config(e) {
        if (e.z > 20) return null;
        const ans = full(e.z);
        const parts = filled(e.z), last = parts[parts.length - 1];
        const cands = [full(e.z + 1), full(e.z - 1)];
        if (e.z >= 19) cands.unshift(`1s<sup>2</sup> 2s<sup>2</sup> 2p<sup>6</sup> 3s<sup>2</sup> 3p<sup>6</sup> 3d<sup>${e.z - 18}</sup>`);
        if (last[0].endsWith('p') && last[1] < 6) cands.unshift(fmtCfg(parts.slice(0, -2).concat([[last[0], last[1] + 2]])));   // skips the s subshell
        if (e.z > 2 && last[1] < (last[0].endsWith('p') ? 6 : 2)) cands.push(fmtCfg([['1s', 2], ...parts.slice(1, -1), [last[0], last[1] + 1]]).replace(/1s<sup>2<\/sup> /, '1s<sup>1</sup> '));
        return { id: `a4:cf:${e.s}`, weight: 2,
          q: `What is the ground-state electron configuration of ${lc(e)} (${e.z} electrons)?`,
          a: ans, w: unique(ans, cands.filter(Boolean)),
          x: `Fill the lowest-energy subshells first, at most two electrons per orbital: 1s, 2s, 2p, 3s, 3p, then 4s (just below 3d). ${e.n}: ${ans}.` };
      },
      // Shorthand configuration
      a4Short(e) {
        if (e.z < 3 || e.z > 20) return null;
        const ans = short(e.z), c = coreOf(e.z);
        return { id: `a4:sh:${e.s}`, weight: 2,
          q: `What is the shorthand (noble-gas core) configuration of ${lc(e)}?`,
          a: ans, w: unique(ans, [e.z >= 19 ? `[Ar] 3d<sup>${e.z - 18}</sup>` : null, short(e.z + 1), short(e.z - 1), short(e.z + 2), short(e.z - 2)].filter(x => x && x !== '1s<sup>2</sup>' && x.includes('['))),
          x: `${e.n}'s first ${c[0]} electrons are arranged exactly as in ${el(c[0]).n.toLowerCase()} (${full(c[0])}), so write [${c[1]}] and add the rest: ${ans}.` };
      },
      // Which element has this configuration
      a4Which(e) {
        if (e.z > 20) return null;
        const nb = [e.z - 1, e.z + 1, e.z + 8, e.z - 8, e.z + 2].filter(z => z >= 1 && z <= 20 && z !== e.z).slice(0, 3);
        return { id: `a4:wh:${e.s}`,
          q: `Which element has the ground-state configuration ${e.z >= 3 && Math.random() < 0.5 ? short(e.z) : full(e.z)}?`,
          a: e.n, w: unique(e.n, nb.map(z => el(z).n)),
          x: `Count the electrons: ${filled(e.z).map(([, k]) => k).join(' + ')} = ${e.z}, so atomic number ${e.z}: ${lc(e)}.` };
      },
      // Unpaired electrons (Hund's rule)
      a4Unpaired(e) {
        if (e.z > 20) return null;
        const u = unpaired(e.z), parts = filled(e.z), last = parts[parts.length - 1];
        const hund = last[0].endsWith('p') && last[1] > 1 && last[1] < 6;
        return { id: `a4:up:${e.s}`, weight: hund ? 2 : 1,
          q: `How many unpaired electrons does ${an(e)} atom have in its ground state?`,
          a: String(u), w: unique(String(u), ['0', '1', '2', '3', String(last[1])].filter(v => v !== String(u))),
          x: hund ? `${e.n} ends ${last[0]}<sup>${last[1]}</sup>. By Hund's rule the three ${last[0]} orbitals fill singly with parallel spins before any pair up, ${last[1] <= 3 ? `so all ${last[1]} are unpaired` : `so ${last[1] - 3} of the ${last[1]} have to pair, leaving ${u} unpaired`}.`
                   : `${e.n} is ${full(e.z)}. ${u ? `The single ${last[0]} electron is unpaired.` : 'Every occupied orbital is full, so there are no unpaired electrons.'}` };
      },
      // Same valence configuration (same group)
      a4Group(e) {
        if (e.z > 20 || e.z <= 2 || e.c === 18 && e.z === 2) return null;
        const mates = ELS.filter(o => o.c === e.c && o !== e && o.z <= 56 && o.r <= 6 && o.z > 2);
        if (!mates.length) return null;
        const ans = pick(mates);
        const wrong = ELS.filter(o => o.r === ans.r && o.c !== e.c && mainGroup(o) && Math.abs(o.c - e.c) <= 3);
        return { id: `a4:gr:${e.s}:${ans.s}`,
          q: `Which element has the same valence (outer-shell) configuration as ${lc(e)}?`,
          a: ans.n, w: unique(ans.n, shuffle(wrong).map(o => o.n)),
          x: `Elements in the same group have the same valence configuration, which is why they behave alike. ${e.n} and ${lc(ans)} are both in group ${e.c}.` };
      },
      // Which subshell is lower in a many-electron atom
      a4Lower() {
        const pairs = [['2s', '2p'], ['3s', '3p'], ['3p', '3d'], ['3s', '3d'], ['4s', '4p'], ['4s', '3d'], ['4p', '4d'], ['4d', '4f']];
        const [lo, hi] = pick(pairs), flip = Math.random() < 0.5;
        const why = lo === '4s' && hi === '3d' ? '4s is so penetrating that it ends up marginally below 3d, which is why potassium and calcium fill 4s before 3d.'
          : `Within a shell, the more penetrating subshell feels more nuclear charge and is lower: s, then p, then d, then f.`;
        return { id: `a4:lo:${lo}${hi}`,
          q: `In an atom with many electrons, which subshell is lower in energy: ${flip ? hi : lo} or ${flip ? lo : hi}?`,
          a: lo, w: [hi, 'They have the same energy'],
          x: why };
      },
      // Which block of the periodic table
      a4Block(e) {
        if (['La', 'Ac', 'Lu', 'Lr'].includes(e.s)) return null;
        const b = e.r >= 9 ? 'f' : e.s === 'He' || e.c <= 2 ? 's' : e.c >= 13 ? 'p' : 'd';
        const width = { s: 2, p: 6, d: 10, f: 14 }[b];
        return { id: `a4:bl:${e.s}`,
          q: `Which block of the periodic table is ${lc(e)} in?`,
          a: `${b}-block`, w: ['s', 'p', 'd', 'f'].filter(x => x !== b).map(x => `${x}-block`),
          x: `The blocks follow the subshell being filled: s-block 2 wide, p-block 6, d-block 10 and f-block 14, matching the number of electrons each subshell holds. ${e.n} is in the ${b}-block (${width} wide).` };
      },
      // Which atom is bigger
      a4Bigger(e) {
        const r = o => RADIUS[o.s];
        const others = trendPairs(e, r, (a, b) => a.r > b.r, (a, b) => a.c < b.c, 0.05);
        if (!others.length) return null;
        const o = pick(others), big = r(e) > r(o) ? e : o, small = big === e ? o : e;
        const sameGroup = o.c === e.c;
        return { id: `a4:bg:${e.s}:${o.s}`, weight: 2,
          q: `Which atom is bigger: ${lc(e)} or ${lc(o)}?`,
          a: big.n, w: [small.n, 'They are the same size'],
          x: sameGroup ? `Down a group atoms get bigger: the outer electrons are in a shell with higher n, mostly further from the nucleus. ${big.n} ${r(big)} pm, ${lc(small)} ${r(small)} pm.`
                       : `Across a period atoms get smaller: each step adds a proton, and electrons in the same shell shield each other poorly, so the effective nuclear charge rises and pulls the outer electrons in. ${big.n} ${r(big)} pm, ${lc(small)} ${r(small)} pm.` };
      },
      // Which has the higher first ionisation energy
      a4IE(e) {
        const v = o => (o.z <= 56 ? o.ie : null);
        const others = trendPairs(e, v, (a, b) => a.r < b.r, (a, b) => a.c > b.c, 0.08);
        if (!others.length) return null;
        const o = pick(others), hi = v(e) > v(o) ? e : o, lo = hi === e ? o : e;
        const sameGroup = o.c === e.c;
        return { id: `a4:ie:${e.s}:${o.s}`, weight: 2,
          q: `Which has the higher first ionisation energy: ${lc(e)} or ${lc(o)}?`,
          a: hi.n, w: [lo.n, 'They are the same'],
          x: sameGroup ? `Down a group ionisation energy decreases: the outer electron is in a higher shell, further from the nucleus, so it is held less tightly. ${hi.n} ${hi.ie}, ${lc(lo)} ${lo.ie} kJ mol<sup>−1</sup>.`
                       : `Across a period ionisation energy generally increases: the effective nuclear charge rises, so the outer electron is held more tightly. ${hi.n} ${hi.ie}, ${lc(lo)} ${lo.ie} kJ mol<sup>−1</sup>.` };
      },
      // Halogen displacement, from electron gain energies
      a4Displace(e) {
        if (!HAL[e.s]) return null;
        const others = Object.keys(HAL).filter(k => k !== e.s);
        const y = pick(others), asX = Math.random() < 0.5;
        const X = asX ? e.s : y, Y = asX ? y : e.s;               // X2 + Y−
        const reacts = HAL[X] < HAL[Y];
        const nm = s => BY_S[s].n.toLowerCase();
        return { id: `a4:dp:${X}${Y}`, weight: 2,
          q: `Electron gain energies: Cl −349, Br −325, I −295 kJ mol<sup>−1</sup>. Does ${X}<sub>2</sub> react with ${Y}<sup>−</sup> ions?`,
          a: reacts ? `Yes: ${Y}<sub>2</sub> forms` : 'No reaction',
          w: reacts ? ['No reaction', `Yes, but only if heated`] : [`Yes: ${Y}<sub>2</sub> forms`, `Yes, but only if heated`],
          x: `Gain: ${X} + e<sup>−</sup> → ${X}<sup>−</sup> releases ${-HAL[X]}; loss: ${Y}<sup>−</sup> → ${Y} + e<sup>−</sup> costs ${-HAL[Y]} kJ mol<sup>−1</sup>. Overall ${signed(HAL[X] - HAL[Y])} kJ mol<sup>−1</sup>, so ${reacts ? `${nm(X)} takes the electron and ${Y}<sub>2</sub> forms` : 'nothing happens'}.` };
      }
    });

    PQ.addStealGenerators({
      // Counting electrons from a configuration (H to Ca)
      s4Count(e) {
        if (e.z < 3 || e.z > 20) return null;
        const parts = filled(e.z), kind = rnd(3);
        if (kind === 0) {
          const n = outerN(e.z), v = valence(e.z);
          return { id: `s4:va:${e.s}`, weight: 2, num: v, tol: 0, unit: 'electrons', show: `${v}`,
            q: `How many electrons does ${an(e)} atom have in its outer shell (n = ${n})?`,
            x: `${e.n} is ${full(e.z)}. The n = ${n} shell holds ${parts.filter(([s]) => +s[0] === n).map(([s, k]) => `${k} in ${s}`).join(' and ')}: ${v}.` };
        }
        if (kind === 1) {
          const c = coreOf(e.z);
          return { id: `s4:co:${e.s}`, weight: 2, num: c[0], tol: 0, unit: 'electrons', show: `${c[0]}`,
            q: `How many core electrons does ${an(e)} atom have?`,
            x: `${e.n} is ${short(e.z)}: the [${c[1]}] core holds ${c[0]} electrons. The rest are valence electrons.` };
        }
        const pElectrons = parts.filter(([s]) => s.endsWith('p')).reduce((t, [, k]) => t + k, 0);
        if (!pElectrons) return null;
        return { id: `s4:pe:${e.s}`, weight: 2, num: pElectrons, tol: 0, unit: 'electrons', show: `${pElectrons}`,
          q: `How many electrons are in p orbitals in ${an(e)} atom?`,
          x: `${e.n} is ${full(e.z)}: ${parts.filter(([s]) => s.endsWith('p')).map(([s, k]) => `${k} in ${s}`).join(' + ')} = ${pElectrons}.` };
      },
      // Overall energy of a halogen displacement
      s4Halogen() {
        const ks = Object.keys(HAL), X = pick(ks), Y = pick(ks.filter(k => k !== X));
        const tot = HAL[X] - HAL[Y];
        return { id: `s4:hl:${X}${Y}`, num: tot, tol: 0.5, unit: 'kJ mol<sup>−1</sup>', show: `${signed(tot)} kJ mol<sup>−1</sup>`,
          q: `Electron gain energies: ${X} ${sn(HAL[X])} kJ mol<sup>−1</sup>, ${Y} ${sn(HAL[Y])} kJ mol<sup>−1</sup>. For ${X}<sub>2</sub> + 2${Y}<sup>−</sup> → 2${X}<sup>−</sup> + ${Y}<sub>2</sub>, what is the overall energy per mole of electrons transferred (gain plus loss)? Include the sign.`,
          x: `Gain ${sn(HAL[X])} (${X} + e<sup>−</sup> → ${X}<sup>−</sup>) plus loss +${-HAL[Y]} (${Y}<sup>−</sup> → ${Y} + e<sup>−</sup>) = ${signed(tot)} kJ mol<sup>−1</sup>. ${tot < 0 ? 'Negative, so the reaction happens.' : 'Positive, so no reaction.'}` };
      },
      // Ionisation energy per atom from kJ per mole
      s4IEatom(e) {
        if (!e.ie || e.z > 56) return null;
        const J = e.ie * 1e3 / 6.022e23 / 1e-19;
        return { id: `s4:ia:${e.s}`, num: round(J), rel: REL4, unit: '× 10<sup>−19</sup> J', show: `${num(J, 3)} × 10<sup>−19</sup> J`,
          q: `The first ionisation energy of ${lc(e)} is ${e.ie} kJ mol<sup>−1</sup>. How much energy does it take to remove the outer electron from one ${lc(e)} atom, in units of 10<sup>−19</sup> J? Use N<sub>A</sub> = 6.022 × 10<sup>23</sup> mol<sup>−1</sup>. Give 3 s.f.`,
          x: `${e.ie} kJ mol<sup>−1</sup> = ${e.ie} × 10<sup>3</sup> J per mole of atoms; ÷ 6.022 × 10<sup>23</sup> = ${toSF(J * 1e-19)} J per atom.` };
      }
    });
  }
})();
