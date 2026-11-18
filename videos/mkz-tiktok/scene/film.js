// MKZ Motors : publicité TikTok du dépôt-vente, verticale 1080 × 1920, 25 s, voix off. Huit plans, un seul fil :
//   1 · « Vous vendez votre voiture ? »  la nuit, le téléphone du vendeur s'allume (appel manqué, « Dernier prix ? »)
//   2 · « Les appels à toute heure, les visites annulées… »  les messages jaillissent, le carnet se rature, tout se fige
//   3 · « Confiez-la à MKZ Motors. »  les messages se rassemblent et deviennent le mandat de dépôt-vente, qui se signe
//   4 · « On l'estime, on la photographie, on publie l'annonce. »  le mandat se retourne : la fiche du véhicule
//   5 · « On répond aux appels et on organise les essais. »  la fiche devient la case du jeudi 18:30, le planning se
//       dresse et les essais s'inscrivent d'un jour à l'autre
//   6 · « Jusqu'à la vente, démarches comprises. »  le dossier de vente sort du planning, le tampon « Vendu » claque
//   7 · « MKZ Motors, le dépôt-vente qui s'occupe de tout. »  le tampon s'envole et devient le logo
//   8 · « Appelez-nous ! »  le bouton, le téléphone et le site
// Chaque passage d'un plan à l'autre est une métamorphose : un objet du plan A devient l'objet du plan B.
// Tout est gris et froid pendant le problème ; le rouge MKZ et la lumière chaude naissent avec le mandat.
// Tout est fonction du temps ; les instants viennent du conducteur K (cues.js), les dessins de tex-tiktok.js.

const { AV } = K;
E.inOutQuad = E.inOutQuad || ((x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2));
const P_ = K.p, M_ = K.m, F_ = K.f, E_ = K.e, D_ = K.d, V_ = K.v, DUREE_FILM = K.duree;
const VERRE = { biseau: 0.008, dos: -1, verre: 1, teinte: [0.04, 0.04, 0.05], reflet: 0.6, tranche: [1, 1, 1], trancheGain: 0.2 };
const DECAL = { rayon: 0, biseau: 0.0005, verre: 0, reflet: 0, trancheGain: 0, ecran: 1, dos: -1 };
const AMB = { fond: [0.051, 0.051, 0.059], brume: 0.3, halo: 1, studio: 1, poussieres: 0.4, vignette: 0.35, grain: 0.02, bloom: 0.8, exposition: 1 };
const rebond = (t, t0, a = 0.05, f = 18, am = 8) => (t > t0 ? a * Math.abs(Math.sin((t - t0) * f)) * Math.exp(-(t - t0) * am) : 0);
const oscille = (t, t0, a, f = 30, am = 9) => (t > t0 ? a * Math.sin((t - t0) * f) * Math.exp(-(t - t0) * am) : 0);
const FROID = [0.7, 0.83, 1], CHAUD = [1, 0.95, 0.88];
const chaleur = (t) => E.inOutCubic(prog(t, P_.aspire, 0.5));
const ambiance = (t) => ({ ...AMB, fond: v3.mix([0.034, 0.045, 0.068], AMB.fond, chaleur(t)) });
const lumiereCle = (S, c, t, k = 1) => S.lumieres.push({ p: [c[0] + 1.2, c[1] + 3.0, c[2] + 3.0], couleur: v3.mix(FROID, CHAUD, chaleur(t)), intensite: 0.5 * k, rayon: 8 });
// La rotation qui tourne la face avant d'une boîte vers un point (la caméra) : [rx, ry, roulis] en degrés.
const versPoint = (p, cible, roulis = 0) => { const v = v3.sub(cible, p), l = v3.lon(v) || 1; return [-Math.asin(v[1] / l) / RAD, Math.atan2(v[0], v[2]) / RAD, roulis]; };

