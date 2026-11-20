// Pachinko: the phone page
(async function () {
  const { $, esc, team, fmtTime, theme, toast, withDemo, playable } = GQ;
  const P = PACHINKO, S = P.S;
  theme();
  $('jtitle').textContent = document.title = S.title;
  const params = new URLSearchParams(location.search);
  const code = (params.get('g') || '').trim().toUpperCase();
  if (!code) {
    $('bar').classList.add('hidden'); $('joinform').classList.remove('hidden');
    $('joinform').onsubmit = ev => {
      ev.preventDefault();
      const p = new URLSearchParams(location.search); p.set('g', $('codeIn').value.trim().toUpperCase()); location.search = p.toString();
    };
    return;
  }
  $('nameA').textContent = team('a').name; $('nameB').textContent = team('b').name;
  $('game').classList.remove('hidden');
  const setStatus = html => { $('status').innerHTML = html; $('status').classList.toggle('hidden', !html); };
  setStatus('Connecting…');

  let B;
  try { B = await GQ_BACKEND.create(); }
  catch (e) { return setStatus('Could not connect. Check your internet connection and reload.'); }

  let state = { meta: undefined, drops: {}, scores: {}, mine: {} }, quiz = null, quizFor = null, unQuiz = null;
  let myTeam = null, joining = false, busy = false, coolUntil = 0, sheetDrop = null;
  const told = new Set();       // my balls whose landing I've been told about
  let scoresSeen = false;
  const doneHere = new Set();   // right answers given on this phone (before the database confirms them)
  B.onConnection(ok => { if (!ok && myTeam) toast('Connection lost, reconnecting…'); });

  B.watchRun(code, (st, part) => {
    state = st;
    if (part === 'meta') {
      if (st.meta === null) return setStatus(`No game found with code <b>${esc(code)}</b>. Check the code on the screen. <p><a class="btn" href="${withDemo('play.html')}">Enter a different code</a></p>`);
      if (!st.meta) return;
      if (quizFor !== st.meta.quiz) {
        quizFor = st.meta.quiz; if (unQuiz) unQuiz();
        unQuiz = B.watchQuiz(quizFor, q => { quiz = q; update(); });
      }
      if (!myTeam && !joining) join();
    }
    if (part === 'players' && myTeam && !joining && st.players && !st.players[B.uid]) { myTeam = null; join(); }
    if (part === 'mine' && st.mine && !Object.keys(st.mine).length) doneHere.clear();   // scores were cleared
    if (part === 'scores' && sheetDrop && (st.scores || {})[sheetDrop]) showLanding(sheetDrop);
    if (part === 'scores') {
      if (!scoresSeen) { scoresSeen = true; Object.keys(st.scores || {}).forEach(id => told.add(id)); }   // old news
      else announceLandings();
    }
    update();
  });

  async function join() {
    joining = true;
    try {
      myTeam = await B.join(code);
      joining = false;
      $('bar').className = 'teambar t' + myTeam;
      $('you').textContent = `You're on Team ${team(myTeam).name}`;
      update();
    } catch (e) {
      joining = false;
      setStatus('Could not join the game. ' + esc(e.message || '') + ' <p><button class="btn" onclick="location.reload()">Try again</button></p>');
    }
  }

  const all = () => playable(quiz);
  const isDone = q => doneHere.has(q.i) || !!(state.mine && state.mine[q.i]);
  const remaining = () => all().filter(q => !isDone(q));
  const myId = q => `${B.uid}_${q}`;
  const timeUp = () => state.meta && state.meta.status === 'open' && B.now() >= state.meta.endsAt;
  const isOpen = () => state.meta && state.meta.status === 'open' && B.now() < state.meta.endsAt;

  // ---------- The main screen ----------
  function update() {
    const m = state.meta;
    const t = P.totals(state.scores); $('scoreA').textContent = t.a; $('scoreB').textContent = t.b;
    if (!m || !myTeam || !quiz) return;
    const total = all().length, left = remaining().length, got = total - left;
    const finished = total > 0 && left === 0;
    if (m.status === 'lobby') setStatus('The game starts soon. Questions open when the timer starts.');
    else if (m.status === 'ended') { const r = P.resultText(state.scores); setStatus(`<b>Game over. ${r.head}</b> ${r.sub}. ${r.w === myTeam ? '🎉' : r.w ? 'Better luck next time.' : ''}`); }
    else if (timeUp()) setStatus('Time\'s up! Watch the last balls land on the big screen.');
    else setStatus('');
    $('progress').textContent = total ? `You've got ${got} of ${total} question${total === 1 ? '' : 's'} right` : 'No questions yet.';
    $('done').classList.toggle('hidden', !finished);
    if (finished) $('done').innerHTML = `🎉 <b>You've answered every question correctly!</b><br>Well done: that's the whole set. Watch your balls land on the big screen.`;
    drawTiles();
    // My balls: falling or landed
    const mine = Object.keys(state.drops || {}).filter(id => id.startsWith(B.uid + '_'));
    $('myballs').innerHTML = mine.map(id => {
      const s = (state.scores || {})[id];
      return `<li class="${s ? '' : 'falling'}" style="background:var(--t${myTeam})">${s ? '+' + esc(P.pointsText(s)) : 'falling…'}</li>`;
    }).join('');
  }
  setInterval(() => {
    const m = state.meta; if (!m) return;
    $('clock').textContent = m.status === 'open' ? (timeUp() ? 'Time\'s up' : fmtTime(m.endsAt - B.now())) : m.status === 'ended' ? 'Game over' : 'Starting soon';
    const c = coolUntil - Date.now();
    $('cool').classList.toggle('hidden', c <= 0);
    if (c > 0) $('cool').textContent = `Think it over… ${Math.ceil(c / 1000)}s`;
    update();
  }, 500);

  // ---------- One question ----------
  // The questions as tiles, as in Quiz Grid, each with its ball in the top right corner
  function drawTiles() {
    GQ.drawGrid($('grid'), quiz, {}, { cols: 2, onTap: tapTile, mark: (el, i) => {
      el.classList.toggle('done', isDone({ i }));
      let cv = el.querySelector('canvas.tileball');
      if (!cv || cv.dataset.t !== myTeam) {
        if (!cv) { cv = document.createElement('canvas'); cv.className = 'tileball'; cv.width = cv.height = 128; el.appendChild(cv); }
        cv.dataset.t = myTeam;
        const g = cv.getContext('2d'), q = quiz.qs[i];
        g.clearRect(0, 0, 128, 128);
        PACH.drawBall(g, 64, 64, 28, getComputedStyle(document.documentElement).getPropertyValue('--t' + myTeam).trim(), +q.mult || 1, PACH.shapeFor(i), 0);
      }
    } });
  }
  function tapTile(i) {
    const q = all().find(x => x.i === i);
    if (busy || !q) return;
    if (isDone(q)) return toast('You\'ve already got that one right. Try another!');
    if (!state.meta || state.meta.status === 'lobby') return toast('Questions open when the game starts.');
    if (!isOpen()) return toast('Time\'s up!');
    if (Date.now() < coolUntil) return toast('Wait for the timer after a wrong answer, then try again.');
    ask(q);
  }

  function ask(q) {
    sheetDrop = null;
    const order = q.opts.map((o, j) => j).filter(j => q.opts[j]).sort(() => Math.random() - 0.5);
    const body = GQ.isNum(q)
      ? `<form class="numform" id="numform" autocomplete="off">
           <input id="numIn" inputmode="decimal" enterkeyhint="done" placeholder="Your answer" aria-label="Your answer">${q.unit ? `<span class="unit">${esc(q.unit)}</span>` : ''}
           <button class="btn primary">Submit</button></form>
         <p class="hint">Type a number. For standard form, type e.g. 6.02e23 or 6.02 × 10^23.</p>`
      : `<div class="opts">${order.map(j => `<button class="opt" data-j="${j}">${esc(q.opts[j])}</button>`).join('')}</div>`;
    $('sheet').innerHTML = `
      <canvas class="ballprev" id="ballCv" width="160" height="160" aria-label="Your ball for this question"></canvas>
      <p class="qhead"><b>Question ${all().findIndex(x => x.i === q.i) + 1}</b>${+q.mult > 1 ? ` <span class="multnote">${multWords(+q.mult)}</span>` : ''} · Team ${esc(team(myTeam).name)}</p>
      ${q.img ? `<img class="qimg" src="${q.img}" alt="">` : ''}
      <div class="q">${esc(q.text).replace(/\n/g, '<br>')}</div>
      ${body}
      <div id="res"><button class="btn close" id="closeBtn">Skip for now</button></div>`;
    $('sheetBg').classList.remove('hidden');
    $('closeBtn').onclick = close;
    drawPreview(q);
    if (GQ.isNum(q)) {
      $('numform').onsubmit = ev => {
        ev.preventDefault();
        const v = GQ.parseNum($('numIn').value);
        if (!isFinite(v)) return toast('Type a number, e.g. 35.5 or 6.02 × 10^23');
        submit(q, v, $('numIn'));
      };
      setTimeout(() => $('numIn') && $('numIn').focus(), 50);
    } else $('sheet').querySelectorAll('.opt').forEach(b => b.onclick = () => submit(q, +b.dataset.j, b));
  }

  async function submit(q, a, el) {
    if (busy) return;
    busy = true;
    $('sheet').querySelectorAll('.opt, #numform input, #numform button').forEach(b => b.disabled = true);
    $('res').innerHTML = '<div class="result"><h3>Checking…</h3></div>';
    let msg;
    try {
      const r = await B.answer(code, q.i, a);
      if (r === 'right') {
        el.classList.add('right'); doneHere.add(q.i);
        const d = await B.drop(code, q.i, myTeam);
        if (d === 'dropped' || d === 'already') {
          sheetDrop = myId(q.i);
          msg = `<h3>✅ Correct!</h3><p id="landing">Your ball${+q.mult > 1 ? ` (×${+q.mult})` : ''} is dropping on the big screen…</p>`;
        } else if (d === 'closed') msg = '<h3>✅ Correct!</h3><p>But time is up, so no ball this time.</p>';
        else msg = '<h3>✅ Correct!</h3><p>But your ball couldn\'t be dropped. Please tell the lecturer.</p>';
      } else if (r === 'closed') msg = '<h3>The game isn\'t running right now.</h3><p>Answers only count while the timer is running.</p>';
      else if (r === 'notjoined') { msg = '<h3>You weren\'t in this game yet.</h3><p>You\'ve been added to a team now. Please try again.</p>'; myTeam = null; join(); }
      else {
        el.classList.add('wrong');
        coolUntil = Date.now() + S.wrongCooldownSeconds * 1000;
        msg = `<h3>❌ Not quite.</h3>${GQ.fbHtml(q)}<p>Try another question, or come back to this one in ${S.wrongCooldownSeconds} seconds.</p>`;
      }
    } catch (e) {
      msg = '<h3>That couldn\'t be checked.</h3><p>Check your connection and try again.</p>';
    }
    busy = false;
    $('res').innerHTML = `<div class="result">${msg}</div><button class="btn primary close" id="closeBtn">Back</button>`;
    $('closeBtn').onclick = close;
    if (sheetDrop && (state.scores || {})[sheetDrop]) showLanding(sheetDrop);
    update();
  }

  // Where my balls landed
  function showLanding(id) {
    const s = state.scores[id], el = $('landing');
    told.add(id);
    if (el) el.innerHTML = `Your ball landed on <b>${s.p}</b>${+s.m > 1 ? ` ×${s.m}` : ''}: <b>+${s.p * s.m} points</b> for Team ${esc(team(s.t).name)}!`;
  }
  function announceLandings() {
    Object.entries(state.scores || {}).forEach(([id, s]) => {
      if (!id.startsWith(B.uid + '_') || told.has(id)) return;
      told.add(id);
      if (id !== sheetDrop || $('sheetBg').classList.contains('hidden')) toast(`Your ball landed: +${s.p * s.m} points for Team ${esc(team(s.t).name)}`);
    });
  }

  const multWords = m => ({ 2: 'DOUBLE POINTS', 3: 'TRIPLE POINTS', 4: 'QUADRUPLE POINTS', 5: 'QUINTUPLE POINTS' }[m] || `×${m} POINTS`);

  // The ball a right answer to this question drops, the right way up, in the sheet's corner
  function drawPreview(q) {
    const cv = $('ballCv'), g = cv.getContext('2d');
    const colour = getComputedStyle(document.documentElement).getPropertyValue('--t' + myTeam).trim();
    g.clearRect(0, 0, cv.width, cv.height);
    PACH.drawBall(g, cv.width / 2, cv.height / 2, cv.width * 0.21, colour, +q.mult || 1, PACH.shapeFor(q.i), 0);
  }

  function close() { if (busy) return; sheetDrop = null; $('sheetBg').classList.add('hidden'); update(); }
  $('sheetBg').addEventListener('click', ev => { if (ev.target === $('sheetBg')) close(); });
})();
