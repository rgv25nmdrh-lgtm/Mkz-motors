// Fabrique la musique et les bruitages de la publicité MKZ Motors par synthèse, puis les mixe (pas de voix).
//   node tools/sound.mjs
// Sorties : audio/stems/musique.wav, bruitages.wav (pistes séparées),
//           audio/mix.wav et audio/mix.m4a (mix final, limiteur à -1 dBFS),
//           scene/wave.js (vraies formes d'onde, affichées dans la table de montage de la vidéo).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readWav, writeWav, toM4a } from "./wav.mjs";
import { SR, midi, dB, fromDb, clamp, secs, rng, Biquad, SVF, saw, Track, reverb, pingPong, envelope, compress, deEss, limiter, lufs } from "./dsp.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const T = JSON.parse(readFileSync(join(root, "timing.json"), "utf8"));
await import("../scene/cues.js");
const { K, sfx } = globalThis.buildCues(T);
const D = T.duration;
const BEAT = 60 / T.bpm; // 0,5 s à 120 BPM
const S16 = BEAT / 4;
const BAR = BEAT * 4;
const lerp = (a, b, p) => a + (b - a) * clamp(p);
const TAU = 2 * Math.PI;
const N = rng(20261001);
const white = () => N() * 2 - 1;
const SH = T.shots.map((s) => s.start);

// Repères musicaux : rythmée dès la première image, un impact à chaque changement de plan, pleine à partir du plan 3.
const GROOVE_IN = 0; // la batterie est là dès la première image
const BUILD_IN = BAR; // basse et arpège entrent à la 2e mesure, avec le plan 2
const FULL_IN = Math.round(SH[2] / BEAT) * BEAT; // plein régime au plan 3
const FINAL = Math.round(K.p6.site / BAR) * BAR; // accord final quand le site arrive (18 s)
const BREAK_IN = FINAL, BREAK_OUT = FINAL; // pas de silence rythmique dans cette vidéo
const inGroove = (t) => t >= GROOVE_IN && t < FINAL;

// Énergie 0..1 : pilote l'ouverture des filtres et les niveaux
function energy(t) {
  if (t < SH[1]) return 0.42;
  if (t < SH[2]) return lerp(0.6, 0.74, (t - SH[1]) / (SH[2] - SH[1]));
  if (t < SH[3]) return 0.8;
  if (t < SH[4]) return 0.76;
  if (t < SH[5]) return 0.88;
  if (t < FINAL) return lerp(0.92, 1, (t - SH[5]) / (FINAL - SH[5]));
  return 0.7;
}

// ------------------------------------------------------------------ harmonie
// La mineur / do majeur : Am F C G | Am F C G | F C(add9)
const CH = {
  Am: { pad: [57, 60, 64], bass: 33, arp: [69, 72, 76, 72] },
  F: { pad: [57, 60, 65], bass: 29, arp: [65, 69, 72, 69] },
  C: { pad: [55, 60, 64], bass: 36, arp: [72, 76, 79, 76] },
  G: { pad: [55, 59, 62], bass: 31, arp: [67, 71, 74, 71] },
};
const PROG = ["Am", "F", "C", "G", "Am", "F", "C", "G", "F", "C"];
const chordAt = (t) => CH[PROG[Math.min(PROG.length - 1, Math.floor(t / BAR + 1e-6))]];

