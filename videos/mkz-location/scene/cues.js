// Le conducteur de la vidéo « MKZ Motors · location » : tout est calé sur la musique, à 120 battements par minute.
// Un temps = 30 images (0,5 s), une mesure = 2 s, huit mesures = 16 s. Un seul plan, sans coupe : la caméra glisse sur
// le bureau d'un objet à l'autre pendant que la lumière passe de l'après-midi au soir.
// Mesure 1 : le téléphone s'allume, la fiche de la 208 en location. 2 : on choisit vendredi → dimanche, on réserve.
// 3 : le calendrier tourne ses feuillets (vendredi, samedi, dimanche), les bandes de lumière des stores défilent.
// 4 : la clé tombe sur le bureau ; le téléphone reçoit « Vos clés sont prêtes ». 5 : l'étiquette en cuir, de près.
// 6 : la clé et le téléphone, le prix. 7 et 8 : la caméra s'élève, le soir tombe, le logo MKZ Motors.
// Règle : l'ACTION tombe sur le temps.
globalThis.buildCues = function () {
  const T = 0.5, b = (n) => n * T, K = { T, b, DUREE: 16, AV: 2 / 60 };
  K.tel = { allume: b(0.5), photo: b(1), titre: b(2), prix: b(3), dates: b(4), ven: b(4.5), dim: b(5), total: b(5.5), appui: b(7), reserve: b(7.25), veille: b(8.5) };
  K.cal = { debut: b(8), feuillets: [b(9), b(11)], duree: 0.42 };      // vendredi est là ; samedi puis dimanche basculent
  K.cle = { chute: b(13) - 0.42, impact: b(13), notif: b(14) };
  K.etiquette = { debut: b(16) };
  K.prix = { debut: b(20) };
  K.fin = { recul: b(22), logo: b(26), adresse: b(28) };
  // la grosse caisse : de la mesure 3 à la mesure 7 (le premier temps de chaque mesure plus fort), puis le logo
  K.grosseCaisse = [...Array.from({ length: 20 }, (_, i) => b(8 + i)), b(28)];
  // la mélodie (pas en doubles croches dans la mesure, note MIDI) : fa majeur, écrite pour cette vidéo
  K.motif = [
    [[0, 72], [2, 76], [3, 77], [6, 79], [8, 77], [10, 76], [12, 72], [14, 74]],
    [[0, 76], [2, 77], [3, 81], [6, 79], [8, 77], [11, 76], [12, 74], [14, 72]],
  ];
  // les accords, un par mesure : Fa7M, La m7, Si♭7M, Do (sus4 puis Do), et la fin en Fa 9
  K.accords = [[53, 57, 60, 64], [57, 60, 64, 67], [58, 62, 65, 69], [55, 60, 65, 67], [53, 57, 60, 64], [57, 60, 64, 67], [58, 62, 65, 69], [53, 60, 64, 67, 69]];
  K.basses = [41, 45, 46, 48, 41, 45, 46, 41];
  return { K, sfx: [] };
};
