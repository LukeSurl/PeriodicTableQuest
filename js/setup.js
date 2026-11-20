// Periodic Table Quest: set up a quiz (name, topics, countdown) and save it in this browser.
// setup.html makes a new one; setup.html?id=… edits one saved earlier.
(async function () {
  const CFG = window.PQ_CONFIG, SAVED = window.PQ_SAVED;
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const r = document.documentElement.style;
  r.setProperty('--ta', CFG.teams.a.colour); r.setProperty('--tb', CFG.teams.b.colour);

  const params = new URLSearchParams(location.search);
  const existing = params.get('id') && SAVED.get(params.get('id'));
  const quiz = existing || { id: SAVED.newId(), title: '', mix: {}, mins: CFG.defaultMinutes };
  let stored = !!existing;

  $('title').value = quiz.title || '';
  $('mins').value = quiz.mins || CFG.defaultMinutes;
  if (existing) $('saveState').textContent = 'Saved on this computer';

  // ---------- Topics ----------
  const ids = await PQ.listSets();
  await PQ.loadSets(ids);
  const setName = k => (PQ.sets[k] && PQ.sets[k].short) || k;
  ids.sort((a, b) => (!PQ.sets[a]) - (!PQ.sets[b]) || setName(a).localeCompare(setName(b), 'en', { numeric: true }));
  const usable = ids.filter(k => PQ.sets[k]);

  $('topicList').innerHTML = ids.map(k => {
    const set = PQ.sets[k], st = PQ.setStatus[k] || {};
    if (!set) return `<div class="trow bad"><input type="checkbox" disabled aria-label="${esc(k)}"><div class="tinfo"><b>${esc(k)}.js</b>
        <span class="terr">Can't be used: ${esc(st.error || 'unknown problem')}</span></div><span></span></div>`;
    const w = +(quiz.mix || {})[k] || 0;
    return `<div class="trow"><input type="checkbox" id="tc-${k}" data-k="${k}" ${w > 0 ? 'checked' : ''}>
      <label class="tinfo" for="tc-${k}"><b>${esc(set.title)}</b>${set.short && !set.title.startsWith(set.short) ? `<small>${esc(set.short)}</small>` : ''}</label>
      <span class="tpct"><input type="number" min="0" max="100" step="5" id="tp-${k}" value="${w > 0 ? Math.round(w) : ''}" aria-label="Share for ${esc(set.short || k)}"> %</span></div>`;
  }).join('') || '<p>No question sets found.</p>';
  $('topicSource').textContent = PQ.listSource === 'fallback'
    ? 'The list of question sets could not be read, so only the built-in topics are shown.' : '';

  const readMix = () => Object.fromEntries(usable.filter(k => $('tc-' + k).checked && +$('tp-' + k).value > 0).map(k => [k, +$('tp-' + k).value]));
  // Shares scaled to add up to 100
  function normalMix() {
    const raw = readMix(), tot = Object.values(raw).reduce((a, b) => a + b, 0);
    return tot ? Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.round(v / tot * 1000) / 10])) : {};
  }

  $('topicList').querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => {
    const p = $('tp-' + cb.dataset.k);
    if (cb.checked && !+p.value) p.value = 10;
    if (!cb.checked) p.value = '';
    changed();
  }));
  $('topicList').querySelectorAll('.tpct input').forEach(inp => inp.addEventListener('input', () => {
    $('tc-' + inp.id.slice(3)).checked = +inp.value > 0; changed();
  }));
  $('tEqual').onclick = () => {
    const on = usable.filter(k => $('tc-' + k).checked);
    on.forEach((k, i) => { $('tp-' + k).value = Math.floor(100 / on.length) + (i < 100 % on.length ? 1 : 0); });
    changed();
  };
  $('tNone').onclick = () => { usable.forEach(k => { $('tc-' + k).checked = false; $('tp-' + k).value = ''; }); changed(); };
  $('title').addEventListener('input', changed);
  $('mins').addEventListener('input', changed);

  // ---------- Saving and the present link ----------
  function current() {
    return { id: quiz.id, title: $('title').value.trim(), mix: normalMix(), mins: Math.min(60, Math.max(1, Math.round(+$('mins').value || CFG.defaultMinutes))) };
  }
  function save() {
    SAVED.save(current());
    if (!stored) { stored = true; history.replaceState(null, '', 'setup.html?id=' + quiz.id); }
    $('saveState').textContent = 'Saved on this computer';
  }
  function changed() { update(); save(); }

  function update() {
    const q = current(), n = Object.keys(q.mix).length;
    const tot = Object.values(readMix()).reduce((a, b) => a + b, 0);
    $('topicTotal').textContent = !n ? 'Tick at least one topic.'
      : tot === 100 ? `${n} topic${n === 1 ? '' : 's'}, total 100%` : `${n} topic${n === 1 ? '' : 's'}, total ${tot}%. Shares will be scaled to add up to 100%.`;
    const url = new URL('index.html' + SAVED.presentQuery(q), location.href).href;
    $('presentLink').value = n ? url : '';
    $('presentLink').placeholder = 'Tick a topic first';
    $('presentBtn').href = url;
    $('presentBtn').classList.toggle('disabled', !n);
    $('copyLink').disabled = !n;
  }
  $('presentBtn').addEventListener('click', ev => { if ($('presentBtn').classList.contains('disabled')) ev.preventDefault(); else save(); });
  $('copyLink').onclick = async () => {
    try { await navigator.clipboard.writeText($('presentLink').value); } catch (e) { $('presentLink').select(); document.execCommand('copy'); }
    $('copyLink').textContent = 'Copied'; setTimeout(() => { $('copyLink').textContent = 'Copy'; }, 1500);
  };
  update();
  if (!existing) $('title').focus();
})();