// ------------------------------------------------------------------ instruments
function kick(body = 1) {
  const n = secs(0.34);
  const o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (44 + 125 * Math.exp(-t / 0.026)) / SR;
    o[i] = Math.sin(TAU * ph) * Math.exp(-t / (0.085 * body)) * Math.min(1, t / 0.0012) + white() * 0.25 * Math.exp(-t / 0.0015);
  }
  return o;
}
function hat(open = 1) {
  const n = secs(0.1);
  const o = new Float32Array(n);
  const hp = new Biquad("hp", 7500, 0.8);
  for (let i = 0; i < n; i++) o[i] = hp.tick(white()) * Math.exp(-(i / SR) / (0.014 * open));
  return o;
}
function clap() {
  const n = secs(0.22);
  const o = new Float32Array(n);
  const bp = new Biquad("bp", 1450, 1.1);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const burst = Math.max(Math.exp(-t / 0.004), t > 0.009 ? Math.exp(-(t - 0.009) / 0.004) : 0, t > 0.018 ? Math.exp(-(t - 0.018) / 0.05) : 0);
    o[i] = bp.tick(white()) * burst;
  }
  return o;
}
function bassNote(f, len = 0.24) {
  const n = secs(len);
  const o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.13) * Math.min(1, (len - t) / 0.02);
    o[i] = (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * 2 * f * t) + 0.22 * Math.sin(TAU * 3 * f * t) + 0.1 * Math.sin(TAU * 4 * f * t)) * env * 0.6;
  }
  return o;
}
function pluck(f, bright, len = 0.34) {
  const n = secs(len);
  const o = new Float32Array(n);
  const flt = new SVF();
  let ph = 0;
  const dt = f / SR;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += dt;
    if (ph >= 1) ph -= 1;
    const fc = 350 + bright * (500 + 5200 * Math.exp(-t / 0.05));
    o[i] = flt.tick(saw(ph, dt), fc, 1.1).lp * Math.min(1, t / 0.002) * Math.exp(-t / 0.1) * Math.min(1, (len - t) / 0.02);
  }
  return o;
}
// nappe : deux dents de scie désaccordées par note, une à gauche, une à droite
function padInto(L, R, f, t0, t1, attack, release, gain) {
  const a = secs(t0);
  const b = Math.min(L.length, secs(t1 + release));
  let p1 = 0;
  let p2 = 0;
  const d1 = (f * Math.pow(2, -7 / 1200)) / SR;
  const d2 = (f * Math.pow(2, 7 / 1200)) / SR;
  for (let i = a; i < b; i++) {
    const t = i / SR;
    p1 += d1;
    if (p1 >= 1) p1 -= 1;
    p2 += d2;
    if (p2 >= 1) p2 -= 1;
    const env = Math.min(1, (t - t0) / attack) * (t > t1 ? Math.max(0, 1 - (t - t1) / release) : 1);
    const e = env * env * gain;
    L[i] += (saw(p1, d1) * 0.8 + saw(p2, d2) * 0.2) * e;
    R[i] += (saw(p2, d2) * 0.8 + saw(p1, d1) * 0.2) * e;
  }
}
function bell(f, len = 0.9, index = 2.2) {
  const n = secs(len);
  const o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const I = index * Math.exp(-t / 0.07);
    o[i] = (Math.sin(TAU * f * t + I * Math.sin(TAU * f * 3.01 * t)) + 0.22 * Math.sin(TAU * 2 * f * t)) * Math.min(1, t / 0.002) * Math.exp(-t / (len / 4)) * Math.min(1, (len - t) / 0.03);
  }
  return o;
}

// ------------------------------------------------------------------ MUSIQUE
const score = []; // partition réelle : { t, m (note MIDI), d (durée), k (instrument) }
const note = (t, m, d, k) => score.push({ t: +t.toFixed(3), m, d: +d.toFixed(3), k });
const music = new Track(D);
const mSend = new Track(D); // départ vers la réverbération
const arp = new Track(D);

// nappe
{
  const pL = new Float32Array(music.n);
  const pR = new Float32Array(music.n);
  for (let bar = 0; bar * BAR < FINAL - 1e-6; bar++) {
    const t0 = bar * BAR;
    const ch = CH[PROG[bar]];
    for (const m of ch.pad) {
      padInto(pL, pR, midi(m), t0, t0 + BAR - 0.05, bar === 0 ? 0.7 : 0.28, 0.45, 0.16);
      note(t0, m, BAR, "pad");
    }
    padInto(pL, pR, midi(ch.bass + 12), t0, t0 + BAR - 0.05, bar === 0 ? 0.7 : 0.28, 0.45, 0.1);
  }
  // accord final (do add9) : attaque franche, longue tenue
  for (const m of [48, 55, 60, 62, 64, 67, 76]) {
    padInto(pL, pR, midi(m), FINAL, D - 0.5, 0.03, 0.45, 0.15);
    note(FINAL, m, D - FINAL, "pad");
  }
  const fL = new SVF();
  const fR = new SVF();
  let e = energy(0);
  for (let i = 0; i < music.n; i++) {
    const t = i / SR;
    e += (energy(t) - e) * (1 / (0.18 * SR));
    const fc = t < FINAL ? 380 + 3000 * Math.pow(e, 1.4) : 900 + 4200 * Math.exp(-(t - FINAL) / 0.9);
    const l = fL.tick(pL[i], fc, 0.75).lp;
    const r = fR.tick(pR[i], fc, 0.75).lp;
    music.L[i] += l;
    music.R[i] += r;
    mSend.L[i] += l * 0.5;
    mSend.R[i] += r * 0.5;
  }
}

