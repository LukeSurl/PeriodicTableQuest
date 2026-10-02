// Generated questions for Atoms lecture 2 (Electromagnetic radiation and energy levels).
// Needs gen-skills.js (for the shared number formatting) to be loaded first.
(function () {
  const Q = window.PQ_QUIZ, { rnd, pick, shuffle } = Q.util;
  const { toSF, num, round, unique } = Q.fmt;
  const lc = e => e.n.toLowerCase();

  // Constants as quoted on the slides
  const C = 3.00e8, H = 6.626e-34, NA = 6.022e23;
  const K_IE = 3.5e-19;                       // ionisation energy of potassium metal, per atom (slide 19)
  // Hydrogen energy levels as drawn on the slide, kJ mol−1 (n = ∞ is 0)
  const LEVEL = { 1: -1312, 2: -328, 3: -146, 4: -82, 5: -52.5 };
  const SERIES = { 1: ['Lyman', 'ultraviolet'], 2: ['Balmer', 'visible'], 3: ['Paschen', 'infrared'], 4: ['Brackett', 'infrared'] };
  // UK local radio. FM frequencies are current; the BBC medium wave (MW) services have closed,
  // so they carry the year they stopped. Radio Caroline is still on 648 kHz MW.
  // [name, frequency in Hz, area or '', year the service closed or null]
  const STATIONS = [
    ['BBC Radio Cornwall', 95.2e6, 'East Cornwall'], ['BBC Radio Cornwall', 103.9e6, 'West Cornwall'],
    ['BBC Radio Devon', 103.4e6, ''], ['BBC Radio Devon', 95.8e6, 'Exeter'], ['BBC Radio Devon', 94.8e6, 'Barnstaple'], ['BBC Radio Devon', 104.3e6, 'Torbay'],
    ['BBC Radio Bristol', 94.9e6, ''], ['BBC Radio Solent', 96.1e6, ''], ['BBC Radio Manchester', 95.1e6, ''], ['BBC Radio Merseyside', 95.8e6, ''],
    ['BBC Radio Lancashire', 95.5e6, ''], ['BBC Radio WM', 95.6e6, ''], ['BBC Radio Guernsey', 93.2e6, ''],
    ['BBC Radio Devon', 801e3, 'Barnstaple', 2021], ['BBC Radio Devon', 990e3, 'Exeter', 2021], ['BBC Radio Cornwall', 630e3, '', 2020],
    ['BBC Radio Solent', 999e3, '', 2020], ['BBC Radio Merseyside', 1485e3, '', 2020], ['BBC Radio Lancashire', 855e3, '', 2021],
    ['BBC Radio Bristol', 1548e3, '', 2016], ['Radio Caroline', 648e3, 'Suffolk']];
  const freqText = st => st[1] < 1e7 ? `${st[1] / 1e3} kHz MW` : `${st[1] / 1e6} MHz FM`;
  const stationText = st => st[3]
    ? `Until ${st[3]}, ${st[0]} also broadcast on ${freqText(st)}${st[2] ? ` in ${st[2]}` : ''}`
    : `${st[0]} broadcasts on ${freqText(st)}${st[2] ? ` in ${st[2]}` : ''}`;
  const stationOpt = st => `${st[0]} (${freqText(st)})`;

  const kj = v => (Math.round(v * 10) / 10).toString().replace(/\.0$/, '').replace('-', '−');

  const REL = 0.006;

  Object.assign(Q.GEN, {
    // Wavelength to frequency
    a2Freq() {
      const [lam, ctx] = pick([[rnd(280) + 400, 'visible light'], [rnd(250) + 120, 'ultraviolet light'], [rnd(4000) + 800, 'infrared radiation']]);
      const nu = C / (lam * 1e-9);
      const ans = `${toSF(nu)} s<sup>−1</sup>`;
      return { id: `a2:f:${lam}`,
        q: `What is the frequency of ${ctx} with a wavelength of ${lam} nm?`,
        a: ans, w: unique(ans, [toSF(C / lam), toSF(nu / 1e3), toSF(nu * 1e3), toSF(lam * 1e-9 / C)].map(x => `${x} s<sup>−1</sup>`)),
        x: `ν = c / λ = 3.00 × 10<sup>8</sup> m s<sup>−1</sup> ÷ ${toSF(lam * 1e-9)} m = ${ans}. Convert nm to m first.` };
    },
    // Frequency to wavelength
    a2Lambda() {
      const thz = rnd(500) + 430;                         // 430 to 929 THz
      const lam = C / (thz * 1e12) * 1e9;
      const ans = `${num(lam)} nm`;
      return { id: `a2:l:${thz}`,
        q: `Light has a frequency of ${thz} THz. What is its wavelength?`,
        a: ans, w: unique(ans, [num(lam * 1000), num(lam / 1000), num(C / thz), num(lam * 10)].map(x => `${x} nm`)),
        x: `λ = c / ν = 3.00 × 10<sup>8</sup> ÷ ${toSF(thz * 1e12)} s<sup>−1</sup> = ${toSF(lam * 1e-9)} m = ${ans}. 1 THz = 10<sup>12</sup> Hz.` };
    },
    // Energy of one photon from a frequency
    a2Energy() {
      if (Math.random() < 0.5) {
        const st = pick(STATIONS), f = st[1], mw = f < 1e7;
        const E = H * f, shown = mw ? f / 1e3 : f / 1e6;
        const ans = `${toSF(E)} J`;
        return { id: `a2:e:${f}`,
          q: `${stationText(st)}. What is the energy of one ${st[3] ? 'of those' : 'of its'} photons?`,
          a: ans, w: unique(ans, [toSF(H * shown), toSF(f / H), toSF(H / f), toSF(E * 1e3)].map(x => `${x} J`)),
          x: `${shown} ${mw ? 'kHz' : 'MHz'} = ${toSF(f, 4)} s<sup>−1</sup>, so E = hν = 6.626 × 10<sup>−34</sup> J s × ${toSF(f, 4)} s<sup>−1</sup> = ${ans}.` };
      }
      const [v, unit, f, ctx] = pick([[(rnd(30) + 10) / 10, 'GHz', 1e9, 'A microwave oven uses radiation at'], [rnd(400) + 430, 'THz', 1e12, 'Visible light has a frequency of']]);
      const E = H * v * f;
      const ans = `${toSF(E)} J`;
      return { id: `a2:e:${unit}:${v}`,
        q: `${ctx} ${v} ${unit}. What is the energy of one photon?`,
        a: ans, w: unique(ans, [toSF(H * v), toSF(v * f / H), toSF(H / (v * f)), toSF(E * 1e3)].map(x => `${x} J`)),
        x: `E = hν = 6.626 × 10<sup>−34</sup> J s × ${toSF(v * f)} s<sup>−1</sup> = ${ans}. Convert ${unit} to Hz (s<sup>−1</sup>) first.` };
    },
    // Which of two UK radio stations has the more energetic photons
    a2Radio() {
      let a, b;
      do { [a, b] = shuffle(STATIONS).slice(0, 2); } while (a[1] === b[1] || a[0] === b[0]);
      const hi = a[1] > b[1] ? a : b, lo = hi === a ? b : a;
      const past = a[3] || b[3];
      return { id: `a2:rd:${a[1]}:${b[1]}`,
        q: `${stationText(a)}. ${stationText(b)}. Which ${past ? 'signal has (or had)' : 'station has'} the more energetic photons?`,
        a: stationOpt(hi), w: [stationOpt(lo), 'Neither: they are the same, as both are radio waves', 'It depends on the transmitter power'],
        x: `E = hν, so the higher frequency wins: ${freqText(hi).split(' ')[0]} ${freqText(hi).split(' ')[1]} beats ${freqText(lo).split(' ')[0]} ${freqText(lo).split(' ')[1]}${hi[1] >= 1e7 && lo[1] < 1e7 ? ' (1 MHz = 1000 kHz)' : ''}. Transmitter power changes how many photons are sent, not the energy of each.` };
    },
    // Hydrogen emits nothing at this wavelength: what does that mean?
    a2Missing() {
      // Visible wavelengths at least 10 nm from every hydrogen emission line (656.3, 486.1, 434.0, 410.2 nm)
      const lam = pick([450, 460, 470, 500, 520, 540, 560, 580, 600, 620, 640, 680, 700]);
      const E = H * C / (lam * 1e-9);
      return { id: `a2:mi:${lam}`,
        q: `Hydrogen emits a red line at 656 nm, but nothing at ${lam} nm. What does the missing ${lam} nm line tell you?`,
        a: `No two of hydrogen's energy levels are ${toSF(E)} J apart`,
        w: [`Hydrogen atoms absorb all ${lam} nm light`, `${lam} nm light is invisible`, `The ${lam} nm transition is too slow to see`],
        x: `A ${lam} nm photon would carry E = hc/λ = ${toSF(E)} J. Every emitted photon matches the gap between two levels, so no pair of hydrogen levels has that gap.` };
    },
    // Region of the spectrum
    a2Region() {
      const R = [['X-rays', () => `${(rnd(40) + 1) / 10} nm`], ['ultraviolet', () => `${rnd(230) + 120} nm`], ['visible', () => `${rnd(240) + 430} nm`],
        ['infrared', () => `${(rnd(40) + 2) / 2} µm`], ['microwaves', () => `${rnd(10) + 2} cm`], ['radio waves', () => `${rnd(40) + 2} m`]];
      const k = rnd(R.length), [name, gen] = R[k], val = gen();
      const others = shuffle(R.map(r => r[0]).filter(n => n !== name)).slice(0, 3);
      return { id: `a2:r:${val}`,
        q: `Electromagnetic radiation has a wavelength of ${val}. Which part of the spectrum is it in?`,
        a: name[0].toUpperCase() + name.slice(1), w: others.map(o => o[0].toUpperCase() + o.slice(1)),
        x: `From short to long wavelength: X-rays (below about 10 nm), ultraviolet (to about 400 nm), visible (about 400–700 nm), infrared (to about 1 mm), microwaves, then radio waves. ${val} is ${name}.` };
    },
    // Highest energy photon from four wavelengths
    a2Highest() {
      const lams = shuffle([rnd(150) + 150, rnd(150) + 400, rnd(400) + 700, rnd(5000) + 2000]).map(String);
      const hi = Math.random() < 0.5;
      const target = hi ? Math.min(...lams) : Math.max(...lams);
      return { id: `a2:h:${lams.join('-')}:${hi}`,
        q: hi ? 'Which wavelength has the highest energy per photon?' : 'Which wavelength has the lowest frequency?',
        a: `${target} nm`, w: lams.filter(l => +l !== target).map(l => `${l} nm`),
        x: hi ? `E = hν and ν = c/λ, so the shortest wavelength (${target} nm) has the highest frequency and the most energetic photons.`
              : `ν = c/λ, so the longest wavelength (${target} nm) has the lowest frequency.` };
    },
    // Photoelectric effect on potassium
    a2Photo() {
      const lam = pick([200, 250, 300, 350, 400, 450, 650, 700, 750, 800, 900, 1000]);
      const E = H * C / (lam * 1e-9), yes = E > K_IE;
      const opts = ['Yes: each photon has more energy than is needed', 'No: each photon has too little energy', 'Only if the light is bright enough', 'Yes, but only after energy has built up for a while'];
      return { id: `a2:pe:${lam}`,
        q: `The ionisation energy of potassium metal is 3.5 × 10<sup>−19</sup> J per atom. Will ${lam} nm light eject electrons from it?`,
        a: yes ? opts[0] : opts[1], w: yes ? opts.slice(1) : [opts[0], opts[2], opts[3]],
        x: `Each photon carries E = hc/λ = ${toSF(E)} J, which is ${yes ? 'more' : 'less'} than 3.5 × 10<sup>−19</sup> J. Brightness only changes how many photons arrive, not the energy of each.` };
    },
    // Photon energy from the energy-level diagram
    a2Gap() {
      const lo = 1 + rnd(3), hi = lo + 1 + rnd(5 - lo), emit = Math.random() < 0.6;
      const El = LEVEL[lo], Eh = LEVEL[hi], d = Eh - El;
      const ans = `${kj(d)} kJ mol<sup>−1</sup>`;
      return { id: `a2:g:${hi}:${lo}:${emit}`,
        q: `Hydrogen's energy levels are n = 1: −1312, n = 2: −328, n = 3: −146, n = 4: −82 and n = 5: −52.5 kJ mol<sup>−1</sup>. What is the photon energy when an atom ${emit ? `drops from n = ${hi} to n = ${lo}` : `in n = ${lo} absorbs a photon and moves to n = ${hi}`}?`,
        a: ans, w: unique(ans, [kj(-El - Eh), kj(-El), kj(-Eh), kj(d / 2)].map(x => `${x} kJ mol<sup>−1</sup>`)),
        x: `The photon energy equals the gap between the levels: ${kj(Eh)} − (${kj(El)}) = ${kj(d)} kJ mol<sup>−1</sup>. ${emit ? 'Emission' : 'Absorption'} uses the same gap in either direction.` };
    },
    // Ionising hydrogen: ground state compared with an excited state
    a2IonCompare() {
      const n = 2 + rnd(4), fromGround = Math.random() < 0.5;
      const opts = ['More energy', 'Less energy', 'The same amount of energy'];
      const ans = fromGround ? 'More energy' : 'Less energy';
      return { id: `a2:ic:${n}:${fromGround}`,
        q: fromGround
          ? `Compared with ionising a hydrogen atom that is already excited to n = ${n}, ionising one in its ground state (n = 1) takes…`
          : `Compared with ionising a hydrogen atom in its ground state (n = 1), ionising one that is already excited to n = ${n} takes…`,
        a: ans, w: opts.filter(o => o !== ans),
        x: `Ionising means taking the electron to n = ∞, where its energy is zero. From n = 1 (−1312 kJ mol<sup>−1</sup>) that takes 1312 kJ mol<sup>−1</sup>; from n = ${n} (${kj(LEVEL[n])} kJ mol<sup>−1</sup>) it takes only ${kj(-LEVEL[n])} kJ mol<sup>−1</sup>, because the atom is already part of the way there.` };
    },
    // Longest wavelength that can ionise an atom of the tapped element
    a2IonLambda(e) {
      if (!e.ie || e.z > 100) return null;
      const lam = H * C * NA / (e.ie * 1e3) * 1e9;
      const ans = `${num(lam)} nm`;
      return { id: `a2:il:${e.s}`, weight: 2,
        q: `The first ionisation energy of ${lc(e)} is ${e.ie} kJ mol<sup>−1</sup>. Roughly what is the longest wavelength of light that can ionise a gas-phase ${lc(e)} atom?`,
        a: ans, w: unique(ans, [num(lam * 1000), num(lam / 1000), num(lam * 10), num(lam / 10)].map(x => `${x} nm`)),
        x: `As in the guanine example: ${e.ie} kJ mol<sup>−1</sup> × 10<sup>3</sup> ÷ N<sub>A</sub> = ${toSF(e.ie * 1e3 / NA)} J per atom; ν = E/h = ${toSF(e.ie * 1e3 / NA / H)} s<sup>−1</sup>; λ = c/ν = ${ans}.` };
    }
  });

  Object.assign(Q.STEAL, {
    // Guanine method, applied to the tapped element
    s2IonLambda(e) {
      if (!e.ie || e.z > 100) return null;
      const lam = H * C * NA / (e.ie * 1e3) * 1e9;
      return { id: `s2:il:${e.s}`, weight: 3, num: round(lam), rel: REL, unit: 'nm', show: `${num(lam)} nm`,
        q: `The first ionisation energy of ${lc(e)} is ${e.ie} kJ mol<sup>−1</sup>. What is the longest wavelength of light, in nm, that can ionise a gas-phase ${lc(e)} atom? Use c = 3.00 × 10<sup>8</sup> m s<sup>−1</sup>, h = 6.626 × 10<sup>−34</sup> J s, N<sub>A</sub> = 6.022 × 10<sup>23</sup> mol<sup>−1</sup>. Give 3 s.f.`,
        x: `${e.ie} × 10<sup>3</sup> J mol<sup>−1</sup> ÷ N<sub>A</sub> = ${toSF(e.ie * 1e3 / NA)} J; ν = E/h = ${toSF(e.ie * 1e3 / NA / H)} s<sup>−1</sup>; λ = c/ν = ${toSF(lam * 1e-9)} m = ${num(lam)} nm.` };
    },
    // Wavelength of a hydrogen emission line
    s2Line() {
      const lo = 1 + rnd(3), hi = lo + 1 + rnd(5 - lo);
      const d = LEVEL[hi] - LEVEL[lo];
      const lam = H * C * NA / (d * 1e3) * 1e9;
      return { id: `s2:ln:${hi}:${lo}`, num: round(lam), rel: REL, unit: 'nm', show: `${num(lam)} nm`,
        q: `Hydrogen's energy levels are n = 1: −1312, n = 2: −328, n = 3: −146, n = 4: −82 and n = 5: −52.5 kJ mol<sup>−1</sup>. What is the wavelength, in nm, of the photon emitted when an atom drops from n = ${hi} to n = ${lo}? Use c = 3.00 × 10<sup>8</sup> m s<sup>−1</sup>, h = 6.626 × 10<sup>−34</sup> J s, N<sub>A</sub> = 6.022 × 10<sup>23</sup> mol<sup>−1</sup>. Give 3 s.f.`,
        x: `Gap = ${kj(d)} kJ mol<sup>−1</sup> = ${toSF(d * 1e3 / NA)} J per photon; ν = E/h = ${toSF(d * 1e3 / NA / H)} s<sup>−1</sup>; λ = c/ν = ${num(lam)} nm (a ${SERIES[lo][0]} line, ${SERIES[lo][1]}).` };
    },
    // Kinetic energy of a photoelectron from potassium
    s2Kinetic() {
      const lam = pick([200, 220, 240, 250, 260, 280, 300, 320, 350, 380]);
      const E = H * C / (lam * 1e-9), KE = (E - K_IE) / 1e-19;
      return { id: `s2:ke:${lam}`, num: Math.round(KE * 10) / 10, tol: 0.06, unit: '× 10<sup>−19</sup> J', show: `${KE.toFixed(1)} × 10<sup>−19</sup> J`,
        q: `Potassium metal needs 3.5 × 10<sup>−19</sup> J per atom to remove an electron. ${lam} nm UV light shines on it. What is the kinetic energy of each ejected electron, in units of 10<sup>−19</sup> J? Use c = 3.00 × 10<sup>8</sup> m s<sup>−1</sup> and h = 6.626 × 10<sup>−34</sup> J s. Give 2 s.f.`,
        x: `E(photon) = hc/λ = ${toSF(E)} J. The excess, ${toSF(E)} − 3.5 × 10<sup>−19</sup> = ${toSF(KE * 1e-19, 2)} J, becomes the electron's kinetic energy.` };
    },
    // Energy of one photon from a UK radio station
    s2Radio() {
      const st = pick(STATIONS), f = st[1], mw = f < 1e7, p = Math.floor(Math.log10(H * f));
      const E = H * f / Math.pow(10, p), shown = mw ? `${f / 1e3} kHz` : `${f / 1e6} MHz`;
      return { id: `s2:rd:${f}`, num: round(E), rel: REL, unit: `× 10<sup>${p}</sup> J`.replace('-', '−'), show: `${E.toFixed(2)} × 10<sup>−${-p}</sup> J`,
        q: `${stationText(st)}. What is the energy of one ${st[3] ? 'of those' : 'of its'} photons, in units of 10<sup>−${-p}</sup> J? Use h = 6.626 × 10<sup>−34</sup> J s. Give 3 s.f.`,
        x: `${shown} = ${toSF(f, 4)} s<sup>−1</sup>; E = hν = 6.626 × 10<sup>−34</sup> × ${toSF(f, 4)} = ${E.toFixed(2)} × 10<sup>−${-p}</sup> J.` };
    }
  });
})();
