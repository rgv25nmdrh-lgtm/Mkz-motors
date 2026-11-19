// Les dessins de la vidéo « MKZ Motors · location » : l'écran du téléphone (la fiche de la 208 en location, le choix
// des dates, l'écran verrouillé et sa notification), l'étiquette en cuir de la clé, les feuillets du calendrier, la
// lumière des stores, et le calque des titres de la Story. Tous les textes et les chiffres sont ici, en tête.
const ROUGE = "#fa0f14", BLANC = "#f4f2ee", GRIS = "#a29f9a", NUIT = "#0b0b0e";
const LOCATION = {                                         // la voiture et son prix : la fiche « Location » de la boutique MKZ
  modele: "Peugeot 208 Diesel", annee: "2020", details: "Gris · Boîte manuelle", prixJour: 80,
  depart: "Vendredi", retour: "Dimanche", jours: 2,         // l'exemple de réservation montré à l'écran
};
const JOURS_CAL = [["VENDREDI", "Les clés"], ["SAMEDI", "La route"], ["DIMANCHE", "Le retour"]];   // les trois feuillets du calendrier
const NOTIF = { app: "MKZ Motors", texte: ["Vos clés sont prêtes.", "Bonne route !"], heure: "17:58", jour: "vendredi" };
const TITRES = [                                           // les titres de la Story : deux lignes, la seconde en rouge
  { de: 0.15, a: 3.9, lignes: [["Une", "voiture"], ["pour", "le", "week-end", "?"]] },
  { de: 4.0, a: 7.9, lignes: [["Vous", "choisissez", "les", "jours,"], ["on", "prépare", "les", "clés."]] },
  { de: 8.0, a: 11.9, lignes: [["Peugeot", "208", "Diesel"], ["80 €", "par", "jour."]] },
];
const FIN = { ligne: "LOCATION DE VOITURES", site: "mkzmotors.com" };

const hasard = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const toile = (l, h) => { const c = document.createElement("canvas"); c.width = l; c.height = h; return [c, c.getContext("2d")]; };
function ecrire(x, s, px, py, taille, graisse = 500, couleur = BLANC, align = "left", espace = 0, police = "Geist") {
  x.font = `${graisse} ${taille}px "${police}"`; x.letterSpacing = `${espace * taille}px`; x.textAlign = align; x.textBaseline = "alphabetic"; x.fillStyle = couleur;
  x.fillText(s, px + (align === "center" ? (espace * taille) / 2 : 0), py); x.letterSpacing = "0px";
}
const largeurTexte = (x, s, taille, graisse = 500, espace = 0, police = "Geist") => { x.font = `${graisse} ${taille}px "${police}"`; x.letterSpacing = `${espace * taille}px`; const l = x.measureText(s).width; x.letterSpacing = "0px"; return l; };
const pilule = (x, px, py, l, h, r = h / 2) => { x.beginPath(); x.roundRect(px, py, l, h, r); };
const euros = (n) => `${n} €`;

// ---------------------------------------------------------------- les images : le logo et la photo de la 208
const IMAGES = {};
const POLICES_PRETES = Promise.all([300, 400, 500, 600, 700, 800].map((g) => document.fonts.load(`${g} 40px "Geist"`, "Peugeot 208 € É à ?")).concat([document.fonts.load('400 40px "Geist Mono"', "PEUGEOT 208"), document.fonts.load('500 40px "Geist Mono"', "MKZ")]));
const IMAGES_PRETES = Promise.all([["logo", "logo-mkz.png"], ["avant", "img/208-avant.jpg"], ["profil", "img/208-profil.jpg"]].map(([nom, src]) => new Promise((ok, ko) => { const im = new Image(); im.onload = () => { IMAGES[nom] = im; ok(); }; im.onerror = () => ko(new Error("image introuvable : " + src)); im.src = src; })));
// la photo, recadrée sur la voiture (centre et largeur de la voiture dans la photo, en parts de l'image)
const CADRE = { avant: [0.52, 0.52, 0.84], profil: [0.5, 0.52, 0.94] };
function photo(x, nom, px, py, l, h, r, part = 0.9) {
  const im = IMAGES[nom], [cx, cy, lv] = CADRE[nom], k = (part * l) / (lv * im.width);
  x.save(); pilule(x, px, py, l, h, r); x.clip();
  x.drawImage(im, px + l / 2 - cx * im.width * k, py + h / 2 - cy * im.height * k, im.width * k, im.height * k);
  x.restore();
}

