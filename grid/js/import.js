// Quiz Grid: reading questions typed or pasted as plain text, and writing them back out.
//
// The format (blank line between questions):
//
//   What is the C–C bond length in benzene?
//   Label: Bond lengths
//   - 134 pm
//   * 140 pm
//   - 151 pm
//
// The question comes first (it can run over several lines, and "Q:" or "1." in front
// is ignored). "Label:" is optional. Answers start with "-", and the correct one with "*".
(function () {
  const S = (typeof window !== 'undefined' && window.GQ_SETTINGS) || { maxQuestions: 30, maxOptions: 6, labelLength: 40 };
  const MAX_TEXT = 800, MAX_OPT = 200;

  function parse(text) {
    const blocks = String(text || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const qs = [], errors = [];
    blocks.forEach((block, b) => {
      const n = b + 1, q = { text: '', opts: [], label: '', answer: null }, textLines = [];
      for (const raw of block.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        let m;
        if ((m = line.match(/^label\s*:\s*(.*)$/i))) q.label = m[1].trim();
        else if ((m = line.match(/^([*\-–•])\s*(.*)$/))) {
          if (m[1] === '*') {
            if (q.answer != null) errors.push(`Question ${n}: more than one answer is marked with *.`);
            q.answer = q.opts.length;
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
      if (q.opts.length < 2) errors.push(`${where}: needs at least two answers, each on its own line starting with - or *.`);
      if (q.opts.length > S.maxOptions) errors.push(`${where}: has ${q.opts.length} answers; the most allowed is ${S.maxOptions}.`);
      if (q.answer == null && q.opts.length) errors.push(`${where}: mark the correct answer by starting its line with * instead of -.`);
      if (q.opts.some(o => !o)) errors.push(`${where}: one of the answers is empty.`);
      if (q.text.length > MAX_TEXT) errors.push(`${where}: the question is longer than ${MAX_TEXT} characters.`);
      if (q.opts.some(o => o.length > MAX_OPT)) errors.push(`${where}: an answer is longer than ${MAX_OPT} characters.`);
      if (q.label.length > S.labelLength) errors.push(`${where}: the label is longer than ${S.labelLength} characters.`);
      qs.push(q);
    });
    if (!blocks.length) errors.push('There is nothing to import yet.');
    return { qs, errors };
  }

  function toText(qs, answers) {
    return qs.map((q, i) => [
      q.text.trim(),
      ...(q.label && q.label.trim() ? ['Label: ' + q.label.trim()] : []),
      ...q.opts.map((o, j) => o.trim() ? (j === answers[i] ? '* ' : '- ') + o.trim() : null).filter(Boolean)
    ].join('\n')).join('\n\n') + '\n';
  }

  const api = { parse, toText };
  if (typeof module !== 'undefined') module.exports = api; else window.GQ_IMPORT = api;
})();
