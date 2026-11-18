// Ovela : le film (20 s, 9:16, 120 battements par minute : un temps = 0,5 s, une mesure = 2 s).
// Le fil : à 23:47, les clients d'un restaurant écrivent et personne ne répond ; Ovela répond à chacun ; on découvre
// qu'il le fait pour tous les commerces (réserver, vendre, planifier) ; la preuve ; puis tout se fond en une seule barre
// où l'on pose sa question, et la réponse tombe.
// Tout est fonction du temps t. Les instants forts tombent sur les temps de la musique.

const T = 0.5;
const arr2 = (x) => Math.round(x * 100) / 100;   // arrondi des paramètres d'écran : moins de textures à repeindre
const K = {
  arrivees: [0.5, 1.0, 1.5],                        // 1 · trois messages arrivent sur le téléphone
  flot: [2.0, 2.25, 2.5, 2.75, 3.0, 3.25],          // 2 · le flot : les notifications jaillissent
  fige: 3.5, drop: 4.0,                             //     tout se fige ; la musique repart
  reponses: [4.0, 4.125, 4.25, 4.375, 4.5, 4.625],  // 3 · Ovela répond à chacun
  retour: 4.75,                                     //     les notifications rentrent dans le téléphone
  bascule: 6.0, montees: [6.25, 6.5, 6.75, 7.0], etiquettes: 7.0,   // 4 · le téléphone devient une carte ; les commerces
  oks: { 1: 8.25, 3: 8.75, 0: 9.25, 4: 9.75 },       // 5 · le travelling : chaque commerce reçoit sa réponse (n° de carte → instant)
  stats: 10.0, avis: 12.0,                          // 6 · 7 · la preuve
  couche: 14.0, arc: 14.5,                          // 8 · tout se couche ; un arc de lumière balaie le sol
  fusion: 16.0, leve: 16.5, frappe: 17.0,           // 9 · la fusion en une barre ; la question s'écrit
  entree: 18.0, fin: 18.5,                          // 10 · Entrée : la réponse ; la signature
};
const ORANGE = [1, 0.416, 0.102];
const QUESTION = "Une table pour 4 ce soir" + INS + "?";

// ------------------------------------------------------------------ la lumière
// le soleil dérive lentement, de la gauche du téléphone jusqu'au-dessus de la barre finale
const soleil = (t) => mix3([-1.6, 2.6, -6.2], [-0.4, 2.75, -6.4], E.inOutCubic(prog(t, 0, 18.5)));
function eclat(t) { return 1 + 0.9 * choc(t, K.drop, 0.35) + 0.5 * choc(t, K.entree, 0.4) + 0.25 * choc(t, K.stats, 0.3); }
function allumage(t) { return E.outCubic(prog(t, 0.05, 0.7)) * (1 - 0.55 * E.inOutCubic(prog(t, K.fige, 0.12)) * (1 - prog(t, K.drop - 0.02, 0.04))); }

// ------------------------------------------------------------------ la caméra : [t, position, cible]
const CAM = [
  [0.0, [0.3, 0.55, 4.3], [0, 0.88, 0]],
  [2.0, [0.15, 0.8, 3.35], [0, 0.88, 0]],
  [3.5, [0.45, 1.0, 4.1], [0, 0.92, 0.15]],
  [4.0, [0.46, 1.0, 4.13], [0, 0.92, 0.15]],
  [4.45, [0.08, 0.86, 3.2], [0, 0.86, 0], E.outCubic],
  [6.0, [-0.12, 0.84, 3.1], [0, 0.85, 0], E.lin],
  [7.7, [0.25, 1.6, 4.3], [0.05, 0.76, -1.6], E.inOutCubic],
  [8.0, [0.2, 1.5, 3.7], [0.04, 0.74, -1.8], E.inOutQuad],
  [10.0, [0.0, 0.92, -1.25], [0, 0.66, -5.0], E.lin],
  [10.5, [0.1, 0.9, -1.75], [0, 0.66, -5.0], E.outCubic],
  [12.0, [0.05, 0.86, -2.25], [0.03, 0.64, -5.0], E.lin],
  [14.0, [0.5, 0.95, -2.1], [-0.08, 0.56, -4.8], E.inOutCubic],
  [15.7, [0.0, 1.25, 1.0], [0, 0.1, -2.6], E.inOutCubic],
  [16.0, [0.0, 1.22, 0.95], [0, 0.12, -2.6], E.lin],
  [17.0, [0.0, 0.82, -0.05], [0, 0.68, -2.6], E.inOutCubic],
  [18.0, [0.0, 0.8, -0.25], [0, 0.68, -2.6], E.lin],
  [20.0, [0.0, 0.95, 0.15], [0, 0.78, -2.6], E.outCubic],
];
function camera(t) {
  const pos = cles(CAM.map(([x, p, , e]) => [x, p, e]), t, E.inOutCubic), cible = cles(CAM.map(([x, , c, e]) => [x, c, e]), t, E.inOutCubic);
  const sec = oscille(t, K.drop, 0.9, 30, 7) + oscille(t, K.entree, 0.5, 30, 8) + oscille(t, K.stats, 0.35, 30, 9);
  return { pos, cible, fov: 46, roulis: sec, ouverture: 0.022, mise: Math.hypot(cible[0] - pos[0], cible[1] - pos[1], cible[2] - pos[2]) };
}

