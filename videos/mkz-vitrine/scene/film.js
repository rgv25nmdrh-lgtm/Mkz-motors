// MKZ Motors, la vitrine du dépôt-vente : 16 s, verticale 1080 × 1920 (Story), sans voix, montée sur une musique
// originale à 120 battements par minute. Un studio sombre, du verre, un sol laqué, une seule lueur : le rouge MKZ.
// Le fil : on tape sa plaque, on appuie sur « Estimer » ; l'estimation monte et se bloque ; les six étapes du
// dépôt-vente sortent du sol, une par temps ; le mur des voitures vendues, « Et vous ? Rien à faire. » ; les chiffres
// (0 appel, 0 visite, 1 virement) ; la boucle (Déposez, On vend, Vous encaissez) ; le logo MKZ Motors.
// Tout est fonction du temps ; les instants viennent du conducteur K (cues.js). Le montage est fluide : chaque scène
// est UN mouvement de caméra continu (une trajectoire lissée par des clés, sans coupe), et les scènes s'enchaînent
// par des fondus (FONDU, 0,25 s) où la caméra continue d'avancer. Les plans sont composés pour le vertical : de 0 à
// 8 s, le sujet reste sous les titres (zone du haut, de 300 à 600 px).

const TEMPS = K.T, b = K.b, AV = K.AV;
const BA = K.barre, CL = K.couloir, EC = K.ecrans, MU = K.mur, CH = K.chiffres, BO = K.boucle, LO = K.logo;
const VERRE = { biseau: 0.008, dos: -1, verre: 1, teinte: [0.04, 0.04, 0.05], reflet: 0.6, tranche: [1, 1, 1], trancheGain: 0.2 };
const DECAL = { rayon: 0, biseau: 0.0005, verre: 0, reflet: 0, trancheGain: 0, ecran: 1, dos: -1 };
const AMB = { fond: [0.051, 0.051, 0.059], brume: 0.3, halo: 1, studio: 1, poussieres: 0.4, vignette: 0.35, grain: 0.02, bloom: 0.8, exposition: 1 };
const CLAIR = { ...AMB, fond: [0.92, 0.92, 0.9], brume: 0.12, vignette: 0.18, poussieres: 0.1 };   // la scène claire de la boucle
const coupe = (x) => x - AV;                                 // la coupe précède l'action de deux images
const tombee = (t, t0, h, duree = 0.3) => h * (1 - E.inQuad(prog(t, t0 - duree, duree)));          // chute libre qui touche à t0
const rebond = (t, t0, a = 0.05, f = 18, am = 8) => (t > t0 ? a * Math.abs(Math.sin((t - t0) * f)) * Math.exp(-(t - t0) * am) : 0);
const oscille = (t, t0, a, f = 30, am = 9) => (t > t0 ? a * Math.sin((t - t0) * f) * Math.exp(-(t - t0) * am) : 0);
const lumiereCle = (S, c, k = 1) => S.lumieres.push({ p: [c[0] + 1.2, 3.0, c[2] + 3.0], couleur: [1, 0.95, 0.88], intensite: 0.5 * k, rayon: 8 });
const disque = (c, r, tex, o = {}) => ({ ...VERRE, c, d: [r, r, 0.02], rot: [0, 0, 0], rayon: r, ...face(tex), ecran: 1.2, tranche: ORANGE, trancheGain: 0.8, ...o });
// Hauteur de l'image (en unités du monde) à la distance d ; bas() relève le point visé pour que le sujet c soit vu à
// la fraction f de la hauteur de l'image (0 : en haut), sous les titres.
const hauteurVue = (d, fov = 38) => 2 * d * Math.tan((fov * RAD) / 2);
const bas = (c, d, fov = 38, f = 0.64) => [c[0], c[1] + (f - 0.5) * hauteurVue(d, fov), c[2]];

