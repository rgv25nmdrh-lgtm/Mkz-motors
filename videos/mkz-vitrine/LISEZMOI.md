# MKZ Motors — la vitrine du dépôt-vente (Story, 16 s, verticale 1080 × 1920)

Film de motion design en 3D, sans voix, monté sur une musique originale à 120 battements par minute, pour les Stories
(Instagram, Facebook, TikTok). Fabriqué avec le kit Mavena « La vitrine en studio 3D » : même moteur (verre épais,
sol laqué, une seule lueur) et mêmes outils, avec une histoire, des dessins, une mélodie et une couleur (le rouge MKZ)
écrits pour MKZ Motors. Rien de la vidéo d'exemple du kit n'est repris (ni ses images, ni ses textes, ni sa mélodie).

L'idée : **votre voiture mérite une vitrine.** On tape sa plaque, MKZ l'estime ; les six étapes du dépôt-vente sortent
du sol, une par temps, chacune sur son écran ; puis le mur des voitures déjà vendues, et la promesse : vous, vous
n'avez rien à faire.

| Mesure | Secondes | Ce qui se passe | Titre de la Story |
|---|---|---|---|
| 1 | 0 à 2 | « Estimer ma voiture » : on tape sa plaque, AB-123-CD, lettre par lettre ; la voiture est reconnue (Citadine · 2019 · 68 000 km) ; très gros plan, le bouton s'enfonce | Votre voiture **mérite une vitrine.** |
| 2 | 2 à 4 | On file dans un couloir de voitures ; « Votre estimation » monte et se bloque sur 11 900 € | (le même) |
| 3 et 4 | 4 à 8 | Six écrans sortent du sol, sur deux gradins ; un gros plan par temps : 01 Estimation (la jauge), 02 Photos pro (le flash, les vignettes), 03 Annonce en ligne (les vues, une demande d'essai), 04 Essais (le trajet sur la carte), 05 Paiement sécurisé (le bouclier, « Virement reçu + 11 900 € »), 06 Démarches (quatre papiers cochés, « Dossier complet ») ; puis tous, de haut | Six étapes, **aucune pour vous.** |
| 5 | 8 à 10 | Le mur des voitures vendues (tampons « Vendue »), balayé de près, puis de face ; une plaque tombe : « Et vous ? **Rien** à faire. » | — |
| 6 | 10 à 12 | Trois plaques tombent en colonne, une par temps : **0** appel à gérer, **0** visite chez vous, **1** virement, c'est tout | — |
| 7 | 12 à 14 | La scène claire : Déposez → On vend → Vous encaissez ; la pastille rouge descend d'une étape à l'autre, puis s'envole | — |
| 8 | 14 à 16 | La pastille devient la plaque du logo MKZ Motors ; « DÉPÔT-VENTE » ; « Votre voiture en vitrine. On s'occupe du reste. » ; mkzmotors.com | — |

**À vérifier avant diffusion.** Les données sont des exemples : la plaque (AB-123-CD, le format d'exemple des plaques
françaises), la citadine 2019, 68 000 km, 11 900 €, les vues et favoris de l'annonce, l'essai du jeudi 18:30 (12 km,
25 min), les voitures vendues du mur et leurs prix. Quelques phrases décrivent le service et doivent correspondre à ce
que fait vraiment MKZ Motors : « organisé par MKZ » (l'essai), « Vérifié avant la remise des clés » (le paiement),
« Les papiers, on s'en charge » et la liste des papiers, « 0 visite chez vous », « 0 appel à gérer ». Le formulaire
« Estimer ma voiture » par la plaque est une illustration : s'il n'existe pas sur le site, le dire autrement. Le site
`mkzmotors.com` vient du domaine de l'adresse e-mail de l'entreprise.

## Où changer quoi

| Fichier | Contenu |
|---|---|
| `scene/tex-vitrine.js` | **Tous les textes et les données** : en tête, `PLAQUE`, `MODELE`, `ANNEE`, `KM`, `PRIX`, `ETAPES` (les six étiquettes), `VENDUES` (les voitures du mur) ; puis chaque dessin : la voiture de profil (`voiture()`), les six écrans animés (`ECRANS`), la barre et la plaque, l'estimation, la plaque du mur, les chiffres, la boucle, le logo, la phrase, l'adresse. |
| `scene/film.js` | La chorégraphie : les plans, déclarés dans l'ordre par `plan(coupe(instant), …)`, composés pour le vertical ; les titres de la Story (`TITRES`, dessinés sur un calque en pleine définition, sous la barre d'Instagram). |
| `scene/cues.js` | Le conducteur : tous les instants sur la grille de la musique, les coups de grosse caisse, la mélodie (`K.motif`, en ré mineur). L'image et la musique le lisent. |
| `scene/base.js`, `scene/outils.js` | La couleur : `C.accent` (le rouge MKZ, `#fa0f14`) et sa valeur 3D `ORANGE` (nom hérité du kit), à changer ensemble. Le logo : `scene/logo-mkz.png`. |
| `scene/moteur.js` | Le moteur 3D du kit (lanceur de rayons WebGL2), non modifié. |
| `tools/musique.mjs` | La musique (ré mineur, fin en ré majeur) et les bruitages (une touche par lettre de la plaque, la voiture reconnue, les écrans, les plaques…). |
| `scene/index.html`, `scene/apercu.html` | Final : 60 images/s (le maximum des Stories Instagram, TikTok et Facebook), 3D calculée en pleine définition 1080 × 1920, 4 passes par image (anticrénelage, flou de mouvement à 180° en 4 temps, profondeur de champ), écrans dessinés en 720 × 1280, 40 Mbit/s. Aperçu : 30 i/s, 1 passe, 3D en 540 × 960. Avec une carte graphique : `ECHANTILLONS = 24` et `RAYONS = 2` dans `index.html`, la qualité maximale du kit. |
| `scene/dessins.html` | Une planche de tous les dessins, sans la 3D, pour les relire en pleine définition (`dessins.html?u=1.5` : les écrans à 1,5 s). |

## Fabriquer la vidéo

Toutes les commandes se lancent depuis `videos/mkz-vitrine/`. Il faut Node 18+, ffmpeg, Chrome/Chromium et Python 3
avec Pillow (`node tools/verifier.mjs` dit ce qui manque).

    node tools/musique.mjs                                   # musique + bruitages → audio/mix.wav
    node tools/essai.mjs essai 0.9,3.8,6.75                  # out/essai/ : trois images et leur planche
    python3 tools/storyboard.py --tout                       # livrables/storyboard-mkz-vitrine.jpg
    node tools/rendu.mjs video --scene scene/apercu.html --fps 30 --dpr 1 --workers 3 --delai 120 --bitrate 6000000 --out out/apercu-muet.mp4
    bash outils-rendu/rendu-final.sh                         # le rendu final, par tranches de 4 s (voir le script)

Le rendu final sans carte graphique prend environ sept heures (25 s par image) ; avec une carte graphique, quelques
minutes. Il se fait par tranches de 2 s : relancer le script reprend là où il s'était arrêté. Deux fichiers sortent :
`livrables/mkz-motors-vitrine-1080x1920.mp4` (40 Mbit/s, le fichier maître) et `livrables/mkz-motors-vitrine-leger.mp4`
(environ 10 Mbit/s, pour la mise en ligne). Ne pas
modifier `scene/` pendant un rendu.

## Contrôles

    node tools/bin/coupes out/mkz-vitrine-muet.mp4 out/ecarts.tsv && python3 tools/controle.py out/ecarts.tsv
    node tools/encode/encode probe livrables/mkz-motors-vitrine-1080x1920.mp4

Les « pics isolés » deux images avant un temps (1,47 s, 1,97 s, 3,97 s…) sont les coupes : c'est voulu.