// ------------------------------------------------------------------ 1 à 3 · le téléphone et le flot
const TEL = { c: [0, 0.8, 0], d: [0.3, 0.65, 0.02] };
const tFige = (t) => (t <= K.fige ? t : K.fige + (Math.min(t, K.drop) - K.fige) * 0.07 + Math.max(0, t - K.drop));
function etatTel(t) {
  const u = tFige(t), arr = [...K.arrivees, ...K.flot.slice(0, 3)];   // six conversations ; le reste du flot gonfle le compteur
  let n = 0, gl = 1;
  arr.forEach((x) => { if (u >= x) { n++; gl = E.outCubic(prog(u, x, 0.22)); } });
  let badge = Math.min(n, 3);
  if (u >= K.flot[0]) badge = Math.round(lerp(3, 37, E.inQuad(prog(u, K.flot[0], K.fige - K.flot[0] - 0.05))));
  let rep = 0, repG = 0;
  K.reponses.forEach((x, k) => { if (t >= x) { rep = k; repG = prog(t, x, 0.12); if (repG >= 1) rep = k + 1, (repG = 0); } });
  if (t >= K.drop) badge = Math.max(0, Math.round(lerp(37, 0, E.inOutCubic(prog(t, K.drop, 1.0)))));
  return { n, glisse: arr2(gl), badge, rep: Math.min(rep, 6), repG: arr2(repG) };
}
// où se tient chaque notification, face à la caméra
const NOTIFS = [
  { c: [-0.42, 1.26, 0.45], rot: [4, 12, -4] },
  { c: [0.44, 1.1, 0.5], rot: [-3, -14, 3] },
  { c: [-0.46, 0.72, 0.56], rot: [2, 15, 3] },
  { c: [0.42, 0.52, 0.64], rot: [5, -12, -3] },
  { c: [0.04, 1.36, 0.36], rot: [7, 3, 2] },
  { c: [-0.08, 0.3, 0.82], rot: [-5, -6, -2] },
];
const D_NOTIF = [0.27, 0.062, 0.011];
function notifs(S, t) {
  if (t >= K.retour + 0.08 * 5 + 0.36) return;
  const u = tFige(t);
  NOTIFS.forEach((N, k) => {
    const t0 = K.flot[k]; if (u < t0) return;
    const sortie = E.outBack(prog(u, t0, 0.32), 1.5), tr = K.retour + 0.08 * k, ret = E.inBack(prog(t, tr, 0.32), 1.3);
    if (ret >= 0.999) return;
    const depart = [TEL.c[0] + N.c[0] * 0.15, TEL.c[1] + (N.c[1] - TEL.c[1]) * 0.15, 0.06];
    let c = mix3(depart, N.c, sortie);
    c[1] += 0.018 * Math.sin(u * 2.6 + k * 1.7);
    c = mix3(c, [0, TEL.c[1] + (N.c[1] - TEL.c[1]) * 0.3, 0.03], ret);
    const e = (0.25 + 0.75 * Math.min(1, sortie)) * (1 - 0.85 * ret);
    const rep = t >= K.reponses[k] ? 1 : 0;
    S.plaques.push({ c, d: [D_NOTIF[0] * e, D_NOTIF[1] * e, D_NOTIF[2]], rot: mix3(N.rot, [0, 0, 0], ret), rayon: D_NOTIF[1] * e * 0.98, biseau: 0.005, tex: "notif" + k, ecran: 1.05, teinte: [0.07, 0.07, 0.08], tranche: rep ? ORANGE : [1, 1, 1], trancheGain: 0.25 + (rep ? 0.5 + 2.2 * choc(t, K.reponses[k], 0.2) : 0) });
  });
}

