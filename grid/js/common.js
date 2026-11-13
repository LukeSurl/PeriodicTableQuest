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

  // Questions that are complete enough to play
  const playable = quiz => ((quiz && quiz.qs) || []).map((q, i) => ({ ...q, i })).filter(q => q && q.ready && q.text && (q.opts || []).filter(o => o).length >= 2);

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
      if (opts.mark) opts.mark(el, +el.dataset.i);
    });
    return changes;
  }

  function score(pts) {
    let a = 0, b = 0;
    Object.values(pts || {}).forEach(p => { const c = counts(p); a += c.a; b += c.b; });
    return { a, b };
  }

  function qrSvg(url) {
    const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
    const n = qr.getModuleCount(), m = 2;
    let path = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + m} ${r + m}h1v1h-1z`;
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink');
    return `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" role="img" aria-label="QR code to join"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="${ink}"/></svg>`;
  }

  let toastT;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2800);
  }

  window.GQ = { S, $, esc, safe, store, team, fmtTime, isDemo, withDemo, theme, playable, tileInner, drawGrid, counts, score, qrSvg, toast };
})();
