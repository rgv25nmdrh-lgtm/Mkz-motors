// Prépare la voix off : une phrase par fichier, générée par Runway (voix « Charles Pub – Commercial Announcer »,
// modèle Eleven v4, français), téléchargée dans audio/voice/sN.mp3. Runway ne donne pas le calage mot par mot :
// on le déduit du son lui-même. Les vrais silences de la phrase (après une virgule, deux-points, un point) découpent
// le texte en morceaux ; dans un morceau, chaque caractère reçoit une part du temps (une lettre compte plus qu'une
// espace, un sigle épelé comme « MKZ » compte plus qu'une lettre ordinaire). C'est approché à quelques centièmes près,
// assez pour faire monter les mots à l'écran avec la voix et pour que tools/assemble-voice.mjs ne coupe que dans des
// silences.
//   node tools/voix.mjs
// Résultat : audio/voice/sN.wav (48 kHz mono) et sN.json (calage, même forme que celui d'ElevenLabs).
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SR, decodeToMono, rms, dB, peak } from "./wav.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "audio", "voice");
export const VOIX = { id: "QcjZvBcwbqLAx1dl8yN6", nom: "Charles Pub – Commercial Announcer", modele: "eleven_v4", langue: "fr" };
export const PHRASES = JSON.parse(readFileSync(join(root, "audio", "script.json"), "utf8"));

const HOP = 0.005, WIN = 0.012, SEUIL = -42;          // niveau toutes les 5 ms ; en dessous de -42 dBFS : silence
const niveaux = (x) => {
  const h = Math.round(HOP * SR), w = Math.round(WIN * SR), out = [];
  for (let i = 0; i + w <= x.length; i += h) out.push(dB(rms(x, i, i + w)));
  return out;
};
// plages de parole [début, fin] en secondes ; deux plages séparées de moins de 50 ms n'en font qu'une
function plages(x) {
  const lv = niveaux(x), out = [];
  let a = -1;
  lv.forEach((v, i) => {
    if (v >= SEUIL && a < 0) a = i;
    if (v < SEUIL && a >= 0) { out.push([a * HOP, i * HOP + WIN]); a = -1; }
  });
  if (a >= 0) out.push([a * HOP, lv.length * HOP + WIN]);
  const fusion = [];
  for (const p of out) {
    if (fusion.length && p[0] - fusion.at(-1)[1] < 0.05) fusion.at(-1)[1] = p[1];
    else fusion.push([...p]);
  }
  return fusion.filter((p) => p[1] - p[0] > 0.03);   // on ignore un souffle isolé
}
// le texte en morceaux, coupés après chaque ponctuation qui fait une pause
function morceaux(texte) {
  const out = [];
  let a = 0;
  for (let i = 0; i < texte.length; i++) {
    if (/[,:.?!;]/.test(texte[i]) && (i === texte.length - 1 || texte[i + 1] === " ")) {
      if (texte.slice(a, i + 1).trim().replace(/[,:.?!; ]/g, "")) out.push([a, i + 1]);
      else if (out.length) out.at(-1)[1] = i + 1;
      a = i + 1;
    }
  }
  if (a < texte.length && texte.slice(a).trim()) out.push([a, texte.length]);
  else if (out.length) out.at(-1)[1] = texte.length;
  return out;
}
const poids = (texte, i) => {
  const c = texte[i];
  if (/[A-Z]/.test(c) && /[A-Z]/.test((texte[i - 1] || "") + (texte[i + 1] || ""))) return 2.6;   // sigle épelé (MKZ)
  if (/[a-zàâäçéèêëîïôöùûüœA-Z]/.test(c)) return 1;
  return 0.25;                                          // espace, apostrophe, trait d'union, ponctuation
};

function calage(texte, x) {
  const p = plages(x);
  if (!p.length) throw new Error("aucune parole détectée");
  const debut = p[0][0], fin = p.at(-1)[1];
  const m = morceaux(texte);
  // les (n − 1) plus longs silences internes séparent les n morceaux
  const trous = p.slice(1).map((q, i) => ({ a: p[i][1], b: q[0] })).filter((t) => t.b - t.a >= 0.1);
  trous.sort((u, v) => (v.b - v.a) - (u.b - u.a));
  const coupes = trous.slice(0, m.length - 1).sort((u, v) => u.a - v.a);
  const bornes = coupes.length === m.length - 1
    ? m.map((_, k) => [k ? coupes[k - 1].b : debut, k < coupes.length ? coupes[k].a : fin])
    : (() => {                                          // pas assez de silences : on répartit sur toute la phrase
      const tot = m.reduce((s, [a, b]) => s + b - a, 0);
      let t = debut;
      return m.map(([a, b]) => { const d = ((b - a) / tot) * (fin - debut); const r = [t, t + d]; t += d; return r; });
    })();
  const starts = new Array(texte.length).fill(0), ends = new Array(texte.length).fill(0);
  m.forEach(([a, b], k) => {
    const [t0, t1] = bornes[k];
    const w = [];
    for (let i = a; i < b; i++) w.push(poids(texte, i));
    const tot = w.reduce((s, v) => s + v, 0);
    let t = t0;
    for (let i = a; i < b; i++) { const d = (w[i - a] / tot) * (t1 - t0); starts[i] = t; ends[i] = t + d; t += d; }
  });
  // les espaces entre deux morceaux : posées dans le silence
  for (let i = 0; i < texte.length; i++) if (!m.some(([a, b]) => i >= a && i < b)) { starts[i] = ends[i - 1] ?? debut; ends[i] = starts[i]; }
  return { characters: [...texte], starts, ends, morceaux: m.length, silences: coupes.length };
}

if (process.argv[1].endsWith("voix.mjs")) {
  PHRASES.forEach((texte, i) => {
    const n = i + 1, mp3 = join(dir, `s${n}.mp3`);
    if (!existsSync(mp3)) throw new Error(`il manque ${mp3} : générer la phrase ${n} avec Runway (voir LISEZMOI.md)`);
    const x = decodeToMono(mp3, join(dir, `s${n}.wav`));
    const al = calage(texte, x);
    writeFileSync(join(dir, `s${n}.json`), JSON.stringify({ text: texte, source: "estimé à partir des silences (Runway ne donne pas de calage)", ...al }));
    console.log(`s${n}  parole ${al.starts[0].toFixed(3)} -> ${al.ends.at(-1).toFixed(3)} s  fichier ${(x.length / SR).toFixed(3)} s  morceaux ${al.morceaux}, silences trouvés ${al.silences}  crête ${dB(peak(x)).toFixed(1)} dBFS  « ${texte} »`);
  });
}
