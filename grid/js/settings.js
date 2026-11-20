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
  },

  // Pachinko (the pachinko/ folder): students tap for a random question; a right answer drops a
  // ball of their team's colour down a board, and the zone it lands in sets the points.
  pachinko: {
    title: 'Pachinko',
    maxQuestions: 50,
    maxMultiplier: 5,               // a question can be worth ×1 up to ×5
    zones: [100, 30, 50, 20, 10, 20, 50, 30, 100],   // points for each landing zone, left to right
    wrongCooldownSeconds: 8,
    dropGraceSeconds: 5             // a right answer just before time up can still drop its ball
  }
};
// Where each quiz type is presented, from the site root
window.GQ_SETTINGS.hostPages = { grid: 'grid/host.html', ptq: 'quest/host.html', pachinko: 'pachinko/host.html' };
// The settings for one quiz type: 'grid' (the default) or 'ptq'
window.GQ_SETTINGS.forType = type => (type === 'ptq' || type === 'pachinko'
  ? { ...window.GQ_SETTINGS, ...window.GQ_SETTINGS[type], type } : { ...window.GQ_SETTINGS, type: 'grid' });
