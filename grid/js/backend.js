// Quiz Grid data layer. Two interchangeable backends with the same methods:
//  - Firebase Realtime Database (the shared live site; settings in ../js/config.js)
//  - Demo (no setup: quizzes are kept in this browser, and tabs or frames of one
//    browser talk to each other, with the projector page acting as the server)
//
// Where things are kept in Firebase (see database.rules.json):
//   quizzes/<id>         title and questions, without answers: anyone can read
//   answers/<id>         the secret edit key and the correct answers: only editors can read
//   owners/<id>/<uid>    devices that have opened the edit link
//   runs/<code>          one game: meta, players, and points (pts, Quiz Grid) or the
//                        elements each team holds (cells, Periodic Table Quest)
//   proofs/<code>/<uid>  a player's correct answers (Quiz Grid); the database checks each
//                        against answers/<id>, so phones never need to see the answers
//   eproofs/<code>/<uid>/<z>  the latest correct answer a player gave for element z
//                        (Periodic Table Quest); claiming z needs a fresh one
//
// Answers: a multiple-choice answer is the position of the correct option (answers/<id>/a/<i>);
// a number answer is { v, tol, pct } (answers/<id>/n/<i>) plus the range the database accepts
// (answers/<id>/lo/<i> and hi/<i>). In this file an answer is either a number or { v, tol, pct }.
(function () {
  const CFG = window.PQ_CONFIG || {};
  const FB_VER = '10.12.2';
  const FB = p => `https://www.gstatic.com/firebasejs/${FB_VER}/firebase-${p}.js`;
  const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
  const rand = (n, set = 'abcdefghijkmnpqrstuvwxyz23456789') => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => set[b % set.length]).join('');
  const newQuizId = () => rand(10);
  const newKey = () => rand(24);
  const newRunCode = () => rand(4, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');

  function balancedTeam(players) {
    let a = 0, b = 0;
    Object.values(players || {}).forEach(p => p.t === 'a' ? a++ : b++);
    if (a === b) return Math.random() < 0.5 ? 'a' : 'b';
    return a < b ? 'a' : 'b';
  }
  const asArray = v => (Array.isArray(v) ? v : v ? Object.keys(v).sort((x, y) => x - y).map(k => v[k]) : []);
  // Answers keep their question numbers even if some are missing: { 0: 2, 3: 1 } → [2, , , 1]
  const indexed = v => { const out = []; if (v) Object.keys(v).forEach(k => { if (v[k] != null) out[+k] = v[k]; }); return out; };
  // Options keep their positions (the answer is stored as a position), with any gaps as empty strings
  const optsOf = v => { const o = indexed(v); for (let j = 0; j < o.length; j++) if (o[j] == null) o[j] = ''; return o; };
  // Firebase may hand back { "8": true, "9": true } as an array, so turn element lists back into objects
  const elsObj = v => { const o = {}; if (v) Object.keys(v).forEach(k => { if (v[k] && +k >= 1 && +k <= 118) o[k] = true; }); return o; };
  const cleanQuiz = q => ({ title: (q && q.title) || '', type: (q && q.type) || 'grid',
    qs: asArray(q && q.qs).map(x => ({ text: '', label: '', img: '', kind: 'mc', unit: '', ...x, opts: optsOf(x && x.opts), els: elsObj(x && x.els), steal: !!(x && x.steal) })) });
  // A quiz ready to store: drop empty extras so old readers and the rules see what they expect
  const storeQuiz = quiz => ({ title: quiz.title || 'Untitled quiz', type: quiz.type || 'grid',
    qs: quiz.qs.map(q => {
      const o = { text: q.text, opts: q.kind === 'num' ? [] : q.opts, label: q.label || '', img: q.img || '', ready: !!q.ready };
      if (q.kind === 'num') { o.kind = 'num'; o.unit = q.unit || ''; }
      if (q.steal) o.steal = true;
      if (q.els && Object.keys(q.els).length) o.els = elsObj(q.els);
      return o;
    }) });
  // Answers ready to store: { a: {i: option}, n: {i: {v, tol, pct}}, lo: {i: …}, hi: {i: …} }
  function storeAnswers(answers) {
    const out = { a: {}, n: {}, lo: {}, hi: {} };
    answers.forEach((v, i) => {
      if (typeof v === 'number') out.a[i] = v;
      else if (v && isFinite(v.v)) {
        const r = window.GQ.numRange(v);
        out.n[i] = { v: +v.v, tol: Math.abs(+v.tol || 0), pct: !!v.pct }; out.lo[i] = r.lo; out.hi[i] = r.hi;
      }
    });
    return out;
  }
  const readAnswers = (a, n) => { const out = indexed(a); indexed(n).forEach((v, i) => { if (v) out[i] = { v: v.v, tol: v.tol || 0, pct: !!v.pct }; }); return out; };
  // Is answer a right? (demo mode; Firebase checks this in its rules)
  const isRight = (ans, a) => typeof ans === 'number' ? ans === a
    : !!ans && typeof a === 'number' && (r => a >= r.lo && a <= r.hi)(window.GQ.numRange(ans));

  // ---------- Firebase ----------
  async function firebaseBackend() {
    const [{ initializeApp }, A, D] = await Promise.all([import(FB('app')), import(FB('auth')), import(FB('database'))]);
    const app = initializeApp(CFG.firebase, 'quizgrid');
    const auth = A.getAuth(app), db = D.getDatabase(app);
    const user = await new Promise((res, rej) => {
      const off = A.onAuthStateChanged(auth, u => { if (u) { off(); res(u); } });
      A.signInAnonymously(auth).catch(rej);
    });
    let offset = 0, connected = true, connCb = () => {};
    D.onValue(D.ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0; });
    D.onValue(D.ref(db, '.info/connected'), s => { connected = !!s.val(); connCb(connected); });
    const r = p => D.ref(db, p);
    const timeout = (p, ms = 10000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
    const isDenied = e => /permission/i.test(String(e && (e.code || e.message)));

    return {
      mode: 'firebase', uid: user.uid,
      now: () => Date.now() + offset,
      onConnection(cb) { connCb = cb; cb(connected); },

      // ----- Quizzes -----
      async createQuiz(title, type) {
        const id = newQuizId(), k = newKey();
        await D.set(r(`answers/${id}`), { k });
        await D.set(r(`owners/${id}/${user.uid}`), k);
        await D.set(r(`quizzes/${id}`), { title: title || 'Untitled quiz', type: type || 'grid', updated: D.serverTimestamp() });
        return { id, k };
      },
      async openQuiz(id, k) {
        try { await D.set(r(`owners/${id}/${user.uid}`), k); }
        catch (e) { throw new Error(isDenied(e) ? 'badlink' : e.message); }
        const [q, a, n] = await Promise.all([D.get(r(`quizzes/${id}`)), D.get(r(`answers/${id}/a`)), D.get(r(`answers/${id}/n`))]);
        if (!q.exists()) throw new Error('badlink');
        return { quiz: cleanQuiz(q.val()), answers: readAnswers(a.val(), n.val()) };
      },
      async saveQuiz(id, quiz, answers) {
        await timeout(D.set(r(`quizzes/${id}`), { ...storeQuiz(quiz), updated: D.serverTimestamp() }));
        await timeout(D.update(r(`answers/${id}`), storeAnswers(answers)));
      },
      // Delete a quiz for good (needs its edit key). Its answers stay behind, unreadable without the quiz.
      async deleteQuiz(id, k) {
        if (k) await timeout(D.set(r(`owners/${id}/${user.uid}`), k));
        await timeout(D.remove(r(`quizzes/${id}`)));
      },
      watchQuiz(id, cb) { return D.onValue(r(`quizzes/${id}`), s => cb(s.exists() ? cleanQuiz(s.val()) : null)); },

      // ----- Games -----
      newRunCode,
      async createRun(code, quizId, extra) {
        await D.set(r(`runs/${code}`), { meta: { host: user.uid, quiz: quizId, status: 'lobby', endsAt: 0, created: D.serverTimestamp(), ...(extra || {}) } });
      },
      async getRunMeta(code) { return (await D.get(r(`runs/${code}/meta`))).val(); },
      updateMeta: (code, patch) => D.update(r(`runs/${code}/meta`), patch),
      async clearRun(code) {
        await D.remove(r(`runs/${code}/pts`)); await D.remove(r(`runs/${code}/cells`));
        await D.remove(r(`proofs/${code}`)); await D.remove(r(`eproofs/${code}`));
      },
      async deleteRun(code) {
        await D.remove(r(`proofs/${code}`)).catch(() => {}); await D.remove(r(`eproofs/${code}`)).catch(() => {});
        await D.remove(r(`runs/${code}`));
      },
      watchRun(code, cb) {
        const st = { meta: undefined, players: {}, pts: {}, cells: {}, mine: {} };
        const offs = ['meta', 'players', 'pts', 'cells'].map(part => D.onValue(r(`runs/${code}/${part}`), s => {
          st[part] = part === 'meta' ? s.val() : (s.val() || {}); cb(st, part);
        }));
        offs.push(D.onValue(r(`proofs/${code}/${user.uid}`), s => { st.mine = s.val() || {}; cb(st, 'mine'); }, () => {}));
        return () => offs.forEach(o => o());
      },
      async join(code) {
        const mine = (await D.get(r(`runs/${code}/players/${user.uid}`))).val();
        if (mine) return mine.t;
        const t = balancedTeam((await D.get(r(`runs/${code}/players`))).val());
        await D.set(r(`runs/${code}/players/${user.uid}`), { t, at: D.serverTimestamp() });
        return t;
      },
      // Returns 'right' or 'wrong'. The database only accepts a proof that matches the answer.
      async answer(code, q, a) {
        try { await timeout(D.set(r(`proofs/${code}/${user.uid}/${q}`), { a, at: D.serverTimestamp() })); return 'right'; }
        catch (e) {
          if (!isDenied(e)) throw e;
          // Refused: work out why, so a student is only told "wrong" when the answer was wrong
          const done = (await D.get(r(`proofs/${code}/${user.uid}/${q}`)).catch(() => null));
          if (done && done.exists()) return 'right';
          const [meta, me] = await Promise.all([D.get(r(`runs/${code}/meta`)), D.get(r(`runs/${code}/players/${user.uid}`))]);
          const m = meta.val();
          if (!m || m.status !== 'open' || Date.now() + offset >= m.endsAt) return 'closed';
          if (!me.exists()) return 'notjoined';
          return 'wrong';
        }
      },
      // After a right answer: add this player's point for the team. Returns 'scored', or
      // 'already' if they had scored on this question before (each player once per question).
      async award(code, q, t) {
        try { await timeout(D.set(r(`runs/${code}/pts/${q}/${user.uid}`), { t, at: D.serverTimestamp() })); return 'scored'; }
        catch (e) {
          if (!isDenied(e)) throw e;
          // Refused: only say "already" if there really is an earlier point
          const mine = await D.get(r(`runs/${code}/pts/${q}/${user.uid}`)).catch(() => null);
          if (mine && mine.exists()) return 'already';
          console.warn('Quiz Grid: the database refused this point. If this keeps happening, publish the latest database.rules.json in the Firebase console.', e);
          return 'refused';
        }
      },

      // ----- Periodic Table Quest -----
      // Answer question q while trying to claim element z. Returns 'right', 'wrong', 'closed' or 'notjoined'.
      async answerEl(code, z, q, a) {
        try { await timeout(D.set(r(`eproofs/${code}/${user.uid}/${z}`), { q: String(q), a, at: D.serverTimestamp() })); return 'right'; }
        catch (e) {
          if (!isDenied(e)) throw e;
          const [meta, me] = await Promise.all([D.get(r(`runs/${code}/meta`)), D.get(r(`runs/${code}/players/${user.uid}`))]);
          const m = meta.val();
          if (!m || m.status === 'ended' || (m.status === 'open' && Date.now() + offset >= m.endsAt)) return 'closed';
          if (!me.exists()) return 'notjoined';
          return 'wrong';
        }
      },
      // After a right answer: take element z for team t. Returns 'ok', or why not:
      // 'yours', 'shielded', 'ended', 'lobby' or 'refused'
      async claim(code, z, t) {
        try { await timeout(D.set(r(`runs/${code}/cells/${z}`), { t, by: user.uid, at: D.serverTimestamp() })); return 'ok'; }
        catch (e) {
          if (!isDenied(e)) throw e;
          const [meta, cell] = await Promise.all([D.get(r(`runs/${code}/meta`)), D.get(r(`runs/${code}/cells/${z}`))]);
          const m = meta.val() || {}, c = cell.val();
          if (m.status === 'lobby') return 'lobby';
          if (m.status !== 'open' || Date.now() + offset >= m.endsAt) return 'ended';
          if (c && c.t === t) return 'yours';
          if (c && Date.now() + offset < c.at + (m.shield || 0) + 500) return 'shielded';
          console.warn('Periodic Table Quest: the database refused this claim. If this keeps happening, publish the latest database.rules.json in the Firebase console.', e);
          return 'refused';
        }
      }
    };
  }

  // ---------- Demo (in this browser only) ----------
  function demoBackend() {
    const QKEY = 'gq-demo-quizzes';
    const all = () => safe(() => JSON.parse(localStorage.getItem(QKEY)) || {}, {});
    const putAll = v => safe(() => localStorage.setItem(QKEY, JSON.stringify(v)));
    const listeners = new Set(), seen = new Set();
    let bc = null;
    safe(() => { bc = new BroadcastChannel('gq-demo'); bc.onmessage = ev => deliver(ev.data); });
    window.addEventListener('message', ev => { if (ev.data && ev.data.__gq) deliver(ev.data); });
    function deliver(msg) { if (!msg || seen.has(msg.id)) return; seen.add(msg.id); listeners.forEach(l => l(msg)); }
    function send(msg) {
      msg = { ...msg, id: rand(12), __gq: true }; seen.add(msg.id);
      if (bc) safe(() => bc.postMessage(msg));
      if (window.parent !== window) safe(() => window.parent.postMessage(msg, '*'));
    }
    const on = fn => { listeners.add(fn); return () => listeners.delete(fn); };
    const uid = safe(() => {
      const key = 'gq-demo-uid' + (new URLSearchParams(location.search).get('p') || '');
      let u = sessionStorage.getItem(key);
      if (!u) { u = 'd' + rand(8); sessionStorage.setItem(key, u); }
      return u;
    }, 'd' + rand(8));

    // The projector page holds each game's state and answers requests from phones
    let server = null;
    const watchers = [];
    function publish() {
      const st = JSON.parse(JSON.stringify(server.state));
      watchers.forEach(w => w(st));
      send({ type: 'state', code: server.code, state: st });
    }
    on(msg => {
      if (!server || msg.code !== server.code) return;
      const S = server.state;
      const reply = extra => send({ to: msg.uid, req: msg.req, type: msg.type + 'ed', ...extra });
      if (msg.type === 'hello') send({ type: 'state', code: server.code, state: S });
      if (msg.type === 'join') {
        if (!S.players[msg.uid]) S.players[msg.uid] = { t: balancedTeam(S.players), at: Date.now() };
        reply({ t: S.players[msg.uid].t }); publish();
      }
      if (msg.type === 'answer') {
        const entry = all()[S.meta.quiz];
        const open = S.meta.status === 'open' && Date.now() < S.meta.endsAt;
        const right = open && S.players[msg.uid] && entry && isRight(entry.answers[msg.q], msg.a);
        if (right) { S.proofs[msg.uid] = S.proofs[msg.uid] || {}; S.proofs[msg.uid][msg.q] = { a: msg.a, at: Date.now() }; }
        reply({ result: right ? 'right' : !open ? 'closed' : !S.players[msg.uid] ? 'notjoined' : 'wrong' });
        if (right) publish();
      }
      if (msg.type === 'award') {
        const p = S.players[msg.uid], ok = p && p.t === msg.t && S.proofs[msg.uid] && S.proofs[msg.uid][msg.q] && !(S.pts[msg.q] && S.pts[msg.q][msg.uid]) && S.meta.status === 'open';
        if (ok) { S.pts[msg.q] = S.pts[msg.q] || {}; S.pts[msg.q][msg.uid] = { t: msg.t, at: Date.now() }; }
        reply({ result: ok ? 'scored' : 'already' });
        if (ok) publish();
      }
      if (msg.type === 'answerEl') {
        const entry = all()[S.meta.quiz], q = entry && entry.quiz.qs[msg.q];
        const live = S.meta.status === 'lobby' || (S.meta.status === 'open' && Date.now() < S.meta.endsAt);
        const fits = q && (!q.els || !Object.keys(q.els).length || q.els[msg.z]);
        const right = live && S.players[msg.uid] && fits && isRight(entry.answers[msg.q], msg.a);
        if (right) { S.eproofs[msg.uid] = S.eproofs[msg.uid] || {}; S.eproofs[msg.uid][msg.z] = { q: String(msg.q), a: msg.a, at: Date.now() }; }
        reply({ result: right ? 'right' : !live ? 'closed' : !S.players[msg.uid] ? 'notjoined' : 'wrong' });
      }
      if (msg.type === 'claim') {
        const p = S.players[msg.uid], c = S.cells[msg.z], now = Date.now();
        const proof = S.eproofs[msg.uid] && S.eproofs[msg.uid][msg.z];
        let result = 'ok';
        if (S.meta.status === 'lobby') result = 'lobby';
        else if (S.meta.status !== 'open' || now >= S.meta.endsAt) result = 'ended';
        else if (c && c.t === msg.t) result = 'yours';
        else if (c && now < c.at + (S.meta.shield || 0)) result = 'shielded';
        else if (!p || p.t !== msg.t || !proof || proof.at < now - 60000 || (c && proof.at <= c.at)) result = 'refused';
        if (result === 'ok') { S.cells[msg.z] = { t: msg.t, by: msg.uid, at: now }; publish(); }
        reply({ result });
      }
    });
    function request(msg) {
      const req = rand(12);
      return new Promise((resolve, reject) => {
        const off = on(m => { if (m.req === req && m.to === uid) { off(); clearTimeout(tm); resolve(m); } });
        const tm = setTimeout(() => { off(); reject(new Error('No projector page is running this demo game.')); }, 4000);
        send({ ...msg, req, uid });
      });
    }

    const quizWatchers = {};
    window.addEventListener('storage', ev => { if (ev.key === QKEY) Object.entries(quizWatchers).forEach(([id, cbs]) => cbs.forEach(cb => cb(all()[id] ? cleanQuiz(all()[id].quiz) : null))); });
    let myProofs = {};

    return {
      mode: 'demo', uid,
      now: () => Date.now(),
      onConnection(cb) { cb(true); },

      async createQuiz(title, type) {
        const id = newQuizId(), k = newKey(), q = all();
        q[id] = { k, quiz: { title: title || 'Untitled quiz', type: type || 'grid', qs: [] }, answers: [] }; putAll(q);
        return { id, k };
      },
      async openQuiz(id, k) {
        const e = all()[id];
        if (!e || e.k !== k) throw new Error('badlink');
        return { quiz: cleanQuiz(e.quiz), answers: e.answers || [] };
      },
      async saveQuiz(id, quiz, answers) {
        const q = all(); if (!q[id]) throw new Error('This quiz no longer exists.');
        q[id].quiz = JSON.parse(JSON.stringify(storeQuiz(quiz))); q[id].answers = answers; putAll(q);
        (quizWatchers[id] || []).forEach(cb => cb(cleanQuiz(q[id].quiz)));
      },
      async deleteQuiz(id) { const q = all(); delete q[id]; putAll(q); },
      watchQuiz(id, cb) {
        (quizWatchers[id] = quizWatchers[id] || []).push(cb);
        setTimeout(() => cb(all()[id] ? cleanQuiz(all()[id].quiz) : null), 0);
        return () => { quizWatchers[id] = quizWatchers[id].filter(f => f !== cb); };
      },
      // Demo only: put a ready-made quiz in place
      seedQuiz(id, k, quiz, answers) { const q = all(); q[id] = { k, quiz, answers }; putAll(q); },

      newRunCode,
      async createRun(code, quizId, extra) {
        server = { code, state: { meta: { host: uid, quiz: quizId, status: 'lobby', endsAt: 0, created: Date.now(), ...(extra || {}) }, players: {}, pts: {}, cells: {}, proofs: {}, eproofs: {} } };
        publish();
      },
      async getRunMeta(code) { return server && server.code === code ? server.state.meta : null; },
      async updateMeta(code, patch) { Object.assign(server.state.meta, patch); publish(); },
      async clearRun() { Object.assign(server.state, { pts: {}, cells: {}, proofs: {}, eproofs: {} }); publish(); send({ type: 'cleared', code: server.code }); },
      async deleteRun() { server = null; },
      watchRun(code, cb) {
        if (server && server.code === code) {
          const w = st => ['meta', 'players', 'pts', 'cells'].forEach(p => cb({ ...st, mine: {} }, p));
          watchers.push(w); w(JSON.parse(JSON.stringify(server.state)));
          return () => watchers.splice(watchers.indexOf(w), 1);
        }
        let got = false;
        const off = on(m => {
          if (m.type === 'cleared' && m.code === code) { myProofs = {}; }
          if (m.type === 'state' && m.code === code) {
            got = true;
            myProofs = (m.state.proofs && m.state.proofs[uid]) || {};
            const st = { meta: m.state.meta, players: m.state.players || {}, pts: m.state.pts || {}, cells: m.state.cells || {}, mine: myProofs };
            ['meta', 'players', 'pts', 'cells', 'mine'].forEach(p => cb(st, p));
          }
        });
        const ask = () => { if (!got) { send({ type: 'hello', code }); setTimeout(ask, 1500); } };
        ask();
        setTimeout(() => { if (!got) cb({ meta: null, players: {}, pts: {}, cells: {}, mine: {} }, 'meta'); }, 5000);
        return off;
      },
      async join(code) { return (await request({ type: 'join', code })).t; },
      async answer(code, q, a) { const m = await request({ type: 'answer', code, q, a }); return m.result; },
      async award(code, q, t) { return (await request({ type: 'award', code, q, t })).result; },
      async answerEl(code, z, q, a) { return (await request({ type: 'answerEl', code, z, q, a })).result; },
      async claim(code, z, t) { return (await request({ type: 'claim', code, z, t })).result; }
    };
  }

  async function create() {
    if (CFG.firebase && !new URLSearchParams(location.search).has('demo')) return firebaseBackend();
    return demoBackend();
  }
  window.GQ_BACKEND = { create };
})();
