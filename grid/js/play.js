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
    if (part === 'pts' || part === 'mine') { draw(); if (sheetQ != null) refreshSheet(); }
  });

  async function join() {
    joining = true;
    try {
      myTeam = await B.join(code);
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
    const s = score(state.pts); $('scoreA').textContent = s.a; $('scoreB').textContent = s.b;
  }

  function renderMeta() {
    const m = state.meta; if (!m || !myTeam) return;
    if (m.status === 'lobby') setStatus('The game starts soon. You can look at the questions now; answers open when the timer starts.');
    else if (m.status === 'ended') {
      const s = score(state.pts), w = s.a === s.b ? null : (s.a > s.b ? 'a' : 'b');
      setStatus(w ? `<b>Game over.</b> Team ${esc(team(w).name)} wins, ${Math.max(s.a, s.b)} to ${Math.min(s.a, s.b)}! ${w === myTeam ? '🎉' : 'Better luck next time.'}` : '<b>Game over.</b> It\'s a draw!');
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
    const mates = GQ.counts(state.pts[sheetQ])[myTeam];
    const cooling = Date.now() < coolUntil;
    const canAnswer = isOpen() && !got && !cooling;
    const note = got ? '✅ You got this one right. Try another!'
      : !state.meta || state.meta.status === 'lobby' ? 'Answers open when the game starts.'
      : state.meta.status === 'ended' || !isOpen() ? 'The game is over.'
      : cooling ? 'Wait for the timer after a wrong answer, then try again.'
      : mates ? `${mates} of Team ${esc(team(myTeam).name)} ${mates === 1 ? 'has' : 'have'} got this right so far. Every correct answer adds another point.` : '';
    delete $('sheet').dataset.answered;
    $('sheet').innerHTML = `
      <p class="qhead"><b>Question ${qNumber(sheetQ)}</b> · Team ${esc(team(myTeam).name)}</p>
      ${q.img ? `<img class="qimg" src="${q.img}" alt="">` : ''}
      <div class="q">${esc(q.text).replace(/\n/g, '<br>')}</div>
      <div class="opts">${q.opts.map((o, j) => o ? `<button class="opt" data-j="${j}" ${canAnswer ? '' : 'disabled'}>${esc(o)}</button>` : '').join('')}</div>
      <div id="res">${note ? `<div class="result">${note}</div>` : ''}<button class="btn close" id="closeBtn">Back to the questions</button></div>`;
    $('closeBtn').onclick = close;
    $('sheet').querySelectorAll('.opt').forEach(b => b.onclick = () => choose(sheetQ, +b.dataset.j, b));
  }
  function close() { if (busy) return; sheetQ = null; $('sheetBg').classList.add('hidden'); draw(); }
  $('sheetBg').addEventListener('click', ev => { if (ev.target === $('sheetBg')) close(); });

  async function choose(i, j, btn) {
    if (busy) return;
    if (!isOpen()) { toast('The game isn\'t running right now.'); return refreshSheet(true); }
    busy = true; $('sheet').dataset.answered = '1';
    const btns = [...$('sheet').querySelectorAll('.opt')];
    btns.forEach(b => b.disabled = true);
    const res = $('res');
    res.innerHTML = '<div class="result"><h3>Checking…</h3></div>';
    let msg, ok = false;
    try {
      const r = await B.answer(code, i, j);
      if (r === 'right') {
        ok = true; btn.classList.add('right');
        const a = await B.award(code, i, myTeam);
        msg = a === 'scored' ? `<h3>✅ Correct! +1 point for Team ${esc(team(myTeam).name)}.</h3><p>Try another question, and get your teammates onto this one too.</p>`
          : `<h3>✅ Correct!</h3><p>You'd already scored on this one, so no extra point.</p>`;
      } else {
        btn.classList.add('wrong');
        coolUntil = Date.now() + S.wrongCooldownSeconds * 1000;
        msg = `<h3>❌ Not quite.</h3><p>Try another question, or come back to this one in ${S.wrongCooldownSeconds} seconds.</p>`;
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
