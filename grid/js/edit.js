// Quiz Grid and Periodic Table Quest: the question editor (one page for both kinds of quiz)
(async function () {
  const { $, esc, store, withDemo, isDemo, theme, toast, parseNum, fmtNum, parseEls, elSym, elsOf } = GQ;
  theme();
  const KEY = isDemo() ? 'gq-mine-demo' : 'gq-mine';
  const [id, k] = location.hash.slice(1).split('.');
  const problem = html => { $('problem').innerHTML = html; $('problem').classList.remove('hidden'); $('saveState').textContent = ''; };
  const home = withDemo('../plq/');
  if (!id || !k) return problem(`This page needs a quiz's edit link. <a href="${home}">Go to the start page</a> to make a quiz.`);

  let B;
  try { B = await GQ_BACKEND.create(); }
  catch (e) { return problem(`Couldn't connect. Check your internet connection and reload. <small>(${esc(e.message)})</small>`); }

  let quiz, answers;
  try { ({ quiz, answers } = await B.openQuiz(id, k)); }
  catch (e) {
    return problem(e.message === 'badlink'
      ? `This edit link doesn't match a quiz. Check you copied all of it. <a href="${home}">Start page</a>`
      : `Couldn't open the quiz. Check your internet connection and reload. <small>(${esc(e.message)})</small>`);
  }

  // Settings for this kind of quiz
  const S = GQ_SETTINGS.forType(quiz.type), ptq = S.type === 'ptq';
  document.body.classList.toggle('ptq', ptq);
  $('home').textContent = S.title; $('home').href = ptq ? home : withDemo('index.html');
  document.title = `Edit: ${S.title}`;
  if (ptq) {
    $('qTitle').placeholder = 'e.g. Atoms 2: electromagnetic radiation';
    $('presentHelp').innerHTML = 'Open the <b>present link</b> on the lectern PC. It shows the periodic table and a QR code for students. Anyone with it can run the quiz but not change it.';
    $('qsHelp').textContent = 'Each question needs its text and either at least two answers with the right one ticked, or a number answer. Tie a question to particular elements, or leave it for any element. Changes save automatically.';
    $('previewHead').textContent = 'Which elements have questions';
  }
  showImportHelp();
  GQ_AI.init(S);

  if (!quiz.qs.length) { quiz.qs.push(blankQ()); answers = []; }
  $('editor').classList.remove('hidden');

  const base = new URL('.', location.href).href;
  const presentUrl = withDemo(ptq ? new URL('../quest/host.html?quiz=' + id, base).href : base + 'host.html?quiz=' + id);
  $('presentLink').value = presentUrl; $('presentBtn').href = presentUrl;
  $('editLink').value = location.href.split('#')[0] + '#' + id + '.' + k;
  document.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    const inp = $(b.dataset.copy);
    try { await navigator.clipboard.writeText(inp.value); } catch (e) { inp.select(); document.execCommand('copy'); }
    toast('Copied');
  });
  remember();

  function blankQ() { return { text: '', kind: 'mc', opts: ['', '', '', ''], label: '', img: '', unit: '', steal: false, els: {} }; }
  function remember() {
    const mine = store.get(KEY, []).filter(m => m.id !== id);
    mine.unshift({ id, k, title: quiz.title || 'Untitled quiz', type: S.type, at: Date.now() });
    store.set(KEY, mine.slice(0, 50));
  }
  const isNum = q => q.kind === 'num';

  // ---------- Saving ----------
  let dirty = false, saving = false, timer = null;
  const state = (t, err) => { $('saveState').textContent = t; $('saveState').classList.toggle('err', !!err); };
  function changed() { dirty = true; state('Unsaved changes'); clearTimeout(timer); timer = setTimeout(save, 900); drawPreview(); }
  async function save() {
    clearTimeout(timer);
    if (saving) { timer = setTimeout(save, 500); return; }
    if (!dirty) return;
    saving = true; dirty = false; state('Saving…');
    const qs = quiz.qs.map((q, i) => ({ ...q, text: q.text.trim(), opts: q.opts.map(o => o.trim()), label: (q.label || '').trim(), unit: (q.unit || '').trim(), ready: !problems(q, i).length }));
    const ans = answers.slice(0, qs.length).map((a, i) => (a == null ? null : isNum(qs[i]) ? (typeof a === 'object' && isFinite(a.v) ? a : null) : (typeof a === 'number' ? a : null)));
    try {
      await B.saveQuiz(id, { title: quiz.title.trim(), type: S.type, qs }, ans);
      state(dirty ? 'Unsaved changes' : 'All changes saved');
      remember();
    } catch (e) {
      dirty = true;
      state('Not saved yet: retrying…', true);
      timer = setTimeout(save, 5000);
    }
    saving = false;
  }
  window.addEventListener('beforeunload', ev => { if (dirty || saving) { ev.preventDefault(); ev.returnValue = ''; } });
  document.addEventListener('keydown', ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 's') { ev.preventDefault(); save(); } });
  state('All changes saved');

  // ---------- Title ----------
  $('qTitle').value = quiz.title === 'Untitled quiz' ? '' : quiz.title;
  $('qTitle').oninput = () => { quiz.title = $('qTitle').value || 'Untitled quiz'; changed(); };
  if (!$('qTitle').value) $('qTitle').focus();

  // ---------- Question cards ----------
  // Typed text that isn't a valid number or element list yet is kept here, so it isn't lost while typing
  const raw = new WeakMap();
  const rawOf = q => { if (!raw.has(q)) raw.set(q, {}); return raw.get(q); };

  function problems(q, i) {
    const out = [], a = answers[i];
    if (!q.text.trim()) out.push('Write the question.');
    if (isNum(q)) {
      const r = rawOf(q);
      if (r.v != null && r.v.trim() && !isFinite(parseNum(r.v, true))) out.push('The correct answer must be a number, e.g. 35.5, −3 or 6.02 × 10^23.');
      else if (!a || !isFinite(a.v)) out.push('Give the correct answer.');
      if (r.tol != null && r.tol.trim() && !(parseNum(r.tol, true) >= 0)) out.push('"Accept answers within" must be a number, or empty for exactly this value.');
    } else {
      const filled = q.opts.filter(o => o.trim()).length;
      if (filled < 2) out.push('Give at least two answers.');
      if (a == null || typeof a !== 'number') out.push('Tick the correct answer.');
      else if (!(q.opts[a] || '').trim()) out.push('The ticked answer is empty.');
    }
    if (ptq) {
      const r = rawOf(q);
      if (r.els != null) { const bad = parseEls(r.els).bad; if (bad.length) out.push(`${bad.map(x => `"${esc(x)}"`).join(', ')} ${bad.length === 1 ? 'isn\'t an element symbol' : 'aren\'t element symbols'}.`); }
    }
    return out;
  }

  function acceptedLine(q, i) {
    const a = answers[i];
    if (!a || !isFinite(a.v)) return '';
    const t = Math.abs(+a.tol || 0) * (a.pct ? Math.abs(a.v) / 100 : 1), u = q.unit ? ' ' + esc(q.unit) : '';
    const f = x => fmtNum(+x.toPrecision(10));
    return t ? `Accepts ${f(a.v - t)} to ${f(a.v + t)}${u}` : `Accepts exactly ${f(a.v)}${u}`;
  }

  function answersBlock(q, i) {
    if (isNum(q)) {
      const a = answers[i] && typeof answers[i] === 'object' ? answers[i] : {}, r = rawOf(q);
      const vText = r.v != null ? r.v : isFinite(a.v) ? String(a.v) : '';
      const tolText = r.tol != null ? r.tol : +a.tol ? String(a.tol) : '';
      return `<div class="numgrid">
          <label>Correct answer<input type="text" data-num="v" value="${esc(vText)}" inputmode="decimal" placeholder="e.g. 35.45" aria-label="Correct answer"></label>
          <label>Accept answers within ±<span class="tolrow"><input type="text" data-num="tol" value="${esc(tolText)}" inputmode="decimal" placeholder="0" aria-label="Accept answers within plus or minus">
            <select data-num="pct" aria-label="Tolerance units"><option value="" ${a.pct ? '' : 'selected'}>(same units)</option><option value="1" ${a.pct ? 'selected' : ''}>%</option></select></span></label>
          <label>Unit <small>optional, shown by the answer box</small><input type="text" data-f="unit" value="${esc(q.unit || '')}" maxlength="40" placeholder="e.g. g mol⁻¹" aria-label="Unit"></label>
        </div>
        <p class="small muted accepted" data-accepted>${acceptedLine(q, i)}</p>
        <p class="small muted" style="margin:.2rem 0 0">Students type a number; "6.02 × 10^23", "6.02e23" and a decimal comma all work.</p>`;
    }
    const opts = q.opts.map((o, j) => `<div class="optrow${answers[i] === j ? ' correct' : ''}">
        <input type="radio" name="c${i}" data-right="${j}" ${answers[i] === j ? 'checked' : ''} aria-label="Answer ${j + 1} is correct" title="Tick if this is the correct answer">
        <input type="text" data-opt="${j}" value="${esc(o)}" maxlength="200" placeholder="Answer ${j + 1}" aria-label="Answer ${j + 1}">
        <button class="btn x" data-delopt="${j}" ${q.opts.length <= 2 ? 'disabled' : ''} title="Remove this answer" aria-label="Remove answer ${j + 1}">✕</button></div>`).join('');
    return `${opts}<button class="btn" data-act="addopt" ${q.opts.length >= S.maxOptions ? 'disabled' : ''}>+ Add an answer</button>`;
  }

  function elsText(q) { const r = rawOf(q); return r.els != null ? r.els : elsOf(q).map(elSym).join(', '); }

  function card(q, i) {
    const n = quiz.qs.length, probs = problems(q, i);
    return `<div class="qcard${probs.length ? ' incomplete' : ''}${q.steal ? ' steal' : ''}" data-i="${i}">
      <div class="qtop"><h3>Question ${i + 1}${q.steal ? ' <span class="stealtag">Steal</span>' : ''}</h3>
        <button class="btn" data-act="up" ${i === 0 ? 'disabled' : ''} title="Move up" aria-label="Move question ${i + 1} up">↑</button>
        <button class="btn" data-act="down" ${i === n - 1 ? 'disabled' : ''} title="Move down" aria-label="Move question ${i + 1} down">↓</button>
        <button class="btn" data-act="dup" title="Make a copy">Copy</button>
        <button class="btn warn" data-act="del">Delete</button></div>
      <label class="lbl" for="t${i}">Question</label>
      <textarea id="t${i}" data-f="text" maxlength="800" placeholder="Type the question students will see on their phones">${esc(q.text)}</textarea>
      <div class="lbl kindrow"><span>Answer</span>
        <span class="seg" role="radiogroup" aria-label="Kind of answer">
          <label><input type="radio" name="k${i}" data-kind="mc" ${isNum(q) ? '' : 'checked'}> Multiple choice</label>
          <label><input type="radio" name="k${i}" data-kind="num" ${isNum(q) ? 'checked' : ''}> Number</label>
        </span>${isNum(q) ? '' : ' <small>tick the correct one</small>'}</div>
      ${answersBlock(q, i)}
      ${ptq ? `
      <label class="lbl" for="e${i}">Elements <small>the question only comes up on these; leave empty for any element</small></label>
      <div class="elsrow"><input type="text" id="e${i}" data-els value="${esc(elsText(q))}" placeholder="Any element (or type symbols, e.g. Na, K, Rb)" spellcheck="false">
        <button class="btn" data-act="pickels">Pick on a table</button></div>
      <label class="stealbox"><input type="checkbox" data-bool="steal" ${q.steal ? 'checked' : ''}> <b>Steal question</b> <small class="muted">a harder question, asked when a student tries to take an element from the other team</small></label>`
      : `
      <label class="lbl" for="l${i}">On the big screen <small>optional; without these the tile shows the question itself</small></label>
      <input type="text" id="l${i}" data-f="label" value="${esc(q.label)}" maxlength="${S.labelLength}" placeholder="Short label, e.g. Bond angles">`}
      <div class="picbox" style="margin-top:.5rem">
        <div class="paste" tabindex="0" role="button" data-act="pic" aria-label="Add a picture: click to choose a file, or paste one">${q.img ? 'Paste, drop or click to replace the picture' : 'Picture: click here and paste one (Ctrl+V), drag one in, or click to choose a file'}</div>
        ${q.img ? `<div><img class="picprev" src="${q.img}" alt="Picture for question ${i + 1}"><button class="btn" data-act="nopic" style="margin-top:.3rem">Remove picture</button></div>` : ''}
      </div>
      <p class="small muted" style="margin:.3rem 0 0">${ptq ? 'A picture is shown above the question on phones.' : 'A picture is shown on the tile and above the question on phones.'}</p>
      ${probs.map(p => `<p class="warnline">${p}</p>`).join('')}
    </div>`;
  }

  function render(focusSel) {
    $('qs').innerHTML = quiz.qs.map(card).join('');
    $('addQ').disabled = quiz.qs.length >= S.maxQuestions;
    $('addQ').textContent = quiz.qs.length >= S.maxQuestions ? `Up to ${S.maxQuestions} questions` : '+ Add a question';
    drawPreview();
    if (focusSel) { const el = $('qs').querySelector(focusSel); if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
  }
  const cardEl = i => $('qs').querySelector(`.qcard[data-i="${i}"]`);
  const refreshWarnings = i => {
    const c = cardEl(i); if (!c) return;
    const probs = problems(quiz.qs[i], i);
    c.classList.toggle('incomplete', !!probs.length);
    c.querySelectorAll('.warnline').forEach(w => w.remove());
    c.insertAdjacentHTML('beforeend', probs.map(p => `<p class="warnline">${p}</p>`).join(''));
    const acc = c.querySelector('[data-accepted]'); if (acc) acc.innerHTML = acceptedLine(quiz.qs[i], i);
  };

  // ---------- Preview ----------
  let tableCells = null;
  function drawPreview() {
    if (!ptq) return GQ.drawGrid($('preview'), { qs: quiz.qs.map(q => ({ ...q, ready: true })) }, {}, { aspect: 2 });
    const ready = quiz.qs.map((q, i) => ({ ...q, ready: !problems(q, i).length }));
    const pq = { qs: ready };
    if (!tableCells) { $('preview').innerHTML = ''; $('preview').classList.add('ptprev'); tableCells = PQ_TABLE.build($('preview')); }
    const general = ready.filter(q => q.ready && !q.steal && !elsOf(q).length).length;
    let own = 0;
    for (const z in tableCells) {
      const n = GQ.playable(pq).filter(q => !q.steal && q.els && q.els[z]).length;
      const c = tableCells[z];
      c.classList.toggle('hasq', n > 0); c.classList.toggle('noq', n === 0 && !general);
      c.title = `${GQ.ELS[z - 1].n}: ${n ? `${n} question${n === 1 ? '' : 's'} of its own` : 'no questions of its own'}${general ? ` + ${general} for any element` : ''}`;
      if (n) own++;
    }
    const pl = GQ.playable(pq), steals = pl.filter(q => q.steal).length, incomplete = ready.length - pl.length - ready.filter(q => !q.text.trim() && !q.opts.some(o => o.trim())).length;
    $('previewNote').innerHTML = `${pl.length} question${pl.length === 1 ? '' : 's'} ready: ${general} for any element, ${pl.length - general - steals} tied to particular elements, and ${steals} steal question${steals === 1 ? '' : 's'}.`
      + (incomplete > 0 ? ` ${incomplete} more ${incomplete === 1 ? 'is' : 'are'} unfinished and won't be used yet.` : '')
      + `<br>Elements in bold have questions of their own${general ? '; every element can use the questions for any element' : '; <b>greyed-out elements have no questions</b>, so students can\'t claim them'}.`
      + (steals ? '' : ' With no steal questions, an ordinary question is used for steals.');
  }

  // ---------- Typing: update the model without redrawing, so the cursor stays put ----------
  function setNum(q, i, card) {
    const r = rawOf(q), a = answers[i] && typeof answers[i] === 'object' ? answers[i] : {};
    const v = parseNum(r.v != null ? r.v : a.v, true), tol = r.tol != null ? (r.tol.trim() ? parseNum(r.tol, true) : 0) : (+a.tol || 0);
    const pct = !!card.querySelector('[data-num="pct"]').value;
    answers[i] = isFinite(v) ? { v, tol: isFinite(tol) ? Math.abs(tol) : 0, pct } : null;
  }
  $('qs').addEventListener('input', ev => {
    const c = ev.target.closest('.qcard'); if (!c) return;
    const i = +c.dataset.i, q = quiz.qs[i], t = ev.target;
    if (t.dataset.f) q[t.dataset.f] = t.value;
    else if (t.dataset.opt != null) q.opts[+t.dataset.opt] = t.value;
    else if (t.dataset.right != null) {
      answers[i] = +t.dataset.right;
      c.querySelectorAll('.optrow').forEach((row, j) => row.classList.toggle('correct', j === answers[i]));
    } else if (t.dataset.num) {
      if (t.dataset.num !== 'pct') rawOf(q)[t.dataset.num] = t.value;
      setNum(q, i, c);
    } else if (t.dataset.els != null) {
      rawOf(q).els = t.value;
      q.els = Object.fromEntries(parseEls(t.value).zs.map(z => [z, true]));
    } else if (t.dataset.bool) {
      q[t.dataset.bool] = t.checked;
      c.classList.toggle('steal', !!q.steal);
      c.querySelector('h3').innerHTML = `Question ${i + 1}${q.steal ? ' <span class="stealtag">Steal</span>' : ''}`;
    } else if (t.dataset.kind) {
      if ((t.dataset.kind === 'num') === isNum(q)) return;
      // Keep the other kind's answer, so switching back and forth loses nothing
      const st = rawOf(q).stash = rawOf(q).stash || {};
      st[q.kind] = answers[i];
      q.kind = t.dataset.kind; answers[i] = st[q.kind] != null ? st[q.kind] : null;
      changed(); return render(`.qcard[data-i="${i}"] ${isNum(q) ? '[data-num="v"]' : '[data-opt="0"]'}`);
    }
    refreshWarnings(i); changed();
  });
  // Tidy an element list when leaving the box, e.g. "na k" → "Na, K"
  $('qs').addEventListener('focusout', ev => {
    if (ev.target.dataset.els == null) return;
    const q = quiz.qs[+ev.target.closest('.qcard').dataset.i];
    if (!parseEls(ev.target.value).bad.length) { delete rawOf(q).els; ev.target.value = elsText(q); }
  });
  $('qs').addEventListener('change', ev => {   // the % select fires change, not always input
    if (ev.target.dataset.num !== 'pct') return;
    const c = ev.target.closest('.qcard'), i = +c.dataset.i;
    setNum(quiz.qs[i], i, c); refreshWarnings(i); changed();
  });

  let picTarget = null;
  $('qs').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-act],[data-delopt]'); if (!btn) return;
    const i = +btn.closest('.qcard').dataset.i, q = quiz.qs[i];
    const act = btn.dataset.act;
    if (btn.dataset.delopt != null) {
      const j = +btn.dataset.delopt;
      q.opts.splice(j, 1);
      if (answers[i] === j) answers[i] = null; else if (answers[i] > j) answers[i]--;
      changed(); return render(`.qcard[data-i="${i}"] [data-opt="${Math.max(0, j - 1)}"]`);
    }
    if (act === 'addopt') { q.opts.push(''); changed(); return render(`.qcard[data-i="${i}"] [data-opt="${q.opts.length - 1}"]`); }
    if (act === 'up' || act === 'down') {
      const j = act === 'up' ? i - 1 : i + 1;
      [quiz.qs[i], quiz.qs[j]] = [quiz.qs[j], quiz.qs[i]];
      [answers[i], answers[j]] = [answers[j], answers[i]];
      changed(); return render(`.qcard[data-i="${j}"] [data-act="${act}"]`);
    }
    if (act === 'dup') {
      quiz.qs.splice(i + 1, 0, JSON.parse(JSON.stringify(q)));
      answers.splice(i + 1, 0, answers[i] && typeof answers[i] === 'object' ? { ...answers[i] } : answers[i]);
      changed(); return render(`.qcard[data-i="${i + 1}"] textarea`);
    }
    if (act === 'del') {
      if (!btn.dataset.armed) {
        btn.dataset.armed = 1; btn.textContent = 'Click again to delete';
        return setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = 'Delete'; } }, 3000);
      }
      quiz.qs.splice(i, 1); answers.splice(i, 1);
      if (!quiz.qs.length) { quiz.qs.push(blankQ()); answers = []; }
      changed(); return render();
    }
    if (act === 'pickels') return openPicker(i);
    if (act === 'pic') { picTarget = i; $('fileIn').value = ''; $('fileIn').click(); }
    if (act === 'nopic') { q.img = ''; changed(); render(); }
  });
  $('qs').addEventListener('keydown', ev => {
    if (ev.target.classList.contains('paste') && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); ev.target.click(); }
  });
  $('fileIn').onchange = () => { if ($('fileIn').files[0] && picTarget != null) setPicture(picTarget, $('fileIn').files[0]); };
  $('qs').addEventListener('paste', ev => {
    const box = ev.target.closest('.paste'); if (!box) return;
    const item = [...(ev.clipboardData || {}).items || []].find(it => it.type.startsWith('image/'));
    ev.preventDefault();
    if (!item) return toast('No picture on the clipboard. Copy a picture first (e.g. right-click → Copy image).');
    setPicture(+box.closest('.qcard').dataset.i, item.getAsFile());
  });
  ['dragover', 'dragleave', 'drop'].forEach(type => $('qs').addEventListener(type, ev => {
    const box = ev.target.closest('.paste'); if (!box) return;
    ev.preventDefault();
    box.classList.toggle('drag', type === 'dragover');
    if (type === 'drop' && ev.dataTransfer.files[0]) setPicture(+box.closest('.qcard').dataset.i, ev.dataTransfer.files[0]);
  }));

  // ---------- Element picker ----------
  let pickFor = null, pickSel = new Set(), pickCells = null;
  function openPicker(i) {
    pickFor = i;
    const q = quiz.qs[i];
    pickSel = new Set(rawOf(q).els != null ? parseEls(rawOf(q).els).zs : elsOf(q));
    if (!pickCells) pickCells = PQ_TABLE.build($('pickTable'), z => { pickSel.has(z) ? pickSel.delete(z) : pickSel.add(z); paintPicker(); });
    $('pickTitle').textContent = `Elements for question ${i + 1}`;
    paintPicker();
    $('pickModal').classList.remove('hidden');
    const first = $('pickTable').querySelector('.cell.sel') || $('pickTable').querySelector('.cell'); if (first) first.focus();
  }
  function paintPicker() {
    for (const z in pickCells) { pickCells[z].classList.toggle('sel', pickSel.has(+z)); pickCells[z].setAttribute('aria-pressed', pickSel.has(+z)); }
    const list = [...pickSel].sort((a, b) => a - b).map(elSym);
    $('pickNow').textContent = list.length ? `Chosen: ${list.join(', ')}` : 'None chosen: the question can come up on any element.';
  }
  function closePicker(apply) {
    $('pickModal').classList.add('hidden');
    if (apply && pickFor != null) {
      const q = quiz.qs[pickFor];
      q.els = Object.fromEntries([...pickSel].map(z => [z, true])); delete rawOf(q).els;
      changed(); render(`.qcard[data-i="${pickFor}"] [data-act="pickels"]`);
    }
    pickFor = null;
  }
  $('pickDone').onclick = () => closePicker(true);
  $('pickCancel').onclick = () => closePicker(false);
  $('pickClear').onclick = () => { pickSel.clear(); paintPicker(); };
  $('pickModal').addEventListener('click', ev => { if (ev.target === $('pickModal')) closePicker(false); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('pickModal').classList.contains('hidden')) closePicker(false); });

  // Shrink a picture so it is quick to send to every phone
  async function setPicture(i, file) {
    if (!file || !file.type.startsWith('image/')) return toast('That isn\'t a picture file.');
    try {
      quiz.qs[i].img = await shrink(file);
      changed(); render(`.qcard[data-i="${i}"] .paste`);
    } catch (e) { toast('Couldn\'t read that picture. Try a PNG or JPEG.'); }
  }
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.onload = () => {
        URL.revokeObjectURL(url);
        let scale = Math.min(1, S.imageMaxPixels / Math.max(img.width, img.height)), out = '';
        const limit = S.imageMaxKB * 1024 * 4 / 3;
        for (let tries = 0; tries < 8; tries++) {
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', tries < 3 ? 0.85 - tries * 0.1 : 0.6);
          if (out.length <= limit) return resolve(out);
          if (tries >= 2) scale *= 0.8;
        }
        resolve(out);
      };
      img.src = url;
    });
  }

  // ---------- Import and export as text ----------
  function showImportHelp() {
    $('importHelp').innerHTML = `Put a blank line between questions. Write the question, then each answer on its own line starting with <code>-</code>. Start the correct answer with <code>*</code> instead. For a number answer, write one line starting with <code>=</code>: the value, then optionally how close an answer must be (<code>± 0.1</code> or <code>± 1%</code>) and a unit. `
      + (ptq ? 'An <code>Elements:</code> line ties a question to those elements, and a line saying <code>Steal</code> makes it a steal question. Lines starting with <code>#</code> are notes and are ignored. Pictures can be added afterwards.'
        : 'A <code>Label:</code> line for the big screen is optional. Lines starting with <code>#</code> are notes and are ignored. Pictures can be added afterwards.');
    $('importEg').textContent = ptq
      ? 'Which ion does sodium usually form?\nElements: Na\n- Na⁻\n* Na⁺\n- Na²⁺\n\nCalculate the relative atomic mass of chlorine (75.8% ³⁵Cl, 24.2% ³⁷Cl) to 3 s.f.\nElements: Cl\nSteal\n= 35.5 ± 0.05'
      : 'What is the C–C bond length in benzene?\nLabel: Bond lengths\n- 134 pm\n* 140 pm\n- 151 pm\n\nHow many moles are in 9.0 g of water? Give 2 s.f.\nLabel: Moles\n= 0.50 ± 0.005 mol';
  }
  const isBlank = (q, i) => !q.text.trim() && !q.opts.some(o => o.trim()) && !q.img && !(q.label || '').trim() && !(isNum(q) && answers[i]);
  let parsed = null;
  function checkImport() {
    const txt = $('importText').value;
    parsed = null; $('importAdd').disabled = $('importReplace').disabled = true;
    if (!txt.trim()) { $('importCheck').innerHTML = ''; return; }
    const r = GQ_IMPORT.parse(txt, S.type);
    const kept = quiz.qs.filter((q, i) => !isBlank(q, i)).length;
    if (r.errors.length) {
      $('importCheck').innerHTML = r.errors.slice(0, 8).map(e => `<p class="warnline">${esc(e)}</p>`).join('') + (r.errors.length > 8 ? `<p class="warnline">…and ${r.errors.length - 8} more.</p>` : '');
      return;
    }
    const n = r.qs.length, nNum = r.qs.filter(q => q.kind === 'num').length, nSteal = r.qs.filter(q => q.steal).length;
    const extra = [nNum ? `${nNum} with a number answer` : '', nSteal ? `${nSteal} steal question${nSteal === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ');
    $('importCheck').innerHTML = `<p class="okline">Found ${n} question${n === 1 ? '' : 's'}${extra ? ` (${extra})` : ''}, all complete.</p>`
      + (kept + n > S.maxQuestions ? `<p class="warnline">Adding them would make ${kept + n}; the most allowed is ${S.maxQuestions}. You can still replace the existing questions.</p>` : '');
    parsed = r.qs;
    $('importAdd').disabled = kept + n > S.maxQuestions;
    $('importReplace').disabled = n > S.maxQuestions;
  }
  $('importText').addEventListener('input', checkImport);
  function doImport(replace) {
    if (!parsed) return;
    const fresh = parsed.map(p => ({ text: p.text, kind: p.kind, opts: p.kind === 'num' ? ['', '', '', ''] : p.opts, label: p.label, img: '', unit: p.unit || '', steal: !!p.steal, els: Object.fromEntries((p.els || []).map(z => [z, true])) }));
    if (replace) { quiz.qs = fresh; answers = parsed.map(p => p.answer); }
    else {
      const keep = quiz.qs.map((q, i) => [q, answers[i], i]).filter(([q, , i]) => !isBlank(q, i));
      quiz.qs = keep.map(x => x[0]).concat(fresh);
      answers = keep.map(x => x[1] == null ? null : x[1]).concat(parsed.map(p => p.answer));
    }
    const n = fresh.length, first = quiz.qs.length - n;
    $('importText').value = ''; checkImport();
    $('importBox').open = false;
    changed(); render(`.qcard[data-i="${first}"] textarea`);
    toast(`${replace ? 'Replaced the questions with' : 'Added'} ${n} question${n === 1 ? '' : 's'}`);
  }
  $('importAdd').onclick = () => doImport(false);
  $('importReplace').onclick = () => {
    const btn = $('importReplace'), kept = quiz.qs.filter((q, i) => !isBlank(q, i)).length;
    if (kept && !btn.dataset.armed) {
      btn.dataset.armed = 1; btn.textContent = `Click again to replace all ${kept}`;
      return setTimeout(() => { delete btn.dataset.armed; btn.textContent = 'Replace all questions'; }, 3000);
    }
    delete btn.dataset.armed; btn.textContent = 'Replace all questions';
    doImport(true);
  };
  $('exportText').onclick = async () => {
    const keep = quiz.qs.map((q, i) => [q, answers[i], i]).filter(([q, , i]) => !isBlank(q, i));
    if (!keep.length) return toast('There are no questions to copy yet.');
    const txt = GQ_IMPORT.toText(keep.map(x => x[0]), keep.map(x => x[1]), S.type);
    try { await navigator.clipboard.writeText(txt); toast(`Copied ${keep.length} question${keep.length === 1 ? '' : 's'} as text` + (keep.some(([q]) => q.img) ? ' (pictures aren\'t included)' : '')); }
    catch (e) { $('importText').value = txt; checkImport(); toast('Couldn\'t reach the clipboard, so the text is in the box above'); }
  };

  $('addQ').onclick = () => { quiz.qs.push(blankQ()); changed(); render(`.qcard[data-i="${quiz.qs.length - 1}"] textarea`); };
  render();
})();
