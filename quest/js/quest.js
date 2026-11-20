// Periodic Table Quest: small helpers shared by the projector and phone pages.
// The quizzes, editor and database are shared with Quiz Grid (../grid/).
(function () {
  const S = GQ_SETTINGS.forType('ptq');
  const { esc, team } = GQ;
  const T = window.PQ_TABLE;

  // How to play, in the team names from settings
  const rulesList = () => `<ul class="rules">
      <li>You'll be put into Team <b style="color:var(--ta)">${esc(team('a').name)}</b> or Team <b style="color:var(--tb)">${esc(team('b').name)}</b> at random.</li>
      <li>Tap an element and answer its question to claim it for your team.</li>
      <li>Answer a harder steal question to take an element from the other team.</li>
      <li>The team holding the most elements at the end wins!</li></ul>`;

  // Elements with no ordinary question can't be claimed: grey them out
  function markPlayable(cells, quiz) {
    let n = 0;
    for (const z in cells) { const ok = !!quiz && GQ.poolFor(quiz, +z, false).length > 0; cells[z].classList.toggle('noq', !ok); if (ok) n++; }
    return n;
  }

  function resultText(cells) {
    const s = T.score(cells), A = esc(team('a').name), Bn = esc(team('b').name);
    const w = s.a === s.b ? null : s.a > s.b ? 'a' : 'b';
    return w ? { w, head: `${esc(team(w).name)} wins!`, sub: `Elements held: ${A} ${s.a} – ${s.b} ${Bn}` }
      : { w, head: 'It\'s a draw!', sub: `${s.a} element${s.a === 1 ? '' : 's'} each` };
  }

  window.PTQ = { S, rulesList, markPlayable, resultText };
})();