// ================================================================ 1 · LA BARRE (mesure 1) : on tape sa plaque, on appuie sur « Estimer »
const BARRE = { c: [0, 1.05, 0], d: [1.05, 0.1875, 0.05] }, X_BOUTON = 0.825;
function barre(S, t) {
  const n = compte(BA.touches, t), der = n ? BA.touches[n - 1] : -9, ok = t >= BA.reconnue, app = t - BA.appui, e = 1 - 0.18 * ecrase(t, BA.appui, 0.16);
  S.boites.push({ ...DECAL, c: [0, 2.0, -4.6], d: [4.0, 2.012, 0.01], rot: [0, 0, 0], ...face("bande"), ecran: 0.06 });      // le couloir des voitures, loin derrière, à peine éclairé
  S.boites.push({ ...VERRE, c: [0, 1.05 + 0.012 * ecrase(t, der, 0.12), 0], d: BARRE.d, rot: [0, 0, 0], rayon: 0.1875, ...face("barre"), ecran: 0.92, tranche: ok ? ORANGE : [1, 1, 1], trancheGain: 0.5 + 1.6 * choc(t, BA.reconnue, 0.2) });
  S.boites.push({ ...DECAL, c: [-1.05 + 0.08 + 0.5, 1.345, 0], d: [0.5, 0.0667, 0.0005], rot: [0, 0, 0], ...face("barreTitre"), ecran: 1.05 });
  if (t >= BA.reconnue - 0.02) { const o = E.outCubic(prog(t, BA.reconnue, 0.2)); S.boites.push({ ...DECAL, c: [-1.05 + 0.08 + 0.6, 0.75 + 0.06 * (1 - o), 0], d: [0.6, 0.08, 0.0005], rot: [0, 0, 0], ...face("reconnue"), ecran: 1.05, opacite: o }); }
  S.boites.push(disque([X_BOUTON, 1.05, 0.062 - 0.02 * ecrase(t, BA.appui, 0.16)], 0.13 * e, "bouton", { ecran: ok ? 1.2 : 0.3, trancheGain: ok ? 0.8 + 2 * choc(t, BA.appui, 0.2) : 0.1 }));
  S.lumieres.push({ p: [X_BOUTON, 1.1, 0.7], couleur: ORANGE, intensite: ok ? 0.5 + 1.5 * choc(t, BA.appui, 0.25) + 0.8 * choc(t, BA.reconnue, 0.2) : 0.1, rayon: 3 });
  lumiereCle(S, [0, 0, 0]);
  if (app > 0 && app < 0.5) S.sol.anneau = { c: [X_BOUTON, 0], r: 0.2 + 6 * app, largeur: 0.08, gain: 1.6 * (1 - E.inQuad(app / 0.5)), couleur: ORANGE };
}

// ================================================================ 2 · LE COULOIR (mesure 2) : l'estimation monte, se bloque
const H_PAN = 2.8, L_PAN = (H_PAN * 2048) / 1030, X_PAN = 1.05, Z_BANDEAU = -13.2, D_BANDEAU = [0.9, 0.5786, 0.03];
const zCam = (t) => lerp(3.0, -9.3, E.outCubic(prog(t, CL.debut - 0.13, CL.bloque - CL.debut + 0.13)));
const estimation = (t) => (t >= CL.bloque ? VITRINE.PRIX : VITRINE.PRIX * E.outQuad(prog(t, CL.debut + 0.1, CL.bloque - CL.debut - 0.1)));
function couloir(S, t) {
  const bl = t >= CL.bloque;
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) S.boites.push({ ...DECAL, c: [s * X_PAN, H_PAN / 2 + 0.02, -2.6 - k * (L_PAN + 0.12)], d: [L_PAN / 2, H_PAN / 2, 0.01], rot: [0, -s * 90, 0], ...face("bande"), ecran: 0.95 });
  S.boites.push({ ...VERRE, c: [0, 0.006, -8], d: [0.018, 0.004, 9.5], rot: [0, 0, 0], rayon: 0.004, face: -1, teinte: [0.5, 0.05, 0.05], couleur: ORANGE, couleurGain: 1.1, tranche: ORANGE, trancheGain: 1 });   // la ligne du sol
  S.boites.push({ ...VERRE, c: [0, 1.2 + oscille(t, CL.bloque, 0.02, 40, 10), Z_BANDEAU], d: D_BANDEAU, rot: [0, 0, 0], rayon: 0.08, ...face("bandeau"), ecran: 1.12, tranche: bl ? ORANGE : [1, 1, 1], trancheGain: 0.4 + (bl ? 0.3 + 1.6 * choc(t, CL.bloque, 0.25) : 0) });
  S.lumieres.push({ p: [0, 1.2, zCam(t) - 4], couleur: ORANGE, intensite: 0.5 + (bl ? 1.2 * choc(t, CL.bloque, 0.3) : 0), rayon: 5 }, { p: [0, 2.6, zCam(t) - 1], couleur: [1, 0.95, 0.88], intensite: 0.4, rayon: 7 });
}

