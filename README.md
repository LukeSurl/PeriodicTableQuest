# Periodic Table Quest

A pre-lecture team game for BIO1347. The projector shows a periodic table and a QR code. Students scan it, are put into one of two teams, and claim elements by answering a question about the lecture topic (currently isotopes and relative atomic mass). Claimed elements turn their team's colour. The team holding the most elements when the countdown ends wins.

No names or personal data are collected. Each phone gets an anonymous ID, and the database stores only the team letter and a timestamp for each claim.

## Try it first (no setup)

Open `demo.html` in a browser. It shows the projector view and two phones side by side in one page. Press **Start**, then answer questions on either phone, or press **Simulate class** to watch the board fill.

Until you add Firebase settings, the game runs in demo mode, which only works between tabs of one browser.

## Setting it up for real (about 15 minutes, once)

### 1. Put the files on GitHub Pages

1. Create a new public repository, for example `periodic-table-quest`.
2. Upload everything in this folder (keep the folder structure).
3. In the repository go to **Settings → Pages**, set **Source** to "Deploy from a branch", choose `main` and `/ (root)`, and save.
4. After a minute the site is at `https://<your-username>.github.io/periodic-table-quest/`.

### 2. Create a Firebase project (the live scoreboard)

1. Go to <https://console.firebase.google.com>, choose **Create a project**, give it a name, and turn Google Analytics off.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save.**
3. **Build → Realtime Database → Create database.** Choose the **Belgium (europe-west1)** location and start in **locked mode**.
4. In the database's **Rules** tab, replace everything with the contents of `database.rules.json` and press **Publish**.
5. Click the gear icon → **Project settings → General**. Under "Your apps" click the web icon `</>`, register an app (no need for Firebase Hosting), and copy the `firebaseConfig` object it shows.
6. In `js/config.js`, replace `firebase: null,` with `firebase: { … },` containing only the lines between the curly brackets of Firebase's `const firebaseConfig = { … }` (apiKey, authDomain, databaseURL and so on). Don't paste the `import` or `initializeApp` lines, which will stop the page working. Check it includes a `databaseURL` line; if not, copy the URL from the top of the Realtime Database page.
7. Commit the change to GitHub. The Firebase `apiKey` is designed to be public; the database rules are what protect the data.

### 3. Rehearse

Open `classic.html` on your laptop, scan the QR code with your phone, press **Start**, and claim an element. If the element changes colour on the laptop, you are ready.

## Class size and the free plan

Firebase's free (Spark) plan allows **100 simultaneous connections**. The projector uses one, and each phone uses one while the page is open. If more than about 95 students might play at once, upgrade the project to the pay-as-you-go (Blaze) plan in the Firebase console. A game like this uses a tiny fraction of the allowance that Blaze still gives free each month, so the expected bill is zero, but Blaze needs a payment card, so set a budget alert (for example £1) when you upgrade.

## In the lecture

1. Open `classic.html` on the lectern PC (the front page links to it at the bottom). Press **F** for full screen.
2. Set the countdown in minutes, or type the time the lecture starts in "or ends at" (e.g. 12:05). Press **Start**.
3. Press **Topics** (or **T**) to choose which question sets to use and their share of the questions. **Deselect all** clears every tick, so you can pick just this lecture's sets, and **Share equally** splits 100% between the ticked ones. Press **C** to hide or show the control bar.
4. When the timer reaches zero the board locks and the winner is shown. **+1 min** or **Play on** reopens it.
5. **Clear board** keeps the teams and wipes the table. **New game** starts a fresh game with a new QR code and new teams.

Before the game starts, students can tap any element for practice questions; nothing is claimed.

### Rules you can change in `js/config.js`

- Team names and colours (currently Blue `#007A75` and Red `#C8553D`, chosen to sit with the slide palette and to stay distinguishable for colour-blind students).
- `mix`, the topics and shares the projector starts with. Left as `null`, every set in the folder gets an even share, and you choose the topics for each lecture with the Topics button.
- `defaultMinutes`, `allowSteal`, `shieldSeconds` (how long a new claim is protected from stealing) and `wrongCooldownSeconds`.