// ================================================================ 1, 2 · LE PROBLÈME
// Le téléphone du vendeur, posé à plat, vibre à chaque message ; son carnet de visites est à côté.
const AG = { c: [-0.8, 0.006, 0.26], d: [0.62, 0.4384, 0.004], rot: [-90, 16, 0] };
const D_TEL = [0.16, 0.331, 0.012], TEL0 = [0.02, 0.014, 0.55];
const NT = P_.notifs;
const tFige = (t) => (t <= P_.fige ? t : P_.fige + (Math.min(t, P_.aspire) - P_.fige) * 0.06);
function telephone(t) {
  const u = tFige(t); let v = 0.35;
  for (const tb of NT) if (u >= tb - 0.02) v = Math.max(v, Math.exp(-(u - tb) / 0.3));
  if (t >= P_.aspire) v *= 1 - prog(t, P_.aspire, 0.3);
  return { c: [TEL0[0] + 0.012 * u + 0.005 * v * Math.sin(u * 230), TEL0[1], TEL0[2] + 0.004 * v * Math.sin(u * 190 + 1)], lacet: 12 + 0.6 * u + 1.6 * v * Math.sin(u * 250 + 2), vib: v };
}
function boiteTel(S, t) {
  const tel = telephone(t);
  S.boites.push({ ...VERRE, c: tel.c, d: D_TEL, rot: [-90, tel.lacet, 0], rayon: 0.04, biseau: 0.004, ...face("verrou"), ecran: 1.15, trancheGain: 0.35 });
  return tel;
}
const page = (t) => ({ ...DECAL, c: AG.c, d: AG.d, rot: [-90, AG.rot[1] + 0.8 * (oscille(t, P_.ratures[0], 1, 60, 14) + oscille(t, P_.ratures[1], 1, 60, 14)), 0], ...face("agenda"), ecran: 0.5 });
const rature = (n) => surFace(AG, ...TEX.agenda.entree(n), 0);
// Les messages : des blocs de verre qui jaillissent de l'écran, tiennent un instant tournés vers la caméra, puis
// retombent autour du téléphone. apex : où le bloc se tient (depuis le téléphone) ; repos : où il retombe.
const D_B2 = [0.3, 0.135, 0.02], D_B1 = [0.3, 0.1025, 0.02], D_R1 = [0.24, 0.082, 0.018], D_R2 = [0.24, 0.108, 0.018];
const BULLES = [
  { tex: "bulle0", d: D_B1, apex: [0.02, 0.5, 0.04], incl: [4, 6, 3], repos: [-0.24, 0.05, 0.3], lacet: -12 },
  { tex: "bulle1", d: D_B1, apex: [-0.04, 0.5, 0.02], incl: [-3, -8, -4], repos: [0.26, 0.094, 0.06], lacet: 8 },
  { tex: "bulle2", d: D_B2, apex: [0, 0.46, -0.02], incl: [-4, 6, 2], repos: [-0.1, 0.138, -0.26], lacet: -5 },
  { tex: "bulle3", d: D_B2, apex: [0.04, 0.46, 0.02], incl: [3, -6, -3], repos: [0.06, 0.182, 0.34], lacet: 14 },
  { tex: "bulle1", d: D_R1, apex: [-0.4, 0.4, -0.2], incl: [-12, -30, 5], repos: [-0.48, 0.022, -0.06], lacet: -35 },
  { tex: "bulle2", d: D_R2, apex: [0.42, 0.44, -0.25], incl: [-14, 26, 8], repos: [0.42, 0.022, -0.4], lacet: 50 },
  { tex: "bulle0", d: D_R1, apex: [0.08, 0.5, -0.38], incl: [-30, -6, 9], repos: [-0.36, 0.022, 0.62], lacet: 18 },
];
const TEL_B = NT.map((x) => telephone(x).c);                  // où est le téléphone quand chaque message part
const _rotA = [];
const rotApex = (k) => _rotA[k] || (_rotA[k] = v3.add(versPoint(v3.add(TEL_B[k], BULLES[k].apex), camera(NT[k] + 0.12).k.slice(0, 3)), BULLES[k].incl));
function bulle(k, t) {
  const B = BULLES[k], t0 = NT[k], u = tFige(t);
  if (u < t0 - 0.017) return null;
  const sortie = E.outBack(prog(u, t0 - 0.017, 0.15), 1.4), chute = k < 4 ? E.inQuad(prog(u, t0 + 0.62, 0.2)) : E.inQuad(prog(u, t0 + 0.42, 0.2));
  let c = v3.mix(v3.add(TEL_B[k], [0, 0.03, 0]), v3.add(TEL_B[k], B.apex), sortie); c[1] += 0.025 * Math.sin((u - t0) * 5);
  c = v3.mix(c, v3.add(telephone(t).c, B.repos), chute); c[1] += rebond(u, t0 + 0.82, 0.02, 30, 14);
  const e = 0.12 + 0.88 * Math.min(1, sortie);
  return { c, d: [B.d[0] * e, B.d[1] * e, B.d[2]], rot: v3.mix(rotApex(k), [-90, B.lacet, 0], chute), tex: B.tex, gain: 0.35 + 1.2 * choc(u, t0, 0.14) };
}
const boiteBulle = (b) => ({ ...VERRE, c: b.c, d: b.d, rot: b.rot, rayon: 0.05, ...face(b.tex), ecran: 1.05, teinte: [0.1, 0.1, 0.11], trancheGain: b.gain });
function probleme(S, t) {
  S.boites.push(page(t));
  const tel = boiteTel(S, t);
  if (t < P_.aspire) for (let k = 0; k < 7; k++) { const b = bulle(k, t); if (b) S.boites.push(boiteBulle(b)); }
  lumiereCle(S, [0, 0, 0.6], t);
  S.lumieres.push({ p: v3.add(tel.c, [0, 0.5, 0.25]), couleur: [0.8, 0.88, 1], intensite: (0.3 + 0.5 * tel.vib) * (1 - prog(t, P_.aspire, 0.3)), rayon: 2.4 });   // la lueur de l'écran
}

