# MKZ Motors — la location (Story, 16 s, verticale 1080 × 1920)

Publicité en vraie 3D, photoréaliste, pour la **location de voitures** chez MKZ Motors : un seul plan, sans aucune
coupe, sur un bureau en noyer en fin de journée, monté sur une musique originale à 120 battements par minute, pour les
Stories (Instagram, Facebook, TikTok). Fabriquée avec la boîte à outils 3D de Mavena (« Démo d'application en 3D ») :
même principe de moteur (une scène décrite par des distances, rendue rayon par rayon par un shader WebGL2, avec verre,
métal, bois verni, ombres douces et flou de profondeur) et mêmes outils, avec une scène, des objets, une histoire, des
dessins et une musique entièrement neufs. Rien de la vidéo d'exemple du kit (la bougie) n'est repris.

L'idée : **le week-end passe sur le bureau.** On réserve la Peugeot 208 sur son téléphone, du vendredi au dimanche ; le
calendrier tourne ses feuillets pendant que la lumière des stores défile ; la clé tombe sur le bureau ; le soir tombe.

| Mesure | Secondes | Ce qui se passe | Titre de la Story |
|---|---|---|---|
| 1 | 0 à 2 | Le téléphone, posé à plat, s'allume : la fiche « Location » de la Peugeot 208 Diesel 2020 (la vraie photo), 80 € / jour | Une voiture **pour le week-end ?** |
| 2 | 2 à 4 | « Vos dates » : vendredi → dimanche, 2 jours × 80 € = 160 € ; on appuie sur « Réserver » : « Réservé » | (le même) |
| 3 | 4 à 6 | La caméra glisse jusqu'au calendrier de bureau : VENDREDI « Les clés », SAMEDI « La route », DIMANCHE « Le retour » ; un feuillet passe par-dessus les anneaux à chaque jour, la lumière des stores défile, une nuit à chaque feuillet | Vous choisissez les jours, **on prépare les clés.** |
| 4 | 6 à 8 | La clé tombe sur le bureau, rebondit, son étiquette se balance ; le téléphone reçoit « MKZ Motors · Vos clés sont prêtes. Bonne route ! » | (le même) |
| 5 et 6 | 8 à 12 | L'étiquette en cuir rouge (MKZ MOTORS · LOCATION · PEUGEOT 208), puis le long de la clé, puis la clé et le téléphone | Peugeot 208 Diesel, **80 € par jour.** |
| 7 et 8 | 12 à 16 | La caméra s'élève, le soir tombe, l'écran éclaire le bureau ; le logo MKZ Motors, « LOCATION DE VOITURES », mkzmotors.com | — |

**À vérifier avant diffusion.** La voiture, sa photo et son prix viennent de la fiche « Peugeot 208 Diesel – 2020
(Location) » de la boutique MKZ Motors (80 € par jour, novembre 2026). **Cette fiche est encore en brouillon sur la
boutique** : la publier avant de diffuser la vidéo, ou adapter la vidéo si le prix change. Restent des exemples : les
écrans du téléphone (la fiche, « Vos dates », le bouton « Réserver », la notification « Vos clés sont prêtes ») sont
une illustration et ne copient pas le site ; la réservation vendredi → dimanche (2 jours, 160 €) ; les heures affichées
(16:24, 17:58). « On prépare les clés » et « Bonne route ! » décrivent le service : à garder si c'est ainsi que se passe
la location chez MKZ. Le site `mkzmotors.com` est le domaine de la boutique MKZ Motors.

## Où changer quoi

| Fichier | Contenu |
|---|---|
| `scene/textures.js` | **Tous les textes et les chiffres**, en tête : `LOCATION` (le modèle, l'année, les détails, le prix par jour, l'exemple de réservation), `JOURS_CAL` (les trois feuillets), `NOTIF` (la notification), `TITRES` (les titres de la Story), `FIN` (la ligne et l'adresse). Puis chaque dessin : les écrans du téléphone, l'étiquette en cuir, les feuillets, les stores, le calque des titres et du logo. La couleur : `ROUGE` (`#fa0f14`). |
| `scene/film.js` | La chorégraphie : où est chaque objet sur le bureau (`TEL`, `CAL`, `CLE`), la lumière (`APRES`, `DORE`, `SOIR` : l'après-midi, le soir doré, la nuit qui tombe), la chute de la clé, les feuillets, et la caméra (`CAMERA` : un seul mouvement, des positions clés reliées par une courbe sans à-coup). |
| `scene/cues.js` | Le conducteur : tous les instants sur la grille de la musique, la grosse caisse, la mélodie (`K.motif`, en fa majeur), les accords et la basse. L'image et la musique le lisent. |
| `scene/moteur-sdf.js` | Le moteur 3D : les formes (le téléphone, la clé et son étiquette, le calendrier à feuillets), les matières (noyer verni, verre, métal brossé, laque, cuir, papier), la lumière (le soleil à travers les stores, la lueur de l'écran) et les passes de finition. |
| `scene/img/`, `scene/logo-mkz.png` | La photo de la 208 (celle de la boutique) et le logo. |
| `scene/index.html`, `scene/apercu.html` | Final : 60 images/s (le maximum des Stories), 3D en pleine définition 1080 × 1920, 6 passes par image (anticrénelage, flou de mouvement à 180°, flou de profondeur), 40 Mbit/s. Aperçu : 30 i/s, 2 passes, 3D en 540 × 960. Avec une carte graphique : `ECHANTILLONS = 24` dans `index.html`. |
| `tools/musique.mjs` | La musique (piano électrique, basse ronde, guitare pincée, grosse caisse feutrée ; fa majeur) et les bruitages (l'écran, les jours touchés, « Réservé », les feuillets, la clé et son trousseau, la notification, le logo). |

## Fabriquer la vidéo

Toutes les commandes se lancent depuis `videos/mkz-location/`. Il faut Node 18+, ffmpeg, Chrome/Chromium et Python 3
avec Pillow (`node tools/verifier.mjs` dit ce qui manque).

    node tools/musique.mjs                                   # musique + bruitages → audio/mix.wav
    node tools/essai.mjs essai 1.8,5.2,12.6                  # out/essai/ : trois images et leur planche
    python3 tools/storyboard.py --tout                       # livrables/storyboard-mkz-location.jpg
    node tools/rendu.mjs video --scene scene/apercu.html --fps 30 --dpr 1 --workers 3 --delai 300 --bitrate 8000000 --out out/apercu-muet.mp4
    bash outils-rendu/rendu-final.sh                         # le rendu final, par tranches de 2 s (voir le script)

Sans carte graphique, le rendu final prend plusieurs heures (une tranche de 2 s, soit 120 images, prend environ une
heure) ; avec une carte graphique, quelques minutes. Relancer le script reprend là où il s'était arrêté ; sur une
machine qui se met en veille, lancer les tranches une par une (`bash outils-rendu/rendu-final.sh 0`, puis `2`…), puis
le script sans argument pour l'assemblage. Deux fichiers sortent : `livrables/mkz-motors-location-1080x1920.mp4`
(40 Mbit/s, le fichier maître) et `livrables/mkz-motors-location-leger.mp4` (environ 10 Mbit/s, pour la mise en
ligne). Ne pas modifier `scene/` pendant un rendu.

## Contrôles

    node tools/bin/coupes out/mkz-location-muet.mp4 out/ecarts.tsv && python3 tools/controle.py out/ecarts.tsv
    node tools/encode/encode probe livrables/mkz-motors-location-1080x1920.mp4

Le film n'a aucune coupe. Les sauts de luminosité attendus : la nuit qui passe à chaque feuillet du calendrier (vers
4,7 s et 5,7 s) et l'écran du téléphone qui s'allume (0,25 s) puis se réveille avec la notification (7 s).
