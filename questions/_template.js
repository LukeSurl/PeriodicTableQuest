// Periodic Table Quest question set: TEMPLATE
// =============================================
// To make a new topic:
//   1. Copy this file and give the copy a short name using only letters, numbers,
//      hyphens and underscores, e.g. atoms3.js. That name (without .js) is the topic's id.
//      Don't start the name with _ : files starting with _ are ignored (like this one).
//   2. Fill in the title and your questions below.
//   3. Upload it to the questions/ folder on GitHub. A minute or two later it appears in
//      the projector's Topics window, along with a warning if anything in it can't be used.
//
// Each hand-written question is:
//   el  element symbol ('Cl'), a list of symbols (['Cl', 'Br']), or null for a general
//       question that can appear on any element
//   q   the question (HTML allowed, e.g. H<sub>2</sub>O, 10<sup>−3</sup>, <i>m/z</i>)
//   a   the right answer
//   w   two or three wrong answers
//   x   a short explanation, shown after the student answers
//
// A hand-written steal challenge (typed numeric answer) instead has steal: true and:
//   n   the right answer as a number
//   tol how far off an answer may be and still count (e.g. 0.011), and/or
//   rel the same as a fraction of the answer (e.g. 0.006 for ±0.6%)
//   unit shown next to the answer box; show the answer as displayed after a wrong attempt
//
// generators and stealGenerators switch on question types written in
// js/question_generators.js. Leave them as [] to use only your own questions.

PQ.questionSet({
  title: 'My lecture: full title shown on the projector',
  short: 'My lecture',            // short name used in the question mix
  generators: [],                 // e.g. ['sfWrite', 'prefix']
  stealGenerators: [],            // e.g. ['stealPhoton']
  generalWeight: 1,               // how often general (el: null) questions come up, relative to element ones
  questions: [
    { el: null, q: 'A general question that can appear on any element?',
      a: 'Right answer', w: ['Wrong 1', 'Wrong 2', 'Wrong 3'],
      x: 'Why the right answer is right.' },
    { el: 'Na', q: 'A question that only appears when someone taps sodium?',
      a: 'Right answer', w: ['Wrong 1', 'Wrong 2', 'Wrong 3'],
      x: 'Explanation.' },
    { el: null, steal: true, q: 'A steal challenge: what is 2.0 × 3.5? Give 2 s.f.',
      n: 7.0, tol: 0.05, show: '7.0',
      x: '2.0 × 3.5 = 7.0' },
  ]
});