// ================================================================ 3, 4 · LES ÉCRANS (mesures 3 et 4) : les six étapes, une par temps
// Deux gradins de trois écrans verticaux : 01 à 03 devant, 04 à 06 derrière et plus haut. L'étiquette sous chaque écran.
const D_E = [0.34, 0.6044, 0.025], D_ETIQ = [0.36, 0.0648, 0.012];
// en serpentin, pour que la caméra les suive d'un seul mouvement : 01 02 03 devant, de gauche à droite ; 04 05 06 derrière, de droite à gauche
const ECR = [0, 1, 2, 3, 4, 5].map((i) => { const rang = i >= 3 ? 1 : 0, col = rang ? 5 - i : i, y0 = rang ? 2.06 : 0.42; return { i, rang, y0, c: [(col - 1) * 0.86, y0 + D_E[1], rang ? -1.1 : 0], lacet: -(col - 1) * 12 }; });
const imageDe = (t) => clamp(Math.floor((t - EC.debut) * 12), 0, VITRINE.N - 1);
function ecrans(S, t) {
  ECR.forEach((e) => {
    const m = E.outBack(prog(t, EC.debut - 0.12 + 0.04 * e.i, 0.3), 1.3), dy = lerp(-1.4 - e.y0, 0, m);
    S.boites.push({ ...VERRE, c: [e.c[0], e.c[1] + dy, e.c[2]], d: D_E, rot: [-2, e.lacet, 0], rayon: 0.04, biseau: 0.005, ...face("ecran" + e.i), ecran: 1.1, trancheGain: 0.4 });
    S.boites.push({ ...VERRE, c: [e.c[0], e.y0 - 0.115 + dy, e.c[2] + 0.02], d: [D_ETIQ[0] * clamp(m), D_ETIQ[1], D_ETIQ[2]], rot: [-4, e.lacet, 0], rayon: 0.03, ...face("etiq" + e.i), ecran: 1.05, trancheGain: 0.3 });
  });
  lumiereCle(S, [0, 0, 0]); S.lumieres.push({ p: [0, 0.6, 1.8], couleur: ORANGE, intensite: 0.35, rayon: 5 }, { p: [0, 2.6, 0.9], couleur: ORANGE, intensite: 0.25, rayon: 4 });
}

// ================================================================ 5 · LE MUR (mesure 5) : les voitures vendues ; « Et vous ? Rien à faire. »
const MUR = { c: [0, 2.0, -1.2], d: [1.3, 1.856, 0.03], rot: [-5, 0, 0] };
function mur(S, t) {
  S.boites.push({ ...VERRE, ...MUR, rayon: 0.05, ...face("mur"), ecran: 1.15, trancheGain: 0.5 + 1.2 * choc(t, MU.debut, 0.2) });
  if (t >= MU.face - 0.2) S.boites.push({ ...VERRE, c: [0, 0.62 + tombee(t, MU.face, 0.5, 0.16) + rebond(t, MU.face, 0.02, 30, 12), 0.9], d: [1.0, 0.35, 0.02], rot: [-12, 0, 0], rayon: 0.05, ...face("rien"), ecran: 1.08, tranche: ORANGE, trancheGain: 0.4 + 1.6 * choc(t, MU.face, 0.2) });
  lumiereCle(S, [0, 0, 0]); S.lumieres.push({ p: [0, 0.7, 1.6], couleur: ORANGE, intensite: 0.4 + 0.8 * choc(t, MU.face, 0.3), rayon: 5 });
}

// ================================================================ 6 · LES CHIFFRES (mesure 6) : trois plaques tombent, une par temps, en colonne
const PY = [3.05, 1.95, 0.85], D_CH = [0.6, 0.492, 0.03];
function chiffres(S, t) {
  CH.plaques.forEach((tp, i) => {
    if (t < tp - 0.16) return;
    S.boites.push({ ...VERRE, c: [0, PY[i] + tombee(t, tp, 0.7, 0.16) + rebond(t, tp, 0.03, 28, 11), 0], d: D_CH, rot: [-3, 0, oscille(t, tp, 1.2, 30, 9)], rayon: 0.06, ...face("chiffre" + i), ecran: 1.1, tranche: ORANGE, trancheGain: 0.4 + 1.8 * choc(t, tp, 0.22) });
    const d = t - tp; if (d > 0 && d < 0.45) S.sol.anneau = { c: [0, 0], r: 0.3 + 6 * d, largeur: 0.08, gain: 1.6 * (1 - E.inQuad(d / 0.45)), couleur: ORANGE };
  });
  lumiereCle(S, [0, 0, 0]); S.lumieres.push({ p: [0, 1.8, 1.8], couleur: ORANGE, intensite: 0.4, rayon: 6 });
}

