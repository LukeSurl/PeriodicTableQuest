// Periodic Table Quest engine: finds and loads question sets from the questions/ folder.
// You shouldn't need to edit this file.
//
// On GitHub Pages, questions/index.json is written automatically each time the site is
// rebuilt and lists every .js file in questions/ (files starting with _ are ignored).
// Each question file calls PQ.questionSet({...}); its file name (without .js) is its id.
(function () {
  const PQ = window.PQ = window.PQ || {};
  PQ.sets = PQ.sets || {};
  PQ.setStatus = {};   // id -> { ok, error, warnings }

  // Used only when questions/index.json can't be read (e.g. a copy run without GitHub Pages)
  const FALLBACK = ['atoms1', 'atoms1-extension', 'atoms2', 'atoms3', 'atoms4', 'skills1'];
  const VALID_ID = /^[A-Za-z0-9_-]+$/;
  const pending = {};          // id -> promise
  const syntaxErrors = {};     // id -> message

  // question_generators.js is fetched fresh every time (like the question files), so a
  // browser never pairs a new question set with an old saved copy of the generators.
  PQ.generatorsReady = (typeof document !== 'undefined' && document.createElement) ? new Promise(resolve => {
    const s = document.createElement('script');
    s.src = `js/question_generators.js?v=${Date.now()}`;
    s.onload = () => resolve(!PQ.generatorsError);
    s.onerror = () => { PQ.generatorsError = 'js/question_generators.js could not be found.'; resolve(false); };
    document.head.appendChild(s);
  }) : Promise.resolve(true);

  const idFromUrl = url => decodeURIComponent((String(url).split('?')[0].split('/').pop() || '').replace(/\.js$/i, ''));

  window.addEventListener('error', ev => {
    if (ev.filename && /question_generators\.js/.test(ev.filename))
      PQ.generatorsError = `js/question_generators.js has a typing mistake: ${String(ev.message).replace(/^Uncaught /, '')} (line ${ev.lineno})`;
    if (ev.filename && /\/questions\//.test(ev.filename)) syntaxErrors[idFromUrl(ev.filename)] = `${String(ev.message).replace(/^Uncaught /, '')} (line ${ev.lineno})`;
  });

  // Called by each question file
  PQ.questionSet = function (def) {
    const src = document.currentScript && document.currentScript.src;
    const id = (def && def.id) || (src ? idFromUrl(src) : null);
    if (!id) return;
    const warnings = [];
    if (!def || typeof def !== 'object') { PQ.setStatus[id] = { ok: false, error: 'PQ.questionSet() was given nothing to use.' }; return; }
    const set = { ...def, id, title: def.title || id, short: def.short || def.title || id };
    set.generators = (def.generators || []).filter(g => PQ.generators && PQ.generators[g] ? true : (warnings.push(`No generator called "${g}" in js/question_generators.js.`), false));
    set.stealGenerators = (def.stealGenerators || []).filter(g => PQ.stealGenerators && PQ.stealGenerators[g] ? true : (warnings.push(`No steal generator called "${g}" in js/question_generators.js.`), false));
    set.questions = (def.questions || []).filter((q, i) => {
      const n = `Question ${i + 1}`;
      if (!q || typeof q.q !== 'string') return warnings.push(`${n} has no question text (q).`), false;
      if (q.steal) {
        if (typeof q.n !== 'number') return warnings.push(`${n} is a steal question but has no numeric answer (n).`), false;
      } else {
        if (q.a == null) return warnings.push(`${n} has no answer (a).`), false;
        if (!Array.isArray(q.w) || q.w.length < 1) return warnings.push(`${n} needs a list of wrong answers (w).`), false;
        if (q.w.includes(q.a)) return warnings.push(`${n} lists its right answer as a wrong one.`), false;
      }
      const els = q.el == null ? [] : [].concat(q.el);
      const bad = els.filter(s => !PQ.tools.BY_S[s]);
      if (bad.length) warnings.push(`${n} is linked to an unknown element: ${bad.join(', ')}.`);
      return true;
    });
    const total = set.questions.length + set.generators.length + set.stealGenerators.length;
    if (!total) { PQ.setStatus[id] = { ok: false, error: 'It contains no usable questions.', warnings }; return; }
    PQ.sets[id] = set;
    PQ.setStatus[id] = { ok: true, warnings };
  };

  // The ids of all question sets in the folder
  PQ.listSets = async function () {
    try {
      const r = await fetch('questions/index.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      const files = JSON.parse(await r.text());
      PQ.listSource = 'folder';
      return files.map(f => String(f).replace(/\.js$/i, ''));
    } catch (e) {
      PQ.listSource = 'fallback';
      return FALLBACK.slice();
    }
  };

  // Load one set by id; resolves to true if it loaded and is usable
  PQ.loadSet = async function (id) {
    await PQ.generatorsReady;
    return loadSetNow(id);
  };
  function loadSetNow(id) {
    if (PQ.sets[id]) return Promise.resolve(true);
    if (pending[id]) return pending[id];
    if (!VALID_ID.test(id)) {
      PQ.setStatus[id] = { ok: false, error: 'File names may only use letters, numbers, hyphens and underscores.' };
      return Promise.resolve(false);
    }
    pending[id] = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = `questions/${id}.js?v=${Date.now()}`;
      s.onload = () => {
        if (!PQ.setStatus[id]) PQ.setStatus[id] = { ok: false,
          error: syntaxErrors[id] ? `It has a typing mistake: ${syntaxErrors[id]}` : 'It doesn\'t call PQ.questionSet({ ... }).' };
        resolve(!!PQ.sets[id]);
      };
      s.onerror = () => { PQ.setStatus[id] = { ok: false, error: 'The file could not be found.' }; resolve(false); };
      document.head.appendChild(s);
    });
    pending[id].then(ok => { if (!ok) delete pending[id]; });
    return pending[id];
  }

  PQ.loadSets = ids => Promise.all(ids.map(PQ.loadSet));
})();
