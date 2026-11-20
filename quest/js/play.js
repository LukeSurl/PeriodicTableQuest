// Periodic Table Quest: the phone page
(async function () {
  const { $, esc, team, fmtTime, theme, toast, withDemo, safe } = GQ;
  const S = PTQ.S, T = PQ_TABLE;
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

  const cells = T.build($('table'), tap);
  let state = { meta: undefined, cells: {}, players: {} }, quiz = null, quizFor = null, unQuiz = null;
  let myTeam = null, joining = false, sheetOpen = false, busy = false, coolUntil = 0, first = true;
  const seenKey = 'ptq-seen-' + code;
  const seen = new Set(safe(() => JSON.parse(sessionStorage.getItem(seenKey)) || [], []));
  const saveSeen = () => safe(() => sessionStorage.setItem(seenKey, JSON.stringify([...seen].slice(-300))));
  B.onConnection(ok => { if (!ok && myTeam) toast('Connection lost, reconnecting…'); });

  B.watchRun(code, (st, part) => {
    state = st;
    if (part === 'meta') {
      if (st.meta === null) return setStatus(`No game found with code <b>${esc(code)}</b>. Check the code on the screen. <p><a class="btn" href="${withDemo('play.html')}">Enter a different code</a></p>`);
      if (!st.meta) return;
      if (quizFor !== st.meta.quiz) {
        quizFor = st.meta.quiz; if (unQuiz) unQuiz();
        unQuiz = B.watchQuiz(quizFor, q => { quiz = q; PTQ.markPlayable(cells, q); });
      }
      if (!myTeam && !joining) join();
      renderMeta();
    }
    if (part === 'players' && myTeam && !joining && st.players && !st.players[B.uid]) { myTeam = null; join(); }
    if (part === 'cells') {
      T.paint(cells, st.cells || {}, !first, myTeam); first = false;
      const s = T.score(st.cells); $('scoreA').textContent = s.a; $('scoreB').textContent = s.b;
      const mine = Object.values(st.cells || {}).filter(c => c.by === B.uid).length;
      $('mine').textContent = mine ? `You are holding ${mine} element${mine === 1 ? '' : 's'} for your team.` : '';
      if (state.meta && state.meta.status === 'ended') renderMeta();
    }
  });

  async function join() {
    joining = true;
    try {
      myTeam = await B.join(code);
      joining = false;
      $('bar').className = 'teambar t' + myTeam;
      $('you').textContent = `You're on Team ${team(myTeam).name}`;
      T.paint(cells, state.cells || {}, false, myTeam);
      renderMeta();
    } catch (e) {
      joining = false;
      setStatus('Could not join the game. ' + esc(e.message || '') + ' <p><button class="btn" onclick="location.reload()">Try again</button></p>');
    }
  }

  function renderMeta() {
    const m = state.meta; if (!m || !myTeam) return;
    if (m.status === 'lobby') setStatus('The game starts soon. Try a practice question while you wait: tap any element.');
    else if (m.status === 'ended') {
      const r = PTQ.resultText(state.cells);
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
  const shieldLeft = c => Math.ceil(((c.at || 0) + ((state.meta && state.meta.shield) || 0) - B.now()) / 1000);

  // ---------- Tapping an element ----------
  function tap(z) {
    if (sheetOpen || busy || !myTeam || !quiz || !state.meta) return;
    const e = GQ.ELS[z - 1], c = state.cells[z], m = state.meta;
    if (m.status === 'ended' || (m.status === 'open' && !isOpen())) return toast('The game is over!');
    if (Date.now() < coolUntil) return toast('Wait for the timer, then try again.');
    if (!GQ.poolFor(quiz, z, false).length) return toast(`There are no questions for ${esc(e.n.toLowerCase())}. Try another element.`);
    const practice = m.status === 'lobby';
    if (!practice && c && c.t === myTeam) return toast(`${esc(e.n)} is already yours.`);
    if (!practice && c && shieldLeft(c) > 0) return toast(`${esc(e.n)} was just claimed by Team ${esc(team(c.t).name)}. It can be stolen in ${shieldLeft(c)}s.`);
    ask(z, { practice, steal: !practice && !!c && c.t !== myTeam });
  }

  function chooseQuestion(z, steal) {
    const pool = GQ.poolFor(quiz, z, steal);
    const fresh = pool.filter(q => !seen.has(q.i));
    const list = fresh.length ? fresh : pool;
    return list[Math.floor(Math.random() * list.length)];
  }

  function ask(z, { practice, steal }) {
    const e = GQ.ELS[z - 1], q = chooseQuestion(z, steal);
    if (!q) return toast('No question available for this element. Try another.');
    seen.add(q.i); saveSeen();
    const owner = state.cells[z] && state.cells[z].t;
    const head = practice ? 'Practice question' : steal ? `<span class="stealhead">Steal: take it from Team ${esc(team(owner).name)}</span>` : `Claim for Team ${esc(team(myTeam).name)}`;
    // Show the options in a random order, but remember their real positions
    const order = q.opts.map((o, j) => j).filter(j => q.opts[j]).sort(() => Math.random() - 0.5);
    const body = GQ.isNum(q)
      ? `<form class="numform" id="numform" autocomplete="off">
           <input id="numIn" inputmode="decimal" enterkeyhint="done" placeholder="Your answer" aria-label="Your answer">${q.unit ? `<span class="unit">${esc(q.unit)}</span>` : ''}
           <button class="btn primary">Submit</button></form>
         <p class="hint">Type a number. For standard form, type e.g. 6.02e23 or 6.02 × 10^23. Use your phone's calculator if you need it.</p>`
      : `<div class="opts">${order.map(j => `<button class="opt" data-j="${j}">${esc(q.opts[j])}</button>`).join('')}</div>`;
    $('sheet').innerHTML = `
      <div class="el"><div class="big"><small>${e.z}</small><b>${e.s}</b></div>
        <div class="what">${head}<strong>${esc(e.n)}</strong></div></div>
      ${q.img ? `<img class="qimg" src="${q.img}" alt="">` : ''}
      <div class="q">${esc(q.text).replace(/\n/g, '<br>')}</div>
      ${body}
      <div id="res"><button class="btn close" id="closeBtn">Cancel</button></div>`;
    sheetOpen = true;
    $('sheetBg').classList.remove('hidden');
    $('closeBtn').onclick = close;
    if (GQ.isNum(q)) {
      $('numform').onsubmit = ev => {
        ev.preventDefault();
        const v = GQ.parseNum($('numIn').value);
        if (!isFinite(v)) return toast('Type a number, e.g. 35.5 or 6.02 × 10^23');
        submit(z, q, v, $('numIn'), practice);
      };
      setTimeout(() => $('numIn') && $('numIn').focus(), 50);
    } else $('sheet').querySelectorAll('.opt').forEach(b => b.onclick = () => submit(z, q, +b.dataset.j, b, practice));
  }

  async function submit(z, q, a, el, practice) {
    if (busy) return;
    busy = true;
    const e = GQ.ELS[z - 1];
    $('sheet').querySelectorAll('.opt, #numform input, #numform button').forEach(b => b.disabled = true);
    $('res').innerHTML = '<div class="result"><h3>Checking…</h3></div>';
    let msg;
    try {
      const r = await B.answerEl(code, z, q.i, a);
      if (r === 'right') {
        el.classList.add('right');
        if (practice) msg = '<h3>✅ Correct!</h3><p>That was practice: the game hasn\'t started yet.</p>';
        else {
          const c = await B.claim(code, z, myTeam);
          const now = state.cells[z];
          msg = c === 'ok' ? `<h3>✅ Correct! ${esc(e.n)} is now Team ${esc(team(myTeam).name)}'s.</h3>`
            : c === 'yours' ? `<h3>✅ Correct!</h3><p>A teammate got there first, so ${esc(e.n)} is already yours.</p>`
            : c === 'shielded' ? `<h3>✅ Correct!</h3><p>But Team ${esc(team(now ? now.t : (myTeam === 'a' ? 'b' : 'a')).name)} grabbed ${esc(e.n)} a moment before you.</p>`
            : c === 'ended' ? '<h3>✅ Correct, but time is up!</h3>'
            : c === 'lobby' ? '<h3>✅ Correct!</h3><p>The game hasn\'t started yet, so nothing was claimed.</p>'
            : '<h3>✅ Correct!</h3><p>But the claim couldn\'t be recorded. Please tell your lecturer.</p>';
        }
      } else if (r === 'closed') msg = '<h3>The game isn\'t running right now.</h3>';
      else if (r === 'notjoined') { msg = '<h3>You weren\'t in this game yet.</h3><p>You\'ve been added to a team now. Please try again.</p>'; myTeam = null; join(); }
      else {
        el.classList.add('wrong');
        if (!practice) coolUntil = Date.now() + S.wrongCooldownSeconds * 1000;
        msg = `<h3>❌ Not quite.</h3><p>${practice ? 'Have another go: tap any element.' : `Try another element in ${S.wrongCooldownSeconds} seconds.`}</p>`;
      }
    } catch (err) {
      msg = '<h3>That couldn\'t be checked.</h3><p>Check your connection and try again.</p>';
    }
    busy = false;
    $('res').innerHTML = `<div class="result">${msg}</div><button class="btn primary close" id="closeBtn">Back to the table</button>`;
    $('closeBtn').onclick = close;
  }

  function close() { if (busy) return; sheetOpen = false; $('sheetBg').classList.add('hidden'); }
  $('sheetBg').addEventListener('click', ev => { if (ev.target === $('sheetBg')) close(); });

  function randomPick(filter, none) {
    if (!myTeam || !quiz) return;
    const zs = GQ.ELS.map(e => e.z).filter(z => GQ.poolFor(quiz, z, false).length && filter(z));
    if (!zs.length) return toast(none);
    tap(zs[Math.floor(Math.random() * zs.length)]);
  }
  $('rndFree').onclick = () => randomPick(z => !state.cells[z], 'No free elements left. Try a steal!');
  $('rndSteal').onclick = () => randomPick(z => state.cells[z] && state.cells[z].t !== myTeam && shieldLeft(state.cells[z]) <= 0, 'Nothing to steal right now.');
})();