// ---------------------------------------------------------------- l'écran du téléphone (900 × 1936)
const EW = 900, EH = 1936;
function barreEtat(x, heure = "16:24", sombre = true) {
  ecrire(x, heure, 92, 92, 40, 600, BLANC);
  x.fillStyle = "#000"; pilule(x, EW / 2 - 118, 40, 236, 70); x.fill();                                  // l'îlot de la caméra
  x.fillStyle = BLANC; for (let k = 0; k < 4; k++) x.fillRect(674 + k * 16, 92 - 10 - k * 7, 10, 10 + k * 7);   // le réseau
  x.strokeStyle = BLANC; x.lineWidth = 3; pilule(x, 752, 66, 62, 30, 9); x.stroke(); x.fillRect(757, 71, 40, 20); x.fillRect(817, 75, 5, 12);   // la batterie
}
// la fiche « Location » de la 208. a : apparition de chaque bloc (photo, titre, prix, bouton), de 0 à 1
function fiche(x, a) {
  const glisse = (p) => (1 - E.outCubic(clamp(p))) * 60;
  x.save(); x.globalAlpha = clamp(a.entete * 1.5); x.drawImage(IMAGES.logo, 46, 150, 252, 61);
  x.strokeStyle = ROUGE; x.lineWidth = 3; pilule(x, 640, 150, 214, 62); x.stroke(); ecrire(x, "Location", 747, 193, 34, 600, ROUGE, "center"); x.restore();
  if (a.photo > 0) {
    x.save(); x.globalAlpha = clamp(a.photo * 1.4); x.translate(0, glisse(a.photo));
    photo(x, "avant", 36, 262, 828, 860, 44, 0.86);
    x.fillStyle = ROUGE; pilule(x, 70, 296, 234, 58); x.fill(); ecrire(x, "À LOUER", 187, 336, 30, 700, "#fff", "center", 0.08);
    x.restore();
  }
  if (a.titre > 0) {
    x.save(); x.globalAlpha = clamp(a.titre * 1.4); x.translate(0, glisse(a.titre));
    ecrire(x, LOCATION.modele, 46, 1226, 66, 700, BLANC); ecrire(x, `${LOCATION.annee} · ${LOCATION.details}`, 48, 1296, 40, 400, GRIS);
    x.restore();
  }
  if (a.prix > 0) {
    x.save(); x.globalAlpha = clamp(a.prix * 1.4); x.translate(0, glisse(a.prix));
    const s = lerp(1.15, 1, E.outBack(clamp(a.prix), 2)); x.translate(46, 1462); x.scale(s, s);
    ecrire(x, euros(LOCATION.prixJour), 0, 0, 150, 800, BLANC); ecrire(x, "/ jour", largeurTexte(x, euros(LOCATION.prixJour), 150, 800) + 22, -6, 54, 500, GRIS);
    x.restore();
    x.save(); x.globalAlpha = clamp(a.prix); ecrire(x, "Tarif à la journée.", 48, 1548, 36, 400, GRIS); x.restore();
  }
  if (a.bouton > 0) { x.save(); x.globalAlpha = clamp(a.bouton * 1.4); x.translate(0, glisse(a.bouton)); x.fillStyle = ROUGE; pilule(x, 46, 1652, 808, 136); x.fill(); ecrire(x, "Réserver", EW / 2, 1740, 54, 700, "#fff", "center"); x.restore(); }
}
// le choix des dates. d : sélection (0 à 3 : rien, vendredi, jusqu'à dimanche, total), appui (0 à 1), reserve (0 à 1)
function dates(x, d) {
  ecrire(x, "‹", 46, 214, 80, 400, BLANC); ecrire(x, "Vos dates", 112, 208, 64, 700, BLANC);
  ecrire(x, `${LOCATION.modele} · ${euros(LOCATION.prixJour)} / jour`, 48, 284, 36, 400, GRIS);
  const NOMS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"], l = 112, g = 9, x0 = (EW - 7 * l - 6 * g) / 2, y0 = 380;
  const fin = clamp(d.sel - 1), deb = clamp(d.sel);                                                   // la plage : vendredi (4) → dimanche (6)
  if (deb > 0) {
    const xa = x0 + 4 * (l + g), xb = x0 + (4 + 2 * E.outCubic(fin)) * (l + g) + l;
    x.save(); x.globalAlpha = E.outCubic(deb); x.fillStyle = "rgba(250,15,20,0.24)"; pilule(x, xa, y0, xb - xa, 168, 34); x.fill();
    x.fillStyle = ROUGE; pilule(x, xa, y0, l, 168, 34); x.fill(); if (fin > 0.98) { pilule(x, x0 + 6 * (l + g), y0, l, 168, 34); x.fill(); }
    x.restore();
  }
  NOMS.forEach((n, k) => {
    const cx = x0 + k * (l + g) + l / 2, choisi = (k === 4 && deb > 0.5) || (k === 6 && fin > 0.98), dedans = k === 5 && fin > 0.5;
    if (!choisi && !dedans) { x.strokeStyle = "rgba(255,255,255,0.14)"; x.lineWidth = 2; pilule(x, cx - l / 2, y0, l, 168, 34); x.stroke(); }
    ecrire(x, n, cx, y0 + 62, 30, 500, choisi ? "#fff" : dedans ? BLANC : GRIS, "center"); ecrire(x, ["•", "•", "•", "•", "V", "S", "D"][k], cx, y0 + 128, 44, 700, choisi ? "#fff" : k < 4 ? "rgba(255,255,255,0.25)" : BLANC, "center");
  });
  [["Départ", LOCATION.depart, 640], ["Retour", LOCATION.retour, 760]].forEach(([a, b, y], k) => {
    const o = clamp(k ? (d.sel - 1) * 2 : d.sel * 2); x.save(); x.globalAlpha = 0.35 + 0.65 * o;
    ecrire(x, a, 48, y, 40, 400, GRIS); ecrire(x, o > 0.5 ? b : "—", EW - 48, y, 44, 600, BLANC, "right"); x.restore();
    x.fillStyle = "rgba(255,255,255,0.09)"; x.fillRect(48, y + 40, EW - 96, 2);
  });
  { const o = clamp(d.sel - 2); x.save(); x.globalAlpha = 0.35 + 0.65 * o;                            // le récapitulatif
    x.fillStyle = "#18181d"; pilule(x, 36, 900, 828, 400, 40); x.fill(); photo(x, "profil", 66, 930, 300, 200, 26, 0.92);
    ecrire(x, LOCATION.modele, 396, 1000, 42, 700, BLANC); ecrire(x, `${LOCATION.jours} jours × ${euros(LOCATION.prixJour)}`, 396, 1064, 36, 400, GRIS);
    ecrire(x, "Total", 66, 1236, 42, 500, GRIS);
    const n = Math.round(LOCATION.jours * LOCATION.prixJour * E.outCubic(o)); ecrire(x, euros(n), EW - 66, 1240, 96, 800, BLANC, "right");
    x.restore(); }
  { const s = 1 - 0.05 * Math.sin(Math.PI * clamp(d.appui)), r = clamp(d.reserve);                 // le bouton, enfoncé puis « Réservé »
    x.save(); x.translate(EW / 2, 1720); x.scale(s, s); x.fillStyle = ROUGE; pilule(x, -404, -68, 808, 136); x.fill();
    if (r < 0.5) ecrire(x, "Réserver", 0, 20, 54, 700, "#fff", "center");
    else { const o = (r - 0.5) * 2; x.globalAlpha = o; ecrire(x, "Réservé", 30, 20, 54, 700, "#fff", "center"); x.strokeStyle = "#fff"; x.lineWidth = 9; x.lineCap = "round"; x.lineJoin = "round"; x.beginPath(); x.moveTo(-150, 0); x.lineTo(-128, 22); x.lineTo(-90, -22); x.stroke(); }
    x.restore(); }
}
// l'écran verrouillé, et la notification de MKZ (n : son arrivée, de 0 à 1)
function verrou(x, n) {
  const g = x.createRadialGradient(EW * 0.3, EH * 0.25, 40, EW * 0.5, EH * 0.5, EH * 0.75); g.addColorStop(0, "#3a0a0e"); g.addColorStop(0.55, "#140608"); g.addColorStop(1, "#050506");
  x.fillStyle = g; x.fillRect(0, 0, EW, EH);
  ecrire(x, NOTIF.jour, EW / 2, 330, 48, 500, "rgba(244,242,238,0.8)", "center"); ecrire(x, NOTIF.heure, EW / 2, 560, 230, 300, BLANC, "center");
  if (n > 0) {
    const e = E.outBack(clamp(n), 1.4), y = 760 - 80 * (1 - e);
    x.save(); x.globalAlpha = clamp(n * 2); x.fillStyle = "rgba(38,36,40,0.92)"; pilule(x, 36, y, 828, 300, 52); x.fill();
    x.fillStyle = ROUGE; pilule(x, 72, y + 40, 96, 96, 24); x.fill(); ecrire(x, "M", 120, y + 112, 64, 800, "#fff", "center");
    ecrire(x, NOTIF.app, 196, y + 84, 40, 700, BLANC); ecrire(x, "maintenant", EW - 72, y + 84, 32, 400, GRIS, "right");
    ecrire(x, NOTIF.texte[0], 196, y + 152, 40, 500, BLANC); ecrire(x, NOTIF.texte[1], 196, y + 210, 40, 400, "rgba(244,242,238,0.75)");
    x.restore();
  }
  x.fillStyle = "rgba(244,242,238,0.8)"; pilule(x, EW / 2 - 140, EH - 40, 280, 12); x.fill();
}
// e : { page : 0 la fiche, 1 les dates, 2 l'écran verrouillé ; glisse : passage de la fiche aux dates, de 0 à 1 ; … }
function ecranTel(e) {
  const [c, x] = toile(EW, EH);
  x.fillStyle = NUIT; x.fillRect(0, 0, EW, EH);
  if (e.page === 2) { verrou(x, e.notif); barreEtat(x, NOTIF.heure); return c; }
  const g = E.inOutCubic(clamp(e.glisse || 0));
  if (g < 1) { x.save(); x.translate(-EW * 0.35 * g, 0); x.globalAlpha = 1 - g; fiche(x, e.fiche); x.restore(); }
  if (g > 0) { x.save(); x.translate(EW * (1 - g), 0); dates(x, e.dates); x.restore(); }
  barreEtat(x);
  return c;
}

