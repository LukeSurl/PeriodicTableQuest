// Generated questions for Chemistry Skills 1 (Maths for chemists).
// Multiple-choice generators are added to PQ_QUIZ.GEN, numeric steal challenges to PQ_QUIZ.STEAL.
(function () {
  const Q = window.PQ_QUIZ, { rnd, pick, shuffle } = Q.util;
  const ELS = window.PQ_ELEMENTS;
  const lc = e => e.n.toLowerCase();

  // ---------- Number formatting ----------
  const MINUS = '−';
  const expo = n => `10<sup>${n < 0 ? MINUS + (-n) : n}</sup>`;
  const sfHtml = (m, n) => `${m} × ${expo(n)}`;
  // Standard form string with a given number of significant figures
  function toSF(v, sig = 3) {
    if (v === 0) return '0';
    const n = Math.floor(Math.log10(Math.abs(v)));
    let m = (v / Math.pow(10, n)).toFixed(sig - 1);
    if (Math.abs(+m) >= 10) return toSF(v * 1.0000001, sig); // rounding spilled over (9.995 → 10.0)
    return sfHtml(m, n);
  }
  // Plain decimal for "nice" sizes, standard form otherwise; always sig significant figures
  function num(v, sig = 3) {
    v = +(v * (1 + 1e-12)).toPrecision(sig);            // round half up, to sig figures
    const a = Math.abs(v);
    if (a >= 1e-3 && a < 1e5) {
      const n = Math.floor(Math.log10(a));
      const dp = Math.max(0, sig - 1 - n);
      return v.toFixed(dp);
    }
    return toSF(v, sig);
  }
  const round = (v, sig = 3) => +(v * (1 + 1e-12)).toPrecision(sig);
  const sn = n => n < 0 ? MINUS + (-n) : String(n);
  const sg = n => n < 0 ? `(${MINUS}${-n})` : String(n);  // signed power for working, e.g. (−9)
  // Write a number as a spaced decimal like the slides: 0.000 000 26
  function spaced(v) {
    let s = typeof v === 'string' ? v : String(v);
    const [i, d] = s.split('.');
    const ig = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return d ? `${ig}.${d.replace(/(\d{3})(?=\d)/g, '$1 ')}` : ig;
  }
  function unique(ans, cands, n = 3) {
    const out = [];
    for (const c of cands) if (c !== ans && !out.includes(c)) { out.push(c); if (out.length === n) break; }
    return out;
  }
  const UNITS = ['m', 'g', 'mol', 'J', 'Hz', 's'];

  // Elements usable for mole questions (real, non-trivial molar masses)
  const moleEl = e => e.ram && e.z <= 92 && !['Tc', 'Pm', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Pa'].includes(e.s);

  Object.assign(Q.GEN, {
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

  Object.assign(Q.STEAL, {
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
        q: `0.100 g of an unknown group ${s.g} chloride${s.g === 2 ? ' (XCl<sub>2</sub>, possibly hydrated)' : ' (XCl)'} is titrated with 0.100 mol dm<sup>−3</sup> AgNO<sub>3</sub>. The end point is at ${V.toFixed(2)} mL. What is the molar mass of the salt? Give 3 s.f.`,
        x: `n(Ag<sup>+</sup>) = n(Cl<sup>−</sup>) = 0.100 × ${num(V / 1000, 4)} dm<sup>3</sup> = ${toSF(nCl)} mol. ${s.k === 2 ? `Two Cl<sup>−</sup> per formula unit, so n(salt) = ${toSF(nCl / 2)} mol. ` : ''}M = 0.100 ÷ ${toSF(nCl / s.k)} = ${num(M, 3)} g mol<sup>−1</sup>, consistent with ${s.f} (${s.M}).` };
    },
    // Stoichiometry: 2AgNO3 + MgCl2·6H2O
    stealStoich() {
      const V = (rnd(1500) + 500) / 100, c = pick([0.0100, 0.0200, 0.0500]);
      const nAg = c * V / 1000, nMg = nAg / 2, mg = nMg * 203.31 * 1000;
      return { id: `s:st:${V}:${c}`, num: round(mg), rel: REL, unit: 'mg', show: `${num(mg, 3)} mg`,
        q: `2AgNO<sub>3</sub> + MgCl<sub>2</sub>·6H<sub>2</sub>O → 2AgCl + Mg(NO<sub>3</sub>)<sub>2</sub> + 6H<sub>2</sub>O. ${V.toFixed(2)} mL of ${c.toFixed(4)} mol dm<sup>−3</sup> AgNO<sub>3</sub> reacts completely. What mass of MgCl<sub>2</sub>·6H<sub>2</sub>O (203.31 g mol<sup>−1</sup>) reacted, in <b>mg</b>? Give 3 s.f.`,
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
})();
