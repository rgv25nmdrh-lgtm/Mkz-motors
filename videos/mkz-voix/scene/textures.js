// Les dessins de la publicité MKZ Motors : ce qui est imprimé dans le décor (les pictogrammes de la clé, le marquage de
// l'étiquette en cuir, le panneau « À VENDRE » et son tampon « VENDU », l'enseigne du mur du fond), et le calque des
// textes posé par-dessus l'image, en pleine définition.
const ROUGE = "#e3262f", BLANC = "#f4f2ee", NOIR = "#111214";
const toile = (l, h) => { const c = document.createElement("canvas"); c.width = l; c.height = h; return [c, c.getContext("2d")]; };
function ecrire(x, s, cx, y, taille, graisse, espace = 0, police = "Geist", couleur = BLANC, align = "center") {
  x.font = `${graisse} ${taille}px "${police}"`; x.letterSpacing = `${espace * taille}px`; x.textAlign = align; x.fillStyle = couleur;
  x.fillText(s, cx + (align === "center" ? (espace * taille) / 2 : 0), y);
}
const largeurTexte = (x, s, taille, graisse, espace = 0, police = "Geist") => { x.font = `${graisse} ${taille}px "${police}"`; x.letterSpacing = `${espace * taille}px`; return x.measureText(s).width; };

// Le monogramme MKZ : trois lettres serrées, un trait rouge dessous. Dessiné centré en (cx, cy), de hauteur h.
function monogramme(x, cx, cy, h, couleur = BLANC) {
  ecrire(x, "MKZ", cx, cy + h * 0.36, h, 800, -0.04, "Geist", couleur);
  x.fillStyle = ROUGE; x.fillRect(cx - h * 0.9, cy + h * 0.5, h * 1.8, h * 0.07);
}

// Le panneau posé devant la voiture : « À VENDRE », puis le tampon « VENDU » qui claque (tampon : 0 absent, 1 posé).
function panneau(tampon) {
  const [c, x] = toile(1200, 840);
  x.fillStyle = "#f3f1ec"; x.fillRect(0, 0, 1200, 840);
  x.fillStyle = ROUGE; x.fillRect(0, 0, 1200, 150);
  ecrire(x, "MKZ MOTORS", 600, 100, 64, 700, 0.3, "Geist", BLANC);
  ecrire(x, "À VENDRE", 600, 420, 190, 800, -0.02, "Geist", NOIR);
  x.fillStyle = "#d8d4cc"; x.fillRect(150, 500, 900, 4);
  ecrire(x, "DÉPÔT-VENTE", 600, 610, 64, 500, 0.24, "Geist Mono", "#55524c");
  ecrire(x, "Renseignez-vous en agence", 600, 720, 48, 400, 0, "Geist", "#6a665f");
  if (tampon > 0.01) {
    const e = 1 + 0.6 * Math.max(0, 1 - tampon);                      // il arrive plus gros et s'écrase
    x.save(); x.translate(600, 430); x.rotate(-0.16); x.scale(e, e); x.globalAlpha = Math.min(1, tampon * 1.6);
    x.strokeStyle = ROUGE; x.lineWidth = 22; x.beginPath(); x.roundRect(-430, -150, 860, 300, 30); x.stroke();
    x.lineWidth = 6; x.beginPath(); x.roundRect(-395, -118, 790, 236, 18); x.stroke();
    ecrire(x, "VENDU", 0, 75, 210, 800, 0.06, "Geist", ROUGE);
    x.globalCompositeOperation = "destination-out";                      // l'encre du tampon n'est jamais pleine
    for (let i = 0; i < 900; i++) { x.globalAlpha = 0.5 * hash(i); x.fillRect(-440 + 880 * hash(i + 0.3), -160 + 320 * hash(i + 0.7), 3 + 9 * hash(i + 0.1), 2 + 4 * hash(i + 0.9)); }
    x.restore();
  }
  return c;
}

