// Data layer. Two interchangeable backends:
//  - Firebase Realtime Database (live, for real lectures)
//  - Demo (no setup; tabs/frames of one browser talk to each other, the projector acts as server)
(function () {
  const CFG = window.PQ_CONFIG;
  const FB_VER = '10.12.2';
  const FB = p => `https://www.gstatic.com/firebasejs/${FB_VER}/firebase-${p}.js`;

  const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };
  const randId = (n = 12) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => (b % 36).toString(36)).join('');

  // ---------- Shared rule check (mirrors database.rules.json) ----------
  // Returns {ok:true, steal:bool} or {ok:false, reason, wait?}
  function canClaim(state, uid, z, now) {
    const m = state.meta;
    if (!m) return { ok: false, reason: 'nogame' };
    if (m.status !== 'open') return { ok: false, reason: m.status === 'ended' ? 'ended' : 'notstarted' };
    if (now >= m.endsAt) return { ok: false, reason: 'ended' };
    const p = state.players && state.players[uid];
    if (!p) return { ok: false, reason: 'noteam' };
    const c = state.cells && state.cells[z];
    if (!c) return { ok: true, steal: false };
    if (c.t === p.t) return { ok: false, reason: 'yours' };
    if (!m.steal) return { ok: false, reason: 'taken' };
    const until = c.at + m.shield;
    if (now < until) return { ok: false, reason: 'shielded', wait: Math.ceil((until - now) / 1000) };
    return { ok: true, steal: true };
  }

  function balancedTeam(players) {
    let a = 0, b = 0;
    Object.values(players || {}).forEach(p => p.t === 'a' ? a++ : b++);
    if (a === b) return Math.random() < 0.5 ? 'a' : 'b';
    return a < b ? 'a' : 'b';
  }

  // ---------- Firebase ----------
  async function firebaseBackend() {
    const [{ initializeApp }, A, D] = await Promise.all([import(FB('app')), import(FB('auth')), import(FB('database'))]);
    const app = initializeApp(CFG.firebase);
    const auth = A.getAuth(app);
    const db = D.getDatabase(app);
    const user = await new Promise((res, rej) => {
      const off = A.onAuthStateChanged(auth, u => { if (u) { off(); res(u); } });
      A.signInAnonymously(auth).catch(rej);
    });
    let offset = 0;
    D.onValue(D.ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0; });
    let connected = true, connCb = () => {};
    D.onValue(D.ref(db, '.info/connected'), s => { connected = !!s.val(); connCb(connected); });
    const r = p => D.ref(db, p);
    const g = code => `games/${code}`;
    const cache = {};

    return {
      mode: 'firebase',
      uid: user.uid,
      now: () => Date.now() + offset,
      onConnection(cb) { connCb = cb; cb(connected); },
      async createGame(code, meta) {
        await D.set(r(g(code)), { meta: { ...meta, host: user.uid, created: D.serverTimestamp() } });
      },
      async getMeta(code) { return (await D.get(r(g(code) + '/meta'))).val(); },
      updateMeta: (code, patch) => D.update(r(g(code) + '/meta'), patch),
      resetBoard: code => D.remove(r(g(code) + '/cells')),
      deleteGame: code => D.remove(r(g(code))),
      watch(code, parts, cb) {
        const st = cache[code] = cache[code] || { meta: undefined, cells: {}, players: {} };
        const offs = parts.map(part => D.onValue(r(`${g(code)}/${part}`), s => {
          st[part] = part === 'meta' ? s.val() : (s.val() || {});
          cb(st, part);
        }));
        return () => offs.forEach(o => o());
      },
      async join(code) {
        const mine = (await D.get(r(`${g(code)}/players/${user.uid}`))).val();
        if (mine) return mine.t;
        const players = (await D.get(r(`${g(code)}/players`))).val();
        const t = balancedTeam(players);
        await D.set(r(`${g(code)}/players/${user.uid}`), { t, at: D.serverTimestamp() });
        return t;
      },
      async claim(code, z, team) {
        try {
          await Promise.race([
            D.set(r(`${g(code)}/cells/${z}`), { t: team, by: user.uid, at: D.serverTimestamp() }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
          ]);
          return { ok: true };
        } catch (e) {
          // Work out why the database refused it
          const [meta, cell] = await Promise.all([D.get(r(g(code) + '/meta')), D.get(r(`${g(code)}/cells/${z}`))]);
          const why = canClaim({ meta: meta.val(), players: { [user.uid]: { t: team } }, cells: { [z]: cell.val() } }, user.uid, z, Date.now() + offset);
          return { ok: false, reason: why.ok ? 'error' : why.reason, wait: why.wait, by: cell.val() && cell.val().t };
        }
      }
    };
  }

  // ---------- Demo (in-browser) ----------
  function demoBackend() {
    const listeners = new Set();
    const seen = new Set();
    let bc = null;
    safe(() => { bc = new BroadcastChannel('pq-demo'); bc.onmessage = ev => deliver(ev.data); });
    window.addEventListener('message', ev => { if (ev.data && ev.data.__pq) deliver(ev.data); });
    function deliver(msg) {
      if (!msg || seen.has(msg.id)) return;
      seen.add(msg.id);
      listeners.forEach(l => l(msg));
    }
    function send(msg) {
      msg = { ...msg, id: randId(), __pq: true };
      seen.add(msg.id);
      if (bc) safe(() => bc.postMessage(msg));
      if (window.parent !== window) safe(() => window.parent.postMessage(msg, '*'));
    }
    const on = fn => { listeners.add(fn); return () => listeners.delete(fn); };

    const uid = safe(() => {
      const key = 'pq-demo-uid' + (new URLSearchParams(location.search).get('p') || '');
      let u = sessionStorage.getItem(key);
      if (!u) { u = 'd' + randId(8); sessionStorage.setItem(key, u); }
      return u;
    }, 'd' + randId(8));

    // Server role (the projector page)
    let server = null;
    const watchers = [];
    function publish() {
      const st = JSON.parse(JSON.stringify(server.state));
      watchers.forEach(w => w(st));
      send({ type: 'state', code: server.code, state: st });
    }
    function serve(msg) {
      if (!server || msg.code !== server.code) return;
      const S = server.state;
      if (msg.type === 'hello') send({ type: 'state', code: server.code, state: S });
      if (msg.type === 'join') {
        if (!S.players[msg.uid]) S.players[msg.uid] = { t: balancedTeam(S.players), at: Date.now() };
        send({ type: 'joined', to: msg.uid, req: msg.req, t: S.players[msg.uid].t });
        publish();
      }
      if (msg.type === 'claim') {
        const res = canClaim(S, msg.uid, msg.z, Date.now());
        if (res.ok) S.cells[msg.z] = { t: S.players[msg.uid].t, by: msg.uid, at: Date.now() };
        const c = S.cells[msg.z];
        send({ type: 'claimed', to: msg.uid, req: msg.req, ok: res.ok, reason: res.reason, wait: res.wait, by: c && c.t });
        if (res.ok) publish();
      }
    }
    on(serve);

    function request(msg, replyType) {
      const req = randId();
      return new Promise((resolve, reject) => {
        const off = on(m => { if (m.type === replyType && m.req === req) { off(); clearTimeout(tm); resolve(m); } });
        const tm = setTimeout(() => { off(); reject(new Error('No projector page is running this demo game.')); }, 4000);
        send({ ...msg, req, uid });
      });
    }

    return {
      mode: 'demo',
      uid,
      now: () => Date.now(),
      onConnection(cb) { cb(true); },
      async createGame(code, meta) {
        server = { code, state: { meta: { ...meta, host: uid, created: Date.now() }, players: {}, cells: {} } };
        publish();
      },
      async getMeta(code) { return server && server.code === code ? server.state.meta : null; },
      async updateMeta(code, patch) { Object.assign(server.state.meta, patch); publish(); },
      async resetBoard() { server.state.cells = {}; publish(); },
      async deleteGame() { server = null; },
      watch(code, parts, cb) {
        if (server && server.code === code) {
          const w = st => { parts.forEach(p => cb(st, p)); };
          watchers.push(w); w(JSON.parse(JSON.stringify(server.state)));
          return () => watchers.splice(watchers.indexOf(w), 1);
        }
        let got = false;
        const off = on(m => {
          if (m.type === 'state' && m.code === code) { got = true; parts.forEach(p => cb({ ...m.state, cells: m.state.cells || {}, players: m.state.players || {} }, p)); }
        });
        const ask = () => { if (!got) { send({ type: 'hello', code }); setTimeout(ask, 1500); } };
        ask();
        setTimeout(() => { if (!got) cb({ meta: null, cells: {}, players: {} }, 'meta'); }, 5000);
        return off;
      },
      async join(code) { return (await request({ type: 'join', code }, 'joined')).t; },
      async claim(code, z) {
        const m = await request({ type: 'claim', code, z }, 'claimed');
        return { ok: m.ok, reason: m.reason, wait: m.wait, by: m.by };
      },
      // Demo only: fake students so you can watch the board fill up
      simulate(on) {
        clearInterval(this._sim);
        if (!on) return;
        const bots = Array.from({ length: 30 }, (_, i) => 'bot' + i);
        this._sim = setInterval(() => {
          if (!server) return;
          const S = server.state;
          bots.forEach(b => { if (!S.players[b]) S.players[b] = { t: balancedTeam(S.players), at: Date.now() }; });
          const b = bots[Math.floor(Math.random() * bots.length)];
          const z = 1 + Math.floor(Math.random() * 118);
          if (Math.random() < 0.3) return publish(); // wrong answer
          const res = canClaim(S, b, z, Date.now());
          if (res.ok) S.cells[z] = { t: S.players[b].t, by: b, at: Date.now() };
          publish();
        }, 700);
      }
    };
  }

  async function create() {
    const params = new URLSearchParams(location.search);
    if (CFG.firebase && !params.has('demo')) return firebaseBackend();
    return demoBackend();
  }

  window.PQ_BACKEND = { create, canClaim };
})();
