// Le conducteur de la publicité MKZ Motors avec voix off : l'instant de chaque animation et de chaque bruitage. Tout
// vient du calage réel de la voix (timing.js, écrit par tools/assemble-voice.mjs) : les plans coupent sur la grille de
// la musique (120 BPM), les mots montent à l'écran quand la voix les dit, les gestes tombent sur les temps.
//   1 · « Vous voulez vendre votre voiture ? »       le noir ; le voyant de la clé clignote, un spot claque sur le podium
//   2 · « Confiez-la à MKZ Motors. »                  les rampes du plafond s'allument ; la clé s'élève et se tourne vers nous
//   3 · « On l'estime, on crée l'annonce, »           la clé posée devant le panneau « À VENDRE » ; Estimation, Annonce
//   4 · « on organise les visites et les essais, »    très près des touches ; le voyant clignote sur « essais »
//   5 · « et on gère toutes les démarches. »          l'étiquette en cuir MKZ ; Démarches
//   6 · « Le dépôt-vente : on s'occupe de tout. »     face au panneau ; le tampon « VENDU » claque après « tout »
//   7 · « MKZ Motors. On la vend pour vous. »         de face : l'enseigne s'allume sur « MKZ », la clé flotte ; le site
globalThis.buildCues = function (T) {
  const SH = T.shots.map((s) => s.start), B = 60 / T.bpm, G = B / 4;   // B : un temps (0,5 s) ; G : une double croche
  const S = T.sentences;
  const mot = (s, w) => S[s].words[w].start;                 // l'instant où la voix attaque le mot w de la phrase s
  const mots = (s) => S[s].words.map((w) => w.start - 0.04); // les mots montent un rien avant d'être dits
  const surGrille = (t) => Math.round(t / G) * G;
  const K = {};
  K.p1 = { bip: 0.125, phares: 0.375, mots: mots(0) };
  K.p2 = { in: SH[1], rampes: [SH[1], SH[1] + B * 0.5, SH[1] + B], mots: mots(1) };
  K.p3 = { in: SH[2], etapes: [mot(2, 1), mot(2, 4)] };                       // l'estime · l'annonce
  K.p4 = { in: SH[3], etapes: [mot(3, 3), mot(3, 6)], bip: surGrille(mot(3, 6)) };   // visites · essais
  K.p5 = { in: SH[4], etapes: [mot(4, 5)] };                                  // démarches
  K.p6 = { in: SH[5], mots: mots(5), tampon: surGrille(S[5].end + 0.06) };    // le tampon tombe juste après « tout »
  K.p7 = { in: SH[6], logo: surGrille(mot(6, 0)), appel: [surGrille(mot(6, 1)) + B, surGrille(mot(6, 1)) + B * 1.5], mots: mots(6).slice(2),
    ligne: Math.ceil((S[6].end + 0.15) / B) * B, site: Math.ceil((S[6].end + 0.15) / B) * B + B };
  K.etapes = [...K.p3.etapes, ...K.p4.etapes, ...K.p5.etapes];               // les cinq étapes, à cocher l'une après l'autre

  // Bruitages : un par geste, discrets sous la voix. k = type de son, g = intensité (0..1), p = position gauche/droite.
  const sfx = [];
  const add = (t, k, g = 0.6, p = 0) => sfx.push({ t: +t.toFixed(3), k, g, p });
  add(K.p1.bip, "bip", 0.7, -0.2); add(K.p1.bip + 0.16, "bip", 0.6, -0.2);   // la clé déverrouille
  add(K.p1.phares, "phares", 0.8);                                          // le spot claque
  K.p2.rampes.forEach((t, i) => add(t, "rampe", i ? 0.45 : 0.7, (i - 1) * 0.4));   // les rampes du plafond (les deux dernières sous la voix)
  add(K.p2.in + 0.02, "whoosh", 0.35);
  add(K.p3.in, "hit", 0.55); add(K.p3.in + 0.02, "swish", 0.35);
  add(K.p4.in, "hit", 0.5); add(K.p4.in + 0.02, "swish", 0.35);
  add(K.p4.bip, "bip", 0.55, 0.2); add(K.p4.bip + 0.16, "bip", 0.45, 0.2);   // le voyant clignote sur « essais »
  add(K.p5.in, "hit", 0.5); add(K.p5.in + 0.02, "whoosh", 0.35);
  K.etapes.forEach((t, i) => add(t + 0.04, "card" + (i % 4), 0.45, (i - 2) * 0.2));   // chaque étape cochée
  add(K.p6.in, "hit", 0.6);
  add(K.p6.tampon - 0.12, "swish", 0.3); add(K.p6.tampon, "tampon", 0.9, 0.15);       // le tampon VENDU
  add(K.p7.in, "hit", 0.65);
  add(K.p7.logo, "rampe", 0.75);
  K.p7.appel.forEach((t) => add(t, "phares", 0.45));
  add(K.p7.ligne, "final", 0.7);
  add(K.p7.site, "plop", 0.65);
  sfx.sort((a, b) => a.t - b.t);
  return { K, sfx };
};
