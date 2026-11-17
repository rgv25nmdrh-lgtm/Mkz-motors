# MKZ Motors — publicité 3D (20 s, verticale 1080 × 1920)

Publicité en vraie 3D pour MKZ Motors (vente de véhicules d'occasion et dépôt-vente), fabriquée avec la boîte à
outils 3D de Mavena : même chaîne (scène décrite par des distances et rendue par un shader WebGL2, rendu image par
image dans Chrome, son synthétisé, contrôles), avec une scène, un film, des textes et des bruitages entièrement neufs.
Rien n'est repris de la publicité de la bougie. Sans voix : musique et bruitages, textes à l'écran.

Le héros est une **clé de voiture** (coque noire laquée, anneau chromé, étiquette en cuir rouge « MKZ MOTORS ») sur
un podium dans un showroom : le symbole de l'achat et de la vente d'un véhicule, sans montrer de voiture.

| Plan | Temps | Image | Texte |
|---|---|---|---|
| 1 | 0–2 s | Le noir ; le voyant de la clé clignote, un spot claque sur le podium | MKZ MOTORS |
| 2 | 2–6 s | Les rampes du plafond s'allument une à une ; la clé s'élève et se tourne vers nous | Des occasions sélectionnées. |
| 3 | 6–8 s | Très près, sur les touches de la clé | Contrôlées, prêtes à rouler. |
| 4 | 8–12 s | La clé posée, le panneau « À VENDRE », le tampon « VENDU » claque | Vous vendez votre voiture ? · On la vend pour vous. |
| 5 | 12–16 s | L'étiquette en cuir MKZ MOTORS | Dépôt-vente, on s'occupe de tout : Estimation, Annonces, Visites, Démarches |
| 6 | 16–20 s | De face, l'enseigne MKZ MOTORS s'allume, la clé flotte devant le podium | Achat · Vente · Dépôt-vente · mkzmotors.com |

rrière, feux allumés | Dépôt-vente, on s'occupe de tout : Estimation, Annonces, Visites, Démarches |
| 6 | 16–20 s | De face, l'enseigne MKZ MOTORS s'allume, appel de phares | Achat · Vente · Dépôt-vente · mkzmotors.com |

## Où changer quoi

| Fichier | Contenu |
|---|---|
| `scene/textures.js` | **Tous les textes** (calque des textes, pictogrammes de la clé, étiquette en cuir, panneau « À VENDRE », enseigne du mur). C'est ici qu'on change le slogan, les étapes, le site, la couleur rouge (`ROUGE`). |
| `scene/film.js` | Les plans : caméras, pose de la clé, lumières. |
| `scene/cues.js` | Le conducteur : l'instant de chaque animation et de chaque bruitage, sur la grille de la musique (120 BPM). |
| `scene/moteur-sdf.js` | Le moteur : la clé (coque laquée, touches, jonc et anneau chromés, étiquette en cuir), le showroom (sol en béton ciré qui reflète, podium à anneau lumineux, rampes de lumière, mur et enseigne). Allégé par rapport au moteur d'origine pour tourner aussi sans carte graphique. |
| `scene/index.html`, `apercu.html`, `index-169.html` | Final (6 passes par image, 3D en 720 × 1280 agrandie, textes en pleine définition), aperçu rapide, cadre 16:9 pour une miniature. |
| `tools/sound.mjs` | Musique et bruitages (bip de déverrouillage, spot, rampes, tampon…). |

Le site `mkzmotors.com` vient du domaine de l'adresse
e-mail de l'entreprise : à vérifier avant diffusion.

## Fabriquer la vidéo

Toutes les commandes se lancent depuis `videos/mkz-pub/`. Il faut Node 18+, ffmpeg, Chrome/Chromium et Python 3 avec
Pillow (`node tools/verifier.mjs` dit ce qui manque).

    node tools/sound.mjs                                  # musique + bruitages → audio/mix.wav
    node tools/rendu.mjs video --scene scene/apercu.html --fps 30 --dpr 0.5 --workers 2 --bitrate 4000000 --out out/apercu-muet.mp4
    node tools/rendu.mjs video --scene scene/index.html  --fps 30 --dpr 1   --workers 2 --delai 240 --bitrate 12000000 --out out/mkz-muet-1080.mp4
    node tools/bin/mux out/mkz-muet-1080.mp4 audio/mix.wav livrables/mkz-motors-pub-1080x1920.mp4

Sans carte graphique, le rendu final prend environ 50 min (5 s par image) ; avec une carte graphique, quelques
minutes. On peut aussi rendre par tranches (`--from 0 --to 5`, puis `--from 5 --to 10`…) et les raccorder avec
`ffmpeg -f concat`.

## Contrôles

    node tools/bin/coupes out/mkz-muet-1080.mp4 out/ecarts.tsv && python3 tools/controle.py out/ecarts.tsv
    node tools/encode/encode probe livrables/mkz-motors-pub-1080x1920.mp4
    node tools/check-audio.mjs