// ---------------------------------------------------------------- l'étiquette en cuir de la clé (le dessus ; transparent hors des lettres)
function etiquette() {                                     // les lettres se lisent depuis la coque : leur haut est au bout de l'étiquette
  const [c, x] = toile(600, 1008); x.translate(0, 1008); x.scale(1, -1);
  x.strokeStyle = "rgba(255,240,236,0.7)"; x.lineWidth = 5; x.setLineDash([18, 13]); pilule(x, 30, 30, 540, 948, 70); x.stroke(); x.setLineDash([]);   // la piqûre
  ecrire(x, "MKZ", 300, 330, 150, 800, "#fff", "center", -0.02); ecrire(x, "MOTORS", 300, 392, 44, 600, "rgba(255,255,255,0.9)", "center", 0.42);
  x.fillStyle = "rgba(255,255,255,0.75)"; x.fillRect(250, 450, 100, 5);
  ecrire(x, "LOCATION", 300, 590, 82, 700, "#fff", "center", 0.06);
  ecrire(x, "PEUGEOT 208", 300, 690, 46, 500, "rgba(255,255,255,0.9)", "center", 0.04, "Geist Mono");
  ecrire(x, "mkzmotors.com", 300, 900, 38, 500, "rgba(255,255,255,0.8)", "center");
  return c;
}

