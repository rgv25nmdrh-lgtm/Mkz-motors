#!/usr/bin/env python3
"""Storyboard : rend une image par plan (par node tools/essai.mjs, lots de trois relancés s'ils se bloquent) puis
assemble une planche par parties.   python3 tools/storyboard.py [--sans-rendu] [--tout]"""
import subprocess, sys, os
from PIL import Image, ImageDraw, ImageFont
for _flux in (sys.stdout, sys.stderr):   # Windows : une sortie redirigée n'est pas en UTF-8 par défaut
    try: _flux.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass
ICI = os.path.dirname(os.path.abspath(__file__)); PROJET = os.path.dirname(ICI); DOSSIER = os.path.join(PROJET, "out", "storyboard")
PARTIES = [
  ("1 · Le téléphone (mesure 1, de 0 à 2 s)", [(0.4, "L'écran s'allume"), (1.1, "La 208 en location"), (1.8, "80 € / jour")]),
  ("2 · La réservation (mesure 2, de 2 à 4 s)", [(2.35, "Vendredi…"), (2.9, "… → dimanche, 160 €"), (3.75, "Réservé")]),
  ("3 · Le week-end (mesure 3, de 4 à 6 s)", [(4.35, "VENDREDI, les stores"), (4.72, "La nuit passe"), (5.2, "SAMEDI"), (5.9, "DIMANCHE")]),
  ("4 · La clé (mesure 4, de 6 à 8 s)", [(6.3, "Elle tombe"), (6.75, "Elle rebondit"), (7.4, "« Vos clés sont prêtes »")]),
  ("5 et 6 · L'étiquette, le prix (de 8 à 12 s)", [(8.6, "L'étiquette en cuir"), (9.7, "Le long de la clé"), (11.2, "Le téléphone, la clé")]),
  ("7 et 8 · Le soir, le logo (de 12 à 16 s)", [(12.6, "La caméra s'élève"), (13.6, "Le logo"), (15.6, "mkzmotors.com, tenu")]),
]
nom = lambda t: os.path.join(DOSSIER, "t%05.2f.jpg" % t)
if "--sans-rendu" not in sys.argv:
    # --tout refait toutes les images ; sinon seules celles qui manquent sont rendues.
    temps = [t for _, ps in PARTIES for t, _ in ps if "--tout" in sys.argv or not os.path.exists(nom(t))]
    if temps:
        r = subprocess.run(["node", os.path.join(ICI, "essai.mjs"), "storyboard", ",".join(str(t) for t in temps)], cwd=PROJET, stdin=subprocess.DEVNULL)
        if r.returncode: print("échec du rendu des images du storyboard"); sys.exit(1)
L, Hh, COLS, M, LEG, TIT = 270, 480, 8, 16, 92, 70
POLICES = {False: ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/TTF/DejaVuSans.ttf", "DejaVuSans.ttf", "arial.ttf"],
           True: ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf", "arialbd.ttf"]}   # macOS, Windows, Linux
def police(taille, gras=False):
    for p in POLICES[bool(gras)]:
        try: return ImageFont.truetype(p, taille)
        except OSError: pass
    try: return ImageFont.load_default(taille)
    except Exception: return ImageFont.load_default()
rangs = sum((len(ps) + COLS - 1) // COLS for _, ps in PARTIES)
W, H = M + COLS * (L + M), 110 + len(PARTIES) * TIT + rangs * (Hh + LEG + M) + M
img = Image.new("RGB", (W, H), (17, 17, 21)); d = ImageDraw.Draw(img)
d.text((M, 26), "MKZ Motors · la location · storyboard (Story 9:16, 120 bpm, un seul plan)", font=police(40, True), fill=(242, 242, 239))
y = 110
for titre, plans in PARTIES:
    d.text((M, y + 14), titre, font=police(34, True), fill=(250, 40, 45)); y += TIT
    for k, (t, legende) in enumerate(plans):
        x = M + (k % COLS) * (L + M)
        if k and k % COLS == 0: y += Hh + LEG + M
        img.paste(Image.open(nom(t)).convert("RGB").resize((L, Hh), Image.LANCZOS), (x, y))
        d.text((x, y + Hh + 6), ("%.2f s" % t).replace(".", ","), font=police(22, True), fill=(250, 40, 45))
        d.text((x, y + Hh + 36), legende, font=police(20), fill=(200, 200, 205))
    y += Hh + LEG + M
os.makedirs(os.path.join(PROJET, "livrables"), exist_ok=True)
img.save(os.path.join(PROJET, "livrables", "storyboard-mkz-location.jpg"), quality=88); print("livrables/storyboard-mkz-location.jpg", img.size)
