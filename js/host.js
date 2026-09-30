// Projector page
(async function () {
  const CFG = window.PQ_CONFIG, T = window.PQ_TABLE, ELS = window.PQ_ELEMENTS;
  const BY_Z = {}; ELS.forEach(e => BY_Z[e.z] = e);
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
  const store = { get: k => safe(() => localStorage.getItem(k), null), set: (k, v) => safe(() => localStorage.setItem(k, v)) };
  const TEAM = t => CFG.teams[t];

  T.applyTheme();
  $('title').textContent = CFG.title;
  const BANKS = Object.keys(window.PQ_BANKS).filter(k => k !== 'template');
  const bankName = k => window.PQ_BANKS[k].short || window.PQ_BANKS[k].title;
  const defaultMix = () => CFG.mix || { [CFG.topic]: 100 };
  function showTopic(mix) {
    const on = Object.entries(mix || defaultMix()).filter(([k, w]) => window.PQ_BANKS[k] && +w > 0);
    const tot = on.reduce((s, [, w]) => s + +w, 0);
    $('topic').textContent = `${CFG.moduleCode} · ` + (on.length === 1 ? window.PQ_BANKS[on[0][0]].title
      : on.map(([k, w]) => `${bankName(k)} ${Math.round(w / tot * 100)}%`).join(' · '));
  }
  // Question mix inputs in the control bar
  $('mixBox').innerHTML = 'Question mix: ' + BANKS.map(k =>
    `<label>${bankName(k)} <input type="number" min="0" max="100" step="5" id="mix-${k}" value="${defaultMix()[k] || 0}"></label>`).join(' ');
  const readMix = () => Object.fromEntries(BANKS.map(k => [k, Math.max(0, +$('mix-' + k).value || 0)]));
  BANKS.forEach(k => $('mix-' + k).addEventListener('change', () => {
    const mix = readMix();
    if (!Object.values(mix).some(v => v > 0)) return;
    B.updateMeta(code, { mix }); showTopic(mix);
  }));
  showTopic(defaultMix());
  $('nameA').textContent = TEAM('a').name; $('nameB').textContent = TEAM('b').name;
  $('mins').value = CFG.defaultMinutes;

  const cells = T.build($('table'));

  let B;
  try { B = await PQ_BACKEND.create(); }
  catch (e) { return fatal('Could not connect to Firebase. Check the settings in js/config.js and that Anonymous sign-in is enabled.<br><small>' + e.message + '</small>'); }
  $('mode').textContent = B.mode === 'demo' ? 'Demo mode: this browser only' : 'Live';
  B.onConnection(ok => { if (B.mode !== 'demo') $('mode').textContent = ok ? 'Live' : 'Reconnecting…'; });

  const freshMeta = () => ({ status: 'lobby', endsAt: 0, steal: !!CFG.allowSteal, shield: CFG.shieldSeconds * 1000, topic: CFG.topic, mix: readMix() });
  const newCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  let code, state = { meta: null, cells: {}, players: {} }, unwatch = null, first = true, endingSent = false;

  async function openGame(fresh) {
    if (B.mode === 'demo') {
      code = 'DEMO';
      await B.createGame(code, freshMeta());
    } else {
      code = fresh ? null : (params.get('g') || store.get('pq-code'));
      if (code) {
        const meta = await B.getMeta(code).catch(() => null);
        if (!meta || meta.host !== B.uid) code = null;
      }
      if (!code) {
        code = newCode();
        await B.createGame(code, freshMeta());
        store.set('pq-code', code);
      }
    }
    if (unwatch) unwatch();
    first = true;
    unwatch = B.watch(code, ['meta', 'cells', 'players'], (st, part) => { state = st; render(part); });
    drawQR();
  }

  function playUrl() {
    const u = new URL('play.html', location.href);
    u.search = '';
    u.searchParams.set('g', code);
    if (B.mode === 'demo') u.searchParams.set('demo', '1');
    return u.toString();
  }

  function drawQR() {
    const url = playUrl();
    const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
    const n = qr.getModuleCount(), m = 2;
    let path = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + m} ${r + m}h1v1h-1z`;
    $('qr').innerHTML = `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" role="img" aria-label="QR code to join"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="${getComputedStyle(document.documentElement).getPropertyValue('--ink')}"/></svg>`;
    const short = new URL('play.html', location.href); short.search = '';
    $('join').innerHTML = `Scan, or go to<br>${short.host}${short.pathname}<br>and enter <b>${code}</b>`;
    $('testphone').href = url;
  }

  // ---------- Rendering ----------
  function render(part) {
    if (part === 'cells' || part === 'meta') {
      const changes = T.paint(cells, state.cells || {}, !first);
      if (part === 'cells') first = false;
      changes.forEach(feedLine);
      const s = T.score(state.cells);
      $('scoreA').textContent = s.a; $('scoreB').textContent = s.b;
      $('tugA').style.flexGrow = s.a; $('tugB').style.flexGrow = s.b; $('tugF').style.flexGrow = 118 - s.a - s.b;
    }
    if (part === 'players') {
      let a = 0, b = 0;
      Object.values(state.players || {}).forEach(p => p.t === 'a' ? a++ : b++);
      $('plA').textContent = `${a} player${a === 1 ? '' : 's'}`; $('plB').textContent = `${b} player${b === 1 ? '' : 's'}`;
    }
    if (part === 'meta') renderMeta();
  }

  function renderMeta() {
    const m = state.meta;
    const ov = $('overlay'), box = $('overlayBox');
    if (!m) { ov.classList.remove('hidden'); box.innerHTML = '<h2>Setting up…</h2>'; return; }
    if (m.status === 'open') endingSent = false;
    if (m.mix) {
      showTopic(m.mix);
      BANKS.forEach(k => { const i = $('mix-' + k); if (document.activeElement !== i) i.value = m.mix[k] || 0; });
    }
    if (m.status === 'lobby') {
      ov.classList.remove('hidden');
      box.innerHTML = `<h2>Scan to join</h2><p class="lobby-msg">You'll be put in team <span style="color:var(--ta);font-weight:700">${TEAM('a').name}</span> or <span style="color:var(--tb);font-weight:700">${TEAM('b').name}</span>.<br>Answer questions to claim elements.</p>`;
    } else if (m.status === 'ended') {
      const s = T.score(state.cells);
      const w = s.a === s.b ? null : (s.a > s.b ? 'a' : 'b');
      ov.classList.remove('hidden');
      box.innerHTML = w
        ? `<h2 style="color:var(--t${w})">${TEAM(w).name} wins!</h2><p>${TEAM('a').name} ${s.a} – ${s.b} ${TEAM('b').name}</p>`
        : `<h2>It's a draw!</h2><p>${s.a} elements each</p>`;
    } else {
      ov.classList.add('hidden');
    }
    $('start').textContent = m.status === 'open' ? 'Restart timer' : (m.status === 'ended' ? 'Play on' : 'Start');
  }

  function feedLine(ch) {
    if (!ch.to) return;
    const e = BY_Z[ch.z];
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:var(--t${ch.to})"></span><b>${TEAM(ch.to).name}</b> ${ch.from ? `stole <b>${e.n}</b> from ${TEAM(ch.from).name}` : `claimed <b>${e.n}</b>`}`;
    const ul = $('feed');
    ul.prepend(li);
    while (ul.children.length > 12) ul.lastChild.remove();
  }

  // ---------- Clock ----------
  setInterval(() => {
    const m = state.meta; if (!m) return;
    if (m.status === 'open') {
      const left = m.endsAt - B.now();
      $('clock').textContent = T.fmtTime(left);
      $('clockLbl').textContent = 'until the lecture starts';
      $('clock').style.color = left < 30000 ? 'var(--bad)' : '';
      if (left <= 0 && !endingSent) { endingSent = true; B.updateMeta(code, { status: 'ended' }); }
    } else if (m.status === 'lobby') {
      $('clock').textContent = T.fmtTime(durationMs() || 0); $('clock').style.color = '';
      $('clockLbl').textContent = 'Waiting to start';
    } else {
      $('clock').textContent = '0:00'; $('clock').style.color = '';
      $('clockLbl').textContent = 'Game over';
    }
  }, 250);

  function durationMs() {
    const t = $('endAt').value;
    if (t) {
      const [h, mi] = t.split(':').map(Number);
      const d = new Date(); d.setHours(h, mi, 0, 0);
      const ms = d.getTime() - Date.now();
      if (ms > 0) return ms;
    }
    return Math.max(1, +$('mins').value || CFG.defaultMinutes) * 60000;
  }

  // ---------- Controls ----------
  function confirmClick(btn, label, fn) {
    btn.addEventListener('click', () => {
      if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = label; fn(); return; }
      btn.dataset.armed = '1'; btn.textContent = 'Click again to confirm';
      setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = label; } }, 3000);
    });
  }
  $('start').onclick = () => B.updateMeta(code, { status: 'open', endsAt: B.now() + durationMs() });
  $('plus').onclick = () => {
    const m = state.meta; if (!m) return;
    if (m.status === 'open') B.updateMeta(code, { endsAt: m.endsAt + 60000 });
    else B.updateMeta(code, { status: 'open', endsAt: B.now() + 60000 });
  };
  $('end').onclick = () => B.updateMeta(code, { status: 'ended', endsAt: B.now() });
  confirmClick($('reset'), 'Clear board', async () => { await B.resetBoard(code); await B.updateMeta(code, { status: 'lobby', endsAt: 0 }); $('feed').innerHTML = ''; });
  confirmClick($('newgame'), 'New game', async () => {
    const old = code;
    if (B.mode !== 'demo') await B.deleteGame(old).catch(() => {});
    $('feed').innerHTML = '';
    await openGame(true);
  });
  $('fs').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
  const toggleControls = () => $('controls').classList.toggle('hidden');
  $('hide').onclick = toggleControls;
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'c' || e.key === 'C') toggleControls();
    if (e.key === 'f' || e.key === 'F') $('fs').click();
  });
  if (B.mode === 'demo') {
    $('sim').classList.remove('hidden'); $('testphone').classList.remove('hidden');
    let on = false;
    $('sim').onclick = () => { on = !on; B.simulate(on); $('sim').textContent = on ? 'Stop simulation' : 'Simulate class'; };
  }

  function fatal(html) {
    $('overlay').classList.remove('hidden');
    $('overlayBox').innerHTML = `<h2>Problem</h2><p>${html}</p>`;
  }

  try { await openGame(false); }
  catch (e) { fatal('Could not create the game. Have you published the database rules from database.rules.json?<br><small>' + e.message + '</small>'); }
})();