// ---------------------------------------------------------------- les feuillets du calendrier : trois cases côte à côte
function calendrier() {
  const CW = 920, CHT = 1000, [c, x] = toile(CW * 3, CHT);
  JOURS_CAL.forEach(([jour, mot], i) => {
    x.save(); x.translate(i * CW, 0);
    x.fillStyle = "#efe9de"; x.fillRect(0, 0, CW, CHT);
    for (let k = 0; k < 2600; k++) { x.fillStyle = `rgba(120,100,70,${0.02 + 0.035 * hasard(k + i * 7)})`; x.fillRect(CW * hasard(k + 0.3), CHT * hasard(k + 0.7), 2, 1); }   // le grain du papier
    x.fillStyle = ROUGE; x.fillRect(0, 54, CW, 150); ecrire(x, "MKZ MOTORS · LOCATION", CW / 2, 144, 38, 600, "#fff", "center", 0.2);
    x.fillStyle = "#2a2724"; for (const u of [0.22, 0.78]) { x.beginPath(); x.arc(CW * u, 26, 13, 0, 2 * Math.PI); x.fill(); }   // les trous des anneaux
    let t = 168; while (largeurTexte(x, jour, t, 800, -0.02) > CW - 90) t -= 2;
    ecrire(x, jour, CW / 2, 520, t, 800, "#16161a", "center", -0.02);
    x.fillStyle = ROUGE; x.fillRect(CW / 2 - 70, 572, 140, 12);
    ecrire(x, mot, CW / 2, 716, 76, 500, "#4e4a44", "center");
    ecrire(x, "mkzmotors.com", CW / 2, 930, 34, 400, "#8a857c", "center", 0.04, "Geist Mono");
    x.restore();
  });
  return c;
}

