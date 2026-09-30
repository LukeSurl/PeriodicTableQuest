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
3. Press **C** to hide or show the control bar.
4. When the timer reaches zero the board locks and the winner is shown. **+1 min** or **Play on** reopens it.
5. **Clear board** keeps the teams and wipes the table. **New game** starts a fresh game with a new QR code and new teams.

Before the game starts, students can tap any element for practice questions; nothing is claimed.

### Rules you can change in `js/config.js`

- Team names and colours (currently Teal `#007A75` and Coral `#C8553D`, chosen to sit with the pale-teal/deep-teal slide palette and to stay distinguishable for colour-blind students).
- `defaultMinutes`, `allowSteal`, `shieldSeconds` (how long a new claim is protected from stealing) and `wrongCooldownSeconds`.

## Questions

Questions live in `js/questions.js`. For each tapped element the game picks from:

- your own questions for that element (e.g. ¹⁵N and Meselson–Stahl on nitrogen, the 3 : 1 chlorine M/M+2 pattern on chlorine, Earth versus Jupiter argon on argon). Questions beyond Lecture 1 and A-level are parked in an unused `isotopesExtension` bank;
- questions generated from real isotope data for that element: neutron and proton counts, nuclide notation, electrons in common ions, relative atomic mass calculations, which isotope is more abundant, and single-isotope elements;
- occasional general questions (definitions, the dalton, kDa for proteins).

Every answer is followed by a one-line explanation. Relative atomic mass calculations use mass numbers and percentages to 1 d.p., and the explanation gives the precise value too. Any calculation that lands near a rounding boundary is left out.

### Steal challenges

Taking an element the other team owns needs a harder question with a typed numeric answer:

- relative atomic mass from percentage abundances (2 d.p.);
- relative atomic mass from mass spectrum peak heights, where students must divide by the total peak height (2 d.p.);
- percentage abundance of an isotope from a sample's relative atomic mass, including ¹⁵N-, ¹³C-, ²H- and ¹⁸O-labelled samples (1 d.p.);
- Cl₂ and Br₂ molecular ion peak heights (whole number).

Answers must be within rounding of the correct value (±0.01 for 2 d.p., ±0.1 for 1 d.p.). A wrong answer shows the right value and the working. About 35 elements have suitable isotope data; tapping any other element (sodium, gold, the superheavies) gives a challenge about a different element, and the phone says so.

### Typesetting

Question text is tidied automatically before it is shown: numbers in standard form (3.00 × 10⁸), a number and its unit (0.10 g, 10⁸ m) and the parts of compound units (mol dm⁻³, J s, g cm⁻³) are held together with non-breaking spaces so they never split across lines. You can type ordinary spaces when writing questions.

### Mixing question sets

The projector's control bar has a **Question mix** box with a number for each question set (Skills 1, Atoms 1, Isotope extras). Each question a student gets is drawn from a set at random in those proportions, so 75 / 25 gives roughly three Skills 1 questions for every Atoms 1 question. Set a number to 0 to leave that set out. Changes apply to the next question each phone asks for, even mid-game. The starting values come from `mix` in `js/config.js`.

The **Skills 1** set (Chemistry Skills 1: Maths for chemists) has about 40 questions written from the lecture, plus generated ones with fresh numbers every time: standard form, multiplying and adding in standard form, prefixes, cubed units, counting significant figures, reporting products and sums, moles from mass for the tapped element, and n = cV. Its steal challenges need a typed answer: moles or mass for the tapped element, the element's density in kg m⁻³ or the mass of a cube of it, the Week 3 chloride titration, AgNO₃ and MgCl₂·6H₂O stoichiometry, photon energy per mole or frequency in THz, and hydrate molar masses. Answers within ±0.5% (correct to 3 s.f.) count.

### Using it for another lecture

Copy the `template` block at the bottom of `js/questions.js`, rename it (e.g. `light`), write your questions, and set `topic: 'light'` in `js/config.js`. Set `generators: []` if the built-in isotope questions don't fit the topic. A question with `el: null` can appear on any element; one with `el: 'Na'` appears only on sodium.

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
| `js/config.js` | Settings: Firebase, teams, timings, topic |
| `js/questions.js` | Question banks |
| `js/quiz.js` | Picks and generates questions |
| `js/elements.js` | Element and isotope data (from the `mendeleev` package, IUPAC/NUBASE values) |
| `js/backend.js`, `js/table.js`, `js/host.js`, `js/play.js` | Game code |
| `js/vendor/qrcode.js` | QR code generator (MIT licence, Kazuhiko Arase) |
| `database.rules.json` | Firebase security rules |
