// Pachinko: the projector page. It runs the board: each right answer on a phone adds a "drop";
// this page drops that ball, works out where it lands, and records the score.
(async function () {
  const { $, esc, store, team, fmtTime, theme, qrSvg } = GQ;
  const P = PACHINKO, S = P.S;
  theme();
  const params = new URLSearchParams(location.search);
  const quizId = params.get('quiz');
  $('title').textContent = document.title = S.title;
  $('nameA').textContent = team('a').name; $('nameB').textContent = team('b').name;
  $('mins').value = S.defaultMinutes;
  $('howto').innerHTML = '<b>How to play</b>' + P.rulesList();
  const fatal = html => { $('overlay').classList.remove('hidden'); $('overlayBox').innerHTML = `<h2>Problem</h2><p>${html}</p>`; };
  if (!quizId) return fatal('This page needs a quiz\'s present link. You\'ll find it on the quiz\'s edit page.');

  let B;
  try { B = await GQ_BACKEND.create(); }
  catch (e) { return fatal(`Could not connect. Check the internet connection and reload.<br><small>${esc(e.message)}</small>`); }
  $('mode').textContent = B.mode === 'demo' ? 'Demo mode: this browser only' : 'Live';
  B.onConnection(ok => { if (B.mode !== 'demo') $('mode').textContent = ok ? 'Live' : 'Reconnecting…'; });

  let quiz = null;
  B.watchQuiz(quizId, q => {
    if (!q) { quiz = q; return fatal('No quiz found for this link. It may have been deleted, or the link was copied incompletely.'); }
    if (q.type !== 'pachinko') { GQ.followGame(q, 'pachinko', quiz && state.meta); return; }
    quiz = q;
    $('topic').textContent = q.title || '';
    spawn();
    if (state.meta) renderMeta();
  });

  let code, state = { meta: null, players: {}, drops: {}, scores: {} }, unwatch = null, first = true;
  const runKey = 'pach-run-' + quizId + (B.mode === 'demo' ? '-demo' : '');
  const extra = () => ({});

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
    first = true; balls = []; flashes = []; spawned = new Set(); seenScores = new Set(); seenDrops = null; loaded = new Set();
    $('repA').innerHTML = ''; $('repB').innerHTML = '';
    unwatch = B.watchRun(code, (st, part) => { state = st; loaded.add(part); render(part); });
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

  // ---------- The board ----------
  let balls = [], flashes = [], spawned = new Set(), seenScores = new Set(), seenDrops = null, loaded = new Set();
  // Drop a ball for every drop that hasn't landed yet. Wait until both the drops and the scores
  // have loaded, or a refreshed page would think every ball still needed dropping.
  function spawn() {
    if (!quiz || !loaded.has('drops') || !loaded.has('scores') || !running()) return;
    Object.entries(state.drops || {}).forEach(([id, d]) => {
      if (spawned.has(id) || (state.scores || {})[id] || !d) return;
      spawned.add(id);
      const q = quiz.qs[+d.q];
      balls.push(PACH.newBall({ id, t: d.t, mult: (q && +q.mult) || 1, shape: PACH.shapeFor(+d.q) }));
    });
  }
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000); last = now;
    while (acc >= 1 / 120) {
      acc -= 1 / 120;
      for (const b of balls) {
        const zone = PACH.step(b, 1 / 120);
        if (zone != null) land(b, zone);
      }
    }
    balls = balls.filter(b => !b.landed);
    flashes = flashes.filter(f => f.until > now);
    PACH.draw($('board'), balls, flashes);
    placeReports();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Balls keep falling and scoring after the clock hits zero, until the game is declared over
  const running = () => !!state.meta && state.meta.status === 'open';
  function land(b, zone) {
    if ((state.scores || {})[b.id] || !running()) return;
    const s = { p: PACH.ZONES[zone], m: b.mult, t: b.t };
    flashes.push({ zone, t: b.t, text: '+' + s.p * s.m, until: performance.now() + 1800 });
    B.setScore(code, b.id, s).catch(e => console.warn('Couldn\'t record a score', e));
  }

  // ---------- Live reports, either side of the board: Blue on the left, Red on the right ----------
  // They use the space beside the board; if there isn't enough, the side panel's feed is used instead.
  let wideEnough = null;
  function placeReports() {
    const cv = $('board'), r = cv.getBoundingClientRect();
    const boardW = Math.min(r.width, r.height * PACH.W / PACH.H), free = (r.width - boardW) / 2;
    const ok = free >= 150;
    if (ok !== wideEnough) {
      wideEnough = ok;
      ['repA', 'repB'].forEach(id => $(id).classList.toggle('hidden', !ok));
      $('feedCard').classList.toggle('hidden', ok);
    }
    if (ok) ['repA', 'repB'].forEach(id => { $(id).style.width = `${Math.min(free - 16, 340)}px`; });
  }
  const qNumber = q => { const k = GQ.playable(quiz || { qs: [] }).findIndex(x => x.i === q); return k >= 0 ? k + 1 : q + 1; };
  function ballIcon(t, q) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; cv.className = 'repball';
    const qq = quiz && quiz.qs[q];
    PACH.drawBall(cv.getContext("2d"), 48, 48, 22, getComputedStyle(document.documentElement).getPropertyValue('--t' + t).trim(), (qq && +qq.mult) || 1, PACH.shapeFor(q), 0);
    return cv;
  }
  function report(t, q, html) {
    const ul = $(t === 'a' ? 'repA' : 'repB'), li = document.createElement('li');
    li.appendChild(ballIcon(t, q));
    const span = document.createElement('span'); span.innerHTML = html; li.appendChild(span);
    ul.prepend(li);
    while (ul.children.length > 8) ul.lastChild.remove();
  }
  // New right answers, and balls landing (not the ones already there when the page opened)
  function newReports(part) {
    if (part === 'drops') {
      const drops = state.drops || {};
      if (!seenDrops) { seenDrops = new Set(Object.keys(drops)); return; }
      Object.entries(drops).forEach(([id, d]) => {
        if (seenDrops.has(id) || !d) return;
        seenDrops.add(id);
        report(d.t, +d.q, `Q${qNumber(+d.q)} correct!`);
      });
    }
  }

  function render(part) {
    if (part === 'drops') newReports(part);
    if (part === 'drops' || part === 'scores' || part === 'meta') spawn();
    if (part === 'scores' || part === 'meta') {
      const sc = state.scores || {};
      Object.keys(sc).forEach(id => {
        if (seenScores.has(id)) return;
        seenScores.add(id);
        if (!first) {
          if (+sc[id].p > 0) feedLine(sc[id]);
          const d = (state.drops || {})[id];
          if (+sc[id].p > 0) report(sc[id].t, d ? +d.q : 0, `scored ${sc[id].p * (+sc[id].m || 1)} points!`);
        }
      });
      if (part === 'scores') first = false;
      const t = P.totals(sc);
      $('scoreA').textContent = t.a; $('scoreB').textContent = t.b;
      updatePlayers();
    }
    if (part === 'players') updatePlayers();
    if (part === 'meta' || (part === 'scores' && state.meta && state.meta.status === 'ended')) renderMeta();
    if (part === 'meta') GQ_RESULTS.track(B, code, quizId, quiz, state);   // keep the results when the game ends
  }
  function updatePlayers() {
    let a = 0, b = 0;
    Object.values(state.players || {}).forEach(p => p.t === 'a' ? a++ : b++);
    const t = P.totals(state.scores), pl = n => `${n} player${n === 1 ? '' : 's'}`, bl = n => `${n} ball${n === 1 ? '' : 's'}`;
    $('plA').textContent = `${pl(a)} · ${bl(t.na)}`; $('plB').textContent = `${pl(b)} · ${bl(t.nb)}`;
  }

  function renderMeta() {
    const m = state.meta, ov = $('overlay'), box = $('overlayBox');
    if (!quiz) return;
    if (!m) { ov.classList.remove('hidden'); box.innerHTML = '<h2>Setting up…</h2>'; return; }
    if (m.status === 'lobby') {
      shownFinal = null; ov.classList.remove('finishing');
      const n = GQ.playable(quiz).length;
      ov.classList.remove('hidden');
      box.innerHTML = `<div class="lobbygrid"><div class="bigqr">${code ? qrSvg(playUrl()) : ''}<div>Code <b>${esc(code || '')}</b></div></div>
        <div><h2>Scan to join</h2><div class="lobby-msg">${P.rulesList()}</div><p class="small">${n} question${n === 1 ? '' : 's'}. Each player can answer every one.</p></div></div>`;
    } else if (m.status === 'ended') finalNotice(true);
    else if (B.now() >= m.endsAt) finalNotice(false);
    else { ov.classList.add('hidden'); ov.classList.remove('finishing'); shownFinal = null; }
    $('start').textContent = m.status === 'open' ? 'Restart timer' : (m.status === 'ended' ? 'Play on' : 'Start');
  }

  // The notice at the end: the scores first (they tick up as the last balls land), then the winner
  let shownFinal = null;
  function finalNotice(withWinner) {
    const ov = $('overlay'), box = $('overlayBox'), t = P.totals(state.scores), r = P.resultText(state.scores);
    ov.classList.remove('hidden'); ov.classList.toggle('finishing', !withWinner);
    const key = `${withWinner}|${t.a}|${t.b}`;
    if (key === shownFinal) return;
    const was = shownFinal && shownFinal.split('|');
    shownFinal = key;
    const num = (k, v, old) => `<span class="fs" style="color:var(--t${k})">${esc(team(k).name)} <b class="${old != null && +old !== v ? 'bump' : ''}">${v}</b></span>`;
    box.innerHTML = `<p class="small">Time's up!</p>
      <div class="finalscores">${num('a', t.a, was && was[1])}${num('b', t.b, was && was[2])}</div>
      ${withWinner ? `<h2 class="winner"${r.w ? ` style="color:var(--t${r.w})"` : ''}>${r.head}</h2>` : '<p class="small">The last balls are landing…</p>'}`;
  }

  function feedLine(s) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:var(--t${s.t})"></span><b>${esc(team(s.t).name)}</b> +${esc(P.pointsText(s))}`;
    $('feed').prepend(li);
    while ($('feed').children.length > 12) $('feed').lastChild.remove();
  }

  // ---------- Clock, and the end of the game ----------
  // At zero, answers stop and the scores go up in front of the board while the last balls land.
  // Once every ball has scored, the game is over and the winner is added. If a ball somehow
  // hasn't landed after 30 seconds it is taken off and scores nothing (recorded as 0).
  let ending = false, settledAt = 0;
  async function endNow() {
    if (ending) return; ending = true;
    balls = [];
    const sc = state.scores || {};
    const late = Object.entries(state.drops || {}).filter(([id, d]) => d && !sc[id]);
    await Promise.all(late.map(([id, d]) => {
      const q = quiz && quiz.qs[+d.q];
      return B.setScore(code, id, { p: 0, m: (q && +q.mult) || 1, t: d.t }).catch(() => {});
    }));
    await B.updateMeta(code, { status: 'ended' }).catch(e => console.warn('Couldn\'t end the game', e));
    ending = false;
  }
  setInterval(() => {
    const m = state.meta; if (!m) return;
    const now = B.now();
    if (m.status === 'open') {
      const left = m.endsAt - now;
      $('clock').textContent = fmtTime(Math.max(0, left));
      $('clock').style.color = left < 30000 ? 'var(--bad)' : '';
      $('clockLbl').textContent = left > 0 ? 'until the lecture starts' : 'Time\'s up!';
      if (left <= 0) {
        finalNotice(false);
        const waiting = !loaded.has('drops') || !loaded.has('scores') || balls.length
          || Object.entries(state.drops || {}).some(([id, d]) => d && !(state.scores || {})[id]);
        // A short pause after the last ball scores, so the final score sinks in before the winner appears
        if (waiting) settledAt = 0; else if (!settledAt) settledAt = now;
        if ((settledAt && now - settledAt > 1500) || -left > 30000) endNow();
      }
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
    if (m.status === 'open' && m.endsAt > B.now()) B.updateMeta(code, { endsAt: m.endsAt + 60000 });
    else B.updateMeta(code, { status: 'open', endsAt: B.now() + 60000, ...GQ_RESULTS.startPatch(m) });
  };
  $('end').onclick = () => B.updateMeta(code, { endsAt: Math.min(B.now(), (state.meta && state.meta.endsAt) || B.now()) });
  confirmClick($('reset'), 'Clear scores', async () => {
    await GQ_RESULTS.save(B, code, quizId, quiz, state);
    await B.clearRun(code); await B.updateMeta(code, { status: 'lobby', endsAt: 0, started: null });
    $('feed').innerHTML = ''; balls = []; spawned = new Set(); seenScores = new Set(); seenDrops = new Set();
    $('repA').innerHTML = ''; $('repB').innerHTML = '';
  });
  confirmClick($('newgame'), 'New game', async () => {
    await GQ_RESULTS.save(B, code, quizId, quiz, state);
    if (B.mode !== 'demo') await B.deleteRun(code).catch(() => {});
    $('feed').innerHTML = ''; await openRun(true);
  });
  $('fs').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
  $('hide').onclick = () => $('controls').classList.toggle('hidden');
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'c' || e.key === 'C') $('controls').classList.toggle('hidden');
    if (e.key === 'f' || e.key === 'F') $('fs').click();
  });
  if (B.mode === 'demo') $('testphone').classList.remove('hidden');

  try { await openRun(false); }
  catch (e) { fatal(`Could not start a game. Has the database been given the latest rules (database.rules.json)?<br><small>${esc(e.message)}</small>`); }
})();