// ------------------------------------------------------------------ 4 et 5 · les commerces, en allée vers le soleil
// cinq cartes en quinconce, de plus en plus loin ; la caméra remonte l'allée
const CARTES = [   // de gauche à droite : n° d'étiquette, écran
  { tex: "coiffure", et: 3 }, { tex: "boutique", et: 1 }, { tex: "restaurant", et: 0 }, { tex: "coach", et: 2 }, { tex: "fleuriste", et: 4 },
];
const D_CARTE = [0.42, 0.546, 0.018];
const ALLEE = { 2: [0.7, 0], 1: [-0.7, -1], 3: [0.7, -2], 0: [-0.7, -3], 4: [0.7, -4] };   // n° de carte → [x, z]
function poseArc(i) { const [x, z] = ALLEE[i]; return { c: [x, 0.62, z], rot: [0, x > 0 ? -25 : 25, 0] }; }
// se coucher sur le sol : bascule vers l'arrière autour du bord bas
function couchee(pose, d, p) {
  if (p <= 0) return pose;
  const th = 90 * p, piedY = lerp(pose.c[1] - d[1], d[2] + 0.002, p);
  const off = Moteur.appliquer(Moteur.rotation([-th, pose.rot[1], pose.rot[2]]).m, [0, d[1], 0]);
  const piedXZ = [pose.c[0] - Moteur.appliquer(Moteur.rotation(pose.rot).m, [0, d[1], 0])[0], pose.c[2] - Moteur.appliquer(Moteur.rotation(pose.rot).m, [0, d[1], 0])[2]];
  return { c: [piedXZ[0] + off[0], piedY + off[1], piedXZ[1] + off[2]], rot: [pose.rot[0] - th, pose.rot[1], pose.rot[2]] };
}
const BARRE = { debout: { c: [0, 0.6, -2.6], rot: [-6, 0, 0] }, d: [0.5, 0.065, 0.016] };
const BARRE_SOL = { c: [0, 0.018, -2.7], rot: [-90, 0, 0] };
// la fusion (plan 9) : chaque objet couché glisse vers la barre et en prend la forme ; l'écran s'éteint, les chants s'embrasent
function versBarre(pose, d, t, k) {
  const p = E.inOutCubic(prog(t, K.fusion + 0.04 * k, 0.5));
  if (p <= 0) return { pose, d, p };
  return { pose: { c: mix3(pose.c, BARRE_SOL.c, p), rot: mix3(pose.rot, BARRE_SOL.rot, p) }, d: mix3(d, BARRE.d, p), p };
}
const tCouche = (k) => K.couche + 0.11 * k;
function carte(S, t, i) {
  const C = CARTES[i], heros = i === 2;
  let pose = poseArc(i), d = D_CARTE, tex = C.tex, ecran = 1.05, op = 1, trG = 0.22, tr = [1, 1, 1];
  if (heros) {
    // le téléphone tourne d'un quart de tour, et revient carte de restaurant
    const p = prog(t, K.bascule, 0.55), a = E.inOutCubic(p) * (180 + pose.rot[1]);
    if (t < K.bascule + 0.55) {
      const m = E.inOutCubic(p);
      const c = mix3(TEL.c, pose.c, m), dd = mix3(TEL.d, d, m);
      if (a < 90) { pose = { c, rot: [0, a, 0] }; d = dd; tex = "tel"; }
      else { pose = { c, rot: [0, a - 180, 0] }; d = dd; }
    }
  } else {
    const t0 = K.montees[{ 1: 0, 3: 1, 0: 2, 4: 3 }[i]], p = prog(t, t0, 0.42);
    if (p <= 0) return;
    const m = E.outBack(p, 1.2);
    pose = { c: [pose.c[0], lerp(-D_CARTE[1] - 0.05, pose.c[1], m), pose.c[2]], rot: [0, pose.rot[1] * (2 - m), 0] };
  }
  const ok = K.oks[i] ? t >= K.oks[i] : true;
  if (K.oks[i]) { trG += 1.6 * choc(t, K.oks[i], 0.25); if (ok) tr = ORANGE; }
  if (heros && t >= K.bascule + 0.5) tr = ORANGE;
  const bal = K.oks[i] && t > K.oks[i] - 0.1 && t < K.oks[i] + 0.6 ? [lerp(-1.6, 1.6, E.inOutCubic(prog(t, K.oks[i] - 0.1, 0.6))), 0.22, 0.7, 0.35] : undefined;
  pose = couchee(pose, d, E.inOutCubic(prog(t, tCouche(i), 0.55)));
  const f = versBarre(pose, d, t, i);
  if (f.p >= 0.999) return;
  ecran *= 1 - E.inQuad(clamp(f.p * 1.6)); trG += 2.2 * f.p; if (f.p > 0) tr = mix3(tr, [1, 0.8, 0.6], f.p);
  S.plaques.push({ c: f.pose.c, d: f.d, rot: f.pose.rot, rayon: lerp(heros && tex === "tel" ? 0.06 : 0.04, BARRE.d[1], f.p), biseau: 0.007, tex, ecran, op, teinte: [0.06, 0.06, 0.07], tranche: tr, trancheGain: trG, bal });
  // l'étiquette du commerce, au-dessus
  const te = K.etiquettes + 0.12 * [3, 1, 0, 2, 4][i], pe = prog(t, te, 0.3);
  if (pe > 0 && t < tCouche(i) + 0.3) {
    const s = E.outBack(pe, 1.8) * (1 - E.inQuad(prog(t, tCouche(i) - 0.05, 0.3))), base = poseArc(i), h = [0.26, 0.14, 0.0, 0.06, 0.2][i];
    if (s > 0.01) S.plaques.push({ c: [base.c[0], base.c[1] + D_CARTE[1] + 0.15 + h, base.c[2]], d: [0.26 * s, 0.065 * s, 0.009], rot: base.rot, rayon: 0.064 * s, biseau: 0.004, tex: "etiquette" + C.et, ecran: 1.1, teinte: [0.08, 0.08, 0.09], trancheGain: 0.5, ombre: false });
  }
}