// ================================================================ 7 · LA BOUCLE (mesure 7) : Déposez, On vend, Vous encaissez ; la pastille descend de l'un à l'autre
const D_ET = [0.65, 0.208, 0.03], X_ET = 0.15, Y_ET = [2.35, 1.6, 0.85], X_PAST = -0.74, Y_LOGO = 1.85, P_LOGO = [-0.34, Y_LOGO, 0.05];
function pastille(t) {                                       // elle arrive sur chaque étape sur le temps
  const e = BO.etapes, ici = (i) => [X_PAST, Y_ET[i], 0.05];
  if (t < e[1] - 0.22) return v3.add(ici(0), [0, tombee(t, e[0], 1.6, 0.18) + rebond(t, e[0], 0.05, 26, 9), 0]);
  for (const i of [1, 2]) if (t < (i === 2 ? BO.retour + 0.1 : e[2] - 0.22)) { const f = E.inOutCubic(prog(t, e[i] - 0.22, 0.22)), p = v3.mix(ici(i - 1), ici(i), f); p[0] -= 0.28 * Math.sin(Math.PI * f); p[1] += rebond(t, e[i], 0.05, 26, 9); return p; }
  const f = E.inOutCubic(prog(t, BO.retour + 0.1, 0.36)), p = v3.mix(ici(2), P_LOGO, f); p[0] -= 0.4 * Math.sin(Math.PI * f); p[2] += 1.0 * Math.sin(Math.PI * f); return p;
}
function boucle(S, t) {
  Y_ET.forEach((y, i) => { const on = t >= BO.etapes[i]; S.boites.push({ ...VERRE, c: [X_ET, y - 0.03 * ecrase(t, BO.etapes[i], 0.16), 0], d: D_ET, rot: [-3, 0, 0], rayon: 0.06, ...face("etape" + i + (on ? "A" : "")), ecran: 1.05, tranche: on ? ORANGE : [0.2, 0.2, 0.2], trancheGain: on ? 0.6 + 1.6 * choc(t, BO.etapes[i], 0.2) : 0.3 }); });
  S.boites.push(disque(pastille(t), 0.12, "pastille"));
  S.lumieres.push({ p: v3.add(pastille(t), [0, 0.2, 0.8]), couleur: ORANGE, intensite: 0.5, rayon: 3 }); lumiereCle(S, [0, 0, 0], 1.4);
}

// ================================================================ 8 · LE LOGO (mesure 8), tenu : la pastille devient la plaque du logo
const L_LOGO = [0.82, 0.241];
function logo(S, t) {
  const m = E.outBack(prog(t, LO.debut - AV, 0.24), 1.5), g = clamp(prog(t, LO.debut - AV, 0.2));
  if (t < LO.debut + 0.1) S.boites.push(disque(P_LOGO, 0.12 * (1 - prog(t, LO.debut - AV, 0.12)), "pastille"));
  if (m > 0.01) S.boites.push({ ...VERRE, c: v3.mix(P_LOGO, [0, Y_LOGO, 0], g), d: [L_LOGO[0] * m, L_LOGO[1] * m, 0.02], rot: [0, 0, 0], rayon: 0.06 * clamp(m), ...face("logo"), ecran: 1.15, teinte: [0.06, 0.06, 0.07], tranche: ORANGE, trancheGain: 0.5 + 2 * choc(t, LO.debut, 0.3) });
  { const o = E.outCubic(prog(t, LO.debut + 0.15, 0.25)); if (o > 0.01) S.boites.push({ ...DECAL, c: [0, 1.42 + 0.05 * (1 - o), 0.02], d: [0.3, 0.06, 0.0005], rot: [0, 0, 0], ...face("tag"), ecran: 1.1, opacite: o }); }
  [0, 1].forEach((k) => { const tp = LO.phrase + 0.25 * k, o = E.outCubic(prog(t, tp, 0.18)); if (o > 0.01) S.boites.push({ ...DECAL, c: [0, 1.1 - 0.26 * k - 0.06 * (1 - o), 0], d: [0.8, 0.1257, 0.0005], rot: [0, 0, 0], ...face("phrase", [0, 0.5 * k, 1, 0.5 * k + 0.5]), ecran: 1.1, opacite: o }); });   // la phrase, ligne par ligne
  if (t >= LO.adresse) { const o = E.outCubic(prog(t, LO.adresse, 0.25)); S.boites.push({ ...DECAL, c: [0, 0.52 + 0.08 * (1 - o), 0], d: [0.42, 0.0756, 0.0005], rot: [0, 0, 0], ...face("adresse"), ecran: 1.1, opacite: o }); }
  S.lumieres.push({ p: [P_LOGO[0], 1.95, 0.9], couleur: ORANGE, intensite: 0.5 + 1.4 * choc(t, LO.debut, 0.3), rayon: 3.5 }); lumiereCle(S, [0, 0, 0]);
}

