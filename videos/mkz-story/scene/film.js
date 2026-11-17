// MKZ Motors : le film de lancement du dépôt-vente (vendre sa voiture d'occasion sans s'en occuper), version Story
// verticale 1080 × 1920 : les plans du film 16:9 recadrés (cadrage()), une fin recomposée en hauteur, et des titres
// courts posés sur la musique, lisibles sans le son (titres()).
// Un film sans voix, monté comme un « edit » : ce sont les ACTIONS qui tombent sur les temps de la musique (120
// battements par minute), et la coupe les précède de deux images. Le fil : une case du planning des essais. Elle naît
// des messages des acheteurs (« Toujours disponible ? », « Dernier prix ? », « Je ne viens plus… ») qui assaillent le
// vendeur, reçoit la réservation de l'essai, le rappel et la vente, se multiplie pour remplir la semaine de ventes,
// puis devient le logo MKZ. Tout est gris et froid pendant le problème ; le rouge MKZ naît sur une seule case au
// basculement, puis gagne le planning. (Les noms ORANGE, Créneau… viennent du kit d'origine : ce sont des noms de code.)
// Tout est fonction du temps ; les instants viennent du conducteur K (cues.js), les données de CRENEAU (tex-lancement.js).

const { T: TEMPS, D: DEMI, AV } = K;
const P_ = K.p, B_ = K.b, R_ = K.r, N_ = K.n, E_ = K.e, S_ = K.s, V_ = K.v;
const VERRE = { biseau: 0.008, dos: -1, verre: 1, teinte: [0.04, 0.04, 0.05], reflet: 0.6, tranche: [1, 1, 1], trancheGain: 0.2 };
const DECAL = { rayon: 0, biseau: 0.0005, verre: 0, reflet: 0, trancheGain: 0, ecran: 1, dos: -1 };
const AMB = { fond: [0.051, 0.051, 0.059], brume: 0.3, halo: 1, studio: 1, poussieres: 0.4, vignette: 0.35, grain: 0.02, bloom: 0.8, exposition: 1 };
const coupe = (x) => x - AV;                                 // la coupe précède l'action de deux images
const tombee = (t, t0, h, duree = 0.3) => h * (1 - E.inQuad(prog(t, t0 - duree, duree)));          // chute libre qui touche à t0
const rebond = (t, t0, a = 0.05, f = 18, am = 8) => (t > t0 ? a * Math.abs(Math.sin((t - t0) * f)) * Math.exp(-(t - t0) * am) : 0);
const oscille = (t, t0, a, f = 30, am = 9) => (t > t0 ? a * Math.sin((t - t0) * f) * Math.exp(-(t - t0) * am) : 0);
// La lumière : froide pendant le problème, chaude dès que la première case s'allume.
const FROID = [0.7, 0.83, 1], CHAUD = [1, 0.95, 0.88];
const chaleur = (t) => E.inOutCubic(prog(t, B_.allume - 0.02, 0.3));
const ambiance = (t) => ({ ...AMB, fond: v3.mix([0.034, 0.045, 0.068], AMB.fond, chaleur(t)) });
const lumiereCle = (S, c, t, k = 1) => S.lumieres.push({ p: [c[0] + 1.2, 3.0, c[2] + 3.0], couleur: v3.mix(FROID, CHAUD, chaleur(t)), intensite: 0.5 * k, rayon: 8 });

