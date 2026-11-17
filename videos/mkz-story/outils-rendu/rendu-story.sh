#!/bin/bash
# Rendu final de la Story, par tranches de 5 s, puis le son et la version légère. Écrit out/FINI ou out/ECHEC.
cd /home/user/Mkz-motors/videos/mkz-story
for k in 0 5 10 15; do
  [ -s out/final-$k.mp4 ] && tr '\r' '\n' < out/final-$k.log 2>/dev/null | grep -q "^fini" && continue
  node tools/rendu.mjs video --scene scene/index.html --fps 60 --dpr 1 --workers 2 --delai 300 --bitrate 24000000 --from $k --to $((k+5)) --out out/final-$k.mp4 > out/final-$k.log 2>&1 || { echo "tranche $k" > out/ECHEC; exit 1; }
done
ffmpeg -y -v error -f concat -safe 0 -i out/liste-final.txt -c copy out/mkz-story-muet.mp4 \
 && node tools/bin/mux out/mkz-story-muet.mp4 audio/mix.wav livrables/mkz-motors-story-1080x1920.mp4 \
 && ffmpeg -y -v error -i livrables/mkz-motors-story-1080x1920.mp4 -c:v libx264 -preset slow -crf 20 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart /home/user/Mkz-motors/mkz-motors-story.mp4 \
 && date > out/FINI || echo "assemblage" > out/ECHEC