// ================================================================ 3 · LE MANDAT
// Sur le dernier temps du problème, les messages s'envolent et se rassemblent en un point : une carte rouge y naît,
// grandit et devient le mandat de dépôt-vente, debout face à nous. Ses services se cochent, puis il se signe.
const MD = { c: [0, 0.8, -0.15], d: [0.42, 0.587, 0.012] };
function rassemble(S, t) {                                    // les messages s'envolent vers le mandat
  if (t < P_.aspire || t > M_.naissance + 0.02) return;
  for (let k = 0; k < 7; k++) {
    const dep = bulle(k, P_.aspire - 1e-4); if (!dep) continue;
    const f = E.inOutCubic(prog(t, P_.aspire + 0.02 * k, M_.naissance - P_.aspire - 0.12)), c = v3.mix(dep.c, MD.c, f), rot = v3.mix(dep.rot, [0, 0, 0], f);
    c[1] += (0.3 + 0.1 * (k % 3)) * Math.sin(Math.PI * f); c[2] += 0.35 * Math.sin(Math.PI * f); rot[2] += 120 * Math.sin(Math.PI * f) * (k % 2 ? 1 : -1);
    const e = 1 - 0.85 * f;
    S.boites.push({ ...VERRE, c, d: [dep.d[0] * e, dep.d[1] * e, dep.d[2]], rot, rayon: 0.05 * e, ...face(dep.tex), ecran: 1.05, teinte: [0.1, 0.1, 0.11], tranche: v3.mix([1, 1, 1], ORANGE, f), trancheGain: 0.35 + 1.4 * f });
  }
}
// La plaque du mandat (fiche au dos) : sa taille, sa rotation, sa place, du mandat jusqu'à la case du planning.
function plaqueMandat(t) {
  const nait = E.outBack(prog(t, M_.naissance - 0.03, 0.45), 1.6), e = 0.1 + 0.9 * nait;
  let ry = cle([[M_.naissance, -40], [M_.naissance + 0.5, 0, E.outCubic], [F_.retourne, 0], [F_.retourne + 0.5, 180, E.inOutCubic]], t);
  ry += 2.5 * Math.sin(t * 1.3) * prog(t, M_.naissance + 0.4, 0.5) * (1 - prog(t, E_.vol, 0.1));
  const rz = -14 * (1 - E.outCubic(prog(t, M_.naissance, 0.5))), rx = 1.5 * Math.sin(t * 0.9);
  const c = v3.add(MD.c, [0, 0.012 * Math.sin(t * 1.6), 0]);
  return { c, d: [MD.d[0] * e, MD.d[1] * e, MD.d[2]], rot: [rx, ry, rz] };
}
function mandat(S, t) {
  if (t < M_.naissance - 0.03 || t >= E_.vol) return;
  const p = plaqueMandat(t), g = choc(t, M_.naissance, 0.3) + 0.6 * choc(t, M_.signeFin, 0.25) + 0.5 * choc(t, F_.retourne + 0.5, 0.25);
  S.boites.push({ ...VERRE, ...p, rayon: 0.05, ...face("mandat"), ...dos("fiche"), ecran: 1.12, tranche: ORANGE, trancheGain: 0.45 + 1.6 * g });
  S.lumieres.push({ p: v3.add(p.c, [0.3, 0.2, 0.8]), couleur: ORANGE, intensite: 0.25 + 1.2 * g, rayon: 2.6 });
}

// ================================================================ 5 · LE PLANNING DES ESSAIS
const PL = { c: [0, 0.97, -1.05], d: [1.5, 0.93, 0.02], rot: [-4, 0, 0] };
const GR = TEX.planning.grille, UN = PL.d[0] / (GR.L / 2);
const D_CASE = [(GR.l / 2) * UN, (GR.h / 2) * UN, 0.012], R_CASE = 22 * UN;
const cellule = (j, r, dz = D_CASE[2]) => surFace(PL, (GR.x0 + j * GR.px + GR.l / 2) / GR.L, (GR.y0 + r * GR.py + GR.h / 2) / GR.H, dz);
const ESS = DONNEES.ESSAIS, HEROS = cellule(...ESS[0]);
const montee = (t) => (t >= E_.dresse ? rebond(t, E_.dresse, 0.025, 30, 12) : -1.95 * (1 - E.inQuad(prog(t, E_.dresse - 0.24, 0.24))));
function plaque(S, t) {
  if (t < E_.dresse - 0.24) return;
  S.boites.push({ ...VERRE, c: v3.add(PL.c, [0, montee(t), 0]), d: PL.d, rot: PL.rot, rayon: 0.05, ...face("planning"), ecran: 1.2, trancheGain: 0.45 + 1.5 * choc(t, E_.dresse, 0.2) });
}
// La fiche s'envole, rapetisse, fait un demi-tour et se pose : c'est la case du jeudi 18:30.
function volFiche(S, t) {
  if (t < E_.vol || t >= E_.pose + 0.35) return;
  const a = plaqueMandat(E_.vol - 1e-4), f = E.inOutCubic(prog(t, E_.vol, E_.pose - E_.vol)), tuile = f >= 0.5;
  const c = v3.mix(a.c, HEROS, f); c[2] += 0.5 * Math.sin(Math.PI * f); c[1] += 0.2 * Math.sin(Math.PI * f);
  const rot = [lerp(a.rot[0], PL.rot[0], f), lerp(a.rot[1], 360, f), 0], e = 1 + 0.12 * ecrase(t, E_.pose, 0.18);
  S.boites.push({ ...VERRE, c, d: [lerp(a.d[0], D_CASE[0], f) * e, lerp(a.d[1], D_CASE[1], f) * e, lerp(a.d[2], D_CASE[2], f)], rot, rayon: lerp(0.05, R_CASE, f),
    ...(tuile ? face("essai" + ESS[0][1]) : face("mandat")), ...(tuile ? {} : dos("fiche")), ecran: 1.15, tranche: ORANGE, trancheGain: 0.5 + 1.8 * choc(t, E_.pose, 0.2) });
  if (t >= E_.pose - 0.05) S.lumieres.push({ p: v3.add(HEROS, [0, 0.08, 0.55]), couleur: ORANGE, intensite: 0.4 + 1.2 * choc(t, E_.pose, 0.25), rayon: 2.6 });
}
// les essais suivants, en volume le temps de s'inscrire : ils arrivent de face et claquent sur la plaque
function essais(S, t) {
  ESS.forEach(([j, r], i) => {
    const tk = E_.essais[i]; if (i === 0 || t < tk - 0.07 || t > tk + 0.3) return;
    const f = E.inQuad(prog(t, tk - 0.07, 0.07)), e = 1 + 0.1 * ecrase(t, tk, 0.16);
    S.boites.push({ ...VERRE, c: cellule(j, r, D_CASE[2] + 0.55 * (1 - f)), d: [D_CASE[0] * e, D_CASE[1] * e, D_CASE[2]], rot: [PL.rot[0], 0, 12 * (1 - f)], rayon: R_CASE, ...face("essai" + r), ecran: 1.15, tranche: ORANGE, trancheGain: 0.5 + 1.8 * choc(t, tk, 0.16) });
  });
}
const inscrits = (t) => ESS.map((_, i) => (i === 0 ? t >= E_.pose + 0.3 : t >= E_.essais[i]) ? 1 : 0);
const nInscrits = (t) => inscrits(t).reduce((a, b) => a + b, 0);

