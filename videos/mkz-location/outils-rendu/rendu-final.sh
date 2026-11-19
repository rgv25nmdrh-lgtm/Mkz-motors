#!/bin/bash
# Rendu final de la location (Story 1080 × 1920, 60 i/s, 3D en pleine définition, 8 passes par image), par tranches
# de 2 s, puis le son et une version allégée pour la mise en ligne. Sans carte graphique : plusieurs heures.
# Une tranche déjà finie n'est pas refaite (on peut relancer le script après une coupure). Écrit out/FINI ou out/ECHEC.
#   bash outils-rendu/rendu-final.sh            toutes les tranches, puis l'assemblage
#   bash outils-rendu/rendu-final.sh 4 6        seulement ces tranches (pour les lancer une par une), sans assemblage
cd "$(dirname "$0")/.." || exit 1
mkdir -p out livrables
TRANCHES="${*:-0 2 4 6 8 10 12 14}"
for k in $TRANCHES; do
  [ -s out/final-$k.mp4 ] && tr '\r' '\n' < out/final-$k.log 2>/dev/null | grep -q "^fini" && continue
  node tools/rendu.mjs video --scene scene/index.html --fps 60 --dpr 1 --workers 3 --delai 900 --bitrate 40000000 --from $k --to $((k+2)) --out out/final-$k.mp4 > out/final-$k.log 2>&1 || { echo "tranche $k" > out/ECHEC; exit 1; }
done
[ $# -gt 0 ] && exit 0
: > out/liste-final.txt; for k in 0 2 4 6 8 10 12 14; do echo "file 'final-$k.mp4'" >> out/liste-final.txt; done
[ -s audio/mix.wav ] || node tools/musique.mjs
ffmpeg -y -v error -f concat -safe 0 -i out/liste-final.txt -c copy out/mkz-location-muet.mp4 \
 && node tools/bin/mux out/mkz-location-muet.mp4 audio/mix.wav livrables/mkz-motors-location-1080x1920.mp4 \
 && ffmpeg -y -v error -i livrables/mkz-motors-location-1080x1920.mp4 -c:v libx264 -preset slow -crf 18 -maxrate 12M -bufsize 24M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart livrables/mkz-motors-location-leger.mp4 \
 && date > out/FINI || { echo "assemblage" > out/ECHEC; exit 1; }
