// Le conducteur de la vitrine MKZ Motors (dépôt-vente) : tout est calé sur la musique, à 120 battements par minute.
// Un temps = 30 images (0,5 s), une mesure = 2 s, huit mesures = 16 s.
// Mesure 1 : on tape sa plaque d'immatriculation, on appuie sur « Estimer ». 2 : le couloir, l'estimation monte et
// se bloque. 3 et 4 : les six étapes du dépôt-vente, un écran par temps. 5 : le mur des voitures vendues, « Et vous ?
// Rien à faire. ». 6 : les chiffres (0 appel, 0 visite, 1 virement). 7 : la boucle (Déposez, On vend, Vous encaissez).
// 8 : le logo MKZ Motors, tenu.
// Règle du montage : l'ACTION tombe sur le temps, et la coupe la précède de deux images.
globalThis.buildCues = function () {
  const T = 0.5, b = (n) => n * T, K = { T, b, DUREE: 16, AV: 2 / 60 };
  // la plaque se tape en doubles croches : A, B, 1, 2, 3, C, D (les tirets se posent seuls)
  K.barre = { touches: Array.from({ length: 7 }, (_, k) => b(0.5) + k * (T / 4)), reconnue: b(2.5), appui: b(3) };
  K.couloir = { debut: b(4), bloque: b(7) };
  K.ecrans = { debut: b(8), plans: [b(9), b(10), b(11), b(12), b(13), b(14)], large: b(15) };
  K.mur = { debut: b(16), face: b(18) };
  K.chiffres = { plaques: [b(20), b(21), b(22)], ligne: b(23) };
  K.boucle = { etapes: [b(24), b(25), b(26)], retour: b(27) };
  K.logo = { debut: b(28), phrase: b(29), adresse: b(30) };
  // les coups de grosse caisse : un par temps de la mesure 2 à la mesure 7, puis le logo
  K.grosseCaisse = Array.from({ length: 25 }, (_, i) => b(4 + i));
  const fort = [b(4), b(8), b(16), b(18), b(20), b(21), b(22), b(24), b(28)];
  K.frappes = [[K.barre.touches[0], 0.35], [K.barre.appui, 0.7], ...K.grosseCaisse.map((t) => [t, t === b(7) || t === b(28) ? 1.3 : fort.includes(t) ? 1.15 : 0.8])];
  // la mélodie (pas en doubles croches dans la mesure, note MIDI) : ré mineur, écrite pour cette vidéo
  K.motif = [
    [[0, 74], [3, 77], [4, 81], [6, 79], [8, 77], [10, 76], [11, 77], [14, 69]],
    [[0, 74], [3, 77], [4, 82], [6, 81], [8, 77], [10, 74], [12, 72], [14, 74]],
  ];
  return { K, sfx: [] };
};
