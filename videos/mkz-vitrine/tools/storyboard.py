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
  ("1 · La plaque (mesure 1, de 0 à 2 s)", [(0.3, "On tape sa plaque"), (0.9, "AB-123-C…"), (1.3, "Reconnue : la citadine"), (1.7, "Très gros plan : Estimer")]),
  ("2 · Le couloir (mesure 2, de 2 à 4 s)", [(2.6, "On file entre les voitures"), (3.2, "L'estimation monte"), (3.8, "11 900 € : bloqué, tenu")]),
  ("3 · Les six étapes (mesures 3 et 4, de 4 à 8 s)", [(4.2, "Elles sortent du sol"), (4.75, "01 · Estimation"), (5.25, "02 · Photos pro"), (5.75, "03 · Annonce en ligne"),
    (6.25, "04 · Essais"), (6.75, "05 · Paiement sécurisé"), (7.25, "06 · Démarches"), (7.75, "Toutes, de haut")]),
  ("4 · Le mur (mesure 5, de 8 à 10 s)", [(8.3, "Les voitures vendues"), (8.8, "La caméra le balaie"), (9.7, "« Et vous ? Rien à faire. »")]),
  ("5 · Les chiffres (mesure 6, de 10 à 12 s)", [(10.2, "0 appel à gérer"), (10.7, "0 visite chez vous"), (11.2, "1 virement, c'est tout"), (11.8, "Les trois, tenus")]),
  ("6 · La boucle (mesure 7, de 12 à 14 s)", [(12.3, "Déposez"), (12.8, "On vend"), (13.3, "Vous encaissez"), (13.8, "La pastille s'envole")]),
  ("7 · Le logo (mesure 8, de 14 à 16 s)", [(14.3, "Le logo, Dépôt-vente"), (14.8, "La phrase"), (15.6, "Tenu")]),
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
d.text((M, 26), "MKZ Motors · la vitrine du dépôt-vente · storyboard (Story 9:16, images rendues, 120 battements par minute)", font=police(40, True), fill=(242, 242, 239))
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
img.save(os.path.join(PROJET, "livrables", "storyboard-mkz-vitrine.jpg"), quality=88); print("livrables/storyboard-mkz-vitrine.jpg", img.size)
