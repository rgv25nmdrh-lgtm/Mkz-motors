# Ovela : la musique (originale) et les bruitages, synthétisés avec numpy, calés sur les instants du film.
#   python3 outils/son.py            → out/musique.wav, out/bruitages.wav, out/mix-brut.wav
# Le mix final (volume TikTok, limiteur à −1 dBFS) se fait avec ffmpeg, voir LISEZMOI.md.
# Musique : 120 battements par minute, la mineur. Intro de nuit (nappe, horloge), le flot monte, tout se fige (arrêt
# de bande), la musique repart sur l'action (« drop »), double tempo à 12 s, pont à 16 s, accord final à 18 s.
import json, os, subprocess, wave
import numpy as np

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
SR = 48000
DUREE = 20.0
N = int(SR * (DUREE + 0.5))
K = json.loads(subprocess.run(["node", "-e", "process.stdout.write(JSON.stringify(require('./scene/instants.js').K))"],
                              capture_output=True, text=True, cwd=RACINE, check=True).stdout)
alea = np.random.default_rng(2381)          # hasard reproductible
BEAT = 0.5

def temps(n): return np.arange(n) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def bus(): return np.zeros((2, N))
def poser(b, sig, t0, g=1.0, pan=0.0):
    """Ajoute un son (mono ou stéréo) à l'instant t0, panoramique à puissance constante (−1 gauche, +1 droite)."""
    i0 = int(round(t0 * SR))
    if i0 >= N: return
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
    if i0 < 0: sig, i0 = sig[:, -i0:], 0
    n = min(sig.shape[1], N - i0)
    b[:, i0:i0 + n] += g * sig[:, :n]
def filtre(x, bas=None, haut=None, ordre=2):
    """Filtre à phase nulle dans le domaine fréquentiel (réponses de Butterworth). bas = passe-haut (Hz), haut = passe-bas."""
    n = x.shape[-1]; m = 1 << int(np.ceil(np.log2(n + 1)))
    X = np.fft.rfft(x, m); f = np.fft.rfftfreq(m, 1 / SR) + 1e-9
    H = np.ones_like(f)
    if haut: H /= np.sqrt(1 + (f / haut) ** (2 * ordre))
    if bas: H /= np.sqrt(1 + (bas / f) ** (2 * ordre))
    return np.fft.irfft(X * H, m)[..., :n]
def bruit(n): return alea.standard_normal(n)
def enveloppe(n, att=0.005, dec=0.2, forme="exp"):
    t = temps(n)
    a = np.clip(t / max(att, 1e-4), 0, 1)
    return a * (np.exp(-np.maximum(t - att, 0) / dec) if forme == "exp" else np.clip(1 - (t - att) / dec, 0, 1))
def scie(f, n, harm_max=7000, phase=0.0):
    t = temps(n); s = np.zeros(n)
    for k in range(1, int(harm_max / f) + 1): s += np.sin(2 * np.pi * k * f * t + phase * k) / k
    return s * 0.6
def balayage(n, f0, f1, largeur=0.6):
    """Bruit filtré dont la bande se déplace de f0 à f1 (fondu entre bandes fixes)."""
    bandes = np.geomspace(min(f0, f1) * 0.7, max(f0, f1) * 1.4, 10)
    src = bruit(n); vs = [filtre(src, bas=fc * (1 - largeur / 2), haut=fc * (1 + largeur / 2), ordre=2) for fc in bandes]
    fc = np.geomspace(f0, f1, n); pos = np.interp(np.log(fc), np.log(bandes), np.arange(len(bandes)))
    out = np.zeros(n)
    for i, v in enumerate(vs): out += v * np.clip(1 - np.abs(pos - i), 0, 1)
    return out / (np.std(out) + 1e-9)

# ------------------------------------------------------------------ les instruments
def grosse_caisse(force=1.0):
    n = int(0.6 * SR); t = temps(n)
    f = 46 + 95 * np.exp(-t / 0.035); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.3) + 0.35 * filtre(bruit(n), bas=1500) * np.exp(-t / 0.004)
    return s * force
def claquement():
    n = int(0.35 * SR); t = temps(n); src = filtre(bruit(n), bas=900, haut=5000)
    e = np.zeros(n)
    for d in (0, 0.009, 0.018): e += (t >= d) * np.exp(-np.maximum(t - d, 0) / (0.006 if d < 0.018 else 0.11))
    return src * e * 0.55
