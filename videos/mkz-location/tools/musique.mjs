// La musique de la vidéo « MKZ Motors · location » : un morceau ORIGINAL, composé et synthétisé ici. Un groove chaud et
// posé de fin de journée, 120 battements par minute, huit mesures (16 s), en fa majeur.
//   node tools/musique.mjs
// Ce n'est la copie d'aucun titre : les accords, la basse et la mélodie (scene/cues.js) sont écrits pour cette vidéo ;
// les instruments (piano électrique, basse ronde, guitare pincée, grosse caisse feutrée…) sont synthétisés ici.
// La forme suit l'image : mesure 1 le téléphone s'allume (le piano seul), 2 la réservation (le shaker, la basse, les
// touches), 3 le week-end en accéléré (tout le groove, un feuillet par jour), 4 la clé tombe, 5 et 6 la mélodie
// (l'étiquette, le prix), 7 le recul, 8 l'accord final, tenu, sous le logo.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { writeWav, toM4a } from "./wav.mjs";
import { SR, midi, dB, fromDb, secs, rng, Biquad, SVF, saw, Track, reverb, limiter, lufs } from "./dsp.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
createRequire(import.meta.url)("../scene/cues.js");
const { K } = globalThis.buildCues();                       // le conducteur : l'image et le son lisent les mêmes instants
const BEAT = K.T, S16 = BEAT / 4, BAR = 4 * BEAT, D = K.DUREE, b = K.b;
const TAU = 2 * Math.PI, N = rng(20261119), white = () => N() * 2 - 1;

