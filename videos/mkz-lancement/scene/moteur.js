// Mavena, vidéo d'exemple v2 : moteur 3D (WebGL2). Contrat : section « Moteur » de API.md.
// Un shader plein écran lance des rayons (sol laqué, boîtes arrondies en verre fumé, sphères émissives, lumières
// ponctuelles) ; les passes sont accumulées dans un tampon flottant (anticrénelage, profondeur de champ, flou de
// mouvement), puis une passe finale applique bloom, courbe de tons, vignette, grain et tramage.
// Tout est une fonction pure des paramètres : deux rendus du même instant sont identiques.
//
// En plus du contrat :
//   M.image(t, sceneDe, { echantillons, obturateur, rayons: 2 })   rayons lancés par passe et par pixel (1 à 4) :
//                                                                 2 divise le bruit des flous, pour un temps double
//   boîte : envers: 1      visibilité, à travers le verre, de la texture de la face opposée (vue en miroir). Elle
//                          n'est de toute façon pas montrée quand la face par laquelle on regarde porte une texture.
//   M.projeter()           renvoie aussi profondeur (distance le long de l'axe de visée) et echelle (px par unité)
//   M.attendre()           attend la fin des calculs de la carte graphique (pour mesurer un temps de rendu)
//   M.infos                { compilation (ms), accumulation, anisotropie }
// Couleurs de la scène : valeurs sRGB (celles de la charte), converties ici en lumière linéaire.
// Rotations : R = Ry · Rx · Rz en degrés ; rot [-90, 0, 0] couche une plaque sur le sol, face vers le haut.
// Un roulis positif de la caméra fait tourner l'image dans le sens des aiguilles d'une montre.
//
// À savoir pour décrire une scène :
//   - verre: 0 donne une texture seule (ni chants, ni liseré, ni reflets, ni ombre), sans autre réglage ;
//   - le verre est absorbé au fil du trajet : une pastille ou un curseur placé dans une boîte reste lumineux ;
//     la caméra peut entrer dans une boîte (elle en voit le verre restant et la face de sortie) ; ce qui est vu à
//     travers une plaque est décalé selon son épaisseur (réfraction, indice 1,5) ;
//   - une boîte à couleurGain > 0 éclaire le sol et les faces voisines (3 boîtes émissives au plus éclairent, sans
//     ombre) ; avec verre: 0 c'est une nappe de lumière douce (lame), avec verre > 0 un corps lumineux net (curseur) ;
//   - un rayon traverse 8 boîtes au plus (5 dans le reflet du sol) ; au-delà de 24 boîtes, 6 sphères ou 4 lumières,
//     le moteur lève une erreur ;
//   - plusieurs éléments peuvent partager une couche : une face ne lit jamais hors de son sous-rectangle, même floue ;
//   - imageDansCouche() rend à la taille du plateau, en haut à gauche de la couche ; uvFace [0, 0, 1, 1] désigne
//     toujours l'image entière. Une face « brut: 1 » qui la montre plein cadre la redonne texel pour pixel ;
//   - flou de mouvement : caméra, boîtes (position et rotation) et sphères sont interpolées rayon par rayon entre
//     les instants des passes ; les autres réglages changent d'une passe à l'autre ;
//   - rugosité du sol : utilisable de 0 à 1 ; dans le reflet, textures, filets clairs et sphères sont préfiltrés à
//     la taille du flou, ce qui évite le grain (le reflet d'une sphère est donc un peu plus doux que la sphère).
const Moteur = (() => {
  "use strict";
  const NB = 24, NS = 6, NL = 4, NE = 3, KB = 15, KS = 6, NIV_BLOOM = 6, MAX_POUSSIERES = 1600;
  const TU = 48, TUX = 64, TUY = 32;   // tuiles de tri des boîtes : taille en px, taille de la table
  const RAD = Math.PI / 180;

  // ---------------------------------------------------------------- petits outils
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));   // sRGB vers linéaire
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const long = (a) => Math.hypot(a[0], a[1], a[2]);
  const unit = (a) => { const l = long(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const pgcd = (a, b) => (b ? pgcd(b, a % b) : a);
  const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
  const tente = (u) => (u < 0.5 ? Math.sqrt(2 * u) - 1 : 1 - Math.sqrt(2 - 2 * u));    // loi triangulaire sur [-1, 1]
  const hasard = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // reproductible

  // Axes locaux d'un objet dans le monde (colonnes de R = Ry · Rx · Rz, angles en degrés).
  function axes(rot) {
    const rx = (rot?.[0] || 0) * RAD, ry = (rot?.[1] || 0) * RAD, rz = (rot?.[2] || 0) * RAD;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    return [
      [cy * cz + sy * sx * sz, cx * sz, -sy * cz + cy * sx * sz],
      [-cy * sz + sy * sx * cz, cx * cz, sy * sz + cy * sx * cz],
      [sy * cx, -sx, cy * cx],
    ];
  }

  // Repère de la caméra : le même calcul sert au shader et à projeter().
  function repere(cam) {
    const pos = cam.pos, cible = cam.cible || [0, 0, 0];
    const f = unit(sub(cible, pos));
    let r = cross(f, [0, 1, 0]);
    r = long(r) < 1e-5 ? [1, 0, 0] : unit(r);
    const u = cross(r, f);
    const a = (cam.roulis || 0) * RAD, ca = Math.cos(a), sa = Math.sin(a);
    return {
      pos, cible, f,
      r: [r[0] * ca + u[0] * sa, r[1] * ca + u[1] * sa, r[2] * ca + u[2] * sa],
      u: [u[0] * ca - r[0] * sa, u[1] * ca - r[1] * sa, u[2] * ca - r[2] * sa],
      tanF: Math.tan(((cam.fov ?? 38) * RAD) / 2),
      mise: cam.mise ?? long(sub(cible, pos)),
      ouverture: cam.ouverture ?? 0.02,
    };
  }

  // Suites d'échantillonnage pour n passes de k rayons : décalage sous-pixel, intervalle de temps dans l'obturateur
  // (un sur n, dans un ordre mélangé), et multiplicateurs (premiers avec n·k) qui permutent les indices pour le
  // reflet du sol et pour les ombres.
  const _suites = {};
  function suites(n, k) {
    const cle = n + "x" + k;
    if (_suites[cle]) return _suites[cle];
    const premier = (cible, m) => { let x = Math.max(1, Math.round(cible)); while (pgcd(x, m) !== 1) x++; return x; };
    const m1 = premier(n * 0.618, n);
    const s = { jit: [], inter: [], mSol: premier(n * k * 0.382 + 1, n * k), mOmbre: premier(n * k * 0.27 + 2, n * k) };
    for (let i = 0; i < n; i++) {
      s.jit.push(n === 1 ? [0, 0] : [0.75 * tente(halton(i + 1, 2)), 0.75 * tente(halton(i + 1, 3))]);
      s.inter.push(n === 1 ? 0 : (i * m1 + 1) % n);
    }
    return (_suites[cle] = s);
  }

  // ---------------------------------------------------------------- shaders
  const VS_PLEIN = `#version 300 es
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

  const GLSL_HASARD = `
uint hacher(uint x) { x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16; return x; }
float alea(inout uint g) { g = hacher(g + 0x9E3779B9u); return float(g >> 8) * (1.0 / 16777216.0); }
`;

  const FS_SCENE = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;
layout(location = 0) out vec4 oHDR;    // lumière de la scène
layout(location = 1) out vec4 oBrut;   // faces « brutes » : couleur d'écran telle quelle (rgb) et couverture (a)
layout(location = 2) out vec4 oProf;   // distance du premier objet (sert à cacher les poussières)

#define NB ${NB}
#define NS ${NS}
#define NL ${NL}
#define NE ${NE}
#define KB ${KB}
#define KS ${KS}

uniform vec2 uRes;
uniform vec4 uEch;        // décalage sous-pixel (xy), indice de la passe, nombre de passes
uniform vec4 uEch2;       // multiplicateurs des permutations (reflet du sol, ombres), rayons par passe
uniform vec3 uTrame;      // décalage des tirages propre à l'image (xy) et graine (z)
uniform vec3 uCamP, uCamF, uCamR, uCamU;       // caméra au début de l'intervalle de temps de la passe
uniform vec3 uCamP2, uCamF2, uCamR2, uCamU2;   // caméra à la fin de l'intervalle
uniform vec4 uCam;        // tan(fov/2), mise au point, ouverture, angle d'un pixel
uniform vec4 uB[NB * KB]; // boîtes (voir remplir() pour le détail des ${KB} vecteurs)
uniform vec4 uS[NS * KS]; // sphères : centre + rayon, 3 lignes de la matrice monde -> sphère ronde, émission, centre en fin d'intervalle
uniform vec4 uL[NL * 2];  // lumières : position + portée, couleur × intensité
uniform vec4 uE[NE * 4];  // rectangles lumineux (boîtes émissives) : centre + indice de la boîte, deux demi-côtés, couleur
uniform ivec4 uN;         // nombre de boîtes, de sphères, de lumières, de rectangles lumineux
uniform vec4 uSol;        // reflet, rugosité, pulsation, présence
uniform vec4 uAnn;        // anneau : centre (xz), rayon, largeur
uniform vec3 uAnnC;
uniform vec4 uBal;        // balises : a (xz), b (xz)
uniform vec4 uBal2;       // nombre, allumées, taille
uniform vec3 uBalC;
uniform vec3 uFond;
uniform vec4 uAmb;        // brume, halo, studio
uniform vec4 uAxe;        // direction horizontale de la caméra (xy), cible au sol (zw)
uniform sampler2DArray uTex;
uniform highp usampler2D uTuiles;   // par tuile de ${TU} px : boîtes à examiner pour le rayon direct (r), le reflet du sol (g), les ombres (b)
${GLSL_HASARD}
// Propres au rayon en cours : son instant dans l'intervalle de la passe (0..1) et le rayon central du pixel
// (sans décalage d'anticrénelage ni d'objectif), qui sert à relire une face brute texel pour pixel.
float gTau;
vec3 gRo0, gDir0;

float motif(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
// Point d'un disque : spirale de Fibonacci (indice s sur n), déplacé dans sa cellule par un tirage propre au pixel.
// Les cellules se recouvrent : le flou est lisse (pas d'images fantômes) et le bruit reste faible. La spirale
// tourne d'une image à l'autre : ce qui reste de sa trame ne se répète pas d'une image à la suivante.
vec2 disque(float s, float n, vec2 xi) {
  float r = sqrt((s + 0.5) / n), a = s * 2.39996323 + uTrame.z * 0.0011;
  vec2 p = r * vec2(cos(a), sin(a));
  float rr = sqrt(xi.x) * 1.15 / sqrt(n), aa = xi.y * 6.2831853;
  p += rr * vec2(cos(aa), sin(aa));
  float l = length(p);
  return l > 1.0 ? p * ((2.0 - l) / l) : p;
}
// Plafonne une lumière sans changer sa teinte.
vec3 plafond(vec3 c, float m) { return c * min(1.0, m / max(max(c.r, max(c.g, c.b)), 1e-5)); }

// Fond du studio : noir, avec une nappe de brume éclairée à l'horizon, dans l'axe de la caméra.
vec3 ciel(vec3 rd) {
  float az = dot(normalize(rd.xz + vec2(1e-6, 0.0)), uAxe.xy);
  float e1 = rd.y / 0.09, e2 = rd.y / (rd.y > 0.0 ? 0.3 : 0.2);
  float nappe = (0.55 * exp(-e1 * e1) + 0.45 * exp(-e2 * e2)) * (0.3 + 0.7 * smoothstep(-0.3, 1.0, az));
  return uFond * (1.0 + uAmb.x * 6.0 * nappe);
}

float rectDoux(vec2 p, vec2 c, vec2 h, float f) {
  vec2 d = abs(p - c);
  return smoothstep(h.x + f, h.x - f, d.x) * smoothstep(h.y + f, h.y - f, d.y);
}
float bande(float az, float az0, float w, float f) {
  float d = abs(mod(az - az0 + 3.14159265, 6.2831853) - 3.14159265);
  return smoothstep(w + f, w - f, d);
}
// Boîtes à lumière du studio (vues seulement dans les reflets du verre) : des bandes verticales fines et des
// panneaux doux qui montent du sol, répartis autour de la scène, et un plafonnier. Les bandes fines restent
// proches de 1 : leur reflet ne doit pas voiler un écran.
vec3 studio(vec3 rd) {
  float az = atan(rd.x, rd.z), el = rd.y / max(length(rd.xz), 1e-4);
  float mur = smoothstep(-0.02, 0.07, el) * smoothstep(1.5, 0.45, el);
  float c = mur * (1.15 * bande(az, 0.40, 0.032, 0.014) + 0.42 * bande(az, -0.64, 0.24, 0.2) + 0.85 * bande(az, -1.08, 0.028, 0.014)
    + 0.36 * bande(az, 1.3, 0.3, 0.22) + 1.0 * bande(az, 2.72, 0.036, 0.016) + 0.4 * bande(az, -2.35, 0.3, 0.22));
  if (rd.y > 0.04) c += 0.9 * rectDoux(rd.xz / rd.y, vec2(0.0, -0.1), vec2(0.9, 0.55), 0.4);
  return vec3(c) * uAmb.z;
}

// Lueur volumétrique des lumières entre t0 et t1 (intégrale exacte de 1/d² le long du rayon).
vec3 lueur(vec3 ro, vec3 rd, float t0, float t1) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < NL; i++) {
    if (i >= uN.z) break;
    vec4 a = uL[i * 2];
    vec3 L = a.xyz - ro;
    float tc = dot(L, rd);
    float h = sqrt(max(dot(L, L) - tc * tc, 0.0) + 0.0022);
    float I = (atan((t1 - tc) / h) - atan((t0 - tc) / h)) / h;
    float f = max(1.0 - h / (0.7 * a.w), 0.0);
    c += uL[i * 2 + 1].rgb * (I * f * f * f);
  }
  return c * (uAmb.y * 0.005);
}

// Lumière des boîtes émissives (lame de lumière, curseur) reçue par une surface de normale n. Chaque boîte éclaire
// comme une nappe lumineuse : son rectangle médian, découpé en trois segments parallèles à la surface éclairée,
// chacun intégré exactement (lumière émise dans toutes les directions, coupée à l'horizon de la surface). Sans ombre.
// sauf : indice d'une boîte qui ne s'éclaire pas elle-même.
vec3 lames(vec3 p, vec3 n, int sauf) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < NE; i++) {
    if (i >= uN.w) break;
    vec4 a = uE[i * 4];
    if (int(a.w + 0.5) == sauf) continue;
    // au-delà de sa portée, une petite boîte lumineuse (curseur) n'éclaire plus rien de visible
    vec3 ec = a.xyz - p;
    float loin = dot(ec, ec) / uE[i * 4 + 1].w;
    if (loin > 1.0) continue;
    vec3 U = uE[i * 4 + 1].xyz, V = uE[i * 4 + 2].xyz;
    float lu = length(U), lv = length(V);
    bool surU = abs(dot(n, U)) * lv <= abs(dot(n, V)) * lu;
    vec3 ax = surU ? U / lu : V / lv, tr = surU ? V : U;
    float L = surU ? lu : lv, b = dot(n, ax), e = 0.0;
    for (int j = 0; j < 3; j++) {
      vec3 o = a.xyz + tr * (0.6 * float(j - 1)) - p;
      float sc = dot(o, ax);
      vec3 hv = o - ax * sc;
      float h2 = dot(hv, hv) + 4e-4, an = dot(n, hv);
      // bornes du segment, ramenées au-dessus de l'horizon de la surface (an + b·s >= 0)
      float s0 = sc - L, s1 = sc + L;
      if (b > 1e-5) s0 = max(s0, -an / b); else if (b < -1e-5) s1 = min(s1, -an / b); else if (an <= 0.0) continue;
      if (s1 <= s0) continue;
      float r0 = sqrt(h2 + s0 * s0), r1 = sqrt(h2 + s1 * s1);
      e += (j == 1 ? 0.4 : 0.3) * max(an * (s1 / r1 - s0 / r0) / h2 - b * (1.0 / r1 - 1.0 / r0), 0.0);
    }
    c += uE[i * 4 + 3].rgb * (e * 2.0 * (surU ? lv : lu) * smoothstep(1.0, 0.5, loin));
  }
  return c;
}

// Lumière reçue par une surface de normale n (complet : avec celle des boîtes émissives).
vec3 eclairage(vec3 p, vec3 n, int sauf, bool complet) {
  vec3 c = complet ? lames(p, n, sauf) * 3.5 : vec3(0.0);
  for (int i = 0; i < NL; i++) {
    if (i >= uN.z) break;
    vec4 a = uL[i * 2];
    vec3 L = a.xyz - p;
    float d2 = dot(L, L), d = sqrt(d2), f = max(1.0 - d / a.w, 0.0);
    c += uL[i * 2 + 1].rgb * (max(dot(n, L), 0.0) / (d * (d2 + 0.012)) * f * f);
  }
  return c;
}

// Rayon ramené dans le repère d'une boîte (à l'instant du rayon), et traversée de son volume englobant.
// Un premier tri par sphère englobante écarte à peu de frais les boîtes loin du rayon (il2 = 1/|rd|²).
bool englobant(int k, vec3 ro, vec3 rd, float il2, out vec3 ol, out vec3 dl, out float tN, out float tF) {
  vec3 v = ro - mix(uB[k].xyz, uB[k + 11].xyz, gTau);
  float q = dot(v, rd), R = uB[k + 10].z;
  if (dot(v, v) - q * q * il2 > R * R) return false;
  vec3 ax = mix(uB[k + 2].xyz, uB[k + 12].xyz, gTau), ay = mix(uB[k + 3].xyz, uB[k + 13].xyz, gTau), az = mix(uB[k + 4].xyz, uB[k + 14].xyz, gTau);
  ol = vec3(dot(ax, v), dot(ay, v), dot(az, v));
  dl = vec3(dot(ax, rd), dot(ay, rd), dot(az, rd));
  vec3 inv = 1.0 / (dl + step(abs(dl), vec3(1e-7)) * 1e-6);
  vec3 h = uB[k + 1].xyz;
  vec3 t1 = (-h - ol) * inv, t2 = (h - ol) * inv;
  vec3 a = min(t1, t2), b = max(t1, t2);
  tN = max(max(a.x, a.y), a.z);
  tF = min(min(b.x, b.y), b.z);
  return tF > tN;
}

// Distance au contour (rectangle arrondi) dans le plan de la plaque.
float contour(vec2 p, vec2 h, float r) {
  vec2 q = abs(p) - h + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
// Distance à la boîte : rectangle arrondi extrudé, arêtes arrondies (biseau b).
float sdBoite(vec3 p, vec3 h, float r, float b) {
  vec2 w = vec2(contour(p.xy, h.xy, r), abs(p.z) - h.z) + b;
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - b;
}

// Ombre portée par les boîtes sur le segment p -> lp (volumes englobants, adoucie par le tirage de lp).
float ombre(vec3 p, vec3 lp, uint m) {
  vec3 d = lp - p, ol, dl;
  float o = 1.0, tN, tF, il2 = 1.0 / dot(d, d);
  for (int i = 0; i < NB; i++) {
    uint r = m >> uint(i);
    if (r == 0u) break;
    if ((r & 1u) == 0u) continue;
    float op = uB[i * KB + 10].y;
    if (op > 0.0 && englobant(i * KB, p, d, il2, ol, dl, tN, tF) && tF > 2e-3 && tN < 1.0) o *= 1.0 - op;
  }
  return o;
}

// Sphère la plus proche. Les ellipsoïdes sont ramenés dans le repère où ils sont ronds.
// kr : flou propre au rayon, par unité de distance (reflet du sol). Une sphère plus petite que l'empreinte du rayon
// est grossie à cette taille et affaiblie d'autant (même énergie) : son reflet très flou reste sans grain.
float spheres(vec3 ro, vec3 rd, float kr, out vec3 n, out vec3 e) {
  float tS = 1e9;
  n = vec3(0.0, 1.0, 0.0); e = vec3(0.0);
  for (int i = 0; i < NS; i++) {
    if (i >= uN.y) break;
    int k = i * KS;
    vec3 v = ro - mix(uS[k].xyz, uS[k + 5].xyz, gTau);
    vec3 o = vec3(dot(uS[k + 1].xyz, v), dot(uS[k + 2].xyz, v), dot(uS[k + 3].xyz, v));
    vec3 d = vec3(dot(uS[k + 1].xyz, rd), dot(uS[k + 2].xyz, rd), dot(uS[k + 3].xyz, rd));
    float A = dot(d, d), B = dot(o, d), r2 = uS[k].w * uS[k].w, fl = kr * max(-B / A, 0.0), R2 = r2 + fl * fl * A;
    float D = B * B - A * (dot(o, o) - R2);
    if (D > 0.0) {
      float t = (-B - sqrt(D)) / A;
      if (t > 1e-4 && t < tS) {
        tS = t;
        vec3 pl = o + d * t;
        n = normalize(pl.x * uS[k + 1].xyz + pl.y * uS[k + 2].xyz + pl.z * uS[k + 3].xyz);
        e = uS[k + 4].rgb * (r2 / R2);
      }
    }
  }
  return tS;
}
// Une sphère émissive vue sous l'angle cv : cœur plus chaud, bord un peu plus dense.
vec3 braise(vec3 e, float cv) { return e * (0.62 + 0.38 * cv + 0.55 * pow(cv, 5.0)); }

// Lumière émise par le sol : anneau, balises, battement.
vec3 solEmission(vec2 p) {
  vec3 c = vec3(0.0);
  if (uAnn.w > 0.0) {
    float d = abs(length(p - uAnn.xy) - uAnn.z) / uAnn.w;
    c += uAnnC * (exp(-d * d * 3.0) + 0.22 * exp(-d * 1.1));
  }
  if (uBal2.x > 0.5) {
    vec2 ab = uBal.zw - uBal.xy;
    float L = max(length(ab), 1e-4), pas = L / max(uBal2.x - 1.0, 1.0);
    vec2 u = ab / L;
    float s = dot(p - uBal.xy, u) / pas, i0 = floor(s) - 1.0;
    for (int j = 0; j < 4; j++) {
      float i = i0 + float(j);
      if (i < -0.5 || i > uBal2.x - 0.5) continue;
      float d = length(p - (uBal.xy + u * (i * pas))) / uBal2.z;
      float al = clamp(uBal2.y - i, 0.0, 1.0);
      float pastille = smoothstep(1.0, 0.82, d);
      c += uBalC * al * (3.2 * pastille + 0.55 * exp(-d * 0.75) + 0.1 * exp(-d * 0.22));
      c += vec3(0.022) * (1.0 - al) * smoothstep(1.0, 0.82, d * 1.5);
    }
  }
  if (uSol.z > 0.0) {
    float d = length(p - uAxe.zw);
    c += vec3(0.04, 0.04, 0.043) * uSol.z * exp(-d * d / 6.0);
  }
  return c;
}

// Sol sans son reflet : émission, lumière reçue des lumières ponctuelles et, pour le sol vu directement (ombres),
// des boîtes émissives.
vec3 solLumiere(vec3 p, bool ombres, vec3 xi, uint m) {
  vec3 c = solEmission(p.xz);
  if (ombres) c += lames(p, vec3(0.0, 1.0, 0.0), -1) * 0.24;
  for (int i = 0; i < NL; i++) {
    if (i >= uN.z) break;
    vec4 a = uL[i * 2];
    vec3 L = a.xyz - p;
    float d2 = dot(L, L), d = sqrt(d2), f = max(1.0 - d / a.w, 0.0);
    float e = max(L.y, 0.0) / (d * (d2 + 0.012)) * f * f;
    if (ombres && e > 2e-3) {
      // la lumière a une taille : pénombre douce
      vec2 dj = disque(xi.z, uEch.w * uEch2.z, xi.xy) * 0.05;
      e *= ombre(p, a.xyz + vec3(dj.x, 0.0, dj.y), m);
    }
    c += uL[i * 2 + 1].rgb * (e * 0.03);
  }
  return c;
}

// Ce que reflète le verre dans la direction rr : studio, fond, sphères, lueur des lumières, lumières du sol.
// Plafonné : un reflet très fin et très clair ne doit pas semer de grains dans les flous.
vec3 reflets(vec3 p, vec3 rr, bool complet) {
  bool versSol = uSol.w > 0.5 && rr.y < 0.0 && p.y > 0.0;
  vec3 miroir = vec3(rr.x, abs(rr.y), rr.z);
  vec3 c = (studio(miroir) + ciel(miroir)) * (versSol ? uSol.x * 0.8 : 1.0);
  if (!complet) return c;   // dans le reflet du sol, le verre ne reflète que le studio
  vec3 n, e;
  float t = spheres(p, rr, 0.0, n, e);
  if (t < 1e8) c += braise(e, max(dot(-rr, n), 0.0));
  c += lueur(p, rr, 0.0, min(t, 40.0));
  if (versSol && rr.y < -0.01) {
    vec3 q = p + rr * (-p.y / rr.y);
    c += solLumiere(q, false, vec3(0.0), 0u) * exp(-0.1 * length(q - p));
  }
  return plafond(c, 3.0);
}

// Lecture d'une couche dans le sous-rectangle r, filtrée sur une empreinte de P texels, sans jamais lire hors du
// sous-rectangle : deux niveaux de mipmap, chacun bloqué sur les centres de ses texels entièrement intérieurs.
// (Le filtrage du matériel, lui, laisserait baver ce qui est dessiné à côté dès que l'image est floue.)
vec4 lire(vec2 uv, vec4 r, float couche, float P) {
  vec2 T = vec2(textureSize(uTex, 0).xy);
  vec2 a = min(r.xy, r.zw) * T, b = max(r.xy, r.zw) * T, p = uv * T;
  float lmax = min(max(log2(max(min(b.x - a.x, b.y - a.y), 1.0)) - 2.0, 0.0), 6.0);
  float lod = clamp(log2(max(P, 1e-3)), 0.0, lmax), l0 = floor(lod), f = lod - l0;
  float s0 = exp2(l0), s1 = 2.0 * s0;
  vec2 lo = l0 < 0.5 ? a + 0.5 : (ceil(a / s0 - 0.01) + 0.5) * s0, hi = l0 < 0.5 ? b - 0.5 : (floor(b / s0 + 0.01) - 0.5) * s0;
  vec4 c = textureLod(uTex, vec3(clamp(p, min(lo, hi), max(lo, hi)) / T, couche), l0);
  if (f > 0.01) {
    lo = (ceil(a / s1 - 0.01) + 0.5) * s1; hi = (floor(b / s1 + 0.01) - 0.5) * s1;
    c = mix(c, textureLod(uTex, vec3(clamp(p, min(lo, hi), max(lo, hi)) / T, couche), l0 + 1.0), f);
  }
  return c;
}
// Texture d'une grande face (av = +1 : face avant, −1 : dos), filtrée selon l'empreinte du rayon sur la face.
// Le long de la fuite du rayon (vue rasante), ce sont les rayons de chaque pixel qui font la moyenne.
vec4 texFace(int k, vec3 pl, vec3 dl, float av, float emp) {
  float couche = av > 0.0 ? uB[k + 2].w : uB[k + 3].w;
  if (couche < -0.5) return vec4(0.0);
  vec3 h = uB[k + 1].xyz;
  vec4 r = av > 0.0 ? uB[k + 5] : uB[k + 6];
  vec2 s = pl.xy / h.xy * 0.5 + 0.5;
  if (av < 0.0) s.x = 1.0 - s.x;
  vec2 uv = mix(r.xy, r.zw, vec2(s.x, 1.0 - s.y));
  vec2 e = abs(r.zw - r.xy) * vec2(textureSize(uTex, 0).xy) / (2.0 * h.xy);   // texels par unité de longueur
  float lxy = length(dl.xy);
  vec2 ax = lxy > 1e-4 ? dl.xy / lxy : vec2(1.0, 0.0);
  float P1 = length(ax * e) * emp / max(abs(dl.z), 0.04), P2 = length(vec2(-ax.y, ax.x) * e) * emp;
  return lire(uv, r, couche, max(min(P1, P2), max(P1, P2) / 6.0));
}
// Face brute vue à l'échelle 1 : la couche est lue au centre du pixel (rayon central, sans décalage), texel pour
// pixel. L'image rendue par imageDansCouche est ainsi redonnée telle quelle.
vec3 texExact(int k, vec3 c, vec3 ax, vec3 ay, vec3 az) {
  vec3 h = uB[k + 1].xyz, v = gRo0 - c;
  vec4 r = uB[k + 5];
  float t = (h.z - dot(az, v)) / dot(az, gDir0);
  vec2 q = vec2(dot(ax, v) + dot(ax, gDir0) * t, dot(ay, v) + dot(ay, gDir0) * t);
  vec2 uv = mix(r.xy, r.zw, vec2(q.x / h.x * 0.5 + 0.5, 0.5 - q.y / h.y * 0.5));
  vec2 T = vec2(textureSize(uTex, 0).xy);
  vec2 a = min(r.xy, r.zw) * T, b = max(r.xy, r.zw) * T;
  ivec2 ip = ivec2(clamp(floor(uv * T), floor(a + 0.01), ceil(b - 0.01) - 1.0));
  return texelFetch(uTex, ivec3(ip, int(uB[k + 2].w + 0.5)), 0).rgb;
}

// Lumière émise par le volume d'une boîte le long de la corde [t0, t1] (o, d : rayon dans le repère de la boîte).
// Un corps lumineux (verre > 0 : curseur) est net ; une lumière sans corps (verre 0 : lame) est une nappe douce,
// fondue vers ses bords, au cœur plus clair, et d'autant plus vive que le rayon la traverse longtemps.
vec3 emission(int k, vec3 o, vec3 d, float t0, float t1, vec3 h, float verre) {
  vec3 e = uB[k + 9].rgb;
  if (max(e.r, max(e.g, e.b)) <= 0.0 || t1 <= t0) return vec3(0.0);
  float lg = (t1 - t0) / (2.0 * min(h.x, min(h.y, h.z)));
  float net = min(lg, 1.0) * mix(0.4, 1.0, smoothstep(1.0, 5.0, lg));
  float doux = 1.0 - smoothstep(0.0, 0.1, verre);
  if (doux <= 0.0) return e * net;
  bool mx = h.x <= min(h.y, h.z), my = !mx && h.y <= h.z;        // axe le plus mince
  vec2 hb = mx ? h.yz : (my ? h.xz : h.xy);
  float w = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 q = abs(o + d * mix(t0, t1, 0.2 + 0.3 * float(i)));
    vec2 b = clamp((mx ? q.yz : (my ? q.xz : q.xy)) / hb, 0.0, 1.0);
    b = 1.0 - b * b;
    float f = b.x * b.y;
    w += f * sqrt(f) * (0.45 + 0.55 * f);
  }
  return e * mix(net, (w / 3.0) * 4.6 * (1.0 - exp(-0.085 * lg)), doux);
}

// Parcourt les boîtes et les sphères le long d'un rayon, d'avant en arrière (jusqu'à 8 boîtes traversées).
// Le verre d'une boîte est absorbé au fil du trajet : ce qui se trouve dedans (pastille, curseur, autre boîte)
// n'est assombri que par le verre réellement traversé (un seul niveau d'emboîtement : une boîte de verre rencontrée
// à l'intérieur d'une autre est traversée d'un bloc). La caméra peut se trouver dans une boîte.
// Renvoie la lumière accumulée (rgb) et ce qui reste de transparence (a) quand le rayon atteint le sol.
// ro : origine, décalée en sortie par l'épaisseur des plaques traversées (réfraction) ; d0 : chemin déjà parcouru
// (reflet) ; kr : flou propre au rayon, par unité de distance ; masque : bits des boîtes que ce rayon peut
// rencontrer (tri par tuile fait à l'avance).
vec4 tracer(inout vec3 ro, vec3 rd, float d0, float kr, int couches, bool primaire, uint masque, out float prof, out vec4 brut) {
  vec3 col = vec3(0.0), fondRd = ciel(rd);
  float tr = 1.0, kB = uAmb.x * 0.07, kd = 0.35 * uCam.z / uCam.y;
  brut = vec4(0.0);
  float tSol = (uSol.w > 0.5 && rd.y < -1e-5 && ro.y > 0.0) ? -ro.y / rd.y : 1e9;
  vec3 nS, eS;
  float tS = spheres(ro, rd, kr, nS, eS);
  float tFin = min(tSol, tS), tCur = 0.0;
  bool premier = true;
  prof = min(tFin, 100.0);
  // boîte en cours de traversée : absorption par unité de longueur, sortie, couleur du corps, face de sortie
  float mS = 0.0, mX = 1e9;
  vec3 mC = vec3(0.0);
  vec4 mT = vec4(0.0);

  for (int c = 0; c <= 8; c++) {
    // boîte suivante : la plus proche parmi celles qui n'ont pas encore été traversées
    float tB = tFin, tX = 0.0, tDeb = 0.0;
    int iB = -1;
    bool dedans = false;
    vec3 oB = vec3(0.0), dB = vec3(0.0, 0.0, 1.0);
    if (c < couches) for (int i = 0; i < NB; i++) {
      uint r = masque >> uint(i);
      if (r == 0u) break;
      if ((r & 1u) == 0u) continue;
      int k = i * KB;
      vec3 ol, dl;
      float tN, tF;
      if (!englobant(k, ro, rd, 1.0, ol, dl, tN, tF) || tN > tB) continue;
      vec3 h = uB[k + 1].xyz;
      float t = max(tN, tCur), e = 0.0;
      if (tN < max(tCur - 1e-4, 1e-4)) {
        // le volume englobant commence avant le point où en est le rayon : boîte déjà dépassée (ignorée), ou boîte
        // dans laquelle le rayon se trouve (caméra dans une plaque, rayon décalé par un verre épais) : elle est alors
        // traversée depuis l'intérieur, sans surface d'entrée
        if (tF < tCur + 1e-4 || !(primaire || tCur > 0.0)) continue;
        if (sdBoite(ol + dl * t, h, uB[k].w, uB[k + 1].w) < 0.0) {
          if (!dedans) { tB = t; iB = i; oB = ol; dB = dl; tX = tF; tDeb = tN; dedans = true; }
          continue;
        }
      }
      // quelques pas sur le champ de distance : coins et arêtes arrondis exacts
      bool ok = false;
      for (int j = 0; j < 12; j++) {
        e = sdBoite(ol + dl * t, h, uB[k].w, uB[k + 1].w);
        if (e < 1e-4) { ok = true; break; }
        t += e;
        if (t > tF) break;
      }
      if ((ok || (e < 1.5e-3 && t <= tF)) && t < tB) { tB = t; iB = i; oB = ol; dB = dl; tX = tF; dedans = false; }
    }
    if (iB >= 0) tB = max(tB, tCur);

    // verre traversé jusque-là ; si le rayon sort de la boîte en chemin, elle montre sa face de sortie
    if (mX < 1e8) {
      float a = exp(-mS * max(min(mX, tB) - tCur, 0.0));
      col += tr * (1.0 - a) * mC;
      tr *= a;
      if (mX <= tB) { col += tr * mT.rgb; tr *= 1.0 - mT.a; mX = 1e9; }
    }
    // air traversé : brume et lueur des lumières
    if (tB > tCur) {
      col += tr * (fondRd * (exp(-kB * tCur) - exp(-kB * tB)) + lueur(ro, rd, tCur, tB));
      tCur = tB;
    }
    if (iB < 0 || tr < 0.004) break;
    masque &= ~(1u << uint(iB));

    int k = iB * KB;
    vec3 h = uB[k + 1].xyz;
    float r = uB[k].w, bz = uB[k + 1].w;
    vec4 p7 = uB[k + 7], p8 = uB[k + 8], p9 = uB[k + 9], p10 = uB[k + 10];
    float ecr = uB[k + 4].w, op = p9.w, verre = p7.w;
    float pres = smoothstep(0.0, 0.1, verre);          // présence du corps : à verre 0, il ne reste que la texture
    float fb = exp(-kB * tB), a1 = 0.0, fa = 0.0, fr = 0.04, corde = tX - tB;
    float emp = uCam.w * (d0 + tB) * 0.7 + kr * tB + kd * abs(d0 + tB - uCam.y);   // empreinte du rayon
    vec3 ecl = vec3(0.0);
    bool faceTex = false;
    if (dedans) corde = tX - tDeb;
    else {
      if (premier) prof = min(tB, 100.0);
      vec3 pl = oB + dB * tB;
      float d2 = contour(pl.xy, h.xy, r);
      vec3 nl;
      if (abs(pl.z) > h.z - 2e-4 && d2 < -bz) nl = vec3(0.0, 0.0, sign(pl.z));
      else {
        vec2 q = vec2(1.0, -1.0) * min(1e-4, 0.25 * bz + 1e-5);
        nl = normalize(q.xyy * sdBoite(pl + q.xyy, h, r, bz) + q.yyx * sdBoite(pl + q.yyx, h, r, bz) + q.yxy * sdBoite(pl + q.yxy, h, r, bz) + q.xxx * sdBoite(pl + q.xxx, h, r, bz));
      }
      vec3 ax = mix(uB[k + 2].xyz, uB[k + 12].xyz, gTau), ay = mix(uB[k + 3].xyz, uB[k + 13].xyz, gTau), az = mix(uB[k + 4].xyz, uB[k + 14].xyz, gTau);
      vec3 n = normalize(nl.x * ax + nl.y * ay + nl.z * az);
      fa = smoothstep(0.6, 0.95, abs(nl.z));            // 1 sur les grandes faces, 0 sur les chants
      float av = nl.z >= 0.0 ? 1.0 : -1.0;
      vec4 tx = fa > 0.0 ? texFace(k, pl, dB, av, emp) * fa : vec4(0.0);
      faceTex = fa > 0.5 && (av > 0.0 ? uB[k + 2].w : uB[k + 3].w) > -0.5;

      // face brute : l'image de la couche, telle quelle
      float wb = (av > 0.0 && fa > 0.99) ? p10.x * op : 0.0;
      if (wb > 0.0) {
        vec3 tb = tx.rgb;
        float ex = uB[k + 11].w;
        if (ex > 0.0) tb = mix(tb, texExact(k, mix(uB[k].xyz, uB[k + 11].xyz, gTau), ax, ay, az), ex);
        if (primaire && premier) {
          brut = vec4(tb, 1.0) * wb;
          if (wb > 0.999) return vec4(0.0);
        } else {
          col += tr * wb * tb;
          tr *= 1.0 - wb;
        }
      }
      premier = false;

      vec3 pw = ro + rd * tB, cs = vec3(0.0);
      float cv = clamp(dot(-rd, n), 0.0, 1.0);
      fr = 0.04 + 0.96 * pow(1.0 - cv, 5.0);
      // reflet du studio (Fresnel). Sur une arête arrondie plus fine que l'empreinte du rayon, le reflet rasant est
      // remplacé par sa moyenne : sinon ce filet très clair sème des grains dans les flous.
      float cvR = max(cv, 0.75 * sqrt((1.0 - fa) * min(emp / max(bz, 1e-4), 1.0)));
      float frR = 0.04 + 0.96 * pow(1.0 - cvR, 5.0);
      float ch = 1.0 - smoothstep(0.2, 0.62, abs(nl.z));  // 1 sur les chants
      float zc = pl.z / h.z, z2 = min(zc * zc, 1.0);
      // sur les faces : affaibli là où un écran est allumé ; sur les chants : verre poli, cœur sombre et bords clairs
      float wr = p8.w * pres * mix(frR * (1.0 + 0.9 * (1.0 - fa)) * (1.0 - 0.45 * tx.a), (0.16 + 0.84 * frR) * (0.25 + 0.75 * z2), ch);
      if (wr > 0.0) cs += wr * reflets(pw, reflect(rd, n), primaire);
      ecl = eclairage(pw, n, iB, primaire);
      // écran de la face d'entrée
      cs += tx.rgb * ecr;
      a1 = tx.a;
      // chants : lumière conduite par le verre (cœur sombre, bords clairs), plus celle qu'ils reçoivent
      float cle = 0.3 + 0.95 * pow(max(dot(n, vec3(-0.37, 0.82, 0.43)), 0.0), 1.5);
      cle = mix(cle, 1.0, smoothstep(0.3, 1.0, max(p8.r, max(p8.g, p8.b))));
      vec3 lum = ch * (p8.rgb * (cle * (0.14 + 1.36 * z2 * z2) * (1.0 + 2.5 * dot(ecl, vec3(0.33)))) + ecl * (0.05 * verre));
      // filet clair de l'arête et liseré le long du bord des faces, élargis à l'empreinte du rayon (même énergie,
      // sans grain) ; g : position en travers de l'arête (< −biseau sur la face, > biseau sur le chant)
      float g = d2 - (abs(pl.z) - h.z), wA = max(bz, emp), gA = g / wA;
      lum += p8.rgb * (1.5 * cle * exp(-2.2 * gA * gA) * (bz / wA) * min(1.0, sqrt(0.005 / max(bz, 1e-4))));
      float wL = max(0.022, 1.5 * emp), lis = fa * smoothstep(-wL, 0.0, d2 + bz);
      lum += p8.rgb * (0.4 * lis * lis * (0.022 / wL));
      cs += (1.0 - a1) * pres * lum;
      col += tr * op * fb * cs;
    }
    // volume émissif (curseur, lame de lumière)
    col += tr * op * fb * emission(k, oB, dB, tB, tX, h, verre);
    tr *= 1.0 - op * a1;
    if (tr < 0.004) break;

    // épaisseur du verre : ce qui est derrière est vu décalé (réfraction, indice 1,5)
    if (!dedans && fa * pres > 0.0) {
      float cz = abs(dB.z);
      vec2 dec = -(tX - tB) * dB.xy * ((1.0 - cz / sqrt(1.25 + cz * cz)) * fa * pres);
      float ld = length(dec);
      if (ld > 1e-6) {
        dec *= min(1.0, 2.0 * h.z / ld);
        ro += mix(uB[k + 2].xyz, uB[k + 12].xyz, gTau) * dec.x + mix(uB[k + 3].xyz, uB[k + 13].xyz, gTau) * dec.y;
        oB.xy += dec;
        tSol = (uSol.w > 0.5 && rd.y < -1e-5 && ro.y > 0.0) ? -ro.y / rd.y : 1e9;
        if (tS > tX) tS = spheres(ro, rd, kr, nS, eS);   // une sphère dans l'épaisseur du verre reste à sa place
        tFin = min(tSol, tS);
      }
    }

    // corps en verre fumé, absorbé le long de la corde, et face de sortie vue par transparence (en miroir),
    // sauf si la face d'entrée porte déjà une texture
    float T = clamp((1.0 - op + op * (1.0 - a1) * (1.0 - verre)) / max(1.0 - op * a1, 1e-4), 1e-9, 1.0);
    vec4 t2 = vec4(0.0);
    if (!faceTex && p10.w > 0.0 && T > 0.01) {
      vec3 ps = oB + dB * tX;
      if (abs(ps.z) > h.z - 1e-4 && contour(ps.xy, h.xy, r) < -bz) t2 = texFace(k, ps, dB, sign(ps.z), emp) * p10.w;
    }
    t2 = vec4(t2.rgb * (ecr * op * fb), t2.a * op);
    if (T < 0.9999 || t2.a > 0.0) {
      vec3 cC = (p7.rgb * (1.0 + 4.0 * fr) + ecl * (0.028 * fa)) * fb;
      if (mX > 1e8 && tX > tCur + 1e-5) { mS = -log(T) / max(corde, 1e-5); mX = tX; mC = cC; mT = t2; }
      else {   // déjà dans une autre boîte : celle-ci est traversée d'un bloc
        col += tr * (1.0 - T) * cC; tr *= T;
        col += tr * t2.rgb; tr *= 1.0 - t2.a;
      }
    }
    if (tr < 0.004) break;
  }
  // bout du rayon : une sphère, le sol ou l'infini
  if (tFin > 1e8) tr = 0.0;
  else if (tS < tSol) { col += tr * exp(-kB * tFin) * braise(eS, max(dot(-rd, nS), 0.0)); tr = 0.0; }
  return vec4(col, tr);
}

void main() {
  vec3 somme = vec3(0.0);
  vec4 sommeBrut = vec4(0.0);
  float sommeProf = 0.0;
  int K = int(uEch2.z);
  float n = uEch.w * uEch2.z;
  vec2 px = gl_FragCoord.xy + uEch.xy;
  vec2 ndc = (px - 0.5 * uRes) / (0.5 * uRes.y) * uCam.x;
  vec2 ndc0 = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y) * uCam.x;
  uvec4 mq = texelFetch(uTuiles, ivec2(gl_FragCoord.xy) / ${TU}, 0);
  // angle propre au pixel (et à l'image) : il tourne la spirale des tirages de la rugosité du sol, pour qu'aucune
  // trame commune ne se dessine dans les reflets très flous
  uint gr = hacher(uint(gl_FragCoord.x) + 8192u * uint(gl_FragCoord.y) + 40503u * uint(uTrame.z));
  float rot = 6.2831853 * alea(gr);
  for (int k = 0; k < 4; k++) {
    if (k >= K) break;
    float s = uEch.z * uEch2.z + float(k);
    // tirages propres au pixel : un motif à gradient entrelacé, tourné et décalé à chaque rayon et à chaque image
    // (pixels voisins bien répartis : l'erreur qui reste est fine, sans direction, et ne reste pas figée à l'écran)
    float am = s * 2.39996323;
    vec2 fc = mat2(cos(am), sin(am), -sin(am), cos(am)) * gl_FragCoord.xy + 5.588238 * s + uTrame.xy;
    vec2 x1 = vec2(motif(fc), motif(fc.yx + 31.7)), x2 = vec2(motif(fc + 67.3), motif(fc.yx + 113.1)), x3 = vec2(motif(fc + 151.9), motif(fc.yx + 197.5));
    // instant du rayon dans l'intervalle de la passe : le flou de mouvement est un filé continu, sans copies
    gTau = (float(k) + motif(fc + 233.3)) / uEch2.z;
    vec3 cP = mix(uCamP, uCamP2, gTau), cF = mix(uCamF, uCamF2, gTau), cR = mix(uCamR, uCamR2, gTau), cU = mix(uCamU, uCamU2, gTau);
    vec3 dir = cF + cR * ndc.x + cU * ndc.y;
    vec3 ro = cP;
    gRo0 = cP; gDir0 = cF + cR * ndc0.x + cU * ndc0.y;
    if (uCam.z > 0.0) {
      // objectif à ouverture : le rayon part d'un point de la lentille et vise le plan de mise au point
      vec2 l = disque(s, n, x1) * uCam.z;
      vec3 foyer = cP + dir * uCam.y;
      ro += cR * l.x + cU * l.y;
      dir = foyer - ro;
    }
    vec3 rd = normalize(dir);
    float prof;
    vec4 brut;
    vec4 A = tracer(ro, rd, 0.0, 0.0, 8, true, mq.r, prof, brut);
    vec3 col = A.rgb;
    if (A.a > 0.003) {
      // sol laqué : lumière reçue, émission, et un reflet rendu flou par la rugosité (normale perturbée)
      float tSol = -ro.y / rd.y;
      vec3 p = ro + rd * tSol;
      vec3 cs = solLumiere(p, true, vec3(x3, mod(s * uEch2.y + 5.0, n)), mq.b);
      float cv = clamp(-rd.y, 0.0, 1.0);
      float R = uSol.x * (0.55 + 0.45 * pow(1.0 - cv, 2.0));
      R = mix(R, 1.0, pow(1.0 - cv, 9.0) * step(1e-4, uSol.x));
      if (R > 0.0) {
        float si = mod(s * uEch2.x + 3.0, n), ra = sqrt((si + x2.x) / n), an = si * 2.39996323 + rot;
        vec2 dj = ra * vec2(cos(an), sin(an));
        dj *= 0.5 + 0.5 * dot(dj, dj);
        vec3 nn = normalize(vec3(dj.x * uSol.y * 0.5, 1.0, dj.y * uSol.y * 0.5));
        vec3 rr = reflect(rd, nn);
        rr.y = abs(rr.y) + 1e-3;
        rr = normalize(rr);
        float p2;
        vec4 b2;
        vec3 q = p + vec3(0.0, 2e-4, 0.0);
        vec4 Rf = tracer(q, rr, tSol, uSol.y * 0.3, 5, false, mq.g, p2, b2);
        cs += R * plafond(Rf.rgb, 4.0);
      }
      col += A.a * exp(-uAmb.x * 0.07 * tSol) * cs;
    }
    somme += col * (1.0 - brut.a);
    sommeBrut += brut;
    sommeProf += prof;
  }
  float w = 1.0 / n;
  oHDR = vec4(somme * w, 0.0);
  oBrut = sommeBrut * w;
  oProf = vec4(sommeProf * w, 0.0, 0.0, 0.0);
}`;

  // Texture venue d'une toile 2D (alpha prémultiplié, sRGB) -> linéaire prémultiplié (la cible sRGB réencode).
  const FS_CONV = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
out vec4 o;
vec3 versLineaire(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void main() {
  vec4 c = texelFetch(uSrc, ivec2(gl_FragCoord.xy), 0);
  vec3 d = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
  o = vec4(versLineaire(clamp(d, 0.0, 1.0)) * c.a, c.a);
}`;

  // Bloom : réduction (13 prélèvements) ; au premier niveau, seules les hautes lumières passent pleinement.
  const FS_BAS = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec4 uD;      // taille d'un texel de la source (xy), 1/taille de la cible (zw)
uniform float uSeuil;
out vec4 o;
vec3 e(vec2 uv, float x, float y) {
  vec3 c = texture(uSrc, uv + vec2(x, y) * uD.xy).rgb;
  if (uSeuil > 0.5) { float m = max(c.r, max(c.g, c.b)); c *= mix(0.1, 1.0, smoothstep(0.75, 2.6, m)); }
  return c;
}
void main() {
  vec2 uv = gl_FragCoord.xy * uD.zw;
  vec3 c = e(uv, 0.0, 0.0) * 0.125;
  c += (e(uv, -1.0, -1.0) + e(uv, 1.0, -1.0) + e(uv, -1.0, 1.0) + e(uv, 1.0, 1.0)) * 0.125;
  c += (e(uv, -2.0, 0.0) + e(uv, 2.0, 0.0) + e(uv, 0.0, -2.0) + e(uv, 0.0, 2.0)) * 0.0625;
  c += (e(uv, -2.0, -2.0) + e(uv, 2.0, -2.0) + e(uv, -2.0, 2.0) + e(uv, 2.0, 2.0)) * 0.03125;
  o = vec4(c, 1.0);
}`;
  // Bloom : agrandissement (tente 3 × 3), ajouté au niveau supérieur.
  const FS_HAUT = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec4 uD;      // taille d'un texel de la source (xy), 1/taille de la cible (zw)
uniform float uPoids;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy * uD.zw, d = uD.xy;
  vec3 c = texture(uSrc, uv).rgb * 4.0;
  c += (texture(uSrc, uv + vec2(d.x, 0.0)).rgb + texture(uSrc, uv - vec2(d.x, 0.0)).rgb + texture(uSrc, uv + vec2(0.0, d.y)).rgb + texture(uSrc, uv - vec2(0.0, d.y)).rgb) * 2.0;
  c += texture(uSrc, uv + d).rgb + texture(uSrc, uv - d).rgb + texture(uSrc, uv + vec2(d.x, -d.y)).rgb + texture(uSrc, uv + vec2(-d.x, d.y)).rgb;
  o = vec4(c * (uPoids / 16.0), 1.0);
}`;

  // Passe finale : bloom, vignette, courbe de tons, faces brutes, grain fixe, tramage.
  const FS_FINAL = `#version 300 es
precision highp float;
uniform sampler2D uHDR, uBrut, uBloom;
uniform vec4 uP;      // vignette, grain, bloom, exposition
uniform vec4 uMode;   // retournement vertical, sortie vers une couche de texture, largeur, hauteur
out vec4 o;
${GLSL_HASARD}
vec3 versEcran(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 versLineaire(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
// Courbe de tons : fidèle jusqu'à 0,72, puis épaule douce vers 1. Les couleurs vives gardent leur teinte.
float ton1(float x) { return x < 0.72 ? x : 0.72 + 0.28 * (1.0 - exp(-(x - 0.72) / 0.28)); }
vec3 ton(vec3 c) {
  float m = max(c.r, max(c.g, c.b));
  vec3 a = c * (ton1(m) / max(m, 1e-6));
  vec3 b = vec3(ton1(c.r), ton1(c.g), ton1(c.b));
  return mix(a, b, 0.32);
}
void main() {
  ivec2 ip = ivec2(gl_FragCoord.xy);
  if (uMode.x > 0.5) ip.y = int(uMode.w) - 1 - ip.y;
  vec2 uv = (vec2(ip) + 0.5) / uMode.zw;
  vec4 hdr = texelFetch(uHDR, ip, 0), br = texelFetch(uBrut, ip, 0);
  vec3 bl = texture(uBloom, uv).rgb * uP.z;
  float a = clamp(br.a, 0.0, 1.0);
  vec2 q = (uv - 0.5) * vec2(uMode.z / uMode.w, 1.0);
  float vg = 1.0 - uP.x * smoothstep(0.35, 1.08, length(q));
  vec3 c = (hdr.rgb / max(1.0 - a, 1e-3) + bl) * (uP.w * vg);
  vec3 l = ton(c) * (1.0 - a) + br.rgb + bl * a;
  vec3 d = versEcran(clamp(l, 0.0, 1.0));
  uint g = hacher(uint(ip.x) + 8192u * uint(ip.y) + 977u);
  float n1 = alea(g), n2 = alea(g), n3 = alea(g), n4 = alea(g);
  if (uMode.y < 0.5) {
    float lum = dot(d, vec3(0.3, 0.59, 0.11));
    d += uP.y * (n1 + n2 - 1.0) * (0.35 + 0.65 * sqrt(lum));
  }
  d += (n3 + n4 - 1.0) / 255.0 * (1.0 - a);   // une face brute est déjà tramée
  d = clamp(d, 0.0, 1.0);
  o = vec4(uMode.y > 0.5 ? versLineaire(d) : d, 1.0);
}`;

  // Poussières : petits disques ajoutés à la lumière de la scène (flous hors du plan de mise au point), étirés
  // en traits selon leur déplacement à l'écran entre le début et la fin de l'obturateur.
  const VS_POUSSIERE = `#version 300 es
precision highp float;
uniform vec3 uCamP, uCamF, uCamR, uCamU;       // caméra au début de l'obturateur
uniform vec3 uCamP2, uCamF2, uCamR2, uCamU2;   // caméra à la fin
uniform vec4 uCam;       // tan(fov/2), mise au point, ouverture, temps
uniform vec4 uVue;       // largeur, hauteur, cible au sol (xz)
uniform vec4 uL[${NL * 2}];
uniform int uNL;
uniform float uGain;
uniform sampler2D uProf;
out vec3 vq;
out vec4 vc;
uint hacher(uint x) { x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16; return x; }
float al(uint n) { return float(hacher(n) >> 8) * (1.0 / 16777216.0); }
void main() {
  uint id = uint(gl_InstanceID) * 16u + 11u;
  vec2 q = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  // nuage fixe dans le monde, replié autour de la cible ; dérive très lente
  vec3 T = vec3(7.0, 2.6, 7.0);
  vec3 p = vec3(al(id), al(id + 1u), al(id + 2u)) * T;
  p += uCam.w * (vec3(al(id + 3u), al(id + 4u), al(id + 5u)) - 0.5) * vec3(0.05, 0.03, 0.05);
  p.xz = uVue.zw + (fract((p.xz - uVue.zw) / T.xz + 0.5) - 0.5) * T.xz;
  p.y = 0.02 + fract(p.y / T.y) * T.y;
  vec3 v1 = p - uCamP, v2 = p - uCamP2;
  float z1 = dot(v1, uCamF), z2 = dot(v2, uCamF2), z = 0.5 * (z1 + z2), dist = 0.5 * (length(v1) + length(v2));
  float f = 0.5 * uVue.y / uCam.x;
  vec2 c1 = vec2(dot(v1, uCamR), dot(v1, uCamU)) / max(z1, 1e-3) * f, c2 = vec2(dot(v2, uCamR2), dot(v2, uCamU2)) / max(z2, 1e-3) * f;
  vec2 c = 0.5 * (c1 + c2), dm = 0.5 * (c2 - c1);
  float lm = length(dm);
  vec2 um = lm > 1e-3 ? dm / lm : vec2(1.0, 0.0);
  lm = min(lm, 600.0);
  float a5 = al(id + 6u);
  float rp = mix(0.0014, 0.0052, a5 * a5) * f / max(z, 1e-3);
  float coc = uCam.z * f * abs(1.0 / max(z, 1e-3) - 1.0 / uCam.y);
  float R = min(rp + coc + 0.8, 30.0);
  // lumière reçue : un peu d'ambiance, surtout les lumières ponctuelles
  vec3 e = vec3(0.03, 0.03, 0.033) * (0.25 + 2.6 * pow(al(id + 7u), 8.0));
  for (int i = 0; i < ${NL}; i++) {
    if (i >= uNL) break;
    vec3 L = uL[i * 2].xyz - p;
    float d2 = dot(L, L), fe = max(1.0 - sqrt(d2) / uL[i * 2].w, 0.0);
    e += uL[i * 2 + 1].rgb * (0.05 * fe * fe / (d2 + 0.06));
  }
  // cachée si un objet est devant
  ivec2 ip = clamp(ivec2(c + 0.5 * uVue.xy), ivec2(0), ivec2(uVue.xy) - 1);
  float vis = smoothstep(dist - 0.08, dist + 0.02, texelFetch(uProf, ip, 0).r) * smoothstep(0.6, 1.8, min(z1, z2));
  // même énergie, étalée sur la surface du trait
  float etale = 3.14159 * R / (3.14159 * R + 4.0 * lm);
  vc = vec4(e * (uGain * vis * etale * pow(rp * rp / (R * R), 0.72)), R);
  vq = vec3(q.x * (lm + R), q.y * R, lm);
  gl_Position = vec4((c + um * (q.x * (lm + R)) + vec2(-um.y, um.x) * (q.y * R)) / (0.5 * uVue.xy), 0.0, 1.0);
}`;
  const FS_POUSSIERE = `#version 300 es
precision highp float;
in vec3 vq;
in vec4 vc;
out vec4 o;
void main() {
  float d = length(vec2(max(abs(vq.x) - vq.z, 0.0), vq.y)) / vc.a;
  o = vec4(vc.rgb * smoothstep(1.0, 1.0 - max(1.6 / vc.a, 0.4), d), 0.0);
}`;

  // ---------------------------------------------------------------- création
  function creer(canvas, opt = {}) {
    const W = opt.largeur ?? 1920, H = opt.hauteur ?? 1080, NC = opt.couches ?? 16, TL = opt.texL ?? 2048, TH = opt.texH ?? 1152;
    canvas.width = W; canvas.height = H;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: true, premultipliedAlpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("Moteur : WebGL2 indisponible");
    const flottant = gl.getExtension("EXT_color_buffer_float"), melange32 = gl.getExtension("EXT_float_blend"), lineaire32 = gl.getExtension("OES_texture_float_linear");
    gl.getExtension("EXT_color_buffer_half_float");
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    if (!flottant) throw new Error("Moteur : tampons flottants indisponibles");
    if (gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) < NB * KB + NS * KS + NL * 2 + NE * 4 + 40) throw new Error("Moteur : trop peu d'uniformes sur cette carte graphique");
    // accumulation en 32 bits si le mélange y est permis (somme exacte), sinon en 16 bits
    const F_ACC = melange32 && lineaire32 ? gl.RGBA32F : gl.RGBA16F;
    const infos = { accumulation: F_ACC === gl.RGBA32F ? "RGBA32F" : "RGBA16F", anisotropie: aniso ? Math.min(16, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 1 };

    // ---------- programmes
    function shader(type, src, nom) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Moteur, shader ${nom} : ${gl.getShaderInfoLog(s)}`);
      return s;
    }
    function programme(vs, fs, nom) {
      const p = gl.createProgram();
      gl.attachShader(p, shader(gl.VERTEX_SHADER, vs, nom + " (sommets)")); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs, nom));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Moteur, programme ${nom} : ${gl.getProgramInfoLog(p)}`);
      const u = {};
      for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
        const nomU = gl.getActiveUniform(p, i).name;
        u[nomU.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, nomU);
      }
      return { p, u };
    }
    const t0 = performance.now();
    const P = {
      scene: programme(VS_PLEIN, FS_SCENE, "scène"),
      conv: programme(VS_PLEIN, FS_CONV, "conversion"),
      bas: programme(VS_PLEIN, FS_BAS, "bloom, réduction"),
      haut: programme(VS_PLEIN, FS_HAUT, "bloom, agrandissement"),
      final: programme(VS_PLEIN, FS_FINAL, "finale"),
      poussiere: programme(VS_POUSSIERE, FS_POUSSIERE, "poussières"),
    };
    infos.compilation = Math.round(performance.now() - t0);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

    // ---------- textures et cibles
    function tex2D(w, h, format, filtre) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, format, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtre); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtre);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    function fbo(textures, niveau = 0) {
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      textures.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, niveau));
      gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Moteur : cible de rendu incomplète");
      return f;
    }
    // Une cible : tampons d'accumulation et chaîne du bloom, à une résolution donnée.
    const _cibles = {};
    function cible(w, h) {
      const cle = w + "x" + h;
      if (_cibles[cle]) return _cibles[cle];
      const c = { w, h, bloom: [] };
      c.hdr = tex2D(w, h, F_ACC, gl.LINEAR);
      c.brut = tex2D(w, h, F_ACC, gl.NEAREST);
      c.prof = tex2D(w, h, gl.R16F, gl.NEAREST);
      c.fbo = fbo([c.hdr, c.brut, c.prof]);
      c.fboHdr = fbo([c.hdr]);
      let bw = w, bh = h;
      for (let i = 0; i < NIV_BLOOM; i++) {
        bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
        const t = tex2D(bw, bh, gl.RGBA16F, gl.LINEAR);
        c.bloom.push({ w: bw, h: bh, t, f: fbo([t]) });
      }
      return (_cibles[cle] = c);
    }

    // couches de textures : sRGB, alpha prémultiplié (en linéaire), mipmaps, filtrage anisotrope
    const NIVEAUX = Math.floor(Math.log2(Math.max(TL, TH))) + 1;
    const couches = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, couches);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, NIVEAUX, gl.SRGB8_ALPHA8, TL, TH, NC);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D_ARRAY, aniso.TEXTURE_MAX_ANISOTROPY_EXT, infos.anisotropie);
    // texture de passage : reçoit une couche (toile ou rendu), calcule ses mipmaps, puis est copiée dans le tableau
    const passage = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, passage);
    gl.texStorage2D(gl.TEXTURE_2D, NIVEAUX, gl.SRGB8_ALPHA8, TL, TH);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const passageFbo = [];
    for (let n = 0; n < NIVEAUX; n++) passageFbo.push(fbo([passage], n));
    const depot = tex2D(TL, TH, gl.RGBA8, gl.NEAREST);   // toile telle qu'envoyée par le navigateur
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    function plein() { gl.drawArrays(gl.TRIANGLES, 0, 3); }
    function passageVersCouche(i) {
      gl.bindTexture(gl.TEXTURE_2D, passage);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, couches);
      for (let n = 0; n < NIVEAUX; n++) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, passageFbo[n]);
        gl.copyTexSubImage3D(gl.TEXTURE_2D_ARRAY, n, 0, 0, i, 0, 0, Math.max(1, TL >> n), Math.max(1, TH >> n));
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // ---------- toiles 2D
    const toiles = [];
    // part de la couche occupée par son image : [1, 1], sauf après imageDansCouche (image à la taille du plateau)
    const UV11 = [1, 1], echelleCouche = Array.from({ length: NC }, () => UV11);
    let derniereCouche = -1;   // dernière couche écrite (pour attendre())
    function toile(i) {
      if (i < 0 || i >= NC) throw new Error(`Moteur : couche ${i} hors limites (0 à ${NC - 1})`);
      if (!toiles[i]) {
        const c = document.createElement("canvas");
        c.width = TL; c.height = TH;
        toiles[i] = { canvas: c, ctx: c.getContext("2d"), L: TL, H: TH };
      }
      return toiles[i];
    }
    function televerser(i) {
      const t = toile(i);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, depot);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, t.canvas);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);   // à remettre : sinon l'envoi de données entières se bloque
      gl.bindFramebuffer(gl.FRAMEBUFFER, passageFbo[0]);
      gl.viewport(0, 0, TL, TH);
      gl.disable(gl.BLEND);
      gl.useProgram(P.conv.p);
      gl.uniform1i(P.conv.u.uSrc, 0);
      plein();
      passageVersCouche(i);
      echelleCouche[i] = UV11;
      derniereCouche = i;
    }

    // ---------- description de scène -> uniformes
    const TB = new Float32Array(NB * KB * 4), TS = new Float32Array(NS * KS * 4), TLu = new Float32Array(NL * 2 * 4), TE = new Float32Array(NE * 4 * 4);
    const COINS = new Float32Array(NB * 24), COINS2 = new Float32Array(NB * 24), MQ = new Uint32Array(TUX * TUY * 4);
    const tuilesTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tuilesTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32UI, TUX, TUY);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Tri des boîtes par tuile d'écran, refait à chaque passe. Trois masques de bits par tuile : boîtes que peut
    // toucher le rayon direct, boîtes visibles dans le reflet du sol, boîtes qui peuvent porter une ombre sur le
    // sol vu dans la tuile. Chaque boîte est prise au début et à la fin de l'intervalle de temps de la passe (avec
    // la caméra de chaque instant) ; les marges couvrent le flou de l'objectif, la rugosité du sol, la taille des
    // lumières et le décalage dû à l'épaisseur du verre : le tri n'écarte que des boîtes qui n'auraient rien changé.
    const PTS = new Float32Array(24), RC = new Float64Array(7);
    function tuiles(c, camA, camB, sc, nb, nl, tout, decalage) {
      const nx = Math.min(TUX, Math.ceil(c.w / TU)), ny = Math.min(TUY, Math.ceil(c.h / TU));
      const marquer = (canal, bit, x0, y0, x1, y1) => {
        const a = Math.max(0, Math.floor(x0 / TU)), b = Math.max(0, Math.floor(y0 / TU)), a1 = Math.min(nx - 1, Math.floor(x1 / TU)), b1 = Math.min(ny - 1, Math.floor(y1 / TU));
        for (let y = b; y <= b1; y++) for (let x = a; x <= a1; x++) MQ[(y * TUX + x) * 4 + canal] |= bit;
      };
      // Rectangle à l'écran : RC = [x0, y0, x1, y1, marge, points devant, points derrière]. etendre() y ajoute n
      // points vus par une caméra ; margeMonde est une marge en unités du monde.
      const raz = () => { RC[0] = RC[1] = 1e9; RC[2] = RC[3] = -1e9; RC[4] = RC[5] = RC[6] = 0; };
      const etendre = (cam, pts, o, n, margeMonde) => {
        const k = c.h / 2 / cam.tanF, ouv = Math.max(cam.ouverture, 0), mise = Math.max(cam.mise, 1e-3), P = cam.pos, F = cam.f, R = cam.r, Uu = cam.u;
        for (let j = 0; j < n; j++) {
          const vx = pts[o + j * 3] - P[0], vy = pts[o + j * 3 + 1] - P[1], vz = pts[o + j * 3 + 2] - P[2];
          const z = vx * F[0] + vy * F[1] + vz * F[2];
          if (z <= 0.03) { RC[6]++; continue; }
          RC[5]++;
          const x = c.w / 2 + ((vx * R[0] + vy * R[1] + vz * R[2]) / z) * k, y = c.h / 2 + ((vx * Uu[0] + vy * Uu[1] + vz * Uu[2]) / z) * k;
          RC[0] = Math.min(RC[0], x); RC[2] = Math.max(RC[2], x); RC[1] = Math.min(RC[1], y); RC[3] = Math.max(RC[3], y);
          RC[4] = Math.max(RC[4], ouv * k * Math.abs(1 / z - 1 / mise) + (margeMonde * k) / z);
        }
      };
      const poser = (canal, bit, margeFixe) => {
        if (!RC[5]) return;
        if (RC[6]) return marquer(canal, bit, 0, 0, c.w, c.h);   // à cheval sur le plan de la caméra : partout
        const m = RC[4] * 1.1 + margeFixe + 3;
        marquer(canal, bit, RC[0] - m, RC[1] - m, RC[2] + m, RC[3] + m);
      };
      MQ.fill(0);
      const sol = sc.sol, reflet = sol?.reflet ?? 0.6, rug = sol?.rugosite ?? 0.1, Hc = Math.min(camA.pos[1], camB.pos[1]);
      const tanA = Math.tan(2 * Math.atan(rug * 0.5)), kA = c.h / 2 / camA.tanF;
      for (let i = 0; i < nb; i++) {
        const bit = (1 << i) >>> 0, o = i * 24;
        if (tout) { marquer(0, bit, 0, 0, c.w, c.h); marquer(1, bit, 0, 0, c.w, c.h); marquer(2, bit, 0, 0, c.w, c.h); continue; }
        // rayon direct
        raz(); etendre(camA, COINS, o, 8, decalage); etendre(camB, COINS2, o, 8, decalage); poser(0, bit, 0);
        // reflet : la boîte en miroir sous le sol, élargie par la rugosité (d'autant plus que le point est haut)
        if (reflet > 0) {
          if (Hc <= 0.01) marquer(1, bit, 0, 0, c.w, c.h);
          else {
            let mr = 0;
            raz();
            for (const [cam, coins] of [[camA, COINS], [camB, COINS2]]) {
              for (let j = 0; j < 8; j++) { const y = Math.abs(coins[o + j * 3 + 1]); PTS[j * 3] = coins[o + j * 3]; PTS[j * 3 + 1] = -y; PTS[j * 3 + 2] = coins[o + j * 3 + 2]; mr = Math.max(mr, y / (Hc + y)); }
              etendre(cam, PTS, 0, 8, decalage);
            }
            poser(1, bit, 1.65 * kA * tanA * mr);
          }
        }
        // ombres : la boîte projetée sur le sol depuis chaque lumière (jusqu'à la portée de la lumière)
        if (TB[i * KB * 4 + 41] > 0) for (let l = 0; l < nl; l++) {
          const lx = TLu[l * 8], ly = TLu[l * 8 + 1], lz = TLu[l * 8 + 2], portee = TLu[l * 8 + 3] * 1.2;
          const P = camA.pos, F = camA.f;
          let mo = 0, n = 0;
          for (let j = 0; j < 8; j++) {
            const cx = COINS[o + j * 3] - lx, cy = COINS[o + j * 3 + 1], cz = COINS[o + j * 3 + 2] - lz;
            let e = cy < ly - 0.02 ? ly / (ly - cy) : 1e6;
            const h = Math.hypot(cx, cz) * e;
            if (h > portee) e *= portee / h;
            if (!(e > 0)) continue;
            PTS[n * 3] = lx + cx * e; PTS[n * 3 + 1] = 0; PTS[n * 3 + 2] = lz + cz * e;
            const vz = (PTS[n * 3] - P[0]) * F[0] + (0 - P[1]) * F[1] + (PTS[n * 3 + 2] - P[2]) * F[2];
            mo = Math.max(mo, (0.07 * Math.min(e, 60) * 1.5 * kA) / Math.max(vz, 0.05));
            n++;
          }
          if (n) { raz(); etendre(camA, PTS, 0, n, 0); etendre(camB, PTS, 0, n, 0); poser(2, bit, Math.min(mo, 4000)); }
        }
      }
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, tuilesTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TUX, TUY, gl.RGBA_INTEGER, gl.UNSIGNED_INT, MQ);
      gl.activeTexture(gl.TEXTURE0);
    }

    const ORANGE = [1, 0.35, 0.12], ZERO = [0, 0, 0], UV1 = [0, 0, 1, 1];
    // Face brute : à quel point elle est vue à l'échelle 1 (un texel par pixel, de face, nette). 1 = lecture exacte.
    function exactitude(cam, c, b, c0, ax, uf) {
      const d = b.d, pf = [c0[0] + ax[2][0] * d[2], c0[1] + ax[2][1] * d[2], c0[2] + ax[2][2] * d[2]];
      const z = dot(sub(pf, cam.pos), cam.f);
      if (z <= 1e-3) return 0;
      const px = ((2 * cam.tanF) / c.h) * z;                         // taille d'un pixel sur la face
      const sx = (px * Math.abs(uf[2] - uf[0]) * TL) / (2 * d[0]), sy = (px * Math.abs(uf[3] - uf[1]) * TH) / (2 * d[1]);
      const penche = Math.acos(Math.min(1, Math.abs(dot(ax[2], cam.f)))), tourne = Math.acos(Math.min(1, Math.abs(dot(ax[0], cam.r))));
      const flou = (Math.max(cam.ouverture, 0) * (c.h / 2 / cam.tanF) * Math.abs(1 / z - 1 / Math.max(cam.mise, 1e-3))) * 0.01;
      const ecart = Math.max(Math.abs(sx - 1), Math.abs(sy - 1), penche, tourne, flou);
      return 1 - Math.min(1, Math.max(0, (ecart - 0.003) / 0.009));
    }
    // Remplit les uniformes de la passe. scA, scB : la scène au début et à la fin de l'intervalle de temps de la
    // passe (la même si rien ne bouge) ; caméra, boîtes et sphères sont interpolées par le shader, rayon par rayon.
    function remplir(scA, scB, c, U) {
      const cam = repere(scA.cam), cam2 = scB === scA ? cam : repere(scB.cam);
      gl.uniform3fv(U.uCamP, cam.pos); gl.uniform3fv(U.uCamF, cam.f); gl.uniform3fv(U.uCamR, cam.r); gl.uniform3fv(U.uCamU, cam.u);
      gl.uniform3fv(U.uCamP2, cam2.pos); gl.uniform3fv(U.uCamF2, cam2.f); gl.uniform3fv(U.uCamR2, cam2.r); gl.uniform3fv(U.uCamU2, cam2.u);
      gl.uniform4f(U.uCam, cam.tanF, Math.max(cam.mise, 1e-3), Math.max(cam.ouverture, 0), (2 * cam.tanF) / c.h);
      const la = Math.hypot(cam.f[0], cam.f[2]) || 1;
      gl.uniform4f(U.uAxe, cam.f[0] / la, cam.f[2] / la, cam.cible[0], cam.cible[2]);

      const B = scA.boites || [], S = scA.spheres || [], Lu = scA.lumieres || [];
      if (B.length > NB || S.length > NS || Lu.length > NL) throw new Error(`Moteur : trop d'objets (${B.length} boîtes, ${S.length} sphères, ${Lu.length} lumières) ; limites : ${NB} boîtes, ${NS} sphères, ${NL} lumières`);
      const B2 = scB.boites || [], S2 = scB.spheres || [];
      const nb = B.length, ns = S.length, nl = Lu.length;
      let ne = 0, decalage = 0;
      for (let i = 0; i < nb; i++) {
        const b = B[i], o = i * KB * 4, ax = axes(b.rot), c0 = b.c || ZERO, d = b.d;
        const bis = Math.max(0, Math.min(b.biseau ?? 0.004, d[2], Math.min(d[0], d[1])));
        const ray = Math.max(bis, Math.min(b.rayon ?? 0.03, d[0], d[1]));
        const face = b.face ?? -1, dos = b.dos ?? -1;
        if (face >= NC || dos >= NC) throw new Error(`Moteur : couche ${Math.max(face, dos)} hors limites (0 à ${NC - 1})`);
        const ef = face >= 0 ? echelleCouche[face] : UV11, ed = dos >= 0 ? echelleCouche[dos] : UV11;
        const uf0 = b.uvFace || UV1, ud0 = b.uvDos || UV1;
        const uf = [uf0[0] * ef[0], uf0[1] * ef[1], uf0[2] * ef[0], uf0[3] * ef[1]], ud = [ud0[0] * ed[0], ud0[1] * ed[1], ud0[2] * ed[0], ud0[3] * ed[1]];
        const te = b.teinte || [0.05, 0.05, 0.06], tra = b.tranche || [1, 1, 1], co = b.couleur || ORANGE;
        const tg = b.trancheGain ?? 0.15, cg = b.couleurGain ?? 0, verre = b.verre ?? 0.85, op = b.opacite ?? 1, brut = b.brut ?? 0;
        // la même boîte à la fin de l'intervalle (seulement si c'est bien elle : même rang, même texture, tout près)
        let b2 = scB !== scA && B2.length === nb ? B2[i] : b, ax2 = ax, c2 = c0;
        if (b2 !== b) {
          ax2 = axes(b2.rot); c2 = b2.c || ZERO;
          const d2 = b2.d;
          if ((b2.face ?? -1) !== face || long(sub(c2, c0)) > 0.3 || Math.abs(d2[0] - d[0]) > 0.2 * d[0] + 1e-3 || Math.abs(d2[1] - d[1]) > 0.2 * d[1] + 1e-3
            || dot(ax[0], ax2[0]) < 0.9 || dot(ax[1], ax2[1]) < 0.9 || dot(ax[2], ax2[2]) < 0.9) { b2 = b; ax2 = ax; c2 = c0; }
        }
        const exact = brut > 0 && face >= 0 ? Math.min(exactitude(cam, c, b, c0, ax, uf), exactitude(cam2, c, b, c2, ax2, uf)) : 0;
        TB.set([c0[0], c0[1], c0[2], ray, d[0], d[1], d[2], bis,
          ax[0][0], ax[0][1], ax[0][2], face, ax[1][0], ax[1][1], ax[1][2], dos, ax[2][0], ax[2][1], ax[2][2], b.ecran ?? 1,
          uf[0], uf[1], uf[2], uf[3], ud[0], ud[1], ud[2], ud[3],
          lin(te[0]), lin(te[1]), lin(te[2]), verre,
          lin(tra[0]) * tg, lin(tra[1]) * tg, lin(tra[2]) * tg, b.reflet ?? 1,
          lin(co[0]) * cg, lin(co[1]) * cg, lin(co[2]) * cg, op,
          brut, cg > 0 ? 0 : verre * op, Math.hypot(d[0], d[1], d[2]) * 1.001 + 1e-4, b.envers ?? 1,
          c2[0], c2[1], c2[2], exact, ax2[0][0], ax2[0][1], ax2[0][2], 0, ax2[1][0], ax2[1][1], ax2[1][2], 0, ax2[2][0], ax2[2][1], ax2[2][2], 0], o);
        for (let j = 0; j < 8; j++) {
          const sx = j & 1 ? d[0] : -d[0], sy = j & 2 ? d[1] : -d[1], sz = j & 4 ? d[2] : -d[2];
          for (let a = 0; a < 3; a++) {
            COINS[i * 24 + j * 3 + a] = c0[a] + ax[0][a] * sx + ax[1][a] * sy + ax[2][a] * sz;
            COINS2[i * 24 + j * 3 + a] = c2[a] + ax2[0][a] * sx + ax2[1][a] * sy + ax2[2][a] * sz;
          }
        }
        if (verre > 0) decalage = Math.max(decalage, 2 * d[2]);
        // boîte émissive : elle éclaire le sol et les faces voisines comme un rectangle lumineux, pris dans son plan
        // médian (perpendiculaire à son axe le plus mince)
        if (cg > 0 && op > 0 && ne < NE) {
          const m = d[0] <= d[1] && d[0] <= d[2] ? 0 : d[1] <= d[2] ? 1 : 2, u = (m + 1) % 3, v = (m + 2) % 3;
          const doux = verre < 0.05, ku = doux ? 0.7 : 1, g = cg * op * (doux ? 0.3 : 0.4);
          const portee2 = Math.max(0.05, 1500 * g * Math.max(lin(co[0]), lin(co[1]), lin(co[2])) * d[u] * d[v] * ku * ku);   // carré de la portée
          TE.set([c0[0], c0[1], c0[2], i, ax[u][0] * d[u] * ku, ax[u][1] * d[u] * ku, ax[u][2] * d[u] * ku, portee2, ax[v][0] * d[v] * ku, ax[v][1] * d[v] * ku, ax[v][2] * d[v] * ku, 0,
            lin(co[0]) * g, lin(co[1]) * g, lin(co[2]) * g, 0], ne * 16);
          ne++;
        }
      }
      for (let i = 0; i < ns; i++) {
        const s = S[i], o = i * KS * 4, ax = axes(s.rot), e = s.echelle || [1, 1, 1], co = s.couleur || ORANGE, g = s.gain ?? 6;
        let c2 = scB !== scA && S2.length === ns ? S2[i].c : s.c;
        if (long(sub(c2, s.c)) > 0.3) c2 = s.c;
        TS.set([s.c[0], s.c[1], s.c[2], s.r ?? 0.05,
          ax[0][0] / e[0], ax[0][1] / e[0], ax[0][2] / e[0], 0, ax[1][0] / e[1], ax[1][1] / e[1], ax[1][2] / e[1], 0, ax[2][0] / e[2], ax[2][1] / e[2], ax[2][2] / e[2], 0,
          lin(co[0]) * g, lin(co[1]) * g, lin(co[2]) * g, 0, c2[0], c2[1], c2[2], 0], o);
      }
      remplirLumieres(scA);
      if (U.uB) gl.uniform4fv(U.uB, TB);
      if (U.uS) gl.uniform4fv(U.uS, TS);
      if (U.uE) gl.uniform4fv(U.uE, TE);
      gl.uniform4fv(U.uL, TLu);
      gl.uniform4i(U.uN, nb, ns, nl, ne);

      const sol = scA.sol, amb = scA.ambiance || {}, fond = amb.fond || [0.051, 0.051, 0.059];
      gl.uniform4f(U.uSol, sol?.reflet ?? 0.6, sol?.rugosite ?? 0.1, sol?.pulsation ?? 0, 1);
      const an = sol?.anneau, ba = sol?.balises;
      if (an) {
        const co = an.couleur || ORANGE, g = an.gain ?? 1;
        gl.uniform4f(U.uAnn, an.c[0], an.c[1], an.r ?? 1.2, Math.max(an.largeur ?? 0.08, 1e-4));
        gl.uniform3f(U.uAnnC, lin(co[0]) * g, lin(co[1]) * g, lin(co[2]) * g);
      } else gl.uniform4f(U.uAnn, 0, 0, 0, 0);
      if (ba) {
        const co = ba.couleur || ORANGE;
        gl.uniform4f(U.uBal, ba.a[0], ba.a[1], ba.b[0], ba.b[1]);
        gl.uniform4f(U.uBal2, ba.n ?? 18, ba.allumees ?? 7.5, Math.max(ba.taille ?? 0.03, 1e-4), 0);
        gl.uniform3f(U.uBalC, lin(co[0]), lin(co[1]), lin(co[2]));
      } else gl.uniform4f(U.uBal2, 0, 0, 1, 0);
      gl.uniform3f(U.uFond, lin(fond[0]), lin(fond[1]), lin(fond[2]));
      gl.uniform4f(U.uAmb, amb.brume ?? 0.3, amb.halo ?? 1, amb.studio ?? 1, 0);
      tuiles(c, cam, cam2, scA, nb, nl, toutTrier, decalage);
    }
    function remplirLumieres(sc) {
      const Lu = sc.lumieres || [];
      for (let i = 0; i < Math.min(Lu.length, NL); i++) {
        const l = Lu[i], co = l.couleur || ORANGE, k = l.intensite ?? 2;
        TLu.set([l.p[0], l.p[1], l.p[2], Math.max(l.rayon ?? 3, 1e-3), lin(co[0]) * k, lin(co[1]) * k, lin(co[2]) * k, 0], i * 8);
      }
    }
    let toutTrier = false;   // essais : vrai = aucun tri (toutes les boîtes examinées partout)

    // ---------- rendu
    // c : cible (tampons d'accumulation) ; sortie : null (canevas) ou la texture de passage (image dans une couche).
    function rendre(c, t, sceneDe, o, sortie) {
      const n = Math.max(1, Math.round(o?.echantillons ?? 24)), obt = o?.obturateur ?? 1 / 120;
      const k = Math.max(1, Math.min(4, Math.round(o?.rayons ?? 2))), sq = suites(n, k);   // rayons par passe : divise le bruit des flous
      const U = P.scene.u;
      // la scène aux bornes des n intervalles de l'obturateur (une seule si rien ne bouge)
      const fixe = !(obt > 0) || n === 1, etats = [];
      if (fixe) etats.push(sceneDe(t)); else for (let j = 0; j <= n; j++) etats.push(sceneDe(t + (j / n - 0.5) * obt));
      const milieu = fixe ? etats[0] : n % 2 === 0 ? etats[n / 2] : sceneDe(t), amb = milieu.ambiance || {};

      gl.bindFramebuffer(gl.FRAMEBUFFER, c.fbo);
      gl.viewport(0, 0, c.w, c.h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(P.scene.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, couches);
      gl.uniform1i(U.uTex, 0);
      gl.uniform1i(U.uTuiles, 3);
      gl.uniform2f(U.uRes, c.w, c.h);
      // les tirages changent d'une image à l'autre (mais pas d'un rendu à l'autre du même instant)
      const img = Math.round(t * 240), h1 = hasard(img * 1.37 + 0.5), h2 = hasard(img * 2.11 + 7.3);
      gl.uniform3f(U.uTrame, Math.floor(h1 * 1024), Math.floor(h2 * 1024), Math.floor(hasard(img * 0.73 + 3.1) * 60000));
      toutTrier = !!o?.sansTri;
      // accumulation : chaque passe a son décalage sous-pixel, ses points d'objectif et son intervalle de temps
      for (let s = 0; s < n; s++) {
        if (s === 0 || !fixe) { const j = fixe ? 0 : sq.inter[s]; remplir(etats[j], fixe ? etats[0] : etats[j + 1], c, U); }
        gl.uniform4f(U.uEch, sq.jit[s][0], sq.jit[s][1], s, n);
        gl.uniform4f(U.uEch2, sq.mSol, sq.mOmbre, k, 0);
        plein();
      }
      // poussières : ajoutées à la lumière de la scène, cachées par ce qui est devant (profondeur moyenne), et
      // étirées selon leur déplacement à l'écran pendant l'obturateur
      const np = Math.min(MAX_POUSSIERES, Math.round(MAX_POUSSIERES * (amb.poussieres ?? 0.4)));
      if (np > 0) {
        const V = P.poussiere.u, cam = repere(milieu.cam), camA = repere(etats[0].cam), camB = repere(etats[etats.length - 1].cam);
        gl.bindFramebuffer(gl.FRAMEBUFFER, c.fboHdr);
        gl.useProgram(P.poussiere.p);
        gl.uniform3fv(V.uCamP, camA.pos); gl.uniform3fv(V.uCamF, camA.f); gl.uniform3fv(V.uCamR, camA.r); gl.uniform3fv(V.uCamU, camA.u);
        gl.uniform3fv(V.uCamP2, camB.pos); gl.uniform3fv(V.uCamF2, camB.f); gl.uniform3fv(V.uCamR2, camB.r); gl.uniform3fv(V.uCamU2, camB.u);
        gl.uniform4f(V.uCam, cam.tanF, Math.max(cam.mise, 1e-3), Math.max(cam.ouverture, 0), t);
        gl.uniform4f(V.uVue, c.w, c.h, cam.cible[0], cam.cible[2]);
        remplirLumieres(milieu);
        gl.uniform4fv(V.uL, TLu); gl.uniform1i(V.uNL, Math.min((milieu.lumieres || []).length, NL));
        gl.uniform1f(V.uGain, 1);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, c.prof); gl.uniform1i(V.uProf, 1);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, np);
      }
      gl.disable(gl.BLEND);

      // bloom : réductions successives, puis remontée en additionnant
      gl.activeTexture(gl.TEXTURE0);
      gl.useProgram(P.bas.p);
      gl.uniform1i(P.bas.u.uSrc, 0);
      let src = { t: c.hdr, w: c.w, h: c.h };
      c.bloom.forEach((b, i) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, b.f);
        gl.viewport(0, 0, b.w, b.h);
        gl.bindTexture(gl.TEXTURE_2D, src.t);
        gl.uniform4f(P.bas.u.uD, 1 / src.w, 1 / src.h, 1 / b.w, 1 / b.h);
        gl.uniform1f(P.bas.u.uSeuil, i === 0 ? 1 : 0);
        plein();
        src = b;
      });
      gl.useProgram(P.haut.p);
      gl.uniform1i(P.haut.u.uSrc, 0);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = NIV_BLOOM - 2; i >= 0; i--) {
        const b = c.bloom[i], s = c.bloom[i + 1];
        gl.bindFramebuffer(gl.FRAMEBUFFER, b.f);
        gl.viewport(0, 0, b.w, b.h);
        gl.bindTexture(gl.TEXTURE_2D, s.t);
        gl.uniform4f(P.haut.u.uD, 1 / s.w, 1 / s.h, 1 / b.w, 1 / b.h);
        gl.uniform1f(P.haut.u.uPoids, 1.0);
        plein();
      }
      gl.disable(gl.BLEND);

      // passe finale, vers le canevas ou vers la texture de passage
      const F = P.final.u;
      gl.bindFramebuffer(gl.FRAMEBUFFER, sortie);
      if (sortie) { gl.viewport(0, 0, TL, TH); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.viewport(0, 0, c.w, c.h);
      gl.useProgram(P.final.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, c.hdr); gl.uniform1i(F.uHDR, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, c.brut); gl.uniform1i(F.uBrut, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, c.bloom[0].t); gl.uniform1i(F.uBloom, 2);
      gl.uniform4f(F.uP, amb.vignette ?? 0.35, amb.grain ?? 0.02, (amb.bloom ?? 0.8) * 0.085, amb.exposition ?? 1);
      gl.uniform4f(F.uMode, sortie ? 1 : 0, sortie ? 1 : 0, c.w, c.h);
      plein();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function image(t, sceneDe, o) { rendre(cible(W, H), t, sceneDe, o, null); derniereCouche = -1; }
    // L'image est rendue à la taille du plateau (si elle tient dans la couche) et rangée en haut à gauche de la
    // couche ; uvFace et uvDos d'une boîte qui affiche cette couche restent exprimés sur l'image entière ([0,0,1,1]).
    // Une face brute qui la montre à l'échelle 1 la redonne ainsi texel pour pixel.
    function imageDansCouche(i, t, sceneDe, o) {
      if (i < 0 || i >= NC) throw new Error(`Moteur : couche ${i} hors limites (0 à ${NC - 1})`);
      const entier = W <= TL && H <= TH, c = entier ? cible(W, H) : cible(TL, TH);
      rendre(c, t, sceneDe, { ...o, echantillons: o?.echantillons ?? 12 }, passageFbo[0]);
      passageVersCouche(i);
      echelleCouche[i] = [c.w / TL, c.h / TH];
      derniereCouche = i;
    }
    // z : distance du point à la caméra ; profondeur : distance le long de l'axe de visée ; echelle : px par unité.
    function projeter(cam, p) {
      const c = repere(cam), v = sub(p, c.pos), z = dot(v, c.f), k = H / 2 / c.tanF, zz = Math.abs(z) < 1e-6 ? 1e-6 : z;
      return { x: W / 2 + (dot(v, c.r) / zz) * k, y: H / 2 - (dot(v, c.u) / zz) * k, z: long(v), profondeur: z, devant: z > 0, echelle: k / zz };
    }
    // Attend la fin des calculs de la carte graphique (pour mesurer un temps de rendu), y compris ceux d'un
    // téléversement ou d'une image dans une couche : un texel du dernier niveau de la couche écrite est relu.
    const lectureFbo = gl.createFramebuffer();
    function attendre() {
      const px = new Uint8Array(4);
      if (derniereCouche >= 0) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, lectureFbo);
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, couches, NIVEAUX - 1, derniereCouche);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.finish();
      return px;
    }

    return { toile, televerser, image, imageDansCouche, projeter, attendre, infos, gl, largeur: W, hauteur: H, texL: TL, texH: TH, couches: NC };
  }

  return { creer };
})();
if (typeof window !== "undefined") window.Moteur = Moteur;