// ================================================================ LE MONTAGE : des scènes, chacune un seul mouvement de caméra
// Une clé de caméra : { t, k (orbite…), fov, ouv (ouverture), elan (vitesse à la clé : 1 normale, 0 à l'arrêt) }.
// Entre les clés, une courbe d'Hermite : la position, la visée, le roulis, le champ et le flou changent sans à-coup
// (vitesse continue). ralentir (0 à 1) : la caméra ralentit au passage de chaque clé, sans jamais s'arrêter.
const cleCam = (t, k, fov = 38, ouv = 0.006, elan = 1) => ({ t, k, fov, ouv, elan });
function trajet(cles, t, ralentir = 0) {
  const n = cles.length, T = cles.map((c) => c.t), V = cles.map((c) => [...c.k, c.fov, c.ouv]);
  const vit = V.map((v, i) => { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); return v.map((x, j) => (cles[i].elan * (V[b][j] - V[a][j])) / (T[b] - T[a])); });
  if (t <= T[0]) return V[0].map((x, j) => x + (1 - ralentir) * vit[0][j] * (t - T[0]));                 // avant la première clé : sur sa lancée
  if (t >= T[n - 1]) return V[n - 1].map((x, j) => x + (1 - ralentir) * vit[n - 1][j] * (t - T[n - 1]));   // après la dernière : de même
  let i = 0; while (t > T[i + 1]) i++;
  const h = T[i + 1] - T[i]; let u = (t - T[i]) / h;
  if (ralentir) u -= (ralentir * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);
  const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = 3 * u2 - 2 * u3, h11 = u3 - u2;
  return V[i].map((x, j) => h00 * x + h10 * h * vit[i][j] + h01 * V[i + 1][j] + h11 * h * vit[i + 1][j]);
}
const camera = (S, cles, t, ralentir = 0, o = {}) => { const r = trajet(cles, t, ralentir); S.cam = r.slice(0, 7); S.fov = r[7]; S.ouverture = Math.max(0, r[8]); if (o.clair) S.clair = true; };
const SECTIONS = [];
const scene_ = (de, a, f) => SECTIONS.push({ de, a, f });
const FONDU = 0.25;   // durée des fondus entre les scènes, centrés sur la frontière

// 1 · la barre : la caméra longe la plaque pendant qu'on la tape, puis plonge sur le bouton et s'y enfonce
const CAM_BARRE = [cleCam(0, orbite(bas([-0.5, 1.12, 0], 3.9, 46, 0.6), 3.9, -12, 5, -3), 46, 0.004), cleCam(1.3, orbite(bas([-0.22, 1.1, 0], 3.6, 46, 0.6), 3.6, -3, 3, 0), 46, 0.004, 0.3),
  cleCam(1.58, orbite(bas([X_BOUTON - 0.05, 1.05, 0.05], 1.2, 40), 1.2, 26, 7, 4), 40, 0.008), cleCam(2.0, orbite(bas([X_BOUTON, 1.05, 0.05], 0.75, 40), 0.75, 30, 7, 5), 40, 0.008)];
scene_(0, 2, (t, S) => { barre(S, t); camera(S, CAM_BARRE, t); });
// 2 · le couloir : on file entre les photos ; l'estimation se bloque, la caméra s'en approche
scene_(2, 4, (t, S) => { couloir(S, t); const z = zCam(t) - 0.35 * prog(t, CL.bloque, 0.6) - 0.5 * Math.max(0, t - 3.95) ** 1.5, y = 1.2 + 0.14 * hauteurVue(z - Z_BANDEAU, 52);
  S.cam = [0.05 * Math.sin(t * 5), y, z, 0, y, z - 5, 1.2 * Math.sin(t * 4.1) * (1 - prog(t, CL.bloque - 0.3, 0.3))]; S.fov = 52; S.ouverture = 0.003; });
