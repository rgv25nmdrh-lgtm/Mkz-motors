// Publicité MKZ Motors : 20 s, verticale, 1080×1920, sans voix (musique et bruitages). Le héros est une clé de voiture,
// le symbole de ce que fait MKZ Motors (vendre des occasions, vendre la voiture des clients) : une coque noire laquée,
// un anneau chromé, une étiquette en cuir rouge, sur un podium dans le showroom. Les instants viennent du conducteur.
//   1 · 0–2 s    le noir ; le voyant de la clé clignote (déverrouillage), un spot claque sur le podium
//   2 · 2–6 s    les rampes du plafond s'allument une à une ; la clé s'élève et tourne. « Des occasions sélectionnées. »
//   3 · 6–8 s    très près, sur les touches. « Contrôlées, prêtes à rouler. »
//   4 · 8–12 s   la clé posée, le panneau « À VENDRE », le tampon « VENDU ». « Vous vendez votre voiture ? »
//   5 · 12–16 s  l'étiquette en cuir MKZ. « Dépôt-vente : on s'occupe de tout. » Estimation, annonces, visites, démarches
//   6 · 16–20 s  de face ; l'enseigne s'allume, la clé flotte devant. « Achat · Vente · Dépôt-vente », mkzmotors.com
const W = SCENE_W, H = SCENE_H, AV = 1 / 60, DUREE_FILM = 20;
const { K } = buildCues(TIMING);
const CUES = K, P1 = K.p1, P2 = K.p2, P3 = K.p3, P4 = K.p4, P5 = K.p5, P6 = K.p6;
const mix3 = (a, b, p) => a.map((x, i) => x + (b[i] - x) * p);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lin = (x) => x;
const allume = (t, t0, d = 0.12) => (t < t0 ? 0 : Math.min(1, (t - t0) / d) * (1 + 0.5 * Math.exp(-(t - t0) * 9) * Math.abs(Math.sin((t - t0) * 60))));   // un tube qui s'allume en clignant
const impulsion = (t, t0, d = 0.09) => (t >= t0 && t < t0 + d ? Math.sin(((t - t0) / d) * Math.PI) : 0);

// ---------------------------------------------------------------- la clé
// pose : centre du repère de la clé (pos), lacet / tangage / roulis en radians, tour : la clé qui tourne sur elle-même.
// Le moteur l'agrandit (ECH = 1,8) : un objet héros d'1,6 m de long. Posée à plat, son dessous touche le podium.
const ECH_CLE = 1.8, POSEE_Y = 0.45 + 0.049 * ECH_CLE;
const cle = (pos, lacet = 0, tangage = 0, roulis = 0, tour = 0, led = 0) => ({ pos, lacet, tangage, roulis, tour, led });
// un point du repère de la clé, dans le monde (même rotation que le moteur)
function versMonde(q, k) {
  const r = (v, ax, a) => { const c = Math.cos(a), s = Math.sin(a); return ax === "y" ? [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]] : ax === "z" ? [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]] : [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]]; };
  const v = r(r(r(r(q.map((x) => x * ECH_CLE), "y", k.tour), "x", k.roulis), "z", k.tangage), "y", k.lacet);
  return [v[0] + k.pos[0], v[1] + k.pos[1], v[2] + k.pos[2]];
}
// la clé qui s'élève au-dessus du podium et se redresse face à nous, puis tourne lentement sur elle-même
const flotte = (t, t0, lacet, haut = 1.25, vitesse = 0.3) => {
  const p = E.inOutCubic(prog(t, t0, 1.2));
  return cle([0.45 * (1 - p) + 0.0 * p, lerp(POSEE_Y, haut, p) + 0.015 * Math.sin(t * 2.2) * p, 0], lacet, 0, 0.95 * p, 0.25 * p + vitesse * Math.max(0, t - t0));
};

// ---------------------------------------------------------------- les plans : [instant de la coupe, la scène]
const PLANS = [];
const plan = (a, f) => PLANS.push({ a, f });
const de = (t, a, z, ka, kb, e = E.inOutCubic) => mix3(ka, kb, e(prog(t, a, z - a)));
const cam = (pos, cible, fov, ouverture = 0, net) => ({ pos, cible, fov, ouverture, mise: dist(pos, net || cible) });
const PLEIN = { rampes: [1, 1, 1], ambiance: 0.35, podium: [0, 1], logo: 0, exposition: 1.0 };
const podium = (t) => [0.12 * t, 1];
const add3 = (a, b, k = 1) => a.map((x, i) => x + b[i] * k);

