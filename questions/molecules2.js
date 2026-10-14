// Periodic Table Quest question set: Molecules lecture 2: molecular orbital theory.
// The file name (without .js) is this set's id. See _template.js for how to write one.
PQ.questionSet({
  title: 'Molecules 2: Molecular orbital theory',
  short: 'Molecules 2',
  generators: ['m2Order', 'm2Para', 'm2Stronger', 'm2Overlap'],
  generalWeight: 4,
  // No steals of its own: borrows from Molecules 1 (bond energies) and Atoms 4 (ionisation energy)
  stealGenerators: ['sm1Break', 'sm1Photon', 's4IEatom'],
  questions: [

    // ---------- Why move on from the Lewis model ----------
    { el: 'O', q: 'Which of these can molecular orbital theory explain, but the Lewis model can\'t?',
      a: 'Why O<sub>2</sub> is paramagnetic', w: ['Why H<sub>2</sub> has a single bond', 'Why F<sub>2</sub> has three lone pairs on each atom', 'Why HF is polar'],
      x: 'Paramagnetism needs unpaired electrons, which the Lewis structure of O<sub>2</sub> doesn\'t have. The others are all fine in the Lewis model.' },
    { el: null, q: 'Which bonding theory uses orbitals that can spread out over the entire molecule?',
      a: 'Molecular orbital theory', w: ['Valence bond theory', 'The Lewis model', 'None of them: orbitals always belong to one atom'],
      x: 'Valence bond theory builds tidy bonds from overlapping orbitals on neighbouring atoms. MO theory is more quantitative and lets orbitals span the whole molecule.' },

    // ---------- The two approximations ----------
    { el: null, q: 'What is the orbital approximation?',
      a: 'The molecule\'s overall electronic state is a product of one wavefunction for each electron', w: ['Molecular orbitals are made by adding and subtracting atomic orbitals', 'Each electron stays in an orbital belonging to its own atom', 'Only the core electrons need to be considered'],
      x: 'Ψ(molecule) = ψ(electron 1) × ψ(electron 2) × … Each single-electron wavefunction ψ is a molecular orbital. Adding and subtracting atomic orbitals is the other approximation, LCAO.' },
    { el: null, q: 'In the linear combination of atomic orbitals (LCAO) approach, how are molecular orbitals made?',
      a: 'By adding and subtracting atomic orbitals', w: ['By multiplying together one wavefunction per electron', 'By hybridising the orbitals of one atom', 'By counting bonding pairs'],
      x: 'Adding gives an in-phase combination; subtracting gives an out-of-phase combination.' },

    // ---------- Bonding and antibonding orbitals in H2 ----------
    { el: 'H', q: 'Adding the 1s orbitals of two hydrogen atoms (an in-phase combination) gives…',
      a: 'A bonding orbital, with a lot of electron density between the nuclei', w: ['An antibonding orbital, with a nodal plane between the nuclei', 'A 2s orbital on one of the atoms', 'Nothing: the two orbitals cancel out'],
      x: 'The wavefunctions reinforce each other between the nuclei. Electron density there attracts both nuclei and holds the molecule together.' },
    { el: 'H', q: 'Subtracting the 1s orbitals of two hydrogen atoms (an out-of-phase combination) gives…',
      a: 'An antibonding orbital, with a nodal plane halfway between the nuclei', w: ['A bonding orbital, with a lot of electron density between the nuclei', 'A second bonding orbital of the same energy', 'Nothing: you can only add orbitals'],
      x: 'One half of the orbital is positive and the other negative, so ψ is zero on the plane where they meet.' },
    { el: null, q: 'In the antibonding orbital of H<sub>2</sub>, what is the probability of finding the electron on the plane exactly halfway between the nuclei?',
      a: 'Zero', w: ['Higher than anywhere else', 'The same as for the bonding orbital', '50%'],
      x: 'That is the nodal plane: ψ = 0 there, so ψ<sup>2</sup> = 0 too.' },
    { el: null, q: 'Why does an electron in an antibonding orbital weaken a bond?',
      a: 'Its density is mostly outside the region between the nuclei, pulling the atoms apart', w: ['It has the opposite spin to the bonding electrons', 'It repels the bonding electrons out of the molecule', 'It is shared by only one of the atoms'],
      x: 'With little density between the nuclei, the nuclei are pulled outwards rather than together.' },
    { el: null, q: 'Two atomic orbitals combine. How many molecular orbitals are formed?',
      a: '2', w: ['1', '4', 'It depends on how many electrons there are'],
      x: 'The number of molecular orbitals always equals the number of atomic orbitals combined: one in-phase and one out-of-phase combination.' },
    { el: 'C', q: 'The six 2p<sub>z</sub> orbitals of the carbon atoms in benzene\'s ring combine. How many molecular orbitals form?',
      a: '6', w: ['3', '2', '12'],
      x: 'There are six different ways of combining them, one molecular orbital for each atomic orbital that went in.' },

    // ---------- MO energy diagrams ----------
    { el: 'H', q: 'Compared with the 1s orbitals of separate H atoms, where are the H<sub>2</sub> molecular orbitals on an energy diagram?',
      a: 'The bonding orbital is lower, and the antibonding orbital higher by about the same amount', w: ['Both are lower', 'Both are higher', 'Both are at the same energy as the 1s orbitals'],
      x: 'A lower-energy bonding orbital matches H + H → H<sub>2</sub> releasing energy. (The antibonding orbital is raised slightly more, but you can ignore that.)' },
    { el: null, q: 'What is the most electrons a single molecular orbital can hold?',
      a: '2, with opposite spins', w: ['1', '2, with the same spin', '4'],
      x: 'The Pauli exclusion principle applies to molecular orbitals just as to atomic ones. Lower-energy orbitals are filled first.' },
    { el: 'H', q: 'Which orbital do both electrons of H<sub>2</sub> occupy?',
      a: '1σ<sub>g</sub>, the bonding orbital', w: ['1σ<sub>u</sub>*, the antibonding orbital', 'One in each', 'The 1s orbital of one hydrogen atom'],
      x: 'Both go into the lower, bonding orbital with opposite spins: that is what holds H<sub>2</sub> together.' },
    { el: 'He', q: 'Why doesn\'t He<sub>2</sub> exist?',
      a: 'Its 2 bonding and 2 antibonding electrons cancel out: bond order 0', w: ['Helium atoms are too small for their orbitals to overlap', 'Helium has no electrons to share', 'Its electrons all go into the antibonding orbital'],
      x: 'The extra two electrons have to go into the antibonding orbital, which undoes the effect of the bonding pair.' },

    // ---------- Bond order ----------
    { el: null, q: 'In molecular orbital theory, how is bond order calculated?',
      a: '(Electrons in bonding orbitals − electrons in antibonding orbitals) ÷ 2', w: ['Electrons in bonding orbitals − electrons in antibonding orbitals', 'Electrons in bonding orbitals ÷ 2', '(Electrons in bonding orbitals + electrons in antibonding orbitals) ÷ 2'],
      x: 'Some sources use filled bonding orbitals − filled antibonding orbitals, counting a half-filled orbital as ½. It gives the same answer.' },
    { el: null, q: 'For a molecule to be stable, its bond order must be…',
      a: 'Greater than 0', w: ['At least 1', 'A whole number', 'Exactly 1'],
      x: 'Even a bond order of ½ (as in H<sub>2</sub><sup>+</sup>) gives a stable, if weak, bond.' },
    { el: 'H', q: 'H<sub>2</sub><sup>+</sup> and H<sub>2</sub><sup>−</sup> both have a bond order of ½. Compared with H<sub>2</sub>, they…',
      a: 'Have weaker bonds, and are paramagnetic', w: ['Have stronger bonds, and are paramagnetic', 'Have weaker bonds, and are not paramagnetic', 'Can\'t exist'],
      x: 'Lower bond order, lower dissociation energy. Each has an odd number of electrons, so one is unpaired.' },

    // ---------- Core electrons and overlap: Li2 ----------
    { el: 'Li', q: 'Why can we usually ignore lithium\'s 1s electrons when building the MO diagram of Li<sub>2</sub>?',
      a: 'They overlap very little, and their filled bonding and antibonding orbitals cancel out', w: ['1s orbitals can\'t combine with each other', 'They are lost when Li<sub>2</sub> forms', 'They are part of the nucleus'],
      x: 'Core orbitals sit close to their own nucleus, so the core bonding and antibonding orbitals barely shift in energy, and with both full their effects cancel. Only the valence 2s orbitals matter.' },
    { el: 'Li', q: 'H<sub>2</sub> and Li<sub>2</sub> both have a bond order of 1, but H<sub>2</sub>\'s bond is far stronger (436 vs 105 kJ mol<sup>−1</sup>). Why?',
      a: 'Hydrogen\'s compact 1s orbitals overlap more than lithium\'s diffuse 2s orbitals', w: ['H<sub>2</sub> has more bonding electrons', 'The core electrons of Li<sub>2</sub> are in antibonding orbitals and weaken it', 'Lithium is a metal, so it can\'t bond covalently'],
      x: 'Weaker overlap means the bonding orbital is lowered less, so less energy is released when the bond forms. The core electrons cancel out, so they don\'t explain it.' },
  ]
});
