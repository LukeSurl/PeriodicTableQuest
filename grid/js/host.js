// Quiz Grid: the projector page
(async function () {
  const { $, esc, store, S, team, fmtTime, theme, drawGrid, score, qrSvg, withDemo } = GQ;
  theme();
  const params = new URLSearchParams(location.search);
  const quizId = params.get('quiz');
  $('title').textContent = document.title = S.title;
  $('nameA').textContent = team('a').name; $('nameB').textContent = team('b').name;
  $('mins').value = S.defaultMinutes;
  const fatal = html => { $('overlay').classList.remove('hidden'); $('overlayBox').innerHTML = `<h2>Problem</h2><p>${html}</p>`; };
  if (!quizId) return fatal('This page needs a quiz\'s present link. You\'ll find it on the quiz\'s edit page.');

  let B;
  try { B = await GQ_BACKEND.create(); }
  catch (e) { return fatal(`Could not connect. Check the internet connection and reload.<br><small>${esc(e.message)}</small>`); }
  $('mode').textContent = B.mode === 'demo' ? 'Demo mode: this browser only' : 'Live';
  B.onConnection(ok => { if (B.mode !== 'demo') $('mode').textContent = ok ? 'Live' : 'Reconnecting…'; });

  // The quiz itself, kept up to date if it is edited during the game
  let quiz = null, quizLoaded = false;
  B.watchQuiz(quizId, q => {
    quiz = q; quizLoaded = true;
    if (!q) return fatal('No quiz found for this link. It may have been deleted, or the link was copied incompletely.');
    $('topic').textContent = q.title || '';
    draw(false);
    if (state.meta) renderMeta();
  });

  let code, state = { meta: null, players: {}, pts: {} }, unwatch = null, endingSent = false, first = true;
  const runKey = 'gq-run-' + quizId + (B.mode === 'demo' ? '-demo' : '');

  async function openRun(fresh) {
    code = fresh ? null : store.get(runKey, null);
    if (code && B.mode !== 'demo') {
      const meta = await B.getRunMeta(code).catch(() => null);
      if (!meta || meta.host !== B.uid || meta.quiz !== quizId) code = null;
    } else if (B.mode === 'demo') code = null;
    if (!code) { code = B.newRunCode(); await B.createRun(code, quizId); store.set(runKey, code); }
    if (unwatch) unwatch();
    first = true;
    unwatch = B.watchRun(code, (st, part) => { state = st; render(part); });
    drawQR();
  }

  function playUrl() {
    const u = new URL('play.html', location.href); u.search = '';
    u.searchParams.set('g', code);
    if (B.mode === 'demo') u.searchParams.set('demo', '1');
    return u.toString();
  }
  function drawQR() {
    $('qr').innerHTML = qrSvg(playUrl());
    const short = new URL('play.html', location.href); short.search = '';
    $('join').innerHTML = `Scan, or go to<br>${esc(short.host + short.pathname)}<br>and enter <b>${code}</b>`;
    $('testphone').href = playUrl();
  }

  function draw(animate) {
    if (!quiz) return [];
    return drawGrid($('grid'), quiz, state.pts, { animate, aspect: gridAspect() });
  }
  const gridAspect = () => { const r = $('grid').getBoundingClientRect(); return r.width && r.height ? r.width / r.height : 1.6; };
  window.addEventListener('resize', () => { $('grid').dataset.key = ''; draw(false); });

  function render(part) {
    if (part === 'pts' || part === 'meta') {
      draw(!first).forEach(feedLine);
      if (part === 'pts') first = false;
      const s = score(state.pts);
      $('scoreA').textContent = s.a; $('scoreB').textContent = s.b;
    }
    if (part === 'players') {
      let a = 0, b = 0;
      Object.values(state.players || {}).forEach(p => p.t === 'a' ? a++ : b++);
      $('plA').textContent = `${a} player${a === 1 ? '' : 's'}`; $('plB').textContent = `${b} player${b === 1 ? '' : 's'}`;
    }
    if (part === 'meta') renderMeta();
  }

  function renderMeta() {
    const m = state.meta, ov = $('overlay'), box = $('overlayBox');
    if (!quiz) return;
    if (!m) { ov.classList.remove('hidden'); box.innerHTML = '<h2>Setting up…</h2>'; return; }
    if (m.status === 'open') endingSent = false;
    const n = GQ.playable(quiz).length;
    if (m.status === 'lobby') {
      ov.classList.remove('hidden');
      box.innerHTML = `<h2>Scan to join</h2><p class="lobby-msg">You'll be put in team <span style="color:var(--ta);font-weight:700">${esc(team('a').name)}</span> or <span style="color:var(--tb);font-weight:700">${esc(team('b').name)}</span>.<br>
        ${n} question${n === 1 ? '' : 's'}. Every correct answer wins your team a point,<br>so the more of you who get each one right, the better.</p>`;
    } else if (m.status === 'ended') {
      const s = score(state.pts), w = s.a === s.b ? null : (s.a > s.b ? 'a' : 'b');
      ov.classList.remove('hidden');
      box.innerHTML = w ? `<h2 style="color:var(--t${w})">${esc(team(w).name)} wins!</h2><p>${esc(team('a').name)} ${s.a} – ${s.b} ${esc(team('b').name)}</p>`
        : `<h2>It's a draw!</h2><p>${s.a} point${s.a === 1 ? '' : 's'} each</p>`;
    } else ov.classList.add('hidden');
    $('start').textContent = m.status === 'open' ? 'Restart timer' : (m.status === 'ended' ? 'Play on' : 'Start');
  }

  function feedLine(ch) {
    const li = document.createElement('li');
    const k = GQ.playable(quiz).findIndex(q => q.i === ch.i) + 1;
    li.innerHTML = `<span class="dot" style="background:var(--t${ch.t})"></span><b>${esc(team(ch.t).name)}</b> +${ch.add} on question ${k}`;
    $('feed').prepend(li);
    while ($('feed').children.length > 12) $('feed').lastChild.remove();
  }

  // ---------- Clock ----------
  setInterval(() => {
    const m = state.meta; if (!m) return;
    if (m.status === 'open') {
      const left = m.endsAt - B.now();
      $('clock').textContent = fmtTime(left);
      $('clockLbl').textContent = 'until the lecture starts';
      $('clock').style.color = left < 30000 ? 'var(--bad)' : '';
      if (left <= 0 && !endingSent) { endingSent = true; B.updateMeta(code, { status: 'ended' }); }
    } else if (m.status === 'lobby') {
      $('clock').textContent = fmtTime(durationMs()); $('clock').style.color = '';
      $('clockLbl').textContent = 'Waiting to start';
    } else { $('clock').textContent = '0:00'; $('clock').style.color = ''; $('clockLbl').textContent = 'Game over'; }
  }, 250);
  function durationMs() {
    const t = $('endAt').value;
    if (t) {
      const [h, mi] = t.split(':').map(Number), d = new Date(); d.setHours(h, mi, 0, 0);
      const ms = d.getTime() - Date.now(); if (ms > 0) return ms;
    }
    return Math.max(1, +$('mins').value || S.defaultMinutes) * 60000;
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
  confirmClick($('reset'), 'Clear scores', async () => { await B.clearRun(code); await B.updateMeta(code, { status: 'lobby', endsAt: 0 }); $('feed').innerHTML = ''; });
  confirmClick($('newgame'), 'New game', async () => {
    if (B.mode !== 'demo') await B.deleteRun(code).catch(() => {});
    $('feed').innerHTML = ''; await openRun(true);
  });
  $('fs').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
  const toggleControls = () => { $('controls').classList.toggle('hidden'); setTimeout(() => { $('grid').dataset.key = ''; draw(false); }, 50); };
  $('hide').onclick = toggleControls;
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'c' || e.key === 'C') toggleControls();
    if (e.key === 'f' || e.key === 'F') $('fs').click();
  });
  if (B.mode === 'demo') $('testphone').classList.remove('hidden');

  try { await openRun(false); }
  catch (e) { fatal(`Could not start a game. Has the database been given the latest rules (database.rules.json)?<br><small>${esc(e.message)}</small>`); }
})();