// ================================================================ 6 · LE DOSSIER DE VENTE, LE TAMPON
const DS = { c: [0.22, 0.7, -0.3], d: [0.44, 0.6, 0.012], rot: [-24, -10, 0] };
function plaqueDossier(t) {
  const f = E.inOutCubic(prog(t, D_.sortie, 0.6)), e = 0.25 + 0.75 * f;
  const c = v3.mix(v3.add(HEROS, [0, 0, -0.02]), DS.c, f); c[2] += 0.25 * Math.sin(Math.PI * f);
  const rot = v3.mix(PL.rot, DS.rot, f); rot[1] += 0.8 * Math.sin(t * 1.1) * f;
  return { c, d: [DS.d[0] * e, DS.d[1] * e, DS.d[2]], rot };
}
function dossier(S, t) {
  if (t < D_.sortie) return;
  const p = plaqueDossier(t), g = choc(t, D_.tampon, 0.3) + 0.5 * D_.coches.reduce((s, x) => s + choc(t, x, 0.2), 0);
  S.boites.push({ ...VERRE, ...p, rayon: 0.05, ...face("dossier"), ecran: 1.12, tranche: ORANGE, trancheGain: 0.4 + 1.2 * g });
}
// Le tampon arrive par le côté, s'arme, et s'abat dans le cadre en pointillés du dossier.
const D_TAMPON = [0.2, 0.05, 0.02];
const tamponPose = (t) => { const p = plaqueDossier(t); return v3.add(surFace({ ...p, d: DS.d }, 0.5, 1213 / 1500, 0), tourner(p.rot, [0, 0, DS.d[2] + D_TAMPON[2]])); };
function tamponDossier(t) {                                    // le tampon, de son arrivée à son envol (repère du dossier)
  const base = plaqueDossier(t);
  let z = 0, x = 0;
  if (t < D_.tampon) {
    z = (0.18 + 0.06 * E.inOutCubic(prog(t, D_.tampon - 0.3, 0.26))) * (1 - E.inQuad(prog(t, D_.tampon - 0.045, 0.045)));
    x = 1.2 * (1 - E.inQuad(prog(t, D_.tampon - 0.32, 0.18))) + oscille(t, D_.tampon - 0.14, 0.025, 42, 9);
  }
  const k = clamp(z / 0.18);
  return { c: v3.add(tamponPose(t), tourner(base.rot, [x, 0.02 * k, z])), rot: [base.rot[0] - 22 * k, base.rot[1] + 14 * k, -9 * k] };
}

