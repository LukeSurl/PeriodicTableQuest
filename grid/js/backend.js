// Quiz Grid data layer. Two interchangeable backends with the same methods:
//  - Firebase Realtime Database (the shared live site; settings in ../js/config.js)
//  - Demo (no setup: quizzes are kept in this browser, and tabs or frames of one
//    browser talk to each other, with the projector page acting as the server)
//
// Where things are kept in Firebase (see database.rules.json):
//   quizzes/<id>         title and questions, without answers: anyone can read
//   answers/<id>         the secret edit key and the correct answers: only editors can read
//   owners/<id>/<uid>    devices that have opened the edit link
//   runs/<code>          one game: meta, players and points (pts)
//   proofs/<code>/<uid>  a player's correct answers; the database checks each against
//                        answers/<id>, so phones never need to see the answers
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
  const cleanQuiz = q => ({ title: (q && q.title) || '', qs: asArray(q && q.qs).map(x => ({ text: '', label: '', img: '', ...x, opts: optsOf(x && x.opts) })) });

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
      async createQuiz(title) {
        const id = newQuizId(), k = newKey();
        await D.set(r(`answers/${id}`), { k });
        await D.set(r(`owners/${id}/${user.uid}`), k);
        await D.set(r(`quizzes/${id}`), { title: title || 'Untitled quiz', updated: D.serverTimestamp() });
        return { id, k };
      },
      async openQuiz(id, k) {
        try { await D.set(r(`owners/${id}/${user.uid}`), k); }
        catch (e) { throw new Error(isDenied(e) ? 'badlink' : e.message); }
        const [q, a] = await Promise.all([D.get(r(`quizzes/${id}`)), D.get(r(`answers/${id}/a`))]);
        if (!q.exists()) throw new Error('badlink');
        return { quiz: cleanQuiz(q.val()), answers: indexed(a.val()) };
      },
      async saveQuiz(id, quiz, answers) {
        await timeout(D.set(r(`quizzes/${id}`), { title: quiz.title || 'Untitled quiz', qs: quiz.qs, updated: D.serverTimestamp() }));
        await timeout(D.set(r(`answers/${id}/a`), Object.fromEntries(answers.map((v, i) => [i, v]).filter(([, v]) => v != null))));
      },
      async deleteQuiz(id) { await D.remove(r(`quizzes/${id}`)); },
      watchQuiz(id, cb) { return D.onValue(r(`quizzes/${id}`), s => cb(s.exists() ? cleanQuiz(s.val()) : null)); },

      // ----- Games -----
      newRunCode,
      async createRun(code, quizId) {
        await D.set(r(`runs/${code}`), { meta: { host: user.uid, quiz: quizId, status: 'lobby', endsAt: 0, created: D.serverTimestamp() } });
      },
      async getRunMeta(code) { return (await D.get(r(`runs/${code}/meta`))).val(); },
      updateMeta: (code, patch) => D.update(r(`runs/${code}/meta`), patch),
      async clearRun(code) { await D.remove(r(`runs/${code}/pts`)); await D.remove(r(`proofs/${code}`)); },
      async deleteRun(code) { await D.remove(r(`proofs/${code}`)).catch(() => {}); await D.remove(r(`runs/${code}`)); },
      watchRun(code, cb) {
        const st = { meta: undefined, players: {}, pts: {}, mine: {} };
        const offs = ['meta', 'players', 'pts'].map(part => D.onValue(r(`runs/${code}/${part}`), s => {
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
        catch (e) { if (isDenied(e)) return 'already'; throw e; }
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
        const right = open && S.players[msg.uid] && entry && entry.answers[msg.q] === msg.a;
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

      async createQuiz(title) {
        const id = newQuizId(), k = newKey(), q = all();
        q[id] = { k, quiz: { title: title || 'Untitled quiz', qs: [] }, answers: [] }; putAll(q);
        return { id, k };
      },
      async openQuiz(id, k) {
        const e = all()[id];
        if (!e || e.k !== k) throw new Error('badlink');
        return { quiz: cleanQuiz(e.quiz), answers: e.answers || [] };
      },
      async saveQuiz(id, quiz, answers) {
        const q = all(); if (!q[id]) throw new Error('This quiz no longer exists.');
        q[id].quiz = JSON.parse(JSON.stringify(quiz)); q[id].answers = answers; putAll(q);
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
      async createRun(code, quizId) {
        server = { code, state: { meta: { host: uid, quiz: quizId, status: 'lobby', endsAt: 0, created: Date.now() }, players: {}, pts: {}, proofs: {} } };
        publish();
      },
      async getRunMeta(code) { return server && server.code === code ? server.state.meta : null; },
      async updateMeta(code, patch) { Object.assign(server.state.meta, patch); publish(); },
      async clearRun() { server.state.pts = {}; server.state.proofs = {}; publish(); send({ type: 'cleared', code: server.code }); },
      async deleteRun() { server = null; },
      watchRun(code, cb) {
        if (server && server.code === code) {
          const w = st => ['meta', 'players', 'pts'].forEach(p => cb({ ...st, mine: {} }, p));
          watchers.push(w); w(JSON.parse(JSON.stringify(server.state)));
          return () => watchers.splice(watchers.indexOf(w), 1);
        }
        let got = false;
        const off = on(m => {
          if (m.type === 'cleared' && m.code === code) { myProofs = {}; }
          if (m.type === 'state' && m.code === code) {
            got = true;
            myProofs = (m.state.proofs && m.state.proofs[uid]) || {};
            const st = { meta: m.state.meta, players: m.state.players || {}, pts: m.state.pts || {}, mine: myProofs };
            ['meta', 'players', 'pts', 'mine'].forEach(p => cb(st, p));
          }
        });
        const ask = () => { if (!got) { send({ type: 'hello', code }); setTimeout(ask, 1500); } };
        ask();
        setTimeout(() => { if (!got) cb({ meta: null, players: {}, pts: {}, mine: {} }, 'meta'); }, 5000);
        return off;
      },
      async join(code) { return (await request({ type: 'join', code })).t; },
      async answer(code, q, a) { const m = await request({ type: 'answer', code, q, a }); return m.result; },
      async award(code, q, t) { return (await request({ type: 'award', code, q, t })).result; }
    };
  }

  async function create() {
    if (CFG.firebase && !new URLSearchParams(location.search).has('demo')) return firebaseBackend();
    return demoBackend();
  }
  window.GQ_BACKEND = { create };
})();
