// La musique de la vitrine MKZ Motors (dépôt-vente) : un morceau ORIGINAL, composé et synthétisé ici, dans le style
// des montages rapides (« edits »). 120 battements par minute, huit mesures (16 s), en ré mineur, qui finit en majeur.
//   node tools/musique.mjs
// Ce n'est la copie d'aucun titre : la mélodie (scene/cues.js), les accords et la basse sont écrits pour cette vidéo ;
// seuls les instruments (grosse caisse, basse, cloche…) viennent de la boîte à outils du kit.
// La forme suit l'image : mesure 1 la plaque qu'on tape (pas de batterie), 2 la chute (le couloir, l'estimation),
// 3 et 4 la mélodie (une étape par temps), 5 le mur (tout roule), 6 un coup par chiffre (la, si bémol, do : ça monte),
// 7 la boucle (trois notes qui montent), 8 l'accord du logo, en ré majeur, tenu.
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
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ------------------------------------------------------------------ les instruments
function kick() {                                          // grosse caisse dure, écrêtée
  const n = secs(0.26), o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += (48 + 190 * Math.exp(-t / 0.018)) / SR; o[i] = Math.max(-0.9, Math.min(0.9, 3.5 * Math.sin(TAU * ph) * Math.exp(-t / 0.07))) * Math.min(1, t / 0.0008) + white() * 0.35 * Math.exp(-t / 0.001); }
  return o;
}
function clap() {
  const n = secs(0.22), o = new Float32Array(n), bp = new Biquad("bp", 1500, 0.9);
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] = bp.tick(white()) * Math.max(Math.exp(-t / 0.004), t > 0.009 ? Math.exp(-(t - 0.009) / 0.004) : 0, t > 0.018 ? Math.exp(-(t - 0.018) / 0.06) : 0); }
  return o;
}
function caisseClaire() {
  const n = secs(0.12), o = new Float32Array(n), bp = new Biquad("bp", 2300, 0.9);
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] = bp.tick(white()) * Math.exp(-t / 0.028) + 0.5 * Math.sin(TAU * 200 * t) * Math.exp(-t / 0.02); }
  return o;
}
function charleston(ouvert = 1) {
  const n = secs(0.08 * ouvert), o = new Float32Array(n), hp = new Biquad("hp", 8500, 0.8);
  for (let i = 0; i < n; i++) o[i] = hp.tick(white()) * Math.exp(-(i / SR) / (0.011 * ouvert));
  return o;
}
// Basse saturée : une sinusoïde poussée très fort dans une saturation, avec une glissade de hauteur à l'attaque.
function basse(f, len, { attaque = 0.35, chute = 0 } = {}) {
  const n = secs(len), o = new Float32Array(n), lp = new Biquad("lp", 2400, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, fr = f * (1 + attaque * Math.exp(-t / 0.025)) * Math.pow(2, (-chute * Math.max(0, t - len * 0.4)) / (len * 0.6));
    ph += fr / SR;
    o[i] = lp.tick(Math.tanh(7 * Math.sin(TAU * ph) + 1.5 * Math.sin(TAU * ph * 2))) * Math.min(1, t / 0.002) * Math.exp(-t / (len * 0.9)) * Math.min(1, (len - t) / 0.012);
  }
  return o;
}
// Cloche : deux ondes carrées désaccordées passées dans un filtre étroit, attaque sèche. C'est la mélodie.
function cloche(f, len = 0.24, sourde = 0) {
  const n = secs(len), o = new Float32Array(n), bp = new Biquad("bp", f * 1.9, 2.2), lp = new Biquad("lp", sourde ? 1400 : 9000, 0.7);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    p1 += f / SR; if (p1 >= 1) p1 -= 1; p2 += (f * 1.483) / SR; if (p2 >= 1) p2 -= 1;
    const s = (p1 < 0.5 ? 1 : -1) + 0.7 * (p2 < 0.5 ? 1 : -1);
    o[i] = lp.tick(Math.tanh(2.2 * bp.tick(s))) * Math.min(1, t / 0.001) * (0.75 * Math.exp(-t / 0.05) + 0.25 * Math.exp(-t / (len * 0.6))) * Math.min(1, (len - t) / 0.01);
  }
  return o;
}
function nappe(L, R, f, t0, t1, gain) {                    // nappe sombre : deux dents de scie désaccordées, très filtrées
  const a = secs(t0), b = Math.min(L.length, secs(t1)), d1 = (f * 0.996) / SR, d2 = (f * 1.004) / SR, fl = new SVF(), fr = new SVF();
  let p1 = 0, p2 = 0;
  for (let i = a; i < b; i++) {
    const t = i / SR, env = Math.min(1, (t - t0) / 0.25) * Math.min(1, (t1 - t) / 0.08);
    p1 += d1; if (p1 >= 1) p1 -= 1; p2 += d2; if (p2 >= 1) p2 -= 1;
    L[i] += fl.tick(saw(p1, d1), 500, 0.6).lp * env * gain; R[i] += fr.tick(saw(p2, d2), 500, 0.6).lp * env * gain;
  }
}
function souffle(len, f0, f1, forme = 2, retombe = 0) {    // bruit filtré qui monte (retombe = 1 : monte puis redescend, un passage)
  const n = secs(len), o = new Float32Array(n), f = new SVF();
  for (let i = 0; i < n; i++) { const p = i / n, e = retombe ? Math.sin(Math.PI * p) ** 2 : Math.pow(p, forme); o[i] = f.tick(white(), f0 * Math.pow(f1 / f0, retombe ? 1 - Math.abs(2 * p - 1) : p), 1.3).bp * e * Math.min(1, (n - i) / secs(0.008)); }
  return o;
}
function laser(f0, f1, len = 0.16) {                       // sifflement qui descend : la ponctuation du genre
  const n = secs(len), o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) { const p = i / n; ph += (f0 * Math.pow(f1 / f0, p)) / SR; o[i] = Math.sin(TAU * ph) * Math.min(1, i / secs(0.002)) * Math.pow(1 - p, 1.2); }
  return o;
}
function impact() {                                        // coup grave et cymbale : la première image, les chutes, la fin
  const n = secs(1.5), o = new Float32Array(n), hp = new Biquad("hp", 4500, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += (38 + 80 * Math.exp(-t / 0.05)) / SR; o[i] = Math.tanh(3 * Math.sin(TAU * ph) * Math.exp(-t / 0.3)) + 0.4 * hp.tick(white()) * Math.exp(-t / 0.45); }
  return o;
}