// pulsation grave discrète avant l'entrée de la batterie (un battement par temps)
for (let t = 0; t < GROOVE_IN - 1e-6; t += BEAT) music.add(kick(0.7), t, 0.22 + 0.1 * energy(t));

// batterie
const K1 = kick();
const H1 = hat();
const C1 = clap();
for (let t = GROOVE_IN; t < FINAL - 1e-6; t += S16) {
  if (!inGroove(t)) continue;
  const step = Math.round(t / S16) % 16; // position dans la mesure
  const e = energy(t);
  if (step % 4 === 0) {
    music.add(K1, t, 0.5 + 0.22 * e);
    note(t, 36, 0.1, "kick");
  }
  if (step % 4 === 2) music.add(H1, t, 0.1 + 0.07 * e, 0.2);
  else if (step % 2 === 1 && t >= FULL_IN) music.add(H1, t, 0.045 + 0.03 * e, -0.2);
  if ((step === 4 || step === 12) && t >= FULL_IN) {
    music.add(C1, t, 0.3);
    mSend.add(C1, t, 0.16);
  }
}

// basse (croches) et arpège (doubles croches)
for (let t = BUILD_IN; t < FINAL - 1e-6; t += S16) {
  if (t >= BREAK_IN && t < BREAK_OUT) continue;
  const step = Math.round(t / S16);
  const ch = chordAt(t);
  const e = energy(t);
  if (step % 2 === 0) {
    music.add(bassNote(midi(ch.bass)), t, 0.34 + 0.2 * e);
    note(t, ch.bass, 0.22, "bass");
  }
  const arpNote = ch.arp[step % 4] + (step % 8 === 4 ? 12 : 0);
  const acc = [1, 0.5, 0.72, 0.5][step % 4];
  arp.add(pluck(midi(arpNote), 0.25 + 0.75 * e), t, (0.12 + 0.16 * e) * acc, step % 2 ? 0.4 : -0.4);
  note(t, arpNote, 0.11, "arp");
}
{
  const [dL, dR] = pingPong(arp.L, arp.R, BEAT * 0.75, 0.3);
  music.mix(arp);
  music.addStereo(dL, dR, 0, 0.3);
  for (let i = 0; i < music.n; i++) {
    mSend.L[i] += arp.L[i] * 0.3 + dL[i] * 0.15;
    mSend.R[i] += arp.R[i] * 0.3 + dR[i] * 0.15;
  }
}

// montée vers l'accord final, puis l'accord lui-même
{
  const dur = 1.0;
  const n = secs(dur);
  const o = new Float32Array(n);
  const f = new SVF();
  for (let i = 0; i < n; i++) {
    const p = i / n;
    o[i] = f.tick(white(), 500 * Math.pow(14, p), 1.6).bp * Math.pow(p, 2.2) * Math.min(1, (n - i) / secs(0.02));
  }
  music.add(o, FINAL - dur, 0.42);
  music.add(kick(1.6), FINAL, 0.9);
  music.add(bassNote(midi(36), 1.5), FINAL, 0.7);
  for (const [m, pan] of [[60, -0.5], [64, 0.2], [67, -0.2], [72, 0.5], [74, -0.35], [76, 0.35]]) {
    const p = pluck(midi(m), 1, 0.6);
    music.add(p, FINAL, 0.16, pan);
    mSend.add(p, FINAL, 0.1, pan);
  }
  const bl = bell(midi(84), 1.6, 1.6);
  music.add(bl, FINAL, 0.1, 0.25);
  mSend.add(bl, FINAL, 0.1, 0.25);
  // souffle de cymbale
  const cn = secs(1.5);
  const c = new Float32Array(cn);
  const hp = new Biquad("hp", 5000, 0.7);
  for (let i = 0; i < cn; i++) c[i] = hp.tick(white()) * Math.exp(-(i / SR) / 0.45);
  music.add(c, FINAL, 0.1);
  mSend.add(c, FINAL, 0.06);
}
{
  const [rL, rR] = reverb(mSend.L, mSend.R, { room: 0.86, damp: 0.3 });
  music.addStereo(rL, rR, 0, 0.9);
}

