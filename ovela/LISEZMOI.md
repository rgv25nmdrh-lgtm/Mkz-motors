# Ovela, vidéo TikTok (20 s, 1080 × 1920)

Vidéo de motion design en 3D, écrite de zéro en code (moteur WebGL 2 maison, rendu image par image dans Chromium).
Ovela est un produit **inventé** : un assistant qui répond aux clients des commerces indépendants. Les commerces
(Chez Margaux, Atelier Sable, Studio Nord, Salon Mila, Pétale & Co), les noms, les prix et les chiffres (4 s, 98 %,
+31 %, 4,9, 1 240 commerces) sont inventés. Le nom « Ovela » et l'adresse « ovela.app » n'ont pas été vérifiés.

| Fichier | Contenu |
|---|---|
| `scene/moteur.js` | Le moteur 3D : plaques de verre arrondies, sol laqué avec reflets, ombres douces, lueur, flou de profondeur, flou de mouvement, halo, grain. |
| `scene/ecrans.js` | Tous les écrans (téléphone, notifications, cinq commerces, statistiques, avis, barre de question, réponse) et les données inventées (`CLIENTS`, `ETIQUETTES`). |
| `scene/film.js` | Le film : les instants (`K`), la caméra (`CAM`), les plans, les titres (`TITRES` dans `calque`). |
| `outils/rendu.mjs` | Le rendu : images fixes ou vidéo (Chromium sans interface + ffmpeg). |
| `outils/planche.py` | La planche du storyboard. |

## Storyboard

    node outils/rendu.mjs images --t 1,3.2,4.6,7.6,9,11.2,13.2,15.2,17.6,19.6 --ech 16 --out storyboard
    python3 outils/planche.py storyboard storyboard/planche.jpg

## Son

Musique originale et bruitages, synthétisés avec numpy (`outils/son.py`), calés sur `scene/instants.js` (les mêmes
instants que l'image). Sans voix off. Mix final à −14 LUFS (volume des plateformes), crête vraie sous −1 dBFS :

    python3 outils/son.py
    ffmpeg -i out/mix-brut.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null -    # mesure
    ffmpeg -i out/mix-brut.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=…:measured_TP=…:measured_LRA=…:measured_thresh=…:offset=…:linear=true,alimiter=limit=0.891:level=false" out/mix.wav