// ================================================================ 7, 8 · LE LOGO, L'ÉCRAN DE FIN
// La caméra de fin est fixe (une très lente avancée) ; la signature est posée devant elle, à DN unités : devant(x, y)
// place un point de l'image (en px) dans le monde.
const CAMF = { pos: [0, 1.62, 4.55], cible: [0, 1.0, -0.6] }, FOV_FIN = 40;
function repereCam(cam) {
  const f = v3.sub(cam.cible, cam.pos), l = v3.lon(f), F = v3.mul(f, 1 / l);
  const r = [-F[2], 0, F[0]], lr = Math.hypot(r[0], r[2]), R = [r[0] / lr, 0, r[2] / lr], Uv = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  return { F, R, U: Uv };
}
const REP = repereCam(CAMF), DN = 2.6, UPX = (DN * Math.tan((FOV_FIN / 2) * RAD)) / (H / 2);
const devant = (x, y) => v3.add(v3.add(CAMF.pos, v3.mul(REP.F, DN)), v3.add(v3.mul(REP.R, (x - W / 2) * UPX), v3.mul(REP.U, (H / 2 - y) * UPX)));
const ROT_CAM = [Math.asin(REP.F[1]) / RAD, Math.atan2(-REP.F[0], -REP.F[2]) / RAD, 0];
const Y_LOGO = 650, Y_BOUTON = 905, Y_CONTACT = 1075, Y_SITE = 1205;
const LW = 440 * UPX, LH = (LW * 400) / 1360;                 // la plaque du logo : 880 px de large
function tampon(S, t) {
  if (t < D_.tampon - 0.34) return;
  const co = choc(t, D_.tampon, 0.25) + choc(t, V_.logo, 0.3);
  if (t < V_.envol) { const p = tamponDossier(t); S.boites.push({ ...VERRE, c: p.c, d: D_TAMPON, rot: p.rot, rayon: D_TAMPON[1], ...face("tampon"), ecran: 1.0, teinte: [0.5, 0.5, 0.5], trancheGain: 0.4 + 2 * co }); return; }
  const dep = tamponDossier(V_.envol - 1e-4), f = cle([[V_.envol, 0], [V_.envol + 0.35, 0.35, E.outCubic], [V_.logo, 1, E.inCubic]], t), m = E.inOutCubic(f);
  const c = v3.mix(dep.c, devant(W / 2, Y_LOGO), f), rot = v3.mix(dep.rot, ROT_CAM, f); rot[2] += 360 * m;
  const e = 1 + 0.16 * ecrase(t, V_.logo, 0.22);
  if (t < V_.logo) S.boites.push({ ...VERRE, c, d: [lerp(D_TAMPON[0], 0.75 * LW, m) * e, lerp(D_TAMPON[1], 0.75 * LW * 0.25, m) * e, D_TAMPON[2]], rot, rayon: lerp(D_TAMPON[1], 0.75 * LW * 0.25, m), ...face("tampon"), ecran: 1.0, teinte: [0.5, 0.5, 0.5], tranche: ORANGE, trancheGain: 0.6 + 2 * co });
  else {                                                     // le tampon s'ouvre en plaque : le logo apparaît
    const k = E.outBack(prog(t, V_.logo, 0.32), 1.5), b = 1 + 0.012 * Math.sin((t - V_.logo) * 2.4) * prog(t, V_.logo + 0.4, 0.5);
    S.boites.push({ ...VERRE, c: devant(W / 2, Y_LOGO), d: [lerp(0.75 * LW, LW, k) * e * b, lerp(0.75 * LW * 0.25, LH, k) * e * b, 0.02], rot: ROT_CAM, rayon: lerp(0.75 * LW * 0.25, 0.18 * LH, clamp(k)), ...face("logo"), ecran: 1.15, teinte: [0.06, 0.06, 0.07], tranche: ORANGE, trancheGain: 0.5 + 2 * co });
  }
  S.lumieres.push({ p: v3.add(c, v3.mul(REP.F, -0.7)), couleur: ORANGE, intensite: 0.4 + 1.3 * co, rayon: 3 });
}
// L'écran de fin : chaque plaque arrive d'un léger rebond, le bouton respire.
function plaqueFin(S, t, t0, y, l, h, tex, o = {}) {
  if (t < t0) return;
  const k = E.outBack(prog(t, t0, 0.3), 1.8), e = 0.6 + 0.4 * k, d = 1 + (o.respire ? 0.025 * Math.sin((t - t0 - 0.6) * 4.2) * prog(t, t0 + 0.6, 0.4) : 0);
  const c = v3.add(devant(W / 2, y), v3.mul(REP.U, 0.05 * (1 - E.outCubic(prog(t, t0, 0.3)))));
  S.boites.push({ ...(o.decal ? DECAL : VERRE), c, d: [l * UPX * e * d, h * UPX * e * d, 0.012], rot: ROT_CAM, rayon: o.decal ? 0 : Math.min(l, h) * UPX * e * d, ...face(tex), ecran: 1.15, ...(o.decal ? { opacite: clamp(prog(t, t0, 0.25)) } : { tranche: ORANGE, trancheGain: 0.45 + 1.4 * choc(t, t0, 0.2) }) });
}
function ecranFin(S, t) {
  plaqueFin(S, t, V_.bouton, Y_BOUTON, 330, 68.3, "bouton", { respire: true });
  plaqueFin(S, t, V_.contact, Y_CONTACT, 380, 81.4, "contact");
  plaqueFin(S, t, V_.site, Y_SITE, 380, 54.3, "site", { decal: true });
}