// ------------------------------------------------------------------ 6 et 7 · la preuve
const STATS = { c: [0, 0.62, -5.0], d: [0.36, 0.468, 0.018] }, AVIS = { c: [-0.2, 0.31, -4.42], d: [0.3, 0.246, 0.016], rot: [0, 16, 0] };
function preuve(S, t) {
  if (t >= K.stats - 0.01) {
    const p = prog(t, K.stats, 0.45), m = E.outBack(p, 1.15);
    let pose = { c: [STATS.c[0], lerp(-STATS.d[1] - 0.05, STATS.c[1], m), STATS.c[2]], rot: [-3, 30 * (1 - m), 0] };
    pose = couchee(pose, STATS.d, E.inOutCubic(prog(t, tCouche(5), 0.55)));
    const f = versBarre(pose, STATS.d, t, 5);
    if (f.p < 0.999) S.plaques.push({ c: f.pose.c, d: f.d, rot: f.pose.rot, rayon: lerp(0.04, BARRE.d[1], f.p), biseau: 0.007, tex: "stats", ecran: 1.08 * (1 - E.inQuad(clamp(f.p * 1.6))), teinte: [0.06, 0.06, 0.07], tranche: mix3(ORANGE, [1, 0.8, 0.6], f.p), trancheGain: 0.4 + 1.6 * choc(t, K.stats, 0.3) + 2.2 * f.p, bal: t < K.stats + 1 ? [lerp(-1.6, 1.6, E.inOutCubic(prog(t, K.stats + 0.2, 0.7))), 0.22, 0.6, 0.35] : undefined });
  }
  if (t >= K.avis - 0.01) {
    const p = prog(t, K.avis, 0.4), m = E.outBack(p, 1.3);
    let pose = { c: mix3([-1.3, 0.75, -3.8], AVIS.c, m), rot: [0, AVIS.rot[1] + 40 * (1 - m), -6 * (1 - m)] };
    pose = couchee(pose, AVIS.d, E.inOutCubic(prog(t, tCouche(6), 0.55)));
    const f = versBarre(pose, AVIS.d, t, 6);
    if (f.p < 0.999) S.plaques.push({ c: f.pose.c, d: f.d, rot: f.pose.rot, rayon: lerp(0.035, BARRE.d[1], f.p), biseau: 0.006, tex: "avis", ecran: 1.08 * (1 - E.inQuad(clamp(f.p * 1.6))), teinte: [0.06, 0.06, 0.07], tranche: mix3(ORANGE, [1, 0.8, 0.6], f.p), trancheGain: 0.4 + 1.6 * choc(t, K.avis, 0.3) + 2.2 * f.p });
  }
}

