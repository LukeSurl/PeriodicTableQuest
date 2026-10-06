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

Open the site on your laptop, scan the QR code with your phone, press **Start**, and claim an element. If the element changes colour on the laptop, you are ready.

## Class size and the free plan

Firebase's free (Spark) plan allows **100 simultaneous connections**. The projector uses one, and each phone uses one while the page is open. If more than about 95 students might play at once, upgrade the project to the pay-as-you-go (Blaze) plan in the Firebase console. A game like this uses a tiny fraction of the allowance that Blaze still gives free each month, so the expected bill is zero, but Blaze needs a payment card, so set a budget alert (for example £1) when you upgrade.

## In the lecture

1. Open the site on the lectern PC. Press **F** for full screen.
2. Set the countdown in minutes, or type the time the lecture starts in "or ends at" (e.g. 12:05). Press **Start**.
3. Press **Topics** (or **T**) to choose which question sets to use and their share of the questions. Press **C** to hide or show the control bar.
4. When the timer reaches zero the board locks and the winner is shown. **+1 min** or **Play on** reopens it.
5. **Clear board** keeps the teams and wipes the table. **New game** starts a fresh game with a new QR code and new teams.

Before the game starts, students can tap any element for practice questions; nothing is claimed.

### Rules you can change in `js/config.js`

- Team names and colours (currently Blue `#007A75` and Red `#C8553D`, chosen to sit with the slide palette and to stay distinguishable for colour-blind students).
- `mix`, the topics and shares the projector starts with.
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

`questions/index.json` is written by GitHub Pages, so it only works on the live site. A copy run any other way (for example `demo.html` on your own computer) falls back to the four built-in sets.

### How a question is chosen

When a student taps an element, the game picks a question set according to the mix, then picks from that set's:

- hand-written questions for that element (e.g. ¹⁵N and Meselson–Stahl on nitrogen, Earth versus Jupiter argon on argon);
- generated questions that work for that element;
- general questions (`el: null`), which can appear on any element.

Every answer is followed by a short explanation. Stealing an element the other team owns uses a harder steal challenge with a typed numeric answer; answers must be within rounding of the correct value. If the chosen set has no steal challenge for the tapped element, the game tries the other sets in the mix, then a challenge about a different element (the phone says so).

### The sets so far

- **Atoms 1** (`atoms1.js`): the atom, isotopes and relative mass. Generated questions on neutrons, protons, nuclide notation, ions, relative atomic mass and isotope abundance; steal challenges on relative atomic mass from abundances or mass spectrum peaks, abundance from relative atomic mass (including ¹⁵N-, ¹³C-, ²H- and ¹⁸O-labelled samples) and Cl₂/Br₂ peak heights.
- **Isotope extras** (`atoms1-extension.js`): isotope questions beyond Lecture 1 and A-level, kept for reference.
- **Chemistry Skills 1** (`skills1.js`): standard form, prefixes, cubed units, significant figures, moles, n = cV; steal challenges on moles and mass of the tapped element, its density, the Week 3 chloride titration, stoichiometry, photon energies and hydrate molar masses.
- **Atoms 2** (`atoms2.js`): electromagnetic radiation and energy levels. Includes flame colours worked out from emission wavelengths, UK local radio frequencies (FM and former MW), the potassium photoelectric effect, missing hydrogen lines and the hydrogen energy-level diagram; steal challenges on the longest wavelength that ionises the tapped element (the guanine method), hydrogen line wavelengths, photoelectron kinetic energy and radio photon energies.

### Typesetting

Question text is tidied automatically before it is shown: numbers in standard form (3.00 × 10⁸), a number and its unit (0.10 g, 10⁸ m) and the parts of compound units (mol dm⁻³, J s, g cm⁻³) are held together with non-breaking spaces so they never split across lines. You can type ordinary spaces when writing questions.

## Things to know

- **Cheating.** The database rules stop students claiming for the other team, changing team, claiming outside the game, or stealing during the protection window. They can't check answers (that would need a paid server), so a student who knows their way round browser developer tools could claim without answering. For a warm-up game that is an acceptable trade.
- **Tidying up.** "New game" deletes the previous game. You can delete anything else under `games` in the Realtime Database console.
- **Offline fallback.** If the Wi-Fi fails, the projector keeps showing the last state and phones reconnect automatically when the network returns.

## Files

| File | What it is |
|---|---|
| `index.html` | Projector view |
| `play.html` | Student phone view (the QR code points here) |
| `demo.html` | Projector and two phones in one page, for trying it out |
| `js/config.js` | Settings: Firebase, teams, timings, starting topics |
| `questions/*.js` | Question sets, one per topic |
| `questions/index.json` | The list of question sets, written by GitHub Pages |
| `js/question_generators.js` | Question generators and steal challenges |
| `js/elements.js` | Element data: isotopes (from the `mendeleev` package, IUPAC/NUBASE values), densities, first ionisation energies |
| `js/engine/` | Game code: `tools.js`, `quiz.js`, `loader.js`, `table.js`, `backend.js`, `host.js`, `play.js` |
| `js/vendor/qrcode.js` | QR code generator (MIT licence, Kazuhiko Arase) |
| `database.rules.json` | Firebase security rules |
