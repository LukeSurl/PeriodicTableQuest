// Quiz Grid and Periodic Table Quest: reading questions typed or pasted as plain text,
// and writing them back out.
//
// The format (blank line between questions):
//
//   What is the C–C bond length in benzene?
//   Label: Bond lengths
//   - 134 pm
//   * 140 pm
//   - 151 pm
//
//   What is the relative atomic mass of chlorine? Give 3 s.f.
//   = 35.5 ± 0.05 g mol⁻¹
//
// The question comes first (it can run over several lines, and "Q:" or "1." in front
// is ignored). "Label:" is optional. Multiple-choice answers start with "-", and the
// correct one with "*". A number answer is one line starting with "=": the value, then
// optionally "± 0.05" or "± 1%" (how close an answer must be), then optionally a unit.
// Lines starting with "#" are notes and are ignored. An optional "Feedback:" line is shown to
// a student who gets the question wrong (any wrong answer); without it they see the usual message.
//
// Periodic Table Quest only: "Elements: Na, K" (the question only appears on those
// elements; without it, it can appear on any) and "Steal" (a harder question, used
// for taking an element from the other team).
//
// Pachinko only: "Multiplier: 2" (or "×2") makes a right answer's ball worth double.
// Other quiz types accept the line and ignore it, so questions move freely between them.
(function () {
  const W = typeof window !== 'undefined' ? window : globalThis;
  const S = W.GQ_SETTINGS || { maxQuestions: 30, maxOptions: 6, labelLength: 40 };
  const MAX_TEXT = 800, MAX_OPT = 200, MAX_UNIT = 40;
  const G = () => W.GQ;

  // "35.5 ± 0.05 g mol⁻¹", "6.02 × 10^23 ± 1%", "24.2 %" → { v, tol, pct, unit } or null
  function parseNumLine(s) {
    s = s.trim();
    const parts = s.split(/\s*(?:±|\+\/-|\+-|\+\s*\/\s*-)\s*/);
    let valuePart = parts[0], tolPart = parts.length > 1 ? parts.slice(1).join(' ') : '', unit = '';
    let m, v, tol = 0, pct = false;
    // The value may run into its unit: take the longest start that reads as a number
    const tryNum = str => {
      const words = str.split(/\s+/);
      for (let k = words.length; k > 0; k--) {
        const n = G().parseNum(words.slice(0, k).join(' '), true);
        if (isFinite(n)) return { n, rest: words.slice(k).join(' ') };
      }
      return null;
    };
    const head = tryNum(valuePart);
    if (!head) return null;
    v = head.n;
    if (tolPart) {
      if (!(m = tolPart.match(/^([0-9.,]+(?:\s*(?:[×xX]\s*10\^?[−-]?\d+|e[+-]?\d+))?)\s*(%?)\s*(.*)$/i))) return null;
      tol = G().parseNum(m[1]); pct = m[2] === '%';
      if (!isFinite(tol)) return null;
      unit = (head.rest ? head.rest + ' ' : '') + m[3];
    } else unit = head.rest;
    return { v, tol: Math.abs(tol), pct, unit: unit.trim() };
  }

  function parse(text, type) {
    const ptq = type === 'ptq', pach = type === 'pachinko', maxMult = (W.GQ_SETTINGS && W.GQ_SETTINGS.pachinko && W.GQ_SETTINGS.pachinko.maxMultiplier) || 5;
    const blocks = String(text || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/)
      .map(b => b.split('\n').filter(l => !/^\s*#/.test(l)).join('\n').trim()).filter(Boolean);
    const qs = [], errors = [];
    blocks.forEach((block, b) => {
      const n = b + 1, q = { text: '', kind: 'mc', opts: [], label: '', answer: null, unit: '', steal: false, els: [], mult: 1, fb: '' }, textLines = [];
      let numLines = 0, badNum = '', badEls = [], ptqOnly = '', badMult = '';
      for (const raw of block.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        let m;
        if ((m = line.match(/^label\s*:\s*(.*)$/i))) q.label = m[1].trim();
        else if ((m = line.match(/^feedback\s*:\s*(.*)$/i))) q.fb = (q.fb ? q.fb + ' ' : '') + m[1].trim();
        else if ((m = line.match(/^(?:multiplier|mult)\s*:?\s*[x×*]?\s*(\S*?)\s*[x×]?\s*$/i)) || (m = line.match(/^[x×]\s*(\d+)$/))) {
          const v = +m[1];
          if (Number.isInteger(v) && v >= 1 && v <= maxMult) q.mult = v; else badMult = m[1];
        }
        else if ((m = line.match(/^steal(?:\s+question)?\s*(?::\s*(\S+))?\s*$/i))) {
          q.steal = !m[1] || /^(y|yes|true|1)$/i.test(m[1]);
          if (!ptq) ptqOnly = 'Steal';
        } else if ((m = line.match(/^elements?\s*:\s*(.*)$/i))) {
          const r = G().parseEls(m[1]);
          q.els = r.zs; badEls = r.bad;
          if (!ptq) ptqOnly = 'Elements';
        } else if ((m = line.match(/^=\s*(.*)$/))) {
          numLines++;
          const r = parseNumLine(m[1]);
          if (!r) badNum = m[1];
          else { q.kind = 'num'; q.answer = { v: r.v, tol: r.tol, pct: r.pct }; q.unit = r.unit; }
        } else if ((m = line.match(/^([*\-–•])\s*(.*)$/))) {
          if (m[1] === '*') {
            if (q.answer != null && q.kind === 'mc') errors.push(`Question ${n}: more than one answer is marked with *.`);
            if (q.kind === 'mc') q.answer = q.opts.length;
          }
          q.opts.push(m[2].trim());
        } else if (q.opts.length) {
          // A line straight after an answer continues that answer
          q.opts[q.opts.length - 1] += ' ' + line;
        } else textLines.push(line);
      }
      q.text = textLines.join('\n').replace(/^(q\s*\d*\s*[:.)]|\d+\s*[.)])\s*/i, '').trim();
      const short = q.text ? `"${q.text.slice(0, 40)}${q.text.length > 40 ? '…' : ''}"` : '';
      const where = `Question ${n}${short ? ' ' + short : ''}`;
      if (!q.text) errors.push(`${where}: there is no question text above the answers.`);
      if (badMult && pach) errors.push(`${where}: the multiplier "${badMult}" should be a whole number from 1 to ${maxMult}.`);
      if (!pach) q.mult = 1;
      if (ptqOnly) errors.push(`${where}: "${ptqOnly}" lines are only for Periodic Table Quest quizzes. Remove the line.`);
      if (badEls.length) errors.push(`${where}: ${badEls.map(x => `"${x}"`).join(', ')} ${badEls.length === 1 ? 'isn\'t an element symbol' : 'aren\'t element symbols'}.`);
      if (numLines) {
        if (badNum) errors.push(`${where}: couldn't read the number in "= ${badNum}". Write e.g. "= 35.5", "= 35.5 ± 0.1 g mol⁻¹" or "= 6.02 × 10^23 ± 1%".`);
        if (numLines > 1) errors.push(`${where}: has more than one "=" line; a number question has one answer.`);
        if (q.opts.length) errors.push(`${where}: has both a number answer ("=") and multiple-choice answers ("-" or "*"). Use one or the other.`);
        if (q.unit.length > MAX_UNIT) errors.push(`${where}: the unit is longer than ${MAX_UNIT} characters.`);
      } else {
        if (q.opts.length < 2) errors.push(`${where}: needs at least two answers, each on its own line starting with - or *, or a number answer on a line starting with =.`);
        if (q.opts.length > S.maxOptions) errors.push(`${where}: has ${q.opts.length} answers; the most allowed is ${S.maxOptions}.`);
        if (q.answer == null && q.opts.length) errors.push(`${where}: mark the correct answer by starting its line with * instead of -.`);
        if (q.opts.some(o => !o)) errors.push(`${where}: one of the answers is empty.`);
        if (q.opts.some(o => o.length > MAX_OPT)) errors.push(`${where}: an answer is longer than ${MAX_OPT} characters.`);
      }
      if (q.text.length > MAX_TEXT) errors.push(`${where}: the question is longer than ${MAX_TEXT} characters.`);
      if (q.fb.length > 400) errors.push(`${where}: the feedback is longer than 400 characters.`);
      if (q.label.length > S.labelLength) errors.push(`${where}: the label is longer than ${S.labelLength} characters.`);
      qs.push(q);
    });
    if (!blocks.length) errors.push('There is nothing to import yet.');
    return { qs, errors };
  }

  // A number answer as text: "35.5 ± 0.05 g mol⁻¹"
  function numText(ans, unit) {
    const v = String(+ans.v), tol = +ans.tol ? ` ± ${+ans.tol}${ans.pct ? '%' : ''}` : '';
    return `${v}${tol}${unit ? ' ' + unit : ''}`;
  }

  // qs as stored by the editor; answers[i] is an option position or { v, tol, pct }
  function toText(qs, answers, type) {
    return qs.map((q, i) => {
      const els = type === 'ptq' && q.els ? Object.keys(q.els).map(Number).sort((a, b) => a - b).map(z => G().elSym(z)) : [];
      return [
        q.text.trim(),
        ...(q.label && q.label.trim() ? ['Label: ' + q.label.trim()] : []),
        ...(els.length ? ['Elements: ' + els.join(', ')] : []),
        ...(type === 'ptq' && q.steal ? ['Steal'] : []),
        ...(type === 'pachinko' && +q.mult > 1 ? ['Multiplier: ' + Math.round(+q.mult)] : []),
        ...(q.fb && String(q.fb).trim() ? ['Feedback: ' + String(q.fb).trim().replace(/\s*\n\s*/g, ' ')] : []),
        ...(q.kind === 'num'
          ? [answers[i] && isFinite(answers[i].v) ? '= ' + numText(answers[i], (q.unit || '').trim()) : '= ?']
          : q.opts.map((o, j) => o.trim() ? (j === answers[i] ? '* ' : '- ') + o.trim() : null).filter(Boolean))
      ].join('\n');
    }).join('\n\n') + '\n';
  }

  // Tidy a reply copied from an AI chat: drop code fences, bold/heading marks and any
  // chat text around the questions (any block without answer lines).
  function cleanAI(text) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n')
      .filter(l => !/^\s*```/.test(l))
      .map(l => l.replace(/\*\*|__/g, '').replace(/^\s*#+\s+(?=\S)/, '').replace(/^(\s*)\*\s*(label|elements?|steal|multiplier|feedback)\b/i, '$1$2'));
    const blocks = lines.join('\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const keep = blocks.filter(b => b.split('\n').some(l => /^\s*([*\-–•]\s*\S|=\s*\S)/.test(l)));
    return { text: keep.join('\n\n'), dropped: blocks.length - keep.length };
  }

  const api = { parse, toText, cleanAI, parseNumLine, numText };
  if (typeof module !== 'undefined') module.exports = api; else window.GQ_IMPORT = api;
})();
