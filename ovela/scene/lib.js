// Ovela : petits outils partagés (courbes, interpolations, hasard reproductible). Aucune horloge réelle.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const mix3 = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
const prog = (t, t0, d) => clamp((t - t0) / d);                    // avancement de 0 à 1 entre t0 et t0 + d
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const E = {
  lin: (x) => x,
  inQuad: (x) => x * x,
  outQuad: (x) => 1 - (1 - x) * (1 - x),
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  inOutQuart: (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  inBack: (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x,
};
// Clés : [[t, valeur, courbe?], ...] ; la courbe d'une clé s'applique au segment qui y mène. Valeurs : nombres ou tableaux.
function cles(k, t, courbe = E.inOutCubic) {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const [t0, a] = k[i - 1], [t1, b, e] = k[i], p = (e || courbe)((t - t0) / (t1 - t0));
      return Array.isArray(a) ? a.map((x, j) => x + (b[j] - x) * p) : a + (b - a) * p;
    }
  }
  return k[k.length - 1][1];
}
const impulsion = (t, t0, tau) => (t < t0 ? 0 : Math.exp(-(t - t0) / tau));
const choc = (t, t0, tau = 0.15) => impulsion(t, t0, tau) * prog(t, t0, 0.03);    // un éclat bref qui retombe
const oscille = (t, t0, a, f = 26, am = 8) => (t > t0 ? a * Math.sin((t - t0) * f) * Math.exp(-(t - t0) * am) : 0);
