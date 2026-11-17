// Publicité MKZ Motors : 20 s, verticale, 1080×1920, sans voix (musique et bruitages). Une voiture d'occasion dans
// le showroom, sur son plateau tournant. Les instants viennent du conducteur (cues.js), posé sur la grille de la musique.
//   1 · 0–2 s    le noir ; la voiture se déverrouille, les phares s'allument
//   2 · 2–6 s    les rampes du plafond s'allument une à une ; la voiture tourne. « Des occasions sélectionnées. »
//   3 · 6–8 s    le long du flanc, jusqu'à la jante. « Contrôlées, prêtes à rouler. »
//   4 · 8–12 s   le panneau « À VENDRE », le tampon « VENDU ». « Vous vendez votre voiture ? » « On la vend pour vous. »
//   5 · 12–16 s  l'arrière, feux allumés. « Dépôt-vente : on s'occupe de tout. » Estimation, annonces, visites, démarches
//   6 · 16–20 s  de face ; l'enseigne s'allume, appel de phares. « Achat · Vente · Dépôt-vente », mkzmotors.com
const W = SCENE_W, H = SCENE_H, AV = 1 / 60, DUREE_FILM = 20;
const { K } = buildCues(TIMING);
const CUES = K, P1 = K.p1, P2 = K.p2, P3 = K.p3, P4 = K.p4, P5 = K.p5, P6 = K.p6;
const mix3 = (a, b, p) => a.map((x, i) => x + (b[i] - x) * p);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lin = (x) => x;
const allume = (t, t0, d = 0.12) => (t < t0 ? 0 : Math.min(1, (t - t0) / d) * (1 + 0.5 * Math.exp(-(t - t0) * 9) * Math.abs(Math.sin((t - t0) * 60))));   // un tube qui s'allume en clignant

// ---------------------------------------------------------------- la voiture
const PEINTURE = [0.36, 0.012, 0.018];                     // rouge profond, vernis
// le plateau tourne lentement ; chaque plan choisit son angle de départ
const voiture = (t, lacet, phares = 0.55, feux = 0.25) => ({ x: 0, z: 0, lacet, roues: 0, peinture: PEINTURE, phares, feux });
// un point du repère de la voiture, dans le monde (même convention que le moteur : l'avant est +x quand lacet = 0)
const versMonde = (q, a) => { const c = Math.cos(a), s = Math.sin(a); return [c * q[0] + s * q[2], q[1], -s * q[0] + c * q[2]]; };

// ---------------------------------------------------------------- les plans : [instant de la coupe, la scène]
const PLANS = [];
const plan = (a, f) => PLANS.push({ a, f });
const de = (t, a, z, ka, kb, e = E.inOutCubic) => mix3(ka, kb, e(prog(t, a, z - a)));
const cam = (pos, cible, fov, ouverture = 0, net) => ({ pos, cible, fov, ouverture, mise: dist(pos, net || cible) });
const NUIT = { rampes: [0, 0.1, 0], ambiance: 0.05, plateau: [0, 0.15], logo: 0, exposition: 1.35 };
const PLEIN = { rampes: [1, 1, 1], ambiance: 0.35, plateau: [0, 1], logo: 0, exposition: 1.0 };

