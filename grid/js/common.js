// Quiz Grid: small helpers shared by every page.
(function () {
  const S = window.GQ_SETTINGS;
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
  const store = {
    get: (k, fb) => safe(() => { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); }, fb),
    set: (k, v) => safe(() => localStorage.setItem(k, JSON.stringify(v)))
  };
  const team = t => S.teams[t];
  const fmtTime = ms => {
    ms = Math.max(0, ms); const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const isDemo = () => new URLSearchParams(location.search).has('demo');
  const withDemo = url => (isDemo() ? url + (url.includes('?') ? '&' : '?') + 'demo=1' : url);

  function theme() {
    const r = document.documentElement.style;
    r.setProperty('--ta', S.teams.a.colour);
    r.setProperty('--tb', S.teams.b.colour);
  }

  // Questions that are complete enough to play. kind 'num' questions have a typed number answer.
  const isNum = q => q && q.kind === 'num';
  const playable = quiz => ((quiz && quiz.qs) || []).map((q, i) => ({ ...q, i })).filter(q => q && q.ready && q.text && (isNum(q) || (q.opts || []).filter(o => o).length >= 2));

  // A typed number: "35.5", "35,5", "−3", "6.02e23", "6.02 × 10^23", "6.02x10²³", "1,234.5", "24.2 %".
  // Returns NaN if it isn't one.
  const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function parseNum(text, strict) {   // strict: no unit allowed after the number
    let t = String(text == null ? '' : text).trim().replace(/[\s\u00A0\u202F]+/g, '').replace(/[−–]/g, '-').replace(/⁻/g, '-').replace(/⁺/g, '');
    t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => SUPS.indexOf(c));
    if (t.includes(',')) t = t.includes('.') || /^-?[1-9]\d{0,2}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
    t = t.replace(/^(-?[\d.]+)(?:[×xX*·]|\\times)10\^?\(?([+-]?\d+)\)?/, '$1e$2');
    if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return Number(t);
    const m = t.match(/^([+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?)(%|[A-Za-zµ°Å][\w°µ⁻⁰-⁹\-\/^]*)$/i);   // a number followed by a unit
    return m && !strict ? Number(m[1]) : NaN;
  }
  // A number written for people: up to 6 significant figures, standard form when very big or small
  function fmtNum(v) {
    if (!isFinite(v)) return '';
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e6 || a < 1e-3)) {
      const [m, e] = v.toExponential(5).split('e');
      return `${String(+m).replace('-', '−')} × 10${String(+e).replace('-', '⁻').replace(/\d/g, d => SUPS[d])}`;
    }
    return String(+v.toPrecision(6)).replace('-', '−');
  }
  // The range of answers accepted for a number question { v, tol, pct }
  function numRange(n) {
    const v = +n.v, tol = Math.abs(+n.tol || 0) * (n.pct ? Math.abs(v) / 100 : 1);
    const slack = Math.max(Math.abs(v) * 1e-9, 1e-12);   // so that typing the exact value always counts
    return { lo: v - tol - slack, hi: v + tol + slack };
  }

  // Elements (needs ../js/elements.js). "Na, cl Fe" → [11, 17, 26]; unknown symbols in bad
  const ELS = window.PQ_ELEMENTS || [];
  const BY_SYM = {}; ELS.forEach(e => { BY_SYM[e.s.toLowerCase()] = e; BY_SYM[e.n.toLowerCase()] = e; });
  if (BY_SYM.aluminium) BY_SYM.aluminum = BY_SYM.aluminium;
  if (BY_SYM.sulfur) BY_SYM.sulphur = BY_SYM.sulfur;
  function parseEls(text) {
    const zs = [], bad = [];
    String(text || '').split(/[\s,;/]+/).map(w => w.trim()).filter(Boolean).forEach(w => {
      if (/^(any|all|none|-)$/i.test(w)) return;
      const e = BY_SYM[w.toLowerCase()];
      if (e) { if (!zs.includes(e.z)) zs.push(e.z); } else bad.push(w);
    });
    return { zs: zs.sort((a, b) => a - b), bad };
  }
  const elSym = z => (ELS.find(e => e.z === +z) || {}).s || String(z);
  // A question's elements as a sorted list of atomic numbers (stored as { "8": true, … })
  const elsOf = q => Object.keys((q && q.els) || {}).map(Number).filter(z => z >= 1 && z <= 118).sort((a, b) => a - b);

  // Periodic Table Quest: the playable questions that can be asked on element z.
  // steal: true for steal questions (falling back to ordinary ones if there are none for z).
  const fitsEl = (q, z) => !q.els || !Object.keys(q.els).length || !!q.els[z];
  function poolFor(quiz, z, steal) {
    const all = playable(quiz).filter(q => fitsEl(q, z));
    const ordinary = all.filter(q => !q.steal);
    if (!steal) return ordinary;
    const st = all.filter(q => q.steal);
    return st.length ? st : ordinary;
  }

  // A question's own feedback for a wrong answer, if the lecturer wrote one
  const fbHtml = q => (q && q.fb && String(q.fb).trim() ? `<p class="fbtext">${esc(String(q.fb).trim())}</p>` : '');

  // What a tile shows: picture and/or short label, otherwise the question itself
  function tileInner(q, n) {
    const img = q.img ? `<img src="${q.img}" alt="">` : '';
    const longest = q.label ? Math.max(...q.label.split(/\s+/).map(w => w.length)) : 0;
    const label = q.label ? `<span class="glabel" style="--w:${Math.max(longest, 7)}">${esc(q.label)}</span>` : '';
    const text = !q.img && !q.label ? `<span class="gtext">${esc(q.text)}</span>` : '';
    return `<span class="gnum">${n}</span><span class="gbody${q.img ? ' hasimg' : ''}">${img}${label}${text}</span>`;
  }

  // Points on one question, per team. pts = { qIndex: { uid: { t: 'a' or 'b', at } } }
  function counts(p) {
    const c = { a: 0, b: 0 };
    Object.values(p || {}).forEach(x => { if (x && (x.t === 'a' || x.t === 'b')) c[x.t]++; });
    return c;
  }

  // Build or refresh a grid of tiles
  function drawGrid(container, quiz, pts, opts = {}) {
    const qs = playable(quiz);
    const key = JSON.stringify(qs.map(q => [q.i, q.text, q.label, q.img ? q.img.length : 0]));
    if (container.dataset.key !== key) {
      container.dataset.key = key;
      container.classList.add('ggrid');
      const n = qs.length || 1, aspect = opts.aspect || 1.6;
      const cols = opts.cols || Math.max(1, Math.min(n, Math.round(Math.sqrt(n * aspect))));
      container.style.setProperty('--cols', cols);
      container.style.setProperty('--rows', Math.ceil(n / cols));
      container.innerHTML = qs.map((q, k) => `<${opts.onTap ? 'button type="button"' : 'div'} class="gtile" data-i="${q.i}">
          ${tileInner(q, k + 1)}<span class="gflags"><span class="fa"></span><span class="fb"></span></span></${opts.onTap ? 'button' : 'div'}>`).join('')
        || '<p class="gempty">No questions yet.</p>';
      if (opts.onTap) container.querySelectorAll('.gtile').forEach(b => b.onclick = () => opts.onTap(+b.dataset.i));
    }
    const changes = [];
    container.querySelectorAll('.gtile').forEach(el => {
      const c = counts(pts && pts[el.dataset.i]);
      ['a', 'b'].forEach(t => {
        const f = el.querySelector('.f' + t), before = f.dataset.n == null ? null : +f.dataset.n;
        if (before === c[t]) return;
        if (before != null && c[t] > before && opts.animate) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); changes.push({ i: +el.dataset.i, t, add: c[t] - before }); }
        f.dataset.n = c[t];
        f.classList.toggle('on', c[t] > 0);
        f.innerHTML = `${esc(team(t).name)} <b>${c[t]}</b>`;
        f.title = `${c[t]} correct answer${c[t] === 1 ? '' : 's'} from Team ${team(t).name}`;
      });
      el.classList.toggle('lead-a', c.a > c.b); el.classList.toggle('lead-b', c.b > c.a);
      if (opts.mark) opts.mark(el, +el.dataset.i);
    });
    return changes;
  }

  // A team wins a question by having more correct answers on it. The overall score is
  // questions won (a, b); total correct answers (ca, cb) break a tie.
  function score(pts) {
    let a = 0, b = 0, ca = 0, cb = 0;
    Object.values(pts || {}).forEach(p => { const c = counts(p); ca += c.a; cb += c.b; if (c.a > c.b) a++; else if (c.b > c.a) b++; });
    return { a, b, ca, cb };
  }
  const winner = s => (s.a !== s.b ? (s.a > s.b ? 'a' : 'b') : s.ca !== s.cb ? (s.ca > s.cb ? 'a' : 'b') : null);
  // The result in words, e.g. for the end of the game
  function resultText(s) {
    const w = winner(s), A = esc(team('a').name), Bn = esc(team('b').name);
    if (!w) return { w, head: 'It\'s a draw!', sub: `${s.a} question${s.a === 1 ? '' : 's'} won each, and ${s.ca} correct answer${s.ca === 1 ? '' : 's'} each` };
    if (s.a !== s.b) return { w, head: `${esc(team(w).name)} wins!`, sub: `Questions won: ${A} ${s.a} – ${s.b} ${Bn}` };
    return { w, head: `${esc(team(w).name)} wins!`, sub: `${s.a} question${s.a === 1 ? '' : 's'} won each, so it went to correct answers: ${A} ${s.ca} – ${s.cb} ${Bn}` };
  }
  // How to play, in the team names from settings
  const rulesList = () => `<ul class="rules">
      <li>You'll be put into Team <b style="color:var(--ta)">${esc(team('a').name)}</b> or Team <b style="color:var(--tb)">${esc(team('b').name)}</b> at random.</li>
      <li>The team with more correct answers on a question holds that question.</li>
      <li>The team that holds the most questions at the end wins!</li></ul>`;

  function qrSvg(url) {
    const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
    const n = qr.getModuleCount(), m = 2;
    let path = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + m} ${r + m}h1v1h-1z`;
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink');
    return `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" role="img" aria-label="QR code to join"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="${ink}"/></svg>`;
  }

  // A "More below" button at the foot of the window whenever the page carries on out of
  // sight (useful on small laptop screens). Clicking it scrolls down most of a screen.
  function moreBelow() {
    if (document.querySelector('.morebelow')) return;
    const b = document.createElement('button');
    b.className = 'morebelow'; b.type = 'button';
    b.innerHTML = 'More below <span aria-hidden="true">↓</span>';
    b.onclick = () => window.scrollBy({ top: Math.round(innerHeight * 0.75), behavior: 'smooth' });
    document.body.appendChild(b);
    let raf = 0;
    const update = () => {
      raf = 0;
      const left = document.documentElement.scrollHeight - (scrollY + innerHeight);
      b.classList.toggle('show', left > 120);
    };
    const later = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', later, { passive: true });
    addEventListener('resize', later);
    if (window.ResizeObserver) new ResizeObserver(later).observe(document.body);
    update();
  }

  let toastT;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2800);
  }

  window.GQ = { S, $, esc, safe, store, team, fmtTime, isDemo, withDemo, theme, playable, isNum, parseNum, fmtNum, numRange, parseEls, elSym, elsOf, ELS, fitsEl, poolFor, fbHtml, tileInner, drawGrid, counts, score, winner, resultText, rulesList, qrSvg, toast, moreBelow };
})();
