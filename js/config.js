// Periodic Table Quest settings. This is the only file you should need to edit.
window.PQ_CONFIG = {

  // 1. Paste your Firebase web app config here (see README, step 2).
  //    While this is null the game runs in DEMO mode: everything works, but
  //    only between tabs of one browser on one computer.
  firebase: null,
  // firebase: {
  //   apiKey: "…",
  //   authDomain: "…firebaseapp.com",
  //   databaseURL: "https://…firebasedatabase.app",
  //   projectId: "…",
  //   appId: "…"
  // },

  // 2. Which question bank to use (see js/questions.js).
  topic: 'isotopes',

  // 3. Teams. Keys 'a' and 'b' are used internally; change names and colours freely.
  //    Colours are picked to match the lecture slide palette and to stay
  //    distinguishable for colour-blind students.
  teams: {
    a: { name: 'Teal',  colour: '#007A75' },
    b: { name: 'Coral', colour: '#C8553D' }
  },

  // 4. Game rules
  defaultMinutes: 10,        // default countdown length on the projector
  allowSteal: true,          // can a team take an element the other team owns?
  shieldSeconds: 20,         // a freshly claimed element can't be stolen for this long
  wrongCooldownSeconds: 8,   // pause after a wrong answer, to discourage guessing

  // 5. Branding
  title: 'Periodic Table Quest',
  moduleCode: 'BIO1347'
};