## Questions

### Where they live

| Where | What | Who edits it |
|---|---|---|
| `questions/` | One file per question set (topic), e.g. `atoms2.js`. Hand-written questions, plus the names of the generators the set uses. | Lecturers |
| `questions/_template.js` | A starting point for a new set, with instructions. Ignored by the game. | Copy it |
| `js/question_generators.js` | Generators: code that writes fresh questions from element data or random numbers, and the typed-answer steal challenges. A guide at the top explains how to add one. | Anyone comfortable with a little JavaScript |
| `js/engine/` | Everything else: choosing questions, loading sets, typesetting, the game itself. | Nobody, normally |

### Adding a topic

1. Copy `questions/_template.js` and rename the copy, e.g. `atoms3.js`. Use only letters, numbers, hyphens and underscores, and don't start the name with `_`.
2. Write the title, a short name and your questions.
3. Upload it to the `questions/` folder on GitHub.

That's all. When GitHub Pages rebuilds the site (a minute or two), it updates `questions/index.json`, the list of every `.js` file in the folder, and the new topic appears in the projector's Topics window. If a file has a mistake, the Topics window shows it as unusable with the reason (for example a typing error and its line number), and lists warnings about individual questions it had to skip. The other topics keep working.

`questions/index.json` is written by GitHub Pages, so it only works on the live site. A copy run any other way (for example `demo.html` on your own computer) falls back to the built-in sets.

### How a question is chosen

When a student taps an element, the game picks a question set according to the mix, then picks from that set's:

- hand-written questions for that element (e.g. ¹⁵N and Meselson–Stahl on nitrogen, Earth versus Jupiter argon on argon);
- generated questions that work for that element;
- general questions (`el: null`), which can appear on any element.

Every answer is followed by a short explanation. Stealing an element the other team owns uses a harder steal challenge with a typed numeric answer; answers must be within rounding of the correct value. If the chosen set has no steal challenge for the tapped element, the game tries the other sets in the mix, then a challenge about a different element (the phone says so).

### The sets so far