// 3, 4 · les écrans : de loin, puis d'écran en écran (01 → 06, en serpentin), puis tous, de haut
const CAM_ECRANS = [cleCam(EC.debut, orbite(bas([0, 1.55, -0.55], 7.4, 40, 0.62), 7.4, -14, 5, -2), 40),
  ...ECR.map((e, j) => cleCam(EC.plans[j], orbite(bas([e.c[0], e.y0 + 0.5, e.c[2]], 3.3, 38, 0.66), 3.3, e.lacet + [-16, -4, 10, 14, 2, -12][j], 4, [1, 0, -1, -1, 0, 1][j]), 38, e.rang ? 0.004 : 0.01)),
  cleCam(EC.large, orbite(bas([0, 1.5, -0.55], 8.0, 40, 0.64), 8.0, 16, 18, 2), 40), cleCam(EC.large + 0.5, orbite(bas([0, 1.5, -0.55], 7.7, 40, 0.64), 7.7, 20, 19, 2), 40)];
scene_(4, 8, (t, S) => { ecrans(S, t); camera(S, CAM_ECRANS, t, 0.78); });
// 5 · le mur : balayé de près, puis la caméra recule jusqu'à le voir de face ; la plaque tombe
const CAM_MUR = [cleCam(MU.debut, orbite([-0.4, 1.4, -1.2], 2.7, -36, 4, -4)), cleCam(MU.debut + 0.65, orbite([0.4, 2.5, -1.2], 3.0, 22, 7, 3)),   // le balayage, plus large et plus doux
  cleCam(MU.face + 0.1, orbite([0.1, 2.0, -0.8], 5.0, 8, 5, 1), 38, 0.003), cleCam(MU.face + 0.5, orbite([0, 1.85, -0.6], 7.3, 0, 4, 0), 38, 0), cleCam(CH.plaques[0], orbite([0, 1.85, -0.6], 7.0, 0, 4, 0), 38, 0)];
scene_(8, 10, (t, S) => { mur(S, t); camera(S, CAM_MUR, t, 0.3); });
// 6 · les chiffres : la caméra descend la colonne, une plaque par temps, puis recule
const CAM_CHIFFRES = [cleCam(CH.plaques[0], orbite([0, PY[0] - 0.05, 0], 3.0, -16, 5, -2), 42), cleCam(CH.plaques[1], orbite([0, PY[1] - 0.05, 0], 2.9, 12, 2, 2), 42),
  cleCam(CH.plaques[2], orbite([0, PY[2] - 0.05, 0], 2.8, -8, 6, -1), 42), cleCam(CH.ligne, orbite([0, 1.95, 0], 6.2, 0, 4, 0), 38), cleCam(CH.ligne + 0.5, orbite([0, 1.95, 0], 5.9, 0, 4, 0), 38)];
scene_(10, 12, (t, S) => { chiffres(S, t); camera(S, CAM_CHIFFRES, t, 0.72); });
// 7 · la boucle, dans la scène claire ; la caméra finit là où commence celle du logo (la pastille ne saute pas)
const K_LOGO = (t) => orbite([0, 1.18, 0], lerp(5.0, 4.7, prog(t, LO.debut, 2)), 0, 2, 0);
const CAM_BOUCLE = [cleCam(BO.etapes[0], orbite([-0.05, 1.6, 0], 5.0, -12, 3, 0), 42), cleCam(BO.etapes[1], orbite([-0.05, 1.6, 0], 4.6, -6, 3, 0), 42),
  cleCam(BO.etapes[2], orbite([X_ET - 0.12, Y_ET[2] + 0.3, 0], 3.5, 14, 3, 2), 42), cleCam(BO.retour, orbite([-0.1, 1.6, 0], 4.9, 6, 3, 0), 40), cleCam(LO.debut, K_LOGO(LO.debut), 38, 0, 0)];
scene_(12, 14, (t, S) => { boucle(S, t); camera(S, CAM_BOUCLE, t, 0.4, { clair: 1 }); });
// 8 · le logo, tenu
scene_(14, 16, (t, S) => { logo(S, t); S.cam = K_LOGO(t); S.fov = 38; S.ouverture = 0; });