// ------------------------------------------------------------------ les instruments
function kick() {                                          // grosse caisse feutrée, ronde
  const n = secs(0.32), o = new Float32Array(n), lp = new Biquad("lp", 900, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += (46 + 120 * Math.exp(-t / 0.03)) / SR; o[i] = Math.tanh(1.8 * Math.sin(TAU * ph) * Math.exp(-t / 0.11)) * Math.min(1, t / 0.001) + lp.tick(white()) * 0.12 * Math.exp(-t / 0.004); }
  return o;
}
function rim() {                                           // un claquement de doigts boisé, sur les temps 2 et 4
  const n = secs(0.16), o = new Float32Array(n), bp = new Biquad("bp", 1900, 1.4), bp2 = new Biquad("bp", 820, 3);
  for (let i = 0; i < n; i++) { const t = i / SR, nz = white(); o[i] = bp.tick(nz) * (Math.exp(-t / 0.006) + 0.45 * (t > 0.008 ? Math.exp(-(t - 0.008) / 0.035) : 0)) + 0.5 * bp2.tick(nz) * Math.exp(-t / 0.02); }
  return o;
}
function shaker(fort = 1) {
  const n = secs(0.07), o = new Float32Array(n), hp = new Biquad("hp", 6500, 0.7);
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] = hp.tick(white()) * Math.min(1, t / 0.006) * Math.exp(-t / (0.016 * fort)); }
  return o;
}
// Piano électrique : une sinusoïde modulée par une autre (la « lame »), une attaque qui tinte, un léger trémolo.
function piano(f, len, force = 1) {
  const n = secs(len), o = new Float32Array(n);
  let pc = 0, pm = 0, pb = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, I = 1.4 * force * Math.exp(-t / 0.35) + 0.25;
    pc += f / SR; pm += f / SR; pb += (f * 13.9) / SR;
    const s = Math.sin(TAU * pc + I * Math.sin(TAU * pm)) + 0.12 * force * Math.sin(TAU * pb) * Math.exp(-t / 0.03);
    o[i] = s * Math.min(1, t / 0.002) * Math.exp(-t / (len * 0.55)) * Math.min(1, (len - t) / 0.05) * (1 + 0.06 * Math.sin(TAU * 4.8 * t));
  }
  return o;
}
function basse(f, len, glisse = 0) {                       // basse ronde : une sinusoïde et un peu de deuxième harmonique
  const n = secs(len), o = new Float32Array(n), lp = new Biquad("lp", 700, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, fr = f * (1 + glisse * Math.exp(-t / 0.03)); ph += fr / SR; o[i] = lp.tick(Math.tanh(2.2 * Math.sin(TAU * ph) + 0.4 * Math.sin(2 * TAU * ph))) * Math.min(1, t / 0.004) * Math.exp(-t / (len * 1.2)) * Math.min(1, (len - t) / 0.02); }
  return o;
}
function guitare(f, len = 0.6) {                           // corde pincée (Karplus-Strong) : la mélodie
  const n = secs(len), o = new Float32Array(n), p = Math.max(2, Math.round(SR / f)), buf = new Float32Array(p);
  for (let i = 0; i < p; i++) buf[i] = white() * 0.9;
  let k = 0, prec = 0; const lp = new Biquad("lp", 5200, 0.7);
  for (let i = 0; i < n; i++) { const v = buf[k], s = 0.5 * (v + prec) * 0.996; prec = v; buf[k] = s; k = (k + 1) % p; o[i] = lp.tick(v) * Math.min(1, (n - i) / secs(0.03)); }
  return o;
}
function nappe(L, R, f, t0, t1, gain) {                    // nappe douce : deux dents de scie désaccordées, très filtrées
  const a = secs(t0), z = Math.min(L.length, secs(t1)), d1 = (f * 0.997) / SR, d2 = (f * 1.003) / SR, fl = new SVF(), fr = new SVF();
  let p1 = 0, p2 = 0;
  for (let i = a; i < z; i++) {
    const t = i / SR, env = Math.min(1, (t - t0) / 0.6) * Math.min(1, (t1 - t) / 0.4);
    p1 += d1; if (p1 >= 1) p1 -= 1; p2 += d2; if (p2 >= 1) p2 -= 1;
    L[i] += fl.tick(saw(p1, d1), 900, 0.5).lp * env * gain; R[i] += fr.tick(saw(p2, d2), 900, 0.5).lp * env * gain;
  }
}
function souffle(len, f0, f1, forme = 2, retombe = 0) {    // bruit filtré qui monte (retombe = 1 : monte puis redescend)
  const n = secs(len), o = new Float32Array(n), f = new SVF();
  for (let i = 0; i < n; i++) { const p = i / n, e = retombe ? Math.sin(Math.PI * p) ** 2 : Math.pow(p, forme); o[i] = f.tick(white(), f0 * Math.pow(f1 / f0, retombe ? 1 - Math.abs(2 * p - 1) : p), 1.2).bp * e * Math.min(1, (n - i) / secs(0.008)); }
  return o;
}