- **Atoms 1** (`atoms1.js`): the atom, isotopes and relative mass. Generated questions on neutrons, protons, nuclide notation, ions, relative atomic mass and isotope abundance; steal challenges on relative atomic mass from abundances or mass spectrum peaks, abundance from relative atomic mass (including ¹⁵N-, ¹³C-, ²H- and ¹⁸O-labelled samples) and Cl₂/Br₂ peak heights.
- **Isotope extras** (`atoms1-extension.js`): isotope questions beyond Lecture 1 and A-level, kept for reference.
- **Atoms 3** (`atoms3.js`): electrons as waves, wavefunctions and ψ², quantum numbers and orbital labels, orbital shapes and angular nodes, radial distribution functions, Pauli and spin, configurations of H to Be; steal challenges on subshell capacity, counting orbitals and comparing ψ values.
- **Atoms 4** (`atoms4.js`): shielding, penetration and effective nuclear charge, Hund's rule, configurations from H to Ca in full and shorthand, subshell order, trends in atomic size and ionisation energy, electron gain energies and halogen displacement; steal challenges on counting electrons, halogen displacement energies and ionisation energy per atom.
- **Molecules 1** (`molecules1.js`): what holds a bond together, potential energy curves, bond length and bond dissociation energy, Lewis structures and their limitations (questions on the Lewis model say so, so they still make sense once MO theory is taught), bond polarity and Pauling electronegativity; steal challenges on the energy to break or form the bonds in a mass of gas, and the longest wavelength of light that can break a bond.
- **Molecules 2** (`molecules2.js`): valence bond vs molecular orbital theory, the orbital approximation and LCAO, bonding and antibonding orbitals in H₂, MO energy diagrams, bond order and stability for H₂, He₂, Li₂, Be₂ and their ions (with the heavier group 1 and 2 dimers treated like Li₂ and Be₂), paramagnetism, core electrons and orbital overlap. It has no steal challenges of its own and borrows Molecules 1's bond-energy steals and Atoms 4's ionisation-energy steal; a set can list any steal generator by name.
- **Molecules 3** (`molecules3.js`): σ and π overlap of p orbitals, orbital labels (σ/π, stars, g/u, numbering), MO diagrams for O₂, F₂, Ne₂ and their ions without s–p mixing (and the heavier group 16–18 diatomics treated the same way), bond order, unpaired electrons, HOMOs and LUMOs; borrows the same steals as Molecules 2. Statements that only hold for homonuclear diatomics say so.
- **Molecules 4** (`molecules4.js`): adding and removing electrons from diatomics (with the N₂ and O₂ ion data), s–p mixing and its periodic trend, B₂ to F₂ with mixing where it matters, heteronuclear diatomics (LiH, HF and the hydrogen halides, interhalogens, CO and NO), non-bonding orbitals; borrows the same steals as Molecules 2.
- **Chemistry Skills 1** (`skills1.js`): standard form, prefixes, cubed units, significant figures, moles, n = cV; steal challenges on moles and mass of the tapped element, its density, the Week 3 chloride titration, stoichiometry, photon energies and hydrate molar masses.
- **Atoms 2** (`atoms2.js`): electromagnetic radiation and energy levels. Includes flame colours worked out from emission wavelengths, UK local radio frequencies (FM and former MW), the potassium photoelectric effect, missing hydrogen lines and the hydrogen energy-level diagram; steal challenges on the longest wavelength that ionises the tapped element (the guanine method), hydrogen line wavelengths, photoelectron kinetic energy and radio photon energies.

### Typesetting

Question text is tidied automatically before it is shown: numbers in standard form (3.00 × 10⁸), a number and its unit (0.10 g, 10⁸ m) and the parts of compound units (mol dm⁻³, J s, g cm⁻³) are held together with non-breaking spaces so they never split across lines. You can type ordinary spaces when writing questions.

## Pre-Lecture Quizzes (home page)

The site's front page (`index.html`, with its files in `plq/`) is the home page for every quiz type: `https://lukesurl.github.io/PeriodicTableQuest/`. The old `plq/` address redirects there. At the top, **Create new quiz** shows a card for each type (Quiz Grid and Periodic Table Quest); clicking one starts a new quiz of that type. Below, **Your saved quizzes** lists every quiz made or opened in this browser, of any type, newest first, with Edit, Present and Forget. Copyright and other "about" details sit quietly at the bottom. The name, the card text and the footer are in `plq/settings.js`.

All three quiz types share one editor (`grid/edit.html`), the same private edit links and the same database. A quiz's type (`grid` or `ptq`) is stored with it.

## Periodic Table Quest (new, in `quest/`)

The Quiz Grid way of working applied to Periodic Table Quest: a lecturer writes a question bank for one topic in the editor (no code, no topic mixes), and presents it with its present link (`quest/host.html?quiz=…`). Students tap an element on their phone, answer a question and claim the element; tapping an element the other team holds asks a **steal question**. In the editor each question can be:

- tied to particular **elements** (typed as symbols, or picked on a periodic table); a question with no elements can come up on any element. Elements with no question at all are greyed out and can't be claimed;
- a **steal question**, used only for steals (if there are none for an element, an ordinary question is used);
- multiple choice, or a **number answer** with a tolerance (e.g. ± 0.05, or ± 1%) and an optional unit.

Up to 200 questions per quiz. Text import accepts `Elements: Na, K` and `Steal` lines, and the AI prompt asks for element-tied and steal questions. `quest/demo.html` runs the projector and two phones with no database.