// ================================================================ le planning de MKZ Motors : une plaque de verre, face à nous
const PL = { c: [0, 0.97, 0], d: [1.5, 0.93, 0.02], rot: [-4, 0, 0] };
const GR = TEX.planning.grille, UN = PL.d[0] / (GR.L / 2);   // unités du monde par pixel du dessin
const D_CASE = [(GR.l / 2) * UN, (GR.h / 2) * UN, 0.012], R_CASE = 22 * UN;
const cellule = (j, r, dz = D_CASE[2]) => surFace(PL, (GR.x0 + j * GR.px + GR.l / 2) / GR.L, (GR.y0 + r * GR.py + GR.h / 2) / GR.H, dz);
const surPlaque = (j, r, p) => v3.add(cellule(j, r, 0), tourner(PL.rot, p));   // un point repéré depuis le centre d'une case
const HEROS = cellule(3, 5);
// le planning sort du sol et claque en place sur le temps
const montee = (t) => (t >= B_.dresse ? rebond(t, B_.dresse, 0.025, 30, 12) : -1.95 * (1 - E.inQuad(prog(t, B_.dresse - 0.24, 0.24))));
function plaque(S, t) {
  if (t < B_.dresse - 0.24) return;
  S.boites.push({ ...VERRE, c: v3.add(PL.c, [0, montee(t), 0]), d: PL.d, rot: PL.rot, rayon: 0.05, ...face("planning"), ecran: 1.2, trancheGain: 0.45 + 1.5 * choc(t, B_.dresse, 0.2) });
}
// La case du film, en volume : elle s'allume, se remplit, reçoit « Réservé », « Confirmé », puis le tampon.
const COUPS_CASE = [B_.allume, R_.remplit, R_.inscrit, N_.confirme, E_.frappe];
function caseHeros(S, t) {
  if (t < B_.allume) return;
  const e = 1 + COUPS_CASE.reduce((s, x) => s + 0.09 * ecrase(t, x, 0.18), 0), g = COUPS_CASE.reduce((s, x) => s + choc(t, x, 0.22), 0);
  S.boites.push({ ...VERRE, c: cellule(3, 5, D_CASE[2] + 0.05 * (1 - E.outCubic(prog(t, B_.allume, 0.25)))), d: [D_CASE[0] * e, D_CASE[1] * e, D_CASE[2]], rot: PL.rot, rayon: R_CASE, ...face("caseHeros"), ecran: 1.15, tranche: ORANGE, trancheGain: 0.5 + 1.8 * g });
  S.lumieres.push({ p: v3.add(HEROS, [0, 0.08, 0.55]), couleur: ORANGE, intensite: 0.55 + 1.0 * g, rayon: 2.8 });
}
function etatHeros(t) {
  if (t >= V_.trait - AV) return { etat: 6, contenu: arr(1 - prog(t, V_.trait, 0.4), 2) };
  if (t >= E_.frappe) return { etat: 5 };
  if (t >= N_.confirme) return { etat: 4, coche: 1, inscrit: arr(prog(t, N_.confirme, 0.14), 2) };
  if (t >= R_.inscrit) return { etat: 3, inscrit: arr(prog(t, R_.inscrit, 0.14), 2) };
  return { etat: 1, rempli: arr(E.outCubic(prog(t, R_.remplit - 0.03, 0.13)), 3) };
}
// Les paiements : la case du film sur le coup du tampon, puis un jour par temps, les trois cases du samedi une par une.
const FILL = [];
{ let i = 0; CRENEAU.PRISES.forEach((rs, j) => { let k = 0; rs.forEach((r) => { FILL[i++] = j === 3 && r === 5 ? E_.frappe : j === 5 ? S_.samedi[k++] : S_.jours[j] + (k++ * TEMPS) / 8; }); }); }
const payees = (t) => FILL.map((x) => (t >= x - 1e-6 ? 1 : 0));
const nSeances = (t) => (t < E_.bloque ? 0 : FILL.filter((x) => t >= x - 1e-6).length);
const dernierPaiement = (t) => { let x = -9; for (const f of FILL) if (t >= f && f > x) x = f; return x; };
// les cases d'un jour, en volume le temps du plan : elles arrivent de face et claquent sur la plaque
function casesDuJour(S, t, j) {
  CRENEAU.SEANCES.forEach((s, i) => {
    if (s.j !== j || s.heros || t < FILL[i] - 0.07) return;
    const tk = FILL[i], f = E.inQuad(prog(t, tk - 0.07, 0.07)), e = 1 + 0.1 * ecrase(t, tk, 0.16);
    S.boites.push({ ...VERRE, c: cellule(s.j, s.r, D_CASE[2] + 0.55 * (1 - f)), d: [D_CASE[0] * e, D_CASE[1] * e, D_CASE[2]], rot: [PL.rot[0], 0, 12 * (1 - f)], rayon: R_CASE, ...face("payee" + s.r), ecran: 1.15, tranche: ORANGE, trancheGain: 0.5 + 1.8 * choc(t, tk, 0.16) });
  });
}
// Le compteur, dans le coin du planning : il arrive, se bloque sur une vente, monte avec la semaine, se bloque sur 23.
const CO = surFace(PL, 0.85, 0.109, 0.02), D_CO = [0.39, 0.1695, 0.02];
const compteurBloque = (t) => (t >= E_.bloque && t < S_.jours[0] - AV) || t >= S_.bloque;
function compteur(S, t) {
  if (t < E_.total - AV) return;
  const e = 0.4 + 0.6 * E.outBack(prog(t, E_.total - AV, 0.2), 2), g = choc(t, E_.bloque, 0.25) + choc(t, S_.bloque, 0.3), tic = t >= S_.jours[0] ? 0.6 * choc(t, dernierPaiement(t), 0.06) : 0;
  S.boites.push({ ...VERRE, c: v3.add(CO, tourner(PL.rot, [0, 0, 0.05 * oscille(t, E_.bloque, 1, 40, 10) + 0.05 * oscille(t, S_.bloque, 1, 40, 10)])), d: [D_CO[0] * e * (1 + 0.03 * tic), D_CO[1] * e * (1 + 0.03 * tic), D_CO[2]], rot: PL.rot, rayon: 0.03, ...face("compteur"), ecran: 1.12, tranche: compteurBloque(t) ? ORANGE : [1, 1, 1], trancheGain: 0.35 + 1.7 * g + tic });
  if (g > 0.02) S.lumieres.push({ p: v3.add(CO, [0, 0, 0.6]), couleur: ORANGE, intensite: 1.3 * g, rayon: 2.6 });
}