// ------------------------------------------------------------------ BRUITAGES
const fx = new Track(D);
const fxSend = new Track(D);
const norm = (o) => {
  const m = o.reduce((a, v) => Math.max(a, Math.abs(v)), 0) || 1;
  for (let i = 0; i < o.length; i++) o[i] /= m;
  return o;
};
const gen = (len, fn) => {
  const n = secs(len);
  const o = new Float32Array(n);
  for (let i = 0; i < n; i++) o[i] = fn(i / SR, i, n);
  return norm(o);
};
const tick = () => {
  const hp = new Biquad("hp", 2600, 0.8);
  return gen(0.03, (t) => hp.tick(white()) * Math.exp(-t / 0.003) * 0.7 + Math.sin(TAU * 2200 * t) * Math.exp(-t / 0.005) * 0.4);
};
const keyClick = () => {
  const bp = new Biquad("bp", 3200 + 1800 * N(), 2.2);
  const a = 0.6 + 0.4 * N();
  const o = gen(0.02, (t) => bp.tick(white()) * Math.exp(-t / 0.0028));
  for (let i = 0; i < o.length; i++) o[i] *= a;
  return o;
};
const pop = (f, len = 0.11) => gen(len, (t) => Math.sin(TAU * f * (t + 0.004 * (1 - Math.exp(-t / 0.008)))) * Math.min(1, t / 0.001) * Math.exp(-t / 0.028) + 0.2 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / 0.012));
const blip = () => {
  let ph = 0;
  return gen(0.14, (t) => {
    ph += (620 + 760 * (1 - Math.exp(-t / 0.022))) / SR;
    return Math.sin(TAU * ph) * Math.min(1, t / 0.001) * Math.exp(-t / 0.04);
  });
};
const dropSnd = () => {
  let ph = 0;
  return gen(0.16, (t) => {
    ph += (120 + 170 * Math.exp(-t / 0.02)) / SR;
    return Math.sin(TAU * ph) * Math.min(1, t / 0.001) * Math.exp(-t / 0.045) + white() * 0.2 * Math.exp(-t / 0.002);
  });
};
// souffle : bruit filtré dont la fréquence glisse (f0 -> f1 -> f2)
const sweep = (len, f0, f1, f2, shape = 1.5, q = 1.4) => {
  const f = new SVF();
  return gen(len, (t, i, n) => {
    const p = i / n;
    const fc = p < 0.5 ? f0 * Math.pow(f1 / f0, p * 2) : f1 * Math.pow(f2 / f1, (p - 0.5) * 2);
    return f.tick(white(), fc, q).bp * Math.pow(Math.sin(Math.PI * p), shape);
  });
};
const hit = (f0 = 95, tail = 0.12, air = 0.22) => {
  let ph = 0;
  const lp = new Biquad("lp", 900, 0.7);
  return gen(0.5, (t) => {
    ph += (44 + (f0 - 44) * Math.exp(-t / 0.035)) / SR;
    return Math.sin(TAU * ph) * Math.min(1, t / 0.001) * Math.exp(-t / tail) + lp.tick(white()) * air * Math.exp(-t / 0.02);
  });
};
const clickSnd = () => {
  const t1 = tick();
  let ph = 0;
  const o = gen(0.12, (t, i) => {
    ph += (85 + 110 * Math.exp(-t / 0.012)) / SR;
    return (i < t1.length ? t1[i] * 0.8 : 0) + Math.sin(TAU * ph) * Math.exp(-t / 0.022) * 0.9 + (t > 0.07 && i - secs(0.07) < t1.length ? t1[i - secs(0.07)] * 0.3 : 0);
  });
  return o;
};
const pasteSnd = () => {
  const t1 = tick();
  const p = pop(880, 0.09);
  return gen(0.14, (t, i) => (i < t1.length ? t1[i] : 0) + (i >= secs(0.028) && i - secs(0.028) < t1.length ? t1[i - secs(0.028)] * 0.7 : 0) + (i >= secs(0.03) && i - secs(0.03) < p.length ? p[i - secs(0.03)] * 0.6 : 0));
};
const riser = (len) => {
  const f = new SVF();
  let ph = 0;
  return gen(len, (t, i, n) => {
    const p = i / n;
    ph += (280 + 1000 * p * p) / SR;
    return (f.tick(white(), 600 * Math.pow(12, p), 1.2).bp * 0.8 + Math.sin(TAU * ph) * 0.22) * Math.pow(Math.sin(Math.PI * Math.pow(p, 1.6)), 1.4);
  });
};