// ================================================================ le monde à un instant
function monde(S, t) {
  if (t < M_.naissance + 0.02) probleme(S, t); else { S.boites.push(page(t)); boiteTel(S, t); }
  rassemble(S, t); mandat(S, t);
  plaque(S, t); volFiche(S, t); essais(S, t);
  dossier(S, t); tampon(S, t); ecranFin(S, t);
  if (t >= M_.naissance) lumiereCle(S, t < E_.vol ? MD.c : t < D_.sortie ? PL.c : DS.c, t, 1.1);
  // le sol marque les grands moments d'un anneau de lumière
  const anneau = (t0, c, couleur, r0 = 0.25, v = 4.5) => { const d = t - t0; if (d > 0 && d < 0.5) S.sol.anneau = { c: [c[0], c[2]], r: r0 + v * d, largeur: 0.08, gain: 1.6 * (1 - E.inQuad(d / 0.5)), couleur }; };
  anneau(M_.naissance, MD.c, ORANGE); anneau(E_.dresse, PL.c, [0.75, 0.85, 1], 0.4, 5); anneau(D_.tampon, DS.c, ORANGE); anneau(V_.logo, [0, 0, 1.6], ORANGE, 0.3, 6);
  S.sol.pulsation = Math.max(S.sol.pulsation, 0.8 * choc(t, M_.naissance, 0.3) + 0.7 * choc(t, E_.dresse, 0.3) + 0.9 * choc(t, D_.tampon, 0.25) + 0.9 * choc(t, V_.logo, 0.25));
  if (t >= E_.pose) S.lumieres.push({ p: [0, 1.0, 0.4], couleur: ORANGE, intensite: 0.25 + (0.6 * nInscrits(t)) / ESS.length, rayon: 5 });
}

// ================================================================ LES PLANS : [instant de la coupe, la caméra]
// Une caméra = { k: [x, y, z, cible x, y, z, roulis], fov, ouverture, mise }. Elle bouge à chaque plan.
const PLANS = [];
const plan = (a, cam) => PLANS.push({ a, cam });
const ECRAN = v3.add(TEL0, [0, 0.03, 0]);
const apex = (k, dy = 0) => v3.add(v3.add(TEL_B[k], BULLES[k].apex), [0, dy, 0]);
const ligne = (v) => { const p = plaqueMandat(F_.plan + 0.6); return surFace({ ...p, d: MD.d, rot: [0, 180, 0] }, 0.5, v, 0); };   // un rang de la fiche (au dos)
const cam = (k, o = {}) => ({ k, fov: o.fov ?? 40, ouverture: o.ouverture ?? 0.008, mise: o.mise });

// 1 · la nuit : la caméra descend lentement vers le téléphone qui s'allume
plan(0, (t) => cam(cle([[0, orbite(v3.add(ECRAN, [0, 0.3, 0]), 2.3, 16, 52, -3)], [P_.coupes[0], orbite(v3.add(ECRAN, [0, 0.36, 0]), 1.95, 6, 44, -1), E.inOutQuart]], t), { fov: 44, ouverture: 0.01 }));
// 2 · « Les appels à toute heure, les visites annulées… » : trois axes, sur le rythme de la voix
plan(P_.coupes[0] - AV, (t) => cam(orbite(apex(2, 0.04), lerp(1.62, 1.46, E.outCubic(prog(t, P_.coupes[0], 0.65))), -22, 12, -3), { fov: 42, ouverture: 0.012 }));
plan(P_.coupes[1] - AV, (t) => cam(orbite(rature(0), lerp(0.9, 0.78, E.outCubic(prog(t, P_.coupes[1], 1))), -30, 48, -5), { fov: 42, ouverture: 0.01 }));
plan(P_.coupes[2] - AV, (t) => cam(cle([[P_.coupes[2], orbite([-0.2, 0.3, 0.38], 2.5, 22, 44, 3)], [P_.fige, orbite([-0.2, 0.32, 0.38], 2.3, 12, 40, 1), E.outCubic],
  // 3 · la caméra se relève et suit les messages jusqu'au mandat, puis glisse le long de lui
  [M_.naissance + 0.05, orbite(v3.add(MD.c, [0, 0.13, 0]), 3.45, -18, 8, 2), E.inOutCubic], [F_.retourne, orbite(v3.add(MD.c, [0, 0.12, 0]), 3.3, 10, 6, -1), lin],
  // 4 · le mandat se retourne : la fiche entière, puis un rang après l'autre, au rythme de la voix
  [F_.plan + 0.2, orbite(v3.add(MD.c, [0, 0.1, 0]), 3.1, 12, 5, -1), E.inOutQuad], [F_.estime, orbite(ligne(0.33), 1.85, 8, 4, 0), E.inOutCubic], [F_.photo - 0.1, orbite(ligne(0.33), 1.7, -4, 3, 0), lin],
  [F_.photo + 0.05, orbite(ligne(0.58), 1.8, -8, 2, 0), E.inOutCubic], [F_.annonce - 0.1, orbite(ligne(0.58), 1.68, 4, 3, 0), lin], [F_.annonce + 0.05, orbite(ligne(0.83), 1.8, 8, 4, 0), E.inOutCubic], [E_.vol, orbite(ligne(0.83), 1.7, -2, 4, 0), lin],
  // 5 · la fiche s'envole vers le planning : la caméra la suit, puis glisse le long de la semaine
  [E_.pose + 0.1, orbite(v3.add(HEROS, [0, 0.12, 0]), 2.0, 12, 5, 1), E.inOutCubic], [E_.pose + 0.55, orbite(v3.add(HEROS, [0, 0.1, 0]), 1.95, 6, 5, 0), lin],
  [D_.sortie, orbite(v3.add(cellule(2, 3), [0.3, 0.12, 0]), 3.5, -14, 7, -1), E.inOutQuad],
  // 6 · le dossier sort du planning : la caméra plonge sur lui, puis recule
  [D_.sortie + 0.65, orbite(v3.add(DS.c, [0, 0.2, 0]), 3.25, -14, 42, -2), E.inOutCubic], [D_.coches[2] + 0.3, orbite(v3.add(DS.c, [0, 0.2, 0]), 3.05, -6, 36, -1), lin], [V_.plan, orbite(v3.add(DS.c, [0, 0.26, 0]), 3.4, -2, 28, 0), E.inOutQuad],
  // 7 · le tampon s'envole : la caméra recule jusqu'à l'écran de fin
  [V_.logo - 0.05, [...CAMF.pos, ...CAMF.cible, 0], E.inOutCubic], [DUREE_FILM, [...v3.mix(CAMF.pos, CAMF.cible, 0.025), ...CAMF.cible, 0], E.outQuad]], t),
  { fov: t < V_.plan ? 40 : FOV_FIN, ouverture: t < V_.envol ? 0.008 : lerp(0.008, 0.014, prog(t, V_.envol, 0.8)), mise: t < V_.envol ? undefined : lerp(v3.lon(v3.sub(DS.c, CAMF.pos)), DN, prog(t, V_.envol, 0.8)) }));