// ================================================================ 1 · LE PROBLÈME (mesures 1 et 2)
// Le téléphone du vendeur vibre et glisse sur le sol, à côté de son carnet de visites. Sur le dernier temps, tout se fige.
const AG = { c: [-0.72, 0.006, 1.22], d: [0.62, 0.4384, 0.004], rot: [-90, 10, 0] };
const D_TEL = [0.16, 0.331, 0.012], TEL0 = [0.24, 0.014, 1.3], TELFIN = [1.3, 0.014, 0.95], LACET_FIN = 24;
const T_B = [...P_.bulles, ...P_.rafale];                    // les sept messages
const tFige = (t) => (t <= P_.fige ? t : P_.fige + (Math.min(t, B_.aspire) - P_.fige) * 0.06);
function telLea(t) {
  if (t >= B_.aspire) { const a = telLea(B_.aspire - 1e-4), f = E.outCubic(prog(t, B_.aspire, 0.5)); return { c: v3.mix(a.c, TELFIN, f), lacet: lerp(a.lacet, LACET_FIN, f), vib: 0 }; }
  const u = tFige(t); let v = 0.4;
  for (const tb of T_B) if (u >= tb - 0.02) v = Math.max(v, Math.exp(-(u - tb) / 0.3));
  return { c: [TEL0[0] + 0.3 * u + 0.005 * v * Math.sin(u * 230), TEL0[1], TEL0[2] + 0.004 * v * Math.sin(u * 190 + 1)], lacet: 8 + 2 * u + 1.6 * v * Math.sin(u * 250 + 2), vib: v };
}
function boiteTel(S, t) {
  const tel = telLea(t);
  S.boites.push({ ...VERRE, c: tel.c, d: D_TEL, rot: [-90, tel.lacet, 0], rayon: 0.04, biseau: 0.004, ...face("verrou"), ecran: 1.15, trancheGain: 0.35 });
  return tel;
}
const page = (t) => ({ ...DECAL, c: AG.c, d: AG.d, rot: [-90, AG.rot[1] + 0.8 * (oscille(t, P_.ratures[0], 1, 60, 14) + oscille(t, P_.ratures[1], 1, 60, 14)), 0], ...face("agenda"), ecran: 0.5 });
// Les messages : des blocs de verre qui jaillissent de l'écran, tiennent un instant face à nous, puis retombent sur le téléphone.
//   apex : où le bloc se tient (depuis le téléphone), rotA : face à la caméra de son plan ; repos : où il retombe.
const D_B2 = [0.36, 0.162, 0.022], D_B1 = [0.36, 0.123, 0.022], D_BN = [0.27, 0.102, 0.02];
const BULLES = [
  { tex: "bulle0", d: D_B2, apex: [-0.05, 0.47, 0.06], rotA: [-8, 22, 3], repos: [-0.2, 0.05, 0.3], lacet: -12 },
  { tex: "bulle1", d: D_B1, apex: [0.06, 0.52, 0], rotA: [-12, -26, -4], repos: [0.2, 0.094, 0.04], lacet: 8 },
  { tex: "bulle2", d: D_B2, apex: [0, 0.42, -0.02], rotA: [-40, 4, 2], repos: [-0.1, 0.138, -0.26], lacet: -5 },
  { tex: "bulleN", d: D_BN, apex: [0.05, 0.36, 0.05], rotA: [-4, 68, -3], repos: [0.46, 0.022, 0.3], lacet: 32 },
  { tex: "bulleN", d: D_BN, apex: [-0.42, 0.42, -0.2], rotA: [-18, -40, 5], repos: [-0.48, 0.022, -0.06], lacet: -35 },
  { tex: "bulleN", d: D_BN, apex: [0.48, 0.46, -0.25], rotA: [-20, 30, 8], repos: [0.38, 0.022, -0.46], lacet: 50 },
  { tex: "bulleN", d: D_BN, apex: [0.1, 0.5, -0.35], rotA: [-62, -8, 9], repos: [-0.36, 0.022, 0.52], lacet: 18 },
];
const TEL_B = T_B.map((x) => telLea(x).c);                   // où est le téléphone quand chaque message part
function bulle(k, t) {
  const B = BULLES[k], t0 = T_B[k], u = tFige(t);
  if (u < t0 - 0.017) return null;
  const sortie = E.outBack(prog(u, t0 - 0.017, 0.15), 1.4), chute = E.inQuad(prog(u, t0 + 0.46, 0.2));
  let c = v3.mix(v3.add(TEL_B[k], [0, 0.03, 0]), v3.add(TEL_B[k], B.apex), sortie); c[1] += 0.025 * Math.sin((u - t0) * 5);
  c = v3.mix(c, v3.add(telLea(t).c, B.repos), chute); c[1] += rebond(u, t0 + 0.66, 0.02, 30, 14);
  const e = 0.12 + 0.88 * Math.min(1, sortie);
  return { c, d: [B.d[0] * e, B.d[1] * e, B.d[2]], rot: v3.mix(B.rotA, [-90, B.lacet, 0], chute), tex: B.tex, gain: 0.35 + 1.2 * choc(u, t0, 0.14) };
}
const boiteBulle = (b) => ({ ...VERRE, c: b.c, d: b.d, rot: b.rot, rayon: 0.05, ...face(b.tex), ecran: 1.05, teinte: [0.1, 0.1, 0.11], trancheGain: b.gain });
function probleme(S, t) {
  S.boites.push(page(t));
  const tel = boiteTel(S, t);
  for (let k = 0; k < 7; k++) { const b = bulle(k, t); if (b) S.boites.push(boiteBulle(b)); }
  lumiereCle(S, [0, 0, 1.2], t);
  S.lumieres.push({ p: v3.add(tel.c, [0, 0.5, 0.25]), couleur: [0.8, 0.88, 1], intensite: 0.3 + 0.5 * tel.vib, rayon: 2.4 });   // la lueur de l'écran
}

// ================================================================ 2 · LE BASCULEMENT (mesure 3)
// Les messages et la page sont aspirés, s'aplatissent et se rangent en cases ; le planning sort du sol derrière eux.
const CIBLES = [[0, 1], [1, 4], [2, 2], [4, 0], [4, 3], [5, 1], [2, 5], [3, 3]];
function aspire(S, t) {
  if (t > B_.dresse + 0.04) return;
  for (let k = 0; k < 8; k++) {
    const dep = k < 7 ? bulle(k, B_.aspire) : { c: AG.c, d: AG.d, rot: AG.rot, tex: "agenda" };
    const f = E.inOutCubic(prog(t, B_.aspire + 0.012 * k, 0.4)), tuile = f >= 0.5, c = v3.mix(dep.c, cellule(CIBLES[k][0], CIBLES[k][1]), f), rot = v3.mix(dep.rot, PL.rot, f);
    c[1] += (0.35 + 0.12 * (k % 3)) * Math.sin(Math.PI * f); c[2] += 0.5 * Math.sin(Math.PI * f); rot[2] += 150 * Math.sin(Math.PI * f) * (k % 2 ? 1 : -1);
    S.boites.push({ ...(tuile || k < 7 ? VERRE : DECAL), c, d: v3.mix(dep.d, D_CASE, f), rot, rayon: lerp(k < 7 ? 0.05 : 0.008, R_CASE, f), ...face(tuile ? "tuile" : dep.tex), ecran: k < 7 || tuile ? 1.05 : 0.5, teinte: [0.1, 0.1, 0.11], trancheGain: 0.35 + 0.9 * f });
  }
}
function bascule(S, t) {
  boiteTel(S, t); aspire(S, t); plaque(S, t); lumiereCle(S, [0, 0, 0.6], t);
  const d = t - B_.aspire;
  if (d > 0 && d < 0.45) S.sol.anneau = { c: [0, 0.3], r: 0.3 + 3.4 * (1 - d / 0.45), largeur: 0.08, gain: 1.3 * Math.sin((Math.PI * d) / 0.45), couleur: [0.75, 0.85, 1] };
  S.sol.pulsation = 0.9 * choc(t, B_.dresse, 0.3);
}

