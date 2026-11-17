// Moteur de rendu de la publicité MKZ Motors : une clé de voiture sur un podium, dans un showroom, en vraie 3D.
// Même principe que le moteur de la boîte à outils Mavena (un shader WebGL2 qui lance un rayon par pixel dans une
// scène décrite par des distances, N passes cumulées, halo, courbe de tons, grain), mais allégé pour pouvoir tourner
// sans carte graphique (rendu logiciel SwiftShader) : un seul rebond (le sol brillant reflète la clé et le podium), la
// laque et le chrome reflètent le studio sans relancer de rayon, et chaque passe est découpée en petites bandes.
// Tout est une fonction pure des paramètres : deux rendus du même instant sont identiques.
//
//   const M = MoteurSDF.creer(canvas, { largeur: 540, hauteur: 960 });
//   M.texture("panneau" | "mur" | "cle" | "etiquette", canevas2D);
//   M.image(t, sceneDe, { echantillons: 6, obturateur: 1 / 60 });
// La description d'une scène est donnée dans scene/film.js.
const MoteurSDF = (() => {
  "use strict";
  const SOMMETS = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

  const TRACE = `#version 300 es
precision highp float;
out vec4 sortie;
uniform vec2 uRes;
uniform vec3 uCamPos, uCamX, uCamY, uCamZ;
uniform float uTanFov, uOuverture, uMise, uPasse, uTemps, uPoids;
uniform vec4 uAlea;
uniform vec3 uClePos; uniform mat3 uCleRep;   // la clé : position, repère (monde → clé)
uniform float uLed;           // le voyant de la clé
uniform vec3 uRampes;         // les trois rampes de lumière du plafond (0 éteinte, 1 allumée)
uniform float uAmbiance;      // lumière générale de la salle
uniform vec2 uPodium;         // angle du dessus du podium, éclat de son anneau
uniform vec4 uPanneau;        // x, z, lacet, présence
uniform float uLogo;          // enseigne du mur du fond (0 éteinte)
uniform sampler2D uPanneauTex, uMurTex, uCleTex, uEtiqTex;

const float PI = 3.14159265, Z_MUR = -4.2, H_PODIUM = 0.45, R_PODIUM = 1.0, ECH = 1.8;   // ECH : la clé est un objet héros, à grande échelle
const float M_SOL = 1.0, M_MUR = 2.0, M_COQUE = 3.0, M_CHROME = 4.0, M_CUIR = 5.0, M_PODIUM = 7.0, M_PANNEAU = 8.0, M_PIED = 9.0;

float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float bruit(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdPave(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdTore(vec3 p, float R, float r) { return length(vec2(length(p.xz) - R, p.y)) - r; }

// ---------------------------------------------------------------- la clé (repère propre : longueur en x, épaisseur en y)
// une coque galet noire laquée avec trois touches, un col chromé, un anneau, une étiquette de cuir rouge
vec3 repereCle(vec3 p) { return uCleRep * (p - uClePos) / ECH; }
vec3 repereEtiq(vec3 q) { vec3 e = q - vec3(-0.62, 0.0, 0.035); e.xz = rot(0.22) * e.xz; return e; }
float sdCoque(vec3 q) {
  vec3 c = q - vec3(0.06, 0.0, 0.0); c.z *= 1.0 + 0.22 * smoothstep(0.1, -0.25, c.x);   // plus étroite vers l'anneau
  float d = sdPave(c, vec3(0.25, 0.048, 0.11), 0.046);
  for (int i = 0; i < 3; i++) {                                // les touches, légèrement bombées
    vec3 b = q - vec3(0.17 - 0.1 * float(i), 0.049, 0.0);
    d = smin(d, length(vec2(length(b.xz) - 0.026, b.y)) - 0.006, 0.006);
  }
  return d;
}
float sdChrome(vec3 q) {
  float col = sdPave(q - vec3(-0.215, 0.0, 0.0), vec3(0.045, 0.022, 0.045), 0.02);
  float boucle = sdTore((q - vec3(-0.275, 0.0, 0.0)).xzy, 0.03, 0.009);
  float anneau = sdTore(q - vec3(-0.37, 0.0, 0.0), 0.085, 0.009);
  return min(col, min(boucle, anneau));
}
float sdCuir(vec3 q) { vec3 e = repereEtiq(q); return sdPave(e, vec3(0.17, 0.007, 0.075), 0.006); }
float sdCle(vec3 p, out float part) {
  vec3 q = repereCle(p);
  float b = length(q - vec3(-0.25, 0.0, 0.0)) - 0.62; if (b > 0.2) { part = M_COQUE; return b * ECH; }
  float a = sdCoque(q), m = sdChrome(q), c = sdCuir(q);
  part = M_COQUE; float d = a;
  if (m < d) { d = m; part = M_CHROME; }
  if (c < d) { d = c; part = M_CUIR; }
  return d * ECH;
}
// ---------------------------------------------------------------- le décor
float sdPodium(vec3 p) { vec2 d = vec2(length(p.xz) - R_PODIUM, abs(p.y - H_PODIUM * 0.5) - H_PODIUM * 0.5); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - 0.012; }
vec3 reperePanneau(vec3 p) { vec3 q = p - vec3(uPanneau.x, 0.0, uPanneau.y); q.xz = rot(-uPanneau.z) * q.xz; return q; }
float sdPanneau(vec3 p, out float pied) {
  if (uPanneau.w < 0.5) { pied = 0.0; return 9.0; }
  vec3 q = reperePanneau(p); float b = length(q - vec3(0.0, 0.9, 0.0)) - 1.2; if (b > 0.3) { pied = 0.0; return b; }
  float plaque = sdPave(q - vec3(0.0, 1.2, 0.0), vec3(0.03, 0.42, 0.6), 0.015);
  float mat = min(length(q.xz) - 0.025, 0.0) + max(length(q.xz) - 0.025, max(q.y - 0.9, -q.y));
  float socle = sdPave(q - vec3(0.0, 0.012, 0.0), vec3(0.22, 0.012, 0.22), 0.008);
  float pi = min(mat, socle); pied = pi < plaque ? 1.0 : 0.0; return min(plaque, pi);
}
vec2 U(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
vec2 carte(vec3 p) {
  float part, pied;
  vec2 r = U(vec2(p.y, M_SOL), vec2(p.z - Z_MUR, M_MUR));
  r = U(r, vec2(sdPodium(p), M_PODIUM));
  float dc = sdCle(p, part); r = U(r, vec2(dc, part));
  float dp = sdPanneau(p, pied); r = U(r, vec2(dp, pied > 0.5 ? M_PIED : M_PANNEAU));
  return r;
}
float carteObjets(vec3 p) { float a, b; return min(sdCle(p, a), sdPanneau(p, b)); }
vec3 normale(vec3 p) { const vec2 e = vec2(1.0, -1.0) * 0.0006; return normalize(e.xyy * carte(p + e.xyy).x + e.yyx * carte(p + e.yyx).x + e.yxy * carte(p + e.yxy).x + e.xxx * carte(p + e.xxx).x); }
float marche(vec3 ro, vec3 rd, float tmax, int pas, out float mat) {
  float t = 0.004;
  for (int i = 0; i < 120; i++) {
    if (i >= pas) break;
    vec2 h = carte(ro + rd * t);
    if (h.x < 0.0004 * (1.0 + t)) { mat = h.y; return t; }
    t += h.x * 0.9; if (t > tmax) break;
  }
  mat = 0.0; return -1.0;
}

// ---------------------------------------------------------------- la lumière du studio
float ombre(vec3 ro, vec3 rd) { float res = 1.0, t = 0.01; for (int i = 0; i < 28; i++) { float h = carteObjets(ro + rd * t); res = min(res, 9.0 * h / t); t += clamp(h, 0.01, 0.3); if (res < 0.01 || t > 5.0) break; } return clamp(res, 0.0, 1.0); }
float occlusion(vec3 p, vec3 n) { float o = 0.0, s = 1.0; for (int i = 1; i <= 3; i++) { float h = 0.015 + 0.04 * float(i); o += (h - carte(p + n * h).x) * s; s *= 0.6; } return clamp(1.0 - 2.5 * o, 0.0, 1.0); }
// le studio, vu dans un reflet : trois rampes au plafond, deux boîtes à lumière sur les côtés, l'enseigne
vec3 studio(vec3 r, float flou) {
  vec3 c = vec3(0.010, 0.011, 0.014) * (0.3 + uAmbiance) + vec3(0.02, 0.022, 0.026) * uAmbiance * smoothstep(-0.2, 0.6, r.y);
  float b = 0.04 + flou;
  if (r.y > 0.02) {
    vec2 h = r.xz * (3.0 / r.y);
    for (int i = 0; i < 3; i++) {
      float z = (float(i) - 1.0) * 0.9, on = uRampes[i];
      float bande = smoothstep(0.16 + b, 0.16 - b, abs(h.y - z)) * smoothstep(2.6 + b * 4.0, 2.4 - b * 4.0, abs(h.x));
      c += vec3(1.0, 0.97, 0.92) * 9.0 * on * bande;
    }
  }
  if (abs(r.x) > 0.05) {                                      // boîtes à lumière verticales, à 3 m de chaque côté
    vec2 h = vec2(r.z, r.y) * (3.0 / abs(r.x)) + vec2(0.0, 0.5);
    float boite = smoothstep(0.7 + b, 0.6 - b, abs(h.x)) * smoothstep(1.3 + b, 1.1 - b, abs(h.y - 1.2));
    c += vec3(0.9, 0.95, 1.0) * 3.0 * max(uRampes.y, uRampes.z) * boite * (r.x > 0.0 ? 1.0 : 0.6);
  }
  if (r.z < -0.1 && uLogo > 0.0) { vec2 h = r.xy * (4.2 / -r.z); c += vec3(1.0, 0.95, 0.95) * 2.0 * uLogo * smoothstep(1.4, 0.6, abs(h.x)) * smoothstep(0.9, 0.3, abs(h.y - 1.0)); }
  return c;
}
vec3 lumiereRecue(vec3 p, vec3 n, float ao, bool avecOmbre) {
  float haut = (uRampes.x + uRampes.y + uRampes.z) / 3.0;
  vec3 L = normalize(vec3(0.25, 1.0, 0.35));
  float so = avecOmbre && haut > 0.01 ? ombre(p + n * 0.004, L) : 1.0;
  float flaque = exp(-dot(p.xz, p.xz) / 12.0);
  vec3 c = vec3(1.0, 0.97, 0.93) * 1.7 * haut * flaque * so * max(dot(n, L), 0.0);
  c += vec3(0.85, 0.9, 1.0) * 0.32 * max(uRampes.y, uRampes.z) * abs(n.x) * flaque;
  c += vec3(0.6, 0.62, 0.7) * (0.04 + 0.32 * uAmbiance) * ao * (0.6 + 0.4 * n.y);
  // le spot du noir (plan 1) : un cône serré sur le podium, quand les rampes sont éteintes
  float spot = smoothstep(1.3, 0.5, length(p.xz - uClePos.xz - vec2(-0.3, 0.0))) * (1.0 - haut);
  c += vec3(1.0, 0.95, 0.88) * 1.4 * spot * uAmbiance * 6.0 * max(n.y, 0.0) * (avecOmbre ? ombre(p + n * 0.004, vec3(0.0, 1.0, 0.0)) : 1.0);
  // le voyant de la clé éclaire un peu autour de lui
  vec3 led = uClePos + transpose(uCleRep) * vec3(0.21, 0.05, 0.065) * ECH - p; float dl = dot(led, led);
  c += vec3(1.0, 0.1, 0.06) * uLed * 0.004 / (0.002 + dl);
  return c;
}
float ggx(vec3 n, vec3 h, float rug) { float a = rug * rug, a2 = a * a, d = max(dot(n, h), 0.0); d = d * d * (a2 - 1.0) + 1.0; return a2 / (PI * d * d + 1e-5); }
float fresnel(float c, float f0) { return f0 + (1.0 - f0) * pow(1.0 - clamp(c, 0.0, 1.0), 5.0); }

vec3 eclaire(vec3 p, vec3 n, vec3 v, float mat, bool complet, out float F) {
  vec3 alb = vec3(0.5), emis = vec3(0.0); float rug = 0.6, f0 = 0.04, vernis = 0.0, metal = 0.0; F = 0.0;
  if (mat == M_COQUE) {                                        // laque noire ; le dessus porte les pictogrammes
    vec3 q = repereCle(p), nq = uCleRep * n;
    alb = vec3(0.012, 0.012, 0.014); vernis = 1.0; rug = 0.08; f0 = 0.05;
    if (abs(q.y) < 0.012 && abs(nq.y) < 0.6) { alb = vec3(0.75); metal = 1.0; rug = 0.15; }    // le jonc chromé du pourtour
    if (nq.y > 0.5) {
      vec4 t = textureLod(uCleTex, vec2(0.5 + (q.x - 0.06) / 0.62, 0.5 + q.z / 0.3), 0.0);
      alb = mix(alb, t.rgb * t.rgb, t.a); rug = mix(rug, 0.35, t.a);
      float dl = length(q.xz - vec2(0.21, 0.065)); emis = vec3(1.0, 0.12, 0.06) * uLed * 8.0 * smoothstep(0.009, 0.004, dl);
    }
  } else if (mat == M_CHROME) { alb = vec3(0.82, 0.82, 0.84); metal = 1.0; rug = 0.12;
  } else if (mat == M_CUIR) {                                  // cuir rouge grainé, marquage à chaud
    vec3 e = repereEtiq(repereCle(p)), ne = uCleRep * n; ne.xz = rot(0.22) * ne.xz;
    float grain = bruit(e.xz * 420.0) * 0.6 + bruit(e.xz * 90.0) * 0.4;
    alb = vec3(0.42, 0.025, 0.03) * (0.82 + 0.3 * grain); rug = 0.45; vernis = 0.4; f0 = 0.04;
    if (abs(ne.y) > 0.5) { vec4 t = textureLod(uEtiqTex, vec2(0.5 + e.x / 0.34, 0.5 + e.z / 0.15 * sign(ne.y)), 0.0); alb = mix(alb, t.rgb * t.rgb, t.a); }
  } else if (mat == M_SOL) {
    float g = bruit(p.xz * 1.3) * 0.6 + bruit(p.xz * 7.0) * 0.4;
    alb = vec3(0.09, 0.09, 0.095) * (0.85 + 0.3 * g); rug = 0.25;
    F = (0.10 + 0.55 * fresnel(dot(n, v), 0.02)) * (0.8 + 0.3 * g);
    float joint = smoothstep(0.012, 0.0, abs(fract(p.x / 2.0) - 0.5) - 0.495) + smoothstep(0.012, 0.0, abs(fract(p.z / 2.0) - 0.5) - 0.495);
    alb *= 1.0 - 0.3 * clamp(joint, 0.0, 1.0);
  } else if (mat == M_MUR) {
    alb = vec3(0.08, 0.08, 0.085); rug = 0.9;
    vec2 uv = vec2(p.x / 3.4 + 0.5, (p.y - 1.75) / 1.6 + 0.5);
    if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) { vec4 t = textureLod(uMurTex, uv, 0.0); emis = t.rgb * t.rgb * t.a * 6.0 * uLogo; alb = mix(alb, vec3(0.035), t.a * 0.6); }
    float lames = smoothstep(0.02, 0.0, abs(fract(p.x * 2.4) - 0.5) - 0.47);
    alb *= 1.0 - 0.4 * lames;
  } else if (mat == M_PODIUM) {                                // résine noire, un anneau lumineux, le dessus tourne
    vec2 x = rot(uPodium.x) * p.xz; float r = length(x), a = atan(x.y, x.x);
    alb = vec3(0.022); rug = 0.25; vernis = 0.6; f0 = 0.04;
    float anneau = smoothstep(0.012, 0.0, abs(p.y - H_PODIUM + 0.03)) * step(R_PODIUM - 0.02, r);
    emis = vec3(1.0, 0.16, 0.14) * anneau * uPodium.y * 2.5;
    alb += 0.025 * smoothstep(0.004, 0.0, abs(fract(a * 36.0 / (2.0 * PI)) - 0.5) - 0.49) * step(0.8, r) * step(H_PODIUM - 0.005, p.y);
  } else if (mat == M_PANNEAU) {
    vec3 q = reperePanneau(p); vec3 nq = n; nq.xz = rot(-uPanneau.z) * nq.xz;
    alb = vec3(0.9); rug = 0.55;
    if (nq.x > 0.5) { vec2 uv = vec2(0.5 - q.z / 1.2, (q.y - 1.2) / 0.84 + 0.5); vec3 t = textureLod(uPanneauTex, uv, 0.0).rgb; alb = t * t; }
  } else if (mat == M_PIED) { alb = vec3(0.6); metal = 1.0; rug = 0.3; }

  float ao = complet ? occlusion(p, n) : 0.8;
  vec3 E = lumiereRecue(p, n, ao, complet);
  vec3 c = alb * (1.0 - metal) * E;
  vec3 L = normalize(vec3(0.25, 1.0, 0.35));
  float haut = (uRampes.x + uRampes.y + uRampes.z) / 3.0;
  c += mix(vec3(f0), alb, metal) * ggx(n, normalize(L + v), max(rug, 0.1)) * 1.4 * (haut + uAmbiance * 2.0 * (1.0 - haut)) * max(dot(n, L), 0.0);
  if (vernis > 0.0 || metal > 0.0) {
    float fr = metal > 0.5 ? 0.9 : fresnel(dot(n, v), f0) * vernis;
    vec3 tint = metal > 0.5 ? alb : vec3(1.0);
    c += tint * fr * studio(reflect(-v, n), rug * 0.5) * mix(1.0, ao, 0.6);
  }
  return c + emis;
}

vec3 reflet(vec3 ro, vec3 rd) {
  float mat; float t = marche(ro, rd, 10.0, 56, mat);
  if (t < 0.0 || mat == M_SOL) return studio(rd, 0.3);
  vec3 p = ro + rd * t, n = normale(p); float F;
  return eclaire(p, n, -rd, mat, false, F);
}

void main() {
  vec2 px = gl_FragCoord.xy + uAlea.xy, ndc = (px / uRes) * 2.0 - 1.0;
  vec3 dir = normalize(uCamZ + ndc.x * uTanFov * (uRes.x / uRes.y) * uCamX + ndc.y * uTanFov * uCamY);
  float tourne = 6.2831853 * ign(gl_FragCoord.xy + 13.0 * uPasse);
  vec2 lentille = rot(tourne) * uAlea.zw * uOuverture;
  vec3 ro = uCamPos + lentille.x * uCamX + lentille.y * uCamY, net = uCamPos + dir * (uMise / dot(dir, uCamZ)), rd = normalize(net - ro);

  float mat; float t = marche(ro, rd, 24.0, 120, mat); vec3 col;
  if (t < 0.0) col = studio(rd, 0.0) * 0.4;
  else {
    vec3 p = ro + rd * t, n = normale(p); float F;
    col = eclaire(p, n, -rd, mat, true, F);
    if (F > 0.0) {
      vec2 al = vec2(h12(gl_FragCoord.xy + 71.0 * uPasse), h12(gl_FragCoord.xy * 1.7 + 3.0 * uPasse)) - 0.5;
      vec3 rr = normalize(reflect(rd, n) + vec3(al.x, 0.0, al.y) * 0.03);
      col += F * reflet(p + n * 0.01, rr);
    }
    col = mix(col, vec3(0.006, 0.007, 0.009) * (0.3 + uAmbiance), smoothstep(10.0, 20.0, t));
  }
  sortie = vec4(max(col, 0.0) * uPoids, uPoids);
}`;

  const CLAIR = `#version 300 es
precision highp float; out vec4 sortie; uniform sampler2D uA; uniform vec2 uPas;
void main() { vec2 uv = gl_FragCoord.xy * uPas; vec3 c = texture(uA, uv).rgb; float l = max(c.r, max(c.g, c.b)); sortie = vec4(c * smoothstep(1.0, 3.0, l), 1.0); }`;
  const FLOU = `#version 300 es
precision highp float; out vec4 sortie; uniform sampler2D uA; uniform vec2 uPas, uDir;
void main() { vec2 uv = gl_FragCoord.xy * uPas; vec3 c = texture(uA, uv).rgb * 0.2270;
  c += (texture(uA, uv + uDir * 1.385).rgb + texture(uA, uv - uDir * 1.385).rgb) * 0.3162;
  c += (texture(uA, uv + uDir * 3.231).rgb + texture(uA, uv - uDir * 3.231).rgb) * 0.0703; sortie = vec4(c, 1.0); }`;
  const FINAL = `#version 300 es
precision highp float; out vec4 sortie; uniform sampler2D uA, uHalo, uHalo2; uniform vec2 uPas; uniform float uExpo, uGrain;
float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 tons(vec3 x) { const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
void main() {
  vec2 uv = gl_FragCoord.xy * uPas; vec3 c = texture(uA, uv).rgb + texture(uHalo, uv).rgb * 0.12 + texture(uHalo2, uv).rgb * 0.18;
  vec2 q = uv - 0.5; c *= 1.0 - 0.5 * dot(q, q) * 1.6;
  c = tons(c * uExpo); c = pow(c, vec3(1.0 / 2.2));
  c += (h12(gl_FragCoord.xy) - 0.5) * uGrain + (h12(gl_FragCoord.xy + 7.7) - 0.5) / 255.0;
  sortie = vec4(c, 1.0);
}`;

  const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // matrice monde → clé (colonnes, pour uniformMatrix3fv) : lacet autour de y, tangage autour de z, roulis autour de x
  function repereCle({ lacet = 0, tangage = 0, roulis = 0, tour = 0 }) {
    const R = (ax, a) => { const c = Math.cos(a), s = Math.sin(a); return ax === "y" ? [[c, 0, s], [0, 1, 0], [-s, 0, c]] : ax === "z" ? [[c, -s, 0], [s, c, 0], [0, 0, 1]] : [[1, 0, 0], [0, c, -s], [0, s, c]]; };
    const mul = (A, B) => A.map((l) => [0, 1, 2].map((j) => l[0] * B[0][j] + l[1] * B[1][j] + l[2] * B[2][j]));
    const M = mul(mul(mul(R("y", lacet), R("z", tangage)), R("x", roulis)), R("y", tour));   // clé → monde (tour : la clé tourne sur elle-même)
    return [M[0][0], M[0][1], M[0][2], M[1][0], M[1][1], M[1][2], M[2][0], M[2][1], M[2][2]];   // transposée en colonnes = inverse
  }

  function creer(canvas, { largeur, hauteur, bandes = 24 }) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 indisponible");
    if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("textures flottantes indisponibles");
    const t0 = performance.now();
    function programme(fs, nom) {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, SOMMETS], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`shader « ${nom} » : ${gl.getShaderInfoLog(s)}`);
        gl.attachShader(p, s);
      }
      gl.bindAttribLocation(p, 0, "a"); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`programme « ${nom} » : ${gl.getProgramInfoLog(p)}`);
      const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace("[0]", "")] = gl.getUniformLocation(p, info.name); }
      return { p, u };
    }
    const P = { trace: programme(TRACE, "trace"), clair: programme(CLAIR, "clair"), flou: programme(FLOU, "flou"), final: programme(FINAL, "final") };
    const compilation = performance.now() - t0;
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    function cible(w, h) {
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("tampon de rendu refusé");
      return { tex, fbo, w, h };
    }
    const L = largeur, H = hauteur, cumul = cible(L, H), a2 = cible(L >> 1, H >> 1), b2 = cible(L >> 1, H >> 1), a8 = cible(L >> 3, H >> 3), b8 = cible(L >> 3, H >> 3);
    const textures = {}, UNITES = { panneau: 0, mur: 1, cle: 2, etiquette: 3 };
    function texture(nom, source) {
      if (!(nom in UNITES)) throw new Error(`texture inconnue : ${nom}`);
      const tex = textures[nom] || (textures[nom] = gl.createTexture());
      gl.activeTexture(gl.TEXTURE0 + 7); gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }
    const vide = document.createElement("canvas"); vide.width = vide.height = 2;
    for (const nom of Object.keys(UNITES)) texture(nom, vide);
    const lier = (unite, tex) => { gl.activeTexture(gl.TEXTURE0 + unite); gl.bindTexture(gl.TEXTURE_2D, tex); };
    function passe(prog, dest, regle) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dest ? dest.fbo : null); gl.viewport(0, 0, dest ? dest.w : L, dest ? dest.h : H);
      gl.useProgram(prog.p); regle(prog.u); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    const pixel = new Uint8Array(4);
    // une image ratée par la carte graphique est d'une seule couleur ; une vraie image ne l'est jamais (elle porte du grain)
    function unie() {
      let premier = null;
      for (let k = 0; k < 9; k++) { gl.readPixels(Math.floor((L * (k + 0.5)) / 9), Math.floor((H * (((k * 4) % 9) + 0.5)) / 9), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); const v = pixel[0] + "," + pixel[1] + "," + pixel[2]; if (premier === null) premier = v; else if (v !== premier) return false; }
      return true;
    }
    function image(t, sceneDe, o = {}) { for (let essai = 0; essai < 4; essai++) { calculer(t, sceneDe, o); if (!unie()) return; console.warn(`image ${t.toFixed(3)} s refaite (essai ${essai + 1})`); } }
    function calculer(t, sceneDe, { echantillons = 6, obturateur = 1 / 60 } = {}) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, cumul.fbo); gl.viewport(0, 0, L, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      let S = null;
      for (let i = 0; i < echantillons; i++) {
        S = sceneDe(t + (halton(i + 1, 5) - 0.5) * obturateur); const c = S.cam, k = S.cle, pa = S.panneau, rep = repereCle(k);
        const z = unit(sub(c.cible, c.pos)); let x = unit(cross(z, [0, 1, 0])), y = cross(x, z);
        const ro = ((c.roulis || 0) * Math.PI) / 180, cr = Math.cos(ro), sr = Math.sin(ro);
        [x, y] = [[x[0] * cr + y[0] * sr, x[1] * cr + y[1] * sr, x[2] * cr + y[2] * sr], [y[0] * cr - x[0] * sr, y[1] * cr - x[1] * sr, y[2] * cr - x[2] * sr]];
        const r = Math.sqrt(halton(i + 1, 7)), an = 2 * Math.PI * halton(i + 1, 11);
        const regle = (u) => {
          gl.uniform2f(u.uRes, L, H); gl.uniform3fv(u.uCamPos, c.pos); gl.uniform3fv(u.uCamX, x); gl.uniform3fv(u.uCamY, y); gl.uniform3fv(u.uCamZ, z);
          gl.uniform1f(u.uTanFov, Math.tan(((c.fov || 30) * Math.PI) / 360)); gl.uniform1f(u.uOuverture, c.ouverture || 0); gl.uniform1f(u.uMise, c.mise || Math.hypot(...sub(c.cible, c.pos)));
          gl.uniform4f(u.uAlea, halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5, r * Math.cos(an), r * Math.sin(an));
          gl.uniform1f(u.uPasse, i); gl.uniform1f(u.uTemps, t); gl.uniform1f(u.uPoids, 1 / echantillons);
          gl.uniform3fv(u.uClePos, k.pos); gl.uniformMatrix3fv(u.uCleRep, false, rep); gl.uniform1f(u.uLed, k.led || 0);
          gl.uniform3fv(u.uRampes, S.rampes); gl.uniform1f(u.uAmbiance, S.ambiance ?? 0.3); gl.uniform2fv(u.uPodium, S.podium || [0, 0]);
          gl.uniform4fv(u.uPanneau, pa ? [pa.x, pa.z, pa.lacet, 1] : [0, 0, 0, 0]); gl.uniform1f(u.uLogo, S.logo || 0);
          lier(0, textures.panneau); gl.uniform1i(u.uPanneauTex, 0); lier(1, textures.mur); gl.uniform1i(u.uMurTex, 1);
          lier(2, textures.cle); gl.uniform1i(u.uCleTex, 2); lier(3, textures.etiquette); gl.uniform1i(u.uEtiqTex, 3);
        };
        // une passe est dessinée en bandes, chacune terminée avant la suivante : envoyé d'un bloc, un calcul trop long
        // est abandonné par le navigateur (et en rendu logiciel, une passe entière dépasse toujours le délai)
        gl.enable(gl.SCISSOR_TEST);
        for (let k = 0; k < bandes; k++) { const y0 = Math.floor((H * k) / bandes), y1 = Math.floor((H * (k + 1)) / bandes); gl.scissor(0, y0, L, y1 - y0); passe(P.trace, cumul, regle); gl.finish(); }
        gl.disable(gl.SCISSOR_TEST);
      }
      gl.disable(gl.BLEND);
      passe(P.clair, a2, (u) => { lier(0, cumul.tex); gl.uniform1i(u.uA, 0); gl.uniform2f(u.uPas, 1 / a2.w, 1 / a2.h); });
      const flou = (de, vers, dx, dy) => passe(P.flou, vers, (u) => { lier(0, de.tex); gl.uniform1i(u.uA, 0); gl.uniform2f(u.uPas, 1 / vers.w, 1 / vers.h); gl.uniform2f(u.uDir, dx / de.w, dy / de.h); });
      flou(a2, b2, 1, 0); flou(b2, a2, 0, 1); flou(a2, b2, 2, 0); flou(b2, a2, 0, 2);
      flou(a2, b8, 1, 0); flou(b8, a8, 0, 1); flou(a8, b8, 2, 0); flou(b8, a8, 0, 2); flou(a8, b8, 3, 0); flou(b8, a8, 0, 3);
      passe(P.final, null, (u) => {
        lier(0, cumul.tex); gl.uniform1i(u.uA, 0); lier(1, a2.tex); gl.uniform1i(u.uHalo, 1); lier(2, a8.tex); gl.uniform1i(u.uHalo2, 2);
        gl.uniform2f(u.uPas, 1 / L, 1 / H); gl.uniform1f(u.uExpo, S.exposition ?? 1); gl.uniform1f(u.uGrain, S.grain ?? 0.014);
      });
      gl.finish();
    }
    return { image, texture, infos: { compilation } };
  }
  return { creer };
})();