// ------------------------------------------------------------------ 9 et 10 · la barre et la réponse
function barre(S, t) {
  if (t < K.fusion + 0.5) return;
  const p = E.inOutCubic(prog(t, K.leve, 0.5));
  const c = mix3(BARRE_SOL.c, BARRE.debout.c, p); c[1] += 0.02 * Math.sin(Math.PI * p);
  const rot = mix3(BARRE_SOL.rot, BARRE.debout.rot, p);
  const allume = E.outCubic(prog(t, K.leve + 0.1, 0.4));
  const ap = choc(t, K.entree, 0.12);
  S.plaques.push({ c: [c[0], c[1] - 0.006 * ap, c[2] + 0.004 * ap], d: BARRE.d, rot, rayon: BARRE.d[1] * 0.999, biseau: 0.008, tex: "barre", ecran: 1.1 * allume, teinte: [0.07, 0.07, 0.08], tranche: [1, 0.8, 0.6], trancheGain: lerp(2.4, 0.35, allume) + 1.2 * ap, bal: t < K.leve + 1.2 ? [lerp(-1.4, 1.4, E.inOutCubic(prog(t, K.leve + 0.35, 0.8))), 0.16, 0.5, 0.25] : undefined });
  if (t >= K.entree) {
    const q = prog(t, K.entree, 0.42), m = E.outBack(q, 1.6);
    const cr = [0, lerp(BARRE.debout.c[1], 0.8, m), lerp(-2.6, -2.55, m)], e = 0.3 + 0.7 * m;
    S.plaques.push({ c: cr, d: [0.36 * e, 0.0517 * e, 0.012], rot: [-4, 0, 0], rayon: 0.0516 * e, biseau: 0.006, tex: "reponse", ecran: 1.15, teinte: [0.09, 0.05, 0.03], tranche: ORANGE, trancheGain: 0.6 + 2 * choc(t, K.entree + 0.05, 0.3) });
  }
}
function texteTape(t) {
  const n = Math.floor(clamp((t - K.frappe) / 0.85) * QUESTION.length + 1e-6);
  return t < K.frappe ? "" : QUESTION.slice(0, n);
}

// ------------------------------------------------------------------ les anneaux de lumière sur le sol
function anneaux(S, t) {
  if (t >= K.drop && t < K.drop + 0.8) { const p = prog(t, K.drop, 0.8); S.anneaux.push({ c: [0, 0.05], r: lerp(0.3, 1.9, E.outCubic(p)), l: lerp(0.02, 0.08, p), couleur: ORANGE, intensite: 7 * (1 - p) * (1 - p), etendue: 7 }); }
  if (t >= K.stats && t < K.couche + 0.6) {
    const p = prog(t, K.stats, 0.6), f = 1 - prog(t, K.couche, 0.6);
    S.anneaux.push({ c: [STATS.c[0], STATS.c[2]], r: lerp(0.12, 0.62, E.outCubic(p)), l: 0.022, couleur: ORANGE, intensite: (2.4 + 5 * choc(t, K.stats, 0.35)) * f, debut: -2.6, etendue: 5.2 });
  }
  if (t >= K.arc && t < K.fusion + 0.3) {
    const p = prog(t, K.arc, 1.6);
    S.anneaux.push({ c: [0, 3.0], r: 5.0, l: 0.035, couleur: ORANGE, intensite: 6 * Math.sin(Math.PI * clamp(p * 1.1)), debut: -Math.PI / 2 - 1.0 + 1.5 * E.inOutCubic(p), etendue: 0.55 });
  }
}

