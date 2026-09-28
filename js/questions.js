// Question banks for Periodic Table Quest.
//
// Each topic has:
//   title       shown on the projector and phones
//   generators  built-in question types that are generated for every element
//               from the element data (see quiz.js). Use [] for a topic that
//               only uses your own questions.
//   questions   your own questions. Each one is:
//     el  element symbol ('Cl'), a list of symbols (['Cl','Br']), or null for a
//         general question that can appear on any element
//     q   the question (HTML allowed, e.g. <sub>2</sub>)
//     a   the correct answer
//     w   three wrong answers
//     x   a short explanation, shown after the student answers
//
// Steal challenges (harder, typed numeric answer) can be added the same way:
//     { el: 'Ne', steal: true, q: 'Question…', n: 20.18, tol: 0.01, dp: 2, x: 'Working…' }
//   n is the answer, tol how far off an answer may be and still count, dp the
//   decimal places to ask for. stealGenerators lists the built-in challenge types.
//
// To add a topic for another lecture, copy the "template" block at the bottom,
// rename it, fill in questions, and set topic: '<name>' in config.js.

window.PQ_BANKS = {

  isotopes: {
    title: 'The atom, isotopes and relative mass',
    generators: ['neutrons', 'protons', 'notation', 'ions', 'ram', 'abundance', 'mono'],
    // Harder numeric challenges used when stealing an element from the other team
    stealGenerators: ['stealRam', 'stealPeaks', 'stealAbundance', 'stealDiatomic'],
    questions: [

      // ---------- General questions (can appear on any element) ----------
      { el: null, q: 'Isotopes of the same element have the same number of ___ but a different number of ___.',
        a: 'protons; neutrons', w: ['neutrons; protons', 'electrons; protons', 'protons; electrons'],
        x: 'The number of protons (atomic number) defines the element. Isotopes differ only in their number of neutrons, and so in mass.' },
      { el: null, q: 'Which number tells you which element an atom is?',
        a: 'The atomic number (number of protons)', w: ['The mass number', 'The number of neutrons', 'The relative atomic mass'],
        x: 'Every atom with 6 protons is carbon, whatever its neutron count. Change the proton number and you change the element.' },
      { el: null, q: 'The mass number of an atom is equal to…',
        a: 'protons + neutrons', w: ['protons + electrons', 'neutrons only', 'protons only'],
        x: 'Protons and neutrons (nucleons) each have a mass of about 1 u; electrons contribute almost nothing.' },
      { el: null, q: 'Two isotopes of the same element will generally…',
        a: 'react in the same way chemically, but differ slightly in mass', w: ['have different chemical properties', 'have different numbers of electrons in the neutral atom', 'sit in different places on the periodic table'],
        x: 'Chemistry is governed by electrons. Isotopes have the same number of protons, so the same number of electrons in the neutral atom, and the same chemistry.' },
      { el: null, q: 'The relative atomic mass printed on the periodic table is…',
        a: 'an abundance-weighted average of the masses of the naturally occurring isotopes', w: ['the mass of the most common isotope', 'the simple average of all known isotopes', 'the number of protons plus neutrons in one atom'],
        x: 'It is a weighted mean, which is why chlorine is 35.45 even though no single chlorine atom has that mass.' },
      { el: null, q: 'Relative atomic mass (A<sub>r</sub>) has units of…',
        a: 'none: it is a ratio', w: ['grams', 'g mol<sup>−1</sup>', 'kilograms per atom'],
        x: 'A<sub>r</sub> compares the average atomic mass with 1/12 of the mass of a <sup>12</sup>C atom, so the units cancel. Molar mass (g mol<sup>−1</sup>) has the same number but does have units.' },
      { el: null, q: 'One dalton (1 Da, also written 1 u) is defined as…',
        a: '1/12 of the mass of a <sup>12</sup>C atom', w: ['the mass of one proton exactly', 'the mass of one hydrogen atom exactly', '1/16 of the mass of an <sup>16</sup>O atom'],
        x: 'The unified atomic mass unit and the dalton are the same thing: 1/12 of the mass of a carbon-12 atom.' },
      { el: null, q: 'Hen egg-white lysozyme has a mass of about 14.3 kDa. In daltons, that is…',
        a: '14,300 Da', w: ['1,430 Da', '143,000 Da', '14.3 Da'],
        x: 'k means 10<sup>3</sup>, so 14.3 kDa = 14,300 Da. Protein masses are nearly always quoted in kDa.' },
      { el: null, q: 'Which of these would change if you swapped an atom for a heavier isotope of the same element?',
        a: 'The mass of the atom', w: ['The number of protons', 'The charge on the nucleus', 'The number of electrons in the neutral atom'],
        x: 'Only the neutron count changes, so only the mass changes. Nuclear charge, and therefore electron count, stay the same.' },
      { el: null, q: 'A sample from a different source has a slightly different relative atomic mass for the same element. The best explanation is…',
        a: 'its isotopic composition is different', w: ['its atoms contain a different number of protons', 'it has been weighed less accurately', 'its atoms have lost electrons'],
        x: 'Relative atomic mass is a property of a sample, not a constant of nature. Change the mix of isotopes and the weighted average changes.' },

      // ---------- Element-linked questions ----------
      { el: 'H', q: 'Deuterium (<sup>2</sup>H) is an isotope of hydrogen. How many neutrons does a deuterium atom contain?',
        a: '1', w: ['0', '2', '3'], x: 'Mass number 2 minus 1 proton leaves 1 neutron. Ordinary hydrogen, <sup>1</sup>H, has none.' },
      { el: 'H', q: 'Compared with an ordinary <sup>1</sup>H atom, a tritium (<sup>3</sup>H) atom has…',
        a: 'two extra neutrons', w: ['two extra protons', 'two extra electrons', 'one extra proton and one extra neutron'],
        x: 'All hydrogen isotopes have one proton. Tritium has mass number 3, so it carries two neutrons.' },
      { el: 'H', q: 'Biochemists run NMR spectra in solvents such as D<sub>2</sub>O and CDCl<sub>3</sub>. What is the "D"?',
        a: 'Deuterium, the hydrogen isotope <sup>2</sup>H', w: ['Dysprosium', 'A hydrogen ion, H<sup>+</sup>', 'Tritium, <sup>3</sup>H'],
        x: 'Deuterium behaves chemically like hydrogen but does not show up in a <sup>1</sup>H NMR spectrum, so the solvent does not swamp the sample.' },

      { el: 'He', q: 'Helium-3 and helium-4 differ in their number of…',
        a: 'neutrons', w: ['protons', 'electrons', 'protons and electrons'],
        x: 'Both have 2 protons (that is what makes them helium). <sup>3</sup>He has 1 neutron and <sup>4</sup>He has 2.' },

      { el: 'C', q: 'Carbon\'s relative atomic mass is 12.011, just above 12. What does that tell you?',
        a: 'A small fraction of carbon atoms are heavier than <sup>12</sup>C', w: ['Every carbon atom has a mass of 12.011 u', 'Some carbon atoms have 7 protons', 'Electrons add 0.011 u to each atom'],
        x: 'About 1.1% of carbon is <sup>13</sup>C, which pulls the weighted average slightly above 12.' },
      { el: 'C', q: 'The atomic mass unit is defined relative to which isotope?',
        a: '<sup>12</sup>C', w: ['<sup>1</sup>H', '<sup>16</sup>O', '<sup>13</sup>C'],
        x: '1 u (1 Da) is exactly 1/12 of the mass of a carbon-12 atom.' },

      { el: 'N', q: 'Meselson and Stahl grew <i>E. coli</i> on <sup>15</sup>N to show that DNA replication is semiconservative. How does <sup>15</sup>N differ from <sup>14</sup>N?',
        a: 'It has one more neutron', w: ['It has one more proton', 'It has one more electron', 'It is radioactive'],
        x: '<sup>15</sup>N is a stable isotope with 8 neutrons rather than 7. Same chemistry, slightly heavier.' },
      { el: 'N', q: 'Why could Meselson and Stahl separate DNA made with <sup>15</sup>N from DNA made with <sup>14</sup>N?',
        a: '<sup>15</sup>N-DNA is denser', w: ['<sup>15</sup>N-DNA is radioactive', '<sup>15</sup>N-DNA base-pairs differently', '<sup>15</sup>N-DNA carries more negative charge'],
        x: 'The extra neutrons make the DNA slightly denser, so heavy, hybrid and light DNA settle at different positions in a caesium chloride density gradient.' },

      { el: 'Ne', q: 'Neon is roughly 90% <sup>20</sup>Ne and 10% <sup>22</sup>Ne. Estimate its relative atomic mass.',
        a: '20.2', w: ['21.0', '21.8', '20.0'],
        x: '(0.90 × 20) + (0.10 × 22) = 18.0 + 2.2 = 20.2. The real value is 20.18.' },
      { el: 'Cl', q: 'Chlorine\'s relative atomic mass is 35.45, yet no chlorine atom has a mass of 35.45 u. Why?',
        a: 'It is an abundance-weighted average of <sup>35</sup>Cl and <sup>37</sup>Cl', w: ['Chlorine atoms have half a neutron on average', 'Electrons add 0.45 u', 'It is the simple average of 35 and 37, rounded'],
        x: 'About 76% <sup>35</sup>Cl and 24% <sup>37</sup>Cl gives a weighted average of 35.5. The simple average (36) would be wrong.' },
      { el: 'Cl', q: 'In a mass spectrum, a molecule containing one Cl atom shows peaks at M and M+2 in a ratio of roughly…',
        a: '3 : 1', w: ['1 : 1', '1 : 3', '9 : 1'],
        x: 'Roughly three quarters of chlorine atoms are <sup>35</sup>Cl and one quarter <sup>37</sup>Cl.' },
      { el: 'Ar', q: 'Argon (A<sub>r</sub> 39.95) comes before potassium (A<sub>r</sub> 39.10) in the periodic table even though it is heavier. Why?',
        a: 'The table is ordered by atomic number, not mass', w: ['Argon\'s mass was measured wrongly', 'Noble gases are always placed first', 'Potassium has more neutrons'],
        x: 'Argon has 18 protons and potassium 19. Argon\'s high mass comes from its abundance of the heavy isotope <sup>40</sup>Ar.' },
      { el: 'Ar', q: 'Most argon on Earth is <sup>40</sup>Ar, made by decay of <sup>40</sup>K in rocks. Argon from elsewhere in the Solar System has a quite different A<sub>r</sub>. This shows that…',
        a: 'relative atomic mass depends on where the sample came from', w: ['argon atoms on other planets have more protons', 'A<sub>r</sub> values on the periodic table are wrong', 'isotopes have different chemistry'],
        x: 'A<sub>r</sub> is a property of a sample. Different histories give different isotope mixtures.' },

      { el: 'U', q: 'Why can\'t <sup>235</sup>U and <sup>238</sup>U be separated by an ordinary chemical reaction?',
        a: 'Isotopes have the same electron arrangement, so the same chemistry', w: ['Uranium is chemically unreactive', 'They have different numbers of protons', 'They are both radioactive'],
        x: 'Chemistry depends on electrons. Separating isotopes needs a method that exploits their small mass difference instead.' },
    ]
  },

  // Questions beyond Lecture 1 and A-level (applications, radioactivity, history).
  // Not used unless you set topic: 'isotopesExtension' or copy them into another bank.
  isotopesExtension: {
    title: 'Isotopes: applications and extension',
    generators: [],
    questions: [
      { el: 'C', q: 'Radiocarbon dating measures how much of which isotope is left in a sample?',
        a: '<sup>14</sup>C', w: ['<sup>12</sup>C', '<sup>13</sup>C', '<sup>11</sup>C'],
        x: 'Living things take in <sup>14</sup>C with their carbon. After death it decays away with a half-life of about 5,730 years, so what remains dates the sample.' },
      { el: 'C', q: '<sup>14</sup>C has a half-life of about 5,730 years. What fraction of the original <sup>14</sup>C is left after about 11,460 years?',
        a: 'One quarter', w: ['One half', 'None', 'One eighth'],
        x: '11,460 years is two half-lives: ½ × ½ = ¼.' },
      { el: 'O', q: 'In 1941 Ruben and Kamen gave plants water labelled with <sup>18</sup>O and found the label in the O<sub>2</sub> they released. What did this show?',
        a: 'The O<sub>2</sub> from photosynthesis comes from water', w: ['The O<sub>2</sub> from photosynthesis comes from CO<sub>2</sub>', 'Plants absorb O<sub>2</sub> through their roots', '<sup>18</sup>O is radioactive'],
        x: 'Using a heavy but stable isotope as a tracer let them follow oxygen atoms from water to oxygen gas.' },

      { el: 'F', q: 'The PET tracer <sup>18</sup>F-FDG accumulates in tissues with a high metabolic rate, such as many tumours. FDG is an analogue of…',
        a: 'glucose', w: ['ATP', 'cholesterol', 'haemoglobin'],
        x: 'Fluorodeoxyglucose is taken up like glucose. Fluorine-18 has a half-life of about 110 minutes, long enough to scan but short enough to keep the dose low.' },

      { el: 'Ne', q: 'In 1913 J.J. Thomson found that neon gave two traces in his apparatus, at masses 20 and 22. This was early evidence that…',
        a: 'stable elements can exist as more than one isotope', w: ['neon is radioactive', 'neon forms Ne<sub>2</sub> molecules', 'atoms can gain protons'],
        x: 'Neon was the first stable (non-radioactive) element shown to have isotopes.' },

      { el: 'P', q: 'In the Hershey–Chase experiment, <sup>32</sup>P was used to label the bacteriophage\'s…',
        a: 'DNA', w: ['protein coat', 'lipid membrane', 'tail fibres only'],
        x: 'DNA has a phosphate backbone, while protein contains little phosphorus. The <sup>32</sup>P went into the bacteria, showing DNA is the genetic material.' },
      { el: 'S', q: 'In the Hershey–Chase experiment, <sup>35</sup>S was used to label protein. Why sulfur?',
        a: 'Protein contains sulfur (in Cys and Met) but DNA does not', w: ['DNA contains sulfur but protein does not', 'Sulfur is the most abundant element in protein', 'Sulfur binds only to DNA'],
        x: 'Each label marked one kind of molecule. The <sup>35</sup>S stayed outside the bacteria with the empty phage coats.' },

      { el: 'Br', q: 'In a mass spectrum, a molecule containing one Br atom shows peaks at M and M+2 in a ratio of roughly…',
        a: '1 : 1', w: ['3 : 1', '1 : 3', '9 : 1'],
        x: 'Bromine is about 51% <sup>79</sup>Br and 49% <sup>81</sup>Br, so the two peaks are almost equal in height.' },

      { el: 'K', q: 'Bananas are very slightly radioactive because of the potassium they contain. Which isotope is responsible?',
        a: '<sup>40</sup>K', w: ['<sup>39</sup>K', '<sup>41</sup>K', '<sup>38</sup>K'],
        x: 'About 0.012% of natural potassium is <sup>40</sup>K, which has a half-life of about 1.25 billion years.' },

      { el: 'Sr', q: 'Strontium-90 from nuclear fallout builds up in bones and teeth. Why?',
        a: 'Strontium is in the same group as calcium and behaves chemically like it', w: ['<sup>90</sup>Sr has the same mass as calcium', 'Bones absorb any radioactive element', 'Strontium replaces phosphorus in DNA'],
        x: 'Isotope identity sets the radioactivity; group membership sets the chemistry. The body treats Sr<sup>2+</sup> much like Ca<sup>2+</sup>.' },

      { el: 'Tc', q: 'Technetium-99m is the most widely used isotope in medical imaging. Which statement about technetium is true?',
        a: 'It has no stable isotopes', w: ['It is the most abundant metal in the Earth\'s crust', 'All its isotopes have 43 neutrons', 'It is a noble gas'],
        x: 'Technetium (Z = 43) is the lightest element with no stable isotope, which is why hospitals make it on site from a molybdenum-99 generator.' },
      { el: 'Mo', q: 'Hospitals produce technetium-99m from a "generator" containing which parent isotope?',
        a: '<sup>99</sup>Mo', w: ['<sup>98</sup>Mo', '<sup>99</sup>Ru', '<sup>100</sup>Mo'],
        x: 'Molybdenum-99 decays to technetium-99m. Same mass number, but Z goes up by one, from 42 to 43.' },
      { el: 'Pm', q: 'Promethium and technetium share an unusual property among the elements lighter than lead. What is it?',
        a: 'They have no stable isotopes', w: ['They are both gases', 'They have only one electron shell', 'They each have exactly one isotope'],
        x: 'Every isotope of Tc (Z = 43) and Pm (Z = 61) is radioactive. All other elements up to lead have at least one stable isotope.' },

      { el: 'Sn', q: 'Tin holds the record for the most stable isotopes of any element. How many?',
        a: '10', w: ['3', '6', '21'],
        x: 'Tin (Z = 50) has ten stable isotopes, from <sup>112</sup>Sn to <sup>124</sup>Sn.' },
      { el: 'I', q: 'Radioactive iodine-131 is used to treat an overactive thyroid gland. Why does it end up in the thyroid?',
        a: 'The thyroid takes up iodine to make thyroid hormones', w: ['<sup>131</sup>I is attracted by the thyroid\'s magnetic field', 'The thyroid absorbs any radioactive substance', 'Iodine-131 binds only to thyroid DNA'],
        x: 'The body cannot tell <sup>131</sup>I from stable <sup>127</sup>I, so the radioactive isotope follows iodine\'s normal route.' },
      { el: 'Cs', q: 'The SI second is defined using the radiation from a transition in which atom?',
        a: '<sup>133</sup>Cs', w: ['<sup>12</sup>C', '<sup>86</sup>Kr', '<sup>1</sup>H'],
        x: 'Since 1967 the second has been defined by exactly 9,192,631,770 cycles of radiation from caesium-133, the element\'s only stable isotope.' },
      { el: 'Kr', q: 'From 1960 to 1983 the metre was defined using light emitted by which isotope?',
        a: '<sup>86</sup>Kr', w: ['<sup>133</sup>Cs', '<sup>40</sup>Ar', '<sup>20</sup>Ne'],
        x: 'An orange-red line of krypton-86 defined the metre until it was redefined via the speed of light.' },

      { el: 'Pb', q: 'The relative atomic mass of lead varies noticeably between samples from different mines. Why?',
        a: 'Three of its isotopes are end products of uranium and thorium decay, so the mix depends on the rock\'s history', w: ['Lead atoms gain protons over time', 'Lead is weighed differently in different countries', 'Lead\'s electrons are easily lost'],
        x: '<sup>206</sup>Pb, <sup>207</sup>Pb and <sup>208</sup>Pb build up from decay of U and Th, so older or uranium-rich rocks give lead with a different isotope mix.' },
      { el: 'Bi', q: 'Bismuth-209 was found in 2003 to decay, with a half-life of about 2 × 10<sup>19</sup> years. The universe is about 1.4 × 10<sup>10</sup> years old. The half-life is roughly…',
        a: 'a billion times the age of the universe', w: ['a thousand times the age of the universe', 'about the same as the age of the universe', 'a million times shorter than the age of the universe'],
        x: '2 × 10<sup>19</sup> ÷ 1.4 × 10<sup>10</sup> ≈ 1.4 × 10<sup>9</sup>, so about a billion times longer. For all practical purposes bismuth is stable.' },
      { el: 'Rn', q: 'Parts of Devon and Cornwall have high levels of radon-222 in homes. Where does it come from?',
        a: 'Decay of uranium in granite', w: ['Car exhausts', 'Sea spray', 'Cosmic rays hitting the atmosphere'],
        x: 'Radon-222 is part of the uranium-238 decay chain. Granite is relatively rich in uranium, and radon, being a gas, seeps into buildings.' },
      { el: 'Ra', q: 'Radium-226 (Z = 88) decays by emitting an alpha particle (a <sup>4</sup>He nucleus). What does it become?',
        a: '<sup>222</sup>Rn (Z = 86)', w: ['<sup>222</sup>Ra (Z = 88)', '<sup>226</sup>Rn (Z = 86)', '<sup>224</sup>Rn (Z = 86)'],
        x: 'Losing 2 protons and 2 neutrons takes the mass number down by 4 and Z down by 2, turning radium into radon.' },
      { el: 'U', q: 'Natural uranium is 99.3% <sup>238</sup>U and 0.7% <sup>235</sup>U. When uranium is "enriched" for fuel, what changes?',
        a: 'The proportion of <sup>235</sup>U increases', w: ['Extra protons are added to each atom', 'The uranium is converted into plutonium', 'The atoms gain electrons'],
        x: 'Enrichment changes the isotope mix of the sample, not the atoms themselves.' },
      { el: 'Pu', q: 'NASA\'s Curiosity rover on Mars is powered by heat from the decay of which isotope?',
        a: '<sup>238</sup>Pu', w: ['<sup>235</sup>U', '<sup>14</sup>C', '<sup>60</sup>Co'],
        x: 'Plutonium-238 has a half-life of about 88 years, giving steady heat for decades. Voyager 1 and 2 use it too.' },
      { el: 'Am', q: 'Many household smoke alarms contain a tiny amount of which isotope?',
        a: '<sup>241</sup>Am', w: ['<sup>222</sup>Rn', '<sup>131</sup>I', '<sup>90</sup>Sr'],
        x: 'Americium-241 ionises the air in a small chamber; smoke disrupts the current and triggers the alarm.' },

    ]
  },

  // Copy this block to make a bank for another lecture.
  template: {
    title: 'My next lecture',
    generators: [],
    questions: [
      { el: null, q: 'A general question that can appear on any element?', a: 'Right answer', w: ['Wrong 1', 'Wrong 2', 'Wrong 3'], x: 'Why the right answer is right.' },
      { el: 'Na', q: 'A question that only appears when someone taps sodium?', a: 'Right answer', w: ['Wrong 1', 'Wrong 2', 'Wrong 3'], x: 'Explanation.' },
    ]
  }
};
