// Periodic Table Quest engine: shared tools.
// You shouldn't need to edit this file. Question writers use these through PQ.tools
// (see js/question_generators.js).
(function () {
  const PQ = window.PQ = window.PQ || {};
  const ELS = window.PQ_ELEMENTS;
  const BY_Z = {}, BY_S = {};
  ELS.forEach(e => { BY_Z[e.z] = e; BY_S[e.s] = e; });

  // ---------- Randomness ----------
  const rnd = n => Math.floor(Math.random() * n);                   // 0 to n − 1
  const rint = (a, b) => a + rnd(b - a + 1);                         // a to b inclusive
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- Text ----------
  const lc = e => e.n.toLowerCase();                                  // element name in lower case
  const sup = (A, S) => `<sup>${A}</sup>${S}`;                       // ¹²C style
  // Nuclide notation with mass number over atomic number
  const nuc = (A, Z, S) => `<span class="nuc"><span class="nuc-n"><span>${A}</span><span>${Z}</span></span>${S}</span>`;

  // ---------- Numbers ----------
  const MINUS = '−';
  const expo = n => `10<sup>${n < 0 ? MINUS + (-n) : n}</sup>`;        // 10⁻⁷
  const sfHtml = (m, n) => `${m} × ${expo(n)}`;                       // 2.6 × 10⁻⁷
  // Standard form with a given number of significant figures
  function toSF(v, sig = 3) {
    if (v === 0) return '0';
    const n = Math.floor(Math.log10(Math.abs(v)));
    const m = (v / Math.pow(10, n)).toFixed(sig - 1);
    if (Math.abs(+m) >= 10) return toSF(v * 1.0000001, sig);        // rounding spilled over (9.995 → 10.0)
    return sfHtml(m, n);
  }
  // Plain decimal for everyday sizes, standard form otherwise; always sig significant figures
  function num(v, sig = 3) {
    v = +(v * (1 + 1e-12)).toPrecision(sig);                          // round half up
    const a = Math.abs(v);
    if (a >= 1e-3 && a < 1e5) {
      const n = Math.floor(Math.log10(a));
      return v.toFixed(Math.max(0, sig - 1 - n));
    }
    return toSF(v, sig);
  }
  const round = (v, sig = 3) => +(v * (1 + 1e-12)).toPrecision(sig); // a number rounded to sig figures
  const sn = n => n < 0 ? MINUS + (-n) : String(n);                   // −9
  const sg = n => n < 0 ? `(${MINUS}${-n})` : String(n);              // (−9), for working
  // A decimal spaced in threes like the slides: 0.000 000 26
  function spaced(v) {
    const [i, d] = String(v).split('.');
    const ig = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return d ? `${ig}.${d.replace(/(\d{3})(?=\d)/g, '$1 ')}` : ig;
  }

  // ---------- Wrong answers ----------
  // Up to n candidates that differ from the answer and from each other
  function unique(ans, cands, n = 3) {
    const out = [];
    for (const c of cands) if (c !== ans && !out.includes(c)) { out.push(c); if (out.length === n) break; }
    return out;
  }
  // As unique(), for whole-number answers: skips negatives and tops up with nearby numbers
  function distractors(answer, cands, n = 3) {
    const out = [];
    for (const c of cands) {
      const s = String(c);
      if (s !== String(answer) && !out.includes(s) && !(typeof c === 'number' && c < 0)) out.push(s);
      if (out.length === n) break;
    }
    if (/^\d+$/.test(String(answer))) for (let k = 1; out.length < n && k < 20; k++) {
      const v = String(+answer + k);
      if (!out.includes(v)) out.push(v);
    }
    return out;
  }

  PQ.tools = { rnd, rint, pick, shuffle, lc, sup, nuc, MINUS, expo, sfHtml, toSF, num, round, sn, sg, spaced, unique, distractors,
    ELEMENTS: ELS, BY_Z, BY_S };
})();
