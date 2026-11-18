// Le conducteur de la publicité TikTok MKZ Motors (25 s, 8 plans, voix off). Tous les instants en secondes.
// Règle du montage : la coupe précède l'action de deux images (AV). Les instants sont provisoires : ils seront
// recalés sur la voix off (« le rythme suit la voix »).
globalThis.buildCues = function () {
  const AV = 2 / 60, K = { AV, duree: 25 };
  // 1 · « Vous vendez votre voiture ? » : la nuit, le téléphone s'allume (un appel manqué, un message)
  // 2 · « Les appels à toute heure, les visites annulées… » : les messages jaillissent, le carnet se rature, tout se fige
  K.p = { notifs: [0.7, 1.75, 3.1, 4.2, 4.95, 5.15, 5.35], ratures: [3.6, 4.65], coupes: [2.8, 3.45, 4.5], fige: 5.55, aspire: 5.7 };
  // 3 · « Confiez-la à MKZ Motors. » : les messages se rassemblent en une carte rouge qui devient le mandat ; il se signe
  K.m = { naissance: 6.2, items: [6.65, 6.85, 7.05, 7.25, 7.45], signe: 7.6, signeFin: 8.25 };
  // 4 · « On l'estime, on la photographie, on publie l'annonce. » : le mandat se retourne, la fiche au dos
  K.f = { retourne: 8.4, plan: 8.6, estime: 9.0, photo: 10.0, flashs: [10.05, 10.3, 10.55], annonce: 11.0 };
  // 5 · « On répond aux appels et on organise les essais. » : la fiche devient la case du jeudi 18:30, le planning se
  //     dresse, les essais s'inscrivent d'un jour à l'autre
  K.e = { vol: 11.7, dresse: 11.95, plan: 12.0, pose: 12.15, essais: [12.15, 13.0, 13.15, 13.45, 13.6, 13.9, 14.05, 14.3, 14.45, 14.6, 14.75, 14.9] };
  // 6 · « Jusqu'à la vente, démarches comprises. » : le dossier sort du planning, le tampon « Vendu », les démarches
  K.d = { plan: 15.0, sortie: 15.0, tampon: 15.95, coches: [16.45, 16.85, 17.25] };
  // 7 · « MKZ Motors, le dépôt-vente qui s'occupe de tout. » : le tampon s'envole et devient le logo
  // 8 · « Appelez-nous ! » : le bouton, le téléphone, le site
  K.v = { plan: 18.2, envol: 18.35, logo: 19.15, fin: 21.4, bouton: 21.5, contact: 21.85, site: 22.2 };
  // Les coups que la caméra marque (une poussée et une secousse douces) : [instant, force]
  K.frappes = [[K.p.notifs[0], 0.5], [K.p.notifs[1], 0.5], [K.p.notifs[2], 0.6], [K.p.ratures[0], 0.5], [K.p.notifs[3], 0.6], [K.p.ratures[1], 0.5],
    [K.p.notifs[4], 0.4], [K.p.notifs[5], 0.45], [K.p.notifs[6], 0.5], [K.m.naissance, 1.0], [K.m.signeFin, 0.5],
    [K.f.estime, 0.5], [K.f.photo, 0.5], [K.f.annonce, 0.5], [K.e.dresse, 0.9], [K.e.pose, 0.8], [K.d.tampon, 1.1], [K.v.logo, 1.1], [K.v.bouton, 0.6]];
  return { K, sfx: [] };
};
