#!/usr/bin/env python3
"""Planches de contrôle : python3 tools/planche.py dossier [colonnes] [par_planche] -> dossier/planche-N.jpg"""
import sys, glob, os
from PIL import Image, ImageDraw
for _flux in (sys.stdout, sys.stderr):   # Windows : une sortie redirigée n'est pas en UTF-8 par défaut
    try: _flux.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass
d = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 2; par = int(sys.argv[3]) if len(sys.argv) > 3 else 4
fs = sorted(glob.glob(os.path.join(d, 't*.jpg')))
for old in glob.glob(os.path.join(d, 'planche-*.jpg')): os.remove(old)
for n in range(0, len(fs), par):
    lot = fs[n:n + par]; ims = [Image.open(f) for f in lot]; w, h = ims[0].size; rows = (len(lot) + cols - 1) // cols
    C = Image.new('RGB', (cols * w + (cols + 1) * 6, rows * (h + 22) + 6), (30, 30, 30)); dr = ImageDraw.Draw(C)
    for i, (f, im) in enumerate(zip(lot, ims)):
        x = 6 + (i % cols) * (w + 6); y = 6 + (i // cols) * (h + 22); C.paste(im, (x, y + 16)); dr.text((x, y + 2), os.path.basename(f)[1:-4] + ' s', fill=(230, 230, 230))
    C.save(os.path.join(d, f'planche-{n // par + 1}.jpg'), quality=88)
print(len(fs), 'images')
