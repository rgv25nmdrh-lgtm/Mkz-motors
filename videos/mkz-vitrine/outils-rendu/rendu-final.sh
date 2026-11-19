#!/bin/bash
# Rendu final de la vitrine (Story 1080 × 1920, 60 i/s), par tranches de 4 s, puis le son et une version allégée.
# Une tranche déjà finie n'est pas refaite (on peut relancer le script après une coupure). Écrit out/FINI ou out/ECHEC.
cd "$(dirname "$0")/.." || exit 1
mkdir -p out livrables
: > out/liste-final.txt
for k in 0 4 8 12; do
  echo "file 'final-$k.mp4'" >> out/liste-final.txt
  [ -s out/final-$k.mp4 ] && tr '\r' '\n' < out/final-$k.log 2>/dev/null | grep -q "^fini" && continue
  node tools/rendu.mjs video --scene scene/index.html --fps 60 --dpr 1 --workers 3 --delai 300 --bitrate 24000000 --from $k --to $((k+4)) --out out/final-$k.mp4 > out/final-$k.log 2>&1 || { echo "tranche $k" > out/ECHEC; exit 1; }
done
[ -s audio/mix.wav ] || node tools/musique.mjs
ffmpeg -y -v error -f concat -safe 0 -i out/liste-final.txt -c copy out/mkz-vitrine-muet.mp4 \
 && node tools/bin/mux out/mkz-vitrine-muet.mp4 audio/mix.wav livrables/mkz-motors-vitrine-1080x1920.mp4 \
 && ffmpeg -y -v error -i livrables/mkz-motors-vitrine-1080x1920.mp4 -c:v libx264 -preset slow -crf 20 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart livrables/mkz-motors-vitrine-leger.mp4 \
 && date > out/FINI || { echo "assemblage" > out/ECHEC; exit 1; }