// ================================================================ la scène
const planDe = (t) => { let i = 0; for (let k = 0; k < PLANS.length; k++) if (t >= PLANS[k].a - 1e-6) i = k; return i; };
function camera(t) { return PLANS[planDe(t)].cam(t); }
let T_IMAGE = 0;
function scene(tt) {
  const pl = planDe(T_IMAGE), t = clamp(tt, PLANS[pl].a, (PLANS[pl + 1]?.a ?? DUREE_FILM) - 1e-4);
  const S = { boites: [], spheres: [], lumieres: [], sol: { reflet: 0.62, rugosite: 0.1, pulsation: 0 } };
  monde(S, t);
  const C_ = PLANS[pl].cam(t);
  let pos = C_.k.slice(0, 3), cible = C_.k.slice(3, 6), roulis = C_.k[6] || 0;
  { let z = 0, s = 0, pu = 0;                               // sur chaque action marquée : une poussée et une secousse douces
    for (const [tk, f] of K.frappes) { const d = t - tk; if (d < 0 || d > 0.5) continue; z += 0.025 * f * Math.exp(-d / 0.11); s += f * Math.sin(d * 55) * Math.exp(-d / 0.08); pu += 0.4 * f * choc(t, tk, 0.16); }
    const dist = v3.lon(v3.sub(cible, pos));
    if (t >= M_.naissance && pu > 0.03) S.lumieres.unshift({ p: v3.add(pos, [0, 0.4, 0]), couleur: ORANGE, intensite: 1.2 * pu, rayon: dist * 2.2 });
    pos = v3.mix(pos, cible, z); roulis += 0.22 * s; pos = v3.add(pos, [0, 0.0025 * s * dist, 0]); S.sol.pulsation = Math.max(S.sol.pulsation, pu); }
  return { cam: { pos, cible, roulis, fov: C_.fov, ouverture: C_.ouverture, ...(C_.mise ? { mise: C_.mise } : {}) }, boites: S.boites, spheres: S.spheres, lumieres: S.lumieres.slice(0, 4), sol: S.sol, ambiance: ambiance(t) };
}

// ---------------------------------------------------------------- les textures
function texturesFixes() {
  composer(0, [{ nom: "bulle0" }, { nom: "essai0" }, { nom: "bulle1" }, { nom: "essai1" }, { nom: "bulle2" }, { nom: "essai2" }, { nom: "bulle3" }, { nom: "essai3" },
    { nom: "essai4" }, { nom: "tampon" }, { nom: "essai5" }, { nom: "logo" }, { nom: "essai6" }, { nom: "bouton" }, { nom: "contact" }, { nom: "site" }]);
}
function textures(t) {
  const u = tFige(t), dernier = NT.reduce((x, tb) => (u >= tb ? tb : x), -9);
  composer(1, [
    { nom: "agenda", p: { r: P_.ratures.map((x) => arr(prog(t, x - 0.05, 0.07), 2)) } },
    { nom: "verrou", p: { recus: NT.filter((x) => u >= x).length, flash: arr(impulsion(u, dernier, 0.2), 2), eteint: arr(prog(t, P_.aspire + 0.05, 0.25), 2) } },
  ]);
  composer(2, [{ nom: "planning", p: { essais: inscrits(t) } }]);
  const fl = F_.flashs.reduce((s, x) => s + impulsion(t, x, 0.09) * prog(t, x, 0.02), 0);
  composer(3, [
    { nom: "mandat", p: { items: arr(M_.items.reduce((s, x) => s + E.outCubic(prog(t, x, 0.3)), 0), 2), signe: arr(E.inOutQuad(prog(t, M_.signe, M_.signeFin - M_.signe)), 2) } },
    { nom: "fiche", p: { e1: arr(E.outCubic(prog(t, F_.estime, 0.75)), 2), flash: arr(clamp(fl), 2), e2: arr(F_.flashs.filter((x) => t >= x + 0.08).length / 3, 2), e3: arr(prog(t, F_.annonce + 0.1, 0.1), 2),
      c: [arr(prog(t, F_.estime + 0.7, 0.3), 2), arr(prog(t, F_.flashs[2] + 0.25, 0.3), 2), arr(prog(t, F_.annonce + 0.45, 0.3), 2)], pouls: t > F_.annonce + 0.1 ? arr(0.5 + 0.5 * Math.sin((t - F_.annonce) * 9), 1) : 0 } },
    { nom: "dossier", p: { coches: arr(D_.coches.reduce((s, x) => s + E.outCubic(prog(t, x, 0.3)), 0), 2) } },
  ]);
}

