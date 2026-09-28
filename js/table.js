// Shared periodic table renderer used by the projector and the phones.
(function () {
  const CFG = window.PQ_CONFIG;
  const ELS = window.PQ_ELEMENTS;

  function applyTheme() {
    const r = document.documentElement.style;
    r.setProperty('--ta', CFG.teams.a.colour);
    r.setProperty('--tb', CFG.teams.b.colour);
    document.title = CFG.title;
  }

  // Build the grid. onTap(z) is optional.
  function build(container, onTap) {
    container.classList.add('ptable');
    container.innerHTML = '';
    const map = {};
    ELS.forEach(e => {
      const d = document.createElement(onTap ? 'button' : 'div');
      d.className = 'cell';
      d.dataset.z = e.z;
      d.style.gridRow = e.r + (e.r >= 9 ? 0 : 0);
      d.style.gridColumn = e.c;
      d.innerHTML = `<span class="cz">${e.z}</span><span class="cs">${e.s}</span>`;
      d.title = `${e.n} (${e.z})`;
      d.setAttribute('aria-label', `${e.n}, atomic number ${e.z}`);
      if (onTap) d.addEventListener('click', () => onTap(e.z));
      container.appendChild(d);
      map[e.z] = d;
    });
    // f-block placeholders and the gap row
    [['57–71', 6], ['89–103', 7]].forEach(([t, row]) => {
      const p = document.createElement('div');
      p.className = 'cell ph'; p.style.gridRow = row; p.style.gridColumn = 3;
      p.innerHTML = `<span class="cs">${t}</span>`;
      container.appendChild(p);
    });
    const gap = document.createElement('div');
    gap.className = 'gap'; gap.style.gridRow = 8; gap.style.gridColumn = '1 / span 18';
    container.appendChild(gap);
    return map;
  }

  // Colour the cells. Returns list of changes [{z, from, to}]
  function paint(map, cells, prev, myTeam) {
    const changes = [];
    for (const z in map) {
      const c = cells[z], t = c ? c.t : '';
      const d = map[z];
      if (d.dataset.t !== t) {
        if (prev) changes.push({ z: +z, from: d.dataset.t || '', to: t });
        d.dataset.t = t;
        d.classList.remove('ta', 'tb');
        if (t) d.classList.add('t' + t);
        if (prev && t) { d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop'); }
      }
      d.classList.toggle('mine', !!myTeam && t === myTeam);
    }
    return changes;
  }

  function score(cells) {
    let a = 0, b = 0;
    Object.values(cells || {}).forEach(c => c.t === 'a' ? a++ : c.t === 'b' ? b++ : 0);
    return { a, b };
  }

  const fmtTime = ms => {
    ms = Math.max(0, ms); const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  window.PQ_TABLE = { build, paint, score, applyTheme, fmtTime };
})();
