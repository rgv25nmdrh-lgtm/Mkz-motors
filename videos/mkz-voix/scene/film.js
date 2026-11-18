// Publicité MKZ Motors avec voix off : 20 s, verticale, 1080×1920 (TikTok, Reels, Stories). Une voix d'homme posée
// (Runway) dit le dépôt-vente ; la clé de voiture de MKZ Motors (coque noire laquée, anneau chromé, étiquette en cuir
// rouge) le joue dans le showroom. Les mots montent à l'écran avec la voix (lisible sans le son) ; les cinq étapes du
// dépôt-vente se cochent quand elles sont dites. Les instants viennent du conducteur (cues.js), donc de la voix.
//   1 · 0–2,5 s       le noir ; le voyant clignote, un spot claque.          « Vous voulez vendre votre voiture ? »
//   2 · 2,5–5 s       les rampes s'allument ; la clé s'élève et se tourne.   « Confiez-la à MKZ Motors. »
//   3 · 5–7 s         la clé posée devant le panneau « À VENDRE ».           « On l'estime, on crée l'annonce, »
//   4 · 7–9,1 s       très près des touches ; le voyant clignote.            « on organise les visites et les essais, »
//   5 · 9,1–11,5 s    l'étiquette en cuir MKZ qui tourne.                    « et on gère toutes les démarches. »
//   6 · 11,5–14,5 s   face au panneau ; le tampon « VENDU » claque.          « Le dépôt-vente : on s'occupe de tout. »
//   7 · 14,5–20 s     de face, l'enseigne s'allume ; la clé flotte.          « MKZ Motors. On la vend pour vous. » + le site
const W = SCENE_W, H = SCENE_H, AV = 1 / 60, DUREE_FILM = 20;
const { K } = buildCues(TIMING);
const CUES = K, P1 = K.p1, P2 = K.p2, P3 = K.p3, P4 = K.p4, P5 = K.p5, P6 = K.p6, P7 = K.p7;
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
  return cle([0.45 * (1 - p), lerp(POSEE_Y, haut, p) + 0.015 * Math.sin(t * 2.2) * p, 0], lacet, 0, 0.95 * p, 0.25 * p + vitesse * Math.max(0, t - t0));
};
const voyant = (t, t0) => Math.max(impulsion(t, t0), impulsion(t, t0 + 0.16));   // deux clignements : la clé déverrouille

// ---------------------------------------------------------------- les plans : [instant de la coupe, la scène]
const PLANS = [];
const plan = (a, f) => PLANS.push({ a, f });
const de = (t, a, z, ka, kb, e = E.inOutCubic) => mix3(ka, kb, e(prog(t, a, z - a)));
const cam = (pos, cible, fov, ouverture = 0, net) => ({ pos, cible, fov, ouverture, mise: dist(pos, net || cible) });
const PLEIN = { rampes: [1, 1, 1], ambiance: 0.35, podium: [0, 1], logo: 0, exposition: 1.0 };
const podium = (t) => [0.12 * t, 1];
const add3 = (a, b, k = 1) => a.map((x, i) => x + b[i] * k);
// le panneau « À VENDRE », tourné vers l'avant du showroom (plans 3 et 6 : la même place, deux regards)
const PANNEAU = { x: -0.75, z: -1.75, lacet: Math.atan2(-(4.4 + 1.75), 0.4 + 0.75) };
const CLE_POSEE = cle([-0.2, POSEE_Y, 0.25], Math.PI + 0.3);

