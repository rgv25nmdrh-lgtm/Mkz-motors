// MKZ Motors, publicité TikTok du dépôt-vente : tout ce qui est dessiné sur canevas.
// Le problème : le carnet du particulier qui vend seul sa voiture (visites raturées), l'écran verrouillé de son
// téléphone à 23:47, les messages et appels des acheteurs. MKZ Motors : le mandat de dépôt-vente (signé), la fiche du
// véhicule au dos (estimation, photos, annonce), le planning des essais, le dossier de vente et ses démarches, le
// tampon « Vendu », puis le logo, le bouton, le téléphone et le site de l'écran de fin.
// Tout le problème est en gris neutres ; le rouge MKZ n'existe qu'à partir du mandat.
// Aucune donnée inventée : pas de prix, pas de nom, pas de chiffre de ventes. Les seules coordonnées sont les vraies.
(() => {
  const TAU = Math.PI * 2, INS = " ";
  const blanc = (a) => `rgba(242,242,239,${a})`, gris = (v, a = 1) => `rgba(${v},${v},${v},${a})`;
  const disque = (ctx, x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const coche = (ctx, x, y, s, couleur, ep) => { ctx.strokeStyle = couleur; ctx.lineWidth = ep; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(x - 0.46 * s, y + 0.02 * s); ctx.lineTo(x - 0.12 * s, y + 0.34 * s); ctx.lineTo(x + 0.48 * s, y - 0.36 * s); ctx.stroke(); };
  // une coche qui se trace (p de 0 à 1) dans une pastille qui se remplit
  const pastille = (ctx, x, y, r, p) => {
    if (p <= 0) { ctx.strokeStyle = blanc(0.22); ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(x, y, r * 0.94, 0, TAU); ctx.stroke(); return; }
    const k = E.outBack(clamp(p * 1.6), 2.2); disque(ctx, x, y, r * Math.min(1.08, k), C.accent);
    const q = clamp((p - 0.25) / 0.75); if (q <= 0) return;
    const pts = [[x - 0.46 * r, y + 0.02 * r], [x - 0.12 * r, y + 0.34 * r], [x + 0.48 * r, y - 0.36 * r]], l1 = Math.hypot(0.34, 0.32), l2 = Math.hypot(0.6, 0.7), s = q * (l1 + l2);
    ctx.strokeStyle = C.surAccent; ctx.lineWidth = r * 0.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(...pts[0]);
    if (s <= l1) ctx.lineTo(lerp(pts[0][0], pts[1][0], s / l1), lerp(pts[0][1], pts[1][1], s / l1)); else { ctx.lineTo(...pts[1]); ctx.lineTo(lerp(pts[1][0], pts[2][0], (s - l1) / l2), lerp(pts[1][1], pts[2][1], (s - l1) / l2)); }
    ctx.stroke();
  };
  const plaqueDeVerre = (ctx, L, Hh, r, bord = blanc(0.3), ep = 5) => bloc(ctx, ep, ep, L - 2 * ep, Hh - 2 * ep, r, "rgba(15,15,18,0.94)", bord, ep);
  const ajuste = (ctx, lignes, o, max) => { let taille = o.taille; while (Math.max(...lignes.map((s) => largeur(ctx, s, { ...o, taille }))) > max && taille > 20) taille -= 2; return taille; };
  const logo = (ctx, x, y, h) => ctx.drawImage(LOGO, x, y, (h * LOGO.width) / LOGO.height, h);

  // ------------------------------------------------------------------ les données
  const JOURS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
  const HEURES = ["09:00", "10:00", "12:15", "14:30", "17:00", "18:30", "20:00"];
  // Les essais que MKZ Motors organise dans la semaine, dans l'ordre où ils s'inscrivent : [jour, horaire]. Le premier
  // est la case du jeudi 18:30, où se pose la fiche du véhicule.
  const ESSAIS = [[3, 5], [2, 1], [4, 3], [3, 0], [2, 4], [4, 1], [1, 2], [3, 3], [2, 6], [4, 5], [1, 4], [5, 2]];
  // Ce que le vendeur reçoit, la nuit : un appel manqué, puis les messages de l'annonce.
  const NOTIFS = [
    { titre: "Appel manqué", corps: "Numéro inconnu", appel: 1 },
    { titre: "Annonce · Ma voiture", corps: "Dernier prix" + INS + "?" },
    { titre: "Annonce · Ma voiture", corps: "C’est toujours disponible" + INS + "?" },
    { titre: "Annonce · Ma voiture", corps: "Désolé, je ne viens plus…" },
  ];
  const SERVICES = ["Estimation", "Photos", "Annonce", "Essais routiers", "Démarches"];
  const DEMARCHES = ["Certificat de cession", "Déclaration de cession", "Carte grise"];
  globalThis.DONNEES = { JOURS, HEURES, ESSAIS, NOTIFS, SERVICES, DEMARCHES, TEL: "07" + INS + "49" + INS + "95" + INS + "01" + INS + "23", SITE: "mkzmotors.com" };

  // ------------------------------------------------------------------ le carnet du vendeur : ses visites de la semaine (papier, raturé)
  // p : { r: [a, b] } avancement (0 à 1) des deux ratures qui se tracent d'un geste
  const ENCRE = "#141417", ENCRE2 = "#55555c", AX0 = 150, ACOL = 290, AY0 = 690, ALIG = 232;
  const AGENDA = [
    [["12:30", "Appel"], ["18:00", "Visite", 1], ["19:30", "Visite"]],
    [["12:15", "Appel"], ["18:30", "Visite", 1]],
    [["09:00", "Appel"], ["12:15", "Visite"], ["17:00", "Essai"]],
    [["10:00", "Appel"], ["18:30", "Essai", "A"]],
    [["09:00", "Appel"], ["12:15", "Visite", "B"], ["17:00", "Visite"]],
    [["10:00", "Visite"]],
  ];
  function rature(ctx, x, y, w, p) {
    const pts = [[x - 16, y - 60], [x + w + 8, y - 42], [x - 8, y + 40], [x + w + 14, y + 60]], n = pts.length - 1, q = clamp(p) * n;
    if (q <= 0) return;
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 13; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) { const f = clamp(q - i); if (f <= 0) break; ctx.lineTo(lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)); }
    ctx.stroke();
  }
  definirTexture("agenda", { l: 2000, h: 1414,
    entree: (n) => { const [j, k] = n ? [4, 1] : [3, 1]; return [(AX0 + j * ACOL + 120) / 2000, (AY0 + k * ALIG) / 1414]; },
    dessiner(ctx, p = {}) {
      const g = ctx.createLinearGradient(0, 0, 0, 1414); g.addColorStop(0, "#d6d6d3"); g.addColorStop(1, "#c4c4c2");
      rrect(ctx, 0, 0, 2000, 1414, 24); ctx.fillStyle = g; ctx.fill();
      [300, 707, 1114].forEach((y) => disque(ctx, 62, y, 22, "#0d0d0f"));
      texte(ctx, "Ma voiture", 150, 250, { taille: 236, graisse: 700, couleur: ENCRE, serre: -0.045 });
      texte(ctx, "à vendre · les visites", 158, 388, { taille: 122, graisse: 500, couleur: ENCRE2 });
      texte(ctx, "Cette semaine", 1890, 388, { taille: 54, mono: true, couleur: ENCRE2, align: "right" });
      ctx.fillStyle = ENCRE; ctx.fillRect(150, 448, 1740, 7);
      AGENDA.forEach((col, j) => {
        const x = AX0 + j * ACOL;
        texte(ctx, JOURS[j], x, 548, { taille: 56, mono: true, graisse: 600, couleur: ENCRE2 });
        ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(x, 574, ACOL - 40, 4);
        col.forEach(([heure, quoi, etat], k) => {
          const y = AY0 + k * ALIG;
          texte(ctx, heure, x, y - 4, { taille: 62, mono: true, graisse: 600, couleur: ENCRE });
          const w = Math.max(190, texte(ctx, quoi, x, y + 56, { taille: 50, graisse: 500, couleur: ENCRE }));
          rature(ctx, x, y, w, etat === 1 ? 1 : etat === "A" ? p.r?.[0] ?? 0 : etat === "B" ? p.r?.[1] ?? 0 : 0);
        });
      });
    } });

  // ------------------------------------------------------------------ le téléphone du vendeur : l'écran verrouillé de 23:47
  // p : { recus: nombre de notifications reçues, flash: 0..1 (la dernière vient d'arriver), eteint: 0..1 }
  definirTexture("verrou", { l: 560, h: 1160, dessiner(ctx, p = {}) {
    bloc(ctx, 0, 0, 560, 1160, 74, "#050506"); bloc(ctx, 14, 14, 532, 1132, 60, "#0b0b0d");
    const e = clamp(p.eteint ?? 0), n = Math.max(0, Math.round(p.recus ?? 0)), flash = clamp(p.flash ?? 0);
    if (e < 0.995 && n > 0) {
      ctx.save(); ctx.globalAlpha = 1 - e;
      texte(ctx, "Mercredi", 280, 170, { taille: 30, couleur: C.doux, align: "center" });
      texte(ctx, "23:47", 280, 322, { taille: 156, graisse: 500, serre: -0.04, align: "center" });
      for (let k = 0; k < Math.min(4, n); k++) {             // les quatre dernières reçues, la plus récente en haut
        const i = n - 1 - k, m = NOTIFS[i < 4 ? i : 1 + (i % 3)], y = 396 + k * 176;
        bloc(ctx, 34, y, 492, 156, 34, k === 0 ? `rgba(46,46,54,${0.6 + 0.4 * flash})` : "#1c1c21", blanc(k === 0 ? 0.16 + 0.5 * flash : 0.12), 2);
        disque(ctx, 84, y + 52, 26, m.appel ? "#5a1d20" : "#34343b");
        texte(ctx, m.titre, 126, y + 60, { taille: 26, graisse: 600, couleur: C.doux });
        texte(ctx, m.corps, 58, y + 118, { taille: ajuste(ctx, [m.corps], { taille: 32, graisse: 600 }, 446), graisse: 600 });
      }
      ctx.restore();
    }
    bloc(ctx, 200, 30, 160, 34, 17, "#050506");
  } });

  // ------------------------------------------------------------------ les notifications : des blocs de verre qui sortent de l'écran
  NOTIFS.forEach((m, i) => {
    const lignes = m.corps.length > 16 ? (() => { const mots = m.corps.split(" "), c = Math.ceil(mots.length / 2); return [mots.slice(0, c).join(" "), mots.slice(c).join(" ")]; })() : [m.corps];
    const h = lignes.length > 1 ? 540 : 410;
    definirTexture("bulle" + i, { l: 1200, h, dessiner(ctx) {
      bloc(ctx, 5, 5, 1190, h - 10, 84, "#26262c", blanc(0.26), 5);
      disque(ctx, 118, 124, 50, m.appel ? "#6a1f22" : "#3b3b43");
      if (m.appel) { ctx.strokeStyle = C.texte; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(118, 124, 24, 0.85 * Math.PI, 0.15 * Math.PI + 2 * Math.PI); ctx.stroke(); }
      texte(ctx, m.titre, 196, 150, { taille: 70, graisse: 600, couleur: C.doux });
      const o = { taille: 118, graisse: 600, serre: -0.03 }, taille = ajuste(ctx, lignes, o, 1070);
      lignes.forEach((s, k) => texte(ctx, s, 66, 318 + k * 132, { ...o, taille }));
    } });
  });

  // ------------------------------------------------------------------ le mandat de dépôt-vente : une plaque de verre noire
  // p : { items: 0..5 (les services qui se cochent, avec leur avancement), signe: 0..1 (la signature se trace) }
  const SIG = [[0, 40], [30, -10], [55, 30], [70, -40], [90, 50], [120, -20], [150, 30], [165, -5], [200, 10], [240, -30], [262, 26], [300, 0], [340, -18], [372, 20], [420, -6]];
  definirTexture("mandat", { l: 1016, h: 1420, dessiner(ctx, p = {}) {
    plaqueDeVerre(ctx, 1016, 1420, 64, blanc(0.26), 5);
    logo(ctx, 64, 66, 118);
    ctx.fillStyle = C.accent; ctx.fillRect(66, 232, 120, 10);
    texte(ctx, "Mandat de", 64, 352, { taille: 96, graisse: 700, serre: -0.04 });
    texte(ctx, "dépôt-vente", 64, 456, { taille: 96, graisse: 700, serre: -0.04, couleur: C.accent });
    texte(ctx, "MKZ Motors s’occupe de :", 66, 560, { taille: 46, couleur: C.doux });
    const it = p.items ?? 0;
    SERVICES.forEach((s, k) => {
      const y = 650 + k * 104, q = clamp(it - k);
      pastille(ctx, 104, y + 4, 34, q);
      texte(ctx, s, 166, y + 22, { taille: 58, graisse: 600, couleur: q > 0 ? C.texte : blanc(0.42) });
    });
    ctx.fillStyle = blanc(0.16); ctx.fillRect(66, 1196, 884, 3);
    texte(ctx, "Signature du client", 66, 1262, { taille: 40, couleur: C.sourd });
    const s = clamp(p.signe ?? 0);
    if (s > 0) {                                              // une signature d'un seul geste, à l'encre blanche
      const n = SIG.length - 1, q = s * n; ctx.strokeStyle = C.texte; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(520 + SIG[0][0], 1150 + SIG[0][1]);
      for (let i = 0; i < n; i++) { const f = clamp(q - i); if (f <= 0) break; ctx.lineTo(520 + lerp(SIG[i][0], SIG[i + 1][0], f), 1150 + lerp(SIG[i][1], SIG[i + 1][1], f)); }
      ctx.stroke();
    }
    if (s >= 1) { bloc(ctx, 724, 1222, 226, 70, 35, C.accent); texte(ctx, "Signé", 837, 1272, { taille: 44, graisse: 600, couleur: C.surAccent, align: "center" }); }
  } });

  // ------------------------------------------------------------------ la fiche du véhicule (au dos du mandat)
  // p : { e1: 0..1 (l'aiguille de l'estimation), flash: 0..1, e2: 0..1 (les photos), e3: 0..1 (l'annonce en ligne),
  //       c: [3 × 0..1] (les coches), pouls: 0..1 (le point « En ligne ») }
  const RANG = (k) => 300 + k * 360;
  definirTexture("fiche", { l: 1016, h: 1420, dessiner(ctx, p = {}) {
    plaqueDeVerre(ctx, 1016, 1420, 64, blanc(0.26), 5);
    logo(ctx, 64, 60, 92);
    texte(ctx, "Votre voiture", 64, 236, { taille: 76, graisse: 700, serre: -0.04 });
    texte(ctx, "Dépôt-vente", 952, 236, { taille: 44, couleur: C.accent, align: "right", graisse: 600 });
    const c = p.c || [0, 0, 0];
    ["Estimation", "Photos", "Annonce"].forEach((s, k) => {
      const y = RANG(k);
      bloc(ctx, 46, y, 924, 330, 44, "#1a1a1f", c[k] > 0 ? `rgba(250,15,20,${0.25 + 0.6 * c[k]})` : blanc(0.12), 4);
      texte(ctx, s, 92, y + 92, { taille: 64, graisse: 600 });
      pastille(ctx, 896, y + 70, 36, c[k]);
    });
    // 1 · l'estimation : une jauge dont l'aiguille trouve le prix du marché
    { const y = RANG(0), cx = 508, cy = y + 290, R = 150, a0 = Math.PI, e = clamp(p.e1 ?? 0), a = a0 + Math.PI * (0.08 + 0.62 * E.outBack(e, 1.8));
      ctx.lineCap = "round"; ctx.lineWidth = 26; ctx.strokeStyle = blanc(0.1); ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI); ctx.stroke();
      ctx.strokeStyle = blanc(0.3); ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI * 1.55, Math.PI * 1.85); ctx.stroke();       // la zone du prix du marché
      if (e > 0) { ctx.strokeStyle = C.accent; ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, a); ctx.stroke(); }
      ctx.strokeStyle = C.texte; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (R - 34) * Math.cos(a), cy + (R - 34) * Math.sin(a)); ctx.stroke(); disque(ctx, cx, cy, 18, C.texte);
      texte(ctx, "Prix du marché", 92, y + 160, { taille: 40, couleur: C.doux }); }
    // 2 · les photos : un viseur, un éclair, puis les vues prises
    { const y = RANG(1), e = clamp(p.e2 ?? 0), fx = 420, fy = y + 130, fw = 440, fh = 170;
      bloc(ctx, fx, fy, fw, fh, 16, "#121216");
      ctx.strokeStyle = blanc(0.75); ctx.lineWidth = 7; const k = 34;
      [[fx, fy, 1, 1], [fx + fw, fy, -1, 1], [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1]].forEach(([x, yy, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x + sx * k, yy); ctx.lineTo(x, yy); ctx.lineTo(x, yy + sy * k); ctx.stroke(); });
      ctx.strokeStyle = blanc(0.14); ctx.lineWidth = 3; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(fx + (fw * i) / 3, fy); ctx.lineTo(fx + (fw * i) / 3, fy + fh); ctx.moveTo(fx, fy + (fh * i) / 3); ctx.lineTo(fx + fw, fy + (fh * i) / 3); ctx.stroke(); }
      const vues = ["Avant", "Profil", "Intérieur"], nv = Math.floor(e * 3.999);
      vues.forEach((v, i) => { const on = i < nv; bloc(ctx, 92 + i * 0, y + 140 + i * 56, 260, 44, 22, on ? "rgba(250,15,20,0.22)" : "#202026"); texte(ctx, v, 116, y + 172 + i * 56, { taille: 30, graisse: 600, couleur: on ? C.texte : C.sourd }); });
      const fl = clamp(p.flash ?? 0); if (fl > 0) { ctx.save(); ctx.globalAlpha = fl; bloc(ctx, fx, fy, fw, fh, 16, C.texte); ctx.restore(); } }
    // 3 · l'annonce : brouillon, puis « En ligne »
    { const y = RANG(2), e = clamp(p.e3 ?? 0), x = 92, yy = y + 150;
      bloc(ctx, x, yy, 820, 140, 30, "#121216", blanc(0.1), 3);
      texte(ctx, "Votre annonce", x + 36, yy + 60, { taille: 40, graisse: 600, couleur: C.doux });
      texte(ctx, "Publiée sur les sites d’annonces", x + 36, yy + 110, { taille: 30, couleur: C.sourd });
      const on = e >= 0.5, bw = 236, bx = x + 820 - bw - 26, by = yy + 36;
      bloc(ctx, bx, by, bw, 68, 34, on ? C.accent : "#26262c");
      if (on) disque(ctx, bx + 40, by + 34, 11 + 5 * clamp(p.pouls ?? 0), C.surAccent);
      texte(ctx, on ? "En ligne" : "Brouillon", bx + (on ? 140 : bw / 2), by + 47, { taille: 34, graisse: 600, couleur: on ? C.surAccent : C.sourd, align: "center" }); }
  } });

  // ------------------------------------------------------------------ le planning des essais : une plaque de verre
  // p : { essais: [ESSAIS.length × 0 ou 1] (les cases inscrites, peintes sur la plaque) }
  const GR = { x0: 40, y0: 340, px: 320, py: 126, l: 304, h: 112, L: 2000, H: 1240 };
  const caseVide = (ctx, x, y, e, heure) => { bloc(ctx, x, y, GR.l * e, GR.h * e, 22 * e, "#17171b", blanc(0.1), 2 * e); if (heure) texte(ctx, heure, x + 22 * e, y + 68 * e, { taille: 36 * e, mono: true, couleur: C.sourd }); };
  const caseEssai = (ctx, x, y, e, heure, mot = "Essai") => {
    bloc(ctx, x, y, GR.l * e, GR.h * e, 22 * e, C.accent);
    texte(ctx, heure, x + 20 * e, y + 44 * e, { taille: 33 * e, mono: true, graisse: 600, couleur: C.surAccent });
    texte(ctx, mot, x + 19 * e, y + 94 * e, { taille: 46 * e, graisse: 600, couleur: C.surAccent });
    coche(ctx, x + 256 * e, y + 68 * e, 34 * e, C.surAccent, 8 * e);
  };
  definirTexture("planning", { l: GR.L, h: GR.H, grille: GR, dessiner(ctx, p = {}) {
    plaqueDeVerre(ctx, GR.L, GR.H, 44, blanc(0.26), 5);
    logo(ctx, 46, 40, 160);
    texte(ctx, "Essais routiers · cette semaine", 64, 260, { taille: 54, couleur: C.doux });
    JOURS.forEach((j, i) => texte(ctx, j, GR.x0 + i * GR.px + GR.l / 2, 314, { taille: 40, mono: true, graisse: i === 3 ? 600 : 500, couleur: i === 3 ? C.texte : C.doux, align: "center" }));
    for (let j = 0; j < 6; j++) for (let r = 0; r < 7; r++) {
      const i = ESSAIS.findIndex(([a, b]) => a === j && b === r), x = GR.x0 + j * GR.px, y = GR.y0 + r * GR.py;
      if (i >= 0 && p.essais && p.essais[i]) caseEssai(ctx, x, y, 1, HEURES[r]); else caseVide(ctx, x, y, 1, HEURES[r]);
    }
  } });
  HEURES.forEach((h, r) => definirTexture("essai" + r, { l: 608, h: 224, dessiner(ctx) { caseEssai(ctx, 0, 0, 2, h); } }));

  // ------------------------------------------------------------------ le dossier de vente : les démarches
  // p : { coches: 0..3 (les démarches qui se cochent, avec leur avancement) }
  definirTexture("dossier", { l: 1100, h: 1500, dessiner(ctx, p = {}) {
    plaqueDeVerre(ctx, 1100, 1500, 64, blanc(0.26), 5);
    logo(ctx, 66, 64, 110);
    texte(ctx, "Dossier de vente", 66, 330, { taille: 92, graisse: 700, serre: -0.04 });
    texte(ctx, "Les démarches, faites pour vous", 68, 404, { taille: 44, couleur: C.doux });
    const n = p.coches ?? 0;
    DEMARCHES.forEach((s, k) => {
      const y = 500 + k * 150, q = clamp(n - k);
      bloc(ctx, 50, y, 1000, 124, 36, "#1a1a1f", q > 0 ? `rgba(250,15,20,${0.2 + 0.5 * q})` : blanc(0.1), 4);
      pastille(ctx, 120, y + 62, 34, q);
      texte(ctx, s, 184, y + 82, { taille: 54, graisse: 600, couleur: q > 0 ? C.texte : blanc(0.5) });
    });
    ctx.strokeStyle = blanc(0.12); ctx.lineWidth = 4; ctx.setLineDash([18, 14]); rrect(ctx, 50, 1000, 1000, 420, 40); ctx.stroke(); ctx.setLineDash([]);
  } });

  // ------------------------------------------------------------------ la vente, puis l'écran de fin
  definirTexture("tampon", { l: 1000, h: 250, dessiner(ctx) {
    bloc(ctx, 0, 0, 1000, 250, 125, C.texte); coche(ctx, 300, 126, 92, C.surAccent, 26);
    texte(ctx, "Vendu", 580, 172, { taille: 150, graisse: 700, serre: -0.04, couleur: C.surAccent, align: "center" });
  } });
  definirTexture("logo", { l: 1360, h: 400, dessiner(ctx) {
    bloc(ctx, 5, 5, 1350, 390, 70, "rgba(10,10,12,0.96)", blanc(0.22), 5);
    const h = 280, w = (h * LOGO.width) / LOGO.height; ctx.drawImage(LOGO, (1360 - w) / 2, (400 - h) / 2, w, h);
  } });
  definirTexture("bouton", { l: 1160, h: 240, dessiner(ctx) {
    bloc(ctx, 0, 0, 1160, 240, 120, C.accent); texte(ctx, "Vendre ma voiture", 580, 154, { taille: 100, graisse: 600, couleur: C.surAccent, align: "center" });
  } });
  definirTexture("contact", { l: 1400, h: 300, dessiner(ctx) {
    bloc(ctx, 5, 5, 1390, 290, 145, "rgba(10,10,12,0.96)", blanc(0.3), 5);
    disque(ctx, 150, 150, 92, C.accent);                         // un combiné, dans une pastille rouge
    ctx.save(); ctx.translate(150, 150); ctx.rotate(-0.6); ctx.fillStyle = C.surAccent;
    rrect(ctx, -16, -52, 32, 104, 14); ctx.fill(); rrect(ctx, -32, -60, 50, 34, 14); ctx.fill(); rrect(ctx, -32, 26, 50, 34, 14); ctx.fill(); ctx.restore();
    texte(ctx, DONNEES.TEL, 790, 190, { taille: 124, graisse: 600, mono: true, serre: -0.03, align: "center" });
  } });
  definirTexture("site", { l: 1400, h: 200, dessiner(ctx) {
    texte(ctx, DONNEES.SITE, 700, 132, { taille: 104, graisse: 600, serre: -0.03, couleur: C.texte, align: "center" });
  } });
})();
