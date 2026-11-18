// Reconnaissance vocale du mix, pour vérifier que toute la voix off est intelligible. Elle est FACULTATIVE : si Whisper
// n'est pas installé, le contrôle est sauté avec un message, et rien n'est bloqué.
//   node tools/stt.mjs [audio/mix.wav] [out/stt.txt] [--modele small] [--langue fr]
// Écrit « TEXTE … » dans out/stt.txt, que tools/check-audio.mjs compare au script (audio/script.json).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { trouverWhisper, dossierTemporaire } from './outils-systeme.mjs';
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const libres = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const son = libres[0] || 'audio/mix.wav', sortie = libres[1] || 'out/stt.txt';
const whisper = trouverWhisper();
if (!whisper) {
  console.log('reconnaissance vocale : SAUTÉE (Whisper n’est pas installé). Le rendu n’en dépend pas.');
  console.log('Pour l’activer : voir « node tools/verifier.mjs ». Sans elle, relis toi-même la voix à l’oreille.');
  process.exit(0);
}
if (!fs.existsSync(son)) { console.log(`reconnaissance vocale : SAUTÉE (fichier introuvable : ${son})`); process.exit(0); }
const tmp = dossierTemporaire('mavena-stt-');
try {
  console.log('reconnaissance vocale (Whisper)… le premier lancement télécharge le modèle, cela peut prendre quelques minutes');
  const r = spawnSync(whisper, [son, '--model', opt('modele', 'small'), '--language', opt('langue', 'fr'), '--task', 'transcribe', '--output_format', 'txt', '--output_dir', tmp, '--fp16', 'False'], { encoding: 'utf8', windowsHide: true });
  const txt = path.join(tmp, path.basename(son).replace(/\.[^.]+$/, '') + '.txt');
  if (r.status !== 0 || !fs.existsSync(txt)) { console.log('reconnaissance vocale : SAUTÉE (Whisper a échoué : ' + String(r.stderr || r.error || '').split('\n').filter(Boolean).pop() + ')'); process.exit(0); }
  const texte = fs.readFileSync(txt, 'utf8').replace(/\s+/g, ' ').trim();
  fs.mkdirSync(path.dirname(path.resolve(sortie)), { recursive: true });
  fs.writeFileSync(sortie, 'TEXTE ' + texte + '\n');
  console.log('TEXTE ' + texte); console.log('écrit :', sortie);
} finally { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} }
