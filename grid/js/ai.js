// Quiz Grid and Periodic Table Quest editor: build a prompt that asks an AI chat to write
// questions in the import format, and pass its reply to the "Import questions from text" box.
// edit.js calls GQ_AI.init(settings) once it knows which kind of quiz is open.
window.GQ_AI = { init(S) {
  const { $, esc, toast } = GQ;
  if (!$('aiBox')) return;
  const ptq = S.type === 'ptq', pach = S.type === 'pachinko';
  $('aiAdvice').textContent = S.aiAdvice || '';
  $('aiAdvice').classList.toggle('hidden', !S.aiAdvice);
  $('aiCount').value = S.aiDefaultCount || 8;
  $('aiCount').max = S.maxQuestions;
  $('aiStudents').value = S.aiDefaultStudents || '';
  $('aiNum').checked = ptq;
  $('aiFb').checked = false;
  $('aiStealRow').classList.toggle('hidden', !ptq);
  $('aiSteals').value = S.aiDefaultSteals || 4;

  // Asked for only when "Include feedback" is ticked
  const fbRule = '\n- For every question, write one or two sentences of feedback for a student who answers wrongly: a hint at the likely misconception that helps them think again, without giving away the correct answer.';
  const fbFormat = '\n- After the question line (and any other lines described above, before the answers), add a line starting "Feedback: " with that feedback, all on one line.';
  const numFormat = `For a question with a typed number answer, write no "- " lines. Instead write one line starting "= " with the correct value, then "± " and how close an answer must be to count (an amount, or a percentage such as "± 1%"), then the unit if there is one. For example: "= 35.5 ± 0.1 g mol⁻¹". Choose the tolerance to match the precision you ask for in the question.`;

  function gridPrompt(n, who, focus, num, fb) {
    return `I am a university lecturer. Please write a short quiz from my lecture material, which is attached to this message or pasted underneath it. My students will answer the questions on their phones in the few minutes before the lecture starts.

Write ${n} questions based only on my lecture material.${who ? ` The students are ${who}.` : ''}${focus ? ` Focus on: ${focus}.` : ''}${num ? ` Most should be multiple choice, but where the material has calculations, make about a quarter of them questions with a typed number answer.` : ' Make them all multiple choice.'}

Rules for the questions:
- Each question tests one clear idea from the material. Mix simple recall with some questions that need understanding or a quick application.
- For multiple choice, give 3 or 4 answers per question (never more than ${S.maxOptions}), with exactly one correct answer.
- Make the wrong answers believable mistakes a student might make, and about the same length as the correct answer. Do not use "all of the above" or "none of the above".${num ? '\n- For number answers, say in the question what units and precision you want (e.g. "to 3 significant figures"). The answer must be a single number.' : ''}
- Keep each question short enough to read on a phone in about 15 seconds. No pictures or diagrams.
${pach ? '- Mark the two or three hardest questions as worth more: for those, add a line "Multiplier: 2" (or "Multiplier: 3" for the very hardest). Leave the others without a multiplier.' : `- Give each question a label of 1 to 3 words naming its topic (under ${S.labelLength} characters). The label must not give away the answer.`}
- Vary the position of the correct answer.${fb ? fbRule : ''}

Format the reply exactly like this, because a computer will read it:
- Put all the questions together in ONE code block, and nothing else inside the code block.
- Leave a blank line between questions.
- For each question: first the question on one line, then ${pach ? 'a "Multiplier: " line if it has one' : 'a line starting "Label: "'}, then each answer on its own line starting with "- ". Start the correct answer with "* " instead of "- ".${fb ? fbFormat : ''}${num ? '\n- ' + numFormat : ''}
- Plain text only: no numbering, no bold, no letters such as A) or B), and no explanations inside the code block. You may use Unicode characters such as ² ³ ⁻ ₂ × for formulae and units.

Here is an example of the format:

\`\`\`
What is the C–C bond length in benzene?
${pach ? '' : 'Label: Bond lengths\n'}${fb ? 'Feedback: Benzene\'s bonds are all the same length. Think about where that length sits between a single and a double bond.\n' : ''}- 134 pm
* 140 pm
- 151 pm

Which of these molecules is aromatic?
${pach ? 'Multiplier: 2' : 'Label: Aromaticity'}
* Pyridine
- Cyclohexene
- Cyclooctatetraene${num ? `

How many moles are in 9.0 g of water? Give 2 significant figures.
${pach ? '' : 'Label: Moles\n'}= 0.50 ± 0.005 mol` : ''}
\`\`\`

After the code block, briefly tell me about any question where you were unsure of the correct answer.

If my lecture material is not attached or pasted, do not write any questions: ask me for the material instead.`;
  }

  function ptqPrompt(n, who, focus, num, steals, fb) {
    return `I am a university chemistry lecturer. Please write questions for a game from my lecture material, which is attached to this message or pasted underneath it. In the game, students in two teams claim elements on a periodic table by answering a question about the topic on their phones, in the few minutes before the lecture starts. A team can take an element from the other team by answering a harder "steal" question.

Write ${n} ordinary questions and ${steals} steal questions, based only on my lecture material.${who ? ` The students are ${who}.` : ''}${focus ? ` Focus on: ${focus}.` : ''}

Rules for the questions:
- Each question tests one clear idea from the material. Mix simple recall with some questions that need understanding or a quick application.
- Where a question is about particular elements (for example it names the element, or uses its data), say which: the question is then only asked when a student taps one of those elements. Questions about general ideas have no elements and can come up on any element. Aim for about a third of the ordinary questions to be about particular elements, spread across different parts of the periodic table, and only where the material supports it.
- Ordinary questions are quick multiple choice${num ? ', or occasionally a typed number answer' : ''}. Give 3 or 4 answers per multiple-choice question (never more than ${S.maxOptions}), with exactly one correct answer. Make the wrong answers believable mistakes, about the same length as the correct answer. Do not use "all of the above" or "none of the above".
- Steal questions are harder: ${num ? 'ideally a short calculation with a typed number answer' : 'a harder multiple-choice question'} that takes about a minute.${num ? ' For number answers, say in the question what units and precision you want (e.g. "to 3 significant figures"). The answer must be a single number.' : ''}
- Keep each question short enough to read on a phone in about 15 seconds. No pictures or diagrams.
- Vary the position of the correct answer.${fb ? fbRule : ''}

Format the reply exactly like this, because a computer will read it:
- Put all the questions together in ONE code block, and nothing else inside the code block.
- Leave a blank line between questions.
- For each question: first the question on one line. Then, only if it is about particular elements, a line starting "Elements: " with their symbols separated by commas. Then, only for steal questions, a line saying "Steal". Then each answer on its own line starting with "- ", with the correct answer starting "* " instead.${fb ? fbFormat : ''}${num ? '\n- ' + numFormat : ''}
- Plain text only: no numbering, no bold, no letters such as A) or B), and no explanations inside the code block. You may use Unicode characters such as ² ³ ⁻ ₂ × for formulae and units.

Here is an example of the format:

\`\`\`
Which of these is the electron configuration of a neutral sodium atom?
Elements: Na
${fb ? 'Feedback: Count the electrons: a neutral atom has as many as its atomic number.\n' : ''}- 1s² 2s² 2p⁶
* 1s² 2s² 2p⁶ 3s¹
- 1s² 2s² 2p⁶ 3s²

Which statement about isotopes of the same element is true?
- They have different numbers of protons
* They have the same number of protons but different numbers of neutrons
- They have different chemical properties
${num ? `
Chlorine is 75.8% ³⁵Cl and 24.2% ³⁷Cl. Calculate its relative atomic mass to 3 significant figures.
Elements: Cl
Steal
= 35.5 ± 0.05` : `
Which of these chlorine isotopes is the most abundant?
Elements: Cl
Steal
* ³⁵Cl
- ³⁶Cl
- ³⁷Cl`}
\`\`\`

After the code block, briefly tell me about any question where you were unsure of the correct answer.

If my lecture material is not attached or pasted, do not write any questions: ask me for the material instead.`;
  }

  function prompt() {
    const n = Math.max(2, Math.min(S.maxQuestions, Math.round(+$('aiCount').value || 8)));
    const steals = Math.max(0, Math.min(50, Math.round(+$('aiSteals').value || 0)));
    const who = $('aiStudents').value.trim(), focus = $('aiFocus').value.trim(), num = $('aiNum').checked, fb = $('aiFb').checked;
    return ptq ? ptqPrompt(n, who, focus, num, steals, fb) : gridPrompt(n, who, focus, num, fb);
  }
  const refresh = () => { $('aiPrompt').value = prompt(); };
  ['aiCount', 'aiStudents', 'aiFocus', 'aiSteals', 'aiNum', 'aiFb'].forEach(id => { $(id).addEventListener('input', refresh); $(id).addEventListener('change', refresh); });
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
} };