// ------------------------------------------------------------------ le morceau (fa majeur)
const mus = new Track(D), echo = new Track(D), tb = new Track(D);   // echo : ce qui part dans la réverbération ; tb : la basse
const K1 = kick(), R1 = rim(), SH = shaker(), SH2 = shaker(1.8);
const coups = [];
const coup = (t, g = 1) => { mus.add(K1, t, g); coups.push(t); };
const accord = (t, notes, len, gain, eg = 0.25, force = 1) => notes.forEach((m, k) => { const s = piano(midi(m), len, force); mus.add(s, t + k * 0.008, gain, (k % 2 ? 0.25 : -0.25)); echo.add(s, t, eg); });
const melodie = (m, t0, { octave = 0, gain = 0.42, eg = 0.18 } = {}) => { for (const [step, note] of K.motif[m]) { const t = t0 + step * S16, s = guitare(midi(note + octave), 0.7); mus.add(s, t, gain, step % 2 ? 0.3 : -0.3); echo.add(s, t, eg); } };
const nL = new Float32Array(mus.n), nR = new Float32Array(mus.n);
// une mesure : le piano sur le premier temps et un rappel sur le « et » du 2 ; la basse ; le shaker ; le claquement sur 2 et 4 ; la grosse caisse si demandée
function mesure(bar, o = {}) {
  const t0 = bar * BAR, A = K.accords[bar], f = midi(K.basses[bar]);
  if (!o.sansPiano) { accord(t0, A, 1.9, 0.11 * (o.piano || 1)); accord(t0 + 6 * S16, A.slice(1), 0.6, 0.06 * (o.piano || 1), 0.15, 0.6); }
  for (let step = 0; step < 16; step++) {
    const t = t0 + step * S16 + (step % 2 ? 0.018 : 0);   // un peu de balancement sur les doubles croches
    if (o.kick && step % 4 === 0) coup(t0 + step * S16, step === 0 ? 1 : 0.85);
    if (o.basse && [0, 6, 8, 14].includes(step)) tb.add(basse(f * (step === 6 ? 2 : step === 14 ? 1.5 : 1), step === 0 || step === 8 ? 0.42 : 0.2, 0.08), t, step === 6 ? 0.55 : 0.9);
    if (o.rim && (step === 4 || step === 12)) { mus.add(R1, t, 0.55, 0.1); echo.add(R1, t, 0.12); }
    if (o.shaker) mus.add(step % 4 === 2 ? SH2 : SH, t, (step % 2 ? 0.07 : 0.11) * o.shaker, 0.3);
  }
}
// mesure 1 : le téléphone s'allume — le piano seul, une nappe
nappe(nL, nR, midi(53), 0, BAR + 0.3, 0.13); nappe(nL, nR, midi(60), 0, BAR + 0.3, 0.08);
mesure(0, { piano: 2.4 }); accord(K.tel.allume, [77], 1.2, 0.12, 0.3);
// mesure 2 : la réservation — le shaker, la basse, le claquement
mesure(1, { basse: true, shaker: 0.8, rim: true }); mus.add(souffle(BEAT * 1.1, 300, 6000, 2.4), b(8) - BEAT * 1.1, 0.35);
// mesure 3 : le week-end en accéléré — tout le groove
mesure(2, { kick: true, basse: true, shaker: 1, rim: true });
// mesure 4 : la clé tombe, sur le deuxième temps
mesure(3, { kick: true, basse: true, shaker: 1, rim: true });
// mesures 5 et 6 : la mélodie, à la guitare
mesure(4, { kick: true, basse: true, shaker: 1, rim: true }); melodie(0, b(16));
mesure(5, { kick: true, basse: true, shaker: 1, rim: true }); melodie(1, b(20));
// mesure 7 : le recul — la mélodie revient, une octave plus haut, plus loin
mesure(6, { kick: true, basse: true, shaker: 0.8, rim: true, piano: 0.9 }); melodie(0, b(24), { octave: 12, gain: 0.2, eg: 0.25 });
mus.add(souffle(BEAT, 400, 7000, 2.2), b(28) - BEAT, 0.3);
// mesure 8 : l'accord final (fa, avec la neuvième), tenu sous le logo ; un dernier coup
{ const t = b(28); coup(t, 1); accord(t, K.accords[7], 2.0, 0.13, 0.4); tb.add(basse(midi(41), 1.8), t, 0.95); nappe(nL, nR, midi(53), t, D, 0.08); nappe(nL, nR, midi(65), t, D, 0.05); }
// la basse s'efface un instant sous chaque coup de grosse caisse
{ const g = new Float32Array(mus.n).fill(1); for (const tc of coups) for (let i = secs(tc); i < Math.min(mus.n, secs(tc + 0.08)); i++) g[i] = Math.min(g[i], 0.5 + 0.5 * Math.max(0, i / SR - tc) / 0.08); for (let i = 0; i < mus.n; i++) { mus.L[i] += tb.L[i] * g[i]; mus.R[i] += tb.R[i] * g[i]; } }
mus.addStereo(nL, nR, 0, 1); echo.addStereo(nL, nR, 0, 0.5);