// Le dessus de la clé, vu de haut (le moteur le pose sur la coque) : trois touches et leurs pictogrammes, le monogramme.
// Le canevas est retourné verticalement pour que tout se lise à l'endroit sur la coque.
function dessusCle() {
  const [c, x] = toile(1240, 600);
  x.translate(0, 600); x.scale(1, -1);
  const touche = (cx, dessin) => {
    x.fillStyle = "rgba(38,38,42,1)"; x.beginPath(); x.arc(cx, 300, 50, 0, 2 * Math.PI); x.fill();
    x.strokeStyle = "rgba(170,170,176,0.9)"; x.lineWidth = 3; x.stroke();
    x.save(); x.translate(cx, 300); x.strokeStyle = "rgba(236,236,240,1)"; x.fillStyle = "rgba(236,236,240,1)"; x.lineWidth = 6; x.lineCap = "round"; dessin(); x.restore();
  };
  const cadenas = (ouvert) => () => {
    x.beginPath(); x.roundRect(-17, -4, 34, 26, 4); x.fill();
    x.beginPath(); x.arc(0, -6, 11, Math.PI, ouvert ? 1.75 * Math.PI : 2 * Math.PI); if (!ouvert) x.lineTo(11, -2); x.moveTo(-11, -6); x.lineTo(-11, -2); x.stroke();
  };
  touche(840, cadenas(false)); touche(640, cadenas(true));
  touche(440, () => { x.beginPath(); x.moveTo(-20, 10); x.lineTo(-14, -12); x.lineTo(14, -12); x.lineTo(20, 10); x.closePath(); x.stroke(); x.beginPath(); x.moveTo(-22, 16); x.lineTo(22, 16); x.stroke(); });   // le coffre
  x.save(); x.translate(205, 300); x.rotate(-Math.PI / 2);
  ecrire(x, "MKZ", 0, 16, 46, 800, 0.02, "Geist", "rgba(150,150,156,0.95)"); x.restore();
  return c;
}

// L'étiquette en cuir accrochée à l'anneau : le nom marqué à chaud, une piqûre tout autour.
function etiquetteCle() {
  const [c, x] = toile(1088, 480);
  x.strokeStyle = "rgba(255,210,200,0.55)"; x.lineWidth = 4; x.setLineDash([14, 10]); x.beginPath(); x.roundRect(46, 46, 996, 388, 26); x.stroke(); x.setLineDash([]);
  x.fillStyle = "rgba(20,4,6,0.85)"; x.beginPath(); x.arc(980, 240, 30, 0, 2 * Math.PI); x.fill();   // l'œillet
  x.save(); x.translate(1088, 0); x.scale(-1, 1);              // le moteur lit l'étiquette en miroir : le marquage est retourné
  ecrire(x, "MKZ", 618, 250, 170, 800, -0.02, "Geist", "rgba(250,232,226,0.92)");
  ecrire(x, "MOTORS", 618, 340, 54, 600, 0.5, "Geist", "rgba(250,232,226,0.85)"); x.restore();
  return c;
}

// L'enseigne du mur du fond : le monogramme et le nom, en lettres lumineuses (alpha : là où il y a de la lumière).
function enseigne() {
  const [c, x] = toile(1280, 600);
  x.shadowColor = "rgba(255,255,255,0.0)";
  monogramme(x, 640, 230, 260, "#ffffff");
  ecrire(x, "MOTORS", 640, 520, 92, 500, 0.5, "Geist", "#ffffff");
  return c;
}