As in Quiz Grid, phones never download the answers. To claim element z, a phone first writes its answer to `eproofs/<code>/<uid>/<z>`; the database rules accept it only if it is right and the question fits that element, and a claim (`runs/<code>/cells/<z>`) needs a proof from the last minute that is newer than the element's last change. Before the timer starts, students can practise on any element.

The classic Periodic Table Quest (the site root, `questions/*.js`) is unchanged. `quest/topics/` holds its question sets as text files ready to import, made by `node tools/export-ptq-topics.js`: hand-written questions as they are, plus fixed examples from each question generator (six per generator, four per steal generator), each tied to the element it was made for. Explanations are kept as `#` note lines, which the import ignores.

## Pachinko (in `pachinko/`)

Students pick questions from a grid of tiles on their phones, as in Quiz Grid; each tile shows its question's ball in the top right corner. A right answer drops a ball in their team's colour down a pachinko board on the projector; the zone it lands in (10 to 100 points, set in `grid/js/settings.js` as `pachinko.zones`) scores for their team. A question can carry a multiplier (×2 to ×5): its ball is marked and scores that many times its zone. Each student can answer each question correctly once; when they have done the whole set the phone congratulates them and offers no repeats. Balls only bounce off pegs, walls and dividers, never each other. Each ball is a 2D disc that spins: friction at each contact turns sliding into spin and back, and the ball's decoration (its multiplier, or else its question's shape: question 1 gets the first of ten shapes, question 2 the second, and so on, starting again after ten; the phone shows the ball on each question's tile and in the corner of the open question) turns with it. When the timer ends, answers stop, every ball still falling lands, and only then is the winner declared (a few seconds' grace covers answers given just before time).

The projector runs the board. A phone's right answer is a proof (as in Quiz Grid), then a drop at `runs/<code>/drops/<uid>_<q>`, which the rules accept only with that proof and until 5 seconds after time; the projector drops the ball and writes where it landed to `runs/<code>/scores/<id>`. `pachinko/demo.html` runs the projector and two phones with no database.

Text import: `Multiplier: 2` (or `×2`) on its own line. Quiz Grid and Periodic Table Quest accept the line and ignore it, and Pachinko accepts Quiz Grid's `Label:` lines, so questions copy between the two in either direction.

## Feedback for wrong answers (all quiz types)

Any question can have its own feedback, shown under "Not quite" to a student who answers it wrongly (the same text for every wrong answer). It is optional: without it, students see the usual message. In the editor it is the "Feedback for a wrong answer" box; in text it is a `Feedback:` line, so older text without one still imports as before. The AI prompt asks for feedback only when "Include feedback for students who answer wrongly" is ticked (off by default). Feedback is stored with the questions, which phones download, so a determined student could read it in advance: it should hint, not give the answer.

## Number answers (both quiz types)

A question can have a typed number answer instead of options. The lecturer gives the value, how close an answer must be (in the same units, or as a percentage) and an optional unit shown by the answer box. Students can type `6.02e23`, `6.02 × 10^23` or a decimal comma. In text, a number answer is one line: `= 35.5 ± 0.05 g mol⁻¹`. The database stores the accepted range (`answers/<id>/lo` and `hi`) and checks each answer against it.

## Quiz Grid (version 0.1)

A simpler, general-purpose spin-off in the `grid/` folder, meant for colleagues who don't want to touch code. A lecturer types a handful of multiple-choice questions into a web page; the projector shows them as a grid of tiles with a QR code; students join in two teams as before. Each student can answer every question once. The team with more correct answers on a question wins that question (its tile shows each team's count and is outlined in the leading team's colour), and the team that wins the most questions wins the game. Equal scores are a draw. The big screen shows these rules, with a large QR code before the game starts.