// ---------------------------------------------------------------- la lumière qui entre : une fenêtre et ses stores vénitiens
function stores() {                                         // le motif se répète en hauteur : les bandes peuvent défiler sans fin
  const [a, x] = toile(1024, 3072);
  x.fillStyle = "#000"; x.fillRect(0, 0, 1024, 3072);
  x.fillStyle = "#fff"; x.fillRect(40, 0, 944, 3072);
  x.fillStyle = "#000"; for (let y = 0; y < 3072; y += 32) x.fillRect(40, y, 944, 20);      // les lames : un peu plus d'un tiers de lumière
  x.fillRect(500, 0, 22, 3072);                                                              // le montant de la fenêtre
  for (const px of [270, 760]) x.fillRect(px, 0, 4, 3072);                                   // les cordons
  const [b, y] = toile(1024, 3072);
  y.fillStyle = "#000"; y.fillRect(0, 0, 1024, 3072); y.filter = "blur(3px)"; y.drawImage(a, 0, 0);
  const [c, z] = toile(1024, 1024); z.drawImage(b, 0, 1024, 1024, 1024, 0, 0, 1024, 1024);   // la tranche du milieu : sans bord
  return c;
}

// ---------------------------------------------------------------- le calque de la Story : les titres, puis le logo et l'adresse
function calqueStory(t, fin) {
  const [c, x] = toile(1080, 1920), W = 1080;
  const T = TITRES.find((q) => t >= q.de && t < q.a);
  if (T) {
    const sortie = 1 - prog(t, T.a - 0.14, 0.14), entree = Math.min(1, prog(t, T.de, 0.2) + (T.de > 0.3 ? 1 : 0));
    const g = x.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, "rgba(6,5,5,0.78)"); g.addColorStop(0.6, "rgba(6,5,5,0.5)"); g.addColorStop(1, "rgba(6,5,5,0)");
    x.save(); x.globalAlpha = sortie * entree; x.fillStyle = g; x.fillRect(0, 0, W, 760); x.restore();
    x.save(); x.globalAlpha = sortie; x.shadowColor = "rgba(0,0,0,0.55)"; x.shadowBlur = 28;
    let n = 0;
    T.lignes.forEach((mots, l) => {
      let taille = 104; while (largeurTexte(x, mots.join(" "), taille, 700, -0.035) > W - 140) taille -= 2;
      const esp = largeurTexte(x, " ", taille, 700), ls = mots.map((m) => largeurTexte(x, m, taille, 700, -0.035));
      let px = (W - (ls.reduce((s, v) => s + v, 0) + esp * (mots.length - 1))) / 2; const py = 390 + l * 120;
      mots.forEach((m, i) => {
        const raw = prog(t, T.de + 0.06 + 0.07 * n++, 0.4), p = E.outExpo(raw);
        if (raw > 0) { x.save(); x.beginPath(); x.rect(px - 30, py - taille * 1.05, ls[i] + 60, taille * 1.4); x.clip(); ecrire(x, m, px, py + (1 - p) * taille * 1.25, taille, 700, l === 1 ? ROUGE : BLANC, "left", -0.035); x.restore(); }
        px += ls[i] + esp;
      });
    });
    x.restore();
  }
  if (fin.logo > 0) {                                        // la fin : le logo, la ligne, l'adresse
    const g = x.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, "rgba(5,4,4,0.82)"); g.addColorStop(0.7, "rgba(5,4,4,0.45)"); g.addColorStop(1, "rgba(5,4,4,0)");
    x.save(); x.globalAlpha = clamp(fin.logo * 1.5); x.fillStyle = g; x.fillRect(0, 0, W, 900); x.restore();
    const e = E.outCubic(clamp(fin.logo)), s = lerp(0.9, 1, E.outBack(clamp(fin.logo), 1.6));
    x.save(); x.globalAlpha = e; x.translate(W / 2, 400 + 30 * (1 - e)); x.scale(s, s); x.shadowColor = "rgba(0,0,0,0.5)"; x.shadowBlur = 30; x.drawImage(IMAGES.logo, -380, -92, 760, 185); x.restore();
    const l = clamp(fin.ligne); if (l > 0) { x.save(); x.globalAlpha = E.outCubic(l); ecrire(x, FIN.ligne, W / 2, 590 + 20 * (1 - E.outCubic(l)), 44, 600, BLANC, "center", 0.3); x.restore(); }
    const a = clamp(fin.site); if (a > 0) { x.save(); x.globalAlpha = E.outCubic(a); ecrire(x, FIN.site, W / 2, 690 + 20 * (1 - E.outCubic(a)), 56, 600, ROUGE, "center", 0.01); x.restore(); }
  }
  return c;
}
