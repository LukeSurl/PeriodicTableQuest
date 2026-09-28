// Periodic Table Quest settings. This is the only file you should need to edit.
window.PQ_CONFIG = {

  // 1. Paste your Firebase web app config here (see README, step 2).
  //    While this is null the game runs in DEMO mode: everything works, but
  //    only between tabs of one browser on one computer.
  firebase: {
    apiKey: "AIzaSyDMHq0RBpDcPfpssygFYrf9Z8ZKuR2IreA",
    authDomain: "periodic-table-quest.firebaseapp.com",
    databaseURL: "https://periodic-table-quest-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "periodic-table-quest",
    storageBucket: "periodic-table-quest.firebasestorage.app",
    messagingSenderId: "647305885725",
    appId: "1:647305885725:web:ff6cd56a8b42d462b96ef4"
  },

  // 2. Which question bank to use (see js/questions.js).
  topic: 'isotopes',

  // 3. Teams. Keys 'a' and 'b' are used internally; change names and colours freely.
  //    Colours are picked to match the lecture slide palette and to stay
  //    distinguishable for colour-blind students.
  teams: {
    a: { name: 'Blue',  colour: '#007A75' },
    b: { name: 'Red', colour: '#C8553D' }
  },

  // 4. Game rules
  defaultMinutes: 10,        // default countdown length on the projector
  allowSteal: true,          // can a team take an element the other team owns?
  shieldSeconds: 3,         // a freshly claimed element can't be stolen for this long
  wrongCooldownSeconds: 8,   // pause after a wrong answer, to discourage guessing

  // 5. Branding
  title: 'Periodic Table Quest',
  moduleCode: 'BIO1347'
};