// ================================================================ la scène
const sectionDe = (t) => { let i = 0; for (let k = 0; k < SECTIONS.length; k++) if (t >= SECTIONS[k].de - 1e-6) i = k; return i; };
let T_IMAGE = 0, SECTION_FORCEE = null;
function scene(tt) {
  const i = SECTION_FORCEE ?? sectionDe(T_IMAGE), sec = SECTIONS[i], t = clamp(tt, sec.de - FONDU, sec.a + FONDU);
  const S = { boites: [], spheres: [], lumieres: [], sol: { reflet: 0.62, rugosite: 0.1, pulsation: 0 }, cam: null, fov: 38, ouverture: 0.006, mise: undefined };
  sec.f(t, S);
  let pos = S.cam.slice(0, 3);
  const cible = S.cam.slice(3, 6), roulis = S.cam[6] || 0;
  // sur chaque coup de grosse caisse : une légère poussée (sans secousse, pour la fluidité) et un éclair rouge très court
  let z = 0, pu = 0;
  for (const [tk, f] of K.frappes) { const d = t - tk; if (d < 0 || d > 0.6) continue; z += 0.02 * f * Math.exp(-d / 0.14) * prog(t, tk, 0.04); pu += 0.5 * f * choc(t, tk, 0.16); }
  const dist = v3.lon(v3.sub(cible, pos));
  if (pu > 0.03 && !S.clair) S.lumieres.unshift({ p: v3.add(pos, [0, 0.4, 0]), couleur: ORANGE, intensite: 1.3 * pu, rayon: dist * 2.2 });
  pos = v3.mix(pos, cible, z); S.sol.pulsation = Math.max(S.sol.pulsation, pu);
  return { cam: { pos, cible, roulis, fov: S.fov, ouverture: S.ouverture, ...(S.mise ? { mise: S.mise } : {}) }, boites: S.boites, spheres: S.spheres, lumieres: S.lumieres.slice(0, 4), sol: S.sol, ambiance: S.clair ? CLAIR : AMB };
}

// ---------------------------------------------------------------- les textures
function texturesFixes() {
  composer(1, [{ nom: "bande" }, { nom: "mur" }]);
  composer(2, [...[0, 1, 2].map((i) => ({ nom: "chiffre" + i })), ...VITRINE.ETAPES.map((_, i) => ({ nom: "etiq" + i })), { nom: "rien" }]);
}
function textures(t) {
  const k = imageDe(t);
  composer(0, ECR.map((e) => ({ nom: "ecran" + e.i, p: { k } })));
  composer(3, [{ nom: "barre", p: { n: compte(BA.touches, t), curseur: Math.floor(t / 0.2) % 2 ? 0 : 1, ok: t >= BA.reconnue ? 1 : 0 } }, { nom: "bouton" }, { nom: "pastille" },
    { nom: "bandeau", p: { n: Math.round(estimation(t)), bloque: t >= CL.bloque ? 1 : 0 } }, { nom: "tag" }, { nom: "barreTitre" }, { nom: "reconnue" },
    ...[0, 1, 2].flatMap((i) => [{ cle: "etape" + i, nom: "etape" + i }, { cle: "etape" + i + "A", nom: "etape" + i, p: { actif: 1 } }]), { nom: "logo" }, { nom: "phrase" }, { nom: "adresse" }]);
}

// ---------------------------------------------------------------- les titres de la Story (calque 2D, pleine définition)
// Des phrases courtes, posées sur les temps, pour que l'histoire se lise sans le son. Chaque mot monte d'un masque ;
// la phrase s'efface juste avant la suivante. En haut de l'image, sous la barre d'Instagram (zone sûre : y > 250 px).
const TITRES = [
  { de: 0.15, a: coupe(EC.debut), lignes: [["Votre", "voiture"], ["mérite", "une", "vitrine."]], rouge: [1] },
  { de: EC.debut, a: coupe(MU.debut), lignes: [["Six", "étapes,"], ["aucune", "pour", "vous."]], rouge: [1] },
];
function titres(x, t) {
  x.clearRect(0, 0, W, H);
  const T = TITRES.find((q) => t >= q.de && t < q.a); if (!T) return;
  const sortie = 1 - prog(t, T.a - 0.12, 0.12), interligne = 116, y0 = 380;
  { const g = x.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, "rgba(8,8,10,0.85)"); g.addColorStop(0.65, "rgba(8,8,10,0.6)"); g.addColorStop(1, "rgba(8,8,10,0)");   // un voile sombre derrière les titres
    x.save(); x.globalAlpha = sortie * Math.min(1, prog(t, T.de, 0.15) + (T.de > 0.3 ? 1 : 0)); x.fillStyle = g; x.fillRect(0, 0, W, 720); x.restore(); }
  x.save(); x.globalAlpha = sortie; x.shadowColor = "rgba(0,0,0,0.6)"; x.shadowBlur = 30;
  let n = 0;
  T.lignes.forEach((mots, l) => {
    let o = { taille: 100, graisse: 700, serre: -0.035 };
    while (largeur(x, mots.join(" "), o) > W - 140) o = { ...o, taille: o.taille - 2 };
    const esp = largeur(x, " ", o), ls = mots.map((m) => largeur(x, m, o));
    let px = (W - (ls.reduce((a, c) => a + c, 0) + esp * (mots.length - 1))) / 2; const y = y0 + l * interligne;
    mots.forEach((m, i) => {
      const raw = prog(t, T.de + 0.06 + 0.07 * n++, 0.4), p = E.outExpo(raw);
      if (raw > 0) {
        x.save(); x.beginPath(); x.rect(px - 30, y - o.taille * 1.05, ls[i] + 60, o.taille * 1.4); x.clip();
        texte(x, m, px, y + (1 - p) * o.taille * 1.25, { ...o, couleur: T.rouge.includes(l) ? C.accent : C.texte }); x.restore();
      }
      px += ls[i] + esp;
    });
  });
  x.restore();
}