// ------------------------------------------------------------------ la scène
const FILM = {
  preparer(M) { for (const [n, [l, h, d]] of Object.entries(ECRANS_DEF)) M.texture(n, l, h, d); this.M = M; },
  textures(t) {
    const L = [{ nom: "tel", p: etatTel(t) }];
    NOTIFS.forEach((_, k) => L.push({ nom: "notif" + k, p: { i: k, rep: t >= K.reponses[k] ? 1 : 0 } }));
    L.push({ nom: "restaurant", p: { ok: 1 } });
    for (const [i, x] of Object.entries(K.oks)) L.push({ nom: CARTES[i].tex, p: { ok: t >= x ? 1 : 0 } });
    ETIQUETTES.forEach((_, i) => L.push({ nom: "etiquette" + i, p: { i } }));
    L.push({ nom: "stats", p: { pct: 98 * E.outCubic(prog(t, K.stats + 0.25, 0.75)), barres: E.outCubic(prog(t, K.stats + 0.5, 0.9)), gain: 31 * E.outCubic(prog(t, K.stats + 0.5, 1.0)) } });
    L.push({ nom: "avis", p: { n: 1240 * E.outCubic(prog(t, K.avis + 0.25, 0.75)) } });
    L.push({ nom: "barre", p: { texte: texteTape(t), curseur: t >= K.frappe && t < K.entree + 0.3 && Math.floor(t * 4) % 2 === 0 ? 1 : t >= K.frappe && t < K.entree ? 1 : 0, appui: t >= K.entree && t < K.entree + 0.25 ? 1 : 0 } });
    L.push({ nom: "reponse", p: {} });
    return L;
  },
  scene(t) {
    const S = { plaques: [], anneaux: [], spheres: [], lumieres: [] };
    S.camera = camera(t);
    const k = allumage(t), e = eclat(t);
    S.ambiance = { fond: [0.011, 0.011, 0.014], brume: 0.22 * k * e, exposition: 1.0, bloom: 0.38, seuil: 1.0, vignette: 0.42, grain: 0.03, laque: 1.0, rugosite: 0.05, flouH: 14, brouillard: 0.035, albedo: 0.03 };
    S.spheres.push({ c: soleil(t), r: 0.17, couleur: [1, 0.45, 0.13], intensite: 42 * k * e, halo: [5.5, 0.7 * k * e] });
    S.lumieres.push({ p: soleil(t), couleur: [1, 0.5, 0.2], intensite: 7 * k * e, rayon: 3, taille: 0.7 });
    S.lumieres.push({ p: [2.2, 3.2, 4.6], couleur: [0.86, 0.9, 1], intensite: 0.5, rayon: 5 });
    if (t < K.bascule + 0.6) S.lumieres.push({ p: [0, 0.12, 0.55], couleur: [1, 0.92, 0.86], intensite: 0.3 * k, rayon: 1.0 });
    else if (t < K.couche + 0.8) S.lumieres.push({ p: [STATS.c[0], 0.12, STATS.c[2] + 0.15], couleur: ORANGE, intensite: t >= K.stats ? 1.2 + 2 * choc(t, K.stats, 0.35) : 0, rayon: 0.8 });
    else S.lumieres.push({ p: [0, 0.75, -2.0], couleur: [1, 0.75, 0.55], intensite: 0.5 + 1.5 * choc(t, K.entree, 0.4), rayon: 1.2 });
    // le téléphone, jusqu'à ce qu'il devienne la carte du restaurant
    if (t < K.bascule) {
      const kick = choc(t, K.drop, 0.25);
      S.plaques.push({ c: [TEL.c[0], TEL.c[1] + 0.006 * Math.sin(t * 1.3), TEL.c[2] - 0.03 * kick], d: TEL.d, rot: [-2 + 2 * kick, 4 * Math.sin(t * 0.6) - 2, 0], rayon: 0.06, biseau: 0.012, tex: "tel", ecran: 0.35 + 0.75 * k, teinte: [0.06, 0.06, 0.07], tranche: t >= K.drop ? ORANGE : [1, 1, 1], trancheGain: 0.3 + 2.4 * kick, bal: t >= K.drop - 0.05 && t < K.drop + 0.8 ? [lerp(1.5, -1.5, E.inOutCubic(prog(t, K.drop - 0.05, 0.75))), 0.16, 1.2, Math.PI / 2] : undefined });
    }
    notifs(S, t);
    if (t >= K.bascule) for (let i = 0; i < 5; i++) carte(S, t, i);
    preuve(S, t);
    barre(S, t);
    anneaux(S, t);
    return S;
  },
  // les titres, en pleine définition, en haut à gauche (zone sûre de TikTok), et la signature
  calque(ctx, t, W, H) {
    const TITRES = [
      [0.25, 1.95, [[["23:47.", 1]], [["Vos clients écrivent.", 0]]]],
      [2.1, 3.95, [[["Et personne", 0]], [["ne répond.", 0]]]],
      [4.1, 5.95, [[["Ovela", 1], [" répond.", 0]], [["En 4 secondes.", 0]]]],
      [6.2, 7.95, [[["Pour chaque", 0]], [["commerce.", 0]]]],
      [8.1, 9.95, [[["Il réserve.", 0]], [["Il vend. Il planifie.", 0]]]],
      [10.1, 11.95, [[["+31" + INS + "%", 1]], [["de réservations.", 0]]]],
      [12.1, 13.95, [[["1" + INS + "240 commerces", 0]], [["l’ont adopté.", 0]]]],
      [14.1, 15.9, [[["À vous", 0]], [["de demander.", 1]]]],
    ];
    const X = 84, Y = 330, TL = 92, IL = 106;
    ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 36;
    for (const [a, b, lignes] of TITRES) {
      if (t < a || t > b) continue;
      const sortie = E.inCubic(prog(t, b - 0.2, 0.2));
      let mot = 0;
      lignes.forEach((ligne, li) => {
        let x = X;
        for (const [seg, acc] of ligne) {
          for (const w of seg.split(/(?<= )/)) {
            const p = E.outCubic(prog(t, a + 0.055 * mot++, 0.32));
            ctx.font = `700 ${TL}px Inter`; ctx.letterSpacing = `${(-0.035 * TL).toFixed(1)}px`; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
            ctx.globalAlpha = p * (1 - sortie); ctx.fillStyle = acc ? CH.orange : CH.texte;
            ctx.fillText(w, x, Y + li * IL + 28 * (1 - p) - 20 * sortie);
            x += ctx.measureText(w).width;
          }
        }
      });
    }
    ctx.globalAlpha = 1;
    // la signature
    if (t >= K.fin) {
      const p = (d) => E.outCubic(prog(t, K.fin + d, 0.45));
      ctx.textAlign = "center";
      const a = p(0); ctx.globalAlpha = a;
      ctx.font = "800 168px Inter"; ctx.letterSpacing = `${(-0.05 * 168).toFixed(1)}px`; const w = ctx.measureText("ovela").width;
      ctx.shadowColor = "rgba(255,106,26,0.55)"; ctx.shadowBlur = 50 * a;
      etincelle(ctx, W / 2 - w / 2 - 20, 452 + 30 * (1 - a), 46, CH.orange);
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 36;
      ctx.fillStyle = CH.texte; ctx.fillText("ovela", W / 2 + 34, 510 + 30 * (1 - a));
      ctx.globalAlpha = p(0.12); ctx.font = "600 60px Inter"; ctx.letterSpacing = `${(-0.02 * 60).toFixed(1)}px`; ctx.fillText("Essai gratuit 14 jours", W / 2, 640 + 24 * (1 - p(0.12)));
      ctx.globalAlpha = p(0.22); ctx.font = "500 48px 'JetBrains Mono'"; ctx.letterSpacing = "0px"; ctx.fillStyle = CH.orange; ctx.fillText("ovela.app", W / 2, 726 + 24 * (1 - p(0.22)));
      ctx.globalAlpha = 1;
    }
  },
};
