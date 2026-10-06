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
  // ---------- Question topics ----------
  let currentMix = { ...(CFG.mix || {}) };
  let topicIds = [];
  const setName = k => (PQ.sets[k] && PQ.sets[k].short) || k;
  const activeMix = mix => Object.entries(mix || {}).filter(([k, w]) => PQ.sets[k] && +w > 0);
  function showTopic(mix) {
    const on = activeMix(mix);
    const tot = on.reduce((s, [, w]) => s + +w, 0);
    $('topic').textContent = `${CFG.moduleCode} · ` + (!on.length ? 'No topics chosen'
      : on.length === 1 ? PQ.sets[on[0][0]].title
      : on.map(([k, w]) => `${setName(k)} ${Math.round(w / tot * 100)}%`).join(' · '));
  }
  // Find every set in the questions/ folder and load it, so the Topics window can list them
  async function loadTopics() {
    topicIds = await PQ.listSets();
    await PQ.loadSets(topicIds);
    topicIds.sort((a, b) => (!PQ.sets[a]) - (!PQ.sets[b]) || setName(a).localeCompare(setName(b), 'en', { numeric: true }));
    if (!activeMix(currentMix).length) {
      const first = topicIds.find(k => PQ.sets[k]);
      currentMix = first ? { [first]: 100 } : {};
    }
    currentMix = Object.fromEntries(activeMix(currentMix));
    const bad = topicIds.filter(k => !PQ.sets[k] || (PQ.setStatus[k] && PQ.setStatus[k].warnings.length)).length;
    $('topicsBtn').textContent = bad ? `Topics (${bad} need attention)` : 'Topics';
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function openTopics() {
    const mix = (state.meta && state.meta.mix) || currentMix;
    const rows = topicIds.map(k => {
      const set = PQ.sets[k], st = PQ.setStatus[k] || {};
      if (!set) return `<div class="trow bad"><input type="checkbox" disabled aria-label="${esc(k)}"><div class="tinfo"><b>${esc(k)}.js</b>
          <span class="terr">Can't be used: ${esc(st.error || 'unknown problem')}</span></div><span></span></div>`;
      const written = set.questions.filter(q => !q.steal).length, wSteal = set.questions.filter(q => q.steal).length;
      const parts = [`${written} written question${written === 1 ? '' : 's'}`];
      if (set.generators.length) parts.push(`${set.generators.length} generated type${set.generators.length === 1 ? '' : 's'}`);
      const steals = set.stealGenerators.length + wSteal;
      parts.push(steals ? `${steals} steal challenge type${steals === 1 ? '' : 's'}` : 'no steal challenges of its own');
      const w = +mix[k] || 0;
      return `<div class="trow"><input type="checkbox" id="tc-${k}" data-k="${k}" ${w > 0 ? 'checked' : ''}>
        <label class="tinfo" for="tc-${k}"><b>${esc(set.title)}</b><small>${esc(k)}.js · ${parts.join(' · ')}</small>
        ${(st.warnings || []).map(x => `<span class="twarn">${esc(x)}</span>`).join('')}</label>
        <span class="tpct"><input type="number" min="0" max="100" step="5" id="tp-${k}" value="${w > 0 ? Math.round(w) : ''}" aria-label="Share for ${esc(set.short)}"> %</span></div>`;
    }).join('');
    $('topicList').innerHTML = rows || '<p>No question sets found in the questions folder.</p>';
    $('topicSource').textContent = PQ.listSource === 'fallback'
      ? 'The folder list (questions/index.json) could not be read, so only the built-in topics are shown. This is normal when running a copy without GitHub Pages.'
      : `${topicIds.length} file${topicIds.length === 1 ? '' : 's'} in the questions folder.`;
    $('topicList').querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => {
      const p = $('tp-' + cb.dataset.k);
      if (cb.checked && !+p.value) p.value = 10;
      if (!cb.checked) p.value = '';
      updateTotal();
    }));
    $('topicList').querySelectorAll('.tpct input').forEach(inp => inp.addEventListener('input', () => {
      const cb = $('tc-' + inp.id.slice(3)); cb.checked = +inp.value > 0; updateTotal();
    }));
    updateTotal();
    $('topicsModal').classList.remove('hidden');
    const firstBox = $('topicList').querySelector('input:not([disabled])'); if (firstBox) firstBox.focus();
  }
  function readTopics() {
    return Object.fromEntries(topicIds.filter(k => PQ.sets[k] && $('tc-' + k).checked && +$('tp-' + k).value > 0).map(k => [k, +$('tp-' + k).value]));
  }
  function updateTotal() {
    const mix = readTopics(), tot = Object.values(mix).reduce((a, b) => a + b, 0);
    $('topicTotal').textContent = !tot ? 'Tick at least one topic.'
      : tot === 100 ? 'Total: 100%' : `Total: ${tot}%. Shares will be scaled to add up to 100%.`;
    $('tApply').disabled = !tot;
  }
  const closeTopics = () => $('topicsModal').classList.add('hidden');
  $('topicsBtn').onclick = openTopics;
  $('tCancel').onclick = closeTopics;
  $('topicsModal').addEventListener('click', ev => { if (ev.target === $('topicsModal')) closeTopics(); });
  $('tEqual').onclick = () => {
    const on = topicIds.filter(k => PQ.sets[k] && $('tc-' + k).checked);
    on.forEach((k, i) => { $('tp-' + k).value = Math.floor(100 / on.length) + (i < 100 % on.length ? 1 : 0); });
    updateTotal();
  };
  $('tApply').onclick = () => {
    const raw = readTopics(), tot = Object.values(raw).reduce((a, b) => a + b, 0);
    if (!tot) return;
    currentMix = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.round(v / tot * 1000) / 10]));
    if (code) B.updateMeta(code, { mix: currentMix });
    showTopic(currentMix); closeTopics();
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTopics(); });

  await loadTopics();
  showTopic(currentMix);
  $('nameA').textContent = TEAM('a').name; $('nameB').textContent = TEAM('b').name;
  $('mins').value = CFG.defaultMinutes;

  const cells = T.build($('table'));

  let B;
  try { B = await PQ_BACKEND.create(); }
  catch (e) { return fatal('Could not connect to Firebase. Check the settings in js/config.js and that Anonymous sign-in is enabled.<br><small>' + e.message + '</small>'); }
  $('mode').textContent = B.mode === 'demo' ? 'Demo mode: this browser only' : 'Live';
  B.onConnection(ok => { if (B.mode !== 'demo') $('mode').textContent = ok ? 'Live' : 'Reconnecting…'; });

  const freshMeta = () => ({ status: 'lobby', endsAt: 0, steal: !!CFG.allowSteal, shield: CFG.shieldSeconds * 1000, mix: currentMix });
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
    if (m.mix && activeMix(m.mix).length) showTopic(m.mix);
    else if (code && m.host === B.uid) B.updateMeta(code, { mix: currentMix });   // e.g. a game saved before a topic was renamed
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
    if (e.target.tagName === 'INPUT' || !$('topicsModal').classList.contains('hidden')) return;
    if (e.key === 't' || e.key === 'T') openTopics();
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
