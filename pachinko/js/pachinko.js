// Pachinko: small helpers shared by the projector and phone pages.
// The quizzes, editor and database are shared with Quiz Grid (../grid/).
(function () {
  const S = GQ_SETTINGS.forType('pachinko');
  const { esc, team } = GQ;
  const lo = Math.min(...S.zones), hi = Math.max(...S.zones);

  const rulesList = () => `<ul class="rules">
      <li>You'll be put into Team <b style="color:var(--ta)">${esc(team('a').name)}</b> or Team <b style="color:var(--tb)">${esc(team('b').name)}</b> at random.</li>
      <li>Pick a question on your phone. Get it right and its ball, in your team's colour, drops down the board.</li>
      <li>The ball scores the points of the zone it lands in (${lo} to ${hi}). Tricky questions can be worth ×2 or more.</li>
      <li>The team with the most points at the end wins!</li></ul>`;

  // Points per team from the landed balls: scores = { id: { p, m, t } }
  function totals(scores) {
    const s = { a: 0, b: 0, na: 0, nb: 0 };
    Object.values(scores || {}).forEach(x => { if (x && (x.t === 'a' || x.t === 'b')) { s[x.t] += (+x.p || 0) * (+x.m || 1); s['n' + x.t]++; } });
    return s;
  }
  function resultText(scores) {
    const s = totals(scores), A = esc(team('a').name), Bn = esc(team('b').name);
    const w = s.a === s.b ? null : s.a > s.b ? 'a' : 'b';
    return w ? { w, head: `${esc(team(w).name)} wins!`, sub: `Points: ${A} ${s.a} – ${s.b} ${Bn}` }
      : { w, head: 'It\'s a draw!', sub: `${s.a} points each` };
  }
  const pointsText = x => (+x.m > 1 ? `${x.p} ×${x.m} = ${x.p * x.m}` : `${x.p}`);

  window.PACHINKO = { S, rulesList, totals, resultText, pointsText };
})();