- **Start page:** the Pre-Lecture Quizzes front page, `https://lukesurl.github.io/PeriodicTableQuest/`. Its Quiz Grid card creates a quiz and opens the editor. No sign-in. (The old `grid/` start page now redirects there.)
- **Edit link** (`grid/edit.html#…`): the only way back to a quiz from another computer, and anyone who has it can change the quiz. The start page also remembers the quizzes made or opened in that browser.
- **Present link** (`grid/host.html?quiz=…`): opens the projector view. Anyone with it can run the quiz but not change it.
- **Demo:** `grid/demo.html` runs the projector and two phones in one page with a sample quiz and no database. Its "edit this demo quiz" link opens the editor on the sample quiz; changes appear in the demo as you type.

Each tile shows the question's picture and short label if it has them, otherwise the question text. Pictures can be pasted straight from the clipboard (e.g. copied from a slide), dragged in or chosen as a file; they are shrunk to under about 300 KB. Below the questions, **Import questions from text** adds several at once from a simple text format, and **Generate questions from lecture material with AI** gives step-by-step instructions and a ready-made prompt to paste into ChatGPT, Copilot or similar along with the lecture slides; the AI's reply goes straight into the import box for checking. Settings such as the name, team colours, countdown and wrong-answer pause are in `grid/js/settings.js`. The AI advice shown to colleagues (which tools to use) is `aiAdvice` there.

**Setting it up:** it shares this project's Firebase connection, so the only step is to publish the updated `database.rules.json` (Realtime Database → Rules → paste → Publish). The Periodic Table Quest rules are unchanged inside it.

**Answers stay off the phones.** Phones never download the correct answers. They are stored where only someone with the edit link can read them, and the database itself checks each answer a phone sends in (`proofs/…` in the rules), so a student can't find them by inspecting the page. A determined student could still bypass the wrong-answer pause and try every option, which is acceptable for a warm-up game.

**Free-plan limit:** the 100 simultaneous connections are shared between Periodic Table Quest and every Quiz Grid game running at the same moment. If colleagues use it in parallel lectures, move the project to the Blaze plan (see "Class size and the free plan").

Not yet: explanations after answering, deleting a quiz, and a list of a lecturer's quizzes across computers.

## Things to know

- **Cheating.** The database rules stop students claiming for the other team, changing team, claiming outside the game, or stealing during the protection window. They can't check answers (that would need a paid server), so a student who knows their way round browser developer tools could claim without answering. For a warm-up game that is an acceptable trade.
- **Tidying up.** "New game" deletes the previous game. You can delete anything else under `games` in the Realtime Database console.
- **Offline fallback.** If the Wi-Fi fails, the projector keeps showing the last state and phones reconnect automatically when the network returns.

## Files

| File | What it is |
|---|---|
| `classic.html` | Projector view (classic game; it was `index.html` until the front page became the Pre-Lecture Quizzes home) |
| `play.html` | Student phone view (the QR code points here) |
| `index.html`, `plq/` | Pre-Lecture Quizzes home page (`home.js`, `plq.css`, `settings.js`); `plq/index.html` redirects to it |
| `quest/` | Periodic Table Quest (new): `host.html`, `play.html`, `demo.html`, `js/`, and `topics/` (the classic question sets as text) |
| `pachinko/` | Pachinko: `host.html`, `play.html`, `demo.html`; `js/board.js` is the board, its physics and drawing |
| `tools/export-ptq-topics.js` | Writes `quest/topics/*.txt` from `questions/*.js` |
| `demo.html` | Projector and two phones in one page, for trying it out |
| `js/config.js` | Settings: Firebase, teams, timings, starting topics |
| `questions/*.js` | Question sets, one per topic |
| `questions/index.json` | The list of question sets, written by GitHub Pages |
| `js/question_generators.js` | Question generators and steal challenges |
| `js/elements.js` | Element data: isotopes (from the `mendeleev` package, IUPAC/NUBASE values), densities, first ionisation energies |
| `js/engine/` | Game code: `tools.js`, `quiz.js`, `loader.js`, `table.js`, `backend.js`, `host.js`, `play.js` |
| `js/vendor/qrcode.js` | QR code generator (MIT licence, Kazuhiko Arase) |
| `database.rules.json` | Firebase security rules |