// 1 · le noir, la voiture se déverrouille, les phares s'allument. On est bas, près du phare avant gauche.
plan(0, (t) => {
  const a = 0.0, ph = allume(t, P1.phares, 0.08) * 0.85 + 0.15 * allume(t, P1.drl, 0.1);
  const bip = t > P1.bip && t < P1.bip + 0.35 ? 0.5 * Math.max(0, Math.sin(((t - P1.bip) / 0.16) * Math.PI)) : 0;   // les clignotants du déverrouillage
  const L = versMonde([5.4, 0.95, 3.1], a), C = versMonde([1.2, 0.62, 0.1], a);
  return { ...NUIT, voiture: voiture(t, a, Math.max(ph, bip), 0.0), cam: cam(de(t, 0, 2, L, versMonde([4.7, 0.85, 2.6], a), lin), C, 36, 0.02, versMonde([2.15, 0.62, 0.6], a)) };
});
// 2 · les rampes s'allument une à une ; plan large, la voiture tourne sur son plateau
plan(P2.in - AV, (t) => {
  const r = P2.rampes.map((x) => allume(t, x)), on = (r[0] + r[1] + r[2]) / 3, a = 0.5 - 0.16 * (t - P2.in);
  return { rampes: r, ambiance: 0.02 + 0.33 * on, plateau: [a, on], logo: 0, exposition: 1.25 - 0.25 * on, voiture: voiture(t, a),
    cam: cam(de(t, P2.in, P3.in, [6.6, 3.4, 11.4], [5.2, 2.6, 10.6], E.outCubic), [0, 0.55, 0], 42, 0.02) };
});
// 3 · le long du flanc, jusqu'à la jante avant
plan(P3.in - AV, (t) => {
  const a = -0.25, p = E.inOutCubic(prog(t, P3.in, 2.0));
  const pos = versMonde(mix3([-2.6, 1.5, 4.6], [0.95, 0.62, 2.3], p), a), cible = versMonde(mix3([0.2, 0.7, 0.4], [1.38, 0.4, 0.8], p), a);
  return { ...PLEIN, plateau: [a, 1], voiture: voiture(t, a), cam: cam(pos, cible, 32, 0.035) };
});
// 4 · le panneau « À VENDRE » devant la voiture ; le tampon « VENDU » claque
const PANNEAU = { x: -1.75, z: 2.95 };
const CAM4 = [0.7, 2.0, 11.4];
const lacetPanneau = Math.atan2(-(CAM4[2] - PANNEAU.z), CAM4[0] - PANNEAU.x) + 0.15;
plan(P4.in - AV, (t) => {
  const a = -0.95, choc = t > P4.tampon ? 0.04 * Math.exp(-(t - P4.tampon) * 14) * Math.sin((t - P4.tampon) * 70) : 0;
  return { ...PLEIN, plateau: [a, 1], voiture: voiture(t, a), panneau: { ...PANNEAU, lacet: lacetPanneau },
    cam: cam(de(t, P4.in, P5.in, CAM4, [0.5, 1.85, 10.5], lin).map((v, i) => v + (i === 1 ? choc : 0)), [-0.95, 0.95 + choc, 1.5], 46, 0.02, [-1.2, 1.0, 2.0]) };
});
// 5 · l'arrière, feux allumés ; le dépôt-vente en quatre étapes
plan(P5.in - AV, (t) => {
  const a = 1.75 + 0.1 * (t - P5.in), feux = 0.25 + 0.75 * allume(t, P5.feux, 0.1);
  return { ...PLEIN, plateau: [a, 1], voiture: voiture(t, a, 0.6, feux), cam: cam(de(t, P5.in, P6.in, [-3.2, 1.35, 8.4], [-2.4, 1.15, 7.4], lin), [-0.1, 0.7, 0.2], 40, 0.025) };
});
// 6 · de face : l'enseigne s'allume, appel de phares, le site
plan(P6.in - AV, (t) => {
  const a = -Math.PI / 2 + 0.55 - 0.06 * (t - P6.in), appel = P6.appel.reduce((s, x) => s + Math.max(0, 1 - Math.abs(t - x - 0.08) / 0.12), 0);
  return { ...PLEIN, plateau: [a, 1], logo: allume(t, P6.logo, 0.15), voiture: voiture(t, a, 0.7 + 1.6 * Math.min(1, appel), 0.25),
    cam: cam(de(t, P6.in, DUREE_FILM, [2.2, 1.5, 9.8], [1.7, 1.45, 9.0], E.outCubic), [0, 1.85, 0], 44, 0.02, [0, 0.8, 0.5]) };
});

// ---------------------------------------------------------------- la scène d'un instant
const planDe = (t) => { let i = 0; for (let k = 0; k < PLANS.length; k++) if (t >= PLANS[k].a - 1e-6) i = k; return i; };
let T_IMAGE = 0;
function scene(tt) {
  const pl = planDe(T_IMAGE), t = clamp(tt, PLANS[pl].a, (PLANS[pl + 1]?.a ?? DUREE_FILM) - 1e-4);
  return PLANS[pl].f(t);
}

let M = null, CALQUE = null, _tampon = null;
function textures(t) {                                       // le tampon change avec le temps : on ne repeint que si cela a changé
  const v = t < P4.tampon ? 0 : Math.round(Math.min(1, prog(t, P4.tampon, 0.12)) * 30) / 30;
  if (v !== _tampon) { M.texture("panneau", panneau(v)); _tampon = v; }
}
const ECH = window.ECHANTILLONS || 8, DEF = window.DEFINITION || 0.5, OBT = 1 / 60;   // passes par image ; définition du rendu 3D (le calque des textes reste en pleine définition)
window.__seek = (t) => { t = clamp(t, 0, DUREE_FILM - 1e-4); T_IMAGE = t; textures(t); M.image(t, scene, { echantillons: ECH, obturateur: OBT }); dessinerCalque(CALQUE, t); };
window.__ready = false;
Promise.all([500, 600, 700, 800].map((g) => document.fonts.load(`${g} 40px "Geist"`, "MKZ Motors À VENDRE Dépôt-vente sélectionnées ?")).concat([document.fonts.load('500 40px "Geist Mono"', "DÉPÔT-VENTE")])).then(() => {
  const plateau = document.getElementById("plateau");
  const cv = document.createElement("canvas"); cv.width = Math.round(W * DEF); cv.height = Math.round(H * DEF); cv.style.width = W + "px"; cv.style.height = H + "px"; plateau.appendChild(cv);
  const cq = document.createElement("canvas"); cq.width = W; cq.height = H; plateau.appendChild(cq);
  CALQUE = cq.getContext("2d");
  if (W > H) CALQUE.setTransform(H / 1920, 0, 0, H / 1920, (W - (1080 * H) / 1920) / 2, 0);   // cadre 16:9 : le calque vertical est centré
  M = MoteurSDF.creer(cv, { largeur: cv.width, hauteur: cv.height });
  M.texture("mur", enseigne());
  window.__seek(0);
  window.__ready = true;
});