// Bruitages propres à cette vidéo : le bip du déverrouillage, le claquement des phares, les rampes du plafond, le tampon.
const bip = () => gen(0.11, (t) => (Math.sin(TAU * 2350 * t) + 0.35 * Math.sign(Math.sin(TAU * 2350 * t))) * Math.min(1, t / 0.003) * Math.min(1, (0.11 - t) / 0.01));
const phares = () => {
  const t1 = tick();
  let ph = 0;
  return gen(0.4, (t, i) => (i < t1.length ? t1[i] * 0.7 : 0) + (() => { ph += (52 + 60 * Math.exp(-t / 0.03)) / SR; return Math.sin(TAU * ph) * Math.exp(-t / 0.09) * 0.9; })());
};
const rampe = () => {                                         // un gros projecteur qui s'allume : un claquement, puis un bourdon électrique
  const f = new SVF();
  let ph = 0;
  return gen(0.9, (t) => {
    ph += 100 / SR;
    const choc = f.tick(white(), 1800, 0.8).bp * Math.exp(-t / 0.025) * 1.2;
    const bourdon = (Math.sin(TAU * ph) * 0.5 + Math.sin(TAU * ph * 3) * 0.25) * Math.min(1, t / 0.02) * Math.exp(-t / 0.35) * 0.35;
    return choc + bourdon;
  });
};
const tampon = () => {
  const lp = new Biquad("lp", 2400, 0.7);
  let ph = 0;
  return gen(0.32, (t) => {
    ph += (70 + 140 * Math.exp(-t / 0.012)) / SR;
    return Math.sin(TAU * ph) * Math.exp(-t / 0.06) * 0.9 + lp.tick(white()) * Math.exp(-t / 0.018) * 0.8;
  });
};

