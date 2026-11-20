// Pre-Lecture Quizzes: settings for the home page (plq/index.html).
// To add a new kind of quiz, add an entry to `products` (its id is the quiz type).
window.PLQ_SETTINGS = {
  title: 'Pre-Lecture Quizzes',     // working name: change it here and it changes on the home page
  version: '0.2',

  // The quiz types shown under "Create new quiz", in this order
  products: [
    {
      id: 'grid',
      name: 'Quiz Grid',
      blurb: 'Write your own questions, multiple choice or with a number answer. They appear as a grid of tiles; two teams race to win the most questions.',
      icon: 'grid',
      demo: '../grid/demo.html'
    },
    {
      id: 'ptq',
      name: 'Periodic Table Quest',
      blurb: 'For chemistry. Teams claim elements on a periodic table by answering your questions, and steal them back with harder ones. Questions can be tied to particular elements.',
      icon: 'ptable',
      demo: '../quest/demo.html'
    }
  ],

  // Shown quietly at the bottom of the page
  about: {
    copyright: '© 2026 Luke Surl',
    source: 'https://github.com/lukesurl/PeriodicTableQuest',
    privacy: 'No student names or other personal data are collected. Each phone gets an anonymous ID for the length of a game.',
    credits: 'QR codes drawn with qrcode-generator by Kazuhiko Arase (MIT licence). Live scores use Google Firebase.'
  }
};
