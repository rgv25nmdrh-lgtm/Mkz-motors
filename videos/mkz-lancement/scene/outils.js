// Outils communs à la scène : vecteurs, poses, courbes dans le temps, atlas de textures.
const W = 1920, H = 1080, TL = 2048, TH = 4096, RAD = Math.PI / 180;
const ORANGE = [0.933, 0.169, 0.212];   // l'accent de la marque (le rouge MKZ ; le nom vient du kit d'origine)
const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  mix: (a, b, p) => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p],
  lon: (a) => Math.hypot(a[0], a[1], a[2]),
};
// Rotation R = Ry · Rx · Rz (degrés), comme le moteur.
function tourner([rx, ry, rz], [x, y, z]) {
  const cz = Math.cos(rz * RAD), sz = Math.sin(rz * RAD), cx = Math.cos(rx * RAD), sx = Math.sin(rx * RAD), cy = Math.cos(ry * RAD), sy = Math.sin(ry * RAD);
  const x1 = x * cz - y * sz, y1 = x * sz + y * cz, y2 = y1 * cx - z * sx, z2 = y1 * sx + z * cx;
  return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy];
}
// Point de la face avant d'une boîte : (u, v) de 0 à 1 (v = 0 en haut), dz = décollement.
const surFace = (b, u, v, dz = 0) => v3.add(b.c, tourner(b.rot, [(u - 0.5) * 2 * b.d[0], (0.5 - v) * 2 * b.d[1], b.d[2] + dz]));
// Point exprimé dans le repère d'une boîte (en unités du monde, origine au centre).
const dansBoite = (b, p) => v3.add(b.c, tourner(b.rot, p));
function cle(cles, t, courbe = E.inOutCubic) {
  if (t <= cles[0][0]) return cles[0][1];
  for (let i = 1; i < cles.length; i++) if (t <= cles[i][0]) { const [t0, a] = cles[i - 1], [t1, b, e] = cles[i], p = (e || courbe)((t - t0) / (t1 - t0)); return Array.isArray(a) ? a.map((x, j) => x + (b[j] - x) * p) : a + (b - a) * p; }
  return cles[cles.length - 1][1];
}
const lin = (x) => x;
const impulsion = (t, t0, tau) => (t < t0 ? 0 : Math.exp(-(t - t0) / tau));
const choc = (t, t0, tau = 0.14) => impulsion(t, t0, tau) * prog(t, t0, 0.03);
const ecrase = (t, t0, d = 0.16) => { const p = prog(t, t0, d); return t < t0 || p >= 1 ? 0 : Math.sin(p * Math.PI); };
const arr = (x, n = 3) => Math.round(x * 10 ** n) / 10 ** n;
const compte = (instants, t) => instants.filter((x) => x <= t).length;

// ---------------------------------------------------------------- atlas de textures
// composer(couche, [{ cle, nom, p }]) range les dessins dans la couche (par étagères), les peint si quelque chose a
// changé, et retient où chacun se trouve : face("cle") donne la couche et le sous-rectangle à poser sur une boîte.
let M = null;
const ATLAS = {}, _peint = {};
function composer(couche, items) {
  let x = 0, y = 0, hl = 0;
  const places = items.map((it) => {
    const T = TEX[it.nom]; if (!T) throw new Error(`texture inconnue : ${it.nom}`);
    if (x + T.l > TL) { x = 0; y += hl + 8; hl = 0; }
    const pl = { couche, x, y, l: T.l, h: T.h }; ATLAS[it.cle || it.nom] = pl;
    x += T.l + 8; hl = Math.max(hl, T.h);
    if (pl.y + T.h > TH) throw new Error(`couche ${couche} pleine (${it.nom})`);
    return pl;
  });
  const sig = JSON.stringify(items);
  if (_peint[couche] === sig) return;
  _peint[couche] = sig;
  const { ctx, L, H: Hc } = M.toile(couche);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, L, Hc);
  items.forEach((it, i) => { const T = TEX[it.nom], pl = places[i]; ctx.save(); ctx.setTransform(1, 0, 0, 1, pl.x, pl.y); ctx.beginPath(); ctx.rect(0, 0, T.l, T.h); ctx.clip(); T.dessiner(ctx, it.p || {}); ctx.restore(); });
  M.televerser(couche);
}
// Sous-rectangle (u0, v0, u1, v1 de 0 à 1 dans le dessin) d'un élément de l'atlas.
const face = (cleTex, r = [0, 0, 1, 1]) => { const a = ATLAS[cleTex]; if (!a) throw new Error(`pas dans l'atlas : ${cleTex}`); return { face: a.couche, uvFace: [(a.x + a.l * r[0]) / TL, (a.y + a.h * r[1]) / TH, (a.x + a.l * r[2]) / TL, (a.y + a.h * r[3]) / TH] }; };
const dos = (cleTex) => { const f = face(cleTex); return { dos: f.face, uvDos: f.uvFace }; };

// ---------------------------------------------------------------- caméra
// Une clé de caméra = [x, y, z, cible x, y, z, roulis]. orbite() la calcule autour d'un point.
const orbite = (c, d, lacet = 0, haut = 0, roulis = 0) => { const ch = Math.cos(haut * RAD); return [c[0] + d * Math.sin(lacet * RAD) * ch, Math.max(0.04, c[1] + d * Math.sin(haut * RAD)), c[2] + d * Math.cos(lacet * RAD) * ch, ...c, roulis]; };
