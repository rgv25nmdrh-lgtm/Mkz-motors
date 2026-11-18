# MKZ Motors — publicité 3D avec voix off (20 s, verticale 1080 × 1920)

Publicité pour le **dépôt-vente** de MKZ Motors, pour TikTok, Reels et Stories. Même chaîne que `videos/mkz-pub/`
(boîte à outils 3D de Mavena : scène décrite par des distances et rendue par un shader WebGL2, rendu image par image
dans Chrome, son synthétisé, contrôles), la même clé de voiture dans le même showroom, mais un film neuf écrit autour
d'une **voix off française** : une voix d'homme posée et confiante, générée avec Runway. Les mots montent à l'écran
quand la voix les dit (la vidéo se comprend sans le son) et les cinq étapes du dépôt-vente se cochent une à une.

| Plan | Temps | Voix | Image | À l'écran |
|---|---|---|---|---|
| 1 | 0–2,5 s | Vous voulez vendre votre voiture ? | Le noir ; le voyant de la clé clignote, un spot claque | la phrase |
| 2 | 2,5–5 s | Confiez-la à MKZ Motors. | Les rampes du plafond s'allument ; la clé s'élève et se tourne | la phrase, MKZ Motors en rouge |
| 3 | 5–7 s | On l'estime, on crée l'annonce, | Le panneau « À VENDRE », la clé flotte à côté | ✓ Estimation · ✓ Annonce |
| 4 | 7–9,1 s | on organise les visites et les essais, | Très près des touches ; le voyant clignote sur « essais » | ✓ Visites · ✓ Essais |
| 5 | 9,1–11,5 s | et on gère toutes les démarches. | L'étiquette en cuir MKZ MOTORS | ✓ Démarches |
| 6 | 11,5–14,5 s | Le dépôt-vente : on s'occupe de tout. | Face au panneau ; le tampon « VENDU » claque après « tout » | la phrase, dépôt-vente en rouge |
| 7 | 14,5–20 s | MKZ Motors. On la vend pour vous. | L'enseigne s'allume sur « MKZ », la clé flotte devant le podium | On la vend pour vous. · Achat · Vente · Dépôt-vente · mkzmotors.com |

Le site `mkzmotors.com` vient du domaine de l'adresse e-mail de l'entreprise : à vérifier avant diffusion.

## La voix

- Voix « Charles Pub – Commercial Announcer » de la bibliothèque Runway (modèle Eleven v4, français), une phrase par
  génération avec la phrase d'avant et d'après en contexte. Le texte exact est dans `audio/script.json`, les fichiers
  d'origine dans `audio/voice/s1.mp3` à `s7.mp3` (7 générations, environ 1 crédit Runway chacune).
- Pour changer une phrase : la régénérer avec Runway (même voix, `languageCode` « fr »), remplacer `audio/voice/sN.mp3`,
  puis relancer `node tools/voix.mjs`, `node tools/assemble-voice.mjs`, `node tools/sound.mjs` et refaire le rendu.
- Runway ne donne pas le calage mot par mot : `tools/voix.mjs` le déduit des silences de chaque phrase (à quelques
  centièmes près). `tools/assemble-voice.mjs` (de la boîte à outils) pose ensuite les phrases sur la grille de la
  musique (120 BPM) et écrit `timing.json` et `scene/timing.js` : tous les instants du film en découlent.
- Le serveur de fichiers de Runway (`dnznrvs05pmza.cloudfront.net`) a été ajouté aux domaines autorisés de
  l'environnement par défaut pour pouvoir télécharger la voix.

## Où changer quoi

| Fichier | Contenu |
|---|---|
| `audio/script.json` | Le texte de la voix (doit correspondre mot pour mot aux fichiers `audio/voice/sN.mp3`). |
| `tools/assemble-voice.mjs` | Les débuts visés de chaque phrase (`CIBLES`) ; les plans coupent une double croche avant. |
| `scene/cues.js` | Le conducteur : l'instant de chaque animation et de chaque bruitage, tiré du calage de la voix. |
| `scene/film.js` | Les plans : caméras, pose de la clé, lumières. |
| `scene/textures.js` | Tous les textes : les phrases à l'écran, les étapes cochées, la fin ; le panneau, l'étiquette, l'enseigne. |
| `scene/moteur-sdf.js` | Le moteur 3D (le même que `videos/mkz-pub/`). |
| `tools/sound.mjs` | Musique, bruitages et mixage avec la voix (la musique passe sous la voix, les mots importants ressortent). |

## Fabriquer la vidéo

Toutes les commandes se lancent depuis `videos/mkz-voix/`. Il faut Node 18+, ffmpeg, Chrome/Chromium et Python 3 avec
Pillow (`node tools/verifier.mjs` dit ce qui manque).

    node tools/voix.mjs                 # voix : fichiers 48 kHz + calage
    node tools/assemble-voice.mjs       # voix sur la ligne de temps → timing.json, scene/timing.js
    node tools/sound.mjs                # musique + bruitages + voix → audio/mix.wav et audio/mix.m4a
    node tools/rendu.mjs video --scene scene/apercu.html --fps 30 --dpr 0.5 --workers 4 --bitrate 4000000 --out out/apercu-muet.mp4
    bash outils-rendu/rendu-final.sh    # rendu final en 4 tranches, puis le son → livrables/mkz-motors-voix-off-1080x1920.mp4

Sans carte graphique, l'aperçu prend environ 2 min et le rendu final environ une heure.

## Contrôles

    node tools/bin/coupes out/mkz-voix-muet-1080.mp4 out/ecarts.tsv && python3 tools/controle.py out/ecarts.tsv
    node tools/encode/encode probe livrables/mkz-motors-voix-off-1080x1920.mp4
    node tools/check-audio.mjs
