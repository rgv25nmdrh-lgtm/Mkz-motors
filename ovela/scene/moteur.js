// Ovela : moteur 3D (WebGL 2), écrit pour cette vidéo.
//
// Une image = la moyenne de N sous-images. Chaque sous-image est prise à un instant décalé dans l'obturateur (flou de
// mouvement), depuis un point différent de l'objectif (flou de profondeur) et décalée d'une fraction de pixel
// (anticrénelage). Puis : halo lumineux (bloom), courbe de tons, vignette, grain, et le calque des textes en pleine
// définition. Tout est fonction pure du temps : deux rendus du même instant sont identiques.
//
// La scène (film.scene(t)) :
//   camera   { pos, cible, fov (vertical, degrés), roulis, mise (distance de mise au point), ouverture (rayon) }
//   ambiance { fond, brume, exposition, bloom, seuil, vignette, grain, laque, rugosite, flouH, brouillard }
//   spheres  [{ c, r, couleur, intensite, halo: [taille, intensité] }]   la première est le « soleil » (ciel, reflets)
//   lumieres [{ p, couleur, intensite, rayon }]                          la première porte les ombres
//   plaques  [{ c, d (demi-tailles), rot (degrés, R = Ry·Rx·Rz), rayon, biseau, tex, uv, ecran, teinte, tranche,
//               trancheGain, op, bal: [position, largeur, intensité, pente] }]   des plaques de verre arrondies
//   anneaux  [{ c: [x, z], r, l, couleur, intensite, debut, etendue }]   des traits de lumière posés sur le sol
// Couleurs en sRGB (celles de la charte), converties ici en lumière linéaire.
const Moteur = (() => {
  "use strict";
  const MAXP = 24, MAXL = 4, MAXA = 4, RAD = Math.PI / 180;
  const lin1 = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lin = (c) => [lin1(c[0]), lin1(c[1]), lin1(c[2])];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

  // R = Ry · Rx · Rz (degrés), en colonnes : R[c] est l'axe local c exprimé dans le monde.
  function rotation(rot = [0, 0, 0]) {
    const [x, y, z] = rot.map((a) => a * RAD), cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
    // lignes de Ry·Rx·Rz
    const m = [
      [cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx],
      [cx * sz, cx * cz, -sx],
      [-sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx],
    ];
    return { m, col: [m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]] };
  }
  const appliquer = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];

  function base(eye, cible, roulis = 0) {
    const f = unit(sub(cible, eye));
    let r = cross(f, [0, 1, 0]); r = Math.hypot(...r) < 1e-6 ? [1, 0, 0] : unit(r);
    const u = cross(r, f), a = roulis * RAD, ca = Math.cos(a), sa = Math.sin(a);
    return { f, r: add(sc(r, ca), sc(u, sa)), u: sub(sc(u, ca), sc(r, sa)) };
  }
  function vue(eye, b) {
    const { r, u, f } = b;
    return new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, eye), -dot(u, eye), dot(f, eye), 1]);
  }
  function perspective(fov, asp, n, fa, jx = 0, jy = 0) {
    const t = 1 / Math.tan((fov * RAD) / 2);
    return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, jx, jy, (fa + n) / (n - fa), -1, 0, 0, (2 * fa * n) / (n - fa), 0]);
  }
  function mul4(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
    return o;
  }

  // ---------------------------------------------------------------- les shaders
  const ENTETE = `#version 300 es
precision highp float; precision highp int;
`;
  const CIEL = `
uniform vec3 uFond, uSolP, uSolC; uniform float uBrume;
vec3 ciel(vec3 o, vec3 d) {
  vec3 s = normalize(uSolP - o); float c = max(dot(d, s), 0.);
  vec3 col = uFond * (0.55 + 0.45 * clamp(1. - d.y * 1.4, 0., 1.));
  return col + uSolC * uBrume * (0.6 * pow(c, 600.) + 0.12 * pow(c, 60.) + 0.008 * pow(c, 6.));
}`;
  const LUMIERES = `
uniform int uNL; uniform vec4 uLP[${MAXL}]; uniform vec3 uLC[${MAXL}];
float attenuation(float d, float r) { return 1. / (1. + d * d / (r * r)); }`;

  const V_PLAQUE = ENTETE + `
in vec3 aP; uniform mat4 uVP; uniform vec3 uC, uD; uniform mat3 uR; uniform float uMiroir;
out vec3 vW;
void main() {
  vec3 w = uR * (aP * (uD + vec3(0.002))) + uC;
  w.y *= uMiroir; vW = w; gl_Position = uVP * vec4(w, 1.);
}`;
  const F_PLAQUE = ENTETE + CIEL + LUMIERES + `
uniform mat4 uVP; uniform vec3 uCam, uC, uD; uniform mat3 uR; uniform float uMiroir, uRay, uBis;
uniform sampler2D uTex; uniform vec4 uUV; uniform float uAvecTex, uEcran, uOp, uBrouillard;
uniform vec3 uTeinte, uTranche; uniform float uTrancheGain; uniform vec4 uBal;
in vec3 vW;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
float sdP(vec3 p) {
  vec2 q = abs(p.xy) - (uD.xy - vec2(uRay));
  float d2 = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - uRay;
  vec2 w = vec2(d2 + uBis, abs(p.z) - uD.z + uBis);
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - uBis;
}
vec3 nP(vec3 p) {
  const vec2 k = vec2(1., -1.); float h = 1.5e-4;
  return normalize(k.xyy * sdP(p + k.xyy * h) + k.yyx * sdP(p + k.yyx * h) + k.yxy * sdP(p + k.yxy * h) + k.xxx * sdP(p + k.xxx * h));
}
void main() {
  vec3 S = vec3(1., uMiroir, 1.);
  vec3 ro = uCam * S, rd = normalize(vW - uCam) * S;
  mat3 Rt = transpose(uR);
  vec3 lo = Rt * (ro - uC), ld = Rt * rd + vec3(1e-7);
  vec3 inv = 1. / ld, t0 = (-uD - lo) * inv, t1 = (uD - lo) * inv, mn = min(t0, t1), mx = max(t0, t1);
  float ta = max(max(mn.x, mn.y), mn.z), tb = min(min(mx.x, mx.y), mx.z);
  if (tb < max(ta, 0.)) discard;
  float t = max(ta, 0.); bool touche = false;
  for (int i = 0; i < 48; i++) { float h = sdP(lo + ld * t); if (h < 1e-4) { touche = true; break; } t += h; if (t > tb) break; }
  if (!touche) discard;
  vec3 pl = lo + ld * t, nl = nP(pl);
  vec3 P = uR * pl + uC, N = normalize(uR * nl), V = -rd;
  float plat = smoothstep(0.975, 0.997, abs(nl.z));
  vec3 dif = vec3(0.), spe = vec3(0.);
  for (int i = 0; i < ${MAXL}; i++) {
    if (i >= uNL) break;
    vec3 L = uLP[i].xyz - P; float dd = length(L); L /= dd;
    float att = attenuation(dd, uLP[i].w);
    dif += uLC[i] * att * max(dot(N, L), 0.);
    vec3 H = normalize(L + V); float nh = max(dot(N, H), 0.);
    spe += uLC[i] * att * (pow(nh, 220.) * 1.2 + pow(nh, 26.) * 0.05);
  }
  float nv = max(dot(N, V), 0.), fres = 0.04 + 0.96 * pow(1. - nv, 5.);
  vec3 env = ciel(P, reflect(-V, N));
  vec3 col = uTeinte * (0.35 + dif);
  if (uAvecTex > 0.5 && nl.z > 0.) {
    vec2 uv = vec2(pl.x / uD.x * 0.5 + 0.5, 0.5 - pl.y / uD.y * 0.5);
    vec4 tx = texture(uTex, mix(uUV.xy, uUV.zw, uv)) * plat;
    col = col * (1. - tx.a) + tx.rgb * uEcran;
  }
  col += env * fres * 0.9 + spe * mix(1., 0.35, plat);
  float bord = 1. - plat;
  col += bord * (uTranche * uTrancheGain * (0.45 + 0.55 * pow(1. - nv, 1.5)) + env * 0.5 + spe * 1.5);
  if (uBal.z > 0.) {
    float u = pl.x / uD.x * cos(uBal.w) + pl.y / uD.y * sin(uBal.w);
    float b = exp(-pow((u - uBal.x) / uBal.y, 2.));
    col += uBal.z * b * vec3(1., 0.92, 0.84) * (0.12 + 0.88 * (0.25 + 0.75 * plat) * (0.3 + fres));
  }
  float dist = length(P - ro);
  col = mix(ciel(ro, rd), col, exp(-dist * uBrouillard));
  o0 = vec4(col * uOp, uOp);
  o1 = vec4(P.y * uOp, 0., 0., uOp);
  vec4 cl = uVP * vec4(P * S, 1.);
  gl_FragDepth = clamp(cl.z / cl.w * 0.5 + 0.5, 0., 1.);
}`;

  const V_SOL = ENTETE + `
in vec3 aP; uniform mat4 uVP; out vec3 vW;
void main() { vW = vec3(aP.x * 60., 0., aP.z * 60.); gl_Position = uVP * vec4(vW, 1.); }`;
  const F_SOL = ENTETE + CIEL + LUMIERES + `
uniform vec3 uCam; uniform vec2 uRes; uniform sampler2D uRefl, uReflH;
uniform float uLaque, uRug, uFlouH, uBrouillard, uAlbedo, uDbg;
uniform int uNP; uniform vec4 uPC[${MAXP}], uPD[${MAXP}]; uniform mat3 uPR[${MAXP}];
uniform vec4 uOQ[${MAXP * 2}]; uniform float uOW[${MAXP}];
uniform int uNA; uniform vec4 uA0[${MAXA}], uA1[${MAXA}]; uniform vec3 uAC[${MAXA}];
in vec3 vW; layout(location = 0) out vec4 o; layout(location = 1) out vec4 o1;
float sdP(vec3 p, vec3 d, float r, float e) {
  vec2 q = abs(p.xy) - (d.xy - vec2(r));
  float d2 = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r;
  vec2 w = vec2(d2 + e, abs(p.z) - d.z + e);
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - e;
}
float sdQuad(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {   // polygone convexe ou non (méthode du nombre d'enroulement)
  vec2 v[4] = vec2[4](a, b, c, d); float dd = dot(p - v[0], p - v[0]); float s = 1.;
  for (int i = 0, j = 3; i < 4; j = i, i++) {
    vec2 e = v[j] - v[i], w = p - v[i], bb = w - e * clamp(dot(w, e) / dot(e, e), 0., 1.);
    dd = min(dd, dot(bb, bb));
    bvec3 cnd = bvec3(p.y >= v[i].y, p.y < v[j].y, e.x * w.y > e.y * w.x);
    if (all(cnd) || all(not(cnd))) s *= -1.;
  }
  return s * sqrt(dd);
}
void main() {
  o1 = vec4(0.);
  vec3 P = vW, V = normalize(uCam - P); float nv = max(V.y, 0.);
  // occlusion de contact et ombres portées par la lumière principale
  float ao = 1., omb = 1.;
  for (int i = 0; i < ${MAXP}; i++) {
    if (i >= uNP) break;
    vec3 q = transpose(uPR[i]) * (P - uPC[i].xyz);
    float h = sdP(q, uPD[i].xyz, uPC[i].w, uPD[i].w);
    ao *= 1. - 0.72 * exp(-max(h, 0.) / 0.07) - 0.25 * exp(-max(h, 0.) / 0.35);
    float w = uOW[i];
    if (w > 0.) { float s = sdQuad(P.xz, uOQ[2 * i].xy, uOQ[2 * i].zw, uOQ[2 * i + 1].xy, uOQ[2 * i + 1].zw); omb *= mix(0.08, 1., smoothstep(-w, w, s)); }
  }
  vec3 dif = vec3(0.);
  for (int i = 0; i < ${MAXL}; i++) {
    if (i >= uNL) break;
    vec3 L = uLP[i].xyz - P; float dd = length(L); L /= dd;
    dif += uLC[i] * attenuation(dd, uLP[i].w) * max(L.y, 0.) * (i == 0 ? omb : 1.);
  }
  vec2 suv = gl_FragCoord.xy / uRes;
  float hgt = textureLod(uReflH, suv, 1.5).r;
  float lod = clamp(uRug * 5. + log2(1. + max(hgt, 0.) * uFlouH), 0., 7.);
  vec3 refl = textureLod(uRefl, suv, lod).rgb;
  float F = mix(0.05, 1., pow(1. - nv, 5.));
  if (uDbg > 0.5) { o = vec4(uDbg > 1.5 ? vec3(hgt * 0.1) : refl * 3., 1.); return; }
  vec3 col = uAlbedo * (vec3(0.25) * uFond * 8. + dif) * ao + refl * F * uLaque * mix(0.55, 1., ao);
  for (int i = 0; i < ${MAXA}; i++) {
    if (i >= uNA) break;
    vec2 d = P.xz - uA0[i].xy; float r = length(d);
    float a = atan(d.y, d.x), deb = uA1[i].x, et = uA1[i].y;
    float rel = mod(a - deb, 6.2831853);
    float m = et >= 6.28 ? 1. : smoothstep(0., 0.25, rel) * (1. - smoothstep(et - 0.25, et, rel)) * step(rel, et);
    float x = (r - uA0[i].z) / uA0[i].w;
    col += uAC[i] * uA1[i].z * m * (exp(-x * x) + 0.18 * exp(-x * x / 36.));
  }
  float dist = length(P - uCam);
  col = mix(ciel(uCam, -V), col, exp(-dist * uBrouillard));
  o = vec4(col, 1.);
}`;

  const V_ECRAN = ENTETE + `
out vec2 vU; void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vU = p; gl_Position = vec4(p * 2. - 1., 1., 1.); }`;
  const F_FOND = ENTETE + CIEL + `
uniform vec3 uCam, uCR, uCU, uCF; uniform vec2 uTan; in vec2 vU;
layout(location = 0) out vec4 o0; layout(location = 1) out vec4 o1;
void main() { vec2 n = vU * 2. - 1.; vec3 d = normalize(uCF + uCR * n.x * uTan.x + uCU * n.y * uTan.y); o0 = vec4(ciel(uCam, d), 1.); o1 = vec4(60., 0., 0., 1.); }`;

  const V_SPHERE = ENTETE + `
in vec3 aP; uniform mat4 uVP; uniform vec3 uSC, uCR, uCU; uniform float uSR, uMiroir; out vec2 vQ;
void main() { vQ = aP.xy; vec3 c = uSC * vec3(1., uMiroir, 1.); gl_Position = uVP * vec4(c + (uCR * aP.x + uCU * aP.y) * uSR, 1.); }`;
  const F_SPHERE = ENTETE + `
uniform vec3 uSCol; uniform int uType; in vec2 vQ;
layout(location = 0) out vec4 o0; layout(location = 1) out vec4 o1;
void main() {
  float r = length(vQ), a;
  if (uType == 0) a = (1. - smoothstep(0.86, 1., r)) * (0.85 + 0.15 * sqrt(max(1. - r * r, 0.)));
  else a = exp(-r * r * 6.) * (1. - smoothstep(0.75, 1., r));
  o0 = vec4(uSCol * a, 0.); o1 = vec4(0.);
}`;

  const F_COPIE = ENTETE + `uniform sampler2D uS; uniform float uK; in vec2 vU; out vec4 o; void main() { o = vec4(texture(uS, vU).rgb * uK, 1.); }`;
  const F_SEUIL = ENTETE + `
uniform sampler2D uS; uniform vec2 uTx; uniform float uSeuil; in vec2 vU; out vec4 o;
void main() {
  vec3 c = (texture(uS, vU + uTx * vec2(-1, -1)).rgb + texture(uS, vU + uTx * vec2(1, -1)).rgb + texture(uS, vU + uTx * vec2(-1, 1)).rgb + texture(uS, vU + uTx * vec2(1, 1)).rgb) * 0.25;
  float l = max(c.r, max(c.g, c.b));
  o = vec4(c * (max(l - uSeuil, 0.) / max(l, 1e-4)), 1.);
}`;
  const F_BAS = ENTETE + `
uniform sampler2D uS; uniform vec2 uTx; in vec2 vU; out vec4 o;
void main() { vec3 c = texture(uS, vU).rgb * 4.; c += texture(uS, vU - uTx).rgb + texture(uS, vU + uTx).rgb + texture(uS, vU + vec2(uTx.x, -uTx.y)).rgb + texture(uS, vU - vec2(uTx.x, -uTx.y)).rgb; o = vec4(c / 8., 1.); }`;
  const F_HAUT = ENTETE + `
uniform sampler2D uS, uB; uniform vec2 uTx; in vec2 vU; out vec4 o;
void main() {
  vec3 c = texture(uS, vU + vec2(-uTx.x * 2., 0.)).rgb + texture(uS, vU + vec2(uTx.x * 2., 0.)).rgb + texture(uS, vU + vec2(0., -uTx.y * 2.)).rgb + texture(uS, vU + vec2(0., uTx.y * 2.)).rgb;
  c += (texture(uS, vU + uTx).rgb + texture(uS, vU - uTx).rgb + texture(uS, vU + vec2(uTx.x, -uTx.y)).rgb + texture(uS, vU - vec2(uTx.x, -uTx.y)).rgb) * 2.;
  o = vec4(c / 12. + texture(uB, vU).rgb, 1.);
}`;
  const F_FINAL = ENTETE + `
uniform sampler2D uS, uB, uCal; uniform float uExpo, uBloom, uVig, uGrain, uGraine; uniform vec2 uRes; in vec2 vU; out vec4 o;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0., 1.); }
float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  vec3 c = (texture(uS, vU).rgb + texture(uB, vU).rgb * uBloom) * uExpo;
  c = aces(c);
  c = mix(12.92 * c, 1.055 * pow(c, vec3(1. / 2.4)) - 0.055, step(0.0031308, c));
  vec2 q = vU - 0.5; c *= 1. - uVig * smoothstep(0.2, 0.95, length(q * vec2(1., 0.8)) * 1.35);
  vec2 px = vU * uRes;
  c += (h12(px + uGraine * 17.) - 0.5) * uGrain + (h12(px * 1.7 + 3.1) - 0.5) / 255.;
  vec4 k = texture(uCal, vec2(vU.x, 1. - vU.y));
  o = vec4(k.rgb + c * (1. - k.a), 1.);
}`;

  // ---------------------------------------------------------------- création
  function creer(canvas, { largeur, hauteur, definition = 1 }) {
    canvas.width = largeur; canvas.height = hauteur;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL 2 indisponible");
    if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("EXT_color_buffer_float indisponible");
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    const IW = Math.round(largeur * definition), IH = Math.round(hauteur * definition), RW = Math.round(IW / 2), RH = Math.round(IH / 2);

    function prog(vs, fs) {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + "\n" + src.split("\n").map((l, i) => i + 1 + ": " + l).join("\n"));
        gl.attachShader(p, s);
      }
      gl.bindAttribLocation(p, 0, "aP"); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i), nom = info.name.replace(/\[0\]$/, ""); u[nom] = gl.getUniformLocation(p, info.name); }
      return { p, u };
    }
    const P = {
      plaque: prog(V_PLAQUE, F_PLAQUE), sol: prog(V_SOL, F_SOL), fond: prog(V_ECRAN, F_FOND), sphere: prog(V_SPHERE, F_SPHERE),
      copie: prog(V_ECRAN, F_COPIE), seuil: prog(V_ECRAN, F_SEUIL), bas: prog(V_ECRAN, F_BAS), haut: prog(V_ECRAN, F_HAUT), final: prog(V_ECRAN, F_FINAL),
    };
    // géométries
    function vao(data) { const a = gl.createVertexArray(); gl.bindVertexArray(a); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); return { a, n: data.length / 3 }; }
    const cubeData = [];
    const F6 = [[[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]], [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]];
    for (const q of F6) for (const i of [0, 1, 2, 0, 2, 3]) cubeData.push(...q[i]);
    const CUBE = vao(cubeData), SOL = vao([-1, 0, -1, -1, 0, 1, 1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0, -1]), QUAD = vao([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]);
    const VIDE = gl.createVertexArray();

    // cibles de rendu
    function tex(w, h, interne = gl.RGBA16F, mip = false) {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      const niv = mip ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1;
      gl.texStorage2D(gl.TEXTURE_2D, niv, interne, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    function cible(w, h, textures, profondeur) {
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      textures.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
      if (profondeur) { const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); }
      gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER); if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error("cible incomplète " + st);
      return { f, w, h, t: textures };
    }
    const tRefl = tex(RW, RH, gl.RGBA16F, true), tReflH = tex(RW, RH, gl.RGBA16F, true);
    const REFL = cible(RW, RH, [tRefl, tReflH], true);
    const SCENE = cible(IW, IH, [tex(IW, IH), tex(IW, IH)], true);
    const ACC = cible(IW, IH, [tex(IW, IH)], false);
    const BLOOM = [];
    { let w = IW, h = IH; for (let i = 0; i < 7; i++) { w = Math.max(1, Math.round(w / 2)); h = Math.max(1, Math.round(h / 2)); BLOOM.push({ bas: cible(w, h, [tex(w, h)], false), haut: cible(w, h, [tex(w, h)], false) }); } }

    // textures des écrans : un canevas 2D par dessin, repeint quand ses paramètres changent
    const ECRANS = {};
    function texture(nom, l, h, dessiner) {
      const c = document.createElement("canvas"); c.width = l; c.height = h;
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, Math.floor(Math.log2(Math.max(l, h))) + 1, gl.SRGB8_ALPHA8, l, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      ECRANS[nom] = { c, ctx: c.getContext("2d"), t, l, h, dessiner, sig: null };
    }
    function peindre(nom, p = {}) {
      const E = ECRANS[nom]; if (!E) throw new Error("écran inconnu : " + nom);
      const sig = JSON.stringify(p); if (sig === E.sig) return; E.sig = sig;
      const { ctx } = E; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, E.l, E.h); ctx.save(); E.dessiner(ctx, p); ctx.restore();
      gl.bindTexture(gl.TEXTURE_2D, E.t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, E.c); gl.generateMipmap(gl.TEXTURE_2D);
    }
    // le calque des textes, en pleine définition
    const cal = document.createElement("canvas"); cal.width = largeur; cal.height = hauteur;
    const calCtx = cal.getContext("2d"), tCal = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tCal); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, largeur, hauteur);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    function ecran(w, h) { gl.bindVertexArray(VIDE); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    function lier(p, nom, unite, t) { gl.activeTexture(gl.TEXTURE0 + unite); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(p.u[nom], unite); }

    // ---------------------------------------------------------------- une sous-image
    function sousImage(S, s, N, ech) {
      const cam = S.camera, A = S.ambiance;
      // objectif : un point du disque de l'ouverture (suite de Halton), visée sur le plan de mise au point
      const b0 = base(cam.pos, cam.cible, cam.roulis || 0);
      const mise = cam.mise ?? Math.hypot(...sub(cam.cible, cam.pos));
      const rr = Math.sqrt(halton(s + 1, 2)) * (cam.ouverture ?? 0), th = 2 * Math.PI * halton(s + 1, 3);
      const eye = add(cam.pos, add(sc(b0.r, rr * Math.cos(th)), sc(b0.u, rr * Math.sin(th))));
      const foc = add(cam.pos, sc(b0.f, mise));
      const b = base(eye, foc, cam.roulis || 0);
      const V = vue(eye, b);
      const jx = ((halton(s + 1, 5) - 0.5) * 2) / IW, jy = ((halton(s + 1, 7) - 0.5) * 2) / IH;
      const asp = largeur / hauteur, fov = cam.fov ?? 40;
      const PR = perspective(fov, asp, 0.05, 200, N > 1 ? jx : 0, N > 1 ? jy : 0);
      const VP = mul4(PR, V);
      const PRr = perspective(fov, asp, 0.05, 200, N > 1 ? jx * 2 : 0, N > 1 ? jy * 2 : 0), VPr = mul4(PRr, V);
      const tanY = Math.tan((fov * RAD) / 2), tanX = tanY * asp;
      const sol = S.spheres?.[0], solP = sol ? sol.c : [0, 5, -20], solC = sol ? lin(sol.couleur) : [0, 0, 0];
      const lums = (S.lumieres || []).slice(0, MAXL);
      const LP = new Float32Array(MAXL * 4), LC = new Float32Array(MAXL * 3);
      lums.forEach((l, i) => { LP.set([...l.p, l.rayon ?? 3], i * 4); LC.set(sc(lin(l.couleur), l.intensite), i * 3); });
      const fond = lin(A.fond || [0.02, 0.02, 0.025]);
      const communs = (p) => {
        gl.uniform3fv(p.u.uFond, fond); gl.uniform3fv(p.u.uSolP, solP); gl.uniform3fv(p.u.uSolC, solC); gl.uniform1f(p.u.uBrume, A.brume ?? 1);
        if (p.u.uNL) { gl.uniform1i(p.u.uNL, lums.length); gl.uniform4fv(p.u.uLP, LP); gl.uniform3fv(p.u.uLC, LC); }
      };
      const plaques = (S.plaques || []).filter((q) => (q.op ?? 1) > 0.002);
      if (plaques.length > MAXP) throw new Error("trop de plaques : " + plaques.length);
      const prep = plaques.map((q) => ({ q, R: rotation(q.rot), op: q.op ?? 1, dist: Math.hypot(...sub(q.c, eye)) }));
      const opaques = prep.filter((x) => x.op >= 0.999), transl = prep.filter((x) => x.op < 0.999).sort((a, b) => b.dist - a.dist);

      function dessinerPlaques(VPm, miroir) {
        const p = P.plaque; gl.useProgram(p.p); communs(p);
        gl.uniformMatrix4fv(p.u.uVP, false, VPm); gl.uniform3fv(p.u.uCam, eye); gl.uniform1f(p.u.uMiroir, miroir); gl.uniform1f(p.u.uBrouillard, A.brouillard ?? 0.02);
        gl.bindVertexArray(CUBE.a);
        const un = (x) => {
          const q = x.q, ray = Math.min(q.rayon ?? 0.03, q.d[0] * 0.999, q.d[1] * 0.999), bis = Math.min(q.biseau ?? 0.006, q.d[2] * 0.95, ray * 0.999);
          gl.uniform3fv(p.u.uC, q.c); gl.uniform3fv(p.u.uD, q.d); gl.uniformMatrix3fv(p.u.uR, false, x.R.col);
          gl.uniform1f(p.u.uRay, ray); gl.uniform1f(p.u.uBis, bis);
          const E = q.tex ? ECRANS[q.tex] : null;
          gl.uniform1f(p.u.uAvecTex, E ? 1 : 0); if (E) { lier(p, "uTex", 0, E.t); gl.uniform4fv(p.u.uUV, q.uv || [0, 0, 1, 1]); }
          gl.uniform1f(p.u.uEcran, q.ecran ?? 1); gl.uniform1f(p.u.uOp, x.op);
          gl.uniform3fv(p.u.uTeinte, lin(q.teinte || [0.05, 0.05, 0.06])); gl.uniform3fv(p.u.uTranche, lin(q.tranche || [1, 1, 1])); gl.uniform1f(p.u.uTrancheGain, q.trancheGain ?? 0.25);
          gl.uniform4fv(p.u.uBal, q.bal || [0, 1, 0, 0]);
          gl.drawArrays(gl.TRIANGLES, 0, CUBE.n);
        };
        gl.enable(gl.CULL_FACE); gl.cullFace(miroir > 0 ? gl.BACK : gl.FRONT);
        gl.disable(gl.BLEND); gl.depthMask(true); opaques.forEach(un);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); transl.forEach(un);
        gl.disable(gl.CULL_FACE);
      }
      function dessinerSpheres(VPm, miroir) {
        const p = P.sphere; gl.useProgram(p.p);
        gl.uniformMatrix4fv(p.u.uVP, false, VPm); gl.uniform3fv(p.u.uCR, b.r); gl.uniform3fv(p.u.uCU, b.u); gl.uniform1f(p.u.uMiroir, miroir);
        gl.bindVertexArray(QUAD.a); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        for (const sp of S.spheres || []) {
          const coul = lin(sp.couleur);
          if (sp.halo) { gl.uniform1i(p.u.uType, 1); gl.uniform3fv(p.u.uSC, sp.c); gl.uniform1f(p.u.uSR, sp.r * sp.halo[0]); gl.uniform3fv(p.u.uSCol, sc(coul, sp.halo[1])); gl.drawArrays(gl.TRIANGLES, 0, QUAD.n); }
          gl.uniform1i(p.u.uType, 0); gl.uniform3fv(p.u.uSC, sp.c); gl.uniform1f(p.u.uSR, sp.r); gl.uniform3fv(p.u.uSCol, sc(coul, sp.intensite)); gl.drawArrays(gl.TRIANGLES, 0, QUAD.n);
        }
        gl.depthMask(true); gl.disable(gl.BLEND);
      }
      function dessinerFond(miroir) {
        const p = P.fond; gl.useProgram(p.p); communs(p);
        const sgn = [1, miroir, 1];
        gl.uniform3fv(p.u.uCam, eye.map((v, i) => v * sgn[i])); gl.uniform3fv(p.u.uCR, b.r.map((v, i) => v * sgn[i])); gl.uniform3fv(p.u.uCU, b.u.map((v, i) => v * sgn[i])); gl.uniform3fv(p.u.uCF, b.f.map((v, i) => v * sgn[i]));
        gl.uniform2f(p.u.uTan, tanX, tanY);
        gl.depthMask(false); gl.disable(gl.DEPTH_TEST); ecran(); gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
      }

      // 1 · le reflet dans le sol (scène vue en miroir), en demi-définition
      gl.bindFramebuffer(gl.FRAMEBUFFER, REFL.f); gl.viewport(0, 0, RW, RH);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
      dessinerFond(-1);
      dessinerPlaques(VPr, -1); dessinerSpheres(VPr, -1);
      gl.bindTexture(gl.TEXTURE_2D, tRefl); gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindTexture(gl.TEXTURE_2D, tReflH); gl.generateMipmap(gl.TEXTURE_2D);

      // 2 · la scène
      gl.bindFramebuffer(gl.FRAMEBUFFER, SCENE.f); gl.viewport(0, 0, IW, IH); gl.clear(gl.DEPTH_BUFFER_BIT);
      dessinerFond(1);
      {
        const p = P.sol; gl.useProgram(p.p); communs(p);
        gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform3fv(p.u.uCam, eye); gl.uniform2f(p.u.uRes, IW, IH);
        lier(p, "uRefl", 0, tRefl); lier(p, "uReflH", 1, tReflH);
        gl.uniform1f(p.u.uLaque, A.laque ?? 0.9); gl.uniform1f(p.u.uRug, A.rugosite ?? 0.15); gl.uniform1f(p.u.uFlouH, A.flouH ?? 40); gl.uniform1f(p.u.uBrouillard, A.brouillard ?? 0.02); gl.uniform1f(p.u.uAlbedo, A.albedo ?? 0.05); gl.uniform1f(p.u.uDbg, globalThis.DBG || 0);
        const PC = new Float32Array(MAXP * 4), PD = new Float32Array(MAXP * 4), PRm = new Float32Array(MAXP * 9), OQ = new Float32Array(MAXP * 8), OW = new Float32Array(MAXP);
        const L0 = lums[0];
        prep.forEach((x, i) => {
          const q = x.q, ray = Math.min(q.rayon ?? 0.03, q.d[0], q.d[1]), k = x.op;
          PC.set([...q.c, ray], i * 4); PD.set([q.d[0] * k, q.d[1] * k, q.d[2], Math.min(q.biseau ?? 0.006, q.d[2] * 0.95)], i * 4); PRm.set(x.R.col, i * 9);
          if (L0 && q.ombre !== false) {
            const coins = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => add(q.c, appliquer(x.R.m, [u * q.d[0], v * q.d[1], 0])));
            if (coins.every((cn) => cn[1] < L0.p[1] - 0.05)) {
              const pr = coins.map((cn) => { const k2 = L0.p[1] / (L0.p[1] - cn[1]); return [L0.p[0] + (cn[0] - L0.p[0]) * k2, L0.p[2] + (cn[2] - L0.p[2]) * k2]; });
              OQ.set([...pr[0], ...pr[1], ...pr[2], ...pr[3]], i * 8);
              const hm = coins.reduce((s2, cn) => s2 + cn[1], 0) / 4;
              OW[i] = (0.02 + ((L0.taille ?? 0.4) * hm) / Math.max(0.1, L0.p[1] - hm)) * (k >= 0.999 ? 1 : 0);
            }
          }
        });
        gl.uniform1i(p.u.uNP, prep.length); gl.uniform4fv(p.u.uPC, PC); gl.uniform4fv(p.u.uPD, PD); gl.uniformMatrix3fv(p.u.uPR, false, PRm);
        gl.uniform4fv(p.u.uOQ, OQ); gl.uniform1fv(p.u.uOW, OW);
        const an = (S.anneaux || []).slice(0, MAXA), A0 = new Float32Array(MAXA * 4), A1 = new Float32Array(MAXA * 4), AC = new Float32Array(MAXA * 3);
        an.forEach((a, i) => { A0.set([a.c[0], a.c[1], a.r, a.l ?? 0.02], i * 4); A1.set([a.debut ?? 0, a.etendue ?? 7, a.intensite ?? 1, 0], i * 4); AC.set(lin(a.couleur), i * 3); });
        gl.uniform1i(p.u.uNA, an.length); gl.uniform4fv(p.u.uA0, A0); gl.uniform4fv(p.u.uA1, A1); gl.uniform3fv(p.u.uAC, AC);
        gl.bindVertexArray(SOL.a); gl.drawArrays(gl.TRIANGLES, 0, SOL.n);
      }
      dessinerPlaques(VP, 1); dessinerSpheres(VP, 1);

      // 3 · accumulation
      gl.bindFramebuffer(gl.FRAMEBUFFER, ACC.f); gl.viewport(0, 0, IW, IH); gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(P.copie.p); lier(P.copie, "uS", 0, SCENE.t[0]); gl.uniform1f(P.copie.u.uK, 1 / N); ecran();
      gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST);
    }

    // ---------------------------------------------------------------- une image
    function image(t, film, o = {}) {
      const N = o.echantillons ?? 8, obt = o.obturateur ?? 1 / 120;
      for (const e of film.textures(t)) peindre(e.nom, e.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, ACC.f); gl.viewport(0, 0, IW, IH); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      let A = null;
      for (let s = 0; s < N; s++) {
        const ts = t + (N > 1 ? obt * ((s + 0.5) / N - 0.5) : 0);
        const S = film.scene(ts); if (s === 0 || Math.abs(ts - t) < 1e-9) A = S.ambiance;
        sousImage(S, s, N);
      }
      A = film.scene(t).ambiance;
      // halo lumineux
      gl.disable(gl.DEPTH_TEST);
      let src = ACC.t[0], w = IW, h = IH;
      BLOOM.forEach((B, i) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, B.bas.f); gl.viewport(0, 0, B.bas.w, B.bas.h);
        const p = i === 0 ? P.seuil : P.bas; gl.useProgram(p.p); lier(p, "uS", 0, src); gl.uniform2f(p.u.uTx, 0.5 / w, 0.5 / h);
        if (i === 0) gl.uniform1f(p.u.uSeuil, A.seuil ?? 1.0);
        ecran(); src = B.bas.t[0]; w = B.bas.w; h = B.bas.h;
      });
      let haut = BLOOM[BLOOM.length - 1].bas.t[0];
      for (let i = BLOOM.length - 2; i >= 0; i--) {
        const B = BLOOM[i], Bn = BLOOM[i + 1]; gl.bindFramebuffer(gl.FRAMEBUFFER, B.haut.f); gl.viewport(0, 0, B.haut.w, B.haut.h);
        gl.useProgram(P.haut.p); lier(P.haut, "uS", 0, haut); lier(P.haut, "uB", 1, B.bas.t[0]); gl.uniform2f(P.haut.u.uTx, 0.5 / Bn.bas.w, 0.5 / Bn.bas.h); ecran();
        haut = B.haut.t[0];
      }
      // calque des textes
      calCtx.setTransform(1, 0, 0, 1, 0, 0); calCtx.clearRect(0, 0, largeur, hauteur);
      if (film.calque) { calCtx.save(); film.calque(calCtx, t, largeur, hauteur); calCtx.restore(); }
      gl.bindTexture(gl.TEXTURE_2D, tCal); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, cal);
      // image finale
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, largeur, hauteur);
      const p = P.final; gl.useProgram(p.p); lier(p, "uS", 0, ACC.t[0]); lier(p, "uB", 1, haut); lier(p, "uCal", 2, tCal);
      gl.uniform1f(p.u.uExpo, A.exposition ?? 1); gl.uniform1f(p.u.uBloom, A.bloom ?? 0.6); gl.uniform1f(p.u.uVig, A.vignette ?? 0.3); gl.uniform1f(p.u.uGrain, A.grain ?? 0.02);
      gl.uniform1f(p.u.uGraine, o.numero ?? Math.round(t * 60)); gl.uniform2f(p.u.uRes, largeur, hauteur);
      ecran(); gl.enable(gl.DEPTH_TEST);
    }
    function attendre() { const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
    // projette un point du monde à l'écran (pixels du calque), pour placer un texte à côté d'un objet
    function projeter(cam, p) {
      const b = base(cam.pos, cam.cible, cam.roulis || 0), d = sub(p, cam.pos);
      const z = dot(d, b.f), ty = Math.tan(((cam.fov ?? 40) * RAD) / 2), tx = ty * (largeur / hauteur);
      return { x: (0.5 + dot(d, b.r) / (z * tx) / 2) * largeur, y: (0.5 - dot(d, b.u) / (z * ty) / 2) * hauteur, z };
    }
    return { gl, texture, peindre, image, attendre, projeter, IW, IH };
  }
  return { creer, rotation, appliquer };
})();