// ================================================================ 3, 4 · RÉSERVER, RAPPELER (mesures 4 et 5)
// Le téléphone du client : il tombe sur le sol, à gauche du planning. La page de réservation, puis le rappel.
const CL = { c: [-1.9, 0.014, 1.5], lacet: -12 }, D_CL = [0.2, 0.414, 0.014];
const boiteClient = (t) => ({ c: [CL.c[0], CL.c[1] + tombee(t, R_.page, 0.5, 0.14) + rebond(t, R_.page, 0.02, 30, 12) - 0.006 * ecrase(t, R_.appui, 0.14), CL.c[2]], d: D_CL, rot: [-90 + 16 * (1 - E.outCubic(prog(t, R_.page - 0.14, 0.14))), CL.lacet, 0] });
const BOUTON = surFace({ c: CL.c, d: D_CL, rot: [-90, CL.lacet, 0] }, ...TEX.reservation.bouton, 0);
const D_NOTIF = [0.3, 0.0943, 0.008], NOTIF_POSEE = v3.add(CL.c, [0.012, D_CL[2] + D_NOTIF[2] + 0.002, -0.06]);
function notif(S, t) {                                       // elle part de la case, file jusqu'au téléphone du client, s'y pose
  if (t < N_.part) return;
  const f = prog(t, N_.part, N_.pose - N_.part), c = v3.mix(v3.add(HEROS, [0, 0, 0.05]), NOTIF_POSEE, f), e = 0.25 + 0.75 * E.outCubic(clamp(f * 2.5));
  c[1] += 0.55 * 4 * f * (1 - f) + rebond(t, N_.pose, 0.012, 34, 16);
  S.boites.push({ ...VERRE, c, d: [D_NOTIF[0] * e, D_NOTIF[1] * e, D_NOTIF[2]], rot: [lerp(PL.rot[0], -90, E.inQuad(f)), lerp(0, CL.lacet, f), 20 * Math.sin(Math.PI * f)], rayon: 0.02, ...face("notif"), ecran: 1.1, teinte: [0.1, 0.1, 0.11], tranche: ORANGE, trancheGain: 0.4 + 1.5 * choc(t, N_.part, 0.2) + 1.5 * choc(t, N_.pose, 0.2) });
}
function client(S, t) {
  if (t < R_.page - 0.14) return;
  S.boites.push({ ...VERRE, ...boiteClient(t), rayon: 0.05, biseau: 0.004, ...face("reservation"), ecran: 1.12, trancheGain: 0.35 });
  notif(S, t);
}
// La coche : elle quitte le téléphone du client et revient sur la case.
const R_COCHE = (100 / 1216) * 2 * D_CASE[0], COCHE_CASE = surPlaque(3, 5, [(1066 / 1216 - 0.5) * 2 * D_CASE[0], (0.5 - 316 / 448) * 2 * D_CASE[1], 2 * D_CASE[2] + 0.008]);
function jeton(t) {
  const f = prog(t, N_.coche, N_.confirme - N_.coche), c = v3.mix(v3.add(NOTIF_POSEE, [0.2, 0.02, 0]), COCHE_CASE, f);
  c[1] += 0.5 * 4 * f * (1 - f);
  return { c, f };
}
function jetonCoche(S, t) {
  if (t < N_.coche - 0.02 || t >= N_.confirme) return;
  const { c, f } = jeton(t), r = R_COCHE * (0.3 + 0.7 * E.outBack(prog(t, N_.coche - 0.02, 0.12), 2)) * lerp(2.4, 1, E.inCubic(f));
  S.boites.push({ ...VERRE, c, d: [r, r, 0.008], rot: [lerp(-90, PL.rot[0], f), lerp(CL.lacet + 720, 0, f), 0], rayon: r, ...face("coche"), ...dos("coche"), ecran: 1.1, teinte: [0.5, 0.5, 0.5], trancheGain: 0.5 + 1.5 * choc(t, N_.coche, 0.2) });
}

// ================================================================ 5 · ENCAISSER (mesure 6)
// Le tampon arrive par le côté, s'arme, s'abat sur la case : « Payé · 19 € ».
const D_TAMPON = [0.17, 0.0425, 0.02], TAMPON_POSE = surPlaque(3, 5, [0.035, -0.04, 2 * D_CASE[2] + D_TAMPON[2]]);
function tampon(S, t) {
  if (t < E_.tampon - 0.14) return;
  let z = 0, x = 0, g = 0.4;
  if (t < E_.frappe) {
    z = (0.16 + 0.05 * E.inOutCubic(prog(t, E_.frappe - 0.3, 0.26))) * (1 - E.inQuad(prog(t, E_.frappe - 0.04, 0.04)));
    x = 1.1 * (1 - E.inQuad(prog(t, E_.tampon - 0.14, 0.14))) + oscille(t, E_.tampon, 0.025, 42, 9);
  } else g = 0.4 + 2 * choc(t, E_.frappe, 0.25);
  const k = clamp(z / 0.16);
  S.boites.push({ ...VERRE, c: v3.add(TAMPON_POSE, tourner(PL.rot, [x, 0.02 * k, z])), d: D_TAMPON, rot: [PL.rot[0] - 22 * k, 14 * k, -9 * k], rayon: D_TAMPON[1], ...face("tampon"), ecran: 1.0, teinte: [0.5, 0.5, 0.5], trancheGain: g });
}

// ================================================================ MKZ Motors, d'un plan à l'autre
// o : { jours: [les jours dont les cases sont en volume dans ce plan], cle: où porte la lumière }
function creneau(S, t, o = {}) {
  plaque(S, t);
  if (t < S_.jours[0] - AV) { caseHeros(S, t); tampon(S, t); }
  compteur(S, t); jetonCoche(S, t);
  (o.jours || []).forEach((j) => casesDuJour(S, t, j));
  boiteTel(S, t); if (!o.sansClient) client(S, t);
  if (o.loin) S.lumieres.push({ p: [1.5, 9, 12], couleur: CHAUD, intensite: 0.7, rayon: 26 }); else lumiereCle(S, o.cle || [0, 0, 0], t);
  if (t >= S_.jours[0] - AV) S.lumieres.push({ p: [0, 1.0, 1.7], couleur: ORANGE, intensite: 0.3 + (0.9 * nSeances(t)) / 23, rayon: 5.5 });
}

// ================================================================ 7 · LA SIGNATURE (mesures 9 et 10)
// La caméra recule, d'abord lentement, puis d'un trait. La case du jeudi quitte le planning, vient au centre et devient
// le logo sur le dernier coup : elle se change en une plaque qui porte le vrai logo de MKZ Motors ; le bouton arrive.
const K_FIN = orbite([0, 1.8, 0], 5.6, 0, 4);
const camFin = (t) => cle([[coupe(S_.tenue), orbite([0, 0.95, 0], 3.12, 0, 3)], [V_.recul, orbite([0, 0.95, 0], 3.06, 0, 3), lin], [V_.trait, orbite([0, 1.02, 0], 3.6, 0, 3), E.inQuad],
  [V_.trait + 0.5, orbite([0, 1.8, 0], 5.52, 0, 4), E.inOutCubic], [20, orbite([0, 1.8, 0], 5.66, 0, 4), E.outQuad]], t);
