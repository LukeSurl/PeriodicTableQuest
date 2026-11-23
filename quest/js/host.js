// Periodic Table Quest: the projector page
(async function () {
  const { $, esc, store, team, fmtTime, theme, qrSvg } = GQ;
  const S = PTQ.S, T = PQ_TABLE;
  theme();
  const params = new URLSearchParams(location.search);
  const quizId = params.get('quiz');
  $('title').textContent = document.title = S.title;
  $('nameA').textContent = team('a').name; $('nameB').textContent = team('b').name;
  $('mins').value = S.defaultMinutes;
  $('howto').innerHTML = '<b>How to play</b>' + PTQ.rulesList();
  const cells = T.build($('table'));
  const fatal = html => { $('overlay').classList.remove('hidden'); $('overlayBox').innerHTML = `<h2>Problem</h2><p>${html}</p>`; };
  if (!quizId) return fatal('This page needs a quiz\'s present link. You\'ll find it on the quiz\'s edit page.');

  let B;
  try { B = await GQ_BACKEND.create(); }
  catch (e) { return fatal(`Could not connect. Check the internet connection and reload.<br><small>${esc(e.message)}</small>`); }
  $('mode').textContent = B.mode === 'demo' ? 'Demo mode: this browser only' : 'Live';
  B.onConnection(ok => { if (B.mode !== 'demo') $('mode').textContent = ok ? 'Live' : 'Reconnecting…'; });

  // The quiz itself, kept up to date if it is edited during the game
  let quiz = null, playableEls = 0;
  B.watchQuiz(quizId, q => {
    if (!q) { quiz = q; return fatal('No quiz found for this link. It may have been deleted, or the link was copied incompletely.'); }
    if (q.type !== 'ptq') { GQ.followGame(q, 'ptq', quiz && state.meta); return; }
    quiz = q;
    $('topic').textContent = q.title || '';
    playableEls = PTQ.markPlayable(cells, q);
    if (state.meta) renderMeta();
  });

  let code, state = { meta: null, players: {}, cells: {} }, unwatch = null, endingSent = false, first = true;
  const runKey = 'ptq-run-' + quizId + (B.mode === 'demo' ? '-demo' : '');
  const extra = () => ({ shield: S.shieldSeconds * 1000 });

  async function openRun(fresh) {
    if (B.mode === 'demo') {
      code = code || params.get('run') || B.newRunCode();
      await B.createRun(code, quizId, extra());
    } else {
      code = fresh ? null : store.get(runKey, null);
      if (code) {
        const meta = await B.getRunMeta(code).catch(() => null);
        if (!meta || meta.host !== B.uid || meta.quiz !== quizId) code = null;
      }
      if (!code) { code = B.newRunCode(); await B.createRun(code, quizId, extra()); store.set(runKey, code); }
    }
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

  function render(part) {
    if (part === 'cells' || part === 'meta') {
      T.paint(cells, state.cells || {}, !first).forEach(feedLine);
      if (part === 'cells') first = false;
      const s = T.score(state.cells);
      $('scoreA').textContent = s.a; $('scoreB').textContent = s.b;
    }
    if (part === 'players') {
      let a = 0, b = 0;
      Object.values(state.players || {}).forEach(p => p.t === 'a' ? a++ : b++);
      const pl = n => `${n} player${n === 1 ? '' : 's'}`;
      $('plA').textContent = pl(a); $('plB').textContent = pl(b);
    }
    if (part === 'meta' || (part === 'cells' && state.meta && state.meta.status === 'ended')) renderMeta();
    if (part === 'meta') GQ_RESULTS.track(B, code, quizId, quiz, state);   // keep the results when the game ends
  }

  function renderMeta() {
    const m = state.meta, ov = $('overlay'), box = $('overlayBox');
    if (!quiz) return;
    if (!m) { ov.classList.remove('hidden'); box.innerHTML = '<h2>Setting up…</h2>'; return; }
    if (m.status === 'open') endingSent = false;
    if (m.status === 'lobby') {
      const n = GQ.playable(quiz).length;
      ov.classList.remove('hidden');
      box.innerHTML = `<div class="lobbygrid"><div class="bigqr">${code ? qrSvg(playUrl()) : ''}<div>Code <b>${esc(code || '')}</b></div></div>
        <div><h2>Scan to join</h2><div class="lobby-msg">${PTQ.rulesList()}</div>
        <p class="small">${n} question${n === 1 ? '' : 's'}${playableEls < 118 ? ` · ${playableEls} of 118 elements can be claimed in this game` : ''}. Tap any element to practise until the timer starts.</p></div></div>`;
    } else if (m.status === 'ended') {
      const r = PTQ.resultText(state.cells);
      ov.classList.remove('hidden');
      box.innerHTML = `<h2${r.w ? ` style="color:var(--t${r.w})"` : ''}>${r.head}</h2><p>${r.sub}</p>`;
    } else ov.classList.add('hidden');
    $('start').textContent = m.status === 'open' ? 'Restart timer' : (m.status === 'ended' ? 'Play on' : 'Start');
  }

  function feedLine(ch) {
    if (!ch.to) return;
    const e = GQ.ELS[ch.z - 1];
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:var(--t${ch.to})"></span><b>${esc(team(ch.to).name)}</b> ${ch.from ? `stole <b>${esc(e.n)}</b> from ${esc(team(ch.from).name)}` : `claimed <b>${esc(e.n)}</b>`}`;
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
  $('start').onclick = () => B.updateMeta(code, { status: 'open', endsAt: B.now() + durationMs(), ...GQ_RESULTS.startPatch(state.meta) });
  $('plus').onclick = () => {
    const m = state.meta; if (!m) return;
    if (m.status === 'open') B.updateMeta(code, { endsAt: m.endsAt + 60000 });
    else B.updateMeta(code, { status: 'open', endsAt: B.now() + 60000, ...GQ_RESULTS.startPatch(m) });
  };
  $('end').onclick = () => B.updateMeta(code, { status: 'ended', endsAt: B.now() });
  confirmClick($('reset'), 'Clear board', async () => {
    await GQ_RESULTS.save(B, code, quizId, quiz, state);
    await B.clearRun(code); await B.updateMeta(code, { status: 'lobby', endsAt: 0, started: null }); $('feed').innerHTML = '';
  });
  confirmClick($('newgame'), 'New game', async () => {
    await GQ_RESULTS.save(B, code, quizId, quiz, state);
    if (B.mode !== 'demo') await B.deleteRun(code).catch(() => {});
    $('feed').innerHTML = ''; await openRun(true);
  });
  $('fs').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
  const toggleControls = () => $('controls').classList.toggle('hidden');
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
