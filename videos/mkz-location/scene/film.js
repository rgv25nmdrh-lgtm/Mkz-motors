// La vidéo « MKZ Motors · location » : 16 s, verticale 1080 × 1920, un seul plan sans coupe.
// Sur un bureau en noyer, en fin de journée : le téléphone (on réserve la 208 du vendredi au dimanche), le calendrier
// (les feuillets tournent, la lumière des stores défile : le week-end passe), la clé qui tombe sur le bureau (« Vos clés
// sont prêtes »), son étiquette en cuir, puis la caméra s'élève, le soir tombe, et le logo arrive.
// Les instants viennent du conducteur (cues.js) ; la musique (tools/musique.mjs) lit les mêmes.
const W = SCENE_W, H = SCENE_H;
const { K } = buildCues();
const DUREE_FILM = K.DUREE, TL = K.tel, CA_ = K.cal, CL_ = K.cle, FI = K.fin;
const mix3 = (a, b, p) => a.map((x, i) => x + (b[i] - x) * p);
const melange = (A, B, p) => Object.fromEntries(Object.keys(A).map((k) => [k, Array.isArray(A[k]) ? mix3(A[k], B[k], p) : lerp(A[k], B[k], p)]));
const rebond = (t, t0, a, f = 18, am = 9) => (t > t0 ? a * Math.abs(Math.sin((t - t0) * f)) * Math.exp(-(t - t0) * am) : 0);
const cloche = (t, tc, l) => Math.exp(-(((t - tc) / l) ** 2));

// ---------------------------------------------------------------- le bureau : où est chaque objet (1 unité ≈ 10 cm)
const TEL = { x: 0.0, z: 0.6, lacet: 0.17 };
const CAL = { x: -1.55, z: -1.15, lacet: -0.55 };
const CLE = { pos: [1.45, 0.062, 1.15], lacet: 0.5 };
const CA = 0.29;                                             // la pente du calendrier (comme dans le moteur)
// un point du calendrier (repère du calendrier : face vers +z) dans le monde
const calMonde = (l) => { const c = Math.cos(CAL.lacet), s = Math.sin(CAL.lacet); return [CAL.x + c * l[0] - s * l[2], l[1], CAL.z + s * l[0] + c * l[2]]; };
const FEUILLE = calMonde([0, 0.77, 0.27]);                   // le milieu du feuillet de devant
// la clé : repère monde à partir du lacet, du tangage, du roulis ; un point de la clé dans le monde
function axesCle(lacet, tangage = 0, roulis = 0) {
  const ry = (v) => [v[0] * Math.cos(lacet) + v[2] * Math.sin(lacet), v[1], -v[0] * Math.sin(lacet) + v[2] * Math.cos(lacet)];
  const rx = (v) => [v[0], v[1] * Math.cos(tangage) - v[2] * Math.sin(tangage), v[1] * Math.sin(tangage) + v[2] * Math.cos(tangage)];
  const rz = (v) => [v[0] * Math.cos(roulis) - v[1] * Math.sin(roulis), v[0] * Math.sin(roulis) + v[1] * Math.cos(roulis), v[2]];
  return [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => ry(rx(rz(e))));
}
const cleMonde = (l) => { const [ax, ay, az] = axesCle(CLE.lacet); return [0, 1, 2].map((i) => CLE.pos[i] + ax[i] * l[0] + ay[i] * l[1] + az[i] * l[2]); };
const TAG = cleMonde([0, -0.05, -0.92]), COQUE = CLE.pos;

