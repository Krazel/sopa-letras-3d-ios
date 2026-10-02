// Keep legacy definitions unchanged for validating saved paths during migration.
const corrected = `RÍO SOFÁ ÁRBOL AVIÓN VIOLÍN ÓRBITA DELFÍN TIBURÓN MONTAÑA BRÚJULA VOLCÁN OCÉANO SATÉLITE ENERGÍA EXCAVACIÓN CERÁMICA FÓSIL SÍLEX EXTINCIÓN CAFÉ ÓVALO MELÓN LIMÓN PLÁTANO ÁGUILA BÚHO TULIPÁN LÁPIZ MÉDICO AUTOBÚS CAMIÓN TRANVÍA FÚTBOL NATACIÓN CANICA PÁGINA FRÍO RÁPIDO TUCÁN ORQUÍDEA CAIMÁN LEÓN BÚFALO PINGÜINO ESCORPIÓN SEQUÍA CORAZÓN PULMÓN MÚSCULO RIÑÓN OÍDO ALEGRÍA ILUSIÓN CUÁSAR PÚLSAR LUNACIÓN EROSIÓN TECTÓNICA ÁTOMO MOLÉCULA PROTÓN NEUTRÓN ELECTRÓN OXÍGENO HIDRÓGENO FRICCIÓN PRESIÓN TELÉFONO CÁMARA BATERÍA CÚPULA BÓVEDA BALCÓN TIMÓN MÁSTIL HÁBITAT FRACCIÓN ECUACIÓN ÁLGEBRA ÁNGULO PERÍMETRO DIÁMETRO DRAGÓN FÉNIX CARTOGRAFÍA PENÍNSULA`;
export const legacySpelling = (word: string): string =>
  word
    .replace(/Ñ/g, '\uE000')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\uE000/g, 'Ñ');
const replacements = Object.fromEntries(
  corrected.split(' ').map((w) => [legacySpelling(w), w]),
);
// Legacy QUASAR used the international spelling; Spanish uses cuásar.
replacements.QUASAR = 'CUÁSAR';
replacements.MONTANA = 'MONTAÑA';
export const spanishSpelling = (word: string) => replacements[word] ?? word;
