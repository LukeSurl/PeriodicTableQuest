// Pre-Lecture Quizzes: a record of how the class did, kept after each game.
//
// During a game each phone notes its own attempts at a question (runs/<code>/att/<q>/<uid>):
//   f  its first answer: { a: option position or typed number, ok: right? }
//   r  true once it has answered the question correctly
//   w  { <option>: true } the wrong options it has chosen (multiple choice)
// Practice answers before the game starts are not noted.
//
// When the game ends (and before Clear scores or New game), the projector page adds these up
// into a summary with no player IDs in it, and keeps it at results/<quiz>/<code>/<started>,
// where only the quiz's editors can read it. Questions are numbered as in the editor, whichever
// game presented them. The editor shows the summaries under "Results from past games".
(function () {
  const { esc, fmt, fmtNum, isNum, playable } = GQ;
  const ent = v => (v ? Object.entries(v).filter(([, x]) => x != null) : []);
  const pct = (n, d) => (d ? Math.round(100 * n / d) : 0);

  // ---------- Projector pages ----------
  // The summary of one game: { at, started, type, title, players, qs: { i: {...} } }
  function build(quiz, att, players, meta) {
    const qs = {};
    playable(quiz).forEach(q => {
      const recs = ent(att && att[q.i]).map(([, x]) => x).filter(x => x && (x.f || x.r));
      const s = { text: String(q.text || '').slice(0, 1000), kind: isNum(q) ? 'num' : 'mc', n: recs.length, f1: 0, r: 0 };
      if (s.kind === 'num') { s.unit = q.unit || ''; s.nv = []; }
      else { s.opts = (q.opts || []).map(o => String(o || '').slice(0, 300)); s.fa = {}; s.wa = {}; }
      recs.forEach(x => {
        const f = x.f;
        if (f && f.ok) s.f1++;
        if (x.r || (f && f.ok)) s.r++;
        if (s.kind === 'num') { if (f && !f.ok && isFinite(f.a) && s.nv.length < 50) s.nv.push(+f.a); return; }
        if (f && isFinite(f.a)) {
          s.fa[f.a] = (s.fa[f.a] || 0) + 1;
          if (f.ok) s.ok = +f.a;   // the right option, as the phones found it
        }
        ent(x.w).forEach(([j]) => { if (+j !== s.ok) s.wa[j] = (s.wa[j] || 0) + 1; });
        if (f && !f.ok && isFinite(f.a) && !(x.w && x.w[f.a])) s.wa[f.a] = (s.wa[f.a] || 0) + 1;
      });
      if (s.kind === 'mc' && s.ok != null) delete s.wa[s.ok];
      qs[q.i] = s;
    });
    return { at: Date.now(), started: meta.started || meta.created || Date.now(), type: (quiz && quiz.type) || 'grid',
      title: String((quiz && quiz.title) || '').slice(0, 120), players: Object.keys(players || {}).length, qs };
  }

  // Add up and keep this game's results. Nothing is kept if nobody answered anything.
  async function save(B, code, quizId, quiz, state) {
    const m = state && state.meta;
    if (!B || !code || !quiz || !m) return false;
    try {
      const att = await B.getAttempts(code);
      if (!att || !Object.keys(att).length) return false;
      const sum = build(quiz, att, state.players, m);
      await B.saveResult(quizId, code, String(Math.round(sum.started)), sum);
      return true;
    } catch (e) {
      console.warn('Couldn\'t keep the results of this game. Has the database been given the latest rules (database.rules.json)?', e);
      return false;
    }
  }

  // Call on every change to the game's meta: keeps the results when the game ends.
  // (Not when the page opens on a game that had already ended.)
  const lastStatus = {};
  function track(B, code, quizId, quiz, state) {
    const m = state && state.meta; if (!m || !code) return;
    const before = lastStatus[code];
    lastStatus[code] = m.status;
    if (m.status === 'ended' && before && before !== 'ended') save(B, code, quizId, quiz, state);
  }
  // Starting from the lobby marks the start of a new set of results
  const startPatch = m => (!m || m.status === 'lobby' || !m.started ? { started: Date.now() } : {});

  // ---------- The editor ----------
  const GAME = { grid: 'Quiz Grid', ptq: 'Periodic Table Quest', pachinko: 'Pachinko' };
  const when = t => new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const letter = j => String.fromCharCode(65 + +j);
  const qList = sum => ent(sum.qs).map(([i, s]) => ({ i: +i, ...s })).sort((a, b) => a.i - b.i);
  // The right option: as the phones found it, or failing that the quiz's answer now
  const okOf = (s, answers) => (s.ok != null ? +s.ok : typeof (answers || [])[s.i] === 'number' ? answers[s.i] : null);
  function overall(sum) {
    let n = 0, f1 = 0;
    qList(sum).forEach(s => { n += s.n || 0; f1 += s.f1 || 0; });
    return { n, f1 };
  }

  function bar(n, d, cls) {
    const p = pct(n, d);
    return `<span class="rval"><span class="rbar ${cls || ''}" title="${n} of ${d}"><span style="width:${p}%"></span></span><b>${d ? p + '%' : '–'}</b> <small class="muted">(${n} of ${d})</small></span>`;
  }

  function questionHtml(s, answers) {
    const ok = okOf(s, answers);
    let detail = '';
    if (s.kind === 'num') {
      const tally = {};
      (s.nv || []).forEach(v => { const k = fmtNum(v); tally[k] = (tally[k] || 0) + 1; });
      const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 6);
      detail = top.length ? `<p class="small">Most common wrong first answers: ${top.map(([v, c]) => `<b>${esc(v)}</b>${s.unit ? ' ' + fmt(s.unit) : ''} (${c})`).join(', ')}</p>` : '';
    } else {
      const firsts = ent(s.fa).reduce((t, [, c]) => t + c, 0);
      detail = `<table class="ropts"><thead><tr><th></th><th>Answer</th><th>First choice</th><th>Chosen wrongly at any point</th></tr></thead><tbody>${
        (s.opts || []).map((o, j) => (o ? `<tr class="${j === ok ? 'right' : ''}"><td>${letter(j)}</td><td>${fmt(o)}${j === ok ? ' <span class="rtick" title="Correct answer">✓</span>' : ''}</td>
          <td>${bar((s.fa || {})[j] || 0, firsts, j === ok ? 'ok' : 'no')}</td><td>${j === ok ? '' : (s.wa || {})[j] || 0}</td></tr>` : '')).join('')}</tbody></table>`;
    }
    return `<div class="rq"><p class="rqhead"><b>Question ${s.i + 1}</b> <span class="rqtext">${fmt(s.text)}</span></p>
      ${s.n ? `<div class="rstats"><span>Right first time</span>${bar(s.f1, s.n, 'ok')}<span>Right in the end</span>${bar(s.r, s.n, 'ok2')}</div>${detail}`
        : '<p class="small muted">Nobody answered this question.</p>'}</div>`;
  }

  function csv(sum, answers) {
    const qs = qList(sum), maxO = Math.max(0, ...qs.map(s => (s.opts || []).length));
    const head = ['Question number', 'Question', 'Type', 'Students who answered', 'Right first time', 'Right first time (%)', 'Right in the end', 'Right in the end (%)', 'Correct answer'];
    for (let j = 0; j < maxO; j++) head.push(`Answer ${letter(j)}`, `Answer ${letter(j)}: first choice`, `Answer ${letter(j)}: chosen wrongly at any point`);
    head.push('Wrong first answers (number questions)');
    const rows = qs.map(s => {
      const ok = okOf(s, answers);
      const row = [s.i + 1, s.text, s.kind === 'num' ? 'Number' : 'Multiple choice', s.n, s.f1, pct(s.f1, s.n), s.r, pct(s.r, s.n), s.kind === 'num' ? '' : ok == null ? '' : letter(ok)];
      for (let j = 0; j < maxO; j++) {
        const o = (s.opts || [])[j];
        row.push(o || '', o ? (s.fa || {})[j] || 0 : '', o && j !== ok ? (s.wa || {})[j] || 0 : '');
      }
      row.push(s.kind === 'num' ? (s.nv || []).join('; ') : '');
      return row;
    });
    const cell = v => { const t = String(v == null ? '' : v); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    return '﻿' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
  }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // Fill box with the quiz's past games, newest first. answers: the quiz's answers now.
  async function show(box, B, quizId, answers) {
    let list;
    try { list = await B.getResults(quizId); }
    catch (e) { box.innerHTML = `<p class="small muted">Results couldn't be loaded. ${esc(e.message || '')}</p>`; return; }
    if (!list.length) { box.innerHTML = '<p class="small muted">No results yet. They appear here after each game ends.</p>'; return 0; }
    list.sort((a, b) => b.sum.started - a.sum.started);
    box.innerHTML = list.map((g, k) => {
      const s = g.sum, o = overall(s);
      return `<details class="rgame" data-k="${k}"><summary><b>${esc(when(s.started))}</b> · ${esc(GAME[s.type] || s.type)} · ${s.players} player${s.players === 1 ? '' : 's'} · ${o.n ? `${pct(o.f1, o.n)}% right first time` : 'no answers'}</summary>
        <div class="row rgacts"><span class="small muted">Percentages are of the students who answered each question.</span><span class="spacer"></span>
          <button class="btn" data-csv="${k}">Download as CSV</button><button class="btn warn" data-del="${k}">Delete</button></div>
        ${qList(s).map(q => questionHtml(q, answers)).join('')}</details>`;
    }).join('');
    box.querySelectorAll('[data-csv]').forEach(b => b.onclick = () => {
      const g = list[+b.dataset.csv], d = new Date(g.sum.started);
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const title = (g.sum.title || 'quiz').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'quiz';
      download(`${title}-results-${stamp}.csv`, csv(g.sum, answers));
    });
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Click again to delete'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'Delete'; }, 3000); return; }
      const g = list[+b.dataset.del];
      b.disabled = true;
      try { await B.deleteResult(quizId, g.code, g.key); GQ.toast('Results deleted'); show(box, B, quizId, answers); }
      catch (e) { b.disabled = false; GQ.toast('Couldn\'t delete those results. Check your connection.'); }
    });
    return list.length;
  }

  window.GQ_RESULTS = { build, save, track, startPatch, show, csv };
})();