// ---------------------------------------------------------------- le calque des textes (1080 × 1920)
// Une ligne de mots qui montent chacun d'un masque. temps[i] : instant du mot i ; t : instant de l'image.
function ligneMots(x, mots, cx, y, taille, graisse, temps, t, couleur = BLANC, police = "Geist") {
  const espace = largeurTexte(x, " ", taille, graisse, -0.02, police), l = mots.map((m) => largeurTexte(x, m, taille, graisse, -0.02, police));
  const total = l.reduce((a, b) => a + b, 0) + espace * (mots.length - 1); let px = cx - total / 2;
  mots.forEach((m, i) => {
    const raw = prog(t, temps[i], 0.5), p = E.outExpo(raw);
    if (raw > 0) {
      x.save(); x.beginPath(); x.rect(px - 20, y - taille * 1.05, l[i] + 40, taille * 1.35); x.clip();
      ecrire(x, m, px, y + (1 - p) * taille * 1.3, taille, graisse, -0.02, police, couleur, "left"); x.restore();
    }
    px += l[i] + espace;
  });
}
const etalement = (t0, n, pas = 0.09) => Array.from({ length: n }, (_, i) => t0 + i * pas);
// Une pastille : fond (plein ou contour), texte, éventuellement une coche. e : apparition 0..1
function pastille(x, s, cx, cy, taille, e, { fond = ROUGE, texte = BLANC, coche = false, l = null } = {}) {
  if (e <= 0.005) return;
  const w = (l || largeurTexte(x, s, taille, 600) + taille * 1.6) + (coche ? taille * 1.1 : 0), h = taille * 2.0, k = 0.86 + 0.14 * Math.min(1, e);
  x.save(); x.translate(cx, cy); x.scale(k, k); x.globalAlpha = Math.min(1, e * 1.5);
  x.fillStyle = fond; x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, h / 2); x.fill();
  if (coche) {
    const ox = -w / 2 + taille * 0.95;
    x.strokeStyle = texte; x.lineWidth = taille * 0.14; x.lineCap = "round"; x.lineJoin = "round";
    x.beginPath(); x.moveTo(ox - taille * 0.3, 0); x.lineTo(ox - taille * 0.05, taille * 0.26); x.lineTo(ox + taille * 0.36, -taille * 0.3); x.stroke();
    ecrire(x, s, ox + taille * 0.75, taille * 0.36, taille, 600, 0, "Geist", texte, "left");
  } else ecrire(x, s, 0, taille * 0.36, taille, 600, 0, "Geist", texte);
  x.restore();
}
// Le petit en-tête « MKZ MOTORS » des plans 3 à 6, sous la barre du haut des réseaux (zone sûre : y > 250 px)
function entete(x, o) { if (o <= 0.005) return; x.globalAlpha = o; ecrire(x, "MKZ MOTORS", 540, 300, 34, 600, 0.42, "Geist", "rgba(244,242,238,0.9)"); x.fillStyle = ROUGE; x.fillRect(510, 322, 60, 4); x.globalAlpha = 1; }

// Une phrase de la voix, à l'écran : des lignes de mots qui montent chacun d'un masque à l'instant où la voix les dit.
// lignes : [[{ m: "mot", t: instant, c: couleur }, …], …]. La taille se réduit d'elle-même si une ligne dépasse 960 px.
function phrase(x, lignes, y0, t, taille = 104, graisse = 700) {
  const larg = (l, tl) => l.reduce((s, w, i) => s + largeurTexte(x, w.m, tl, graisse, -0.02) + (i ? largeurTexte(x, " ", tl, graisse, -0.02) : 0), 0);
  const tl = Math.min(taille, ...lignes.map((l) => (taille * 960) / Math.max(960, larg(l, taille))));
  lignes.forEach((l, k) => {
    const y = y0 + k * tl * 1.12, esp = largeurTexte(x, " ", tl, graisse, -0.02);
    let px = 540 - larg(l, tl) / 2;
    for (const w of l) {
      const lw = largeurTexte(x, w.m, tl, graisse, -0.02), raw = prog(t, w.t, 0.45), p = E.outExpo(raw);
      if (raw > 0) {
        x.save(); x.beginPath(); x.rect(px - 20, y - tl * 1.05, lw + 40, tl * 1.35); x.clip();
        ecrire(x, w.m, px, y + (1 - p) * tl * 1.3, tl, graisse, -0.02, "Geist", w.c || BLANC, "left"); x.restore();
      }
      px += lw + esp;
    }
  });
}
// les mots affichés, posés sur les instants de la voix : texte affiché (avec sa ponctuation), instants, mots en rouge
const posees = (textes, temps, rouges = []) => { let i = 0; return textes.map((l) => l.map((m) => ({ m, t: temps[i++], c: rouges.includes(m) ? ROUGE : BLANC }))); };
// un voile sombre derrière les titres du haut, pour qu'ils se lisent sur les rampes allumées
function voile(x, o) {
  if (o <= 0.005) return;
  const g = x.createLinearGradient(0, 180, 0, 760); g.addColorStop(0, "rgba(8,8,10,0.5)"); g.addColorStop(0.6, "rgba(8,8,10,0.28)"); g.addColorStop(1, "rgba(8,8,10,0)");
  x.save(); x.shadowBlur = 0; x.globalAlpha = o; x.fillStyle = g; x.fillRect(0, 180, 1080, 580); x.restore();
}
// les cinq étapes du dépôt-vente, cochées quand la voix les dit (plans 3 à 5), sur deux colonnes
const ETAPES = [["Estimation", 300, 1290], ["Annonce", 780, 1290], ["Visites", 300, 1405], ["Essais", 780, 1405], ["Démarches", 540, 1520]];