def charleston(ouvert=False):
    n = int((0.25 if ouvert else 0.08) * SR); t = temps(n)
    return filtre(bruit(n), bas=7000, ordre=3) * np.exp(-t / (0.09 if ouvert else 0.025)) * 0.32
def corde(f, dur=0.22, brillance=4500):
    n = int((dur + 0.3) * SR); t = temps(n)
    s = filtre(scie(f, n, brillance), haut=brillance * 0.6) * enveloppe(n, 0.002, dur)
    return s
def nappe(notes, dur, brillance=1600, att=0.5, rel=0.6):
    n = int((dur + rel) * SR); t = temps(n); s = np.zeros((2, n))
    for m in notes:
        for v, (det, pan) in enumerate(((-0.07, -0.6), (0.0, 0.0), (0.07, 0.6))):
            f = hz(m + det); x = scie(f, n, 5000, phase=alea.uniform(0, 6.28))
            a = (pan + 1) * np.pi / 4; s[0] += x * np.cos(a); s[1] += x * np.sin(a)
    s = filtre(s, haut=brillance, ordre=2)
    e = np.clip(t / att, 0, 1) * np.clip((dur + rel - t) / rel, 0, 1)
    return s * e / (len(notes) * 2.2)
def basse(f, dur):
    n = int((dur + 0.05) * SR); t = temps(n)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    return s * enveloppe(n, 0.006, dur * 0.9, "lin")

# ------------------------------------------------------------------ les bruitages
def ping(f, g=1.0):
    n = int(0.7 * SR); t = temps(n)
    return g * (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) * (t > 0.07)) * enveloppe(n, 0.003, 0.18)
def bulle(f):
    n = int(0.12 * SR); t = temps(n); ph = 2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-t / 0.02))) / SR
    return np.sin(ph) * enveloppe(n, 0.002, 0.035)
def souffle(dur, f0, f1, g=1.0, att=None):
    n = int(dur * SR); t = temps(n); a = att if att is not None else dur * 0.6
    e = np.where(t < a, (t / a) ** 2, np.exp(-(t - a) / (dur * 0.18)))
    return g * balayage(n, f0, f1) * e * 0.25
def tic(g=1.0):
    n = int(0.03 * SR); t = temps(n)
    return g * filtre(bruit(n), bas=3000) * np.exp(-t / 0.0025) * 0.6
def verre(f, g=1.0, dec=0.35):
    n = int(1.0 * SR); t = temps(n)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (dec / r ** 0.6)) for r, a in ((1, 1), (2.76, 0.45), (5.40, 0.25), (8.93, 0.12)))
    return g * s * enveloppe(n, 0.001, 10) * 0.5
def sourd(g=1.0):   # une carte de verre qui se pose
    n = int(0.4 * SR); t = temps(n); ph = 2 * np.pi * np.cumsum(90 + 60 * np.exp(-t / 0.02)) / SR
    return g * (np.sin(ph) * np.exp(-t / 0.09) + 0.2 * filtre(bruit(n), bas=400, haut=3000) * np.exp(-t / 0.01))
def carillon(notes, g=1.0, ecart=0.07):
    s = np.zeros(int(1.6 * SR))
    for i, m in enumerate(notes):
        x = ping(hz(m), 1.0)[: len(s) - int(i * ecart * SR)]; s[int(i * ecart * SR): int(i * ecart * SR) + len(x)] += x * (0.8 ** i)
    return g * s * 0.5
def scintille(dur, g=1.0, dense=40):
    n = int((dur + 0.6) * SR); s = np.zeros(n)
    for _ in range(dense):
        t0 = alea.uniform(0, dur); f = alea.uniform(2500, 7000); m = int(0.5 * SR); tt = temps(m)
        x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / alea.uniform(0.05, 0.18)) * alea.uniform(0.3, 1)
        i = int(t0 * SR); s[i:i + m] += x[: n - i]
    return g * s * 0.12
def touche(g=1.0):
    n = int(0.06 * SR); t = temps(n)
    return g * (filtre(bruit(n), bas=1800, haut=9000) * np.exp(-t / 0.006) + 0.3 * np.sin(2 * np.pi * alea.uniform(1800, 2600) * t) * np.exp(-t / 0.01)) * 0.5
