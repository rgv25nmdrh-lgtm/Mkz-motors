// Les dessins de la publicité MKZ Motors : ce qui est imprimé dans le décor (le panneau « À VENDRE » et son tampon
// « VENDU », l'enseigne du mur du fond), et le calque des textes posé par-dessus l'image, en pleine définition.
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
// Le petit en-tête « MKZ MOTORS » des plans 1 à 5
function entete(x, o) { if (o <= 0.005) return; x.globalAlpha = o; ecrire(x, "MKZ MOTORS", 540, 150, 34, 600, 0.42, "Geist", "rgba(244,242,238,0.9)"); x.fillStyle = ROUGE; x.fillRect(510, 172, 60, 4); x.globalAlpha = 1; }

function dessinerCalque(x, t) {
  x.clearRect(0, 0, 1080, 1920);
  x.save(); x.shadowColor = "rgba(0,0,0,0.55)"; x.shadowBlur = 28;
  const K = CUES;
  entete(x, t < K.p6.in ? E.outCubic(prog(t, K.p1.titre, 0.6)) : 0);
  if (t >= K.p2.in && t < K.p3.in) {
    ligneMots(x, ["Des", "occasions"], 540, 330, 104, 700, etalement(K.p2.titre[0], 2), t);
    ligneMots(x, ["sélectionnées."], 540, 450, 104, 700, [K.p2.titre[1]], t, ROUGE);
  } else if (t >= K.p3.in && t < K.p4.in) {
    ligneMots(x, ["Contrôlées,"], 540, 330, 104, 700, [K.p3.titre[0]], t);
    ligneMots(x, ["prêtes", "à", "rouler."], 540, 450, 104, 700, etalement(K.p3.titre[1], 3), t);
  } else if (t >= K.p4.in && t < K.p5.in) {
    ligneMots(x, ["Vous", "vendez"], 540, 330, 104, 700, etalement(K.p4.question, 2), t);
    ligneMots(x, ["votre", "voiture ?"], 540, 450, 104, 700, etalement(K.p4.question + 0.25, 2), t);
    const e = clamp(E.outBack(prog(t, K.p4.reponse, 0.45), 2.2), 0, 1.2);
    pastille(x, "On la vend pour vous.", 540, 1640, 52, e);
  } else if (t >= K.p5.in && t < K.p6.in) {
    ligneMots(x, ["Dépôt-vente"], 540, 330, 104, 700, [K.p5.titre], t, ROUGE);
    ligneMots(x, ["on", "s'occupe", "de", "tout."], 540, 440, 72, 500, etalement(K.p5.titre + 0.3, 4, 0.07), t);
    ["Estimation", "Annonces", "Visites", "Démarches"].forEach((s, i) => {
      const e = clamp(E.outBack(prog(t, K.p5.etapes[i], 0.4), 2.2), 0, 1.2);
      pastille(x, s, 540, 1390 + i * 118, 44, e, { fond: "rgba(244,242,238,0.95)", texte: NOIR, coche: true, l: 420 });
    });
  } else if (t >= K.p6.in) {
    const g = x.createLinearGradient(0, 1380, 0, 1920); g.addColorStop(0, "rgba(8,8,10,0)"); g.addColorStop(0.45, "rgba(8,8,10,0.62)"); g.addColorStop(1, "rgba(8,8,10,0.8)");
    x.save(); x.shadowBlur = 0; x.globalAlpha = E.outCubic(prog(t, K.p6.ligne - 0.2, 0.6)); x.fillStyle = g; x.fillRect(0, 1380, 1080, 540); x.restore();
    const n = E.outCubic(prog(t, K.p6.ligne, 0.6));
    if (n > 0.005) { x.globalAlpha = n; ecrire(x, "Achat  ·  Vente  ·  Dépôt-vente", 540, 1560 + 24 * (1 - n), 50, 500, 0.02); x.globalAlpha = 1; }
    const e = clamp(E.outBack(prog(t, K.p6.site, 0.45), 2.2), 0, 1.2);
    pastille(x, "mkzmotors.com", 540, 1700, 50, e, { l: 480 });
  }
  x.restore();
}
