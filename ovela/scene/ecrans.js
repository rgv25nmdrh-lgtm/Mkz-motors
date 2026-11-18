// Ovela : tous les écrans, dessinés sur canevas 2D. Chaque dessin est une fonction pure de ses paramètres.
// Les commerces, les noms, les prix et les chiffres sont inventés (voir LISEZMOI.md).
const POLICES = ["400 40px Inter", "500 40px Inter", "600 40px Inter", "700 40px Inter", "800 40px Inter", "500 40px 'JetBrains Mono'", "600 40px 'JetBrains Mono'"];
const CH = { fond: "#0e0e11", surf: "#17171b", surf2: "#202026", ligne: "#2c2c33", texte: "#f4f3ef", doux: "#a3a3ac", sourd: "#6c6c76", orange: "#ff6a1a", orangeSombre: "#2b1307", vert: "#3ccf7a" };
const INS = " ";   // espace fine insécable (avant : ; ? ! % €)

// ------------------------------------------------------------------ outils de dessin
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function bloc(ctx, x, y, w, h, r, fond, bord, ep = 2) { rr(ctx, x, y, w, h, r); if (fond) { ctx.fillStyle = fond; ctx.fill(); } if (bord) { ctx.strokeStyle = bord; ctx.lineWidth = ep; ctx.stroke(); } }
function tx(ctx, s, x, y, o = {}) {
  const t = o.t ?? 40;
  ctx.font = `${o.g ?? 500} ${t}px ${o.m ? "'JetBrains Mono'" : "Inter"}`;
  ctx.letterSpacing = `${((o.ls ?? (o.m ? 0 : -0.02)) * t).toFixed(2)}px`;
  ctx.textAlign = o.a ?? "left"; ctx.textBaseline = o.b ?? "alphabetic"; ctx.fillStyle = o.c ?? CH.texte;
  const a0 = ctx.globalAlpha; if (o.op !== undefined) ctx.globalAlpha = a0 * o.op;
  let s2 = s;
  if (o.max) { while (s2.length > 1 && ctx.measureText(s2).width > o.max) s2 = s2.slice(0, -2) + "…"; }
  ctx.fillText(s2, x, y); ctx.globalAlpha = a0;
  return ctx.measureText(s2).width;
}
function larg(ctx, s, o = {}) { const t = o.t ?? 40; ctx.font = `${o.g ?? 500} ${t}px ${o.m ? "'JetBrains Mono'" : "Inter"}`; ctx.letterSpacing = `${((o.ls ?? (o.m ? 0 : -0.02)) * t).toFixed(2)}px`; return ctx.measureText(s).width; }
function rond(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function coche(ctx, x, y, s, c, ep) { ctx.strokeStyle = c; ctx.lineWidth = ep; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(x - 0.42 * s, y + 0.02 * s); ctx.lineTo(x - 0.12 * s, y + 0.32 * s); ctx.lineTo(x + 0.45 * s, y - 0.34 * s); ctx.stroke(); }
// l'étincelle d'Ovela : une étoile à quatre branches aux côtés creusés
function etincelle(ctx, x, y, r, c) {
  ctx.fillStyle = c; ctx.beginPath();
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 - Math.PI / 2, b = a + Math.PI / 4; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.quadraticCurveTo(x + Math.cos(b) * r * 0.12, y + Math.sin(b) * r * 0.12, x + Math.cos(a + Math.PI / 2) * r, y + Math.sin(a + Math.PI / 2) * r); }
  ctx.closePath(); ctx.fill();
}
function avatar(ctx, x, y, r, ini, teinte) {
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, teinte[0]); g.addColorStop(1, teinte[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  tx(ctx, ini, x, y + r * 0.02, { t: r * 0.78, g: 600, a: "center", b: "middle", c: "#fff" });
}
function fondEcran(ctx, w, h, r = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#131317"); g.addColorStop(1, "#0c0c0f");
  ctx.fillStyle = g; if (r) { rr(ctx, 0, 0, w, h, r); ctx.fill(); } else ctx.fillRect(0, 0, w, h);
}
function pastille(ctx, x, y, w, h, texte, o = {}) {   // un bouton ou un statut
  bloc(ctx, x, y, w, h, h / 2, o.fond ?? CH.orange, o.bord);
  let cx = x + w / 2;
  if (o.coche) { const tw = larg(ctx, texte, { t: o.t ?? 40, g: 600 }), total = tw + h * 0.62; cx = x + w / 2 - total / 2 + h * 0.62 + tw / 2; coche(ctx, x + w / 2 - total / 2 + h * 0.2, y + h / 2, h * 0.36, o.c ?? "#160800", h * 0.075); }
  tx(ctx, texte, cx, y + h / 2 + 1, { t: o.t ?? 40, g: 600, a: "center", b: "middle", c: o.c ?? "#160800" });
}

// ------------------------------------------------------------------ les données inventées
const CLIENTS = [
  { nom: "Léa M.", ini: "LM", teinte: ["#5b6cff", "#2f3bb5"], msg: "Vous avez une table pour 4 ce soir" + INS + "?", rep: "Oui" + INS + "! 20:30, table 6. C’est noté ✓" },
  { nom: "Thomas R.", ini: "TR", teinte: ["#22b38a", "#106b52"], msg: "Vous êtes ouverts dimanche midi" + INS + "?", rep: "Oui, de 12:00 à 14:30." },
  { nom: "Sofia B.", ini: "SB", teinte: ["#e0559b", "#8f2560"], msg: "Le menu existe sans gluten" + INS + "?", rep: "Oui, 3 plats sur 5 le sont." },
  { nom: "Hugo D.", ini: "HD", teinte: ["#f0a63a", "#a1600f"], msg: "Je peux réserver pour 8 personnes" + INS + "?", rep: "Oui, samedi 19:30 en terrasse." },
  { nom: "Camille P.", ini: "CP", teinte: ["#8a5cf0", "#4a2a9e"], msg: "Vous faites la vente à emporter" + INS + "?", rep: "Oui, commande en ligne ici ✓" },
  { nom: "Yanis K.", ini: "YK", teinte: ["#3aa6e8", "#1b5f8c"], msg: "Il reste de la place à 21" + INS + "h" + INS + "?", rep: "Oui, 2 tables à 21:00." },
];
const ETIQUETTES = ["Restaurant", "Boutique", "Coach", "Coiffure", "Fleuriste"];

// ------------------------------------------------------------------ 1 · le téléphone du restaurant, à 23:47
// p : { n: conversations visibles, glisse: arrivée de la plus récente (0 à 1), badge: non lus, rep: réponses d'Ovela (nombre), repG: avancement de la dernière }
function dessinTel(ctx, p) {
  const W = 900, H = 1950;
  fondEcran(ctx, W, H);
  tx(ctx, "23:47", 96, 112, { t: 46, g: 600 });
  bloc(ctx, 690, 82, 92, 42, 13, null, "rgba(244,243,239,0.55)", 3); bloc(ctx, 697, 89, 52, 28, 7, "rgba(244,243,239,0.85)"); bloc(ctx, 785, 95, 8, 16, 3, "rgba(244,243,239,0.55)");
  [0, 1, 2, 3].forEach((i) => bloc(ctx, 572 + i * 24, 116 - (i + 1) * 9, 15, (i + 1) * 9, 3, "rgba(244,243,239,0.85)"));
  tx(ctx, "Messages", 72, 262, { t: 84, g: 700, ls: -0.035 });
  tx(ctx, "Chez Margaux · restaurant", 74, 320, { t: 38, c: CH.doux });
  const badge = p.badge ?? 0;
  if (badge > 0) { const s = String(badge), w = Math.max(96, larg(ctx, s, { t: 46, g: 700 }) + 52); bloc(ctx, W - 72 - w, 204, w, 82, 41, CH.orange); tx(ctx, s, W - 72 - w / 2, 247, { t: 46, g: 700, a: "center", b: "middle", c: "#160800" }); }
  bloc(ctx, 64, 372, W - 128, 92, 30, CH.surf); tx(ctx, "Rechercher", 132, 432, { t: 38, c: CH.sourd });
  ctx.strokeStyle = CH.sourd; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(100, 414, 13, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(110, 424); ctx.lineTo(120, 434); ctx.stroke();
  const n = p.n ?? 0, gl = p.glisse ?? 1, RH = 206, Y0 = 500;
  ctx.save(); ctx.beginPath(); ctx.rect(0, Y0 - 10, W, H - Y0 - 120); ctx.clip();
  for (let i = 0; i < n; i++) {
    const rang = n - 1 - i, y = Y0 + (rang - (1 - gl)) * RH, c = CLIENTS[i % CLIENTS.length];
    const a = i === n - 1 ? gl : 1, rep = i < (p.rep ?? 0) ? 1 : i === (p.rep ?? 0) ? p.repG ?? 0 : 0;
    ctx.globalAlpha = a;
    if (rep > 0) { bloc(ctx, 40, y + 8, W - 80, RH - 16, 34, `rgba(255,106,26,${0.10 * rep})`); }
    avatar(ctx, 132, y + RH / 2, 60, c.ini, c.teinte);
    tx(ctx, c.nom, 222, y + 84, { t: 44, g: 600 });
    tx(ctx, rep > 0.5 ? "23:47" : "23:4" + (6 + (i % 2)), W - 72, y + 84, { t: 32, m: true, a: "right", c: CH.sourd });
    if (rep > 0.5) {
      etincelle(ctx, 240, y + 140, 17, CH.orange);
      tx(ctx, c.rep, 268, y + 153, { t: 36, c: "#ffd2b8", max: W - 268 - 80, op: Math.min(1, (rep - 0.5) * 2) });
    } else {
      tx(ctx, c.msg, 222, y + 152, { t: 38, g: 500, c: CH.texte, max: W - 222 - 120 });
      rond(ctx, W - 92, y + 140, 15, CH.orange);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = CH.ligne; ctx.fillRect(222, y + RH - 1, W - 222 - 64, 2);
  }
  ctx.restore();
  bloc(ctx, W / 2 - 150, H - 52, 300, 12, 6, "rgba(244,243,239,0.55)");
}

// ------------------------------------------------------------------ 2 · une notification de message (le flot du plan 2)
// p : { i: client, rep: 0 à 1 (Ovela a répondu) }
function dessinNotif(ctx, p) {
  const W = 1000, H = 230, c = CLIENTS[p.i % CLIENTS.length], rep = p.rep ?? 0;
  bloc(ctx, 0, 0, W, H, 58, "rgba(24,24,29,0.94)");
  bloc(ctx, 34, 40, 150, 150, 40, rep > 0.5 ? CH.orange : "#2a2a31");
  if (rep > 0.5) etincelle(ctx, 109, 115, 46, "#160800");
  else { bloc(ctx, 68, 78, 82, 60, 20, CH.texte); ctx.fillStyle = CH.texte; ctx.beginPath(); ctx.moveTo(84, 130); ctx.lineTo(80, 158); ctx.lineTo(108, 134); ctx.fill(); }
  tx(ctx, c.nom, 222, 96, { t: 50, g: 600 });
  tx(ctx, rep > 0.5 ? "répondu" : "maintenant", W - 50, 96, { t: 34, a: "right", c: rep > 0.5 ? CH.orange : CH.sourd, g: rep > 0.5 ? 600 : 500 });
  if (rep > 0.5) tx(ctx, "Ovela" + INS + ": " + c.rep, 222, 166, { t: 40, c: "#ffd2b8", max: W - 222 - 50 });
  else tx(ctx, c.msg, 222, 166, { t: 40, c: CH.doux, max: W - 222 - 50 });
}

// ------------------------------------------------------------------ 3 · les cinq commerces
function enTete(ctx, ini, teinte, nom, sous) {
  avatar(ctx, 118, 122, 62, ini, teinte);
  tx(ctx, nom, 206, 116, { t: 58, g: 700, ls: -0.03 });
  tx(ctx, sous, 208, 168, { t: 34, c: CH.doux });
}
function statut(ctx, ok, texteOk, texteAttente, y = 1150) {
  if (ok > 0.5) pastille(ctx, 60, y, 880, 100, texteOk, { coche: true, t: 40 });
  else { bloc(ctx, 60, y, 880, 100, 50, null, CH.ligne, 3); tx(ctx, texteAttente, 500, y + 51, { t: 38, a: "center", b: "middle", c: CH.sourd }); }
}
// Chez Margaux : la réservation de ce soir
function dessinRestaurant(ctx, p) {
  fondEcran(ctx, 1000, 1300);
  enTete(ctx, "CM", ["#ff8a3d", "#b8410a"], "Chez Margaux", "Bistrot · Lyon 2e");
  tx(ctx, "Ce soir · jeudi 14 novembre", 60, 300, { t: 40, g: 600 });
  const H = ["19:00", "19:30", "20:00", "20:30", "21:00", "21:30"], pris = [1, 1, 0, 0, 1, 0];
  H.forEach((h, k) => {
    const x = 60 + (k % 3) * 300, y = 350 + Math.floor(k / 3) * 150, sel = k === 3 && (p.ok ?? 0) > 0.5;
    if (sel) bloc(ctx, x, y, 280, 120, 26, CH.orange);
    else bloc(ctx, x, y, 280, 120, 26, pris[k] ? CH.surf : null, pris[k] ? null : CH.ligne, 3);
    tx(ctx, h, x + 140, y + 62, { t: 46, m: true, g: 600, a: "center", b: "middle", c: sel ? "#160800" : pris[k] ? CH.sourd : CH.texte });
    if (pris[k]) { ctx.fillStyle = CH.sourd; ctx.fillRect(x + 70, y + 60, 140, 3); }
  });
  bloc(ctx, 60, 690, 880, 390, 30, CH.surf);
  [["Couverts", "4 personnes"], ["Table", "n°" + INS + "6 · terrasse chauffée"], ["Au nom de", "Léa M."]].forEach(([k, v], i) => {
    tx(ctx, k, 100, 780 + i * 112, { t: 36, c: CH.doux }); tx(ctx, v, 900, 780 + i * 112, { t: 38, g: 600, a: "right" });
    if (i < 2) { ctx.fillStyle = CH.ligne; ctx.fillRect(100, 820 + i * 112, 800, 2); }
  });
  statut(ctx, p.ok ?? 0, "Confirmée par Ovela · 4" + INS + "s", "En attente de réponse…");
}
// Atelier Sable : un vase vendu en ligne
function dessinBoutique(ctx, p) {
  fondEcran(ctx, 1000, 1300);
  const g = ctx.createLinearGradient(0, 60, 0, 700); g.addColorStop(0, "#3a2a20"); g.addColorStop(1, "#1a1310");
  bloc(ctx, 60, 60, 880, 640, 34, g);
  // le vase, en grès : une silhouette tournée, éclairée de gauche
  const cx = 500, vg = ctx.createLinearGradient(cx - 170, 0, cx + 170, 0); vg.addColorStop(0, "#f0d9c4"); vg.addColorStop(0.45, "#d8b596"); vg.addColorStop(1, "#7d5a42");
  ctx.fillStyle = vg; ctx.beginPath(); ctx.moveTo(cx - 70, 150); ctx.bezierCurveTo(cx - 80, 230, cx - 190, 300, cx - 185, 450); ctx.bezierCurveTo(cx - 180, 560, cx - 110, 620, cx - 95, 640); ctx.lineTo(cx + 95, 640); ctx.bezierCurveTo(cx + 110, 620, cx + 180, 560, cx + 185, 450); ctx.bezierCurveTo(cx + 190, 300, cx + 80, 230, cx + 70, 150); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#4a3426"; ctx.beginPath(); ctx.ellipse(cx, 150, 70, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(cx, 646, 140, 18, 0, 0, Math.PI * 2); ctx.fill();
  tx(ctx, "Atelier Sable", 60, 790, { t: 34, g: 600, c: CH.doux, ls: 0.02 });
  tx(ctx, "Vase Dune", 60, 870, { t: 66, g: 700, ls: -0.035 });
  tx(ctx, "Grès émaillé, tourné à la main", 60, 930, { t: 36, c: CH.doux });
  tx(ctx, "64,00" + INS + "€", 940, 870, { t: 56, m: true, g: 600, a: "right" });
  bloc(ctx, 60, 990, 880, 110, 24, CH.surf);
  tx(ctx, "Commande n°" + INS + "2381", 100, 1056, { t: 36, c: CH.doux }); tx(ctx, "Camille P.", 900, 1056, { t: 36, g: 600, a: "right" });
  statut(ctx, p.ok ?? 0, "Payée · réponse en 4" + INS + "s", "Question en attente…");
}
// Studio Nord : l'agenda d'un coach sportif
function dessinCoach(ctx, p) {
  fondEcran(ctx, 1000, 1300);
  enTete(ctx, "SN", ["#4f7cff", "#1f3aa8"], "Studio Nord", "Coaching sportif · semaine 46");
  const J = ["LUN", "MAR", "MER", "JEU", "VEN"], HRS = ["07:30", "12:30", "18:00", "19:30"], pris = [[1, 0, 1, 1], [0, 1, 1, 0], [1, 1, 0, 1], [1, 0, 1, 1], [0, 1, 1, 1]];
  J.forEach((j, a) => tx(ctx, j, 220 + a * 150 + 60, 300, { t: 32, m: true, g: 600, a: "center", c: CH.doux }));
  HRS.forEach((h, r) => {
    const y = 340 + r * 175;
    tx(ctx, h, 60, y + 82, { t: 34, m: true, c: CH.sourd });
    J.forEach((_, a) => {
      const x = 220 + a * 150, sel = a === 1 && r === 0;
      if (sel) { if ((p.ok ?? 0) > 0.5) { bloc(ctx, x, y, 130, 150, 22, CH.orange); coche(ctx, x + 65, y + 75, 50, "#160800", 9); } else bloc(ctx, x, y, 130, 150, 22, null, CH.orange, 4); }
      else bloc(ctx, x, y, 130, 150, 22, pris[a][r] ? CH.surf2 : null, pris[a][r] ? null : CH.ligne, 3);
    });
  });
  bloc(ctx, 60, 1060, 880, 64, 0, null);
  tx(ctx, "Mardi 07:30 · Julie R. · séance d’essai", 60, 1100, { t: 34, c: CH.doux });
  statut(ctx, p.ok ?? 0, "Réservée par Ovela", "Demande reçue à 23:51", 1150);
}
// Salon Mila : un rendez-vous de coiffure
function dessinCoiffure(ctx, p) {
  fondEcran(ctx, 1000, 1300);
  enTete(ctx, "SM", ["#e0559b", "#8f2560"], "Salon Mila", "Coiffure · Villeurbanne");
  bloc(ctx, 60, 260, 300, 330, 34, CH.surf);
  tx(ctx, "SAM", 210, 360, { t: 44, m: true, g: 600, a: "center", c: CH.orange });
  tx(ctx, "16", 210, 510, { t: 150, g: 700, a: "center", ls: -0.04 });
  tx(ctx, "10:00", 410, 340, { t: 62, m: true, g: 600 });
  tx(ctx, "Coupe + brushing", 410, 420, { t: 44, g: 600 });
  tx(ctx, "45 min · 48,00" + INS + "€", 410, 478, { t: 38, c: CH.doux });
  avatar(ctx, 450, 552, 38, "I", ["#f0a63a", "#a1600f"]); tx(ctx, "avec Inès", 506, 566, { t: 36, c: CH.doux });
  bloc(ctx, 60, 650, 880, 440, 30, CH.surf);
  [["Cliente", "Sofia B."], ["Rappel", "la veille, par SMS"], ["Acompte", "aucun"]].forEach(([k, v], i) => {
    tx(ctx, k, 100, 750 + i * 120, { t: 36, c: CH.doux }); tx(ctx, v, 900, 750 + i * 120, { t: 38, g: 600, a: "right" });
    if (i < 2) { ctx.fillStyle = CH.ligne; ctx.fillRect(100, 792 + i * 120, 800, 2); }
  });
  statut(ctx, p.ok ?? 0, "Rendez-vous confirmé", "Demande reçue à 00:12");
}
// Pétale & Co : un bouquet commandé pour le lendemain
function dessinFleuriste(ctx, p) {
  fondEcran(ctx, 1000, 1300);
  enTete(ctx, "P", ["#22b38a", "#106b52"], "Pétale & Co", "Fleuriste · Croix-Rousse");
  const g = ctx.createLinearGradient(0, 260, 0, 760); g.addColorStop(0, "#1d2a22"); g.addColorStop(1, "#111814");
  bloc(ctx, 60, 260, 880, 500, 34, g);
  const F = [[420, 470, 70, "#ff8a5c"], [540, 430, 80, "#ffb08a"], [480, 560, 66, "#e8556d"], [600, 540, 60, "#ff6a1a"], [380, 580, 52, "#f4c7a8"], [520, 640, 46, "#d94f3a"]];
  ctx.strokeStyle = "#3f6b4c"; ctx.lineWidth = 10; F.forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(500, 690, 500, 740); ctx.stroke(); });
  F.forEach(([x, y, r, c]) => { const rg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); rg.addColorStop(0, "#fff1e6"); rg.addColorStop(0.35, c); rg.addColorStop(1, "rgba(0,0,0,0.25)"); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
  tx(ctx, "Bouquet du jour", 60, 860, { t: 62, g: 700, ls: -0.035 });
  tx(ctx, "35,00" + INS + "€", 940, 860, { t: 54, m: true, g: 600, a: "right" });
  tx(ctx, "Livraison demain, 10:00", 60, 925, { t: 38, c: CH.doux });
  bloc(ctx, 60, 990, 880, 110, 24, CH.surf);
  tx(ctx, "Pour", 100, 1056, { t: 36, c: CH.doux }); tx(ctx, "Hugo D. · carte jointe", 900, 1056, { t: 36, g: 600, a: "right" });
  statut(ctx, p.ok ?? 0, "Commande payée", "Question en attente…");
}

// ------------------------------------------------------------------ 4 · la preuve
// p : { pct: 0 à 98, barres: 0 à 1, gain: 0 à 31 }
function dessinStats(ctx, p) {
  fondEcran(ctx, 1000, 1300);
  etincelle(ctx, 104, 116, 34, CH.orange); tx(ctx, "Ovela", 150, 132, { t: 50, g: 700, ls: -0.03 });
  tx(ctx, "Cette semaine", 940, 130, { t: 34, a: "right", c: CH.doux });
  // la jauge : messages traités
  const cx = 290, cy = 420, R = 165, pct = p.pct ?? 0;
  ctx.lineCap = "round"; ctx.lineWidth = 34; ctx.strokeStyle = CH.surf2; ctx.beginPath(); ctx.arc(cx, cy, R, 0.75 * Math.PI, 2.25 * Math.PI); ctx.stroke();
  if (pct > 0) { ctx.strokeStyle = CH.orange; ctx.beginPath(); ctx.arc(cx, cy, R, 0.75 * Math.PI, 0.75 * Math.PI + 1.5 * Math.PI * (pct / 100)); ctx.stroke(); }
  tx(ctx, Math.round(pct) + INS + "%", cx, cy + 22, { t: 84, g: 700, a: "center", ls: -0.04 });
  tx(ctx, "messages traités", cx, cy + 190, { t: 34, a: "center", c: CH.doux });
  tx(ctx, "4" + INS + "s", 560, 400, { t: 150, g: 700, ls: -0.05 });
  tx(ctx, "temps de réponse", 566, 466, { t: 34, c: CH.doux });
  tx(ctx, "moyen, jour et nuit", 566, 512, { t: 34, c: CH.doux });
  // les réservations, semaine après semaine
  bloc(ctx, 60, 690, 880, 560, 34, CH.surf);
  tx(ctx, "Réservations", 110, 780, { t: 40, g: 600 });
  tx(ctx, "+" + Math.round(p.gain ?? 0) + INS + "%", 890, 790, { t: 64, g: 700, a: "right", c: CH.orange, ls: -0.03 });
  const V = [0.42, 0.46, 0.44, 0.5, 0.58, 0.62, 0.7, 0.78], b = p.barres ?? 0;
  V.forEach((v, i) => {
    const h = 300 * v * (i < 4 ? 1 : clamp(b * 4 - (i - 4))), x = 120 + i * 98;
    bloc(ctx, x, 1190 - h, 64, Math.max(h, 1), 14, i < 4 ? "#33333b" : CH.orange);
  });
  tx(ctx, "avant", 120, 1232, { t: 28, m: true, c: CH.sourd }); tx(ctx, "avec Ovela", 512, 1232, { t: 28, m: true, c: CH.orange });
}
// p : { n: commerces (0 à 1240) }
function dessinAvis(ctx, p) {
  fondEcran(ctx, 1000, 820);
  tx(ctx, "4,9", 60, 230, { t: 190, g: 700, ls: -0.05 });
  for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(430 + i * 96, 168); ctx.fillStyle = CH.orange; ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 17 : 40, a = -Math.PI / 2 + (k * Math.PI) / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); }
  const n = Math.round(p.n ?? 0), s = n >= 1000 ? Math.floor(n / 1000) + INS + String(n % 1000).padStart(3, "0") : String(n);
  tx(ctx, s + " commerces", 430, 250, { t: 46, g: 600, c: CH.doux });
  ctx.fillStyle = CH.ligne; ctx.fillRect(60, 330, 880, 2);
  tx(ctx, "« Je dors tranquille" + INS + ":", 60, 440, { t: 54, g: 600, ls: -0.03 });
  tx(ctx, "Ovela répond à ma place. »", 60, 512, { t: 54, g: 600, ls: -0.03 });
  avatar(ctx, 104, 640, 44, "M", ["#ff8a3d", "#b8410a"]);
  tx(ctx, "Margaux", 170, 632, { t: 40, g: 600 }); tx(ctx, "Chez Margaux, Lyon", 170, 680, { t: 34, c: CH.doux });
}

