// Découpe le calage caractère par caractère d'une phrase en mots (mêmes règles que le script).
export function wordsOf(text, al) {
  // repère chaque jeton du texte (séparé par des espaces) et sa plage de caractères
  const out = [];
  let i = 0;
  for (const tok of text.split(" ")) {
    const a = text.indexOf(tok, i);
    const b = a + tok.length - 1;
    i = b + 1;
    if (/^[?:!;.]$/.test(tok)) continue; // ponctuation isolée : rattachée au mot précédent
    const core = tok.replace(/[,.]$/, "");
    const last = a + core.length - 1;
    out.push({ w: core, start: al.starts[a], end: al.ends[last] });
  }
  return out;
}
