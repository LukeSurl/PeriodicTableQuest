// Pachinko: the board's shape, the physics of a falling ball, and drawing it all on a canvas.
// Used by the projector (pachinko/host.html) and the editor's preview. Balls never touch each
// other, only pegs, walls and the dividers between zones, so they can't jam.
(function () {
  const S = (window.GQ_SETTINGS && window.GQ_SETTINGS.pachinko) || {};
  const ZONES = S.zones || [100, 30, 50, 20, 10, 20, 50, 30, 100];

  // Board units: 100 wide, 122 tall
  const W = 100, H = 122, ROWS = 12, TOP = 14, GAP_Y = 7.5;
  const PEG_R = 0.9, BALL_R = 2.5, ZONE_TOP = 101, LAND_Y = 116;
  const ZW = W / ZONES.length;
  const pegs = [];
  for (let r = 0; r < ROWS; r++) {
    const y = TOP + r * GAP_Y, odd = r % 2;
    // Edge pegs sit a little in from the walls, so a ball can always pass between peg and wall
    for (let x = odd ? 10 : 5; x <= (odd ? 90 : 95) + 0.01; x += 10) pegs.push({ x: x === 5 ? 6.2 : x === 95 ? 93.8 : x, y });
  }
  const dividers = [];
  for (let k = 1; k < ZONES.length; k++) dividers.push(k * ZW);
  dividers.forEach(x => pegs.push({ x, y: ZONE_TOP }));   // a round cap on top of each divider
  const zoneOf = x => Math.max(0, Math.min(ZONES.length - 1, Math.floor(x / ZW)));

  // ---------- Physics ----------
  // Each ball is a uniform 2D disc (moment of inertia ½mr²) that slides and spins. At every
  // contact, the normal impulse bounces it, and friction between its rim and the peg or wall
  // trades sliding for spin (and spin back into sideways throw), up to the Coulomb limit.
  const G = 110, BOUNCE = 0.4, FRICTION = 0.35, MAXV = 90, MAXW = 40;
  function newBall(o) {
    return { id: o.id, t: o.t, mult: o.mult || 1, shape: o.shape || 0, x: 8 + Math.random() * 84, y: 3, vx: (Math.random() - 0.5) * 10, vy: 0,
      w: (Math.random() - 0.5) * 4, a: Math.random() * Math.PI * 2, age: 0, best: 0, stuck: 0, landed: false };
  }
  // A contact with a surface whose normal (nx, ny) points from the surface to the ball's centre
  function contact(b, nx, ny, e) {
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return false;
    const tx = -ny, ty = nx;                               // tangent
    const jn = -(1 + e) * vn;                              // normal impulse (per unit mass)
    const slip = b.vx * tx + b.vy * ty - BALL_R * b.w;    // speed of the rim at the contact point, along the tangent
    let jt = -slip / 3;                                    // the impulse that would stop slipping: 1/m + r²/I = 3/m for a disc
    const lim = FRICTION * jn;
    if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
    b.vx += jn * nx + jt * tx; b.vy += jn * ny + jt * ty;
    b.w -= 2 * jt / BALL_R;                                // Δω = −r·J/I = −2J/r
    return true;
  }
  // Advance one ball by dt seconds. Returns the zone index when it lands, else null.
  function step(b, dt) {
    if (b.landed) return null;
    b.age += dt;
    b.vy += G * dt;
    b.vx *= 0.998; b.w *= 0.999;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
    if (Math.abs(b.w) > MAXW) b.w = Math.sign(b.w) * MAXW;
    b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
    for (const p of pegs) {
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), min = BALL_R + PEG_R;
      if (d < min && d > 1e-6) {
        const nx = dx / d, ny = dy / d;
        b.x = p.x + nx * min; b.y = p.y + ny * min;
        if (contact(b, nx, ny, BOUNCE)) {
          const kick = (Math.random() - 0.5) * 6;          // a little randomness, and no balancing on a peg
          b.vx += -ny * kick; b.vy += nx * kick;
        }
      }
    }
    if (b.x < BALL_R) { b.x = BALL_R; contact(b, 1, 0, 0.6); b.vx += 6; }
    if (b.x > W - BALL_R) { b.x = W - BALL_R; contact(b, -1, 0, 0.6); b.vx -= 6; }
    if (b.y > ZONE_TOP) for (const x of dividers) {
      if (Math.abs(b.x - x) < BALL_R + 0.4) { const s = b.x < x ? -1 : 1; b.x = x + s * (BALL_R + 0.4); contact(b, s, 0, 0.4); }
    }
    // Stuck somewhere (very unlikely)? Give it a nudge, and after a while land it where it is
    if (b.y > b.best + 0.5) { b.best = b.y; b.stuck = 0; } else b.stuck += dt;
    if (b.stuck > 1.5) { b.vx += (Math.random() - 0.5) * 30; b.vy -= 10; b.stuck = 0; }
    if (b.y >= LAND_Y || b.age > 25) { b.landed = true; b.y = Math.min(b.y, LAND_Y); return zoneOf(b.x); }
    return null;
  }

  // Each question always gets the same decoration: a shape chosen from a hash of its text.
  // Every shape looks different when turned, so the spin shows.
  const SHAPE_NAMES = ['Stripe', 'Cross', 'Triangle', 'Square', 'Half disc', 'Star', 'Crescent', 'Heart', 'Lightning bolt', 'Bow tie'];
  const SHAPES = SHAPE_NAMES.length;
  function shapeFor(text) {
    let h = 5381;
    for (const c of String(text || '')) h = ((h * 33) ^ c.codePointAt(0)) >>> 0;
    return h % SHAPES;
  }
  // Draw a shape in white on a disc of radius r centred at the origin (already rotated)
  function decorate(g, shape, r) {
    g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    const k = r;
    const poly = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.closePath(); g.fill(); };
    const line = (w, pts) => { g.lineWidth = w * k; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.stroke(); };
    switch (SHAPE_NAMES[shape] || SHAPE_NAMES[0]) {
      case 'Stripe': line(0.28, [[-0.62, 0], [0.62, 0]]); break;
      case 'Cross': line(0.24, [[-0.55, 0], [0.55, 0]]); line(0.24, [[0, -0.55], [0, 0.55]]); break;
      case 'Triangle': poly([[0, -0.6], [0.52, 0.32], [-0.52, 0.32]]); break;
      case 'Square': poly([[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]]); break;
      case 'Half disc': g.beginPath(); g.arc(0, 0, 0.62 * k, 0, Math.PI); g.closePath(); g.fill(); break;
      case 'Star': poly(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.27 : 0.66; return [Math.cos(a) * rr, Math.sin(a) * rr]; })); break;
      case 'Crescent':   // a disc with a bite out of it
        g.save(); g.beginPath(); g.rect(-k, -k, 2 * k, 2 * k); g.arc(0.26 * k, -0.16 * k, 0.48 * k, 0, Math.PI * 2); g.clip('evenodd');
        g.beginPath(); g.arc(0, 0, 0.6 * k, 0, Math.PI * 2); g.fill(); g.restore(); break;
      case 'Heart': g.beginPath(); g.moveTo(0, 0.55 * k);
        g.bezierCurveTo(-0.75 * k, 0.05 * k, -0.4 * k, -0.6 * k, 0, -0.22 * k);
        g.bezierCurveTo(0.4 * k, -0.6 * k, 0.75 * k, 0.05 * k, 0, 0.55 * k); g.fill(); break;
      case 'Lightning bolt': poly([[0.12, -0.62], [-0.38, 0.06], [-0.02, 0.06], [-0.14, 0.62], [0.38, -0.08], [0.02, -0.08]]); break;
      case 'Bow tie': poly([[-0.55, -0.4], [0, 0], [-0.55, 0.4]]); poly([[0.55, -0.4], [0, 0], [0.55, 0.4]]); break;
    }
  }
  // One ball on its own, e.g. a phone's preview of the ball it will drop: colour, multiplier or shape, angle
  function drawBall(g, x, y, r, colour, mult, shape, angle) {
    g.save(); g.translate(x, y);
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = colour; g.fill();
    g.lineWidth = r * 0.12; g.strokeStyle = '#fff'; g.stroke();
    g.rotate(angle || 0);
    if (mult > 1) {
      g.fillStyle = '#fff'; g.font = `800 ${r * 1.15}px Segoe UI, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('×' + mult, 0, r * 0.04);
    } else decorate(g, shape, r);
    g.restore();
  }

  // ---------- Drawing ----------
  // Size a canvas to its box (sharp on high-DPI screens). Returns { scale, ox, oy } for board units.
  function fit(canvas) {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const scale = Math.min(w / W, h / H);
    return { scale, ox: (w - W * scale) / 2, oy: (h - H * scale) / 2 };
  }
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // balls: [{x, y, t, mult}]; flashes: [{zone, t, text, until}]
  function draw(canvas, balls, flashes) {
    const g = canvas.getContext('2d'), f = fit(canvas), s = f.scale;
    const ink = css('--ink') || '#003C3B', paper = css('--paper') || '#F4FAF9', line = css('--line') || '#9CC5BF';
    const team = { a: css('--ta') || '#007A75', b: css('--tb') || '#C8553D' };
    const now = performance.now();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(s, 0, 0, s, f.ox, f.oy);
    // Board
    g.fillStyle = paper; g.strokeStyle = ink; g.lineWidth = 0.6;
    roundRect(g, 0, 0, W, H, 3); g.fill(); g.stroke();
    // Zones
    ZONES.forEach((v, i) => {
      const fl = (flashes || []).find(x => x.zone === i && x.until > now);
      g.fillStyle = fl ? team[fl.t] : (v >= 100 ? '#F9EEDA' : v >= 50 ? '#E7F1FB' : '#ffffff');
      g.fillRect(i * ZW, ZONE_TOP, ZW, H - ZONE_TOP - 0.4);
      g.fillStyle = fl ? '#fff' : ink;
      g.font = `700 ${v >= 100 ? 4.2 : 3.8}px Segoe UI, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(v), i * ZW + ZW / 2, LAND_Y - 4);
    });
    g.strokeStyle = ink; g.lineWidth = 0.8;
    dividers.forEach(x => { g.beginPath(); g.moveTo(x, ZONE_TOP); g.lineTo(x, H - 0.4); g.stroke(); });
    g.beginPath(); g.moveTo(0, ZONE_TOP); g.lineTo(W, ZONE_TOP); g.strokeStyle = line; g.lineWidth = 0.3; g.stroke();
    // Pegs
    g.fillStyle = ink;
    for (const p of pegs) { g.beginPath(); g.arc(p.x, p.y, PEG_R, 0, Math.PI * 2); g.fill(); }
    // Balls
    for (const b of balls || []) drawBall(g, b.x, b.y, BALL_R, team[b.t] || ink, b.mult, b.shape, b.a);
    // Points floating up from where a ball landed
    for (const fl of flashes || []) {
      const left = fl.until - now; if (left <= 0 || !fl.text) continue;
      const k = 1 - left / 1800;
      g.globalAlpha = Math.max(0, Math.min(1, left / 600));
      g.fillStyle = team[fl.t] || ink; g.font = '800 5px Segoe UI, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(fl.text, fl.zone * ZW + ZW / 2, ZONE_TOP - 4 - k * 10);
      g.globalAlpha = 1;
    }
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  window.PACH = { W, H, ZONES, zoneOf, newBall, step, draw, fit, shapeFor, decorate, drawBall, SHAPE_NAMES };
})();