// 1 · le noir : le voyant clignote deux fois (déverrouillage), puis un spot claque sur la clé posée
plan(0, (t) => {
  const k = cle([0.45, POSEE_Y, 0], 0.35, 0, 0, 0, Math.max(impulsion(t, P1.bip), impulsion(t, P1.bip + 0.16)));
  const spot = 0.015 + 0.28 * allume(t, P1.phares, 0.06), visee = versMonde([0.08, 0.05, 0], k);
  return { rampes: [0, 0, 0], ambiance: spot, podium: [0, 0.3 * allume(t, P1.phares, 0.2)], logo: 0, exposition: 1.3, cle: k,
    cam: cam(de(t, 0, 2, add3(visee, [0.75, 0.62, 1.15]), add3(visee, [0.6, 0.5, 0.92]), lin), add3(visee, [-0.12, -0.05, 0]), 34, 0.01, visee) };
});
// 2 · les rampes s'allument ; la clé s'élève au-dessus du podium et se tourne vers nous
plan(P2.in - AV, (t) => {
  const r = P2.rampes.map((x) => allume(t, x)), on = (r[0] + r[1] + r[2]) / 3;
  return { rampes: r, ambiance: 0.1 + 0.25 * on, podium: [0.12 * t, on], logo: 0, exposition: 1.15 - 0.15 * on, cle: flotte(t, P2.in + 0.3, 0.35),
    cam: cam(de(t, P2.in, P3.in, [1.7, 1.75, 4.6], [1.3, 1.5, 3.9], E.outCubic), [0, 1.0, 0], 38, 0.012) };
});
// 3 · très près, sur les touches et le voyant ; la caméra glisse le long de la coque
plan(P3.in - AV, (t) => {
  const k = cle([0, 1.25, 0], 0.35, 0, 0.95, 0.25 + 0.3 * (t - P3.in));
  const p = E.inOutCubic(prog(t, P3.in, 2)), n = versMonde([0, 1, 0], { ...k, pos: [0, 0, 0] }).map((x) => x / ECH_CLE);
  const visee = versMonde([lerp(-0.02, 0.19, p), 0.05, lerp(0.03, 0.05, p)], k);
  return { ...PLEIN, podium: podium(t), cle: k, cam: cam(add3(add3(visee, n, 0.62), [lerp(-0.25, 0.2, p), 0.1, 0]), visee, 30, 0.006, visee) };
});
// 4 · la clé posée sur le podium, le panneau « À VENDRE » derrière elle ; le tampon « VENDU » claque
const PANNEAU = { x: -0.75, z: -1.75, lacet: Math.atan2(-(4.4 + 1.75), 0.4 + 0.75) };
plan(P4.in - AV, (t) => {
  const choc = t > P4.tampon ? 0.03 * Math.exp(-(t - P4.tampon) * 14) * Math.sin((t - P4.tampon) * 70) : 0;
  return { ...PLEIN, podium: podium(t), cle: cle([0.5, POSEE_Y, 0.3], 0.55), panneau: PANNEAU,
    cam: cam(de(t, P4.in, P5.in, [0.5, 2.0, 4.6], [0.35, 1.85, 4.1], lin).map((v, i) => v + (i === 1 ? choc : 0)), [0.05, 0.9 + choc, -0.3], 40, 0.01, [0.3, 0.6, 0.2]) };
});
// 5 · l'étiquette en cuir MKZ, qui tourne lentement devant nous
plan(P5.in - AV, (t) => {
  const k = cle([0, 1.25, 0], -0.2, 0, 0.95, 2.6 + 0.16 * (t - P5.in));
  const visee = versMonde([-0.58, 0, 0.03], k);
  return { ...PLEIN, podium: podium(t), cle: k, cam: cam(de(t, P5.in, P6.in, add3(visee, [0.25, 0.75, 1.5]), add3(visee, [0.15, 0.6, 1.25]), lin), add3(visee, [0, -0.08, 0]), 34, 0.008, visee) };
});
// 6 · de face : l'enseigne s'allume, la clé flotte devant, le voyant clignote, l'anneau du podium pulse
plan(P6.in - AV, (t) => {
  const appel = P6.appel.reduce((s, x) => s + impulsion(t, x, 0.12), 0);
  const k = cle([-0.35, 0.86 + 0.015 * Math.sin(t * 2.2), 0.3], 0, 0, 1.15, Math.PI - 0.3 + 0.04 * (t - P6.in), appel);
  return { ...PLEIN, podium: [0.12 * t, 1 + 1.5 * appel], logo: allume(t, P6.logo, 0.15), cle: k,
    cam: cam(de(t, P6.in, DUREE_FILM, [0.0, 1.6, 6.5], [0.0, 1.55, 5.9], E.outCubic), [0, 1.45, 0], 40, 0.01, [0.2, 0.95, 0.3]) };
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
  M.texture("mur", enseigne()); M.texture("cle", dessusCle()); M.texture("etiquette", etiquetteCle());
  window.__seek(0);
  window.__ready = true;
});
