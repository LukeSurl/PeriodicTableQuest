// Quiz Grid: the question editor
(async function () {
  const { $, esc, store, S, withDemo, isDemo, theme, toast } = GQ;
  theme();
  $('home').textContent = S.title;
  const KEY = isDemo() ? 'gq-mine-demo' : 'gq-mine';
  const [id, k] = location.hash.slice(1).split('.');
  const problem = html => { $('problem').innerHTML = html; $('problem').classList.remove('hidden'); $('saveState').textContent = ''; };
  if (!id || !k) return problem(`This page needs a quiz's edit link. <a href="${withDemo('index.html')}">Go to the start page</a> to make a quiz.`);

  let B;
  try { B = await GQ_BACKEND.create(); }
  catch (e) { return problem(`Couldn't connect. Check your internet connection and reload. <small>(${esc(e.message)})</small>`); }

  let quiz, answers;
  try { ({ quiz, answers } = await B.openQuiz(id, k)); }
  catch (e) {
    return problem(e.message === 'badlink'
      ? `This edit link doesn't match a quiz. Check you copied all of it. <a href="${withDemo('index.html')}">Start page</a>`
      : `Couldn't open the quiz. Check your internet connection and reload. <small>(${esc(e.message)})</small>`);
  }
  if (!quiz.qs.length) { quiz.qs.push(blankQ()); answers = []; }
  $('editor').classList.remove('hidden');

  const base = new URL('.', location.href).href;
  const presentUrl = withDemo(base + 'host.html?quiz=' + id);
  $('presentLink').value = presentUrl; $('presentBtn').href = presentUrl;
  $('editLink').value = location.href.split('#')[0] + '#' + id + '.' + k;
  document.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    const inp = $(b.dataset.copy);
    try { await navigator.clipboard.writeText(inp.value); } catch (e) { inp.select(); document.execCommand('copy'); }
    toast('Copied');
  });
  remember();

  function blankQ() { return { text: '', opts: ['', '', '', ''], label: '', img: '' }; }
  function remember() {
    const mine = store.get(KEY, []).filter(m => m.id !== id);
    mine.unshift({ id, k, title: quiz.title || 'Untitled quiz', at: Date.now() });
    store.set(KEY, mine.slice(0, 50));
  }

  // ---------- Saving ----------
  let dirty = false, saving = false, timer = null;
  const state = (t, err) => { $('saveState').textContent = t; $('saveState').classList.toggle('err', !!err); };
  function changed() { dirty = true; state('Unsaved changes'); clearTimeout(timer); timer = setTimeout(save, 900); drawPreview(); }
  async function save() {
    clearTimeout(timer);
    if (saving) { timer = setTimeout(save, 500); return; }
    if (!dirty) return;
    saving = true; dirty = false; state('Saving…');
    const qs = quiz.qs.map((q, i) => ({ text: q.text.trim(), opts: q.opts.map(o => o.trim()), label: (q.label || '').trim(), img: q.img || '', ready: !problems(q, i).length }));
    try {
      await B.saveQuiz(id, { title: quiz.title.trim(), qs }, answers.slice(0, qs.length));
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
  function problems(q, i) {
    const out = [];
    if (!q.text.trim()) out.push('Write the question.');
    const filled = q.opts.filter(o => o.trim()).length;
    if (filled < 2) out.push('Give at least two answers.');
    if (answers[i] == null) out.push('Tick the correct answer.');
    else if (!(q.opts[answers[i]] || '').trim()) out.push('The ticked answer is empty.');
    return out;
  }

  function card(q, i) {
    const n = quiz.qs.length;
    const opts = q.opts.map((o, j) => `<div class="optrow${answers[i] === j ? ' correct' : ''}">
        <input type="radio" name="c${i}" data-right="${j}" ${answers[i] === j ? 'checked' : ''} aria-label="Answer ${j + 1} is correct" title="Tick if this is the correct answer">
        <input type="text" data-opt="${j}" value="${esc(o)}" maxlength="200" placeholder="Answer ${j + 1}" aria-label="Answer ${j + 1}">
        <button class="btn x" data-delopt="${j}" ${q.opts.length <= 2 ? 'disabled' : ''} title="Remove this answer" aria-label="Remove answer ${j + 1}">✕</button></div>`).join('');
    const probs = problems(q, i);
    return `<div class="qcard${probs.length ? ' incomplete' : ''}" data-i="${i}">
      <div class="qtop"><h3>Question ${i + 1}</h3>
        <button class="btn" data-act="up" ${i === 0 ? 'disabled' : ''} title="Move up" aria-label="Move question ${i + 1} up">↑</button>
        <button class="btn" data-act="down" ${i === n - 1 ? 'disabled' : ''} title="Move down" aria-label="Move question ${i + 1} down">↓</button>
        <button class="btn" data-act="dup" title="Make a copy">Copy</button>
        <button class="btn warn" data-act="del">Delete</button></div>
      <label class="lbl" for="t${i}">Question</label>
      <textarea id="t${i}" data-f="text" maxlength="800" placeholder="Type the question students will see on their phones">${esc(q.text)}</textarea>
      <label class="lbl">Answers <small>tick the correct one</small></label>
      ${opts}
      <button class="btn" data-act="addopt" ${q.opts.length >= S.maxOptions ? 'disabled' : ''}>+ Add an answer</button>
      <label class="lbl" for="l${i}">On the big screen <small>optional; without these the tile shows the question itself</small></label>
      <input type="text" id="l${i}" data-f="label" value="${esc(q.label)}" maxlength="${S.labelLength}" placeholder="Short label, e.g. Bond angles">
      <div class="picbox" style="margin-top:.5rem">
        <div class="paste" tabindex="0" role="button" data-act="pic" aria-label="Add a picture: click to choose a file, or paste one">${q.img ? 'Paste, drop or click to replace the picture' : 'Picture: click here and paste one (Ctrl+V), drag one in, or click to choose a file'}</div>
        ${q.img ? `<div><img class="picprev" src="${q.img}" alt="Picture for question ${i + 1}"><button class="btn" data-act="nopic" style="margin-top:.3rem">Remove picture</button></div>` : ''}
      </div>
      <p class="small muted" style="margin:.3rem 0 0">A picture is shown on the tile and above the question on phones.</p>
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
  const refreshWarnings = i => {
    const c = $('qs').querySelector(`.qcard[data-i="${i}"]`); if (!c) return;
    const probs = problems(quiz.qs[i], i);
    c.classList.toggle('incomplete', !!probs.length);
    c.querySelectorAll('.warnline').forEach(w => w.remove());
    c.insertAdjacentHTML('beforeend', probs.map(p => `<p class="warnline">${p}</p>`).join(''));
  };
  function drawPreview() { GQ.drawGrid($('preview'), { qs: quiz.qs.map(q => ({ ...q, ready: true })) }, {}, { aspect: 2 }); }

  // Typing: update the model without redrawing, so the cursor stays put
  $('qs').addEventListener('input', ev => {
    const c = ev.target.closest('.qcard'); if (!c) return;
    const i = +c.dataset.i, q = quiz.qs[i], t = ev.target;
    if (t.dataset.f) q[t.dataset.f] = t.value;
    else if (t.dataset.opt != null) q.opts[+t.dataset.opt] = t.value;
    else if (t.dataset.right != null) {
      answers[i] = +t.dataset.right;
      c.querySelectorAll('.optrow').forEach((row, j) => row.classList.toggle('correct', j === answers[i]));
    }
    refreshWarnings(i); changed();
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
      quiz.qs.splice(i + 1, 0, JSON.parse(JSON.stringify(q))); answers.splice(i + 1, 0, answers[i]);
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
  const isBlank = q => !q.text.trim() && !q.opts.some(o => o.trim()) && !q.img && !(q.label || '').trim();
  let parsed = null;
  function checkImport() {
    const txt = $('importText').value;
    parsed = null; $('importAdd').disabled = $('importReplace').disabled = true;
    if (!txt.trim()) { $('importCheck').innerHTML = ''; return; }
    const r = GQ_IMPORT.parse(txt);
    const kept = quiz.qs.filter(q => !isBlank(q)).length;
    if (r.errors.length) {
      $('importCheck').innerHTML = r.errors.slice(0, 8).map(e => `<p class="warnline">${esc(e)}</p>`).join('') + (r.errors.length > 8 ? `<p class="warnline">…and ${r.errors.length - 8} more.</p>` : '');
      return;
    }
    const n = r.qs.length;
    $('importCheck').innerHTML = `<p class="okline">Found ${n} question${n === 1 ? '' : 's'}, all complete.</p>`
      + (kept + n > S.maxQuestions ? `<p class="warnline">Adding them would make ${kept + n}; the most allowed is ${S.maxQuestions}. You can still replace the existing questions.</p>` : '');
    parsed = r.qs;
    $('importAdd').disabled = kept + n > S.maxQuestions;
    $('importReplace').disabled = n > S.maxQuestions;
  }
  $('importText').addEventListener('input', checkImport);
  function doImport(replace) {
    if (!parsed) return;
    const fresh = parsed.map(p => ({ text: p.text, opts: p.opts, label: p.label, img: '' }));
    if (replace) { quiz.qs = fresh; answers = parsed.map(p => p.answer); }
    else {
      const keep = quiz.qs.map((q, i) => [q, answers[i]]).filter(([q]) => !isBlank(q));
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
    const btn = $('importReplace'), kept = quiz.qs.filter(q => !isBlank(q)).length;
    if (kept && !btn.dataset.armed) {
      btn.dataset.armed = 1; btn.textContent = `Click again to replace all ${kept}`;
      return setTimeout(() => { delete btn.dataset.armed; btn.textContent = 'Replace all questions'; }, 3000);
    }
    delete btn.dataset.armed; btn.textContent = 'Replace all questions';
    doImport(true);
  };
  $('exportText').onclick = async () => {
    const keep = quiz.qs.map((q, i) => [q, answers[i]]).filter(([q]) => !isBlank(q));
    if (!keep.length) return toast('There are no questions to copy yet.');
    const txt = GQ_IMPORT.toText(keep.map(x => x[0]), keep.map(x => x[1]));
    try { await navigator.clipboard.writeText(txt); toast(`Copied ${keep.length} question${keep.length === 1 ? '' : 's'} as text` + (keep.some(([q]) => q.img) ? ' (pictures aren\'t included)' : '')); }
    catch (e) { $('importText').value = txt; checkImport(); toast('Couldn\'t reach the clipboard, so the text is in the box above'); }
  };

  $('addQ').onclick = () => { quiz.qs.push(blankQ()); changed(); render(`.qcard[data-i="${quiz.qs.length - 1}"] textarea`); };
  render();
})();
