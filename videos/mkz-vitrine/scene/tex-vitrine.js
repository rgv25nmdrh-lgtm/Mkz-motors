// MKZ Motors, la vitrine du dépôt-vente : tout ce qui est dessiné sur canevas. Rien n'est chargé, sauf le logo.
// Les six écrans montrent les six étapes du dépôt-vente, animées image par image (48 images à 12 par seconde,
// de 4 à 8 s) : l'estimation, les photos, l'annonce, l'essai, le paiement, les démarches.
// Chaque dessin est une fonction pure de ses paramètres.
// LES DONNÉES SONT DES EXEMPLES (plaque, voiture, prix, vues, voitures du mur) : à remplacer avant diffusion.
(() => {
  const blanc = (a) => `rgba(242,242,239,${a})`, rouge = (a) => `rgba(250,15,20,${a})`;
  const verre = (ctx, L, Hh, r, bord = blanc(0.3), ep = 5) => bloc(ctx, ep, ep, L - 2 * ep, Hh - 2 * ep, r, "rgba(15,15,18,0.94)", bord, ep);
  const ajuste = (ctx, s, o, max) => { let taille = o.taille; while (largeur(ctx, s, { ...o, taille }) > max && taille > 20) taille -= 2; return taille; };
  const milliers = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  // un prix : chiffres à chasse fixe (ils ne bougent pas pendant qu'ils comptent), espaces fines entre les milliers et
  // avant « € ». o : options de texte() (mono imposé), avec align. Rend la largeur.
  function prix(ctx, n, x, y, o = {}, avant = "") {
    const s = avant + milliers(n), fin = " €", oo = { ...o, mono: true, align: "left" }, cw = largeur(ctx, "0", oo), esp = cw * 0.32;
    const parts = s.split(" "), lp = parts.map((q) => largeur(ctx, q, oo)), le = largeur(ctx, "€", oo);
    const tot = lp.reduce((a, c) => a + c, 0) + esp * parts.length + le;
    let px = o.align === "center" ? x - tot / 2 : o.align === "right" ? x - tot : x;
    parts.forEach((q, k) => { texte(ctx, q, px, y, oo); px += lp[k] + esp; }); texte(ctx, "€", px, y, oo); void fin;
    return tot;
  }

  // ------------------------------------------------------------------ les données (des exemples)
  const PLAQUE = "AB123CD", MODELE = "Citadine", ANNEE = "2019", KM = "68 000 km", PRIX = 11900;
  const VOITURE = `${MODELE} · ${ANNEE} · ${KM}`;
  const plaqueTexte = (s) => s.slice(0, 2) + (s.length >= 2 ? "-" : "") + s.slice(2, 5) + (s.length >= 5 ? "-" : "") + s.slice(5, 7);
  const ETAPES = ["Estimation", "Photos pro", "Annonce en ligne", "Essais", "Paiement sécurisé", "Démarches"];
  // le mur : des voitures déjà vendues (type, année, km, prix, teinte de la carrosserie)
  const VENDUES = [["Break", 2018, "112 000 km", 9400, "#3c3f47"], ["SUV", 2020, "54 000 km", 18900, "#e6e6e2"], ["Compacte", 2021, "31 000 km", 15500, "#8a1418"],
    ["Citadine", 2017, "89 000 km", 7900, "#c9cbd0"], ["Monospace", 2016, "126 000 km", 8700, "#5d616b"], ["Berline", 2019, "77 000 km", 13600, "#17171b"]];
  globalThis.VITRINE = { PRIX, ETAPES, N: 48 };

  // ------------------------------------------------------------------ une voiture de profil (vers la droite)
  // x, y : coin haut gauche ; l : longueur ; o : { teinte (carrosserie), miroir }. Hauteur totale : 0,39 l.
  function voiture(ctx, x, y, l, o = {}) {
    const teinte = o.teinte || "#cfd1d6";
    ctx.save(); ctx.translate(x, y); if (o.miroir) { ctx.translate(l, 0); ctx.scale(-1, 1); } ctx.scale(l, l); ctx.lineJoin = "round"; ctx.lineCap = "round";
    // l'ombre au sol
    ctx.save(); ctx.translate(0.5, 0.385); ctx.scale(1, 0.06); const go = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.56); go.addColorStop(0, "rgba(0,0,0,0.75)"); go.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = go; ctx.beginPath(); ctx.arc(0, 0, 0.56, 0, 7); ctx.fill(); ctx.restore();
    // la carrosserie
    const corps = () => {
      ctx.beginPath(); ctx.moveTo(0.04, 0.3); ctx.lineTo(0.022, 0.286); ctx.lineTo(0.018, 0.205); ctx.quadraticCurveTo(0.02, 0.162, 0.046, 0.136); ctx.lineTo(0.118, 0.066);
      ctx.quadraticCurveTo(0.14, 0.044, 0.19, 0.041); ctx.lineTo(0.44, 0.037); ctx.quadraticCurveTo(0.49, 0.037, 0.532, 0.07); ctx.lineTo(0.628, 0.136);
      ctx.quadraticCurveTo(0.65, 0.149, 0.69, 0.153); ctx.lineTo(0.9, 0.168); ctx.quadraticCurveTo(0.96, 0.176, 0.975, 0.21); ctx.lineTo(0.982, 0.265);
      ctx.quadraticCurveTo(0.982, 0.295, 0.96, 0.3); ctx.lineTo(0.895, 0.3); ctx.arc(0.79, 0.3, 0.105, 0, Math.PI, true); ctx.lineTo(0.315, 0.3); ctx.arc(0.21, 0.3, 0.105, 0, Math.PI, true); ctx.closePath();
    };
    corps(); ctx.fillStyle = teinte; ctx.fill();
    const gc = ctx.createLinearGradient(0, 0.04, 0, 0.3); gc.addColorStop(0, "rgba(255,255,255,0.32)"); gc.addColorStop(0.42, "rgba(255,255,255,0.06)"); gc.addColorStop(0.5, "rgba(0,0,0,0.12)"); gc.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = gc; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 0.004; ctx.stroke();
    // les vitres (custode, vitre arrière, vitre avant)
    const gv = ctx.createLinearGradient(0, 0.05, 0, 0.13); gv.addColorStop(0, "#2b2f38"); gv.addColorStop(1, "#0b0c10"); ctx.fillStyle = gv;
    ctx.beginPath(); ctx.moveTo(0.088, 0.13); ctx.lineTo(0.128, 0.078); ctx.quadraticCurveTo(0.14, 0.062, 0.158, 0.058); ctx.lineTo(0.168, 0.13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.205, 0.055); ctx.lineTo(0.36, 0.052); ctx.lineTo(0.36, 0.13); ctx.lineTo(0.188, 0.13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.38, 0.052); ctx.lineTo(0.44, 0.051); ctx.quadraticCurveTo(0.482, 0.052, 0.515, 0.08); ctx.lineTo(0.594, 0.13); ctx.lineTo(0.38, 0.13); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(0.25, 0.054); ctx.lineTo(0.3, 0.053); ctx.lineTo(0.255, 0.13); ctx.lineTo(0.205, 0.13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.43, 0.051); ctx.lineTo(0.462, 0.052); ctx.lineTo(0.425, 0.13); ctx.lineTo(0.393, 0.13); ctx.closePath(); ctx.fill(); ctx.restore();
    // portières, poignées, rétroviseur, ligne de caisse
    ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 0.004;
    ctx.beginPath(); ctx.moveTo(0.37, 0.132); ctx.lineTo(0.372, 0.29); ctx.moveTo(0.606, 0.138); ctx.quadraticCurveTo(0.625, 0.2, 0.616, 0.262); ctx.moveTo(0.178, 0.132); ctx.quadraticCurveTo(0.16, 0.2, 0.17, 0.235); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.45)"; rrect(ctx, 0.31, 0.158, 0.04, 0.009, 0.004); ctx.fill(); rrect(ctx, 0.545, 0.158, 0.04, 0.009, 0.004); ctx.fill();
    ctx.fillStyle = teinte; ctx.beginPath(); ctx.moveTo(0.578, 0.122); ctx.lineTo(0.618, 0.114); ctx.lineTo(0.625, 0.138); ctx.lineTo(0.59, 0.14); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 0.003; ctx.beginPath(); ctx.moveTo(0.04, 0.186); ctx.quadraticCurveTo(0.5, 0.176, 0.95, 0.196); ctx.stroke();
    // les feux : avant blanc, arrière rouge
    ctx.fillStyle = "#f6f3e8"; ctx.beginPath(); ctx.moveTo(0.925, 0.172); ctx.lineTo(0.966, 0.186); ctx.lineTo(0.972, 0.206); ctx.lineTo(0.93, 0.196); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.moveTo(0.02, 0.152); ctx.lineTo(0.046, 0.128); ctx.lineTo(0.05, 0.165); ctx.lineTo(0.021, 0.178); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#0c0c0e"; rrect(ctx, 0.022, 0.255, 0.07, 0.03, 0.01); ctx.fill(); rrect(ctx, 0.9, 0.255, 0.082, 0.03, 0.01); ctx.fill();
    // les roues
    [0.21, 0.79].forEach((cx) => {
      ctx.fillStyle = "#08080a"; ctx.beginPath(); ctx.arc(cx, 0.3, 0.083, 0, 7); ctx.fill();
      const gr = ctx.createRadialGradient(cx - 0.015, 0.285, 0.005, cx, 0.3, 0.055); gr.addColorStop(0, "#e9e9e6"); gr.addColorStop(1, "#7d7f86"); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, 0.3, 0.052, 0, 7); ctx.fill();
      ctx.strokeStyle = "#2a2b30"; ctx.lineWidth = 0.008; ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; ctx.moveTo(cx + 0.016 * Math.cos(a), 0.3 + 0.016 * Math.sin(a)); ctx.lineTo(cx + 0.046 * Math.cos(a), 0.3 + 0.046 * Math.sin(a)); } ctx.stroke();
      ctx.fillStyle = "#2a2b30"; ctx.beginPath(); ctx.arc(cx, 0.3, 0.013, 0, 7); ctx.fill();
    });
    ctx.restore();
  }

  // ------------------------------------------------------------------ petits dessins communs
  function coche(ctx, x, y, r, fond = C.accent, trait = "#ffffff", p = 1) {   // une pastille cochée ; p : progression du trait
    ctx.fillStyle = fond; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (p <= 0) return;
    ctx.strokeStyle = trait; ctx.lineWidth = r * 0.22; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const a = [x - r * 0.42, y + r * 0.02], m = [x - r * 0.1, y + r * 0.34], b = [x + r * 0.46, y - r * 0.32], q = clamp(p * 2), s = clamp(p * 2 - 1);
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(lerp(a[0], m[0], q), lerp(a[1], m[1], q)); if (s > 0) ctx.lineTo(lerp(m[0], b[0], s), lerp(m[1], b[1], s)); ctx.stroke();
  }
  function plaqueFr(ctx, x, y, w, h, s, o = {}) {        // une plaque d'immatriculation française (fond blanc, bande bleue)
    const r = h * 0.12, bande = h * 0.52;
    bloc(ctx, x, y, w, h, r, "#f4f4f1", o.bord || "#cfcfca", Math.max(2, h * 0.035));
    ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip(); ctx.fillStyle = "#1f3f9a"; ctx.fillRect(x, y, bande, h); ctx.restore();
    ctx.fillStyle = "#f1c400"; for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; ctx.beginPath(); ctx.arc(x + bande / 2 + h * 0.15 * Math.cos(a), y + h * 0.32 + h * 0.15 * Math.sin(a), h * 0.024, 0, 7); ctx.fill(); }
    texte(ctx, "F", x + bande / 2, y + h * 0.86, { taille: h * 0.34, graisse: 700, couleur: "#ffffff", align: "center" });
    if (s) { const o2 = { taille: h * 0.7, graisse: 600, mono: true, serre: 0.02 }; texte(ctx, s, x + bande + (w - bande) / 2, y + h * 0.76, { ...o2, taille: ajuste(ctx, s, o2, w - bande - h * 0.3), couleur: "#111114", align: "center" }); }
  }
  function entete(ctx, n) {                              // le haut de chaque écran : le logo, le numéro de l'étape
    ctx.fillStyle = "#0e0e11"; ctx.fillRect(0, 0, 540, 960);
    const h = 40; ctx.drawImage(LOGO, 32, 34, (h * LOGO.width) / LOGO.height, h);
    if (n) texte(ctx, `${n}/6`, 508, 66, { taille: 28, mono: true, couleur: C.doux, align: "right" });
    ctx.fillStyle = C.ligne; ctx.fillRect(0, 108, 540, 2);
  }
  function titreEcran(ctx, titre, sous) {
    const o = { taille: 54, graisse: 600, serre: -0.03 }; texte(ctx, titre, 34, 186, { ...o, taille: ajuste(ctx, titre, o, 470) });
    if (sous) { const o2 = { taille: 28, couleur: C.doux }; texte(ctx, sous, 36, 232, { ...o2, taille: ajuste(ctx, sous, o2, 470) }); }
  }
  function studio(ctx, x, y, w, h, r) {                 // un fond de studio photo : une lueur, un sol
    ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip();
    const g = ctx.createRadialGradient(x + w / 2, y + h * 0.42, 10, x + w / 2, y + h * 0.5, w * 0.75); g.addColorStop(0, "#3a3a42"); g.addColorStop(1, "#121216"); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const s = ctx.createLinearGradient(0, y + h * 0.66, 0, y + h); s.addColorStop(0, "rgba(255,255,255,0.07)"); s.addColorStop(1, "rgba(0,0,0,0.3)"); ctx.fillStyle = s; ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
    ctx.restore();
  }

  // ------------------------------------------------------------------ les six écrans (u : secondes depuis le début, de 0 à 3,92)
  const ECRANS = [
    // 1 · l'estimation : la jauge monte, le prix se compte, se bloque
    (ctx, u) => {
      entete(ctx, 1); titreEcran(ctx, "Estimation", `${plaqueTexte(PLAQUE)} · ${MODELE} ${ANNEE}`);
      voiture(ctx, 50, 282, 440);
      const p = E.outCubic(prog(u, 0.05, 0.95)), cx = 270, cy = 760, r = 170, a0 = Math.PI, a1 = Math.PI * (1 + 0.72 * p);
      ctx.lineCap = "round"; ctx.lineWidth = 24; ctx.strokeStyle = C.ligne2; ctx.beginPath(); ctx.arc(cx, cy, r, a0, 2 * Math.PI); ctx.stroke();
      ctx.strokeStyle = C.accent; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
      ctx.strokeStyle = blanc(0.35); ctx.lineWidth = 3; for (let k = 0; k <= 10; k++) { const a = Math.PI * (1 + k / 10); ctx.beginPath(); ctx.moveTo(cx + (r - 30) * Math.cos(a), cy + (r - 30) * Math.sin(a)); ctx.lineTo(cx + (r - 44) * Math.cos(a), cy + (r - 44) * Math.sin(a)); ctx.stroke(); }
      ctx.strokeStyle = C.texte; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (r - 52) * Math.cos(a1), cy + (r - 52) * Math.sin(a1)); ctx.stroke();
      ctx.fillStyle = C.texte; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.fill();
      prix(ctx, Math.round((PRIX * p) / 100) * 100, cx, 862, { taille: 80, graisse: 600, align: "center", couleur: p >= 0.999 ? C.accent : C.texte });
      texte(ctx, `${KM} · prix conseillé`, cx, 914, { taille: 27, couleur: C.doux, align: "center" });
    },
    // 2 · les photos : le flash, les vignettes qui se remplissent
    (ctx, u) => {
      entete(ctx, 2); titreEcran(ctx, "Photos pro", "En studio, sous tous les angles");
      const x = 30, y = 268, w = 480, h = 330, flashs = Array.from({ length: 8 }, (_, k) => 0.15 + 0.42 * k), n = compte(flashs, u);
      studio(ctx, x, y, w, h, 22); voiture(ctx, 66, 372, 408);
      ctx.strokeStyle = blanc(0.85); ctx.lineWidth = 4; ctx.lineCap = "square";
      [[x + 18, y + 18, 1, 1], [x + w - 18, y + 18, -1, 1], [x + 18, y + h - 18, 1, -1], [x + w - 18, y + h - 18, -1, -1]].forEach(([a, b, sx, sy]) => { ctx.beginPath(); ctx.moveTo(a, b + 36 * sy); ctx.lineTo(a, b); ctx.lineTo(a + 36 * sx, b); ctx.stroke(); });
      ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(x + 44, y + 52, 9, 0, 7); ctx.fill(); texte(ctx, `${String(n * 3).padStart(2, "0")} / 24`, x + 62, y + 62, { taille: 26, mono: true });
      const f = flashs.reduce((m, tf) => Math.max(m, impulsion(u, tf, 0.09)), 0); if (f > 0.01) { ctx.save(); rrect(ctx, x, y, w, h, 22); ctx.clip(); ctx.fillStyle = `rgba(255,255,255,${(0.9 * f).toFixed(3)})`; ctx.fillRect(x, y, w, h); ctx.restore(); }
      for (let k = 0; k < 8; k++) {
        const tx = 30 + (k % 4) * 123, ty = 630 + Math.floor(k / 4) * 92, fait = k < n;
        if (fait) { studio(ctx, tx, ty, 111, 80, 10); voiture(ctx, tx + 8, ty + 24, 95, { miroir: k % 2 }); }
        else { ctx.setLineDash([8, 7]); bloc(ctx, tx + 1, ty + 1, 109, 78, 10, null, C.ligne2, 2); ctx.setLineDash([]); }
      }
      if (n >= 8) { coche(ctx, 52, 880, 20); texte(ctx, "Prêtes pour l’annonce", 84, 891, { taille: 30, graisse: 600, couleur: C.accent }); }
      else texte(ctx, "Prise de vue…", 36, 891, { taille: 30, couleur: C.doux });
    },
    // 3 · l'annonce : en ligne, les vues montent, une demande d'essai arrive
    (ctx, u) => {
      entete(ctx, 3);
      studio(ctx, 24, 128, 492, 300, 22); voiture(ctx, 60, 226, 420);
      const pulse = 0.5 + 0.5 * Math.sin(u * 7); bloc(ctx, 42, 146, 170, 46, 23, C.accent); ctx.fillStyle = `rgba(255,255,255,${(0.6 + 0.4 * pulse).toFixed(3)})`; ctx.beginPath(); ctx.arc(66, 169, 7, 0, 7); ctx.fill();
      texte(ctx, "EN LIGNE", 84, 179, { taille: 24, mono: true, graisse: 600, couleur: "#ffffff" });
      [0, 1, 2, 3, 4].forEach((k) => { ctx.fillStyle = k === 0 ? C.texte : C.ligne2; ctx.beginPath(); ctx.arc(232 + k * 19, 448, 5, 0, 7); ctx.fill(); });
      texte(ctx, `${MODELE} · ${ANNEE}`, 30, 518, { taille: 46, graisse: 600, serre: -0.03 });
      texte(ctx, `${KM} · Essence · Manuelle`, 30, 562, { taille: 27, couleur: C.doux });
      prix(ctx, PRIX, 30, 642, { taille: 66, graisse: 600, couleur: C.accent });
      const vues = Math.floor(1248 * E.outCubic(prog(u, 0, 3.6))), coeurs = Math.floor(37 * E.outCubic(prog(u, 0.3, 3.2)));
      ctx.strokeStyle = C.doux; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(48, 700, 17, 11, 0, 0, 7); ctx.stroke(); ctx.fillStyle = C.doux; ctx.beginPath(); ctx.arc(48, 700, 5, 0, 7); ctx.fill();
      texte(ctx, `${milliers(vues)} vues`, 76, 710, { taille: 28, mono: true, couleur: C.texte });
      ctx.fillStyle = C.accent; ctx.beginPath(); ctx.moveTo(318, 712); ctx.bezierCurveTo(296, 696, 300, 684, 310, 684); ctx.bezierCurveTo(316, 684, 318, 690, 318, 692); ctx.bezierCurveTo(318, 690, 320, 684, 326, 684); ctx.bezierCurveTo(336, 684, 340, 696, 318, 712); ctx.fill();
      texte(ctx, `${coeurs} favoris`, 348, 710, { taille: 28, mono: true, couleur: C.texte });
      const s = E.outBack(prog(u, 1.7, 0.35), 1.4); if (s > 0) {
        const y = lerp(990, 770, s); bloc(ctx, 24, y, 492, 140, 26, C.surface2, C.accent, 4);
        bloc(ctx, 46, y + 30, 80, 80, 18, rouge(0.16)); ctx.strokeStyle = C.accent; ctx.lineWidth = 4; rrect(ctx, 62, y + 50, 48, 44, 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(62, y + 62); ctx.lineTo(110, y + 62); ctx.moveTo(74, y + 44); ctx.lineTo(74, y + 54); ctx.moveTo(98, y + 44); ctx.lineTo(98, y + 54); ctx.stroke();
        texte(ctx, "Demande d’essai", 146, y + 64, { taille: 32, graisse: 600 }); texte(ctx, "Jeudi 18:30", 146, y + 104, { taille: 27, couleur: C.doux });
      }
    },
    // 4 · l'essai : le trajet se trace sur la carte, la voiture le suit
    (ctx, u) => {
      entete(ctx, 4); titreEcran(ctx, "Essai routier", "Jeudi 18:30 · organisé par MKZ");
      const x = 24, y = 262, w = 492, h = 500; ctx.save(); rrect(ctx, x, y, w, h, 24); ctx.clip(); ctx.fillStyle = "#121216"; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#1e1e24"; ctx.lineCap = "butt";
      [[x, y + 120, x + w, y + 90, 16], [x, y + 300, x + w, y + 340, 22], [x + 120, y, x + 90, y + h, 18], [x + 330, y, x + 380, y + h, 14], [x + 200, y + h, x + w, y + 180, 12], [x, y + 450, x + 240, y + 380, 10]].forEach(([a, b, c, d, e]) => { ctx.lineWidth = e; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
      ctx.fillStyle = "#18181d"; [[x + 160, y + 140, 120, 120], [x + 400, y + 380, 70, 90], [x + 20, y + 170, 70, 100]].forEach(([a, b, c, d]) => { rrect(ctx, a, b, c, d, 10); ctx.fill(); });
      const R = [[104, 690], [108, 560], [214, 530], [256, 400], [380, 362], [420, 470], [358, 600], [236, 640], [104, 690]];
      const seg = R.slice(1).map((q, k) => Math.hypot(q[0] - R[k][0], q[1] - R[k][1])), tot = seg.reduce((a, c) => a + c, 0), p = E.inOutCubic(prog(u, 0.2, 2.6));
      const point = (d) => { for (let k = 0; k < seg.length; k++) { if (d <= seg[k] || k === seg.length - 1) { const f = clamp(d / seg[k]); return [lerp(R[k][0], R[k + 1][0], f), lerp(R[k][1], R[k + 1][1], f)]; } d -= seg[k]; } };
      ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = rouge(0.22); ctx.lineWidth = 10; ctx.beginPath(); R.forEach((q, k) => (k ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.stroke();
      ctx.save(); ctx.shadowColor = C.accent; ctx.shadowBlur = 18; ctx.strokeStyle = C.accent; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(...R[0]);
      let d = p * tot; for (let k = 0; k < seg.length && d > 0; k++) { const f = clamp(d / seg[k]); ctx.lineTo(lerp(R[k][0], R[k + 1][0], f), lerp(R[k][1], R[k + 1][1], f)); d -= seg[k]; } ctx.stroke(); ctx.restore();
      bloc(ctx, R[0][0] - 18, R[0][1] + 16, 120, 40, 12, C.texte); texte(ctx, "MKZ", R[0][0] + 42, R[0][1] + 45, { taille: 24, graisse: 700, couleur: C.fond, align: "center" });
      const v = point(p * tot); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(v[0], v[1], 19, 0, 7); ctx.fill(); ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(v[0], v[1], 13, 0, 7); ctx.fill();
      ctx.restore();
      texte(ctx, `${Math.round(12 * p)} km`, 36, 836, { taille: 52, mono: true, graisse: 600 }); texte(ctx, `${Math.round(25 * p)} min`, 270, 836, { taille: 52, mono: true, graisse: 600 });
      if (u >= 2.85) { const q = E.outBack(prog(u, 2.85, 0.25), 2); ctx.save(); ctx.translate(36, 900); ctx.scale(q, q); coche(ctx, 18, -10, 20); texte(ctx, "Essai terminé", 50, 0, { taille: 30, graisse: 600, couleur: C.accent }); ctx.restore(); }
    },
    // 5 · le paiement : le bouclier se trace, la coche, puis le virement arrive
    (ctx, u) => {
      entete(ctx, 5); titreEcran(ctx, "Paiement sécurisé", "Vérifié avant la remise des clés");
      const cx = 270, cy = 420, p = E.inOutCubic(prog(u, 0.1, 0.9)), ok = prog(u, 1.05, 0.3);
      ctx.save(); ctx.translate(cx, cy); const bouclier = () => { ctx.beginPath(); ctx.moveTo(0, -130); ctx.bezierCurveTo(50, -100, 90, -96, 110, -96); ctx.bezierCurveTo(110, 20, 80, 90, 0, 140); ctx.bezierCurveTo(-80, 90, -110, 20, -110, -96); ctx.bezierCurveTo(-90, -96, -50, -100, 0, -130); ctx.closePath(); };
      if (ok > 0) { bouclier(); ctx.fillStyle = rouge(0.9 * ok); ctx.fill(); }
      bouclier(); ctx.setLineDash([900 * p, 900]); ctx.strokeStyle = ok > 0 ? C.accent : C.texte; ctx.lineWidth = 10; ctx.lineJoin = "round"; ctx.stroke(); ctx.setLineDash([]);
      if (ok > 0) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 18; ctx.lineCap = "round"; const a = [-46, 4], m = [-12, 40], b = [52, -36], q = clamp(ok * 2), s = clamp(ok * 2 - 1); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(lerp(a[0], m[0], q), lerp(a[1], m[1], q)); if (s > 0) ctx.lineTo(lerp(m[0], b[0], s), lerp(m[1], b[1], s)); ctx.stroke(); }
      ctx.restore();
      if (ok > 0) texte(ctx, "Paiement vérifié", cx, 620, { taille: 40, graisse: 600, align: "center", opacite: ok });
      const s = E.outBack(prog(u, 2.45, 0.35), 1.4); if (s > 0) {
        const y = lerp(990, 680, s); bloc(ctx, 24, y, 492, 210, 28, C.surface2, C.accent, 4);
        bloc(ctx, 48, y + 32, 70, 70, 16, rouge(0.16)); ctx.strokeStyle = C.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(60, y + 58); ctx.lineTo(83, y + 44); ctx.lineTo(106, y + 58); ctx.moveTo(64, y + 62); ctx.lineTo(64, y + 84); ctx.moveTo(76, y + 62); ctx.lineTo(76, y + 84); ctx.moveTo(90, y + 62); ctx.lineTo(90, y + 84); ctx.moveTo(102, y + 62); ctx.lineTo(102, y + 84); ctx.moveTo(58, y + 90); ctx.lineTo(108, y + 90); ctx.stroke();
        texte(ctx, "Virement reçu", 138, y + 64, { taille: 32, graisse: 600 }); texte(ctx, "Sur votre compte", 138, y + 98, { taille: 25, couleur: C.doux });
        prix(ctx, PRIX, 48, y + 178, { taille: 62, graisse: 600, couleur: C.accent }, "+ ");
      }
    },
    // 6 · les démarches : quatre papiers se cochent, puis le tampon
    (ctx, u) => {
      entete(ctx, 6); titreEcran(ctx, "Démarches", "Les papiers, on s’en charge");
      const DOCS = ["Certificat de cession", "Carte grise barrée", "Certificat de non-gage", "Contrôle technique"], T = [1.55, 2.0, 2.45, 2.85];
      DOCS.forEach((s, k) => {
        const y = 284 + k * 122, f = prog(u, T[k], 0.22); bloc(ctx, 24, y, 492, 104, 22, C.surface2, f > 0 ? rouge(0.6) : C.ligne, 3);
        ctx.strokeStyle = C.doux; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(52, y + 26); ctx.lineTo(80, y + 26); ctx.lineTo(92, y + 38); ctx.lineTo(92, y + 78); ctx.lineTo(52, y + 78); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(60, y + 50); ctx.lineTo(84, y + 50); ctx.moveTo(60, y + 62); ctx.lineTo(84, y + 62); ctx.stroke();
        const o = { taille: 29, graisse: 600 }; texte(ctx, s, 112, y + 63, { ...o, taille: ajuste(ctx, s, o, 320) });
        if (f > 0) { const q = E.outBack(f, 2.2); ctx.save(); ctx.translate(470, y + 52); ctx.scale(q, q); coche(ctx, 0, 0, 22, C.accent, "#ffffff", f); ctx.restore(); }
        else { ctx.strokeStyle = C.ligne2; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(470, y + 52, 21, 0, 7); ctx.stroke(); }
      });
      const t = prog(u, 3.25, 0.18); if (t > 0) {
        const q = lerp(1.7, 1, E.outCubic(t)); ctx.save(); ctx.translate(270, 836); ctx.rotate(-0.12); ctx.scale(q, q); ctx.globalAlpha = clamp(t * 1.5);
        bloc(ctx, -205, -52, 410, 104, 16, null, C.accent, 7); texte(ctx, "DOSSIER COMPLET", 0, 16, { taille: 40, graisse: 700, mono: true, align: "center", couleur: C.accent }); ctx.restore();
      }
    },
  ];
  // une voiture déjà vendue (le mur et le couloir) : sa fiche, et le tampon « Vendue »
  function vendue(ctx, i) {
    const [type, an, km, montant, teinte] = VENDUES[i % VENDUES.length];
    entete(ctx, 0); studio(ctx, 24, 128, 492, 300, 22); voiture(ctx, 60, 226, 420, { teinte, miroir: i % 2 });
    texte(ctx, `${type} · ${an}`, 30, 518, { taille: 46, graisse: 600, serre: -0.03 }); texte(ctx, km, 30, 562, { taille: 27, couleur: C.doux });
    prix(ctx, montant, 30, 642, { taille: 66, graisse: 600, couleur: C.texte });
    ctx.save(); ctx.translate(270, 790); ctx.rotate(-0.14); bloc(ctx, -170, -62, 340, 124, 18, rouge(0.1), C.accent, 8); texte(ctx, "VENDUE", 0, 26, { taille: 76, graisse: 700, mono: true, align: "center", couleur: C.accent }); ctx.restore();
  }
  // les écrans sont dessinés en 720 × 1280 (4/3 de leur repère de 540 × 960) : leurs textes restent nets en gros plan
ECRANS.forEach((f, i) => definirTexture("ecran" + i, { l: 720, h: 1280, dessiner(ctx, p = {}) { ctx.scale(4 / 3, 4 / 3); f(ctx, (p.k || 0) / 12); } }));
  // une vignette du mur : l'écran n (0 à 5, à sa dernière image) ou une voiture vendue (6 et plus)
  const vignette = (ctx, n, x, y, l) => { ctx.save(); ctx.translate(x, y); rrect(ctx, 0, 0, l, (l * 960) / 540, l * 0.05); ctx.clip(); ctx.scale(l / 540, l / 540); if (n < 6) ECRANS[n](ctx, 47 / 12); else vendue(ctx, n - 6); ctx.restore(); };
  // le mur : 5 × 4 vignettes ; le couloir : 7 × 2
  definirTexture("mur", { l: 1300, h: 1856, dessiner(ctx) { ctx.fillStyle = "#070709"; ctx.fillRect(0, 0, 1300, 1856); for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) vignette(ctx, MUR_ORDRE[r * 5 + c], c * 260 + 4, r * 464 + 4, 252); } });
  const MUR_ORDRE = [6, 0, 7, 2, 8, 9, 4, 10, 1, 11, 3, 6, 5, 7, 9, 2, 10, 0, 11, 8];   // 0 à 5 : les étapes ; 6 à 11 : les voitures vendues
  definirTexture("bande", { l: 2048, h: 1030, dessiner(ctx) { ctx.fillStyle = "#070709"; ctx.fillRect(0, 0, 2048, 1030); for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) vignette(ctx, (c * 5 + r * 3 + 1) % 12, c * 292 + 4, r * 513 + 4, 284); } });
  // l'étiquette d'une étape : son numéro, son nom
  ETAPES.forEach((nom, i) => definirTexture("etiq" + i, { l: 1000, h: 180, dessiner(ctx) {
    verre(ctx, 1000, 180, 40); texte(ctx, "0" + (i + 1), 44, 120, { taille: 84, mono: true, graisse: 600, couleur: C.accent });
    const o = { taille: 78, graisse: 600, serre: -0.03 }; texte(ctx, nom, 180, 118, { ...o, taille: ajuste(ctx, nom, o, 780) });
  } }));

  // ------------------------------------------------------------------ la barre : on tape sa plaque. p : { n (lettres tapées), curseur, ok }
  definirTexture("barre", { l: 1400, h: 250, dessiner(ctx, p = {}) {
    bloc(ctx, 4, 4, 1392, 242, 121, "rgba(18,18,22,0.93)", p.ok ? C.accent : blanc(0.36), p.ok ? 6 : 4);
    const x = 40, y = 36, w = 1050, h = 178, bande = h * 0.52; plaqueFr(ctx, x, y, w, h, "", { bord: p.ok ? C.accent : "#cfcfca" });
    const o = { taille: 132, graisse: 600, mono: true, serre: 0.02 }, cw = largeur(ctx, "0", o), x0 = x + bande + (w - bande - 9 * cw) / 2, n = p.n || 0;
    const plein = plaqueTexte(PLAQUE), vu = plaqueTexte(PLAQUE.slice(0, n));
    if (!n) texte(ctx, "Votre plaque", x + bande + (w - bande) / 2, y + h * 0.66, { taille: 74, couleur: "#a9a9a3", align: "center" });
    for (let k = 0; k < vu.length; k++) texte(ctx, vu[k], x0 + k * cw, y + h * 0.76, { ...o, couleur: "#111114" });
    if (p.curseur && n < 7) { ctx.fillStyle = C.accent; rrect(ctx, (n ? x0 + vu.length * cw : x + bande + (w - bande) / 2 - 250) + 4, y + 30, 8, h - 60, 4); ctx.fill(); }
    void plein;
  } });
  definirTexture("barreTitre", { l: 900, h: 120, dessiner(ctx) { ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(26, 62, 14, 0, 7); ctx.fill(); texte(ctx, "Estimer ma voiture", 60, 86, { taille: 70, graisse: 600 }); } });
  definirTexture("reconnue", { l: 900, h: 120, dessiner(ctx) { coche(ctx, 46, 60, 36); const o = { taille: 62, graisse: 500 }; texte(ctx, VOITURE, 104, 82, { ...o, taille: ajuste(ctx, VOITURE, o, 780) }); } });
  definirTexture("bouton", { l: 256, h: 256, dessiner(ctx) {
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(128, 128, 126, 0, 7); ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 22; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(72, 128); ctx.lineTo(184, 128); ctx.moveTo(138, 82); ctx.lineTo(184, 128); ctx.lineTo(138, 174); ctx.stroke();
  } });
  // l'estimation du couloir. p : { n (euros), bloque }
  definirTexture("bandeau", { l: 1400, h: 900, dessiner(ctx, p = {}) {
    verre(ctx, 1400, 900, 80, p.bloque ? C.accent : blanc(0.3), p.bloque ? 12 : 5);
    texte(ctx, "Votre estimation", 90, 196, { taille: 82, graisse: 600 }); plaqueFr(ctx, 930, 118, 380, 96, plaqueTexte(PLAQUE));
    prix(ctx, Math.round((p.n || 0) / 10) * 10, 700, 560, { taille: 280, graisse: 600, serre: -0.04, align: "center", couleur: p.bloque ? C.accent : C.texte });
    texte(ctx, VOITURE, 700, 760, { taille: 66, couleur: C.doux, align: "center" });
  } });
  // la plaque du mur
  definirTexture("rien", { l: 1600, h: 560, dessiner(ctx) {
    verre(ctx, 1600, 560, 70); texte(ctx, "Et vous ?", 800, 226, { taille: 132, graisse: 500, couleur: C.doux, align: "center" });
    const o = { taille: 176, graisse: 700, serre: -0.04 }, a = largeur(ctx, "Rien ", o), b = largeur(ctx, "à faire.", o), x = 800 - (a + b) / 2;
    texte(ctx, "Rien ", x, 432, { ...o, couleur: C.accent }); texte(ctx, "à faire.", x + a, 432, o);
  } });
  // les chiffres
  [["0", ["appel", "à gérer"]], ["0", ["visite", "chez vous"]], ["1", ["virement,", "c’est tout."]]].forEach(([n, lignes], i) => definirTexture("chiffre" + i, { l: 1000, h: 820, dessiner(ctx) {
    verre(ctx, 1000, 820, 70); texte(ctx, n, 500, 500, { taille: 500, graisse: 600, serre: -0.04, align: "center", couleur: C.accent });
    lignes.forEach((s, k) => texte(ctx, s, 500, 640 + k * 112, { taille: 104, graisse: 600, serre: -0.03, align: "center" }));
  } }));
  // la boucle : trois étapes. p : { actif }
  ["Déposez", "On vend", "Vous encaissez"].forEach((s, i) => definirTexture("etape" + i, { l: 900, h: 288, dessiner(ctx, p = {}) {
    bloc(ctx, 6, 6, 888, 276, 64, "#131316", p.actif ? C.accent : "rgba(13,13,15,0.9)", p.actif ? 12 : 6);
    const o = { taille: 140, graisse: 600, serre: -0.04 }; texte(ctx, s, 450, 192, { ...o, taille: ajuste(ctx, s, o, 790), align: "center", couleur: p.actif ? C.accent : C.texte });
  } }));
  // le logo, la phrase, l'adresse
  definirTexture("pastille", { l: 256, h: 256, dessiner(ctx) { ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(128, 128, 126, 0, 7); ctx.fill(); } });
  definirTexture("logo", { l: 1360, h: 400, dessiner(ctx) {
    bloc(ctx, 5, 5, 1350, 390, 70, "rgba(10,10,12,0.96)", blanc(0.22), 5);
    const h = 280, w = (h * LOGO.width) / LOGO.height; ctx.drawImage(LOGO, (1360 - w) / 2, (400 - h) / 2, w, h);
  } });
  definirTexture("tag", { l: 600, h: 120, dessiner(ctx) { bloc(ctx, 4, 4, 592, 112, 56, rouge(0.12), C.accent, 5); texte(ctx, "DÉPÔT-VENTE", 300, 80, { taille: 54, graisse: 600, mono: true, serre: 0.08, align: "center", couleur: C.accent }); } });
  definirTexture("phrase", { l: 1400, h: 440, dessiner(ctx) { ["Votre voiture en vitrine.", "On s’occupe du reste."].forEach((s, k) => { const o = { taille: 124, graisse: k ? 500 : 600, serre: -0.03 }; texte(ctx, s, 700, 160 + k * 200, { ...o, taille: ajuste(ctx, s, o, 1360), align: "center", couleur: k ? C.doux : C.texte }); }); } });
  definirTexture("adresse", { l: 1000, h: 180, dessiner(ctx) { texte(ctx, "mkzmotors.com", 500, 126, { taille: 100, mono: true, couleur: C.doux, align: "center" }); } });
})();