// ------------------------------------------------------------------ 5 · la barre de question et la réponse
// p : { texte, curseur: 0 ou 1, appui: 0 à 1 (la touche Entrée enfoncée) }
function dessinBarre(ctx, p) {
  const W = 2000, H = 260;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(34,34,40,0.96)"); g.addColorStop(1, "rgba(18,18,22,0.96)");
  bloc(ctx, 0, 0, W, H, H / 2, g);
  etincelle(ctx, 138, H / 2, 46, CH.orange);
  const t = p.texte ?? "";
  if (!t) tx(ctx, "Demandez à Ovela…", 220, H / 2 + 4, { t: 92, b: "middle", c: CH.sourd, ls: -0.025 });
  else {
    const w = tx(ctx, t, 220, H / 2 + 4, { t: 92, g: 500, b: "middle", ls: -0.025 });
    if (p.curseur) bloc(ctx, 228 + w, H / 2 - 50, 8, 100, 3, CH.orange);
  }
  const ap = p.appui ?? 0;
  bloc(ctx, W - 230, 50, 160, 160, 48, ap > 0.5 ? CH.orange : "#2c2c33");
  ctx.strokeStyle = ap > 0.5 ? "#160800" : CH.texte; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(W - 112, 96); ctx.lineTo(W - 112, 146); ctx.lineTo(W - 190, 146); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 166, 122); ctx.lineTo(W - 190, 146); ctx.lineTo(W - 166, 170); ctx.stroke();
}
function dessinReponse(ctx, p) {
  const W = 1600, H = 230;
  bloc(ctx, 0, 0, W, H, H / 2, "rgba(40,18,8,0.96)", "rgba(255,106,26,0.85)", 4);
  rond(ctx, 118, H / 2, 62, CH.orange); coche(ctx, 118, H / 2, 64, "#160800", 11);
  tx(ctx, "C’est réservé" + INS + ": 20:30, table" + INS + "6.", 216, H / 2 + 4, { t: 76, g: 600, b: "middle", ls: -0.025 });
}
function dessinEtiquette(ctx, p) {
  const W = 600, H = 150, s = ETIQUETTES[p.i];
  bloc(ctx, 4, 4, W - 8, H - 8, (H - 8) / 2, "rgba(22,22,27,0.9)", "rgba(244,243,239,0.9)", 5);
  tx(ctx, s, W / 2, H / 2 + 3, { t: 62, g: 600, a: "center", b: "middle" });
}

const ECRANS_DEF = {
  tel: [900, 1950, dessinTel],
  restaurant: [1000, 1300, dessinRestaurant], boutique: [1000, 1300, dessinBoutique], coach: [1000, 1300, dessinCoach],
  coiffure: [1000, 1300, dessinCoiffure], fleuriste: [1000, 1300, dessinFleuriste],
  stats: [1000, 1300, dessinStats], avis: [1000, 820, dessinAvis],
  barre: [2000, 260, dessinBarre], reponse: [1600, 230, dessinReponse],
};
for (let i = 0; i < 6; i++) ECRANS_DEF["notif" + i] = [1000, 230, dessinNotif];
for (let i = 0; i < 5; i++) ECRANS_DEF["etiquette" + i] = [600, 150, dessinEtiquette];