function repereCam(cam) {
  const f = v3.sub(cam.cible, cam.pos), l = v3.lon(f), F = v3.mul(f, 1 / l);
  const r = [-F[2], 0, F[0]], lr = Math.hypot(r[0], r[2]), R = [r[0] / lr, 0, r[2] / lr], Uv = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  return { F, R, U: Uv };
}
// La signature est posée devant la caméra de fin, à DN unités : devant(x, y) place un point de l'image (en px) dans le monde.
// En vertical, la caméra est recadrée par cadrage() (plus loin, champ plus large) : la signature est posée devant elle.
const PORTRAIT = H > W, KD = 1.46, KF = 1.3;                 // recul et élargissement du champ des plans du film 16:9
// kd : recul supplémentaire d'un plan (les messages, pour qu'ils se lisent en entier) ; la caméra monte aussi d'un
// huitième de sa distance, pour que le sujet descende sous les titres.
function cadrage(k, fov, kd = 1, monte = 0.12) {             // une clé de caméra du film 16:9 → la même, recadrée en vertical
  if (!PORTRAIT) return { k, fov };
  const cible = k.slice(3, 6), d = v3.lon(v3.sub(k.slice(0, 3), cible)) * KD * kd, dy = [0, monte * d, 0];
  const pos = v3.add(cible, v3.mul(v3.sub(k.slice(0, 3), cible), KD * kd));
  return { k: [...v3.add(pos, dy), ...v3.add(cible, dy), ...k.slice(6)], fov: (2 * Math.atan(Math.tan((fov * RAD) / 2) * KF)) / RAD };
}
const KD_FIN = 1.35, FIN = cadrage(K_FIN, 38, KD_FIN, 0), FOV_FIN = FIN.fov;
const CAMF = { pos: FIN.k.slice(0, 3), cible: FIN.k.slice(3, 6) }, REP = repereCam(CAMF), DN = 3.0, UPX = (DN * Math.tan((FOV_FIN / 2) * RAD)) / (H / 2);
const devant = (x, y) => v3.add(v3.add(CAMF.pos, v3.mul(REP.F, DN)), v3.add(v3.mul(REP.R, (x - W / 2) * UPX), v3.mul(REP.U, (H / 2 - y) * UPX)));
const ROT_CAM = [Math.asin(REP.F[1]) / RAD, Math.atan2(-REP.F[0], -REP.F[2]) / RAD, 0];
const Y_LOGO = PORTRAIT ? 520 : 200, Y_BOUTON = PORTRAIT ? 790 : 432, COTE = (PORTRAIT ? 100 : 85) * UPX, LW = (PORTRAIT ? 440 : 440) * UPX, LH = (LW * 400) / 1360;   // la plaque du logo : 880 px de large
function signature(S, t) {
  if (t < V_.trait) return;
  const f = cle([[V_.trait, 0], [V_.trait + 0.5, 0.4, E.outCubic], [V_.dernier, 1, E.inCubic]], t), g = E.inOutCubic(prog(t, V_.nom, 0.3)), m = E.inOutCubic(f);
  const c = v3.mix(HEROS, devant(W / 2, Y_LOGO), f), rot = v3.mix(PL.rot, ROT_CAM, f); rot[2] += 360 * m;
  const e = 1 + 0.16 * ecrase(t, V_.dernier, 0.22), co = choc(t, V_.dernier, 0.3);
  if (t < V_.dernier) S.boites.push({ ...VERRE, c, d: [lerp(D_CASE[0], COTE, m) * e, lerp(D_CASE[1], COTE, m) * e, lerp(D_CASE[2], 0.02, m)], rot, rayon: lerp(R_CASE, 0.4 * COTE, m), ...face("caseHeros"), ...dos("caseHeros"), ecran: 1.15, tranche: ORANGE, trancheGain: 0.6 + 2 * co });
  else {                                                     // le dernier coup : le carré rouge s'ouvre en plaque, le logo apparaît
    const k = E.outBack(prog(t, V_.dernier, 0.32), 1.5);
    S.boites.push({ ...VERRE, c, d: [lerp(COTE, LW, k) * e, lerp(COTE, LH, k) * e, 0.02], rot: ROT_CAM, rayon: lerp(0.4 * COTE, 0.18 * LH, clamp(k)), ...face("logo"), ecran: 1.15, teinte: [0.06, 0.06, 0.07], tranche: ORANGE, trancheGain: 0.5 + 2 * co });
  }
  S.lumieres.push({ p: v3.add(c, v3.mul(REP.F, -0.7)), couleur: ORANGE, intensite: 0.4 + 1.3 * co, rayon: 3 });
  if (t >= V_.bouton) { const b = 0.5 + 0.5 * E.outBack(prog(t, V_.bouton, 0.24), 2); S.boites.push({ ...VERRE, c: devant(W / 2, Y_BOUTON), d: [330 * UPX * b, 68.3 * UPX * b, 0.012], rot: ROT_CAM, rayon: 68.3 * UPX * b, ...face("bouton"), ecran: 1.15, tranche: ORANGE, trancheGain: 0.5 + 1.4 * choc(t, V_.bouton, 0.2) }); }
}
function finale(S, t) {
  const k = camFin(t), z = 0.02 * choc(t, S_.tenue, 0.1) + 0.03 * choc(t, V_.dernier, 0.12);
  creneau(S, t, { loin: true }); signature(S, t);
  S.cam = [...v3.mix(k.slice(0, 3), k.slice(3, 6), z), ...k.slice(3, 6), 0]; S.fov = 38; S.ouverture = 0; S.sansCoups = true; S.kd = KD_FIN; S.monte = 0;   // en vertical : la même caméra que celle de la signature
  S.sol.pulsation = 0.8 * choc(t, S_.tenue, 0.25) + 0.7 * choc(t, V_.recul, 0.25) + 0.9 * choc(t, V_.dernier, 0.25);
}

