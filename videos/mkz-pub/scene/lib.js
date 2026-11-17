// Outils communs : tout ce qui s'affiche est calculé à partir du temps t, rien d'autre.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
// Progression 0..1 d'un mouvement qui démarre à `start` et dure `dur` secondes.
const prog = (t, start, dur) => clamp((t - start) / dur);

// Courbes de vitesse. Aucun mouvement linéaire dans la vidéo.
const E = {
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inCubic: (x) => x * x * x,
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutQuart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  inQuad: (x) => x * x,
  outQuad: (x) => 1 - (1 - x) * (1 - x),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  // Léger dépassement puis retour (s règle l'amplitude).
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
};

// Pseudo-hasard reproductible (même entrée, même sortie).
const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function mk(parent, cls, html, tag = "div") {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}

// Place un élément (repère logique de la scène) et règle échelle, rotation, opacité.
function put(e, x, y, o = {}) {
  const s = o.s ?? 1;
  const sx = o.sx ?? s;
  const sy = o.sy ?? s;
  let tr = `translate(${x.toFixed(3)}px,${y.toFixed(3)}px)`;
  if (o.r) tr += ` rotate(${o.r.toFixed(3)}deg)`;
  if (sx !== 1 || sy !== 1) tr += ` scale(${sx.toFixed(5)},${sy.toFixed(5)})`;
  e.style.transform = tr;
  if (o.o !== undefined) {
    e.style.opacity = o.o.toFixed(4);
    e.style.visibility = o.o <= 0.002 ? "hidden" : "visible";
  }
}
const show = (e, on) => (e.style.display = on ? "" : "none");

// Une ligne de texte dont chaque mot sort d'un masque.
// tokens : "mot" ou { t, cls, glue (collé au mot précédent), probe (repère de ligne de base) }
function mkLine(parent, tokens, fs, extra = "") {
  const ln = mk(parent, "a ln " + extra);
  ln.style.fontSize = fs + "px";
  ln.words = tokens.map((tk, i) => {
    const o = typeof tk === "string" ? { t: tk } : tk;
    if (i > 0 && !o.glue) ln.appendChild(document.createTextNode(" "));
    const wd = mk(ln, "wd" + (o.cls ? " " + o.cls : ""), null, "span");
    if (o.glue) wd.style.marginLeft = o.gap ?? "0.07em";
    const wi = mk(wd, "wi", null, "span");
    wi.textContent = o.t;
    if (o.probe) wi.probe = mk(wi, "bl", null, "span");
    return { wd, wi };
  });
  return ln;
}

// Fait monter chaque mot à l'instant times[i]. pop : indices des mots qui "claquent".
function reveal(ln, t, times, o = {}) {
  const dur = o.dur ?? 0.5;
  ln.words.forEach((w, i) => {
    const raw = prog(t, times[i], dur);
    const p = E.outExpo(raw);
    // 130 % : même un accent sur capitale (À, É) sort entièrement du masque
    w.wi.style.transform = `translateY(${((1 - p) * 130).toFixed(3)}%)`;
    w.wi.style.visibility = raw <= 0 ? "hidden" : "visible";
    if (o.pop && o.pop.includes(i)) {
      const s = lerp(1.2, 1, E.outBack(prog(t, times[i], 0.55), 2.4));
      w.wd.style.transform = `scale(${s.toFixed(5)})`;
    }
  });
}

// Largeur d'un texte tapé, pour chaque nombre de caractères (sert à placer le curseur).
function prefixWidths(span, text) {
  const out = [];
  for (let n = 0; n <= text.length; n++) {
    span.textContent = text.slice(0, n);
    out.push(span.offsetWidth);
  }
  span.textContent = "";
  return out;
}

// Trouve le point du "?" dans la police (centre et diamètre, en px pour la taille fs),
// en dessinant le caractère hors écran et en cherchant sa tache d'encre la plus basse.
function qmarkDot(fs, weight) {
  const R = 400;
  const cv = document.createElement("canvas");
  cv.width = 600;
  cv.height = 700;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  cx.font = `${weight} ${R}px Geist`;
  cx.textBaseline = "alphabetic";
  cx.fillStyle = "#fff";
  cx.fillText("?", 100, 500);
  const d = cx.getImageData(0, 0, 600, 700).data;
  const ink = (x, y) => d[(y * 600 + x) * 4 + 3] > 40;
  const rowInk = (y) => {
    for (let x = 0; x < 600; x++) if (ink(x, y)) return true;
    return false;
  };
  let bottom = 699;
  while (bottom > 0 && !rowInk(bottom)) bottom--;
  let top = bottom;
  while (top > 0 && rowInk(top - 1)) top--;
  let x0 = 599;
  let x1 = 0;
  for (let y = top; y <= bottom; y++)
    for (let x = 0; x < 600; x++)
      if (ink(x, y)) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
      }
  const k = fs / R;
  return { dx: ((x0 + x1) / 2 - 100) * k, up: (500 - (top + bottom) / 2) * k, d: Math.max(x1 - x0, bottom - top) * k };
}
