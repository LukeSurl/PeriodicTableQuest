// Quiz Grid settings. The Firebase connection is shared with Periodic Table Quest
// (js/config.js in the folder above), so there is nothing to set up here.
window.GQ_SETTINGS = {
  title: 'Quiz Grid',               // working name: change it here and it changes everywhere

  teams: {
    a: { name: 'Blue', colour: '#007A75' },
    b: { name: 'Red',  colour: '#C8553D' }
  },

  defaultMinutes: 10,               // default countdown on the projector
  wrongCooldownSeconds: 10,         // pause after a wrong answer, to discourage guessing

  maxQuestions: 30,
  maxOptions: 6,
  labelLength: 40,                  // longest "short label" for a tile
  imageMaxPixels: 1000,             // pictures are shrunk to fit this many pixels on their longest side
  imageMaxKB: 300,                  // and squeezed until they are smaller than this

  // Shown in the editor's "Generate questions with AI" box: which AI tools colleagues should use
  aiAdvice: 'Use an AI tool your institution allows for teaching material. Ordinary lecture slides are usually fine to share; never paste in student names, marks or other personal data.',
  aiDefaultCount: 8,
  aiDefaultStudents: 'university students',

  // Periodic Table Quest (the quest/ folder) uses the settings above, changed by these.
  // Its quizzes are made with the same editor and kept in the same database.
  ptq: {
    title: 'Periodic Table Quest',
    maxQuestions: 200,              // a question bank: students meet many questions in one game
    shieldSeconds: 3,               // a freshly claimed element can't be stolen for this long
    wrongCooldownSeconds: 8,
    aiDefaultCount: 20,
    aiDefaultSteals: 4
  }
};
// The settings for one quiz type: 'grid' (the default) or 'ptq'
window.GQ_SETTINGS.forType = type => (type === 'ptq' ? { ...window.GQ_SETTINGS, ...window.GQ_SETTINGS.ptq, type: 'ptq' } : { ...window.GQ_SETTINGS, type: 'grid' });