// ---------------------------------------------------------------- la lumière : l'après-midi, le week-end qui passe, le soir doré, la nuit qui tombe
const APRES = { soleil: [-0.78, 0.46, 0.42], soleilC: [3.3, 2.45, 1.7], ambHaut: [0.085, 0.09, 0.105], ambBas: [0.06, 0.042, 0.03], fenetre: 1, stores: 1, exposition: 1.0 };
const DORE = { soleil: [-0.82, 0.36, 0.4], soleilC: [4.3, 2.35, 1.12], ambHaut: [0.12, 0.105, 0.11], ambBas: [0.1, 0.06, 0.036], fenetre: 0.9, stores: 1, exposition: 1.06 };
const SOIR = { soleil: [-0.9, 0.2, 0.32], soleilC: [1.5, 0.55, 0.2], ambHaut: [0.045, 0.05, 0.085], ambBas: [0.03, 0.022, 0.018], fenetre: 0.25, stores: 1, exposition: 1.3 };
const NUIT_ = { ambHaut: [0.02, 0.026, 0.05], ambBas: [0.012, 0.012, 0.016] };
const T_FEUILLETS = CA_.feuillets.map((tf) => tf + CA_.duree / 2);
function lumiere(t) {
  let L;
  if (t < CA_.debut) L = { ...APRES };
  else if (t < 6.4) {                                         // le week-end en accéléré : les bandes défilent, une nuit à chaque feuillet
    L = melange(APRES, DORE, E.inOutCubic(prog(t, 5.8, 0.6)));
    const nuit = Math.max(...T_FEUILLETS.map((tc) => cloche(t, tc, 0.13)));
    L.soleilC = L.soleilC.map((c) => c * (1 - 0.9 * nuit)); L.ambHaut = mix3(L.ambHaut, NUIT_.ambHaut, nuit); L.ambBas = mix3(L.ambBas, NUIT_.ambBas, nuit);
    L.exposition *= 1 + 0.25 * nuit; L.fenetre *= 1 - 0.8 * nuit;
  } else if (t < FI.recul) L = { ...DORE };
  else L = melange(DORE, SOIR, E.inOutCubic(prog(t, FI.recul, 3.2)));
  // les bandes de lumière glissent : lentement, sauf pendant le week-end en accéléré
  const u = E.inOutCubic(prog(t, CA_.debut - 0.1, 2.3));
  L.ombresDec = [0.004 * Math.sin(t * 0.8), 0.006 * Math.sin(t * 0.6) + 0.55 * u + 0.012 * t];
  return L;
}

// ---------------------------------------------------------------- le téléphone : son écran et sa lueur
function eclatEcran(t) {
  if (t < TL.allume) return 0;
  if (t < TL.veille) return E.outCubic(prog(t, TL.allume, 0.18));
  if (t < CL_.notif) return 1 - E.inCubic(prog(t, TL.veille, 0.22));
  return E.outCubic(prog(t, CL_.notif - 0.05, 0.15));
}
function etatEcran(t) {
  if (t >= CL_.notif - 0.1) return { page: 2, notif: Math.round(prog(t, CL_.notif + 0.05, 0.35) * 40) / 40 };
  const q = (v) => Math.round(clamp(v) * 40) / 40;
  return { page: 0, glisse: q(prog(t, TL.dates - 0.12, 0.34)),
    fiche: { entete: q(prog(t, TL.allume, 0.3)), photo: q(prog(t, TL.photo - 0.05, 0.4)), titre: q(prog(t, TL.titre - 0.1, 0.4)), prix: q(prog(t, TL.prix - 0.08, 0.4)), bouton: q(prog(t, TL.prix + 0.25, 0.35)) },
    dates: { sel: q(prog(t, TL.ven - 0.04, 0.18)) + q(prog(t, TL.dim - 0.04, 0.25)) + q(prog(t, TL.total - 0.04, 0.4)), appui: q(prog(t, TL.appui - 0.08, 0.2)), reserve: q(prog(t, TL.reserve, 0.22)) } };
}

// ---------------------------------------------------------------- le calendrier : un feuillet bascule à chaque nouveau jour
function feuillet(t) {
  let n = 0;
  for (let k = 0; k < CA_.feuillets.length; k++) {
    const p = prog(t, CA_.feuillets[k], CA_.duree);
    if (p <= 0) break;
    if (p < 1) return [CA + (2 * Math.PI - 2 * CA) * E.inOutCubic(p), k + 1, k, k];   // angle, case devant, case du feuillet, feuillets passés
    n = k + 1;
  }
  return [-1, n, 0, n];
}

