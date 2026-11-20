// Periodic Table Quest: quizzes saved in this browser (made on setup.html, listed on the
// Pre-Lecture Quizzes home page). A saved quiz is just a name, a topic mix and a countdown;
// its present link carries all three, so it works on any computer.
(function () {
  const KEY = 'pq-mine';
  const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
  const list = () => safe(() => JSON.parse(localStorage.getItem(KEY)) || [], []);
  const write = l => safe(() => localStorage.setItem(KEY, JSON.stringify(l.slice(0, 50))));
  const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

  // The query string for index.html, e.g. ?name=Lecture+4&mix=atoms3:70,atoms2:30&mins=10
  function presentQuery(q) {
    const p = new URLSearchParams();
    if (q.title) p.set('name', q.title);
    const mix = Object.entries(q.mix || {}).filter(([, w]) => +w > 0).map(([k, w]) => `${k}:${Math.round(+w * 10) / 10}`).join(',');
    if (mix) p.set('mix', mix);
    if (q.mins) p.set('mins', q.mins);
    return '?' + p.toString();
  }
  // The other way round, for the projector: { name, mix, mins } from its own address
  function fromQuery(search) {
    const p = new URLSearchParams(search), out = {};
    if (p.get('name')) out.name = p.get('name').slice(0, 80);
    if (p.get('mix')) {
      const mix = {};
      p.get('mix').split(',').forEach(part => { const [k, w] = part.split(':'); if (/^[A-Za-z0-9_-]+$/.test(k || '') && +w > 0) mix[k] = +w; });
      if (Object.keys(mix).length) out.mix = mix;
    }
    if (+p.get('mins') > 0) out.mins = Math.min(60, Math.round(+p.get('mins')));
    return out;
  }

  window.PQ_SAVED = {
    KEY, list, newId, presentQuery, fromQuery,
    get: id => list().find(q => q.id === id) || null,
    save(q) { const l = list().filter(x => x.id !== q.id); l.unshift({ ...q, at: Date.now() }); write(l); },
    remove(id) { write(list().filter(x => x.id !== id)); }
  };
})();
