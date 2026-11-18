# Ovela : la planche du storyboard (images clés réellement rendues, avec le numéro et le contenu de chaque plan).
#   python3 outils/planche.py storyboard storyboard/planche.png
import sys, glob, os, subprocess
from PIL import Image, ImageDraw, ImageFont

dossier, sortie = sys.argv[1], sys.argv[2]
PLANS = [
    ("1", "0–2 s", "23:47 : les messages arrivent"),
    ("2", "2–4 s", "Le flot ; tout se fige"),
    ("3", "4–6 s", "Ovela répond à chacun"),
    ("4", "6–8 s", "Le téléphone devient une carte"),
    ("5", "8–10 s", "L’allée des commerces"),
    ("6", "10–12 s", "La preuve : +31 %"),
    ("7", "12–14 s", "4,9 · 1 240 commerces"),
    ("8", "14–16 s", "Tout se couche ; l’arc de lumière"),
    ("9", "16–18 s", "Fusion en une barre ; la question"),
    ("10", "18–20 s", "La réponse ; la signature"),
]
police = lambda g, t: ImageFont.truetype(subprocess.run(["fc-match", "-f", "%{file}", f"Inter:{g}"], capture_output=True, text=True).stdout, t)
f1, f2 = police("bold", 30), police("regular", 24)
images = sorted(glob.glob(os.path.join(dossier, "t*.png")))
L, H, M, B = 432, 768, 24, 96
planche = Image.new("RGB", (5 * L + 6 * M, 2 * (H + B) + 3 * M), "#0b0b0d")
d = ImageDraw.Draw(planche)
for i, f in enumerate(images[:10]):
    x, y = M + (i % 5) * (L + M), M + (i // 5) * (H + B + M)
    planche.paste(Image.open(f).convert("RGB").resize((L, H), Image.LANCZOS), (x, y))
    n, quand, quoi = PLANS[i]
    d.text((x, y + H + 14), f"{n} · {quand}", font=f1, fill="#ff6a1a")
    d.text((x, y + H + 54), quoi, font=f2, fill="#d8d6d0")
planche.save(sortie, quality=92)
print(sortie, planche.size)