// ---------------------------------------------------------------- la clé : elle tombe en tournoyant, rebondit, l'étiquette se balance
function cle(t) {
  if (t < CL_.chute) return null;
  const ti = CL_.impact, D = ti - CL_.chute; let pos, lacet, tangage, roulis, tag;
  if (t < ti) {
    const u = (ti - t) / D, g = (2 * (2.3 - CLE.pos[1])) / (D * D);
    pos = [CLE.pos[0] + 0.25 * u, CLE.pos[1] + 0.5 * g * (ti - t) ** 2, CLE.pos[2] - 0.18 * u];
    lacet = CLE.lacet - 1.3 * u; tangage = 0.9 * u * u; roulis = -0.6 * u * u; tag = 0.5 * u;
  } else {
    const d = t - ti;
    pos = [CLE.pos[0], CLE.pos[1] + rebond(t, ti, 0.05, 17, 10), CLE.pos[2]];
    lacet = CLE.lacet + 0.04 * Math.exp(-d * 6) * Math.sin(d * 12); tangage = 0.05 * Math.sin(d * 30) * Math.exp(-d * 9); roulis = 0.04 * Math.sin(d * 26 + 1) * Math.exp(-d * 9);
    tag = 0.42 * Math.sin(d * 10) * Math.exp(-d * 2.6);
  }
  const [ax, ay, az] = axesCle(lacet, tangage, roulis);
  return { pos, rep: [ax[0], ay[0], az[0], ax[1], ay[1], az[1], ax[2], ay[2], az[2]], tag };
}

// ---------------------------------------------------------------- la caméra : un seul mouvement, de clé en clé, sans à-coup
// Une clé : { t, k : [position (3), visée (3), roulis], fov, ouv (ouverture), elan (vitesse à la clé : 1 normale, 0 à l'arrêt) }.
// Entre les clés, une courbe d'Hermite : position, visée, roulis, champ et flou changent sans à-coup (vitesse continue) ;
// ralentir (0 à 1) : la caméra ralentit au passage de chaque clé, sans jamais s'arrêter.
const cleCam = (t, pos, vise, fov = 40, ouv = 0.006, elan = 1, roulis = 0) => ({ t, k: [...pos, ...vise, roulis], fov, ouv, elan });
function trajet(cles, t, ralentir = 0) {
  const n = cles.length, T = cles.map((c) => c.t), V = cles.map((c) => [...c.k, c.fov, c.ouv]);
  const vit = V.map((v, i) => { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); return v.map((x, j) => (cles[i].elan * (V[b][j] - V[a][j])) / (T[b] - T[a])); });
  if (t <= T[0]) return V[0].map((x, j) => x + (1 - ralentir) * vit[0][j] * (t - T[0]));
  if (t >= T[n - 1]) return V[n - 1].map((x, j) => x + (1 - ralentir) * vit[n - 1][j] * (t - T[n - 1]));
  let i = 0; while (t > T[i + 1]) i++;
  const h = T[i + 1] - T[i]; let u = (t - T[i]) / h;
  if (ralentir) u -= (ralentir * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);
  const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = 3 * u2 - 2 * u3, h11 = u3 - u2;
  return V[i].map((x, j) => h00 * x + h10 * h * vit[i][j] + h01 * V[i + 1][j] + h11 * h * vit[i + 1][j]);
}
const ECRAN = [TEL.x, 0.0, TEL.z - 0.42];
const CAMERA = [
  cleCam(0.0, [0.10, 3.05, 1.72], ECRAN, 40, 0.004),
  cleCam(2.0, [0.04, 2.85, 1.5], [0, 0, TEL.z - 0.4], 40, 0.004),
  cleCam(3.45, [0.0, 2.7, 1.42], [0, 0, TEL.z - 0.38], 40, 0.004, 0.6),
  cleCam(4.4, [0.75, 1.75, 2.75], [FEUILLE[0] + 0.12, 0.98, FEUILLE[2]], 46, 0.01),           // le calendrier, le téléphone endormi devant
  cleCam(5.55, [0.5, 1.6, 2.4], [FEUILLE[0] + 0.08, 0.98, FEUILLE[2]], 46, 0.01, 0.5),
  cleCam(6.1, [2.1, 1.85, 2.75], [1.3, 0.1, 0.92], 40, 0.006, 0.3),                           // la clé tombe
  cleCam(8.4, [TAG[0] + 0.55, 1.05, TAG[2] + 1.0], [TAG[0] - 0.07, 0.0, TAG[2] - 0.13], 34, 0.014, 0.6),   // l'étiquette, lue depuis la coque
  cleCam(9.9, [TAG[0] + 0.75, 1.1, TAG[2] + 1.45], [TAG[0] + 0.2, 0.02, TAG[2] + 0.35], 34, 0.012),
  cleCam(11.3, [0.95, 2.6, 2.85], [0.62, 0.0, 0.62], 40, 0.006),
  cleCam(13.4, [0.85, 5.2, 3.3], [0.72, 0.0, 0.05], 42, 0.004),
  cleCam(16.0, [0.82, 5.5, 3.45], [0.72, 0.0, 0.0], 42, 0.004, 0.5),
];
const camera = (t) => { const r = trajet(CAMERA, t, 0.25); return { pos: r.slice(0, 3), cible: r.slice(3, 6), roulis: r[6], fov: r[7], ouverture: Math.max(0, r[8]) }; };

