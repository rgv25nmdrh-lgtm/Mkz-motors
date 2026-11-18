// Contrôles du son avant envoi : profil des niveaux seconde par seconde, équilibre gauche/droite,
// compatibilité mono, et comparaison de la reconnaissance vocale avec le script.
//   node tools/check-audio.mjs [out/stt.txt]
// La reconnaissance vocale est facultative : « node tools/stt.mjs » écrit out/stt.txt si Whisper est installé.
import { readFileSync, existsSync } from "node:fs";
import { readWav, SR, dB } from "./wav.mjs";

const T = JSON.parse(readFileSync("timing.json", "utf8"));
const load = (f) => readWav(f).channels;
const stems = { voix: load("audio/stems/voix.wav"), musique: load("audio/stems/musique.wav"), bruitages: load("audio/stems/bruitages.wav"), mix: load("audio/mix.wav") };
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

// comparaison script / reconnaissance vocale
const sttFile = process.argv[2] || "out/stt.txt";
if (existsSync(sttFile)) {
  const line = readFileSync(sttFile, "utf8").split("\n").find((l) => l.startsWith("TEXTE "));
  const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-zàâäçéèêëîïôöùûüœ' ]/g, " ").split(/\s+/).filter(Boolean);
  // formes que l'outil écrit autrement mais qui se prononcent pareil
  const same = { coller: "collez", prompte: "prompt", bruitage: "bruitages", "s'": "s'occupe", occupe: "s'occupe" };
  const heard = norm(line.slice(6)).map((w) => same[w] || w);
  const expected = norm(JSON.parse(readFileSync("audio/script.json", "utf8")).join(" "));
  let j = 0;
  const missing = [];
  for (const w of expected) {
    const k = heard.indexOf(w, j);
    if (k >= 0 && k - j < 4) j = k + 1;
    else missing.push(w);
  }
  console.log(`reconnaissance vocale : ${expected.length - missing.length} mots reconnus sur ${expected.length}` + (missing.length ? `  |  non reconnus : ${missing.join(", ")}` : ""));
} else console.log(`comparaison avec le script : sautée (pas de ${sttFile} ; lance « node tools/stt.mjs » si Whisper est installé, sinon relis la voix à l'oreille)`);
