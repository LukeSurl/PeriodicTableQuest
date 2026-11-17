// Quiz Grid editor: build a prompt that asks an AI chat to write questions in the import format,
// and pass its reply to the "Import questions from text" box.
(function () {
  const { $, S, esc, toast } = GQ;
  if (!$('aiBox')) return;
  $('aiAdvice').textContent = S.aiAdvice || '';
  $('aiAdvice').classList.toggle('hidden', !S.aiAdvice);
  $('aiCount').value = S.aiDefaultCount || 8;
  $('aiCount').max = S.maxQuestions;
  $('aiStudents').value = S.aiDefaultStudents || '';

  function prompt() {
    const n = Math.max(2, Math.min(S.maxQuestions, Math.round(+$('aiCount').value || 8)));
    const who = $('aiStudents').value.trim();
    const focus = $('aiFocus').value.trim();
    return `I am a university lecturer. Please write a short multiple-choice quiz from my lecture material, which is attached to this message or pasted underneath it. My students will answer the questions on their phones in the few minutes before the lecture starts.

Write ${n} multiple-choice questions based only on my lecture material.${who ? ` The students are ${who}.` : ''}${focus ? ` Focus on: ${focus}.` : ''}

Rules for the questions:
- Each question tests one clear idea from the material. Mix simple recall with some questions that need understanding or a quick application.
- Give 3 or 4 answers per question (never more than ${S.maxOptions}), with exactly one correct answer.
- Make the wrong answers believable mistakes a student might make, and about the same length as the correct answer. Do not use "all of the above" or "none of the above".
- Keep each question short enough to read on a phone in about 15 seconds. No pictures or diagrams.
- Give each question a label of 1 to 3 words naming its topic (under ${S.labelLength} characters). The label must not give away the answer.
- Vary the position of the correct answer.

Format the reply exactly like this, because a computer will read it:
- Put all the questions together in ONE code block, and nothing else inside the code block.
- Leave a blank line between questions.
- For each question: first the question on one line, then a line starting "Label: ", then each answer on its own line starting with "- ". Start the correct answer with "* " instead of "- ".
- Plain text only: no numbering, no bold, no letters such as A) or B), and no explanations inside the code block.

Here is an example of the format with two questions:

\`\`\`
What is the C–C bond length in benzene?
Label: Bond lengths
- 134 pm
* 140 pm
- 151 pm

Which of these molecules is aromatic?
Label: Aromaticity
* Pyridine
- Cyclohexene
- Cyclooctatetraene
\`\`\`

After the code block, briefly tell me about any question where you were unsure of the correct answer.

If my lecture material is not attached or pasted, do not write any questions: ask me for the material instead.`;
  }
  const refresh = () => { $('aiPrompt').value = prompt(); };
  ['aiCount', 'aiStudents', 'aiFocus'].forEach(id => $(id).addEventListener('input', refresh));
  refresh();

  $('aiShow').onclick = () => {
    const show = $('aiPrompt').classList.toggle('hidden') === false;
    $('aiShow').textContent = show ? 'Hide it' : 'Show it';
    $('aiShow').setAttribute('aria-expanded', show);
  };
  $('aiCopy').onclick = async () => {
    refresh();
    try { await navigator.clipboard.writeText($('aiPrompt').value); toast('Prompt copied. Now paste it into your AI chat.'); }
    catch (e) {
      $('aiPrompt').classList.remove('hidden'); $('aiShow').textContent = 'Hide it';
      $('aiPrompt').focus(); $('aiPrompt').select();
      toast('Couldn\'t copy automatically: the prompt is selected below, so press Ctrl+C (or ⌘+C).');
    }
  };

  // The reply: tidy it, hand it to the import box, and show that box
  $('aiReply').addEventListener('input', () => { $('aiCheck').disabled = !$('aiReply').value.trim(); $('aiMsg').textContent = ''; });
  $('aiReply').addEventListener('paste', () => setTimeout(() => { $('aiCheck').disabled = !$('aiReply').value.trim(); if (!$('aiCheck').disabled) check(); }, 0));
  $('aiCheck').onclick = check;
  function check() {
    const { text, dropped } = GQ_IMPORT.cleanAI($('aiReply').value);
    if (!text) {
      $('aiMsg').innerHTML = '<span class="warnline" style="display:inline">No questions found in that text. Did you copy the AI\'s reply (the shaded box)?</span>';
      return;
    }
    $('importText').value = text;
    $('importText').dispatchEvent(new Event('input'));
    $('importBox').open = true;
    $('aiMsg').textContent = dropped ? `Ignored ${dropped} bit${dropped === 1 ? '' : 's'} of chat text. Now check the questions in the import box.` : 'Now check the questions in the import box.';
    $('importBox').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
})();