// niveau de crête de chaque type de son (dBFS avant mixage) et part envoyée à la réverbération
const LEVEL = { tick: -26, key: -24, pop: -21, blip: -18, slide: -27, drop: -18, whoosh: -17, hit: -14.5, swish: -24, paste: -23, plop: -24, click: -15, morph: -19, tone: -18.5, riser: -23, ding: -14.5, thud: -12, zoom: -20.5, card: -20, final: -18.5, pulse: -18, bip: -24, phares: -15, rampe: -16, tampon: -12 };
const WET = { rampe: 0.25, tampon: 0.2, bip: 0.15, tone: 0.3, ding: 0.35, hit: 0.2, thud: 0.3, pulse: 0.3, pop: 0.12, card: 0.15, blip: 0.1 };
const CHIP = [76, 79, 81, 84, 86]; // mi sol la do ré : pentatonique de la mineur
const TONE = [69, 72, 76, 79]; // une note par piste de la table de montage
const CARD = [72, 77, 81, 84]; // accord de fa
const FX_DB = 5; // sans voix, les bruitages peuvent passer plus fort que dans la publicité d'origine
const made = {};
for (const e of sfx) {
  const kind = e.k.replace(/\d+$/, "");
  const idx = +(e.k.match(/\d+$/) || [0])[0];
  let s;
  let stereo = null;
  if (kind === "tick") s = made.tick || (made.tick = tick());
  else if (kind === "key") s = keyClick();
  else if (kind === "pop") s = pop(midi(CHIP[idx]));
  else if (kind === "plop") s = pop(midi(e.t > 12 ? 84 : 83));
  else if (kind === "card") s = pop(midi(CARD[idx]), 0.13);
  else if (kind === "blip") s = made.blip || (made.blip = blip());
  else if (kind === "drop") s = dropSnd();
  else if (kind === "slide") s = sweep(0.22, 500, 1400, 2600, 2);
  else if (kind === "swish") s = sweep(0.45, 700, 2200, 3600, 2);
  else if (kind === "whoosh") stereo = [sweep(0.42, 280, 3200, 700), sweep(0.42, 320, 3600, 800)];
  else if (kind === "morph") stereo = [sweep(0.6, 220, 1800, 3800, 1.6), sweep(0.6, 260, 2100, 4200, 1.6)];
  else if (kind === "zoom") stereo = [sweep(0.8, 3800, 1200, 240, 1.3), sweep(0.8, 3300, 1000, 210, 1.3)];
  else if (kind === "final") stereo = [sweep(0.55, 300, 2600, 5200, 1.8), sweep(0.55, 340, 3000, 6000, 1.8)];
  else if (kind === "hit") s = hit(86, 0.1, 0.05);
  else if (kind === "thud") s = hit(78, 0.2);
  else if (kind === "pulse") s = hit(70, 0.14);
  else if (kind === "paste") s = pasteSnd();
  else if (kind === "click") s = clickSnd();
  else if (kind === "tone") s = bell(midi(TONE[idx]), 0.55, 1.6);
  else if (kind === "ding") {
    const b1 = bell(midi(84), 1.1, 1.5);
    const b2 = bell(midi(88), 1.0, 1.5);
    s = gen(1.1, (t, i) => b1[i] + 0.7 * (i >= secs(0.07) ? b2[i - secs(0.07)] || 0 : 0));
  }
  else if (kind === "bip") s = made.bip2 || (made.bip2 = bip());
  else if (kind === "phares") s = phares();
  else if (kind === "rampe") s = rampe();
  else if (kind === "tampon") s = tampon();
  else continue;
  const g = fromDb(LEVEL[kind] + FX_DB) * Math.sqrt(e.g / 0.6);
  if (stereo) {
    // le souffle traverse l'image : plus fort à gauche au début, à droite à la fin
    const [a, b] = stereo;
    for (let i = 0; i < a.length; i++) {
      const p = i / a.length;
      a[i] *= 1.15 - 0.5 * p;
      b[i] *= 0.65 + 0.5 * p;
    }
    fx.addStereo(a, b, e.t, g);
  } else {
    if (kind === "ding" || kind === "tone") norm(s);
    fx.add(s, e.t, g, e.p || 0);
    if (WET[kind]) fxSend.add(s, e.t, g * WET[kind], e.p || 0);
  }
}
{
  const [rL, rR] = reverb(fxSend.L, fxSend.R, { room: 0.8, damp: 0.35 });
  fx.addStereo(rL, rR, 0, 1.0);
}

// ------------------------------------------------------------------ VOIX
// Pas de voix dans cette publicité : une piste muette garde le mixage et les mesures inchangés.
const voice = new Float32Array(music.n);
const keyGain = new Float32Array(music.n);

// ------------------------------------------------------------------ MIXAGE
// la musique passe sous la voix (et un peu plus sous les mots importants)
const vEnv = envelope(voice, 0.012, 0.28);
const MUSIC_DB = -20; // niveau efficace de la musique à plein régime (pas de voix : elle porte le film)
const DUCK_DB = 6; // baisse de la musique sous la voix
const MID_DB = 4; // creux supplémentaire dans la bande de la parole, pour laisser la place à la voix
{
  const g0 = fromDb(MUSIC_DB) / music.rms(FULL_IN, BREAK_IN);
  const mids = [music.L, music.R].map((ch) => {
    const m = Float32Array.from(ch);
    new Biquad("hp", 300, 0.707).run(m);
    new Biquad("lp", 3400, 0.707).run(m);
    return m;
  });
  for (let i = 0; i < music.n; i++) {
    const d = clamp((dB(vEnv[i]) + 46) / 16);
    const g = g0 * fromDb(-(DUCK_DB * d + 1.5 * keyGain[i]));
    const carve = fromDb(-MID_DB * d) - 1; // part de la bande médiane retirée quand la voix parle
    music.L[i] = (music.L[i] + mids[0][i] * carve) * g;
    music.R[i] = (music.R[i] + mids[1][i] * carve) * g;
    const gf = fromDb(-(4 * d + 1 * keyGain[i]));
    fx.L[i] *= gf;
    fx.R[i] *= gf;
  }
}
// fondu de sortie : silence complet à la dernière image (la vidéo boucle proprement)
for (const tr of [music, fx]) {
  for (let i = secs(D - 0.45); i < tr.n; i++) {
    const g = Math.pow(Math.cos(((i / SR - (D - 0.45)) / 0.45) * (Math.PI / 2)), 2);
    tr.L[i] *= g;
    tr.R[i] *= g;
  }
}