// ------------------------------------------------------------------ les bruitages, sur les mêmes instants que l'image
const bru = new Track(D), R2 = rng(83), alea = () => R2() * 2 - 1;
function bruit(len, f, q, decroissance, type = "bp") { const n = secs(len), o = new Float32Array(n), bq = new Biquad(type, f, q); for (let i = 0; i < n; i++) o[i] = bq.tick(alea()) * Math.exp(-(i / SR) / decroissance) * Math.min(1, i / 24); return o; }
function choc(f = 90, len = 0.18, dur = 0.05) { const n = secs(len), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (f * (1 + 1.0 * Math.exp(-t / 0.01))) / SR; o[i] = Math.sin(TAU * ph) * Math.exp(-t / dur) + 0.25 * alea() * Math.exp(-t / 0.003); } return o; }
function ding(f, len = 0.6) { const n = secs(len), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(TAU * f * t) * Math.exp(-t / 0.25) + 0.35 * Math.sin(TAU * f * 2.01 * t) * Math.exp(-t / 0.12) + 0.15 * Math.sin(TAU * f * 3.0 * t) * Math.exp(-t / 0.06)) * Math.min(1, i / 30); } return o; }
// le trousseau : des tintements métalliques (partiels inharmoniques), quelques chocs rapprochés
function tintement(f, len = 0.35) { const n = secs(len), o = new Float32Array(n), r = [1, 2.76, 5.4, 8.93]; for (let i = 0; i < n; i++) { const t = i / SR; let s = 0; r.forEach((k, j) => (s += Math.sin(TAU * f * k * t + j) * Math.exp(-t / (0.12 / (j + 1))) / (j + 1))); o[i] = s * Math.min(1, i / 8); } return o; }
const TAP = bruit(0.025, 3800, 1.2, 0.004), TIC = bruit(0.02, 5200, 1.4, 0.003), BOIS = choc(140, 0.2, 0.04), SOURD = choc(70, 0.3, 0.08);
// le téléphone : l'écran s'allume, les blocs arrivent, les jours se touchent, le bouton, « Réservé »
bru.add(ding(1568, 0.5), K.tel.allume, 0.18); bru.add(souffle(0.25, 600, 4000, 1.5, 1), K.tel.allume - 0.05, 0.25);
[K.tel.photo, K.tel.titre, K.tel.prix].forEach((t, k) => bru.add(TIC, t, 0.35, k % 2 ? 0.2 : -0.2));
bru.add(souffle(0.3, 500, 5000, 1.4, 1), K.tel.dates - 0.12, 0.35);
[K.tel.ven, K.tel.dim].forEach((t) => { bru.add(TAP, t, 0.8); bru.add(TIC, t + 0.01, 0.4); }); bru.add(TIC, K.tel.total, 0.4);
bru.add(TAP, K.tel.appui, 0.9); bru.add(choc(220, 0.08, 0.02), K.tel.appui, 0.3); bru.add(ding(1319, 0.7), K.tel.reserve, 0.4); bru.add(ding(1976, 0.8), K.tel.reserve + 0.12, 0.3);
// le calendrier : la caméra glisse jusqu'à lui ; chaque feuillet passe par-dessus les anneaux (un froissé de papier, puis un claquement)
bru.add(souffle(0.6, 300, 3000, 1.3, 1), K.tel.veille - 0.1, 0.5);
K.cal.feuillets.forEach((t) => { bru.add(souffle(K.cal.duree, 1200, 7000, 1.2, 1), t, 0.6, -0.2); bru.add(bruit(0.05, 2400, 0.9, 0.012), t + K.cal.duree - 0.03, 0.7); bru.add(BOIS, t + K.cal.duree - 0.02, 0.25); });
// la clé : le passage de la caméra, la chute, le choc sur le bois, le trousseau qui tinte et se pose
bru.add(souffle(0.5, 300, 5000, 1.2, 1), 5.6, 0.5); bru.add(souffle(0.4, 500, 3000, 2.0), K.cle.impact - 0.4, 0.25);
{ const t = K.cle.impact; bru.add(BOIS, t, 1.0); bru.add(SOURD, t, 0.5); [0, 0.05, 0.11, 0.19, 0.3].forEach((d, k) => bru.add(tintement(2300 + 650 * Math.sin(k * 2.1), 0.4), t + d, 0.5 * Math.exp(-k * 0.35), k % 2 ? 0.25 : -0.1)); }
bru.add(ding(1760, 0.6), K.cle.notif, 0.35); bru.add(ding(2637, 0.6), K.cle.notif + 0.1, 0.25);   // la notification
// la fin : le logo, l'adresse
bru.add(souffle(0.5, 400, 6000, 1.4, 1), K.fin.logo - 0.25, 0.4); bru.add(ding(1397, 1.2), K.fin.logo, 0.3); bru.add(TIC, K.fin.adresse, 0.4);
{ const [rL, rR] = reverb(bru.L, bru.R, { room: 0.55, damp: 0.5 }); bru.addStereo(rL, rR, 0, 0.16); }

