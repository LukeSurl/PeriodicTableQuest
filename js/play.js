// Phone page
(async function () {
  const CFG = window.PQ_CONFIG, T = window.PQ_TABLE, Q = window.PQ_QUIZ;
  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
  const TEAM = t => CFG.teams[t];
  const params = new URLSearchParams(location.search);
  T.applyTheme();
  $('jtitle').textContent = CFG.title;

  const code = (params.get('g') || '').trim().toUpperCase();
  if (!code) {
    $('bar').classList.add('hidden');
    $('joinform').classList.remove('hidden');
    $('joinform').onsubmit = ev => {
      ev.preventDefault();
      const p = new URLSearchParams(location.search);
      p.set('g', $('codeIn').value.trim().toUpperCase());
      location.search = p.toString();
    };
    return;
  }

  $('nameA').textContent = TEAM('a').name; $('nameB').textContent = TEAM('b').name;
  $('game').classList.remove('hidden');
  const setStatus = html => { $('status').innerHTML = html; $('status').classList.toggle('hidden', !html); };
  setStatus('Connecting…');

  let B;
  try { B = await PQ_BACKEND.create(); }
  catch (e) { setStatus('Could not connect. Check your internet connection and reload.'); return; }

  const map = T.build($('table'), tap);
  let joining = false;
  let state = { meta: undefined, cells: {} }, team = null, sheetOpen = false, coolUntil = 0, first = true;
  const seenKey = 'pq-seen-' + code;
  const seen = new Set(safe(() => JSON.parse(sessionStorage.getItem(seenKey)) || [], []));
  const saveSeen = () => safe(() => sessionStorage.setItem(seenKey, JSON.stringify([...seen].slice(-200))));

  B.onConnection(ok => { if (!ok && team) toast('Connection lost, reconnecting…'); });

  B.watch(code, ['meta', 'cells'], async (st, part) => {
    state = st;
    if (part === 'meta') {
      if (st.meta === null) { setStatus(`No game found with code <b>${code}</b>. Check the code on the screen. <p><a class="btn" href="play.html${B.mode === 'demo' ? '?demo=1' : ''}">Enter a different code</a></p>`); return; }
      if (!team && !joining) join();
      renderMeta();
    }
    if (part === 'cells') {
      T.paint(map, st.cells || {}, !first, team); first = false;
      const s = T.score(st.cells); $('scoreA').textContent = s.a; $('scoreB').textContent = s.b;
      const mine = Object.values(st.cells || {}).filter(c => c.by === B.uid).length;
      $('mine').textContent = mine ? `You are holding ${mine} element${mine === 1 ? '' : 's'} for your team.` : '';
    }
  });

  async function join() {
    joining = true;
    try {
      team = await B.join(code);
      $('bar').className = 'teambar t' + team;
      $('you').textContent = `You're on Team ${TEAM(team).name}`;
      T.paint(map, state.cells || {}, false, team);
      renderMeta();
    } catch (e) {
      joining = false;
      setStatus('Could not join the game. ' + (e.message || '') + ' <p><button class="btn" onclick="location.reload()">Try again</button></p>');
    }
  }

  function renderMeta() {
    const m = state.meta; if (!m || !team) return;
    if (m.status === 'lobby') setStatus('The game starts soon. Try a practice question while you wait: tap any element.');
    else if (m.status === 'ended') {
      const s = T.score(state.cells);
      const w = s.a === s.b ? null : (s.a > s.b ? 'a' : 'b');
      setStatus(w ? `<b>Game over.</b> Team ${TEAM(w).name} wins, ${Math.max(s.a, s.b)} to ${Math.min(s.a, s.b)}! ${w === team ? '🎉' : 'Better luck next time.'}` : `<b>Game over.</b> It's a draw!`);
    } else setStatus('');
  }

  setInterval(() => {
    const m = state.meta; if (!m) return;
    if (m.status === 'open') $('clock').textContent = T.fmtTime(m.endsAt - B.now());
    else $('clock').textContent = m.status === 'ended' ? 'Game over' : 'Starting soon';
    const c = coolUntil - Date.now();
    $('cool').classList.toggle('hidden', c <= 0);
    if (c > 0) $('cool').textContent = `Think it over… ${Math.ceil(c / 1000)}s`;
  }, 250);

  let toastT;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.innerHTML = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
  }

  const check = z => PQ_BACKEND.canClaim({ ...state, players: { [B.uid]: { t: team } } }, B.uid, z, B.now());

  function tap(z) {
    if (sheetOpen || !team) return;
    if (Date.now() < coolUntil) return toast('Wait for the timer, then try again.');
    const e = Q.BY_Z[z], r = check(z);
    if (!r.ok) {
      const owner = state.cells[z] && TEAM(state.cells[z].t).name;
      const msg = {
        notstarted: null,
        ended: 'The game is over!',
        yours: `${e.n} is already yours.`,
        taken: `${e.n} belongs to Team ${owner}.`,
        shielded: `${e.n} was just claimed by Team ${owner}. It can be stolen in ${r.wait}s.`,
        nogame: 'Game not found.', noteam: 'Still joining…'
      }[r.reason];
      if (r.reason !== 'notstarted') return toast(msg || 'Not available.');
      return ask(z, { practice: true });
    }
    ask(z, { steal: r.steal });
  }

  function ask(z, { practice, steal }) {
    const e = Q.BY_Z[z];
    const q = (steal && Q.getStealQuestion(z, seen)) || Q.getQuestion(z, seen);
    seen.add(q.id); saveSeen();
    const owner = state.cells[z] && state.cells[z].t;
    const head = practice ? `Practice question` : steal ? `Steal challenge: take it from Team ${TEAM(owner).name}` : `Claim for Team ${TEAM(team).name}`;
    const note = q.about ? `<p class="hint">There's no suitable isotope data for ${e.n.toLowerCase()}, so this challenge is about ${q.about.toLowerCase()}.</p>` : '';
    const body = q.numeric
      ? `<form class="numform" id="numform" autocomplete="off">
           <input id="numIn" inputmode="decimal" enterkeyhint="done" placeholder="Your answer" aria-label="Your answer">${q.unit ? `<span class="unit">${q.unit}</span>` : ''}
           <button class="btn primary">Submit</button>
         </form>
         <p class="hint">Use your phone's calculator if you need it.</p>`
      : `<div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}">${o.html}</button>`).join('')}</div>`;
    $('sheet').innerHTML = `
      <div class="el"><div class="big"><small>${e.z}</small><b>${e.s}</b></div>
        <div class="what">${head}<strong>${e.n}</strong></div></div>
      ${note}<div class="q">${q.q}</div>
      ${body}
      <div id="res"><button class="btn close" id="cancelBtn">Cancel</button></div>`;
    sheetOpen = true;
    $('sheetBg').classList.remove('hidden');
    $('cancelBtn').onclick = closeSheet;
    if (q.numeric) {
      $('numform').onsubmit = ev => {
        ev.preventDefault();
        const ok = Q.checkNumeric(q, $('numIn').value);
        if (ok === null) return toast('Type a number, e.g. 35.48');
        $('numIn').disabled = true; $('numform').querySelector('button').disabled = true;
        $('numIn').classList.add(ok ? 'right' : 'wrong');
        const shown = q.num.toFixed(q.dp) + q.unit;
        answer(z, q, ok, practice, ok ? '' : `<p><b>Answer: ${shown}</b></p>`);
      };
      setTimeout(() => $('numIn') && $('numIn').focus(), 50);
    } else {
      $('sheet').querySelectorAll('.opt').forEach(btn => btn.onclick = () => {
        const i = +btn.dataset.i, btns = [...$('sheet').querySelectorAll('.opt')];
        btns.forEach((b, k) => { b.disabled = true; if (q.options[k].correct) b.classList.add('right'); });
        if (!q.options[i].correct) btns[i].classList.add('wrong');
        answer(z, q, q.options[i].correct, practice, '');
      });
    }
  }

  async function answer(z, q, right, practice, extra) {
    const e = Q.BY_Z[z];
    let title;
    if (!right) {
      title = '❌ Not quite';
      if (!practice) coolUntil = Date.now() + CFG.wrongCooldownSeconds * 1000;
    } else if (practice) {
      title = '✅ Correct! (practice: the game hasn\'t started yet)';
    } else {
      title = 'Saving…';
    }
    const res = $('res');
    res.innerHTML = `<div class="result"><h3 id="rt">${title}</h3>${extra}${q.explain}</div><button class="btn primary close" id="closeBtn">Back to the table</button>`;
    $('closeBtn').onclick = closeSheet;
    if (right && !practice) {
      const r = await B.claim(code, z, team).catch(() => ({ ok: false, reason: 'error' }));
      const other = r.by && r.by !== team ? TEAM(r.by).name : null;
      $('rt').textContent = r.ok ? `✅ Correct! ${e.n} is now Team ${TEAM(team).name}'s.`
        : r.reason === 'yours' ? `✅ Correct! A teammate got there first, so ${e.n} is already yours.`
        : r.reason === 'ended' ? '✅ Correct, but time is up!'
        : (r.reason === 'shielded' || r.reason === 'taken') ? `✅ Correct, but Team ${other} grabbed ${e.n} a moment before you.`
        : '✅ Correct, but that couldn\'t be saved. Check your connection.';
    }
  }

  function closeSheet() { sheetOpen = false; $('sheetBg').classList.add('hidden'); }
  $('sheetBg').addEventListener('click', ev => { if (ev.target === $('sheetBg')) closeSheet(); });

  function randomPick(filter, none) {
    if (!team) return;
    const zs = window.PQ_ELEMENTS.map(e => e.z).filter(filter);
    if (!zs.length) return toast(none);
    tap(zs[Math.floor(Math.random() * zs.length)]);
  }
  $('rndFree').onclick = () => randomPick(z => !state.cells[z], 'No free elements left. Try a steal!');
  $('rndSteal').onclick = () => {
    if (state.meta && !state.meta.steal) return toast('Stealing is switched off for this game.');
    randomPick(z => state.cells[z] && state.cells[z].t !== team && check(z).ok, 'Nothing to steal right now.');
  };
})();