const mix = new Track(D);
for (let i = 0; i < mix.n; i++) {
  mix.L[i] = voice[i] + music.L[i] + fx.L[i];
  mix.R[i] = voice[i] + music.R[i] + fx.R[i];
}
// sonie cible puis limiteur
const TARGET_LUFS = -16;
const before = lufs(mix.L, mix.R);
const master = fromDb(TARGET_LUFS - before);
mix.scale(master);
const prePeak = mix.peak();
const limited = limiter(mix.L, mix.R, -1);

// ------------------------------------------------------------------ fichiers
const stems = join(root, "audio", "stems");
mkdirSync(stems, { recursive: true });
for (const [name, tr] of [["musique", music], ["bruitages", fx]]) {
  tr.scale(master);
  writeWav(join(stems, `${name}.wav`), [tr.L, tr.R], SR, 24);
}
writeWav(join(root, "audio", "mix.wav"), [mix.L, mix.R], SR, 24);
toM4a(join(root, "audio", "mix.wav"), join(root, "audio", "mix.m4a"), 256);

// formes d'onde réelles pour la table de montage de la vidéo
const bins = (x, n, fn) => Array.from({ length: n }, (_, k) => fn(x, Math.floor((k * x.length) / n), Math.floor(((k + 1) * x.length) / n)));
const pk = (x, a, b) => {
  let m = 0;
  for (let i = a; i < b; i++) m = Math.max(m, Math.abs(x[i]));
  return m;
};
const rm = (x, a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / (b - a));
};
const unit = (a) => {
  const m = Math.max(...a);
  return a.map((v) => +(v / m).toFixed(3));
};
const wave = { music: unit(bins(music.L, 150, rm)) };
writeFileSync(join(root, "scene", "score.js"), `// Fichier généré par tools/sound.mjs : partition réelle de la musique.\nwindow.SCORE = ${JSON.stringify(score)};\n`);
writeFileSync(join(root, "scene", "wave.js"), `// Fichier généré par tools/sound.mjs : formes d'onde réelles de la musique.\nwindow.WAVE = ${JSON.stringify(wave)};\n`);

// ------------------------------------------------------------------ mesures
const peakDb = dB(mix.peak());
let over = 0;
for (let i = 0; i < mix.n; i++) if (Math.abs(mix.L[i]) >= 0.999 || Math.abs(mix.R[i]) >= 0.999) over++;
console.log(`repères musicaux : batterie ${GROOVE_IN} s, plein régime ${FULL_IN} s, pause ${BREAK_IN} -> ${BREAK_OUT} s, accord final ${FINAL} s`);
console.log(`sonie intégrée : ${lufs(mix.L, mix.R).toFixed(1)} LUFS (cible ${TARGET_LUFS})  |  crête : ${peakDb.toFixed(2)} dBFS  |  limiteur actif ${(limited * 100).toFixed(1)} % du temps  |  échantillons saturés : ${over}`);
console.log(`musique seule (hors parole, plein régime) : ${dB(music.rms(FULL_IN, BREAK_IN)).toFixed(1)} dB  |  fin du fichier (50 dernières ms) : ${dB(mix.rms(D - 0.05, D)).toFixed(1)} dB`);
console.log(`limiteur : crête avant ${dB(prePeak).toFixed(1)} dBFS, réduction maximale ${Math.max(0, dB(prePeak) + 1).toFixed(1)} dB`);
// propreté : composante continue et sauts brusques d'un échantillon à l'autre (clics)
for (const [name, tr] of [["musique", music], ["bruitages", fx], ["mix", mix]]) {
  let dc = 0;
  let jump = 0;
  for (let i = 1; i < tr.n; i++) {
    dc += tr.L[i];
    jump = Math.max(jump, Math.abs(tr.L[i] - tr.L[i - 1]));
  }
  console.log(`  ${name.padEnd(9)} crête ${dB(tr.peak()).toFixed(1).padStart(6)} dBFS  niveau ${dB(tr.rms()).toFixed(1).padStart(6)} dB  composante continue ${dB(Math.abs(dc / tr.n)).toFixed(0)} dB  plus grand saut ${jump.toFixed(3)}`);
}
