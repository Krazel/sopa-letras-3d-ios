import type { Language } from './preferences.ts';
import { normalizeWord } from './letters.ts';
import {
  EXPANDED_IDS,
  EXPANDED_SOURCE,
  STARTER_ADDITIONS,
  CATALAN_SOURCE,
} from './locale-expanded.ts';
export const LEGACY_IDS = [
  'cielo',
  'agua',
  'hogar',
  'naturaleza',
  'huerto',
  'animales',
  'bosque',
  'viaje',
  'musica',
  'universo',
  'oceano',
  'aventura',
];
export const LEGACY_WORLD_CONTENT = {
  fr: {
    cielo: {
      name: 'Ciel',
      words: ['SOLEIL', 'LUNE', 'NUAGE', 'CIEL'],
    },
    agua: {
      name: 'Eau',
      words: ['MER', 'RIVIÈRE', 'VAGUE', 'EAU'],
    },
    hogar: {
      name: 'Maison',
      words: ['MAISON', 'TABLE', 'TASSE', 'SOFA'],
    },
    naturaleza: {
      name: 'Nature',
      words: ['VENT', 'FLEUR', 'PLUIE', 'TERRE'],
    },
    huerto: {
      name: 'Verger',
      words: ['POIRE', 'RAISIN', 'POMME', 'CITRON'],
    },
    animales: {
      name: 'Animaux',
      words: ['CHAT', 'OURS', 'CANARD', 'LOUP'],
    },
    bosque: {
      name: 'Forêt',
      words: ['ARBRE', 'FEUILLE', 'MOUSSE', 'BRANCHE'],
    },
    viaje: {
      name: 'Voyage',
      words: ['BATEAU', 'TRAIN', 'AVION', 'PLAGE'],
    },
    musica: {
      name: 'Musique',
      words: ['PIANO', 'VIOLON', 'FLÛTE', 'TAMBOUR'],
    },
    universo: {
      name: 'Univers',
      words: ['PLANÈTE', 'ÉTOILE', 'GALAXIE', 'COMÈTE', 'ORBITE', 'SATURNE'],
    },
    oceano: {
      name: 'Océan',
      words: ['BALEINE', 'DAUPHIN', 'REQUIN', 'CORAIL', 'POULPE', 'TORTUE'],
    },
    aventura: {
      name: 'Aventure',
      words: ['MONTAGNE', 'CASCADE', 'BOUSSOLE', 'SENTIER', 'REFUGE', 'VOYAGE'],
    },
  },
  pt: {
    cielo: {
      name: 'Céu',
      words: ['SOL', 'LUA', 'NUVEM', 'LUZ'],
    },
    agua: {
      name: 'Água',
      words: ['MAR', 'RIO', 'ONDA', 'ÁGUA'],
    },
    hogar: {
      name: 'Casa',
      words: ['CASA', 'MESA', 'COPO', 'SOFÁ'],
    },
    naturaleza: {
      name: 'Natureza',
      words: ['VENTO', 'FLOR', 'CHUVA', 'TERRA'],
    },
    huerto: {
      name: 'Pomar',
      words: ['PERA', 'UVA', 'MAÇÃ', 'LIMÃO'],
    },
    animales: {
      name: 'Animais',
      words: ['GATO', 'URSO', 'PATO', 'LOBO'],
    },
    bosque: {
      name: 'Floresta',
      words: ['ÁRVORE', 'FOLHA', 'MUSGO', 'RAMO'],
    },
    viaje: {
      name: 'Viagem',
      words: ['BARCO', 'TREM', 'AVIÃO', 'PRAIA'],
    },
    musica: {
      name: 'Música',
      words: ['PIANO', 'VIOLINO', 'FLAUTA', 'TAMBOR'],
    },
    universo: {
      name: 'Universo',
      words: ['PLANETA', 'ESTRELA', 'GALÁXIA', 'COMETA', 'ÓRBITA', 'SATURNO'],
    },
    oceano: {
      name: 'Oceano',
      words: ['BALEIA', 'GOLFINHO', 'TUBARÃO', 'CORAL', 'POLVO', 'TARTARUGA'],
    },
    aventura: {
      name: 'Aventura',
      words: ['MONTANHA', 'CASCATA', 'BÚSSOLA', 'TRILHA', 'REFÚGIO', 'VIAGEM'],
    },
  },
  de: {
    cielo: {
      name: 'Himmel',
      words: ['SONNE', 'MOND', 'WOLKE', 'LICHT'],
    },
    agua: {
      name: 'Wasser',
      words: ['MEER', 'FLUSS', 'WELLE', 'WASSER'],
    },
    hogar: {
      name: 'Zuhause',
      words: ['HAUS', 'TISCH', 'TASSE', 'SOFA'],
    },
    naturaleza: {
      name: 'Natur',
      words: ['WIND', 'BLUME', 'REGEN', 'ERDE'],
    },
    huerto: {
      name: 'Obstgarten',
      words: ['BIRNE', 'TRAUBE', 'APFEL', 'ZITRONE'],
    },
    animales: {
      name: 'Tiere',
      words: ['KATZE', 'BÄR', 'ENTE', 'WOLF'],
    },
    bosque: {
      name: 'Wald',
      words: ['BAUM', 'BLATT', 'MOOS', 'AST'],
    },
    viaje: {
      name: 'Reise',
      words: ['BOOT', 'ZUG', 'FLUGZEUG', 'STRAND'],
    },
    musica: {
      name: 'Musik',
      words: ['KLAVIER', 'GEIGE', 'FLÖTE', 'TROMMEL'],
    },
    universo: {
      name: 'Universum',
      words: ['PLANET', 'STERN', 'GALAXIE', 'KOMET', 'UMLAUFBAHN', 'SATURN'],
    },
    oceano: {
      name: 'Ozean',
      words: ['WAL', 'DELFIN', 'HAI', 'KORALLE', 'KRAKE', 'SCHILDKRÖTE'],
    },
    aventura: {
      name: 'Abenteuer',
      words: ['BERG', 'WASSERFALL', 'KOMPASS', 'PFAD', 'HÜTTE', 'WANDERUNG'],
    },
  },
  it: {
    cielo: {
      name: 'Cielo',
      words: ['SOLE', 'LUNA', 'NUVOLA', 'LUCE'],
    },
    agua: {
      name: 'Acqua',
      words: ['MARE', 'FIUME', 'ONDA', 'ACQUA'],
    },
    hogar: {
      name: 'Casa',
      words: ['CASA', 'TAVOLO', 'TAZZA', 'DIVANO'],
    },
    naturaleza: {
      name: 'Natura',
      words: ['VENTO', 'FIORE', 'PIOGGIA', 'TERRA'],
    },
    huerto: {
      name: 'Frutteto',
      words: ['PERA', 'UVA', 'MELA', 'LIMONE'],
    },
    animales: {
      name: 'Animali',
      words: ['GATTO', 'ORSO', 'ANATRA', 'LUPO'],
    },
    bosque: {
      name: 'Bosco',
      words: ['ALBERO', 'FOGLIA', 'MUSCHIO', 'RAMO'],
    },
    viaje: {
      name: 'Viaggio',
      words: ['BARCA', 'TRENO', 'AEREO', 'SPIAGGIA'],
    },
    musica: {
      name: 'Musica',
      words: ['PIANO', 'VIOLINO', 'FLAUTO', 'TAMBURO'],
    },
    universo: {
      name: 'Universo',
      words: ['PIANETA', 'STELLA', 'GALASSIA', 'COMETA', 'ORBITA', 'SATURNO'],
    },
    oceano: {
      name: 'Oceano',
      words: ['BALENA', 'DELFINO', 'SQUALO', 'CORALLO', 'POLPO', 'TARTARUGA'],
    },
    aventura: {
      name: 'Avventura',
      words: [
        'MONTAGNA',
        'CASCATA',
        'BUSSOLA',
        'SENTIERO',
        'RIFUGIO',
        'VIAGGIO',
      ],
    },
  },
  tr: {
    cielo: {
      name: 'Gökyüzü',
      words: ['GÜNEŞ', 'AY', 'BULUT', 'IŞIK'],
    },
    agua: {
      name: 'Su',
      words: ['DENİZ', 'NEHİR', 'DALGA', 'SU'],
    },
    hogar: {
      name: 'Ev',
      words: ['EV', 'MASA', 'FİNCAN', 'KOLTUK'],
    },
    naturaleza: {
      name: 'Doğa',
      words: ['RÜZGÂR', 'ÇİÇEK', 'YAĞMUR', 'TOPRAK'],
    },
    huerto: {
      name: 'Meyve bahçesi',
      words: ['ARMUT', 'ÜZÜM', 'ELMA', 'LİMON'],
    },
    animales: {
      name: 'Hayvanlar',
      words: ['KEDİ', 'AYI', 'ÖRDEK', 'KURT'],
    },
    bosque: {
      name: 'Orman',
      words: ['AĞAÇ', 'YAPRAK', 'YOSUN', 'DAL'],
    },
    viaje: {
      name: 'Yolculuk',
      words: ['TEKNE', 'TREN', 'UÇAK', 'PLAJ'],
    },
    musica: {
      name: 'Müzik',
      words: ['PİYANO', 'KEMAN', 'FLÜT', 'DAVUL'],
    },
    universo: {
      name: 'Evren',
      words: ['GEZEGEN', 'YILDIZ', 'GALAKSİ', 'METEOR', 'YÖRÜNGE', 'SATÜRN'],
    },
    oceano: {
      name: 'Okyanus',
      words: [
        'BALİNA',
        'YUNUS',
        'KÖPEKBALIĞI',
        'MERCAN',
        'AHTAPOT',
        'KAPLUMBAĞA',
      ],
    },
    aventura: {
      name: 'Macera',
      words: ['DAĞ', 'ŞELALE', 'PUSULA', 'PATİKA', 'SIĞINAK', 'ÇADIR'],
    },
  },
  ar: {
    cielo: {
      name: 'السماء',
      words: ['شمس', 'قمر', 'سحاب', 'نور'],
    },
    agua: {
      name: 'الماء',
      words: ['بحر', 'نهر', 'موج', 'ماء'],
    },
    hogar: {
      name: 'البيت',
      words: ['بيت', 'طاولة', 'كوب', 'أريكة'],
    },
    naturaleza: {
      name: 'الطبيعة',
      words: ['ريح', 'زهرة', 'مطر', 'أرض'],
    },
    huerto: {
      name: 'البستان',
      words: ['كمثرى', 'عنب', 'تفاح', 'ليمون'],
    },
    animales: {
      name: 'الحيوانات',
      words: ['قط', 'دب', 'بطة', 'ذئب'],
    },
    bosque: {
      name: 'الغابة',
      words: ['شجرة', 'ورقة', 'طحلب', 'غصن'],
    },
    viaje: {
      name: 'السفر',
      words: ['قارب', 'قطار', 'طائرة', 'شاطئ'],
    },
    musica: {
      name: 'الموسيقى',
      words: ['بيانو', 'كمان', 'ناي', 'طبل'],
    },
    universo: {
      name: 'الكون',
      words: ['كوكب', 'نجمة', 'مجرة', 'مذنب', 'مدار', 'زحل'],
    },
    oceano: {
      name: 'المحيط',
      words: ['حوت', 'دلفين', 'قرش', 'مرجان', 'أخطبوط', 'سلحفاة'],
    },
    aventura: {
      name: 'المغامرة',
      words: ['جبل', 'شلال', 'بوصلة', 'مسار', 'كهف', 'حقيبة'],
    },
  },
  ko: {
    cielo: {
      name: '하늘',
      words: ['태양', '달빛', '구름', '햇빛'],
    },
    agua: {
      name: '물',
      words: ['바다', '강물', '파도', '빗물'],
    },
    hogar: {
      name: '집',
      words: ['주택', '탁자', '컵', '소파'],
    },
    naturaleza: {
      name: '자연',
      words: ['바람', '꽃잎', '비', '흙'],
    },
    huerto: {
      name: '과수원',
      words: ['배', '포도', '사과', '레몬'],
    },
    animales: {
      name: '동물',
      words: ['고양이', '곰', '오리', '늑대'],
    },
    bosque: {
      name: '숲',
      words: ['나무', '잎', '이끼', '가지'],
    },
    viaje: {
      name: '여행',
      words: ['배', '기차', '비행기', '해변'],
    },
    musica: {
      name: '음악',
      words: ['피아노', '바이올린', '플루트', '북'],
    },
    universo: {
      name: '우주',
      words: ['행성', '별', '은하', '혜성', '궤도', '토성'],
    },
    oceano: {
      name: '대양',
      words: ['고래', '돌고래', '상어', '산호', '문어', '거북'],
    },
    aventura: {
      name: '모험',
      words: ['산', '폭포', '나침반', '오솔길', '동굴', '배낭'],
    },
  },
  ja: {
    cielo: {
      name: '空',
      words: ['たいよう', 'つき', 'くも', 'ひかり'],
    },
    agua: {
      name: '水',
      words: ['うみ', 'かわ', 'なみ', 'みず'],
    },
    hogar: {
      name: '家',
      words: ['いえ', 'つくえ', 'コップ', 'ソファ'],
    },
    naturaleza: {
      name: '自然',
      words: ['かぜ', 'はな', 'あめ', 'つち'],
    },
    huerto: {
      name: '果樹園',
      words: ['なし', 'ぶどう', 'りんご', 'レモン'],
    },
    animales: {
      name: '動物',
      words: ['ねこ', 'くま', 'あひる', 'おおかみ'],
    },
    bosque: {
      name: '森',
      words: ['き', 'はっぱ', 'こけ', 'えだ'],
    },
    viaje: {
      name: '旅行',
      words: ['ふね', 'でんしゃ', 'ひこうき', 'すなはま'],
    },
    musica: {
      name: '音楽',
      words: ['ピアノ', 'バイオリン', 'フルート', 'たいこ'],
    },
    universo: {
      name: '宇宙',
      words: ['わくせい', 'ほし', 'ぎんが', 'すいせい', 'きどう', 'どせい'],
    },
    oceano: {
      name: '海洋',
      words: ['くじら', 'いるか', 'さめ', 'さんご', 'たこ', 'かめ'],
    },
    aventura: {
      name: '冒険',
      words: ['やま', 'たき', 'コンパス', 'こみち', 'ほらあな', 'リュック'],
    },
  },
};
type Collection = Record<string, { name: string; words: string[] }>;
export const WORLD_CONTENT: Partial<Record<Language, Collection>> = {};
const parse = (
  source: string,
  ids: string[],
  language: Language,
): Collection => {
  const rows = source.trim().split('\n');
  if (rows.length !== ids.length) throw Error('Invalid catalogue ' + language);
  return Object.fromEntries(
    rows.map((row, i) => {
      const [name, words] = row.split('|');
      return [
        ids[i],
        {
          name,
          words: words.split(',').map((w) => normalizeWord(w, language)),
        },
      ];
    }),
  );
};
for (const language of [
  'fr',
  'pt',
  'de',
  'it',
  'tr',
  'ar',
  'ko',
  'ja',
] as const) {
  const base = structuredClone(LEGACY_WORLD_CONTENT[language]);
  STARTER_ADDITIONS[language]!.trim()
    .split('\n')
    .forEach((row, i) =>
      base[LEGACY_IDS[i + 3] as keyof typeof base].words.push(
        ...row.split(',').map((w) => normalizeWord(w, language)),
      ),
    );
  WORLD_CONTENT[language] = {
    ...base,
    ...parse(EXPANDED_SOURCE[language]!, EXPANDED_IDS, language),
  };
}
WORLD_CONTENT.ca = parse(
  CATALAN_SOURCE,
  [...LEGACY_IDS, ...EXPANDED_IDS],
  'ca',
);
