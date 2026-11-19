// Prépare les images d'un écran du studio à partir d'une vidéo : N images JPEG régulières (00.jpg, 01.jpg…), en
// 960 × 540 (ou 540 × 960 si la vidéo est verticale), que la scène rejoue image par image sur un écran.
//   node tools/images-de-video.mjs video.mp4 scene/img/nom [nombre : 48] [images par seconde : 12] [début en s : 0]
// 48 images à 12 par seconde : 4 s de la vidéo, de quoi tenir un écran pendant toute la vidéo de la vitrine.
import fs from 'node:fs';
import path from 'node:path';
import { sonder } from './encode.mjs';
import { ffmpeg, lancer, dossierTemporaire } from './outils-systeme.mjs';
const [video, dossier, n = '48', ips = '12', debut = '0'] = process.argv.slice(2);
if (!video || !dossier) { console.error('usage : node tools/images-de-video.mjs video.mp4 scene/img/nom [48] [12] [0]'); process.exit(2); }
const s = sonder(video);
if (!s.video) { console.error('aucune image dans ce fichier : ' + video); process.exit(1); }
const vertical = s.video.h > s.video.l, [L, H] = vertical ? [540, 960] : [960, 540];
if (+debut + +n / +ips > s.duree + 0.01) console.log(`attention : la vidéo dure ${s.duree.toFixed(1)} s ; à partir de ${debut} s, il manquera des images (elles seront moins de ${n})`);
const tmp = dossierTemporaire('mavena-images-');
// recadrée pour remplir l'écran sans bandes noires, puis réduite
lancer(ffmpeg(), ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(debut), '-i', video, '-vf', `fps=${ips},scale=${L}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${L}:${H}`, '-frames:v', String(n), '-q:v', '3', path.join(tmp, '%02d.jpg')]);
fs.mkdirSync(dossier, { recursive: true });
const faites = fs.readdirSync(tmp).filter((f) => f.endsWith('.jpg')).sort();
faites.forEach((f, k) => fs.renameSync(path.join(tmp, f), path.join(dossier, String(k).padStart(2, '0') + '.jpg')));   // ffmpeg numérote à partir de 1, la scène à partir de 0
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${faites.length} images ${L}×${H} → ${path.resolve(dossier)}${vertical ? ' (vidéo verticale)' : ''}`);