const ECH = window.ECHANTILLONS || 24, OBT = window.OBTURATEUR || 1 / 120, RAYONS = window.RAYONS || 2;   // obturateur : 1/120 s, soit 180° à 60 i/s ; RAYONS : rayons par passe et par pixel (1 à 4)
let CALQUE = null, FONDU_CTX = null, TOILE_3D = null;
const TRANSITIONS = SECTIONS.slice(1).map((s, i) => ({ tc: s.de, a: i, b: i + 1 }));
// Un fondu : la scène qui part est calculée, posée sur un calque 2D, puis la scène qui arrive est calculée dessous ; le
// calque devient transparent (en douceur) sur la durée du fondu. Ces images-là coûtent deux rendus.
window.__seek = (t) => {
  t = clamp(t, 0, K.DUREE - 1e-4); T_IMAGE = t; textures(t);
  const o = { echantillons: ECH, obturateur: OBT, rayons: RAYONS }, tr = TRANSITIONS.find((q) => Math.abs(t - q.tc) < FONDU / 2);
  FONDU_CTX.clearRect(0, 0, W, H);
  if (tr) {
    const p = 0.5 - 0.5 * Math.cos(Math.PI * clamp((t - (tr.tc - FONDU / 2)) / FONDU));
    SECTION_FORCEE = tr.a; M.image(t, scene, o); M.attendre();
    FONDU_CTX.globalAlpha = 1 - p; FONDU_CTX.drawImage(TOILE_3D, 0, 0, W, H); FONDU_CTX.globalAlpha = 1;
    SECTION_FORCEE = tr.b; M.image(t, scene, o); M.attendre();
  } else { SECTION_FORCEE = null; M.image(t, scene, o); M.attendre(); }
  SECTION_FORCEE = null;
  titres(CALQUE, t);
};
window.__ready = false;
// La mise en route (moteur, textures) est lourde sans carte graphique : elle attend la fin du chargement de la page,
// sinon elle le retarde, et l'outil de rendu, qui attend ce chargement 60 s au plus, abandonne.
const PAGE_CHARGEE = new Promise((ok) => (document.readyState === "complete" ? ok() : window.addEventListener("load", ok, { once: true }))).then(() => new Promise((ok) => setTimeout(ok, 50)));
Promise.all([POLICES_PRETES, VITRINE.charger(), PAGE_CHARGEE]).then(() => {   // les polices, le logo, les photos des véhicules
  const plateau = document.getElementById("plateau");
  const DEF = window.DEFINITION || 1;   // définition du rendu 3D (0,75 : les trois quarts des pixels de côté, l'image est agrandie)
  const cv = document.createElement("canvas"); cv.width = Math.round(W * DEF); cv.height = Math.round(H * DEF); cv.style.width = W + "px"; cv.style.height = H + "px"; plateau.appendChild(cv);
  const cf = document.createElement("canvas"); cf.width = W; cf.height = H; plateau.appendChild(cf); FONDU_CTX = cf.getContext("2d"); TOILE_3D = cv;   // le calque des fondus
  const cq = document.createElement("canvas"); cq.width = W; cq.height = H; plateau.appendChild(cq); CALQUE = cq.getContext("2d");   // le calque des titres
  M = Moteur.creer(cv, { largeur: cv.width, hauteur: cv.height, couches: 4, texL: TL, texH: TH });
  texturesFixes(); textures(0);   // pas d'image d'échauffement : la première image demandée la calcule
  window.__ready = true;
});
