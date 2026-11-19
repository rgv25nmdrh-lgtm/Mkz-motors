// Moteur de rendu de la vidéo « MKZ Motors · location » : un bureau en noyer, en fin de journée, avec de vrais objets.
// Écrit à partir du moteur de la boîte à outils 3D de Mavena (même principe, mêmes passes de finition), avec une scène
// neuve : un téléphone posé à plat (cadre en métal, verre, écran qui s'allume et éclaire le bureau), une clé de voiture
// (coque laquée, touches, lame en métal, anneau, étiquette en cuir), un calendrier de bureau à feuillets (un feuillet
// bascule par-dessus les anneaux), le plateau en noyer verni qui reflète ce qui est posé dessus, un mur, et le soleil
// qui entre par une fenêtre à stores vénitiens (les lames dessinent des bandes de lumière qui glissent avec l'heure).
// Un seul shader (WebGL2) lance un rayon par pixel dans une scène décrite par des distances. Chaque image cumule N
// passes décalées dans le pixel (anticrénelage), dans l'objectif (flou de profondeur) et dans le temps (flou de
// mouvement). Une dernière passe ajoute le halo des hautes lumières, la courbe de tons, le vignettage, le grain, et pose
// le calque des titres. Tout est une fonction pure des paramètres : deux rendus du même instant sont identiques.
//
//   const M = MoteurSDF.creer(canvas, { largeur: 1080, hauteur: 1920, definition: 1 });
//   M.texture("ecran" | "stores" | "etiquette" | "calendrier" | "calque", canevas2D);
//   M.image(t, sceneDe, { echantillons: 8, obturateur: 1 / 120 });
// La description d'une scène est donnée dans scene/film.js (fonction scene()).
const MoteurSDF = (() => {
  "use strict";
  const SOMMETS = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

  const TRACE = `#version 300 es
precision highp float;
precision highp sampler2D;
out vec4 sortie;
uniform vec2 uRes;
uniform vec3 uCamPos, uCamX, uCamY, uCamZ;
uniform float uTanFov, uOuverture, uMise, uPasse, uTemps, uPoids;
uniform vec4 uAlea;                  // décalage dans le pixel (xy), point de l'objectif (zw)
uniform vec3 uSoleil, uSoleilC, uAmbHaut, uAmbBas;   // direction vers le soleil, sa couleur, la lumière de la pièce (haut, bas)
uniform float uFenetre, uStores;     // éclat de la fenêtre dans les reflets ; part des stores dans la lumière (0 : fenêtre nue)
uniform vec2 uOmbresDec;             // glissement des bandes de lumière
uniform vec4 uTel;                   // le téléphone : x, z, lacet, éclat de l'écran (0 : éteint)
uniform vec4 uCle;                   // la clé : position de la coque, présence
uniform mat3 uRepCle;                // monde → clé
uniform float uCleTag;               // balancement de l'étiquette autour de l'anneau
uniform vec4 uCal;                   // le calendrier : x, z, lacet, présence
uniform vec4 uFeuillet;              // feuillet qui bascule : angle (< 0 : aucun), case affichée devant, case du feuillet, feuillets déjà passés derrière
uniform vec4 uLueur;                 // la lueur de l'écran : position, intensité
uniform sampler2D uEcranTex, uStoresTex, uTagTex, uCalTex;

const float PI = 3.14159265, Z_MUR = -6.0;
const float M_TABLE = 1.0, M_MUR = 2.0, M_TEL = 3.0, M_LAQUE = 5.0, M_BOUTON = 6.0, M_CHROME = 7.0, M_CUIR = 8.0, M_CARTON = 9.0, M_CARTE = 10.0, M_FEUILLET = 11.0;
const vec3 D_TEL = vec3(0.37, 0.042, 0.77);     // demi-dimensions du téléphone (1 unité ≈ 10 cm)
const vec3 D_FOB = vec3(0.17, 0.062, 0.31);     // demi-dimensions de la coque de la clé
const vec3 ANNEAU = vec3(0.0, -0.044, -0.43); const float R_ANN = 0.16, r_ANN = 0.016;
const vec3 D_TAG = vec3(0.22, 0.009, 0.37);
const vec3 CH = vec3(0.0, 1.42, 0.0); const float CL = 1.46, CW = 0.6, CA = 0.29;   // calendrier : charnière, longueur, demi-largeur, pente
const vec3 C_LUEUR = vec3(0.78, 0.86, 1.0);

// ---------------------------------------------------------------- hasard reproductible et bruits
float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 h22(vec2 p) { vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float bruit(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * bruit(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// ---------------------------------------------------------------- les formes
float sdPave(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdRect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
// un pavé aux coins arrondis vu de dessus (rayon rc), aux arêtes adoucies (rayon re)
float sdGalet(vec3 q, vec3 b, float rc, float re) { float d2 = sdRect(q.xz, b.xz, rc); vec2 w = vec2(d2 + re, abs(q.y) - b.y + re); return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - re; }
float sdTore(vec3 q, float R, float r) { return length(vec2(length(q.xz) - R, q.y)) - r; }          // à plat
float sdToreX(vec3 q, float R, float r) { return length(vec2(length(q.yz) - R, q.x)) - r; }         // debout, axe x
float sdCylY(vec3 p, float r, float h, float arr) { vec2 d = vec2(length(p.xz) - r + arr, abs(p.y) - h + arr); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - arr; }

// le téléphone, posé à plat ; l'écran regarde le ciel, son haut vers le fond (−z)
vec3 repTel(vec3 p) { vec3 q = p - vec3(uTel.x, D_TEL.y, uTel.y); q.xz = rot(uTel.z) * q.xz; return q; }
float sdTel(vec3 p) { vec3 q = repTel(p); float b = length(q) - 0.9; if (b > 0.25) return b; return sdGalet(q, D_TEL, 0.11, 0.028); }

// la clé : la coque laquée, trois touches, la lame, l'anneau, l'étiquette en cuir et son œillet
vec3 repCle(vec3 p) { return uRepCle * (p - uCle.xyz); }
float sdCoque(vec3 k) { float d = sdGalet(k, D_FOB, 0.12, 0.05); return max(d, -sdTore(k - ANNEAU, R_ANN, r_ANN + 0.012)); }
float sdTouches(vec3 k) { vec3 q = k; q.z = q.z - clamp(floor(q.z / 0.13 + 0.5), -1.0, 1.0) * 0.13; return sdCylY(q - vec3(0.0, D_FOB.y - 0.006, 0.0), 0.05, 0.014, 0.008); }
float sdLame(vec3 k) {
  vec3 q = k - vec3(0.0, 0.0, D_FOB.z + 0.30);
  float d = min(sdPave(q, vec3(0.044, 0.014, 0.30), 0.012), sdCylY(vec3(k.x, k.z - D_FOB.z - 0.01, k.y), 0.05, 0.03, 0.01));   // la lame et sa bague
  return max(d, -sdPave(q - vec3(0.0, 0.016, 0.03), vec3(0.013, 0.007, 0.24), 0.004));                                          // la rainure
}
vec3 repTag(vec3 k) { vec3 t = k - (ANNEAU + vec3(0.0, -0.008, -R_ANN)); t.xz = rot(uCleTag) * t.xz; return t; }
float sdTag(vec3 k) { vec3 t = repTag(k); return max(sdGalet(t - vec3(0.0, 0.0, -D_TAG.z + 0.05), D_TAG, 0.07, 0.008), -(length(t.xz) - 0.03)); }
float sdOeillet(vec3 k) { vec3 t = repTag(k); return sdTore(t, 0.042, 0.011); }
float sdMetalCle(vec3 k) { return min(min(sdLame(k), sdTore(k - ANNEAU, R_ANN, r_ANN)), sdOeillet(k)); }
float sdCle(vec3 p, out float mat) {
  mat = 0.0; if (uCle.w < 0.5) return 9.0;
  float b = length(p - uCle.xyz) - 1.5; if (b > 0.3) return b;
  vec3 k = repCle(p); float d = sdCoque(k); mat = M_LAQUE;
  float e = sdTouches(k); if (e < d) { d = e; mat = M_BOUTON; }
  e = sdMetalCle(k); if (e < d) { d = e; mat = M_CHROME; }
  e = sdTag(k); if (e < d) { d = e; mat = M_CUIR; }
  return d;
}

// le calendrier : un chevalet (deux plaques jointes en haut), la pile des feuillets devant, deux anneaux ; un feuillet
// tourne autour des anneaux, de devant (angle CA) à derrière (2π − CA), en passant par le haut
vec3 repCal(vec3 p) { vec3 q = p - vec3(uCal.x, 0.0, uCal.y); q.xz = rot(uCal.z) * q.xz; return q; }
// coordonnées dans une plaque d'angle a (direction depuis la charnière : (0, −cos a, sin a)) : x, épaisseur, longueur
vec3 dansPlaque(vec3 c, float a) { vec3 q = c - CH; vec3 d = vec3(0.0, -cos(a), sin(a)), n = vec3(0.0, sin(a), cos(a)); return vec3(q.x, dot(q, n), dot(q, d)); }
float plaque(vec3 c, float a, float dec, float ep, float l0, float l1, float w) { vec3 q = dansPlaque(c, a); return sdPave(vec3(q.x, q.y - dec, q.z - 0.5 * (l0 + l1)), vec3(w, ep, 0.5 * (l1 - l0)), min(ep, 0.006)); }
float decFeuillet(float a) { return mix(0.071, -0.04, smoothstep(CA + 0.6, 2.0 * PI - CA - 0.5, a)); }
float sdCal(vec3 p, out float mat) {
  mat = 0.0; if (uCal.w < 0.5) return 9.0;
  vec3 c = repCal(p); float b = length(c - vec3(0.0, 0.75, 0.0)) - (uFeuillet.x >= 0.0 ? 2.3 : 1.15); if (b > 0.3) return b;
  float d = plaque(c, -CA, -0.016, 0.014, 0.0, CL, CW + 0.02); mat = M_CARTON;                                        // le dos du chevalet
  if (uFeuillet.w > 0.5) { float e = plaque(c, -CA, -0.04, 0.004 + 0.003 * uFeuillet.w, 0.07, CL - 0.02, CW - 0.01); if (e < d) { d = e; mat = M_FEUILLET; } }   // les feuillets passés derrière
  float e = plaque(c, CA, 0.016, 0.014, 0.0, CL, CW + 0.02); if (e < d) { d = e; mat = M_CARTON; }                     // la plaque de devant
  e = plaque(c, CA, 0.05, 0.02, 0.07, CL - 0.02, CW - 0.01); if (e < d) { d = e; mat = M_CARTE; }                        // la pile des feuillets
  if (uFeuillet.x >= 0.0) { e = plaque(c, uFeuillet.x, decFeuillet(uFeuillet.x), 0.0035, 0.07, CL - 0.02, CW - 0.01); if (e < d) { d = e; mat = M_FEUILLET + 0.1; } }
  vec3 q = c - CH; q.x = abs(q.x) - 0.33; e = sdToreX(q, 0.085, 0.012); if (e < d) { d = e; mat = M_CHROME; }        // les anneaux
  return d;
}

vec2 U(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
float carteObjets(vec3 p) { float m; return min(sdTel(p), min(sdCle(p, m), sdCal(p, m))); }     // ce qui porte une ombre
vec2 carte(vec3 p) {
  float m1, m2;
  vec2 r = U(vec2(p.y, M_TABLE), vec2(p.z - Z_MUR, M_MUR));
  r = U(r, vec2(sdTel(p), M_TEL));
  float d = sdCle(p, m1); r = U(r, vec2(d, m1));
  d = sdCal(p, m2); r = U(r, vec2(d, m2));
  return r;
}
vec3 normale(vec3 p) { const vec2 e = vec2(1.0, -1.0) * 0.0005; return normalize(e.xyy * carte(p + e.xyy).x + e.yyx * carte(p + e.yyx).x + e.yxy * carte(p + e.yxy).x + e.xxx * carte(p + e.xxx).x); }

float marche(vec3 ro, vec3 rd, float tmax, out float mat) {
  float t = 0.002;
  for (int i = 0; i < 140; i++) {
    vec2 h = carte(ro + rd * t);
    if (h.x < 0.0004 * (1.0 + t)) { mat = h.y; return t; }
    t += h.x; if (t > tmax) break;
  }
  mat = 0.0; return -1.0;
}

// ---------------------------------------------------------------- la lumière
float ombre(vec3 ro, vec3 rd) { float res = 1.0, t = 0.012; for (int i = 0; i < 44; i++) { float h = carteObjets(ro + rd * t); res = min(res, 12.0 * h / t); t += clamp(h, 0.006, 0.2); if (res < 0.004 || t > 5.0) break; } return clamp(res, 0.0, 1.0); }
float occlusion(vec3 p, vec3 n) { float o = 0.0, s = 1.0; for (int i = 1; i <= 5; i++) { float h = 0.01 + 0.045 * float(i); o += (h - carte(p + n * h).x) * s; s *= 0.72; } return clamp(1.0 - 2.4 * o, 0.0, 1.0); }
// le soleil passe par une fenêtre à stores : un masque projeté dans la direction de la lumière
float stores(vec3 p) { vec3 lx = normalize(cross(uSoleil, vec3(0.0, 1.0, 0.0))), ly = cross(lx, uSoleil); return mix(1.0, textureLod(uStoresTex, vec2(dot(p, lx), dot(p, ly)) / 12.0 + 0.5 + uOmbresDec, 0.0).r, uStores); }
// la pièce, vue dans un reflet : des murs sombres, et la fenêtre, à gauche, derrière ses stores
vec3 piece(vec3 r, float rug) {
  vec3 c = mix(uAmbBas * 0.55, uAmbHaut * 1.5, smoothstep(-0.35, 0.7, r.y));
  if (r.x < -0.04) {
    vec3 h = r * (-5.0 / r.x); vec2 q = vec2(h.z + 0.6, h.y - 1.9), d = abs(q) - vec2(1.6, 1.5);
    float b = 0.1 + rug * 1.6, dans = smoothstep(b, -b, max(d.x, d.y));
    float lames = mix(1.0, smoothstep(0.3, 0.5, abs(fract(q.y * 3.2 + uOmbresDec.y * 9.0) - 0.5) * 2.0) * 0.9 + 0.1, uStores * smoothstep(0.5, 0.05, rug));
    c += vec3(1.0, 0.80, 0.56) * 6.5 * uFenetre * dans * mix(lames, 0.45, smoothstep(0.1, 0.6, rug));
  }
  return c;
}
float ggx(vec3 n, vec3 h, float rug) { float a = rug * rug, a2 = a * a, d = max(dot(n, h), 0.0); d = d * d * (a2 - 1.0) + 1.0; return a2 / (PI * d * d + 1e-5); }

// où tombe un point : sur l'écran du téléphone (uv de l'écran), sur le cuir (uv de l'étiquette), sur un feuillet (uv)
bool surEcran(vec3 p, out vec2 uv) {
  vec3 q = repTel(p); if (q.y < D_TEL.y - 0.012) return false;
  vec2 s = D_TEL.xz - 0.026; uv = vec2(0.5 + q.x / (2.0 * s.x), 0.5 - q.z / (2.0 * s.y));
  return sdRect(q.xz, s, 0.085) < 0.0;
}
vec2 uvTag(vec3 p) { vec3 t = repTag(repCle(p)); return vec2(0.5 + t.x / (2.0 * D_TAG.x), 1.0 + (t.z - 0.05) / (2.0 * D_TAG.z)); }
vec2 uvCarte(vec3 p, float a, float dec, float caseI) { vec3 q = dansPlaque(repCal(p), a); return vec2((caseI + 0.5 + q.x / (2.0 * (CW - 0.01))) / 3.0, 1.0 - (q.z - 0.07) / (CL - 0.09)); }

// couleur d'un point d'une surface opaque (sans le reflet de la pièce, rendu à part). F : part réfléchie, rug : rugosité
vec3 eclaire(vec3 p, vec3 n, vec3 v, float mat, out vec3 F, out float rug) {
  vec3 alb = vec3(0.5), emis = vec3(0.0); float f0 = 0.04, metal = 0.0; rug = 0.5; vec2 uv;
  if (mat == M_TABLE) {                                        // noyer verni : des planches le long de x, le fil fin du bois, ses pores
    vec2 x = p.xz; float pl = floor(x.y / 1.6), u = fract(x.y / 1.6); vec2 w = vec2(x.x + h12(vec2(pl, 3.0)) * 13.0, x.y + h12(vec2(pl, 7.0)) * 4.0);
    float figure = fbm(vec2(w.x * 0.22, w.y * 1.4)), fil = pow(0.5 + 0.5 * sin(w.y * 30.0 + figure * 9.0 + 2.2 * fbm(vec2(w.x * 0.8, w.y * 3.0))), 3.0);
    float pores = bruit(vec2(w.x * 9.0, w.y * 160.0)), joint = smoothstep(0.006, 0.0, min(u, 1.0 - u) * 1.6);
    alb = mix(vec3(0.16, 0.085, 0.042), vec3(0.28, 0.155, 0.078), figure); alb = mix(alb, vec3(0.075, 0.036, 0.018), fil * 0.55);
    alb *= (0.88 + 0.12 * pores) * (1.0 - 0.55 * joint); rug = 0.14 + 0.1 * fil + 0.3 * joint; f0 = 0.045;
  } else if (mat == M_MUR) { alb = vec3(0.56, 0.52, 0.47) * (0.94 + 0.06 * fbm(p.xy * 3.0)); rug = 0.9; f0 = 0.02;
  } else if (mat == M_TEL) {
    if (surEcran(p, uv) || repTel(p).y > D_TEL.y - 0.012) {     // le verre : noir, lisse ; l'écran s'y allume
      alb = vec3(0.004); rug = 0.035; f0 = 0.045;
      if (surEcran(p, uv)) { vec3 t = textureLod(uEcranTex, uv, 0.0).rgb; emis = t * t * 1.25 * uTel.w; }
    } else { alb = vec3(0.30, 0.30, 0.32); metal = 1.0; rug = 0.24 + 0.08 * bruit(p.xz * 300.0); }       // le cadre en métal brossé
  } else if (mat == M_LAQUE) { alb = vec3(0.012, 0.012, 0.014); rug = 0.08; f0 = 0.05;
  } else if (mat == M_BOUTON) {
    vec3 k = repCle(p); float rouge = step(0.065, k.z);            // la touche du coffre est rouge
    alb = mix(vec3(0.05, 0.05, 0.055), vec3(0.62, 0.03, 0.04), rouge); rug = 0.45; f0 = 0.04;
  } else if (mat == M_CHROME) { alb = vec3(0.86, 0.86, 0.88); metal = 1.0; rug = 0.12;
  } else if (mat == M_CUIR) {                                  // cuir rouge, piqûre et lettres blanches dessus, croûte dessous
    vec3 t = repTag(repCle(p)); uv = uvTag(p);
    vec3 cuir = vec3(0.36, 0.022, 0.03) * (0.82 + 0.3 * fbm(p.xz * 60.0)); alb = cuir; rug = 0.48; f0 = 0.04;
    if (t.y > D_TAG.y - 0.004) { vec4 tx = textureLod(uTagTex, uv, 0.0); alb = mix(alb, tx.rgb * tx.rgb, tx.a); rug = mix(rug, 0.35, tx.a); }
  } else if (mat == M_CARTON) { alb = vec3(0.045, 0.043, 0.042) * (0.9 + 0.2 * bruit(p.xy * 140.0)); rug = 0.65; f0 = 0.035;
  } else if (mat >= M_CARTE && mat < M_FEUILLET) {             // le feuillet du dessus de la pile
    vec3 q = dansPlaque(repCal(p), CA); alb = vec3(0.86, 0.84, 0.80); rug = 0.62;
    if (q.y > 0.065) { vec3 t = textureLod(uCalTex, uvCarte(p, CA, 0.05, uFeuillet.y), 0.0).rgb; alb = t * t; }
  } else if (mat >= M_FEUILLET) {                              // un feuillet qui bascule (son recto porte sa case) ou déjà passé
    alb = vec3(0.80, 0.78, 0.74); rug = 0.62;
    if (mat > M_FEUILLET + 0.05) { vec3 q = dansPlaque(repCal(p), uFeuillet.x); if (q.y > decFeuillet(uFeuillet.x)) { vec3 t = textureLod(uCalTex, uvCarte(p, uFeuillet.x, 0.0, uFeuillet.z), 0.0).rgb; alb = t * t; } }
  }

  float so = dot(uSoleilC, vec3(1.0)) > 0.01 ? ombre(p + n * 0.003, uSoleil) * stores(p) : 0.0;
  float ndl = max(dot(n, uSoleil), 0.0), ao = occlusion(p, n);
  vec3 amb = mix(uAmbBas, uAmbHaut, n.y * 0.5 + 0.5) * ao;
  vec3 c = alb * (1.0 - metal) * (uSoleilC * so * ndl + amb);
  vec3 f0c = mix(vec3(f0), alb, metal);
  c += f0c * ggx(n, normalize(uSoleil + v), rug) * uSoleilC * so * ndl * 0.6;
  if (uLueur.w > 0.001 && mat != M_TEL) {                     // la lueur de l'écran, posée juste au-dessus de lui (elle n'éclaire pas le téléphone lui-même)
    vec3 lf = uLueur.xyz - p; float df = length(lf); lf /= df;
    vec3 Lf = C_LUEUR * uLueur.w * 0.3 / (0.05 + df * df); float ndf = max(dot(n, lf), 0.0);
    c += (alb * (1.0 - metal) * ndf + f0c * ggx(n, normalize(lf + v), max(rug, 0.2)) * ndf * 0.4) * Lf * mix(0.5, 1.0, ao);
  }
  F = f0c + (max(vec3(1.0 - rug), f0c) - f0c) * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
  if (metal > 0.5) { c = vec3(0.0); F = f0c * (0.85 + 0.15 * ao); }
  return c + emis;
}

// couleur vue le long d'un rayon secondaire (un reflet)
vec3 rayonSimple(vec3 ro, vec3 rd) {
  float mat; float t = marche(ro, rd, 12.0, mat);
  if (t < 0.0) return piece(rd, 0.0);
  vec3 p = ro + rd * t, n = normale(p), F; float rug;
  vec3 s = eclaire(p, n, -rd, mat, F, rug);
  return s + F * piece(reflect(rd, n), rug);
}

void main() {
  // le rayon : un point du pixel, un point de l'objectif
  vec2 px = gl_FragCoord.xy + uAlea.xy, ndc = (px / uRes) * 2.0 - 1.0;
  vec3 dir = normalize(uCamZ + ndc.x * uTanFov * (uRes.x / uRes.y) * uCamX + ndc.y * uTanFov * uCamY);
  float tourne = 6.2831853 * ign(gl_FragCoord.xy + 13.0 * uPasse);
  vec2 lentille = rot(tourne) * uAlea.zw * uOuverture;
  vec3 ro = uCamPos + lentille.x * uCamX + lentille.y * uCamY, net = uCamPos + dir * (uMise / dot(dir, uCamZ)), rd = normalize(net - ro);

  float mat; float t = marche(ro, rd, 16.0, mat); vec3 col;
  if (t < 0.0) col = piece(rd, 0.0);
  else {
    vec3 p = ro + rd * t, n = normale(p), F; float rug;
    vec3 c = eclaire(p, n, -rd, mat, F, rug);
    vec3 rr = reflect(rd, n);
    if (mat == M_TABLE || mat == M_TEL || mat == M_CHROME || mat == M_LAQUE) {   // le bois verni, le verre, le métal et la laque reflètent vraiment ce qui les entoure
      vec2 al = h22(gl_FragCoord.xy + 71.0 * uPasse) - 0.5;
      vec3 tg = normalize(cross(n, vec3(0.3, 0.2, 0.9))), bt = cross(n, tg);
      rr = normalize(rr + (tg * al.x + bt * al.y) * rug * rug * 1.6);
      if (dot(rr, n) < 0.02) rr = normalize(rr + n * (0.02 - dot(rr, n)));
      c += F * rayonSimple(p + n * 0.003, rr);
    } else c += F * piece(rr, rug);
    col = c;
  }
  sortie = vec4(max(col, 0.0) * uPoids, uPoids);
}`;

  const CLAIR = `#version 300 es
precision highp float; out vec4 sortie; uniform sampler2D uA; uniform vec2 uPas;
void main() { vec2 uv = gl_FragCoord.xy * uPas; vec3 c = texture(uA, uv).rgb; float l = max(c.r, max(c.g, c.b)); sortie = vec4(c * smoothstep(1.1, 3.0, l), 1.0); }`;
  const FLOU = `#version 300 es
precision highp float; out vec4 sortie; uniform sampler2D uA; uniform vec2 uPas, uDir;
void main() { vec2 uv = gl_FragCoord.xy * uPas; vec3 c = texture(uA, uv).rgb * 0.2270;
  c += (texture(uA, uv + uDir * 1.385).rgb + texture(uA, uv - uDir * 1.385).rgb) * 0.3162;
  c += (texture(uA, uv + uDir * 3.231).rgb + texture(uA, uv - uDir * 3.231).rgb) * 0.0703; sortie = vec4(c, 1.0); }`;
  const FINAL = `#version 300 es
precision highp float; out vec4 sortie; uniform sampler2D uA, uHalo, uHalo2, uCalque; uniform vec2 uPas; uniform float uExpo, uGrain, uAvecCalque;
float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec3 tons(vec3 x) { const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
void main() {
  vec2 uv = gl_FragCoord.xy * uPas; vec3 c = texture(uA, uv).rgb + texture(uHalo, uv).rgb * 0.10 + texture(uHalo2, uv).rgb * 0.14;
  vec2 q = uv - 0.5; c *= 1.0 - 0.42 * dot(q, q) * 1.6;                                   // vignettage
  c = tons(c * uExpo); c = pow(c, vec3(1.0 / 2.2));
  if (uAvecCalque > 0.5) { vec4 s = texture(uCalque, uv); c = c * (1.0 - s.a) + s.rgb; }   // les titres (calque prémultiplié)
  c += (h12(gl_FragCoord.xy) - 0.5) * uGrain + (h12(gl_FragCoord.xy + 7.7) - 0.5) / 255.0; // grain et tramage
  sortie = vec4(c, 1.0);
}`;

  const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  function creer(canvas, { largeur, hauteur, definition = 1 }) {
    canvas.width = largeur; canvas.height = hauteur;
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
    // la 3D est calculée en L × H (la définition), puis posée sur l'image entière avec les titres en pleine définition
    const W = largeur, H0 = hauteur, L = Math.round(W * definition), H = Math.round(H0 * definition);
    const cumul = cible(L, H), a2 = cible(L >> 1, H >> 1), b2 = cible(L >> 1, H >> 1), a8 = cible(L >> 3, H >> 3), b8 = cible(L >> 3, H >> 3);
    const textures = {}, UNITES = { ecran: 0, stores: 1, etiquette: 2, calendrier: 3, calque: 4 };
    function texture(nom, source) {
      if (!(nom in UNITES)) throw new Error(`texture inconnue : ${nom}`);
      const tex = textures[nom] || (textures[nom] = gl.createTexture());
      gl.activeTexture(gl.TEXTURE0 + 7); gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, nom === "calque");
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      if (nom === "stores") gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);    // les bandes de lumière défilent sans fin
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }
    const vide = document.createElement("canvas"); vide.width = vide.height = 2;
    for (const nom of Object.keys(UNITES)) texture(nom, vide);
    const lier = (unite, tex) => { gl.activeTexture(gl.TEXTURE0 + unite); gl.bindTexture(gl.TEXTURE_2D, tex); };
    function passe(prog, dest, regle) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dest ? dest.fbo : null); gl.viewport(0, 0, dest ? dest.w : W, dest ? dest.h : H0);
      gl.useProgram(prog.p); regle(prog.u); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    const BANDES = 8, pixel = new Uint8Array(4);
    // une image ratée par la carte graphique est d'une seule couleur ; une vraie image ne l'est jamais (elle porte du grain)
    function unie() {
      let premier = null;
      for (let k = 0; k < 9; k++) { gl.readPixels(Math.floor((W * (k + 0.5)) / 9), Math.floor((H0 * (((k * 4) % 9) + 0.5)) / 9), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); const v = pixel[0] + "," + pixel[1] + "," + pixel[2]; if (premier === null) premier = v; else if (v !== premier) return false; }
      return true;
    }
    function image(t, sceneDe, o = {}) { for (let essai = 0; essai < 4; essai++) { calculer(t, sceneDe, o); if (!unie()) return; console.warn(`image ${t.toFixed(3)} s refaite (essai ${essai + 1})`); } }
    function calculer(t, sceneDe, { echantillons = 8, obturateur = 1 / 120 } = {}) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, cumul.fbo); gl.viewport(0, 0, L, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      let S = null;
      for (let i = 0; i < echantillons; i++) {
        S = sceneDe(t + (halton(i + 1, 5) - 0.5) * obturateur); const c = S.cam;
        const z = unit(sub(c.cible, c.pos)); let x = unit(cross(z, [0, 1, 0])), y = cross(x, z);
        const ro = ((c.roulis || 0) * Math.PI) / 180, cr = Math.cos(ro), sr = Math.sin(ro);
        [x, y] = [[x[0] * cr + y[0] * sr, x[1] * cr + y[1] * sr, x[2] * cr + y[2] * sr], [y[0] * cr - x[0] * sr, y[1] * cr - x[1] * sr, y[2] * cr - x[2] * sr]];
        const r = Math.sqrt(halton(i + 1, 7)), an = 2 * Math.PI * halton(i + 1, 11), cle = S.cle;
        const regle = (u) => {
          gl.uniform2f(u.uRes, L, H); gl.uniform3fv(u.uCamPos, c.pos); gl.uniform3fv(u.uCamX, x); gl.uniform3fv(u.uCamY, y); gl.uniform3fv(u.uCamZ, z);
          gl.uniform1f(u.uTanFov, Math.tan(((c.fov || 30) * Math.PI) / 360)); gl.uniform1f(u.uOuverture, c.ouverture || 0); gl.uniform1f(u.uMise, c.mise || Math.hypot(...sub(c.cible, c.pos)));
          gl.uniform4f(u.uAlea, halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5, r * Math.cos(an), r * Math.sin(an));
          gl.uniform1f(u.uPasse, i); gl.uniform1f(u.uTemps, t); gl.uniform1f(u.uPoids, 1 / echantillons);
          gl.uniform3fv(u.uSoleil, unit(S.soleil)); gl.uniform3fv(u.uSoleilC, S.soleilC); gl.uniform3fv(u.uAmbHaut, S.ambHaut); gl.uniform3fv(u.uAmbBas, S.ambBas);
          gl.uniform1f(u.uFenetre, S.fenetre); gl.uniform1f(u.uStores, S.stores ?? 1); gl.uniform2fv(u.uOmbresDec, S.ombresDec || [0, 0]);
          gl.uniform4fv(u.uTel, S.tel || [0, 0, 0, 0]);
          gl.uniform4fv(u.uCle, cle ? [...cle.pos, 1] : [0, -9, 0, 0]); gl.uniformMatrix3fv(u.uRepCle, false, cle ? cle.rep : [1, 0, 0, 0, 1, 0, 0, 0, 1]); gl.uniform1f(u.uCleTag, cle ? cle.tag || 0 : 0);
          gl.uniform4fv(u.uCal, S.cal || [0, 0, 0, 0]); gl.uniform4fv(u.uFeuillet, S.feuillet || [-1, 0, 0, 0]); gl.uniform4fv(u.uLueur, S.lueur || [0, 0, 0, 0]);
          lier(0, textures.ecran); gl.uniform1i(u.uEcranTex, 0); lier(1, textures.stores); gl.uniform1i(u.uStoresTex, 1);
          lier(2, textures.etiquette); gl.uniform1i(u.uTagTex, 2); lier(3, textures.calendrier); gl.uniform1i(u.uCalTex, 3);
        };
        // une passe est dessinée en bandes, chacune terminée avant la suivante : envoyé d'un bloc, un calcul trop long est abandonné par la carte graphique
        gl.enable(gl.SCISSOR_TEST);
        for (let k = 0; k < BANDES; k++) { const y0 = Math.floor((H * k) / BANDES), y1 = Math.floor((H * (k + 1)) / BANDES); gl.scissor(0, y0, L, y1 - y0); passe(P.trace, cumul, regle); gl.finish(); }
        gl.disable(gl.SCISSOR_TEST);
      }
      gl.disable(gl.BLEND);
      // le halo des hautes lumières : un flou serré et un flou large
      passe(P.clair, a2, (u) => { lier(0, cumul.tex); gl.uniform1i(u.uA, 0); gl.uniform2f(u.uPas, 1 / a2.w, 1 / a2.h); });
      const flou = (de, vers, dx, dy) => passe(P.flou, vers, (u) => { lier(0, de.tex); gl.uniform1i(u.uA, 0); gl.uniform2f(u.uPas, 1 / vers.w, 1 / vers.h); gl.uniform2f(u.uDir, dx / de.w, dy / de.h); });
      flou(a2, b2, 1, 0); flou(b2, a2, 0, 1); flou(a2, b2, 2, 0); flou(b2, a2, 0, 2);
      flou(a2, b8, 1, 0); flou(b8, a8, 0, 1); flou(a8, b8, 2, 0); flou(b8, a8, 0, 2); flou(a8, b8, 3, 0); flou(b8, a8, 0, 3);
      passe(P.final, null, (u) => {
        lier(0, cumul.tex); gl.uniform1i(u.uA, 0); lier(1, a2.tex); gl.uniform1i(u.uHalo, 1); lier(2, a8.tex); gl.uniform1i(u.uHalo2, 2); lier(4, textures.calque); gl.uniform1i(u.uCalque, 4);
        gl.uniform2f(u.uPas, 1 / W, 1 / H0); gl.uniform1f(u.uExpo, S.exposition ?? 1); gl.uniform1f(u.uGrain, S.grain ?? 0.012); gl.uniform1f(u.uAvecCalque, S.calque ? 1 : 0);
      });
      gl.finish();
    }
    return { image, texture, infos: { compilation, definition: [L, H] } };
  }
  return { creer };
})();
