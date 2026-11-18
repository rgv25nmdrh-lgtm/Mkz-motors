#!/usr/bin/env bash
# Rendu final de la publicité avec voix off, sans carte graphique : quatre tranches de 5 s (une tranche réussie n'est
# pas refaite ; supprimer out/final-N.mp4 pour la refaire), raccordées sans réencodage, puis le son.
#   bash outils-rendu/rendu-final.sh        (depuis videos/mkz-voix/)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out livrables
: > out/liste-final.txt
for i in 0 1 2 3; do
  a=$((i * 5)); b=$((a + 5))
  if [ ! -s "out/final-$i.mp4" ]; then
    node tools/rendu.mjs video --scene scene/index.html --fps 30 --dpr 1 --workers 4 --delai 240 --bitrate 14000000 \
      --from $a --to $b --out "out/final-$i.mp4" > "out/final-$i.log" 2>&1
  fi
  echo "file 'final-$i.mp4'" >> out/liste-final.txt
done
ffmpeg -y -v error -f concat -safe 0 -i out/liste-final.txt -c copy out/mkz-voix-muet-1080.mp4
node tools/bin/mux out/mkz-voix-muet-1080.mp4 audio/mix.wav livrables/mkz-motors-voix-off-1080x1920.mp4
echo "fini : livrables/mkz-motors-voix-off-1080x1920.mp4"