def impact(g=1.0):
    n = int(2.2 * SR); t = temps(n); ph = 2 * np.pi * np.cumsum(38 + 70 * np.exp(-t / 0.06)) / SR
    return g * (np.sin(ph) * np.exp(-t / 0.7) * 0.9 + filtre(bruit(n), bas=2500) * np.exp(-t / 0.5) * 0.12 + filtre(bruit(n), bas=60, haut=900) * np.exp(-t / 0.05) * 0.4)
def bourdon(f, dur, g=1.0):
    n = int(dur * SR); t = temps(n)
    return g * (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 3 * t))) * np.sin(np.pi * t / dur) ** 2 * 0.3

def reverb(x, duree=1.8, humide=0.25):
    n = int(duree * SR); t = temps(n)
    ir = np.stack([filtre(bruit(n), haut=6000) * np.exp(-t / (duree / 6.9)) for _ in range(2)]); ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    m = 1 << int(np.ceil(np.log2(x.shape[1] + n)))
    w = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:, : x.shape[1]]
    return x + humide * w

# ================================================================== la musique
mus, nap, bas_, perc, arp = bus(), bus(), bus(), bus(), bus()
ACC = {   # nappe (sans la basse) et note de basse, mesure par mesure
    "Am9": ([57, 60, 64, 67, 71], 33), "Fmaj9": ([53, 57, 60, 64, 67], 29), "Cmaj7": ([55, 60, 64, 67, 71], 36),
    "G69": ([55, 59, 62, 64, 69], 31), "Dm9": ([50, 53, 57, 60, 64], 38),
}
GRILLE = [(4, "Am9"), (6, "Fmaj9"), (8, "Cmaj7"), (10, "G69"), (12, "Am9"), (14, "Fmaj9"), (16, "Dm9")]
# 1 · la nuit (0 à 3,5 s) : nappe sombre, horloge sur les temps, la tension monte avec le flot
poser(nap, nappe(ACC["Am9"][0], 3.6, brillance=900, att=1.2, rel=0.3), 0.0, 0.9)
for b in range(7): poser(perc, tic(0.5 if b % 2 == 0 else 0.3), b * BEAT, 1.0, 0.25)
poser(bas_, basse(hz(33), 3.5) * 0.5, 0.0)
for i, x in enumerate(np.arange(2.0, 3.5, 0.125)): poser(perc, charleston(), x, 0.25 + 0.5 * i / 12, 0.3)
for x in (2.0, 2.5, 3.0): poser(perc, grosse_caisse(0.55), x)
# 2 · l'action (4 à 16 s)
for t0, nom in GRILLE[:6]:
    notes, rb = ACC[nom]
    poser(nap, nappe(notes, 2.0, brillance=1400 if t0 < 12 else 2200, att=0.08, rel=0.25), t0, 0.8)
    for k in range(16):   # basse en croches décalées, arpège en doubles croches
        x = t0 + k * 0.125
        if k % 2 == 1: poser(bas_, basse(hz(rb + 12 * (k % 4 == 3)), 0.11), x, 0.9)
        motif = [0, 2, 4, 1, 3, 2, 4, 3]
        poser(arp, corde(hz(notes[motif[k % 8]] + (12 if t0 >= 12 else 0) + (12 if k % 8 >= 6 else 0)), 0.16, 3500 if t0 < 12 else 5500), x, 0.22, pan=0.5 * np.sin(k * 1.3))
for b in range(24):   # grosse caisse sur les temps, claquement sur 2 et 4
    x = 4.0 + b * BEAT
    poser(perc, grosse_caisse(1.0), x)
    if b % 2 == 1: poser(perc, claquement(), x, 0.8)
    if x < 12: poser(perc, charleston(), x + 0.25, 0.6, 0.35)
for k in range(32):   # double tempo : charleston en doubles croches, charleston ouvert à contretemps
    x = 12.0 + k * 0.125
    poser(perc, charleston(ouvert=(k % 4 == 2)), x, 0.45 + 0.25 * (k % 2 == 0), -0.3 if k % 2 else 0.3)
