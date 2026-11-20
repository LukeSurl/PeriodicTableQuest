// Pre-Lecture Quizzes: the home page. "Create new quiz" lists the quiz types; below it,
// every quiz of every type saved in this browser.
(function () {
  const P = window.PLQ_SETTINGS, SAVED = window.PQ_SAVED;
  const { $, esc, store, withDemo, isDemo, theme } = GQ;
  theme();
  document.title = $('title').textContent = P.title;
  const GKEY = isDemo() ? 'gq-mine-demo' : 'gq-mine';
  if (isDemo()) $('mode').textContent = 'Demo mode: this browser only';
  const product = id => P.products.find(p => p.id === id) || { name: id, icon: '' };

  // ---------- Little pictures of each quiz type ----------
  function icon(kind) {
    const A = 'var(--ta)', B = 'var(--tb)', paper = 'var(--paper)', line = 'var(--line)';
    if (kind === 'grid') {
      const lead = [A, null, B, A, B, null, A, B];
      let s = '';
      lead.forEach((c, i) => {
        const x = 4 + (i % 4) * 24, y = 4 + Math.floor(i / 4) * 26;
        s += `<rect x="${x}" y="${y}" width="20" height="22" rx="3" fill="${paper}" stroke="${c || line}" stroke-width="${c ? 2 : 1}"/>`;
        s += `<rect x="${x + 2}" y="${y + 16}" width="8" height="4" fill="${c === B ? line : A}" opacity="${c ? 1 : .35}"/><rect x="${x + 10}" y="${y + 16}" width="8" height="4" fill="${c === A ? line : B}" opacity="${c ? 1 : .35}"/>`;
      });
      return `<svg viewBox="0 0 100 60" aria-hidden="true">${s}</svg>`;
    }
    if (kind === 'ptable') {
      // Rows of the main table: which of the 18 columns are there
      const rows = [[1, 18], [1, 2, 13, 14, 15, 16, 17, 18], [1, 2, 13, 14, 15, 16, 17, 18]];
      for (let r = 0; r < 4; r++) rows.push(Array.from({ length: 18 }, (_, i) => i + 1));
      const team = { '2,1': A, '3,2': A, '4,8': A, '5,3': A, '2,16': B, '3,17': B, '4,12': B, '6,5': B, '1,1': A, '5,14': B, '6,10': A };
      let s = '';
      rows.forEach((cols, r) => cols.forEach(c => {
        const fill = team[`${r},${c}`] || paper;
        s += `<rect x="${(c - 1) * 5.5 + 1}" y="${r * 5.5 + 9}" width="4.6" height="4.6" rx=".8" fill="${fill}" stroke="${fill === paper ? line : fill}" stroke-width=".5"/>`;
      }));
      return `<svg viewBox="0 0 100 60" aria-hidden="true">${s}</svg>`;
    }
    return '';
  }

  // ---------- Create new quiz ----------
  $('products').innerHTML = P.products.map(p => `<button type="button" class="product" data-id="${p.id}">
      <span class="pic">${icon(p.icon)}</span>
      <span class="pname">${esc(p.name)}</span>
      <span class="pblurb">${esc(p.blurb)}</span>
      <span class="pgo">Create a ${esc(p.name)} quiz</span></button>`).join('');
  $('products').querySelectorAll('.product').forEach(b => b.onclick = () => create(b));

  async function create(btn) {
    const id = btn.dataset.id;
    if (id === 'ptq') { location.href = withDemo('../setup.html'); return; }
    if (id === 'grid') {
      btn.disabled = true; btn.querySelector('.pgo').textContent = 'Creating…'; $('createMsg').textContent = '';
      try {
        const B = await GQ_BACKEND.create();
        const { id: qid, k } = await B.createQuiz('Untitled quiz');
        const mine = store.get(GKEY, []); mine.unshift({ id: qid, k, title: 'Untitled quiz', at: Date.now() }); store.set(GKEY, mine);
        location.href = withDemo('../grid/edit.html') + `#${qid}.${k}`;
      } catch (e) {
        btn.disabled = false; btn.querySelector('.pgo').textContent = 'Create a Quiz Grid quiz';
        $('createMsg').innerHTML = `<b>Couldn't create the quiz.</b> Check your internet connection. <small>(${esc(e.message)})</small>`;
      }
    }
  }

  // ---------- Saved quizzes ----------
  let filter = 'all';
  function allSaved() {
    const grid = store.get(GKEY, []).map((m, i) => ({
      type: 'grid', key: m.id, at: m.at || 0, order: i, title: m.title || 'Untitled quiz', detail: '',
      edit: withDemo('../grid/edit.html') + `#${m.id}.${m.k}`, present: withDemo('../grid/host.html?quiz=' + m.id)
    }));
    const ptq = isDemo() ? [] : SAVED.list().map((q, i) => {
      const n = Object.keys(q.mix || {}).length;
      return {
        type: 'ptq', key: q.id, at: q.at || 0, order: i, title: q.title || 'Untitled quiz',
        detail: `${n} topic${n === 1 ? '' : 's'} · ${q.mins} min`,
        edit: '../setup.html?id=' + q.id, present: n ? '../index.html' + SAVED.presentQuery(q) : ''
      };
    });
    // Most recently made or opened first; older Quiz Grid entries (no date) keep their order at the end
    return [...grid, ...ptq].sort((a, b) => b.at - a.at || a.type.localeCompare(b.type) || a.order - b.order);
  }

  function forget(item) {
    if (item.type === 'grid') store.set(GKEY, store.get(GKEY, []).filter(m => m.id !== item.key));
    else SAVED.remove(item.key);
    draw();
  }

  function draw() {
    const items = allSaved();
    const types = P.products.filter(p => items.some(x => x.type === p.id));
    if (filter !== 'all' && !types.some(p => p.id === filter)) filter = 'all';
    $('filters').innerHTML = types.length > 1 ? [{ id: 'all', name: 'All' }, ...types].map(p =>
      `<button type="button" class="btn chip${filter === p.id ? ' on' : ''}" data-f="${p.id}" aria-pressed="${filter === p.id}">${esc(p.name)}</button>`).join('') : '';
    $('filters').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; draw(); });

    const shown = items.filter(x => filter === 'all' || x.type === filter);
    $('saved').innerHTML = shown.length ? shown.map((x, i) => `<li>
        <span class="ticon" title="${esc(product(x.type).name)}">${icon(product(x.type).icon)}</span>
        <span class="t">${esc(x.title)}<small>${esc(product(x.type).name)}${x.detail ? ' · ' + esc(x.detail) : ''}</small></span>
        <a class="btn" href="${x.edit}">Edit</a>
        ${x.present ? `<a class="btn primary" href="${x.present}" target="_blank" rel="noopener">Present</a>` : '<span class="btn primary disabled" title="Choose some topics first">Present</span>'}
        <button class="btn" data-forget="${i}" title="Remove from this list">Forget</button></li>`).join('')
      : '<li class="muted">None yet. Quizzes you create or open on this computer will appear here.</li>';
    $('saved').querySelectorAll('[data-forget]').forEach(b => b.onclick = () => {
      const item = shown[+b.dataset.forget];
      if (b.dataset.armed) return forget(item);
      b.dataset.armed = 1;
      b.textContent = item.type === 'grid' ? 'Sure? Keep the edit link first' : 'Sure? Click again';
      setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Forget'; } }, 4000);
    });
  }
  draw();
  window.addEventListener('storage', draw);   // e.g. a quiz renamed in another tab
  window.addEventListener('pageshow', draw);  // coming back with the browser's Back button

  // ---------- About ----------
  const A = P.about;
  $('about').innerHTML = `<p>${esc(P.title)} v${esc(P.version)} · ${esc(A.copyright)} · <a href="${A.source}" target="_blank" rel="noopener">Source code</a></p>
    <p>${esc(A.privacy)} ${esc(A.credits)}</p>`;
})();