// ------------------------------------------------------------------ réverbération, niveau, fichiers
{ const [rL, rR] = reverb(echo.L, echo.R, { room: 0.82, damp: 0.45 }); mus.addStereo(rL, rR, 0, 0.7); }
const mix = new Track(D); mix.addStereo(mus.L, mus.R, 0, 1); mix.addStereo(bru.L, bru.R, 0, 0.55);
for (const tr of [mus, mix]) for (let i = secs(D - 0.8); i < tr.n; i++) { const g = Math.pow(Math.cos(((i / SR - (D - 0.8)) / 0.8) * (Math.PI / 2)), 2); tr.L[i] *= g; tr.R[i] *= g; }   // la fin : on s'efface
const CIBLE = -14, gainCommun = fromDb(CIBLE - lufs(mix.L, mix.R));
const finir = (tr) => { tr.scale(gainCommun); for (let i = 0; i < tr.n; i++) { tr.L[i] = Math.tanh(tr.L[i] * 1.2) / 1.2; tr.R[i] = Math.tanh(tr.R[i] * 1.2) / 1.2; } const avant = tr.peak(), actif = limiter(tr.L, tr.R, -1); return { avant, actif }; };
finir(mus); const { avant, actif } = finir(mix);
mkdirSync(join(root, "audio"), { recursive: true });
writeWav(join(root, "audio", "musique.wav"), [mus.L, mus.R], SR, 24);
writeWav(join(root, "audio", "mix.wav"), [mix.L, mix.R], SR, 24);
toM4a(join(root, "audio", "mix.wav"), join(root, "audio", "mix.m4a"), 256);
toM4a(join(root, "audio", "musique.wav"), join(root, "audio", "musique.m4a"), 256);
const gc = [...coups].sort((x, y) => x - y).map((t) => +t.toFixed(4));
writeFileSync(join(root, "audio", "grille.json"), JSON.stringify({ bpm: 120, temps: BEAT, mesure: BAR, imagesParTemps: 30, duree: D, grosseCaisse: gc }, null, 1));
const attendu = [...K.grosseCaisse].sort((x, y) => x - y).map((t) => +t.toFixed(4));
let sat = 0; for (let i = 0; i < mix.n; i++) if (Math.abs(mix.L[i]) >= 0.999 || Math.abs(mix.R[i]) >= 0.999) sat++;
console.log(`durée ${D.toFixed(3)} s, 120 battements par minute, 8 mesures, ${coups.length} coups de grosse caisse (ceux du conducteur : ${JSON.stringify(gc) === JSON.stringify(attendu) ? "oui" : "NON"})`);
console.log(`sonie du mix ${lufs(mix.L, mix.R).toFixed(1)} LUFS, crête ${dB(mix.peak()).toFixed(2)} dBFS (avant limiteur ${dB(avant).toFixed(1)}, actif ${(actif * 100).toFixed(1)} % du temps), échantillons saturés ${sat}`);
console.log("niveau par mesure (dB) : " + Array.from({ length: 8 }, (_, k) => dB(mix.rms(k * BAR, (k + 1) * BAR)).toFixed(0)).join(" "));