// ------------------------------------------------------------------ le morceau (ré mineur)
const mus = new Track(D), echo = new Track(D), tb = new Track(D);   // echo : ce qui part dans la réverbération ; tb : la basse
const K1 = kick(), C1 = clap(), S1 = caisseClaire(), H1 = charleston(), H2 = charleston(2.6), IMP = impact();
const coups = [];
const coup = (t, g = 1) => { mus.add(K1, t, g); coups.push(t); };
const cloches = (m, t0, { octave = 0, gain = 0.5, echoGain = 0.12 } = {}) => { for (const [step, note] of K.motif[m]) { const t = t0 + step * S16, s = cloche(midi(note + octave), 0.26); mus.add(s, t, gain, step % 2 ? 0.3 : -0.3); echo.add(s, t, echoGain); } };
const accord = (t, notes, len, gain, eg = 0.4) => { for (const m of notes) { const s = cloche(midi(m), len); mus.add(s, t, gain); echo.add(s, t, eg); } };
const nL = new Float32Array(mus.n), nR = new Float32Array(mus.n);
// Une mesure pleine : la grosse caisse sur chaque temps ; la basse répond sur les contretemps (pas 2, 6, 7, 10, 14), l'octave sur le pas 7.
function mesure(bar, o) {
  const t0 = bar * BAR, f = midi(o.fond);
  for (let step = 0; step < 16; step++) {
    const t = t0 + step * S16, dans = step % 4;
    if (dans === 0) coup(t, 1);
    if (!o.sansBasse && [2, 6, 7, 10, 14].includes(step)) tb.add(basse(f * (step === 7 ? 2 : step === 14 ? 1.5 : 1), step === 7 ? 0.1 : 0.21, { attaque: 0.3 }), t, step === 7 ? 0.6 : 0.95);
    if (o.clap && (step === 4 || step === 12)) { mus.add(C1, t, 0.7); echo.add(C1, t, 0.22); }
    if (o.hats16 || step % 2 === 0) mus.add(H1, t, (dans === 2 ? 0.17 : 0.09) * (o.hats16 ? 1.15 : 1), step % 2 ? 0.35 : -0.35);
    if (o.ouvert && step === 10) mus.add(H2, t, 0.15, 0.2);
  }
}
// --- mesure 1 : la barre. Une nappe sourde, un pouls, un souffle qui monte jusqu'à la chute.
for (const m of [38, 45, 50]) nappe(nL, nR, midi(m), 0, b(4) - 0.06, 0.16);
{ const a = new Biquad("lp", 170, 0.7), c = new Biquad("lp", 170, 0.7), sourd = K1.map((x) => 1.6 * c.tick(a.tick(x))); for (let k = 0; k < 4; k++) mus.add(sourd, b(k), 0.6 + 0.1 * k); }   // un pouls sourd (ce n'est pas un coup de la grille)
mus.add(souffle(1.2, 250, 7000, 2.6), b(4) - 1.2, 0.4); mus.add(C1, K.barre.appui, 0.5); echo.add(C1, K.barre.appui, 0.3);
// --- mesure 2 : la chute, le couloir ; le grand coup du compteur sur le quatrième temps
mesure(1, { fond: 38, hats16: true, ouvert: true }); mus.add(IMP, b(4), 0.9); echo.add(IMP, b(4), 0.15);
{ const s = cloche(midi(98), 0.4); mus.add(s, b(7), 0.34); echo.add(s, b(7), 0.4); mus.add(IMP, b(7), 0.6); }
// --- mesures 3 et 4 : les écrans. La mélodie entre, un pack par temps.
mesure(2, { fond: 38, clap: true, ouvert: true }); cloches(0, b(8)); mesure(3, { fond: 46, clap: true, ouvert: true }); cloches(1, b(12)); mus.add(IMP, b(8), 0.8);
// --- mesure 5 : le mur. Tout roule, la mélodie sur deux octaves ; un coup pour la plaque.
mesure(4, { fond: 48, clap: true, hats16: true, ouvert: true }); cloches(0, b(16)); cloches(0, b(16), { octave: 12, gain: 0.24, echoGain: 0.05 }); mus.add(IMP, b(16), 0.8); mus.add(IMP, b(18), 0.6);
// --- mesure 6 : les chiffres. Un coup sec par plaque, la basse en accords plaqués, puis la ligne tenue.
mesure(5, { fond: 45, sansBasse: true });
[[45, [76, 81]], [46, [77, 82]], [48, [79, 84]]].forEach(([fond, notes], k) => { const t = b(20 + k); mus.add(C1, t, 0.75); echo.add(C1, t, 0.25); tb.add(basse(midi(fond), 0.24, { attaque: 0.5 }), t + 0.02, 1.0); accord(t, notes, 0.22, 0.3, 0.2); });
mus.add(souffle(BEAT, 400, 9000, 2.4), b(23), 0.4);
// --- mesure 7 : la boucle, plus légère : trois notes qui montent, une par étape
mesure(6, { fond: 38 });
[74, 77, 81].forEach((m, k) => accord(b(24 + k), [m, m + 12], 0.45, 0.32)); mus.add(souffle(BEAT, 300, 9000, 2.2), b(27), 0.45);
// --- mesure 8 : le logo. Un grand coup, l'accord tenu, deux notes pour la phrase et l'adresse.
for (const m of [38, 45, 50, 57]) nappe(nL, nR, midi(m), b(28), D - 0.4, 0.2);
{ const t = b(28); coup(t, 1); mus.add(IMP, t, 1.0); echo.add(IMP, t, 0.3); accord(t, [74, 78, 81, 86], 1.0, 0.3, 0.5); tb.add(basse(midi(38), 1.4, { attaque: 0.5, chute: 0.3 }), t + 0.02, 0.85); }
accord(b(29), [90], 0.5, 0.22); accord(b(30), [98], 0.6, 0.2);
// la basse s'efface une fraction de seconde sous chaque coup de grosse caisse : c'est ce qui la fait « pomper »
{ const g = new Float32Array(mus.n).fill(1); for (const tc of coups) for (let i = secs(tc); i < Math.min(mus.n, secs(tc + 0.09)); i++) g[i] = Math.min(g[i], 0.35 + 0.65 * Math.max(0, i / SR - tc) / 0.09); for (let i = 0; i < mus.n; i++) { mus.L[i] += tb.L[i] * g[i]; mus.R[i] += tb.R[i] * g[i]; } }
mus.addStereo(nL, nR, 0, 1); echo.addStereo(nL, nR, 0, 0.6);