for x in (15.5, 15.625, 15.75, 15.875): poser(perc, claquement(), x, 0.5)
# 3 · le pont (16 à 18 s) : sans grosse caisse, la nappe se referme, la basse tient
notes, rb = ACC["Dm9"]
poser(nap, nappe(notes, 2.0, brillance=700, att=0.05, rel=0.2), 16.0, 0.9)
poser(bas_, basse(hz(rb), 1.9) * 0.7, 16.0)
poser(mus, souffle(1.0, 300, 6000, 0.5, att=0.95), 17.0)
# 4 · l'accord final (18 s)
poser(nap, nappe([57, 60, 64, 67, 71, 76], 2.0, brillance=3000, att=0.01, rel=0.5), 18.0, 1.1)
poser(bas_, basse(hz(33), 2.0), 18.0)
poser(perc, grosse_caisse(1.3), 18.0)
for i, m in enumerate([69, 72, 76, 79, 83, 88]): poser(arp, corde(hz(m), 0.5, 6000), 18.0 + i * 0.0625, 0.25, pan=-0.6 + 0.24 * i)
# compression par la grosse caisse (la nappe et la basse s'effacent à chaque coup)
tt = temps(N); duck = np.ones(N)
for b in range(24): x = 4.0 + b * BEAT; duck *= 1 - 0.6 * (tt >= x) * np.exp(-np.maximum(tt - x, 0) / 0.11)
for x in (2.0, 2.5, 3.0): duck *= 1 - 0.35 * (tt >= x) * np.exp(-np.maximum(tt - x, 0) / 0.11)
nap *= duck; bas_ *= duck
# écho sur l'arpège (croche pointée)
ech = arp.copy()
for i, (d, g) in enumerate(((0.375, 0.35), (0.75, 0.18))):
    k = int(d * SR); s = np.zeros_like(arp); s[:, k:] = arp[::-1 if i == 0 else 1, :-k]; ech += g * s
mus += reverb(nap, 2.2, 0.35) + filtre(bas_, haut=400) * 0.9 + perc + reverb(ech, 1.6, 0.3)
# l'arrêt de bande : à 3,5 s la musique ralentit jusqu'à l'arrêt en 0,25 s, puis le silence jusqu'au drop
i0, i1, i2 = int(K["fige"] * SR), int((K["fige"] + 0.25) * SR), int(K["drop"] * SR)
tau = temps(i1 - i0); lecture = K["fige"] + tau - tau ** 2 / (2 * 0.25)
src = mus.copy()
for c in range(2): mus[c, i0:i1] = np.interp(lecture, tt, src[c]) * (1 - tau / 0.25) ** 0.5
mus[:, i1:i2] = 0
# ce qui sonne après 4 s n'est pas coupé ; ce qui débordait d'avant 3,5 s non plus (la réverbération de l'arrêt)

# ================================================================== les bruitages
sfx = bus()
poser(sfx, souffle(0.9, 80, 900, 0.9, att=0.6), 0.0)                        # la lueur s'allume
poser(sfx, impact(0.35), 0.55)
for x in K["arrivees"]: poser(sfx, ping(hz(88), 0.5), x, 1.0, 0.15)          # les messages arrivent
for k, x in enumerate(K["flot"]):                                            # le flot des notifications
    poser(sfx, bulle(hz(81 + 2 * k)), x, 0.7, [-0.5, 0.5, -0.6, 0.5, 0.0, -0.2][k])
    poser(sfx, souffle(0.3, 2000, 600, 0.6, att=0.05), x, 1.0, [-0.5, 0.5, -0.6, 0.5, 0.0, -0.2][k])
for v in range(4, 38): poser(sfx, tic(0.35), K["flot"][0] + 1.45 * np.sqrt((v - 3.5) / 34), 1.0, 0.4)   # le compteur s'emballe
poser(sfx, souffle(0.5, 200, 9000, 1.0, att=0.48), K["fige"])                # aspiration avant le drop
poser(sfx, impact(1.0), K["drop"])                                           # le drop
poser(sfx, souffle(0.75, 7000, 500, 0.8, att=0.1), K["drop"])                # le balayage d'Ovela sur le téléphone
for k, x in enumerate(K["reponses"]):                                        # Ovela répond à chacun
    poser(sfx, bulle(hz(88 + [0, 3, 5, 7, 10, 12][k])), x + 0.03, 0.55, [-0.5, 0.5, -0.6, 0.5, 0.0, -0.2][k])
