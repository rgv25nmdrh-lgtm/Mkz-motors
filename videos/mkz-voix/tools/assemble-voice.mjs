// Étape 4 : assemble la voix sur la ligne de temps et en déduit le calage réel de la vidéo.
// - chaque phrase est une génération entière ; on ne coupe que dans de vrais silences
//   (début, fin, et pauses de ponctuation trop longues), jamais dans un mot ;
// - aucune accélération de la voix ;
// - les débuts de phrase sont posés sur la grille rythmique de la musique.
//
//   node tools/assemble-voice.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SR, readWav, writeWav, rms, dB, fromDb } from "./wav.mjs";
import { wordsOf } from "./words.mjs";
import { buildShots } from "./shots.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SENT = JSON.parse(readFileSync(join(root, "audio", "script.json"), "utf8"));
const DURATION = 20.0;
const FPS = 30;
export const BPM = 120;
const GRID = 60 / BPM / 4; // double croche : 0,125 s
const MIN_GAP = 0.13; // respiration minimale entre deux phrases
const SILENCE = fromDb(-50);
const PAUSE = { ",": 0.2, ":": 0.36, "?": 0.38, ".": 0.38 }; // pause conservée après une ponctuation interne

const hop = Math.round(0.005 * SR);
const win = Math.round(0.012 * SR);
// niveau à court terme (une valeur toutes les 5 ms)
const levels = (x) => {
  const out = [];
  for (let i = 0; i + win <= x.length; i += hop) out.push(rms(x, i, i + win));
  return out;
};

const report = [];
let loudestCut = -200; // niveau le plus élevé mesuré à un point de coupe (dBFS)
const pieces = SENT.map((text, i) => {
  const n = i + 1;
  let x = readWav(join(root, "audio", "voice", `s${n}.wav`)).channels[0];
  const al = JSON.parse(readFileSync(join(root, "audio", "voice", `s${n}.json`), "utf8"));
  let words = wordsOf(text, al);
  const lv = levels(x);
  const silentAt = (t) => (lv[Math.min(lv.length - 1, Math.max(0, Math.round((t * SR) / hop)))] ?? 0) < SILENCE;

  // 1. pauses internes trop longues : on retire le milieu du silence
  const toks = text.split(" ");
  const punctAfter = [];
  toks.forEach((tok, k) => {
    if (/^[?:!;.]$/.test(tok)) punctAfter[punctAfter.length - 1] = tok;
    else punctAfter.push((tok.match(/[,.]$/) || [""])[0]);
  });
  const cuts = [];
  for (let k = 0; k < words.length - 1; k++) {
    const target = PAUSE[punctAfter[k]];
    if (!target) continue;
    // plus long silence réel entre les deux mots (le calage est approximatif : on cherche un peu autour)
    let best = null;
    let run = null;
    for (let t = words[k].end - 0.12; t <= words[k + 1].start + 0.1; t += hop / SR) {
      if (silentAt(t)) run = run ? [run[0], t] : [t, t];
      else {
        if (run && (!best || run[1] - run[0] > best[1] - best[0])) best = run;
        run = null;
      }
    }
    if (run && (!best || run[1] - run[0] > best[1] - best[0])) best = run;
    if (best && best[1] - best[0] > target + 0.05) {
      const remove = best[1] - best[0] - target;
      const mid = (best[0] + best[1]) / 2;
      cuts.push({ a: mid - remove / 2, b: mid + remove / 2, after: words[k].w + punctAfter[k] });
    }
  }
  // application des coupes (de la fin vers le début), avec un fondu de 6 ms dans le silence
  const fade = Math.round(0.006 * SR);
  for (const c of [...cuts].reverse()) {
    const a = Math.round(c.a * SR);
    const b = Math.round(c.b * SR);
    loudestCut = Math.max(loudestCut, dB(rms(x, a - 240, a + 240)), dB(rms(x, b - 240, b + 240)));
    const y = new Float32Array(x.length - (b - a));
    y.set(x.subarray(0, a), 0);
    y.set(x.subarray(b), a);
    for (let j = 0; j < fade; j++) {
      y[a - 1 - j] *= j / fade;
      y[a + j] *= j / fade;
    }
    x = y;
    const removed = (b - a) / SR;
    words = words.map((w) => (w.start >= c.b - 0.001 ? { ...w, start: w.start - removed, end: w.end - removed } : w));
  }

  // 2. début et fin de la parole (on ignore tout bruit isolé après la fin du dernier mot)
  const lv2 = levels(x);
  const th = fromDb(-45);
  let a = 0;
  while (a < lv2.length && lv2[a] < th) a++;
  let b = Math.min(lv2.length - 1, Math.round(((words.at(-1).end + 0.3) * SR) / hop));
  while (b > a && lv2[b] < th) b--;
  const on = Math.max(0, a * hop - Math.round(0.012 * SR));
  const off = Math.min(x.length, b * hop + win + Math.round(0.05 * SR));
  const speech = x.slice(on, off);
  loudestCut = Math.max(loudestCut, dB(rms(speech, 0, 240)), dB(rms(speech, speech.length - 240, speech.length)));
  for (let j = 0; j < fade; j++) {
    speech[j] *= j / fade;
    speech[speech.length - 1 - j] *= j / fade;
  }
  words = words.map((w) => ({ w: w.w, start: Math.max(0, w.start - on / SR), end: Math.min(speech.length / SR, w.end - on / SR) }));

  // 3. même niveau de voix pour toutes les phrases (niveau moyen pendant la parole)
  const active = [];
  for (let j = 0; j + win <= speech.length; j += win) {
    const r = rms(speech, j, j + win);
    if (r > fromDb(-40)) active.push(r * r);
  }
  const lvl = Math.sqrt(active.reduce((s, v) => s + v, 0) / active.length);
  const gain = fromDb(-20) / lvl;
  for (let j = 0; j < speech.length; j++) speech[j] *= gain;

  report.push(`s${n}  ${(speech.length / SR).toFixed(2)} s  niveau ${dB(lvl).toFixed(1)} dB -> gain ${dB(gain).toFixed(1)} dB` + (cuts.length ? `  pauses raccourcies : ${cuts.map((c) => `après « ${c.after} » −${(c.b - c.a).toFixed(2)} s`).join(", ")}` : ""));
  return { text, speech, words, dur: speech.length / SR };
});