// ================================================================ LES PLANS : [instant de la coupe, ce qu'on voit]
const PLANS = [];
const plan = (a, f) => PLANS.push({ a, f });
const vise = (S, k, o = {}) => { S.cam = k; if (o.fov) S.fov = o.fov; if (o.ouverture !== undefined) S.ouverture = o.ouverture; if (o.mise) S.mise = o.mise; };
const entre = (t, a, b, ka, kb, e = E.outCubic) => cle([[a, ka], [b, kb, e]], t);
const pousse = (t, t0, a, b) => lerp(a, b, prog(t, t0, 0.5));          // une lente avancée pendant le plan
const apex = (k, dy = 0) => v3.add(v3.add(TEL_B[k], BULLES[k].apex), [0, dy, 0]);
const rature = (n) => surFace(AG, ...TEX.agenda.entree(n), 0);

// ---- 1 · le problème
plan(0, (t, S) => { probleme(S, t); vise(S, entre(t, 0, coupe(P_.bulles[0]), orbite([-0.47, 0, 1.2], 1.98, 5, 54, -4), orbite([-0.47, 0, 1.2], 1.84, 7, 56, -2), lin)); });
plan(coupe(P_.bulles[0]), (t, S) => { probleme(S, t); S.kd = 1.1; vise(S, orbite(apex(0, -0.13), pousse(t, P_.bulles[0], 1.12, 1.04), 22, 8, 3)); });
plan(coupe(P_.ratures[0]), (t, S) => { probleme(S, t); vise(S, orbite(rature(0), pousse(t, P_.ratures[0], 0.66, 0.6), -28, 44, -5)); });
plan(coupe(P_.bulles[1]), (t, S) => { probleme(S, t); S.kd = 1.15; vise(S, orbite(apex(1, -0.08), pousse(t, P_.bulles[1], 1.0, 0.94), -26, 12, -4)); });
plan(coupe(P_.bulles[2]), (t, S) => { probleme(S, t); S.kd = 1.5; vise(S, orbite(apex(2, -0.06), pousse(t, P_.bulles[2], 0.86, 0.8), 4, 40, 2)); });
plan(coupe(P_.ratures[1]), (t, S) => { probleme(S, t); vise(S, orbite(rature(1), 0.46, 32, 32, 6)); });
plan(coupe(P_.rafale[0]), (t, S) => { probleme(S, t); vise(S, orbite(v3.add(TEL_B[3], [0.02, 0.2, 0]), 0.82, 68, 4, -3)); });
plan(coupe(P_.rafale[1]), (t, S) => { probleme(S, t); vise(S, orbite(apex(4, -0.1), 1.35, -40, 18, 5)); });
plan(coupe(P_.rafale[2]), (t, S) => { probleme(S, t); vise(S, orbite(apex(5, -0.05), 0.8, 64, 6, -12)); });
plan(coupe(P_.rafale[3]), (t, S) => { probleme(S, t); vise(S, orbite(apex(6, -0.02), 0.5, -8, 62, 9)); });
plan(coupe(P_.fige), (t, S) => { probleme(S, t); vise(S, entre(t, coupe(P_.fige), B_.aspire, orbite([1.37, 0.2, 1.3], 1.95, 0, 48, 0), orbite([1.37, 0.2, 1.3], 1.9, 0, 48, 0), lin)); });

// ---- 2 · le basculement
plan(coupe(B_.aspire), (t, S) => { bascule(S, t); vise(S, entre(t, coupe(B_.aspire), B_.dresse, orbite([0.1, 0.72, 0.3], 4.7, -12, 5, 2), orbite([0.1, 0.8, 0.3], 4.35, -10, 5, 1)), { fov: 44 }); });
plan(coupe(B_.dresse), (t, S) => { bascule(S, t); vise(S, orbite([0.1, 0.97, 0], pousse(t, B_.dresse, 3.95, 3.8), 36, 3, -3), { fov: 42 }); });
plan(coupe(B_.allume), (t, S) => { creneau(S, t); vise(S, orbite(v3.add(HEROS, [0, 0.05, 0]), pousse(t, B_.allume, 1.12, 1.02), 30, 8, 3)); });
plan(coupe(B_.tenu), (t, S) => { creneau(S, t); vise(S, orbite([0, 0.95, 0], pousse(t, B_.tenu, 3.55, 3.42), 0, 3, 0)); });

// ---- 3 · réserver
plan(coupe(R_.page), (t, S) => { creneau(S, t, { cle: CL.c }); vise(S, cle([[coupe(R_.page), orbite(CL.c, 2.5, CL.lacet, 34, -5)], [R_.page + 0.28, orbite(CL.c, 1.46, CL.lacet, 70, 0), E.outCubic], [R_.appui, orbite(CL.c, 1.4, CL.lacet, 71, 0), lin]], t)); });
plan(coupe(R_.appui), (t, S) => { creneau(S, t, { cle: CL.c }); vise(S, orbite(BOUTON, pousse(t, R_.appui, 0.56, 0.5), -46, 34, -6)); });
plan(coupe(R_.remplit), (t, S) => { creneau(S, t); vise(S, orbite(v3.add(HEROS, [-0.15, 0.2, 0]), pousse(t, R_.remplit, 1.6, 1.48), -42, -6, -4)); });
plan(coupe(R_.inscrit), (t, S) => { creneau(S, t); vise(S, orbite(v3.add(HEROS, [0.01, 0, 0]), pousse(t, R_.inscrit, 0.66, 0.6), 8, 2, 1)); });

// ---- 4 · rappeler : la caméra passe de l'autre côté
plan(coupe(N_.part), (t, S) => { creneau(S, t, { cle: [-1, 0, 0.8] }); vise(S, [-3.0, 0.9, 3.1, -0.8, 0.48, 0.6, -3], { fov: 50 }); });
plan(coupe(N_.pose), (t, S) => { creneau(S, t, { cle: CL.c }); vise(S, orbite(v3.add(CL.c, [0.01, 0.03, -0.05]), pousse(t, N_.pose, 0.9, 0.84), CL.lacet, 74, 5)); });
plan(coupe(N_.coche), (t, S) => { creneau(S, t, { cle: [-1, 0, 0.8] }); const p = jeton(Math.max(t, N_.coche)).c; vise(S, [p[0] - 0.42, p[1] + 0.16, p[2] + 0.85, p[0] + 0.3, p[1] - 0.02, p[2] - 0.35, -4], { fov: 44 }); });
plan(coupe(N_.confirme), (t, S) => { creneau(S, t); vise(S, orbite(HEROS, pousse(t, N_.confirme, 0.92, 0.86), 26, 3, 3)); });

