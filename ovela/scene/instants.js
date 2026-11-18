// Ovela : les instants du film, partagés par l'image (film.js) et le son (outils/son.py).
// 120 battements par minute : un temps = 0,5 s, une mesure = 2 s, dix mesures = 20 s.
const T = 0.5;
const K = {
  arrivees: [0.5, 1.0, 1.5],                        // 1 · trois messages arrivent sur le téléphone
  flot: [2.0, 2.25, 2.5, 2.75, 3.0, 3.25],          // 2 · le flot : les notifications jaillissent
  fige: 3.5, drop: 4.0,                             //     tout se fige ; la musique repart
  reponses: [4.0, 4.125, 4.25, 4.375, 4.5, 4.625],  // 3 · Ovela répond à chacun
  retour: 4.75,                                     //     les notifications rentrent dans le téléphone
  bascule: 6.0, montees: [6.25, 6.5, 6.75, 7.0], etiquettes: 7.0,   // 4 · le téléphone devient une carte ; les commerces
  oks: { 1: 8.25, 3: 8.75, 0: 9.25, 4: 9.75 },       // 5 · le travelling : chaque commerce reçoit sa réponse (n° de carte → instant)
  stats: 10.0, avis: 12.0,                          // 6 · 7 · la preuve
  couche: 14.0, arc: 14.5,                          // 8 · tout se couche ; un arc de lumière balaie le sol
  fusion: 16.0, leve: 16.5, frappe: 17.0,           // 9 · la fusion en une barre ; la question s'écrit
  duree_frappe: 0.85, signes: 26,                   //     la question : 26 signes tapés en 0,85 s
  entree: 18.0, fin: 18.5,                          // 10 · Entrée : la réponse ; la signature
};
if (typeof module !== "undefined") module.exports = { K, T };
