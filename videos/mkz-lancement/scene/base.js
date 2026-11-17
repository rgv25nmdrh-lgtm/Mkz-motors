// MKZ Motors, film de lancement du dépôt-vente : socle commun (charte, polices, conducteur, outils de dessin
// sur canevas, registre des textures). Chargé après timing.js, lib.js (clamp, lerp, prog, E, hash) et cues.js.
const C = { fond: "#0d0d0f", surface: "#151518", surface2: "#1c1c21", ligne: "#27272c", ligne2: "#34343b", texte: "#f2f2ef", doux: "#a3a3ab", sourd: "#6b6b74", accent: "#ee2b36", surAccent: "#1a0507" };   // le rouge MKZ
const { K, sfx: SFX } = buildCues(TIMING);

// Polices prêtes avant tout dessin (canevas et DOM).
const POLICES_PRETES = Promise.all([
  ...[300, 400, 500, 600, 700].map((w) => document.fonts.load(`${w} 40px "Geist"`, "MKZ Motors Dépôt-vente éàèù·…’€?")),
  ...[400, 500, 600].map((w) => document.fonts.load(`${w} 40px "Geist Mono"`, "0123456789:·€")),
]).then(() => document.fonts.ready);

// ---------- dessin sur canevas 2D ----------
// Chemin d'un rectangle à coins arrondis.
function rrect(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}
// Rectangle arrondi rempli et/ou bordé.
function bloc(ctx, x, y, w, h, r, fond, bord, ep = 1) {
  rrect(ctx, x, y, w, h, r);
  if (fond) { ctx.fillStyle = fond; ctx.fill(); }
  if (bord) { ctx.strokeStyle = bord; ctx.lineWidth = ep; ctx.stroke(); }
}
// Texte. o : { taille, graisse, couleur, align ("left"|"center"|"right"), mono, serre (interlettrage en em), base ("alphabetic"|"middle"|"top"), opacite }
function texte(ctx, s, x, y, o = {}) {
  const taille = o.taille ?? 32;
  ctx.font = `${o.graisse ?? 500} ${taille}px ${o.mono ? '"Geist Mono"' : '"Geist"'}`;
  ctx.letterSpacing = `${((o.serre ?? (o.mono ? 0 : -0.02)) * taille).toFixed(2)}px`;
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = o.base ?? "alphabetic";
  ctx.fillStyle = o.couleur ?? C.texte;
  const a = ctx.globalAlpha;
  if (o.opacite !== undefined) ctx.globalAlpha = a * o.opacite;
  ctx.fillText(s, x, y);
  ctx.globalAlpha = a;
  return ctx.measureText(s).width;
}
// Largeur d'un texte avec les mêmes options que texte().
function largeur(ctx, s, o = {}) {
  const taille = o.taille ?? 32;
  ctx.font = `${o.graisse ?? 500} ${taille}px ${o.mono ? '"Geist Mono"' : '"Geist"'}`;
  ctx.letterSpacing = `${((o.serre ?? (o.mono ? 0 : -0.02)) * taille).toFixed(2)}px`;
  return ctx.measureText(s).width;
}

// ---------- registre des textures ----------
// Une texture = un dessin sur canevas 2D, fonction pure de ses paramètres.
//   definirTexture("nom", { l: 1600, h: 1000, dessiner(ctx, p) { ... }, ...repères })
// dessiner() reçoit un contexte déjà effacé (transparent) dont le repère va de (0,0) à (l,h).
const TEX = {};
function definirTexture(nom, def) {
  if (TEX[nom]) throw new Error(`texture « ${nom} » définie deux fois`);
  TEX[nom] = Object.assign({ nom }, def);
  return TEX[nom];
}