// ---- 5 · encaisser
plan(coupe(E_.tampon), (t, S) => { creneau(S, t); vise(S, orbite(v3.add(HEROS, [0, 0, 0.1]), 0.62, -40, 12, -5)); });
plan(coupe(E_.frappe), (t, S) => { creneau(S, t); const d = t - E_.frappe; if (d > 0 && d < 0.5) S.sol.anneau = { c: [HEROS[0], 0.1], r: 0.2 + 5 * d, largeur: 0.08, gain: 1.7 * (1 - E.inQuad(d / 0.5)), couleur: ORANGE }; vise(S, orbite(v3.add(HEROS, [0.02, -0.015, 0]), pousse(t, E_.frappe, 0.62, 0.56), 6, -6, 5)); });
plan(coupe(E_.total), (t, S) => { creneau(S, t); vise(S, orbite(v3.add(CO, [-0.3, -0.16, 0]), pousse(t, E_.total, 1.38, 1.28), -30, -10, -4), { fov: 42 }); });
plan(coupe(E_.bloque), (t, S) => { creneau(S, t); S.kd = 1.35; vise(S, orbite(CO, pousse(t, E_.bloque, 0.88, 0.82), 12, 4, 2)); });

// ---- 6 · la semaine pleine : un plan par demi-temps, chaque jour sous un axe différent
const X = (j) => cellule(j, 3)[0];
plan(coupe(S_.jours[0]), (t, S) => { creneau(S, t, { jours: [0] }); vise(S, orbite([X(0) + 0.3, 0.86, 0], 1.6, -38, -4, -4), { fov: 42 }); });
plan(coupe(S_.jours[0] + DEMI), (t, S) => { creneau(S, t, { jours: [0] }); vise(S, orbite(cellule(0, 3), 0.52, 12, 4, 3)); });
plan(coupe(S_.jours[1]), (t, S) => { creneau(S, t, { jours: [1] }); vise(S, orbite([X(1), 0.85, 0.05], 1.7, 8, 58, 5)); });
plan(coupe(S_.jours[1] + DEMI), (t, S) => { creneau(S, t); S.kd = 1.35; vise(S, orbite(CO, 0.92, -16, -8, -2)); });
plan(coupe(S_.jours[2]), (t, S) => { creneau(S, t, { jours: [2] }); vise(S, orbite([X(2), 0.85, 0], 1.9, 60, 4, 3), { fov: 42 }); });
plan(coupe(S_.jours[2] + DEMI), (t, S) => { creneau(S, t, { jours: [2] }); vise(S, orbite([0, 0.92, 0], 3.6, -10, 2, -1)); });
plan(coupe(S_.jours[3]), (t, S) => { creneau(S, t, { jours: [3] }); vise(S, orbite([X(3), 0.62, 0], 1.3, 26, -9, 7)); });
plan(coupe(S_.jours[3] + DEMI), (t, S) => { creneau(S, t); S.kd = 1.4; vise(S, orbite(CO, 0.78, 24, 5, 3)); });
plan(coupe(S_.jours[4]), (t, S) => { creneau(S, t, { jours: [4] }); vise(S, orbite([X(4), 0.85, 0], 1.55, -22, 24, -5)); });
plan(coupe(S_.jours[4] + DEMI), (t, S) => { creneau(S, t, { cle: TELFIN }); vise(S, orbite(v3.add(TELFIN, [0, 0.03, 0]), 1.0, 38, 12, 2)); });   // le téléphone du début, éteint
plan(coupe(S_.samedi[0]), (t, S) => { creneau(S, t, { jours: [5] }); vise(S, orbite([X(5), 1.15, 0], 1.25, 36, -4, 4)); });
plan(coupe(S_.samedi[1]), (t, S) => { creneau(S, t, { jours: [5] }); vise(S, orbite(cellule(5, 1), 0.62, -26, 6, -3)); });
plan(coupe(S_.samedi[2]), (t, S) => { creneau(S, t, { jours: [5] }); vise(S, orbite([1.1, 1.34, 0], pousse(t, S_.bloque, 1.66, 1.6), 8, 2, 0)); });

// ---- la semaine entière, tenue ; puis la signature
plan(coupe(S_.tenue), (t, S) => finale(S, t));

// ================================================================ la scène
const planDe = (t) => { let i = 0; for (let k = 0; k < PLANS.length; k++) if (t >= PLANS[k].a - 1e-6) i = k; return i; };
let T_IMAGE = 0;
function scene(tt) {
  const pl = planDe(T_IMAGE), t = clamp(tt, PLANS[pl].a, (PLANS[pl + 1]?.a ?? 20) - 1e-4);
  const S = { boites: [], spheres: [], lumieres: [], sol: { reflet: 0.62, rugosite: 0.1, pulsation: 0 }, cam: null, fov: 38, ouverture: 0.006, mise: undefined };
  PLANS[pl].f(t, S);
  { const r = cadrage(S.cam, S.fov, S.kd, S.monte); S.cam = r.k; S.fov = r.fov; }
  let pos = S.cam.slice(0, 3), cible = S.cam.slice(3, 6), roulis = S.cam[6] || 0;
  if (!S.sansCoups) {                                         // sur chaque coup de grosse caisse : une poussée et une secousse
    let z = 0, s = 0, pu = 0;
    for (const [tk, f] of K.frappes) { const d = t - tk; if (d < 0 || d > 0.5) continue; z += 0.035 * f * Math.exp(-d / 0.11); s += f * Math.sin(d * 55) * Math.exp(-d / 0.08); pu += 0.5 * f * choc(t, tk, 0.16); }   // version Story : poussée et secousse adoucies
    const dist = v3.lon(v3.sub(cible, pos));
    if (t >= B_.allume && pu > 0.03) S.lumieres.unshift({ p: v3.add(pos, [0, 0.4, 0]), couleur: ORANGE, intensite: 1.5 * pu, rayon: dist * 2.2 });   // l'éclair orange, court (jamais avant la première couleur)
    pos = v3.mix(pos, cible, z); roulis += 0.28 * s; pos = v3.add(pos, [0, 0.003 * s * dist, 0]); S.sol.pulsation = Math.max(S.sol.pulsation, pu);
  }
  return { cam: { pos, cible, roulis, fov: S.fov, ouverture: S.ouverture, ...(S.mise ? { mise: S.mise } : {}) }, boites: S.boites, spheres: S.spheres, lumieres: S.lumieres.slice(0, 4), sol: S.sol, ambiance: ambiance(t) };
}

