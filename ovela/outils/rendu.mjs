// Ovela : rendu image par image dans Chromium sans interface.
//   node outils/rendu.mjs images --t 1,3.5,7 --out out/planche            → une image PNG par instant
//   node outils/rendu.mjs video --from 0 --to 20 --fps 60 --out out/muet.mp4
// Options : --w 1080 --h 1920 --def 1 (définition de la 3D) --ech 8 (sous-images par image) --obt 0.00833 (obturateur, s)
//           --crf 16 (qualité H.264) --workers 1
import { createRequire } from "module";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ICI = path.dirname(fileURLToPath(import.meta.url));
const [mode = "images", ...reste] = process.argv.slice(2);
const A = {};
for (let i = 0; i < reste.length; i += 2) A[reste[i].replace(/^--/, "")] = reste[i + 1];
const W = +(A.w || 1080), H = +(A.h || 1920), DEF = +(A.def || 1), ECH = +(A.ech || 8), OBT = +(A.obt || 1 / 120);
const SCENE = pathToFileURL(path.resolve(ICI, "../scene/index.html")).href + `?w=${W}&h=${H}&def=${DEF}&dbg=${A.dbg || 0}`;

async function page(navigateur) {
  const p = await navigateur.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const erreurs = [];
  p.on("pageerror", (e) => erreurs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text()); });
  await p.goto(SCENE);
  try { await p.evaluate(() => window.PRET); } catch (e) { throw new Error("scène : " + (erreurs.join("\n") || e.message)); }
  if (erreurs.length) throw new Error("scène : " + erreurs.join("\n"));
  return p;
}
async function capture(p, t, numero) {
  await p.evaluate(([t, o]) => window.rendre(t, o), [t, { echantillons: ECH, obturateur: OBT, numero }]);
  return p.screenshot({ type: "png", clip: { x: 0, y: 0, width: W, height: H } });
}

const navigateur = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  if (mode === "images") {
    const out = A.out || "out/images"; fs.mkdirSync(out, { recursive: true });
    const p = await page(navigateur);
    for (const t of String(A.t).split(",").map(Number)) {
      const d = Date.now(), png = await capture(p, t, Math.round(t * 60));
      const f = path.join(out, `t${t.toFixed(2).padStart(5, "0")}.png`); fs.writeFileSync(f, png);
      console.log(`${f}  ${((Date.now() - d) / 1000).toFixed(1)} s`);
    }
  } else if (mode === "video") {
    const fps = +(A.fps || 60), from = +(A.from || 0), to = +(A.to || 20), out = A.out || "out/muet.mp4", workers = +(A.workers || 1);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const n0 = Math.round(from * fps), n1 = Math.round(to * fps), total = n1 - n0;
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", A.crf || "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
    const pages = await Promise.all(Array.from({ length: workers }, () => page(navigateur)));
    const prets = new Map(); let suivant = n0, ecrit = n0; const debut = Date.now();
    async function ouvrier(p) {
      while (suivant < n1) {
        const n = suivant++;
        prets.set(n, await capture(p, n / fps, n));
        while (prets.has(ecrit)) {
          const b = prets.get(ecrit); prets.delete(ecrit);
          if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once("drain", r));
          ecrit++;
          const f = ecrit - n0;
          if (f % 30 === 0 || f === total) { const el = (Date.now() - debut) / 1000; console.log(`${f}/${total} images, ${el.toFixed(0)} s, reste ~${((el / f) * (total - f) / 60).toFixed(1)} min`); }
        }
      }
    }
    await Promise.all(pages.map(ouvrier));
    ff.stdin.end(); await new Promise((r) => ff.on("close", r));
    console.log("→ " + out);
  }
} finally { await navigateur.close(); }
