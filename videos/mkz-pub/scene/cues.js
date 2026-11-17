// Le conducteur de la publicité MKZ Motors : l'instant de chaque animation et de chaque bruitage, sur la grille de la
// musique (120 BPM : un temps = 0,5 s). Utilisé par la scène (animations) et par le son (bruitages) : une seule source.
//   1 · 0–2 s    le noir ; le voyant de la clé clignote (déverrouillage), un spot claque sur le podium
//   2 · 2–6 s    les rampes du plafond s'allument une à une ; la clé s'élève. « Des occasions sélectionnées »
//   3 · 6–8 s    très près, sur les touches. « Contrôlées, prêtes à rouler »
//   4 · 8–12 s   le panneau « À VENDRE » ; le tampon « VENDU » claque. « Vous vendez ? On la vend pour vous. »
//   5 · 12–16 s  l'étiquette en cuir MKZ ; le dépôt-vente en quatre étapes
//   6 · 16–20 s  de face ; l'enseigne s'allume, le voyant et l'anneau du podium pulsent, le nom, le site
globalThis.buildCues = function (T) {
  const SH = T.shots.map((s) => s.start), B = 60 / T.bpm;   // B : un temps
  const K = {};
  K.p1 = { bip: 0.25, phares: 0.5, drl: 1.0, titre: 1.0 };
  K.p2 = { in: SH[1], rampes: [SH[1], SH[1] + B * 0.5, SH[1] + B], titre: [SH[1] + B * 2, SH[1] + B * 3] };
  K.p3 = { in: SH[2], titre: [SH[2] + B * 0.5, SH[2] + B * 1.5] };
  K.p4 = { in: SH[3], question: SH[3] + B * 0.5, tampon: SH[3] + B * 4, reponse: SH[3] + B * 5 };
  K.p5 = { in: SH[4], titre: SH[4] + B * 0.5, etapes: [0, 1, 2, 3].map((i) => SH[4] + B * (2 + i)), feux: SH[4] + 0.05 };
  K.p6 = { in: SH[5], logo: SH[5] + B * 0.5, appel: [SH[5] + B * 1.5, SH[5] + B * 2], nom: SH[5] + B * 2, site: SH[5] + B * 4, ligne: SH[5] + B * 3 };

  // Bruitages : un par geste. k = type de son, g = intensité (0..1), p = position gauche/droite.
  const sfx = [];
  const add = (t, k, g = 0.6, p = 0) => sfx.push({ t: +t.toFixed(3), k, g, p });
  add(K.p1.bip, "bip", 0.7, -0.2); add(K.p1.bip + 0.16, "bip", 0.6, -0.2);   // la clé déverrouille
  add(K.p1.phares, "phares", 0.8);                                          // le spot claque
  add(K.p1.titre, "tone0", 0.4);
  K.p2.rampes.forEach((t, i) => add(t, "rampe", 0.75, (i - 1) * 0.4));        // les rampes du plafond
  add(K.p2.in + 0.02, "whoosh", 0.4);
  add(K.p2.titre[0], "tone1", 0.45);
  add(K.p3.in, "hit", 0.6); add(K.p3.in + 0.02, "swish", 0.45);
  add(K.p3.titre[0], "pop0", 0.45); add(K.p3.titre[1], "pop2", 0.45);
  add(K.p4.in, "hit", 0.6); add(K.p4.question, "tone2", 0.45);
  add(K.p4.tampon - 0.12, "swish", 0.35); add(K.p4.tampon, "tampon", 0.9, 0.15);   // le tampon VENDU
  add(K.p4.reponse, "pop3", 0.5);
  add(K.p5.in, "hit", 0.6); add(K.p5.in + 0.02, "whoosh", 0.4);
  add(K.p5.titre, "tone3", 0.4);
  K.p5.etapes.forEach((t, i) => add(t, "card" + i, 0.55, (i - 1.5) * 0.25));
  add(K.p6.in, "hit", 0.7);
  add(K.p6.logo, "rampe", 0.8);
  K.p6.appel.forEach((t) => add(t, "phares", 0.55));
  add(K.p6.nom, "final", 0.8);
  add(K.p6.site, "plop", 0.7);
  sfx.sort((a, b) => a.t - b.t);
  return { K, sfx };
};