// ------------------------------------------------------------------ les bruitages, sous la musique, sur les mêmes instants que l'image
const bru = new Track(D), R2 = rng(83), alea = () => R2() * 2 - 1;
function bruit(len, f, q, decroissance, type = "bp") { const n = secs(len), o = new Float32Array(n), bq = new Biquad(type, f, q); for (let i = 0; i < n; i++) o[i] = bq.tick(alea()) * Math.exp(-(i / SR) / decroissance) * Math.min(1, i / 24); return o; }
function choc(f = 90, len = 0.18) { const n = secs(len), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (f * (1 + 1.2 * Math.exp(-t / 0.012))) / SR; o[i] = Math.sin(TAU * ph) * Math.exp(-t / 0.05) + 0.3 * alea() * Math.exp(-t / 0.004); } return o; }
function verre(f = 2400, len = 0.5) { const n = secs(len), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(TAU * f * t) * Math.exp(-t / 0.12) + 0.6 * Math.sin(TAU * f * 1.59 * t) * Math.exp(-t / 0.07) + 0.4 * Math.sin(TAU * f * 2.37 * t) * Math.exp(-t / 0.04)) * Math.min(1, i / 12) * 0.5; } return o; }
function bulle(f = 620) { const n = secs(0.09), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const p = i / n; ph += (f * (1 + 1.1 * p)) / SR; o[i] = Math.sin(TAU * ph) * Math.min(1, i / 40) * (1 - p) ** 1.5; } return o; }
const CLAC = bruit(0.06, 3200, 0.8, 0.012), TIC = bruit(0.02, 4200, 1.2, 0.004), SOURD = choc(90), TOC = choc(160, 0.1);
// la barre : le verre, la plaque tapée (une touche par lettre), la voiture reconnue, le bouton
bru.add(verre(1175, 0.5), 0.02, 0.3); K.barre.touches.forEach((tk, k) => { bru.add(TIC, tk, 0.9, k % 2 ? 0.2 : -0.2); bru.add(TOC, tk + 0.004, 0.35); });
bru.add(verre(2349, 0.6), K.barre.reconnue, 0.45); bru.add(bulle(880), K.barre.reconnue, 0.5); bru.add(CLAC, K.barre.appui + 0.02, 0.9); bru.add(TOC, K.barre.appui + 0.02, 0.6); bru.add(souffle(0.42, 400, 7000, 1.6), K.barre.appui + 0.06, 0.8);
// le couloir : le souffle de la course, les images qui défilent de plus en plus vite, le compteur qui se bloque
bru.add(souffle(1.4, 300, 5000, 1.3, 1), b(4), 0.9); for (let k = 0; k < 60; k++) bru.add(TIC, b(4) + 1.5 * Math.sqrt(k / 60), 0.45, 0.7 * (hash(k * 1.3) - 0.5));
bru.add(SOURD, b(7), 0.9); bru.add(verre(2349, 0.6), b(7), 0.4);
// les écrans : ils sortent du sol, puis une coupe par temps
bru.add(souffle(0.3, 300, 3000, 1.3, 1), b(8) - 0.1, 0.7); for (let k = 0; k < 7; k++) bru.add(souffle(0.13, 700, 4500, 1.2, 1), b(9 + k) - 0.04, 0.5, k % 2 ? 0.35 : -0.35);
// le mur : le balayage, puis la plaque qui tombe
bru.add(souffle(0.9, 300, 6000, 1.2, 1), b(16), 0.9); bru.add(SOURD, b(18), 0.9); bru.add(CLAC, b(18), 0.5);
// les chiffres : trois plaques
for (let k = 0; k < 3; k++) { bru.add(souffle(0.16, 400, 3500, 1.5), b(20 + k) - 0.16, 0.7); bru.add(SOURD, b(20 + k), 1.0); bru.add(CLAC, b(20 + k), 0.6); }
// la boucle : la pastille saute, puis s'envole vers le logo
for (let k = 0; k < 3; k++) { bru.add(bulle(520 + 110 * k), b(24 + k), 0.8); bru.add(TOC, b(24 + k), 0.4); } bru.add(souffle(0.4, 400, 6000, 1.4, 1), b(27) + 0.08, 0.8);
// le logo, la phrase, l'adresse
bru.add(verre(1175, 1.2), b(28), 0.45); bru.add(SOURD, b(28), 0.7); bru.add(TOC, b(29), 0.4); bru.add(TOC, b(29) + 0.25, 0.35); bru.add(TIC, b(30), 0.6);
{ const [rL, rR] = reverb(bru.L, bru.R, { room: 0.6, damp: 0.5 }); bru.addStereo(rL, rR, 0, 0.18); }

