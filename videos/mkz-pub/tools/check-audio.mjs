// Contrôles du son avant envoi : profil des niveaux seconde par seconde, équilibre gauche/droite, compatibilité mono.
//   node tools/check-audio.mjs
import { readFileSync } from "node:fs";
import { readWav, SR, dB } from "./wav.mjs";

const load = (f) => readWav(f).channels;
const stems = { musique: load("audio/stems/musique.wav"), bruitages: load("audio/stems/bruitages.wav"), mix: load("audio/mix.wav") };
const rms = (x, a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / (b - a));
};
console.log("niveau efficace par seconde (dB) :");
console.log("  s        " + Array.from({ length: 20 }, (_, i) => String(i).padStart(4)).join(""));
for (const [name, ch] of Object.entries(stems)) console.log("  " + name.padEnd(9) + Array.from({ length: 20 }, (_, i) => dB(rms(ch[0], i * SR, (i + 1) * SR)).toFixed(0).padStart(4)).join(""));
for (const name of ["musique", "bruitages", "mix"]) {
  const [L, R] = stems[name];
  let sl = 0, sr = 0, slr = 0;
  for (let i = 0; i < L.length; i++) {
    sl += L[i] * L[i];
    sr += R[i] * R[i];
    slr += L[i] * R[i];
  }
  console.log(`${name.padEnd(9)} équilibre gauche/droite : ${(dB(Math.sqrt(sl)) - dB(Math.sqrt(sr))).toFixed(2)} dB  |  corrélation (compatibilité mono) : ${(slr / Math.sqrt(sl * sr)).toFixed(2)}`);
}

