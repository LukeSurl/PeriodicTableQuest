// Quiz Grid: the phone page
(async function () {
  const { $, esc, S, team, fmtTime, theme, drawGrid, score, toast, playable, withDemo } = GQ;
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

  let state = { meta: undefined, pts: {}, mine: {} }, quiz = null, quizFor = null, unQuiz = null;
  let myTeam = null, joining = false, sheetQ = null, coolUntil = 0, busy = false;
  B.onConnection(ok => { if (!ok && myTeam) toast('Connection lost, reconnecting…'); });

  B.watchRun(code, (st, part) => {
    state = st;
    if (part === 'meta') {
      if (st.meta === null) return setStatus(`No game found with code <b>${esc(code)}</b>. Check the code on the screen. <p><a class="btn" href="${withDemo('play.html')}">Enter a different code</a></p>`);
      if (!st.meta) return;
      if (quizFor !== st.meta.quiz) {
        quizFor = st.meta.quiz; if (unQuiz) unQuiz();
        unQuiz = B.watchQuiz(quizFor, q => { quiz = q; draw(); if (sheetQ != null) refreshSheet(); });
      }
      if (!myTeam && !joining) join();
      renderMeta();
    }
    // A new game on the same code (or a reset demo) no longer lists this phone: join again
    if (part === 'players' && myTeam && !joining && st.players && !st.players[B.uid]) { myTeam = null; join(); }
    if (part === 'pts' || part === 'mine') { draw(); if (sheetQ != null) refreshSheet(); }
    // The scores can arrive after the status, so redo the result line when they do
    if (part === 'pts' && st.meta && st.meta.status === 'ended') renderMeta();
  });

  async function join() {
    joining = true;
    try {
      myTeam = await B.join(code);
      joining = false;
      $('bar').className = 'teambar t' + myTeam;
      $('you').textContent = `You're on Team ${team(myTeam).name}`;
      renderMeta(); draw();
    } catch (e) {
      joining = false;
      setStatus('Could not join the game. ' + esc(e.message || '') + ' <p><button class="btn" onclick="location.reload()">Try again</button></p>');
    }
  }

  function draw() {
    if (!quiz) return;
    drawGrid($('grid'), quiz, state.pts, { cols: 2, onTap: open, mark: (el, i) => el.classList.toggle('done', !!(state.mine && state.mine[i])) });
    const s = score(state.pts, quiz); $('scoreA').textContent = s.a; $('scoreB').textContent = s.b;
  }

  function renderMeta() {
    const m = state.meta; if (!m || !myTeam) return;
    if (m.status === 'lobby') setStatus('The game starts soon. You can look at the questions now; answers open when the timer starts.');
    else if (m.status === 'ended') {
      const r = GQ.resultText(score(state.pts, quiz));
      setStatus(`<b>Game over. ${r.head}</b> ${r.sub}. ${r.w === myTeam ? '🎉' : r.w ? 'Better luck next time.' : ''}`);
    } else setStatus('');
  }

  setInterval(() => {
    const m = state.meta; if (!m) return;
    $('clock').textContent = m.status === 'open' ? fmtTime(m.endsAt - B.now()) : m.status === 'ended' ? 'Game over' : 'Starting soon';
    const c = coolUntil - Date.now();
    $('cool').classList.toggle('hidden', c <= 0);
    if (c > 0) $('cool').textContent = `Think it over… ${Math.ceil(c / 1000)}s`;
  }, 250);

  const isOpen = () => state.meta && state.meta.status === 'open' && B.now() < state.meta.endsAt;
  const qNumber = i => playable(quiz).findIndex(q => q.i === i) + 1;

  // ---------- One question ----------
  function open(i) {
    if (busy || !myTeam || !quiz) return;
    sheetQ = i; refreshSheet(true);
    $('sheetBg').classList.remove('hidden');
  }
  function refreshSheet(fresh) {
    const q = quiz && quiz.qs[sheetQ];
    if (!q) return close();
    if (!fresh && busy) return;
    if (!fresh && $('sheet').dataset.answered) return;   // keep the result on screen
    const got = !!(state.mine && state.mine[sheetQ]);
    const c = GQ.counts(state.pts[sheetQ]);
    const cooling = Date.now() < coolUntil;
    const canAnswer = isOpen() && !got && !cooling;
    const note = got ? '✅ Correct'
      : !state.meta || state.meta.status === 'lobby' ? 'Answers open when the game starts.'
      : state.meta.status === 'ended' || !isOpen() ? 'The game is over.'
      : cooling ? 'Wait for the timer after a wrong answer, then try again.'
      : c.a + c.b ? `Correct answers so far: ${esc(team('a').name)} ${c.a}, ${esc(team('b').name)} ${c.b}. The team with most holds this question${GQ.multOf(q) > 1 ? `, which counts as ${GQ.multOf(q)} questions` : ''}.` : '';
    delete $('sheet').dataset.answered;
    $('sheet').innerHTML = `
      <p class="qhead"><b>Question ${qNumber(sheetQ)}</b>${GQ.multOf(q) > 1 ? ` <span class="gmult">×${GQ.multOf(q)}</span>` : ''} · Team ${esc(team(myTeam).name)}</p>
      ${q.img ? `<img class="qimg" src="${q.img}" alt="">` : ''}
      <div class="q">${esc(q.text).replace(/\n/g, '<br>')}</div>
      ${GQ.isNum(q) ? numForm(q, canAnswer) : `<div class="opts">${q.opts.map((o, j) => o ? `<button class="opt" data-j="${j}" ${canAnswer ? '' : 'disabled'}>${esc(o)}</button>` : '').join('')}</div>`}
      <div id="res">${note ? `<div class="result">${note}</div>` : ''}<button class="btn close" id="closeBtn">Back to the questions</button></div>`;
    $('closeBtn').onclick = close;
    $('sheet').querySelectorAll('.opt').forEach(b => b.onclick = () => choose(sheetQ, +b.dataset.j, b));
    if ($('numform')) $('numform').onsubmit = ev => {
      ev.preventDefault();
      const v = GQ.parseNum($('numIn').value);
      if (!isFinite(v)) return toast('Type a number, e.g. 35.5 or 6.02 × 10^23');
      choose(sheetQ, v, $('numIn'));
    };
  }
  // A box to type a number answer in
  function numForm(q, can) {
    return `<form class="numform" id="numform" autocomplete="off">
        <input id="numIn" inputmode="decimal" enterkeyhint="done" placeholder="Your answer" aria-label="Your answer" ${can ? '' : 'disabled'}>${q.unit ? `<span class="unit">${esc(q.unit)}</span>` : ''}
        <button class="btn primary" ${can ? '' : 'disabled'}>Submit</button></form>
      <p class="hint">Type a number. For standard form, type e.g. 6.02e23 or 6.02 × 10^23.</p>`;
  }
  function close() { if (busy) return; sheetQ = null; $('sheetBg').classList.add('hidden'); draw(); }
  $('sheetBg').addEventListener('click', ev => { if (ev.target === $('sheetBg')) close(); });

  async function choose(i, j, btn) {
    if (busy) return;
    if (!isOpen()) { toast('The game isn\'t running right now.'); return refreshSheet(true); }
    busy = true; $('sheet').dataset.answered = '1';
    const btns = [...$('sheet').querySelectorAll('.opt, #numform input, #numform button')];
    btns.forEach(b => b.disabled = true);
    const res = $('res');
    res.innerHTML = '<div class="result"><h3>Checking…</h3></div>';
    let msg, ok = false;
    try {
      const r = await B.answer(code, i, j);
      if (r === 'right') {
        ok = true; btn.classList.add('right');
        const a = await B.award(code, i, myTeam);
        msg = a === 'scored' ? `<h3>✅ Correct! +1 for Team ${esc(team(myTeam).name)} on this question.</h3>`
          : a === 'already' ? `<h3>✅ Correct!</h3><p>You'd already answered this one, so it doesn't count twice.</p>`
          : `<h3>✅ Correct!</h3><p>But your point couldn't be recorded. Please tell the lecturer.</p>`;
      } else if (r === 'closed') {
        msg = '<h3>The game isn\'t running right now.</h3><p>Answers only count while the timer is running.</p>';
        delete $('sheet').dataset.answered;
      } else if (r === 'notjoined') {
        msg = '<h3>You weren\'t in this game yet.</h3><p>You\'ve been added to a team now. Please try that answer again.</p>';
        delete $('sheet').dataset.answered;
        myTeam = null; join();
      } else {
        btn.classList.add('wrong');
        coolUntil = Date.now() + S.wrongCooldownSeconds * 1000;
        msg = `<h3>❌ Not quite.</h3>${GQ.fbHtml(quiz && quiz.qs[i])}<p>Try another question, or come back to this one in ${S.wrongCooldownSeconds} seconds.</p>`;
      }
    } catch (e) {
      msg = '<h3>That couldn\'t be checked.</h3><p>Check your connection and try again.</p>';
      delete $('sheet').dataset.answered;
    }
    busy = false;
    res.innerHTML = `<div class="result">${msg}</div><button class="btn primary close" id="closeBtn">Back to the questions</button>`;
    $('closeBtn').onclick = close;
    if (ok) draw();
  }
})();