// ------------------------------------------------------------------ réverbération, niveau, fichiers
{ const [rL, rR] = reverb(echo.L, echo.R, { room: 0.88, damp: 0.35 }); mus.addStereo(rL, rR, 0, 0.75); }
const mix = new Track(D); mix.addStereo(mus.L, mus.R, 0, 1); mix.addStereo(bru.L, bru.R, 0, 0.5);
const SILENCE = [b(4) - 0.05, b(4)];                         // un souffle coupé net juste avant la chute
for (const tr of [mus, mix]) {
  for (let i = secs(SILENCE[0]); i < secs(SILENCE[1]); i++) { const g = Math.max(0, 1 - (i / SR - SILENCE[0]) / 0.008); tr.L[i] *= g; tr.R[i] *= g; }
  for (let i = secs(D - 0.6); i < tr.n; i++) { const g = Math.pow(Math.cos(((i / SR - (D - 0.6)) / 0.6) * (Math.PI / 2)), 2); tr.L[i] *= g; tr.R[i] *= g; }   // la fin : silence
}
const CIBLE = -13.4, gainCommun = fromDb(CIBLE - lufs(mix.L, mix.R));
const finir = (tr) => { tr.scale(gainCommun); for (let i = 0; i < tr.n; i++) { tr.L[i] = Math.tanh(tr.L[i] * 1.3) / 1.3; tr.R[i] = Math.tanh(tr.R[i] * 1.3) / 1.3; } const avant = tr.peak(), actif = limiter(tr.L, tr.R, -1); return { avant, actif }; };
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
console.log(`fin (50 dernières ms) : ${dB(mix.rms(D - 0.05, D)).toFixed(1)} dB · début (50 premières ms) : ${dB(mix.rms(0, 0.05)).toFixed(1)} dB · bruitages seuls : ${dB(bru.rms(0, D)).toFixed(1)} dB avant mixage`);
