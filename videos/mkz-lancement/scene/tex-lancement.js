// MKZ Motors, film de lancement du dépôt-vente : tout ce qui est dessiné sur canevas.
// Le problème : le carnet du particulier qui vend seul sa voiture (visites annulées), l'écran verrouillé de son
// téléphone, les messages des acheteurs. MKZ Motors : le planning des essais (une plaque de verre), la case du jeudi
// 18:30 (un essai routier) et ses états, la page où l'acheteur réserve l'essai, la notification de rappel, la coche,
// le tampon « Vendu », le compteur des ventes, puis le nom et le bouton de la signature.
// Tout le problème est en gris neutres ; le rouge MKZ n'existe qu'à partir du basculement.
// Chaque dessin est une fonction pure de ses paramètres. Les données (véhicule, prix, ventes) sont des exemples.
(() => {
  const TAU = Math.PI * 2, INS = " ";
  const blanc = (a) => `rgba(242,242,239,${a})`, gris = (v, a = 1) => `rgba(${v},${v},${v},${a})`;
  const disque = (ctx, x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const coche = (ctx, x, y, s, couleur, ep) => { ctx.strokeStyle = couleur; ctx.lineWidth = ep; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(x - 0.46 * s, y + 0.02 * s); ctx.lineTo(x - 0.12 * s, y + 0.34 * s); ctx.lineTo(x + 0.48 * s, y - 0.36 * s); ctx.stroke(); };
  const plaqueDeVerre = (ctx, L, Hh, r, bord = blanc(0.3), ep = 5) => bloc(ctx, ep, ep, L - 2 * ep, Hh - 2 * ep, r, "rgba(15,15,18,0.94)", bord, ep);
  const ajuste = (ctx, lignes, o, max) => { let taille = o.taille; while (Math.max(...lignes.map((s) => largeur(ctx, s, { ...o, taille }))) > max && taille > 30) taille -= 2; return taille; };

  // ------------------------------------------------------------------ les données (des exemples, à adapter)
  // La semaine du lundi 12 au samedi 17 octobre : 23 véhicules vendus en dépôt-vente. La case du film : jeudi 18:30,
  // l'essai routier de la voiture du film, une citadine vendue 11 900 €.
  const JOURS = [["LUN", "12"], ["MAR", "13"], ["MER", "14"], ["JEU", "15"], ["VEN", "16"], ["SAM", "17"]];
  const HEURES = ["09:00", "10:00", "12:15", "14:30", "17:00", "18:30", "20:00"];
  const PRISES = [[0, 1, 3, 4], [1, 2, 4, 5], [0, 2, 3, 5], [1, 3, 4, 5], [0, 2, 4, 6], [0, 1, 2]];   // horaires pris, jour par jour
  const PRIX = "11" + INS + "900", VEHICULE = "Citadine 2019", KM = "68" + INS + "000 km", SEANCES = [];
  PRISES.forEach((rs, j) => rs.forEach((r) => SEANCES.push({ j, r, heros: j === 3 && r === 5 })));
  const MESSAGES = [
    { de: "Karim B.", lignes: ["C’est toujours", "disponible" + INS + "?"] },
    { de: "Inès F.", lignes: ["Dernier prix" + INS + "?"] },
    { de: "Julien C.", lignes: ["Désolé, je ne", "viens plus…"] },
  ];
  globalThis.CRENEAU = { JOURS, HEURES, PRISES, PRIX, VEHICULE, KM, SEANCES, HEROS: SEANCES.findIndex((s) => s.heros), MESSAGES };

  // ------------------------------------------------------------------ le carnet du vendeur : ses visites de la semaine (papier, raturé)
  // p : { r: [a, b] } avancement (0 à 1) des deux ratures qui se tracent sur un temps
  const ENCRE = "#141417", ENCRE2 = "#55555c", AX0 = 150, ACOL = 290, AY0 = 690, ALIG = 232;
  const AGENDA = [
    [["12:30", "Appel"], ["18:00", "Visite", 1], ["19:30", "Visite"]],
    [["12:15", "Appel"], ["18:30", "Visite", 1]],
    [["09:00", "Appel"], ["12:15", "Visite"], ["17:00", "Essai"]],
    [["10:00", "Appel"], ["18:30", "Essai", "A"]],
    [["09:00", "Appel"], ["12:15", "Visite", "B"], ["17:00", "Visite"]],
    [["10:00", "Visite"]],
  ];
  function rature(ctx, x, y, w, p) {                         // un zigzag à l'encre, tracé d'un geste
    const pts = [[x - 16, y - 60], [x + w + 8, y - 42], [x - 8, y + 40], [x + w + 14, y + 60]], n = pts.length - 1, q = clamp(p) * n;
    if (q <= 0) return;
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 13; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) { const f = clamp(q - i); if (f <= 0) break; ctx.lineTo(lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)); }
    ctx.stroke();
  }
  definirTexture("agenda", { l: 2000, h: 1414,
    // centre de l'entrée qui reçoit la rature n (0 ou 1), en fraction du dessin
    entree: (n) => { const [j, k] = n ? [4, 1] : [3, 1]; return [(AX0 + j * ACOL + 120) / 2000, (AY0 + k * ALIG) / 1414]; },
    dessiner(ctx, p = {}) {
      const g = ctx.createLinearGradient(0, 0, 0, 1414); g.addColorStop(0, "#d6d6d3"); g.addColorStop(1, "#c4c4c2");
      rrect(ctx, 0, 0, 2000, 1414, 24); ctx.fillStyle = g; ctx.fill();
      [300, 707, 1114].forEach((y) => disque(ctx, 62, y, 22, "#0d0d0f"));
      texte(ctx, "Ma voiture", 150, 250, { taille: 236, graisse: 700, couleur: ENCRE, serre: -0.045 });
      texte(ctx, "à vendre · " + PRIX + INS + "€", 158, 388, { taille: 122, graisse: 500, couleur: ENCRE2 });
      texte(ctx, "Semaine du 12 octobre", 1890, 388, { taille: 54, mono: true, couleur: ENCRE2, align: "right" });
      ctx.fillStyle = ENCRE; ctx.fillRect(150, 448, 1740, 7);
      AGENDA.forEach((col, j) => {
        const x = AX0 + j * ACOL;
        texte(ctx, JOURS[j][0] + " " + JOURS[j][1], x, 548, { taille: 56, mono: true, graisse: 600, couleur: ENCRE2 });
        ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(x, 574, ACOL - 40, 4);
        col.forEach(([heure, cours, etat], k) => {
          const y = AY0 + k * ALIG;
          texte(ctx, heure, x, y - 4, { taille: 62, mono: true, graisse: 600, couleur: ENCRE });
          const w = Math.max(190, texte(ctx, cours, x, y + 56, { taille: 50, graisse: 500, couleur: ENCRE }));
          rature(ctx, x, y, w, etat === 1 ? 1 : etat === "A" ? p.r?.[0] ?? 0 : etat === "B" ? p.r?.[1] ?? 0 : 0);
        });
      });
    } });

  // ------------------------------------------------------------------ le téléphone du vendeur : l'écran verrouillé de 23:47
  // p : { recus: nombre de messages reçus, flash: 0..1 (le dernier vient d'arriver), eteint: 0..1 }
  definirTexture("verrou", { l: 560, h: 1160, dessiner(ctx, p = {}) {
    bloc(ctx, 0, 0, 560, 1160, 74, "#050506"); bloc(ctx, 14, 14, 532, 1132, 60, "#0b0b0d");
    const e = clamp(p.eteint ?? 0);
    if (e < 0.995) {
      ctx.save(); ctx.globalAlpha = 1 - e;
      texte(ctx, "Mercredi 14 octobre", 280, 170, { taille: 30, couleur: C.doux, align: "center" });
      texte(ctx, "23:47", 280, 322, { taille: 156, graisse: 500, serre: -0.04, align: "center" });
      const n = Math.max(0, Math.round(p.recus ?? 0)), flash = clamp(p.flash ?? 0);
      for (let k = 0; k < Math.min(4, n); k++) {             // les quatre derniers messages reçus, le plus récent en haut
        const m = MESSAGES[(n - 1 - k) % 3], y = 396 + k * 176;
        bloc(ctx, 34, y, 492, 156, 34, k === 0 ? `rgba(46,46,54,${0.6 + 0.4 * flash})` : "#1c1c21", blanc(k === 0 ? 0.16 + 0.5 * flash : 0.12), 2);
        disque(ctx, 84, y + 52, 28, "#34343b"); texte(ctx, m.de[0], 84, y + 62, { taille: 28, graisse: 600, couleur: C.doux, align: "center" });
        texte(ctx, m.de, 126, y + 60, { taille: 26, graisse: 600, couleur: C.doux });
        texte(ctx, "maintenant", 504, y + 60, { taille: 22, couleur: C.sourd, align: "right" });
        const s = m.lignes.join(" "); texte(ctx, s, 58, y + 118, { taille: ajuste(ctx, [s], { taille: 30, graisse: 600 }, 446), graisse: 600 });
      }
      ctx.restore();
    }
    bloc(ctx, 200, 30, 160, 34, 17, "#050506");
  } });

  // ------------------------------------------------------------------ les messages : des blocs de verre qui sortent de l'écran
  MESSAGES.forEach((m, i) => { const h = m.lignes.length > 1 ? 540 : 410; definirTexture("bulle" + i, { l: 1200, h, dessiner(ctx) {
    bloc(ctx, 5, 5, 1190, h - 10, 84, "#26262c", blanc(0.26), 5);
    disque(ctx, 122, 128, 58, "#3b3b43"); texte(ctx, m.de[0], 122, 154, { taille: 72, graisse: 600, couleur: C.doux, align: "center" });
    texte(ctx, m.de, 208, 156, { taille: 80, graisse: 600, couleur: C.doux });
    const o = { taille: 114, graisse: 600, serre: -0.03 }, taille = ajuste(ctx, m.lignes, o, 1070);
    m.lignes.forEach((s, k) => texte(ctx, s, 66, 318 + k * 132, { ...o, taille }));
  } }); });
  definirTexture("bulleN", { l: 900, h: 340, dessiner(ctx) {   // les suivants : on ne les lit plus
    bloc(ctx, 5, 5, 890, 330, 80, "#26262c", blanc(0.26), 5);
    disque(ctx, 112, 112, 50, "#3b3b43"); ctx.fillStyle = gris(120); rrect(ctx, 190, 92, 300, 40, 20); ctx.fill();
    ctx.fillStyle = gris(170); rrect(ctx, 64, 212, 700, 52, 26); ctx.fill();
  } });

  // ------------------------------------------------------------------ le planning de MKZ Motors : une plaque de verre
  // p : { payees: [23 × 0 ou 1] (véhicules vendus), heros: 1 si la case du jeudi 18:30 est peinte « Vendu » (sinon elle est vide : la case
  //       en volume la recouvre, ou elle a quitté le planning) }
  const GR = { x0: 40, y0: 340, px: 320, py: 126, l: 304, h: 112, L: 2000, H: 1240 };
  const caseVide = (ctx, x, y, e, heure) => { bloc(ctx, x, y, GR.l * e, GR.h * e, 22 * e, "#17171b", blanc(0.1), 2 * e); if (heure) texte(ctx, heure, x + 22 * e, y + 68 * e, { taille: 36 * e, mono: true, couleur: C.sourd }); };
  const casePayee = (ctx, x, y, e, heure) => {
    bloc(ctx, x, y, GR.l * e, GR.h * e, 22 * e, C.accent);
    texte(ctx, heure, x + 20 * e, y + 44 * e, { taille: 33 * e, mono: true, graisse: 600, couleur: C.surAccent });
    texte(ctx, "Vendu", x + 19 * e, y + 94 * e, { taille: 46 * e, graisse: 600, couleur: C.surAccent });
    coche(ctx, x + 256 * e, y + 68 * e, 34 * e, C.surAccent, 8 * e);
  };
  definirTexture("planning", { l: GR.L, h: GR.H, grille: GR, dessiner(ctx, p = {}) {
    plaqueDeVerre(ctx, GR.L, GR.H, 44, blanc(0.26), 5);
    bloc(ctx, 58, 52, 132, 132, 30, C.accent); texte(ctx, "MKZ", 124, 140, { taille: 56, graisse: 800, serre: -0.03, couleur: C.surAccent, align: "center" });
    texte(ctx, "MKZ Motors", 222, 168, { taille: 150, graisse: 600, serre: -0.045 });
    texte(ctx, "Dépôt-vente · semaine du 12 octobre", 64, 260, { taille: 54, couleur: C.doux });
    JOURS.forEach(([j, n], i) => texte(ctx, j + " " + n, GR.x0 + i * GR.px + GR.l / 2, 314, { taille: 40, mono: true, graisse: i === 3 ? 600 : 500, couleur: i === 3 ? C.texte : C.doux, align: "center" }));
    for (let j = 0; j < 6; j++) for (let r = 0; r < 7; r++) {
      const i = SEANCES.findIndex((s) => s.j === j && s.r === r), x = GR.x0 + j * GR.px, y = GR.y0 + r * GR.py;
      if (i >= 0 && (SEANCES[i].heros ? p.heros === 1 : p.payees && p.payees[i])) casePayee(ctx, x, y, 1, HEURES[r]); else caseVide(ctx, x, y, 1, HEURES[r]);
    }
  } });
  // Une case seule, deux fois plus grande : vide (elle se range dans le planning), ou payée (une par horaire).
  definirTexture("tuile", { l: 608, h: 224, dessiner(ctx) { caseVide(ctx, 0, 0, 2); } });
  HEURES.forEach((h, r) => definirTexture("payee" + r, { l: 608, h: 224, dessiner(ctx) { casePayee(ctx, 0, 0, 2, h); } }));

  // ------------------------------------------------------------------ la case du film : « Jeudi 18:30 · Essai routier »
  // p : { etat: 1 (allumée : un contour et une lueur), 3 « Réservé », 4 « Confirmé », 5 (le tampon la recouvre),
  //            6 (payée, elle quitte le planning), rempli: 0..1 (l'orange gagne la case de gauche à droite),
  //       inscrit: 0..1 (le mot s'inscrit), coche: 0 ou 1, contenu: 0..1 (à 0 il ne reste que l'orange : le logo) }
  definirTexture("caseHeros", { l: 1216, h: 448, dessiner(ctx, p = {}) {
    const etat = p.etat ?? 1, r = etat >= 3 ? 1 : clamp(p.rempli ?? 0), ins = clamp(p.inscrit ?? 1), cont = clamp(p.contenu ?? 1), xr = 1216 * r;
    const fond = () => rrect(ctx, 7, 7, 1202, 434, 86);
    fond(); ctx.fillStyle = "rgba(238,43,54,0.16)"; ctx.fill();
    ctx.save(); fond(); ctx.clip(); ctx.fillStyle = C.accent; ctx.fillRect(0, 0, xr, 448); ctx.restore();
    fond(); ctx.strokeStyle = C.accent; ctx.lineWidth = 14; ctx.stroke();
    if (cont < 0.999) {                                      // le logo : le monogramme MKZ apparaît dans la case
      // à la fin, la case devient un carré : le dessin y est écrasé de 1216 × 448 vers un carré, on l'étire d'autant
      ctx.save(); ctx.globalAlpha = 1 - cont; ctx.translate(608, 224); ctx.scale(1216 / 448, 1);
      texte(ctx, "MKZ", 0, 52, { taille: 150, graisse: 800, serre: -0.04, couleur: C.surAccent, align: "center" }); ctx.restore();
    }
    if (cont <= 0.01) return;
    const textes = (c1, c2) => {
      if (etat === 6) { ctx.save(); ctx.globalAlpha = cont; casePayee(ctx, 0, 0, 4, "18:30"); ctx.restore(); return; }
      texte(ctx, "Jeudi 18:30", 62, 196, { taille: 156, graisse: 600, serre: -0.045, couleur: c1 });
      if (etat <= 2) texte(ctx, "Essai routier", 64, 366, { taille: 124, graisse: 500, couleur: c2 });
      else if (etat <= 4) {
        const e = 0.55 + 0.45 * E.outBack(ins, 2.2);
        ctx.save(); ctx.globalAlpha = clamp(ins * 5); ctx.translate(64, 372); ctx.scale(e, e);
        texte(ctx, etat === 3 ? "Réservé" : "Confirmé", 0, 0, { taille: 140, graisse: 600, serre: -0.04, couleur: C.surAccent }); ctx.restore();
        if (etat === 4 && p.coche) { disque(ctx, 1066, 316, 100, C.texte); coche(ctx, 1066, 316, 104, C.surAccent, 26); }
      }
    };
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, xr, 448); ctx.clip(); textes(C.surAccent, "rgba(20,10,5,0.78)"); ctx.restore();
    if (r < 0.999) { ctx.save(); ctx.beginPath(); ctx.rect(xr, 0, 1216 - xr, 448); ctx.clip(); textes(C.accent, C.texte); ctx.restore(); }
  } });

  // ------------------------------------------------------------------ le téléphone de l'acheteur : il réserve l'essai
  // p : { contact: 0..1 (le point de contact arrive), appui: 0..1 (le bouton s'enfonce), onde: 0..1, fait: 0 ou 1 }
  definirTexture("reservation", { l: 560, h: 1160, bouton: [0.5, 880 / 1160], dessiner(ctx, p = {}) {
    bloc(ctx, 0, 0, 560, 1160, 74, "#050506"); bloc(ctx, 14, 14, 532, 1132, 60, "#131316");
    bloc(ctx, 200, 30, 160, 34, 17, "#050506");
    bloc(ctx, 48, 112, 56, 56, 14, C.accent); texte(ctx, "MKZ Motors", 122, 158, { taille: 52, graisse: 600, serre: -0.04 });
    texte(ctx, VEHICULE, 48, 266, { taille: 52, graisse: 600 }); texte(ctx, KM + " · dépôt-vente", 48, 316, { taille: 34, couleur: C.doux });
    bloc(ctx, 34, 372, 492, 340, 44, "#1c1c21", blanc(0.14), 2);
    texte(ctx, "Jeudi 18:30", 60, 494, { taille: 86, graisse: 600, serre: -0.045 });
    texte(ctx, "Essai routier", 62, 570, { taille: 46, couleur: C.doux });
    texte(ctx, PRIX + INS + "€", 62, 666, { taille: 64, graisse: 600 });
    const a = clamp(p.appui ?? 0), e = 1 - 0.06 * a;
    ctx.save(); ctx.translate(280, 880); ctx.scale(e, e);
    if (p.fait) { bloc(ctx, -246, -84, 492, 168, 84, "#1c1c21", C.accent, 6); coche(ctx, -150, 0, 56, C.accent, 15); texte(ctx, "Réservé", 44, 28, { taille: 80, graisse: 600, couleur: C.accent, align: "center" }); }
    else { bloc(ctx, -246, -84, 492, 168, 84, a > 0.01 ? `rgb(${Math.round(238 - 46 * a)},${Math.round(43 - 10 * a)},${Math.round(54 - 12 * a)})` : C.accent); texte(ctx, "Réserver", 0, 28, { taille: 84, graisse: 600, couleur: C.surAccent, align: "center" }); }
    ctx.restore();
    const c = clamp(p.contact ?? 0), o = p.onde ?? 0;
    if (c > 0.01) { const ray = lerp(150, 64, E.outCubic(c)); disque(ctx, 280, 880, ray, blanc(0.3 * c)); ctx.strokeStyle = blanc(0.85 * c); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(280, 880, ray, 0, TAU); ctx.stroke(); }
    if (o > 0.01 && o < 1) { ctx.save(); rrect(ctx, 14, 14, 532, 1132, 60); ctx.clip(); ctx.strokeStyle = blanc(0.6 * (1 - o)); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(280, 880, 64 + 330 * E.outCubic(o), 0, TAU); ctx.stroke(); ctx.restore(); }
  } });

  // ------------------------------------------------------------------ le rappel : une notification, puis la coche qui revient
  definirTexture("notif", { l: 1400, h: 440, dessiner(ctx) {
    bloc(ctx, 5, 5, 1390, 430, 80, "#202026", blanc(0.28), 5);
    bloc(ctx, 56, 48, 92, 92, 24, C.accent); texte(ctx, "MKZ Motors", 176, 118, { taille: 66, graisse: 600, couleur: C.doux });
    texte(ctx, "maintenant", 1340, 118, { taille: 54, couleur: C.sourd, align: "right" });
    const lignes = ["Rappel" + INS + ": essai routier,", "demain 18:30"], o = { taille: 116, graisse: 600, serre: -0.03 }, taille = ajuste(ctx, lignes, o, 1280);
    lignes.forEach((s, k) => texte(ctx, s, 58, 266 + k * 126, { ...o, taille }));
  } });
  definirTexture("coche", { l: 300, h: 300, dessiner(ctx) { disque(ctx, 150, 150, 147, C.texte); coche(ctx, 150, 150, 154, C.surAccent, 38); } });

  // ------------------------------------------------------------------ la vente : le tampon, le compteur
  definirTexture("tampon", { l: 1000, h: 250, dessiner(ctx) {
    bloc(ctx, 0, 0, 1000, 250, 125, C.texte); coche(ctx, 148, 126, 86, C.surAccent, 24);
    const s = "Vendu · " + PRIX + INS + "€", o = { taille: 136, graisse: 600, serre: -0.03 };
    texte(ctx, s, 258, 172, { ...o, taille: ajuste(ctx, [s], o, 690), couleur: C.surAccent });
  } });
  // p : { ventes (entier : les véhicules vendus cette semaine), bloque: 0 ou 1 }
  definirTexture("compteur", { l: 1040, h: 452, dessiner(ctx, p = {}) {
    const v = Math.floor((p.ventes ?? 0) + 1e-6), b = p.bloque ? 1 : 0;
    bloc(ctx, 7, 7, 1026, 438, 70, "#1c1c21", b ? C.accent : blanc(0.26), b ? 14 : 5);
    texte(ctx, "Cette semaine", 70, 148, { taille: 96, graisse: 500, couleur: C.doux });
    const w = texte(ctx, String(v), 62, 392, { taille: 264, graisse: 600, mono: true, serre: -0.06, couleur: b ? C.texte : blanc(0.9) });
    texte(ctx, v >= 2 ? "vendues" : "vendue", 62 + w + 36, 392, { taille: 110, graisse: 600, couleur: b ? C.texte : blanc(0.9) });
  } });

  // ------------------------------------------------------------------ la signature : le nom, le bouton (le logo est la case)
  // p : { e: 0..1 (le nom sort de derrière le logo) }
  definirTexture("nom", { l: 1100, h: 300, dessiner(ctx, p = {}) {
    const e = clamp(p.e ?? 1); if (e <= 0.005) return;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1100 * e, 300); ctx.clip();
    texte(ctx, "MKZ Motors", 8, 218, { taille: 190, graisse: 600, serre: -0.05 }); ctx.restore();
  } });
  definirTexture("bouton", { l: 1160, h: 240, dessiner(ctx) {
    bloc(ctx, 0, 0, 1160, 240, 120, C.accent); texte(ctx, "Vendre ma voiture", 580, 154, { taille: 100, graisse: 600, couleur: C.surAccent, align: "center" });
  } });
})();