// 1 · le noir : le voyant clignote deux fois (déverrouillage), puis un spot claque sur la clé posée
plan(0, (t) => {
  const k = cle([0.45, POSEE_Y, 0], 0.35, 0, 0, 0, voyant(t, P1.bip));
  const spot = 0.015 + 0.28 * allume(t, P1.phares, 0.06), visee = versMonde([0.08, 0.05, 0], k);
  return { rampes: [0, 0, 0], ambiance: spot, podium: [0, 0.3 * allume(t, P1.phares, 0.2)], logo: 0, exposition: 1.3, cle: k,
    cam: cam(de(t, 0, P2.in, add3(visee, [0.8, 0.66, 1.25]), add3(visee, [0.6, 0.5, 0.92]), lin), add3(visee, [-0.12, -0.05, 0]), 34, 0.01, visee) };
});
// 2 · les rampes s'allument ; la clé s'élève au-dessus du podium et se tourne vers nous
plan(P2.in - AV, (t) => {
  const r = P2.rampes.map((x) => allume(t, x)), on = (r[0] + r[1] + r[2]) / 3;
  return { rampes: r, ambiance: 0.1 + 0.25 * on, podium: [0.12 * t, on], logo: 0, exposition: 1.15 - 0.15 * on, cle: flotte(t, P2.in + 0.25, 0.35),
    cam: cam(de(t, P2.in, P3.in, [1.7, 1.75, 4.6], [1.3, 1.5, 3.9], E.outCubic), [0, 1.12, 0], 38, 0.012) };
});
// 3 · « On l'estime, on crée l'annonce » : le panneau « À VENDRE » sur le podium, la clé flotte à côté et tourne, de trois
// quarts. Elle reste au-dessus des étapes cochées en bas de l'image.
plan(P3.in - AV, (t) => {
  const k = cle([0.62, 1.13 + 0.015 * Math.sin(t * 2.2), 0.35], 0.8, 0, 0.95, 0.15 + 0.1 * (t - P3.in));
  return { ...PLEIN, podium: podium(t), cle: k, panneau: PANNEAU,
    cam: cam(de(t, P3.in, P4.in, [1.45, 1.6, 4.6], [1.15, 1.5, 4.05], lin), [-0.2, 1.08, -0.5], 40, 0.012, k.pos) };
});
// 4 · « les visites et les essais » : très près des touches ; le voyant clignote sur « essais »
plan(P4.in - AV, (t) => {
  const k = cle([0, 1.25, 0], 0.35, 0, 0.95, 0.25 + 0.3 * (t - P4.in), voyant(t, P4.bip));
  const p = E.inOutCubic(prog(t, P4.in, P5.in - P4.in)), n = versMonde([0, 1, 0], { ...k, pos: [0, 0, 0] }).map((x) => x / ECH_CLE);
  const visee = versMonde([lerp(-0.02, 0.19, p), 0.05, lerp(0.03, 0.05, p)], k);
  return { ...PLEIN, podium: podium(t), cle: k, cam: cam(add3(add3(visee, n, 0.62), [lerp(-0.25, 0.2, p), 0.1, 0]), add3(visee, [0, 0.09, 0]), 30, 0.006, visee) };   // visée un peu au-dessus : les touches descendent sous le texte
});
// 5 · « toutes les démarches » : l'étiquette en cuir MKZ, qui tourne lentement devant nous
plan(P5.in - AV, (t) => {
  const k = cle([0, 1.25, 0], -0.2, 0, 0.95, 2.6 + 0.16 * (t - P5.in));
  const visee = versMonde([-0.58, 0, 0.03], k);
  return { ...PLEIN, podium: podium(t), cle: k, cam: cam(de(t, P5.in, P6.in, add3(visee, [0.25, 0.75, 1.5]), add3(visee, [0.15, 0.6, 1.25]), lin), add3(visee, [0, -0.08, 0]), 34, 0.008, visee) };
});
// 6 · « on s'occupe de tout » : face au panneau, la clé devant ; le tampon « VENDU » claque, l'image encaisse le coup
plan(P6.in - AV, (t) => {
  const choc = t > P6.tampon ? 0.03 * Math.exp(-(t - P6.tampon) * 14) * Math.sin((t - P6.tampon) * 70) : 0;
  return { ...PLEIN, podium: podium(t), cle: CLE_POSEE, panneau: PANNEAU,
    cam: cam(de(t, P6.in, P7.in, [0.4, 2.15, 5.5], [0.3, 2.0, 4.9], lin).map((v, i) => v + (i === 1 ? choc : 0)), [0.05, 0.9 + choc, -0.3], 40, 0.01, [0.3, 0.6, 0.2]) };
});
// 7 · de face : l'enseigne s'allume sur « MKZ », la clé flotte devant, le voyant et l'anneau du podium pulsent
plan(P7.in - AV, (t) => {
  const appel = P7.appel.reduce((s, x) => s + impulsion(t, x, 0.12), 0);
  const k = cle([-0.35, 0.86 + 0.015 * Math.sin(t * 2.2), 0.3], 0, 0, 1.15, Math.PI - 0.3 + 0.04 * (t - P7.in), appel);
  return { ...PLEIN, podium: [0.12 * t, 1 + 1.5 * appel], logo: allume(t, P7.logo, 0.15), cle: k,
    cam: cam(de(t, P7.in, DUREE_FILM, [0.0, 1.55, 7.4], [0.0, 1.5, 6.8], E.outCubic), [0, 1.35, 0], 40, 0.01, [0.2, 0.95, 0.3]) };
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
  const v = t < P6.tampon ? 0 : Math.round(Math.min(1, prog(t, P6.tampon, 0.12)) * 30) / 30;
  if (v !== _tampon) { M.texture("panneau", panneau(v)); _tampon = v; }
}
const ECH = window.ECHANTILLONS || 8, DEF = window.DEFINITION || 0.5, OBT = 1 / 60;   // passes par image ; définition du rendu 3D (le calque des textes reste en pleine définition)
window.__seek = (t) => { t = clamp(t, 0, DUREE_FILM - 1e-4); T_IMAGE = t; textures(t); M.image(t, scene, { echantillons: ECH, obturateur: OBT }); dessinerCalque(CALQUE, t); };
window.__ready = false;
Promise.all([500, 600, 700, 800].map((g) => document.fonts.load(`${g} 40px "Geist"`, "MKZ Motors À VENDRE Dépôt-vente démarches Confiez-la ?")).concat([document.fonts.load('500 40px "Geist Mono"', "DÉPÔT-VENTE")])).then(() => {
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