// ---------------------------------------------------------------- les textures
function texturesFixes() {
  composer(0, [{ nom: "bulle0" }, { nom: "bulle1" }, { nom: "bulle2" }, { nom: "bulleN" }, { nom: "tuile" }, { nom: "coche" }, { nom: "notif" }, { nom: "tampon" },
    ...CRENEAU.HEURES.map((_, r) => ({ nom: "payee" + r })), { nom: "bouton" }, { nom: "logo" }]);
}
function textures(t) {
  const u = tFige(t), dernier = T_B.reduce((x, tb) => (u >= tb ? tb : x), -9), da = t - R_.appui;
  composer(1, [
    { nom: "agenda", p: { r: P_.ratures.map((x) => arr(prog(t, x - 0.05, 0.07), 2)) } },
    { nom: "verrou", p: { recus: T_B.filter((x) => u >= x).length, flash: arr(impulsion(u, dernier, 0.2), 2), eteint: arr(prog(t, B_.aspire + 0.05, 0.15), 2) } },
    { nom: "reservation", p: { contact: arr(prog(t, R_.appui - 0.12, 0.12) * (1 - prog(t, R_.appui + 0.2, 0.2)), 2), appui: arr(prog(t, R_.appui - 0.02, 0.03) * (1 - prog(t, R_.appui + 0.14, 0.2)), 2), onde: da > 0 ? arr(da / 0.45, 2) : 0, fait: t >= N_.part - AV ? 1 : 0 } },
  ]);
  composer(2, [
    { nom: "planning", p: { payees: payees(t), heros: t >= S_.jours[0] - AV && t < V_.trait ? 1 : 0 } },
    { nom: "caseHeros", p: etatHeros(t) },
    { nom: "compteur", p: { ventes: nSeances(t), bloque: compteurBloque(t) ? 1 : 0 } },
  ]);
}
const ECH = window.ECHANTILLONS || 24, OBT = window.OBTURATEUR || 1 / 120;   // obturateur : 1/120 s, soit 180° à 60 i/s   // 24 passes par image (scene/apercu.html : moins)
// ---------------------------------------------------------------- les titres de la Story (calque 2D, pleine définition)
// Des phrases courtes, posées sur les temps, pour que l'histoire se lise sans le son. Chaque mot monte d'un masque ;
// la phrase s'efface juste avant la suivante. En haut de l'image, sous la barre d'Instagram (zone sûre : y > 250 px).
const TITRES = [
  { de: 0.25, a: B_.aspire, lignes: [["Vendre", "sa", "voiture"], ["seul", "?"]], rouge: [1] },
  { de: B_.dresse, a: R_.page, lignes: [["Confiez-la", "à"], ["MKZ", "Motors."]], rouge: [1] },
  { de: R_.page, a: E_.tampon, lignes: [["On", "organise"], ["les", "essais."]], rouge: [1] },
  { de: E_.tampon, a: S_.jours[0], lignes: [["On", "la", "vend"], ["pour", "vous."]], rouge: [1] },
  { de: S_.jours[0], a: S_.tenue, lignes: [["Dépôt-vente :"], ["on", "s’occupe", "de", "tout."]], rouge: [0] },
];
function titres(x, t) {
  x.clearRect(0, 0, W, H);
  if (!PORTRAIT) return;
  const T = TITRES.find((q) => t >= q.de && t < q.a); if (!T) return;
  const sortie = 1 - prog(t, T.a - 0.12, 0.12), taille = 104, interligne = 118, y0 = 360;
  { const g = x.createLinearGradient(0, 0, 0, 700); g.addColorStop(0, "rgba(8,8,10,0.9)"); g.addColorStop(0.7, "rgba(8,8,10,0.72)"); g.addColorStop(1, "rgba(8,8,10,0)");   // un voile sombre derrière les titres
    x.save(); x.globalAlpha = sortie * Math.min(1, prog(t, T.de, 0.15) + (T.de > 0.3 ? 1 : 0)); x.fillStyle = g; x.fillRect(0, 0, W, 700); x.restore(); }
  x.save(); x.globalAlpha = sortie; x.shadowColor = "rgba(0,0,0,0.6)"; x.shadowBlur = 30;
  let n = 0;
  T.lignes.forEach((mots, l) => {
    const o = { taille, graisse: 700, serre: -0.035 }, esp = largeur(x, " ", o), ls = mots.map((m) => largeur(x, m, o));
    let px = (W - (ls.reduce((a, b) => a + b, 0) + esp * (mots.length - 1))) / 2; const y = y0 + l * interligne;
    mots.forEach((m, i) => {
      const raw = prog(t, T.de + 0.06 + 0.07 * n++, 0.4), p = E.outExpo(raw);
      if (raw > 0) {
        x.save(); x.beginPath(); x.rect(px - 30, y - taille * 1.05, ls[i] + 60, taille * 1.4); x.clip();
        texte(x, m, px, y + (1 - p) * taille * 1.25, { ...o, couleur: T.rouge.includes(l) ? C.accent : C.texte }); x.restore();
      }
      px += ls[i] + esp;
    });
  });
  x.restore();
}
let CALQUE = null;
window.__seek = (t) => { t = clamp(t, 0, 19.9999); T_IMAGE = t; textures(t); M.image(t, scene, { echantillons: ECH, obturateur: OBT }); M.attendre(); titres(CALQUE, t); };
window.__ready = false;
POLICES_PRETES.then(() => {
  const plateau = document.getElementById("plateau");
  const DEF = window.DEFINITION || 1;   // définition du rendu 3D (0,5 : moitié moins de pixels de côté, l'image est agrandie)
  const cv = document.createElement("canvas"); cv.width = Math.round(W * DEF); cv.height = Math.round(H * DEF); cv.style.width = W + "px"; cv.style.height = H + "px"; plateau.appendChild(cv);
  const cq = document.createElement("canvas"); cq.width = W; cq.height = H; plateau.appendChild(cq); CALQUE = cq.getContext("2d");   // le calque des titres
  M = Moteur.creer(cv, { largeur: cv.width, hauteur: cv.height, couches: 4, texL: TL, texH: TH });
  texturesFixes(); textures(0);
  window.__seek(0);
  window.__ready = true;
});