function dessinerCalque(x, t) {
  x.clearRect(0, 0, 1080, 1920);
  const K = CUES, mots = (s) => TIMING.sentences[s].words.map((w) => w.start - 0.04);
  voile(x, t < K.p7.in ? 1 : 0);
  x.save(); x.shadowColor = "rgba(0,0,0,0.55)"; x.shadowBlur = 28;
  entete(x, t >= K.p3.in && t < K.p7.in ? 1 : 0);
  if (t < K.p2.in) {
    phrase(x, posees([["Vous", "voulez", "vendre"], ["votre", "voiture ?"]], K.p1.mots), 430, t);
  } else if (t < K.p3.in) {
    phrase(x, posees([["Confiez-la", "à"], ["MKZ", "Motors."]], K.p2.mots, ["MKZ", "Motors."]), 430, t);
  } else if (t < K.p6.in) {
    if (t < K.p4.in) phrase(x, posees([["On", "l'estime,"], ["on", "crée", "l'annonce,"]], mots(2)), 440, t, 84, 600);
    else if (t < K.p5.in) phrase(x, posees([["on", "organise", "les", "visites"], ["et", "les", "essais,"]], mots(3)), 440, t, 84, 600);
    else phrase(x, posees([["et", "on", "gère", "toutes"], ["les", "démarches."]], mots(4)), 440, t, 84, 600);
    ETAPES.forEach(([s, cx, cy], i) => {
      const e = clamp(E.outBack(prog(t, K.etapes[i], 0.4), 2.2), 0, 1.2);
      pastille(x, s, cx, cy, 44, e, { fond: "rgba(244,242,238,0.95)", texte: NOIR, coche: true, l: 330 });
    });
  } else if (t < K.p7.in) {
    phrase(x, posees([["Le", "dépôt-vente :"], ["on", "s'occupe", "de", "tout."]], K.p6.mots, ["dépôt-vente :"]), 430, t);
  } else {
    voile(x, E.outCubic(prog(t, K.p7.mots[0] - 0.2, 0.4)));
    phrase(x, posees([["On", "la", "vend"], ["pour", "vous."]], K.p7.mots, ["pour", "vous."]), 430, t);
    const g = x.createLinearGradient(0, 1250, 0, 1700); g.addColorStop(0, "rgba(8,8,10,0)"); g.addColorStop(0.5, "rgba(8,8,10,0.6)"); g.addColorStop(1, "rgba(8,8,10,0.75)");
    x.save(); x.shadowBlur = 0; x.globalAlpha = E.outCubic(prog(t, K.p7.ligne - 0.2, 0.6)); x.fillStyle = g; x.fillRect(0, 1250, 1080, 670); x.restore();
    const n = E.outCubic(prog(t, K.p7.ligne, 0.6));
    if (n > 0.005) { x.globalAlpha = n; ecrire(x, "Achat  ·  Vente  ·  Dépôt-vente", 540, 1430 + 24 * (1 - n), 50, 500, 0.02); x.globalAlpha = 1; }
    const e = clamp(E.outBack(prog(t, K.p7.site, 0.45), 2.2), 0, 1.2);
    pastille(x, "mkzmotors.com", 540, 1555, 50, e, { l: 480 });
  }
  x.restore();
}