// ---------------------------------------------------------------- la scène d'un instant
function scene(t) {
  t = clamp(t, 0, DUREE_FILM - 1e-4);
  const L = lumiere(t), e = eclatEcran(t), nuit = clamp((L.exposition - 1) / 0.3);
  return { ...L, cam: camera(t), calque: 1,
    tel: [TEL.x, TEL.z, TEL.lacet, e], lueur: [TEL.x, 0.32, TEL.z, e * (0.25 + 0.9 * nuit)],
    cal: [CAL.x, CAL.z, CAL.lacet, 1], feuillet: feuillet(t), cle: cle(t) };
}

let M = null, _ecran = null, _calque = null;
function textures(t) {                                       // ce qui est affiché change avec le temps : on ne repeint que si cela a changé
  const e = etatEcran(t), ke = JSON.stringify(e);
  if (ke !== _ecran) { M.texture("ecran", ecranTel(e)); _ecran = ke; }
  const q = (v) => Math.round(clamp(v) * 60) / 60, fin = { logo: q(prog(t, FI.logo, 0.6)), ligne: q(prog(t, FI.logo + 0.4, 0.5)), site: q(prog(t, FI.adresse, 0.5)) };
  const kc = TITRES.some((T) => t >= T.de - 0.01 && t < T.a + 0.01) || fin.logo > 0 ? `${Math.round(t * 60)}` : "vide";   // pendant un titre, un calque par image
  if (kc !== _calque) { M.texture("calque", calqueStory(t, fin)); _calque = kc; }
}
const ECH = window.ECHANTILLONS || 8, OBT = window.OBTURATEUR || 1 / 120;   // passes par image ; obturateur : 1/120 s, soit 180° à 60 i/s
window.__seek = (t) => { t = clamp(t, 0, DUREE_FILM - 1e-4); textures(t); M.image(t, scene, { echantillons: ECH, obturateur: OBT }); };
window.__ready = false;
const PAGE_CHARGEE = new Promise((ok) => (document.readyState === "complete" ? ok() : window.addEventListener("load", () => ok()))).then(() => new Promise((ok) => setTimeout(ok, 50)));
Promise.all([POLICES_PRETES, IMAGES_PRETES, PAGE_CHARGEE]).then(() => {
  const cv = document.createElement("canvas"); document.getElementById("plateau").appendChild(cv);
  M = MoteurSDF.creer(cv, { largeur: W, hauteur: H, definition: window.DEFINITION || 1 });
  M.texture("stores", stores()); M.texture("etiquette", etiquette()); M.texture("calendrier", calendrier());
  window.__ready = true;
}).catch((e) => { console.error(e); document.title = "ERREUR " + e.message; });
