# MKZ Motors — Story du dépôt-vente (20 s, verticale 1080 × 1920)

Version Story (Instagram, Facebook, TikTok) du film de lancement de `videos/mkz-lancement/` : les mêmes 41 plans,
recadrés en vertical (`cadrage()` dans `scene/film.js` : recul, champ élargi, sujet descendu sous les titres ; les
messages et le compteur reculent un peu plus pour se lire en entier), une fin recomposée en hauteur (le logo, le
bouton « Vendre ma voiture », le planning), et des titres courts posés sur la musique, lisibles sans le son :

| Secondes | Titre |
|---|---|
| 0 à 4 | Vendre sa voiture **seul ?** |
| 4,5 à 6 | Confiez-la à **MKZ Motors.** |
| 6 à 10 | On organise **les essais.** |
| 10 à 12 | On la vend **pour vous.** |
| 12 à 15,5 | **Dépôt-vente :** on s'occupe de tout. |

Les titres (tableau `TITRES` dans `scene/film.js`) sont dessinés en pleine définition sur un calque, dans la zone sûre
des Stories (sous la barre du haut, au-dessus du champ de réponse). Le reste de cette notice vaut pour les deux versions ;
ici, la sortie est `livrables/mkz-motors-story-1080x1920.mp4` et le muet `out/mkz-story-muet.mp4`.

---

## Le film d'origine (16:9)


Film de motion design en 3D, sans voix, monté comme un « edit » sur une musique originale à 120 battements par minute.
Fabriqué avec le kit Mavena « Lancement de produit » : même moteur et mêmes outils, avec une histoire, des dessins et
des couleurs (le rouge MKZ) écrits pour MKZ Motors. La musique est celle de la vidéo d'exemple du kit, à la demande
de MKZ Motors (la notice du kit demande en principe d'en écrire une autre pour une autre vidéo : vérifier la licence).

Le fil : une case du planning des essais. Elle naît des messages qui assaillent le particulier qui vend seul sa
voiture, reçoit la réservation de l'essai, le rappel, puis le tampon « Vendu », se multiplie pour remplir la semaine,
et devient le logo MKZ.

| Mesures | Secondes | Ce qui se passe |
|---|---|---|
| 1 et 2 | 0 à 4 | Le problème : le carnet « Ma voiture à vendre · 11 900 € », le téléphone qui vibre (23:47) ; « C'est toujours disponible ? », « Dernier prix ? », « Désolé, je ne viens plus… » ; deux visites se raturent, puis la rafale ; tout se fige |
| 3 | 4 à 6 | Le basculement : tout est aspiré ; le planning de MKZ Motors sort du sol ; la case « Jeudi 18:30 · Essai routier » s'allume en rouge |
| 4 | 6 à 8 | Réserver : sur le téléphone de l'acheteur, la page de la citadine, « Réserver » ; la case se remplit : « Réservé » |
| 5 | 8 à 10 | Rappeler : « Rappel : essai routier, demain 18:30 » se pose chez l'acheteur ; la coche revient : « Confirmé » |
| 6 | 10 à 12 | Vendre : le tampon s'abat, « Vendu · 11 900 € » ; le compteur se bloque sur « 1 vendue » |
| 7 et 8 | 12 à 16 | La semaine pleine : un jour par temps, les cases passent à « Vendu » ; le compteur se bloque sur « 23 vendues » |
| 9 et 10 | 16 à 20 | La signature : la caméra recule ; la case du jeudi devient le logo MKZ ; « MKZ Motors », « Vendre ma voiture » |

**Les données sont des exemples** (la citadine 2019, 68 000 km, 11 900 €, les 23 ventes de la semaine, les prénoms
des messages) : à remplacer par de vraies valeurs, ou à garder comme illustration, avant diffusion.

## Où changer quoi

| Fichier | Contenu |
|---|---|
| `scene/tex-lancement.js` | **Tous les textes et les données** : en tête, `JOURS`, `HEURES`, `PRISES` (les cases vendues), `PRIX`, `VEHICULE`, `KM`, `MESSAGES` ; puis chaque dessin (carnet, téléphone, planning, case, page de l'acheteur, rappel, tampon, compteur, nom, bouton « Vendre ma voiture »). |
| `scene/base.js`, `scene/outils.js` | Les couleurs : `C.accent` (le rouge MKZ, `#ee2b36`) et sa valeur 3D `ORANGE` (nom hérité du kit). |
| `scene/cues.js` | Le conducteur : tous les instants, sur la grille de la musique. |
| `scene/film.js` | La chorégraphie : les plans, déclarés dans l'ordre par `plan(coupe(instant), …)`. |
| `scene/moteur.js` | Le moteur 3D du kit (boîtes de verre, sol laqué, lumières), non modifié. |
| `tools/musique.mjs` | La musique (celle de l'exemple du kit, inchangée) et les bruitages. Si `PRISES` change, le recopier ici aussi. |
| `scene/index.html`, `scene/apercu.html` | Final (2 passes par image, 3D en 960 × 540 agrandie en 1080p) et aperçu (1 passe). Sur un ordinateur avec carte graphique, mettre `ECHANTILLONS = 24` et `DEFINITION = 1` dans `index.html` pour la qualité maximale du kit. |

## Fabriquer la vidéo

Toutes les commandes se lancent depuis `videos/mkz-lancement/`. Il faut Node 18+, ffmpeg, Chrome/Chromium et
Python 3 avec Pillow (`node tools/verifier.mjs` dit ce qui manque).

    node tools/musique.mjs                                   # musique + bruitages → audio/mix.wav
    node tools/rendu.mjs video --scene scene/index.html --fps 30 --dpr 1 --workers 2 --delai 240 --bitrate 14000000 --from 0 --to 5 --out out/final-0.mp4
    # … puis --from 5 --to 10, 10 à 15, 15 à 20 (out/final-5.mp4, etc.), et :
    ffmpeg -f concat -safe 0 -i out/liste-final.txt -c copy out/mkz-lancement-muet.mp4
    node tools/bin/mux out/mkz-lancement-muet.mp4 audio/mix.wav livrables/mkz-motors-lancement-1080p.mp4

`out/liste-final.txt` contient une ligne par tranche (`file 'final-0.mp4'`…). Sans carte graphique, comptez environ
40 minutes ; avec une carte graphique, quelques minutes (et `--fps 60`). Ne pas modifier `scene/` pendant un rendu.

## Contrôles

    node tools/bin/coupes out/mkz-lancement-muet.mp4 out/ecarts.tsv && python3 tools/controle.py out/ecarts.tsv
    node tools/encode/encode probe livrables/mkz-motors-lancement-1080p.mp4