// ---------------------------------------------------------------- les textes à l'écran (calque 2D, pleine définition)
// Six mots au plus par plan, en haut de l'image : sous les onglets de TikTok (y > 250 px), au-dessus du sujet. Chaque
// mot sort d'un masque ; la phrase s'efface juste avant la suivante. rouge : les lignes en rouge MKZ.
const TITRES = [
  { de: 0.3, a: P_.coupes[0] - 0.02, lignes: [["Vendre", "sa", "voiture"], ["seul", "?"]], rouge: [1] },
  { de: P_.coupes[0], a: P_.aspire, lignes: [["Appels,", "relances,"], ["annulations…"]], rouge: [1] },
  { de: M_.naissance, a: F_.plan - 0.02, lignes: [["Confiez-la", "à"], ["MKZ", "Motors."]], rouge: [1] },
  { de: F_.plan, a: E_.vol, lignes: [["Estimation,"], ["photos,", "annonce."]], rouge: [0], mots: [F_.estime - 0.1, F_.photo - 0.1, F_.annonce - 0.1] },
  { de: E_.vol + 0.2, a: D_.sortie - 0.02, lignes: [["On", "organise"], ["les", "essais."]], rouge: [1] },
  { de: D_.sortie + 0.2, a: V_.plan - 0.02, lignes: [["Démarches"], ["comprises."]], rouge: [1] },
  { de: V_.plan + 0.1, a: V_.fin, lignes: [["Dépôt-vente :"], ["on", "s’occupe", "de", "tout."]], rouge: [0] },
];
function titres(x, t) {
  x.clearRect(0, 0, W, H);
  const T = TITRES.find((q) => t >= q.de && t < q.a); if (!T) return;
  const sortie = 1 - prog(t, T.a - 0.12, 0.12), interligne = 1.13, y0 = 380, MAX = 900;
  const o0 = { taille: 104, graisse: 700, serre: -0.035 }, taille = T.lignes.reduce((tl, mots) => { while (largeur(x, mots.join(" "), { ...o0, taille: tl }) > MAX && tl > 60) tl -= 2; return tl; }, o0.taille), o = { ...o0, taille };
  { const g = x.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, "rgba(8,8,10,0.86)"); g.addColorStop(0.68, "rgba(8,8,10,0.62)"); g.addColorStop(1, "rgba(8,8,10,0)");   // un voile sombre derrière le texte
    x.save(); x.globalAlpha = sortie * (T.de < 0.5 ? prog(t, T.de, 0.2) : 1); x.fillStyle = g; x.fillRect(0, 0, W, 720); x.restore(); }
  x.save(); x.globalAlpha = sortie; x.shadowColor = "rgba(0,0,0,0.6)"; x.shadowBlur = 30;
  let n = 0;
  T.lignes.forEach((mots, l) => {
    const esp = largeur(x, " ", o), ls = mots.map((m) => largeur(x, m, o));
    let px = (W - (ls.reduce((a, b) => a + b, 0) + esp * (mots.length - 1))) / 2; const y = y0 + l * taille * interligne;
    mots.forEach((m, i) => {
      const t0 = T.mots ? T.mots[n] ?? T.de : T.de + 0.06 + 0.07 * n; n++;
      const raw = prog(t, t0, 0.4), p = E.outExpo(raw);
      if (raw > 0) {
        x.save(); x.beginPath(); x.rect(px - 30, y - taille * 1.05, ls[i] + 60, taille * 1.4); x.clip();
        texte(x, m, px, y + (1 - p) * taille * 1.25, { ...o, couleur: T.rouge.includes(l) ? C.accent : C.texte }); x.restore();
      }
      px += ls[i] + esp;
    });
  });
  x.restore();
}

const ECH = window.ECHANTILLONS || 4, OBT = window.OBTURATEUR || 1 / 120;   // passes par image (sous-images du flou de mouvement) ; obturateur 180° à 60 i/s
let CALQUE = null;
window.__seek = (t) => { t = clamp(t, 0, DUREE_FILM - 1e-4); T_IMAGE = t; textures(t); M.image(t, scene, { echantillons: ECH, obturateur: OBT }); M.attendre(); titres(CALQUE, t); };
window.__ready = false;
POLICES_PRETES.then(() => {
  const plateau = document.getElementById("plateau");
  const DEF = window.DEFINITION || 1;
  const cv = document.createElement("canvas"); cv.width = Math.round(W * DEF); cv.height = Math.round(H * DEF); cv.style.width = W + "px"; cv.style.height = H + "px"; plateau.appendChild(cv);
  const cq = document.createElement("canvas"); cq.width = W; cq.height = H; plateau.appendChild(cq); CALQUE = cq.getContext("2d");
  M = Moteur.creer(cv, { largeur: cv.width, hauteur: cv.height, couches: 4, texL: TL, texH: TH });
  texturesFixes(); textures(0);
  window.__seek(0);
  window.__ready = true;
});
