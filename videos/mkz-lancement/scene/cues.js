// Le conducteur de la vidéo « Lancement de produit » : tout est calé sur la musique, à 120 battements par minute.
// Un temps = 30 images (0,5 s), un demi-temps = 15 images, une mesure = 120 images (2 s), dix mesures = 20 s.
// Mesures 1-2 : le problème. 3 : le basculement. 4 : réserver. 5 : rappeler. 6 : encaisser. 7-8 : la semaine pleine.
// 9-10 : la signature.
// Règle du montage : l'ACTION tombe sur le temps (le coup de grosse caisse), et la coupe la précède de deux images.
// Règle des compteurs : ils affichent des valeurs entières et atteignent leur valeur finale exactement sur un temps.
globalThis.buildCues = function () {
  const T = 0.5, M = 4 * T, D = T / 2, AV = 2 / 60, K = { T, M, D, AV };
  // 1 · le problème : trois messages lisibles, deux ratures, puis la rafale (un demi-temps, un triolet) ; tout se fige
  K.p = { bulles: [1 * T, 3 * T, 4 * T], ratures: [2 * T, 5 * T], rafale: [5.5 * T, 6 * T, 6 * T + T / 3, 6 * T + (2 * T) / 3], fige: 7 * T };
  // 2 · le basculement : l'aspiration, le planning se dresse, une case s'allume (la première couleur), le résultat tenu
  K.b = { aspire: 8 * T, dresse: 9 * T, allume: 10 * T, tenu: 11 * T };
  // 3 · réserver : la page de réservation, le point de contact, la case se remplit, « Réservé »
  K.r = { page: 12 * T, appui: 13 * T, remplit: 14 * T, inscrit: 15 * T };
  // 4 · rappeler : la notification part, se pose, la coche repart, « Confirmé »
  K.n = { part: 16 * T, pose: 17 * T, coche: 18 * T, confirme: 19 * T };
  // 5 · encaisser : le tampon arrive, s'abat, le total tourne, se bloque
  K.e = { tampon: 20 * T, frappe: 21 * T, total: 22 * T, bloque: 23 * T };
  // 6 · la semaine pleine : un jour par temps (lundi à vendredi), les trois cases du samedi, le compteur se bloque sur
  //     le troisième temps de la mesure 8, puis la semaine entière, tenue
  K.s = { jours: [24, 25, 26, 27, 28].map((b) => b * T), samedi: [29 * T, 29.5 * T, 30 * T], bloque: 30 * T, tenue: 31 * T };
  // 7 · la signature : le recul lent, le trait, le dernier coup (la case devient le logo), le nom, le bouton
  K.v = { recul: 32 * T, trait: 34 * T, dernier: 36 * T, nom: 36.5 * T, bouton: 37 * T };
  // Les coups que la caméra marque (poussée et secousse) : [instant, force]. Ce sont les coups de grosse caisse de la musique.
  const F = [[0, 1], [K.p.bulles[0], 0.7], [K.p.ratures[0], 0.6], [K.p.bulles[1], 0.75], [K.p.bulles[2], 0.85], [K.p.ratures[1], 0.8]];
  K.p.rafale.forEach((x, i) => F.push([x, 0.7 + 0.08 * i]));
  F.push([K.b.aspire, 1.3], [K.b.dresse, 1.1], [K.b.allume, 1.2], [K.b.tenu, 0.8]);
  F.push([K.r.page, 1.1], [K.r.appui, 0.9], [K.r.remplit, 1], [K.r.inscrit, 1]);
  F.push([K.n.part, 1], [K.n.pose, 1], [K.n.coche, 0.9], [K.n.confirme, 1]);
  F.push([K.e.tampon, 0.9], [K.e.frappe, 1.3], [K.e.total, 0.9], [K.e.bloque, 1.1]);
  for (let h = 48; h < 60; h++) F.push([h * D, h % 2 ? 0.8 : 1.1]);
  F.push([K.s.bloque, 1.3], [K.s.tenue, 1], [K.v.recul, 1.2], [K.v.dernier, 1.3]);
  K.frappes = F;
  return { K, sfx: [] };
};
