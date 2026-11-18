// Les plans sont déduits de la voix : chaque plan commence une double croche (0,125 s à 120 BPM) avant la phrase qui
// le porte, donc sur la grille de la musique. Arrondi à l'image près.
export function buildShots(timing) {
  const { sentences: S, duration, fps } = timing;
  const snap = (x) => Math.round(x * fps) / fps;
  const starts = [0, ...S.slice(1).map((s) => s.start - 60 / timing.bpm / 4)].map(snap);
  return starts.map((start, i) => ({ id: `p${i + 1}`, start, end: i < starts.length - 1 ? starts[i + 1] : duration }));
}