for k in range(6): poser(sfx, souffle(0.32, 900, 3500, 0.35, att=0.3), K["retour"] + 0.08 * k, 1.0, [-0.5, 0.5, -0.6, 0.5, 0.0, -0.2][k])
poser(sfx, souffle(0.55, 600, 4000, 0.7, att=0.3), K["bascule"])              # le téléphone se retourne
poser(sfx, verre(hz(76), 0.5), K["bascule"] + 0.55)
for k, x in enumerate(K["montees"]): poser(sfx, verre(hz(64 + 2 * k), 0.45), x + 0.3, 1.0, [-0.5, 0.5, -0.5, 0.5][k])
for k in range(5): poser(sfx, bulle(hz(84 + 2 * k)), K["etiquettes"] + 0.12 * k, 0.45, [-0.4, 0.4, 0.0, -0.2, 0.3][k])
poser(sfx, souffle(2.0, 400, 1800, 0.35, att=1.0), 8.0)                       # le travelling
for i, x in K["oks"].items(): poser(sfx, carillon([88, 95], 0.55), x, 1.0, -0.4 if i in ("0", "1") else 0.4)   # chaque commerce reçoit sa réponse (cartes 0 et 1 à gauche)
poser(sfx, souffle(0.35, 300, 3000, 0.7, att=0.33), K["stats"] - 0.33)        # la preuve se lève
poser(sfx, impact(0.5), K["stats"])
poser(sfx, bourdon(hz(57), 1.8, 0.5), K["stats"] + 0.05)
for i in range(20): poser(sfx, tic(0.25), K["stats"] + 0.25 + 0.75 * (1 - (1 - (i + 0.5) / 20) ** (1 / 3)), 1.0, -0.2)
for i, x in enumerate((10.5, 10.68, 10.86, 11.05)): poser(sfx, bulle(hz(76 + 3 * i)), x, 0.4, 0.2)
poser(sfx, souffle(0.4, 3000, 700, 0.6, att=0.1), K["avis"])                  # les avis arrivent
poser(sfx, verre(hz(83), 0.4), K["avis"] + 0.38)
for i in range(16): poser(sfx, tic(0.22), K["avis"] + 0.25 + 0.75 * (1 - (1 - (i + 0.5) / 16) ** (1 / 3)), 1.0, -0.3)
for k in range(7): poser(sfx, sourd(0.5), K["couche"] + 0.11 * k + 0.5, 1.0, [-0.4, -0.2, 0.3, 0.4, -0.3, 0.0, 0.1][k])   # tout se couche
poser(sfx, souffle(1.6, 1500, 6000, 0.5, att=0.8), K["arc"], 1.0)            # l'arc de lumière
poser(sfx, scintille(1.4, 0.8), K["arc"] + 0.2)
poser(sfx, souffle(0.6, 300, 2500, 0.8, att=0.55), K["fusion"])               # la fusion
poser(sfx, bourdon(hz(45), 1.0, 0.6), K["fusion"] + 0.3)
poser(sfx, souffle(0.5, 800, 5000, 0.6, att=0.45), K["leve"])                 # la barre se lève et s'allume
poser(sfx, ping(hz(76), 0.25), K["leve"] + 0.45)
for i in range(1, K["signes"] + 1): poser(sfx, touche(0.8 + 0.2 * alea.random()), K["frappe"] + i / K["signes"] * K["duree_frappe"], 1.0, 0.05 * alea.standard_normal())
poser(sfx, touche(1.6), K["entree"] - 0.01)                                  # Entrée
poser(sfx, impact(0.7), K["entree"])
poser(sfx, carillon([88, 93, 95, 100], 0.7, 0.06), K["entree"] + 0.06)        # la réponse
poser(sfx, scintille(0.9, 0.7, 30), K["fin"])                                 # la signature

# ================================================================== sorties
def ecrire(nom, x):
    x = x[:, : int(DUREE * SR)].copy()
    f = int(0.25 * SR); x[:, -f:] *= np.linspace(1, 0, f) ** 2
    y = np.clip(x, -1, 1); y = (y.T * 32767).astype(np.int16)
    os.makedirs(os.path.join(RACINE, "out"), exist_ok=True)
    with wave.open(os.path.join(RACINE, "out", nom), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())
crete = max(np.abs(mus).max(), np.abs(sfx).max(), np.abs(mus * 0.6 + sfx * 0.8).max())
mus_n, sfx_n = mus / crete * 0.5, sfx / crete * 0.5
ecrire("musique.wav", mus_n); ecrire("bruitages.wav", sfx_n); ecrire("mix-brut.wav", mus_n * 0.62 + sfx_n * 0.85)
print("out/musique.wav, out/bruitages.wav, out/mix-brut.wav")