// 4. placement sur la ligne de temps : chaque phrase démarre sur la grille (double croche à 120 BPM)
const snapUp = (t) => Math.ceil(t / GRID - 1e-6) * GRID;
// Débuts visés, un par plan : chaque phrase démarre une double croche après un temps, la coupe tombe sur ce temps.
// 0,625 : le spot a claqué ; 3 à 5 s'enchaînent (une seule phrase dite en trois fois) ; 6 respire avant le résumé.
const CIBLES = [0.625, 2.625, 5.125, 7.125, 9.125, 11.625, 14.625];
let t = 0;
const starts = [];
pieces.forEach((p, i) => {
  const d = snapUp(Math.max(CIBLES[i] ?? 0, i ? t : 0));
  starts.push(d);
  t = d + p.dur + MIN_GAP;
});
const voiceEnd = starts.at(-1) + pieces.at(-1).dur;

const voice = new Float32Array(Math.round(DURATION * SR));
pieces.forEach((p, i) => {
  const at = Math.round(starts[i] * SR);
  for (let j = 0; j < p.speech.length && at + j < voice.length; j++) voice[at + j] += p.speech[j];
});
mkdirSync(join(root, "audio", "stems"), { recursive: true });
writeWav(join(root, "audio", "stems", "voix-brute.wav"), [voice], SR, 24);

// 5. calage réel pour la scène
const sentences = pieces.map((p, i) => ({
  id: `s${i + 1}`,
  text: p.text,
  start: +starts[i].toFixed(3),
  end: +(starts[i] + p.dur).toFixed(3),
  words: p.words.map((w) => ({ w: w.w, start: +(starts[i] + w.start).toFixed(3), end: +(starts[i] + w.end).toFixed(3) })),
}));
const timing = { source: "voix", bpm: BPM, duration: DURATION, fps: FPS, sentences };
timing.shots = buildShots(timing);
writeFileSync(join(root, "timing.json"), JSON.stringify(timing, null, 2));
writeFileSync(join(root, "scene", "timing.js"), `// Fichier généré par tools/assemble-voice.mjs, ne pas modifier à la main.\nwindow.TIMING = ${JSON.stringify(timing)};\n`);

console.log(report.join("\n"));
console.log(`\npoints de coupe (débuts, fins et pauses raccourcies) : niveau maximal mesuré ${loudestCut.toFixed(1)} dBFS, soit du silence (la parole est vers -20 dBFS)`);
console.log(`\nfin de la voix : ${voiceEnd.toFixed(2)} s sur ${DURATION} s (reste ${(DURATION - voiceEnd).toFixed(2)} s)`);
sentences.forEach((s, i) => console.log(`${s.id}  ${s.start.toFixed(3)} -> ${s.end.toFixed(3)}` + (i ? `  (respiration ${(s.start - sentences[i - 1].end).toFixed(2)} s)` : "")));
console.log("");
for (const s of timing.shots) console.log(`${s.id}  ${s.start.toFixed(2)} -> ${s.end.toFixed(2)}  (${(s.end - s.start).toFixed(2)} s)`);
