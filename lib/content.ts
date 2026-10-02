import type { PuzzleChoice } from './game.ts';
import {
  WORLD_CONTENT,
  LEGACY_WORLD_CONTENT,
  LEGACY_IDS,
} from './locale-content.ts';
import { spanishSpelling } from './spanish-spelling.ts';
import type { Language } from './preferences.ts';

// Keep legacy definitions for save migration; localizePuzzle supplies corrected
// Spanish spelling or an authored translated collection before gameplay.
const rows: [string, string, string, number, string, string][] = [
  [
    'arqueologia',
    'Arqueología',
    'Archaeology',
    10,
    'EXCAVACION,CERAMICA,TEMPLO,MOSAICO,ESTATUA,RELIQUIA,YACIMIENTO,COLUMNA',
    'EXCAVATION,POTTERY,TEMPLE,MOSAIC,STATUE,RELIC,RUINS,COLUMN',
  ],
  [
    'prehistoria',
    'Prehistoria',
    'Prehistory',
    10,
    'DINOSAURIO,FOSIL,MAMUT,CAVERNA,TRIBU,SILEX,HUELLA,EXTINCION',
    'DINOSAUR,FOSSIL,MAMMOTH,CAVERN,TRIBE,FLINT,FOOTPRINT,EXTINCTION',
  ],
  [
    'desayuno',
    'Desayuno',
    'Breakfast',
    3,
    'PAN,CAFE,LECHE,MIEL',
    'BREAD,COFFEE,MILK,HONEY',
  ],
  ['ropa', 'Ropa', 'Clothes', 3, 'ROPA,BOTA,GORRO,LANA', 'COAT,BOOT,HAT,WOOL'],
  [
    'colores',
    'Colores',
    'Colours',
    3,
    'ROJO,AZUL,ORO,ROSA',
    'RED,BLUE,GOLD,PINK',
  ],
  [
    'formas',
    'Formas',
    'Shapes',
    3,
    'CUBO,ARO,CONO,OVALO',
    'CUBE,RING,CONE,OVAL',
  ],
  [
    'frutero',
    'Frutero',
    'Fruit bowl',
    4,
    'MANZANA,MANGO,MELON,CEREZA,LIMON,PLATANO',
    'APPLE,MANGO,MELON,CHERRY,LEMON,BANANA',
  ],
  [
    'verduras',
    'Verduras',
    'Vegetables',
    4,
    'TOMATE,LECHUGA,PEPINO,CEBOLLA,PATATA,AJO',
    'TOMATO,LETTUCE,CUCUMBER,ONION,POTATO,GARLIC',
  ],
  [
    'cocina',
    'Cocina',
    'Kitchen',
    4,
    'HORNO,OLLA,PLATO,VASO,TENEDOR,CUCHARA',
    'OVEN,POT,PLATE,GLASS,FORK,SPOON',
  ],
  [
    'dulces',
    'Dulces',
    'Sweet treats',
    4,
    'TARTA,FLAN,MIEL,GALLETA,HELADO,CACAO',
    'CAKE,FLAN,HONEY,COOKIE,ICECREAM,COCOA',
  ],
  [
    'granja',
    'Granja',
    'Farm',
    4,
    'VACA,CERDO,CABRA,OVEJA,GALLO,BURRO',
    'COW,PIG,GOAT,SHEEP,ROOSTER,DONKEY',
  ],
  [
    'aves',
    'Aves',
    'Birds',
    4,
    'AGUILA,BUHO,LORO,CISNE,MIRLO,CUERVO',
    'EAGLE,OWL,PARROT,SWAN,BLACKBIRD,RAVEN',
  ],
  [
    'insectos',
    'Insectos',
    'Insects',
    4,
    'ABEJA,HORMIGA,MOSCA,GRILLO,POLILLA,AVISPA',
    'BEE,ANT,FLY,CRICKET,MOTH,WASP',
  ],
  [
    'jardin',
    'Jardín',
    'Garden',
    4,
    'FLOR,ROSA,LIRIO,TULIPAN,MACETA,SEMILLA',
    'FLOWER,ROSE,LILY,TULIP,PLANTER,SEED',
  ],
  [
    'escuela',
    'Escuela',
    'School',
    5,
    'LIBRO,LAPIZ,GOMA,REGLA,PUPITRE,PIZARRA,CLASE',
    'BOOK,PENCIL,ERASER,RULER,DESK,BLACKBOARD,CLASS',
  ],
  [
    'oficios',
    'Oficios',
    'Jobs',
    5,
    'MEDICO,PINTOR,PANADERO,BOMBERO,PILOTO,MAESTRO,GRANJERO',
    'DOCTOR,PAINTER,BAKER,FIREFIGHTER,PILOT,TEACHER,FARMER',
  ],
  [
    'ciudad',
    'Ciudad',
    'City',
    5,
    'CALLE,PLAZA,PARQUE,PUENTE,TIENDA,TORRE,TEATRO',
    'STREET,SQUARE,PARK,BRIDGE,SHOP,TOWER,THEATRE',
  ],
  [
    'transporte',
    'Transporte',
    'Transport',
    5,
    'COCHE,AUTOBUS,BICI,METRO,TAXI,CAMION,TRANVIA',
    'CAR,BUS,BIKE,METRO,TAXI,TRUCK,TRAM',
  ],
  [
    'deportes',
    'Deportes',
    'Sports',
    5,
    'FUTBOL,TENIS,NATACION,BOXEO,HOCKEY,RUGBY,SURF',
    'FOOTBALL,TENNIS,SWIMMING,BOXING,HOCKEY,RUGBY,SURFING',
  ],
  [
    'juguetes',
    'Juguetes',
    'Toys',
    5,
    'PELOTA,MUÑECA,COMETA,PEONZA,PUZLE,ROBOT,CANICA',
    'BALL,DOLL,KITE,TOP,PUZZLE,ROBOT,MARBLE',
  ],
  [
    'arte',
    'Arte',
    'Art',
    5,
    'LIENZO,PINCEL,COLOR,TINTA,BOCETO,MURAL,RETRATO',
    'CANVAS,BRUSH,COLOUR,INK,SKETCH,MURAL,PORTRAIT',
  ],
  [
    'lectura',
    'Lectura',
    'Reading',
    5,
    'NOVELA,CUENTO,POEMA,AUTOR,PAGINA,PORTADA,LETRA',
    'NOVEL,STORY,POEM,AUTHOR,PAGE,COVER,LETTER',
  ],
  [
    'clima',
    'Clima',
    'Weather',
    5,
    'LLUVIA,NIEVE,VIENTO,TRUENO,RAYO,NIEBLA,GRANIZO',
    'RAIN,SNOW,WIND,THUNDER,LIGHTNING,FOG,HAIL',
  ],
  [
    'estaciones',
    'Estaciones',
    'Seasons',
    5,
    'VERANO,OTOÑO,INVIERNO,PRIMAVERA,CALOR,FRIO,DESHIELO',
    'SUMMER,AUTUMN,WINTER,SPRING,HEAT,COLD,THAW',
  ],
  [
    'montanas',
    'Montañas',
    'Mountains',
    5,
    'CIMA,VALLE,ROCA,CUEVA,LADERA,NEVERO,BARRANCO',
    'SUMMIT,VALLEY,ROCK,CAVE,SLOPE,SNOWFIELD,RAVINE',
  ],
  [
    'rios',
    'Ríos',
    'Rivers',
    5,
    'CAUCE,ORILLA,DELTA,AFLUENTE,RAPIDO,MEANDRO,MANANTIAL',
    'CHANNEL,BANK,DELTA,TRIBUTARY,RAPID,MEANDER,SPRING',
  ],
  [
    'selva',
    'Selva',
    'Rainforest',
    6,
    'JAGUAR,TUCAN,LIANA,ORQUIDEA,TAPIR,PEREZOSO,ANACONDA,CAIMAN',
    'JAGUAR,TOUCAN,LIANA,ORCHID,TAPIR,SLOTH,ANACONDA,CAIMAN',
  ],
  [
    'sabana',
    'Sabana',
    'Savanna',
    6,
    'LEON,CEBRA,JIRAFA,ELEFANTE,HIENA,GACELA,ACACIA,BUFALO',
    'LION,ZEBRA,GIRAFFE,ELEPHANT,HYENA,GAZELLE,ACACIA,BUFFALO',
  ],
  [
    'polar',
    'Mundo polar',
    'Polar world',
    6,
    'PINGUINO,MORSA,BANQUISA,ICEBERG,AURORA,KRIL,NARVAL,RENO',
    'PENGUIN,WALRUS,PACKICE,ICEBERG,AURORA,KRILL,NARWHAL,REINDEER',
  ],
  [
    'desierto',
    'Desierto',
    'Desert',
    6,
    'DUNA,OASIS,CAMELLO,CACTUS,ARENA,ESCORPION,SEQUIA,CARAVANA',
    'DUNE,OASIS,CAMEL,CACTUS,SAND,SCORPION,DROUGHT,CARAVAN',
  ],
  [
    'cuerpo',
    'Cuerpo humano',
    'Human body',
    6,
    'CEREBRO,CORAZON,PULMON,HUESO,MUSCULO,DIENTE,LENGUA,RIÑON',
    'BRAIN,HEART,LUNG,BONE,MUSCLE,TOOTH,TONGUE,KIDNEY',
  ],
  [
    'sentidos',
    'Los sentidos',
    'The senses',
    6,
    'VISTA,OIDO,TACTO,GUSTO,OLFATO,AROMA,TEXTURA,SONIDO',
    'SIGHT,HEARING,TOUCH,TASTE,SMELL,AROMA,TEXTURE,SOUND',
  ],
  [
    'emociones',
    'Emociones',
    'Emotions',
    6,
    'ALEGRIA,CALMA,MIEDO,TRISTEZA,ASOMBRO,TERNURA,ORGULLO,ILUSION',
    'JOY,CALM,FEAR,SADNESS,WONDER,TENDERNESS,PRIDE,HOPE',
  ],
  [
    'amistad',
    'Amistad',
    'Friendship',
    6,
    'AMIGO,ABRAZO,RESPETO,AYUDA,RISA,CONFIANZA,LEALTAD,APOYO',
    'FRIEND,HUG,RESPECT,HELP,LAUGHTER,TRUST,LOYALTY,SUPPORT',
  ],
  [
    'astronomia',
    'Astronomía',
    'Astronomy',
    8,
    'NEBULOSA,QUASAR,PULSAR,ECLIPSE,SUPERNOVA,ASTEROIDE,GRAVEDAD,LUNACION',
    'NEBULA,QUASAR,PULSAR,ECLIPSE,SUPERNOVA,ASTEROID,GRAVITY,LUNATION',
  ],
  [
    'geologia',
    'Geología',
    'Geology',
    8,
    'GRANITO,BASALTO,CUARZO,MAGMA,ESTRATO,EROSION,TECTONICA,MINERAL',
    'GRANITE,BASALT,QUARTZ,MAGMA,STRATUM,EROSION,TECTONICS,MINERAL',
  ],
  [
    'quimica',
    'Química',
    'Chemistry',
    8,
    'ATOMO,MOLECULA,PROTON,NEUTRON,ELECTRON,OXIGENO,CARBONO,HIDROGENO',
    'ATOM,MOLECULE,PROTON,NEUTRON,ELECTRON,OXYGEN,CARBON,HYDROGEN',
  ],
  [
    'fisica',
    'Física',
    'Physics',
    8,
    'FUERZA,MASA,VELOCIDAD,INERCIA,FRICCION,PRESION,IMPULSO,ONDA',
    'FORCE,MASS,VELOCITY,INERTIA,FRICTION,PRESSURE,MOMENTUM,WAVE',
  ],
  [
    'tecnologia',
    'Tecnología',
    'Technology',
    8,
    'PANTALLA,TECLADO,CIRCUITO,SENSOR,MEMORIA,PROCESADOR,ANTENA,CABLE',
    'SCREEN,KEYBOARD,CIRCUIT,SENSOR,MEMORY,PROCESSOR,ANTENNA,CABLE',
  ],
  [
    'inventos',
    'Inventos',
    'Inventions',
    8,
    'IMPRENTA,RUEDA,BRUJULA,BOMBILLA,TELEFONO,RADIO,CAMARA,BATERIA',
    'PRINTING,WHEEL,COMPASS,LIGHTBULB,TELEPHONE,RADIO,CAMERA,BATTERY',
  ],
  [
    'arquitectura',
    'Arquitectura',
    'Architecture',
    8,
    'CUPULA,ARCO,BOVEDA,FACHADA,CIMIENTO,VENTANA,ESCALERA,BALCON',
    'DOME,ARCH,VAULT,FACADE,FOUNDATION,WINDOW,STAIRCASE,BALCONY',
  ],
  [
    'navegacion',
    'Navegación',
    'Navigation',
    8,
    'TIMON,VELA,ANCLA,PROA,POPA,MASTIL,BRUJULA,ESCOTILLA',
    'RUDDER,SAIL,ANCHOR,BOW,STERN,MAST,COMPASS,HATCH',
  ],
  [
    'ecologia',
    'Ecología',
    'Ecology',
    10,
    'ECOSISTEMA,HABITAT,RECICLAJE,COMPOST,POLINIZAR,HUMEDAL,BIOMASA,SOSTENIBLE',
    'ECOSYSTEM,HABITAT,RECYCLING,COMPOST,POLLINATE,WETLAND,BIOMASS,SUSTAINABLE',
  ],
  [
    'matematicas',
    'Matemáticas',
    'Mathematics',
    10,
    'FRACCION,ECUACION,ALGEBRA,GEOMETRIA,ANGULO,PERIMETRO,DIAMETRO,DECIMAL',
    'FRACTION,EQUATION,ALGEBRA,GEOMETRY,ANGLE,PERIMETER,DIAMETER,DECIMAL',
  ],
  [
    'mitologia',
    'Mitología',
    'Mythology',
    10,
    'DRAGON,FENIX,UNICORNIO,CENTAURO,PEGASO,GRIFO,SIRENA,MINOTAURO',
    'DRAGON,PHOENIX,UNICORN,CENTAUR,PEGASUS,GRIFFIN,MERMAID,MINOTAUR',
  ],
  [
    'expedicion',
    'Gran expedición',
    'Grand expedition',
    10,
    'CARTOGRAFIA,COORDENADA,HORIZONTE,HEMISFERIO,LATITUD,LONGITUD,MERIDIANO,PENINSULA',
    'CARTOGRAPHY,COORDINATE,HORIZON,HEMISPHERE,LATITUDE,LONGITUDE,MERIDIAN,PENINSULA',
  ],
];

const originalEnglish: Record<string, [string, string]> = {
  cielo: ['Sky', 'SUN,LIGHT,MOON,CLOUD'],
  agua: ['Water', 'SEA,RIVER,WAVE,FISH'],
  hogar: ['Home', 'HOUSE,TABLE,CUP,SOFA'],
  naturaleza: ['Nature', 'MOON,CLOUD,AIR,SUN,SEA,RIVER'],
  huerto: ['Orchard', 'PEAR,GRAPE,KIWI,LIME,COCONUT,FIG'],
  animales: ['Animals', 'CAT,BEAR,DUCK,WOLF,FROG,SEAL'],
  bosque: ['Forest', 'TREE,LEAF,MOSS,PINE,OAK,MUSHROOMS,BRANCH'],
  viaje: ['Travel', 'BOAT,TRAIN,PLANE,MAP,ROUTE,BEACH,HOTEL'],
  musica: ['Music', 'PIANO,VIOLIN,RHYTHM,NOTE,CHOIR,FLUTE,DRUM'],
  universo: ['Universe', 'PLANET,STAR,GALAXY,COMET,ORBIT,SATURN,METEOR,COSMOS'],
  oceano: [
    'Ocean',
    'WHALE,DOLPHIN,SHARK,CORAL,JELLYFISH,OCTOPUS,SPONGE,TURTLE',
  ],
  aventura: [
    'Adventure',
    'ROAD,MOUNTAIN,FOREST,WATERFALL,COMPASS,BACKPACK,SHELTER,TRAIL',
  ],
  planeta: [
    'Planet',
    'CONTINENT,DESERT,GLACIER,VOLCANO,OCEAN,ISLAND,PLAIN,RANGE',
  ],
  exploracion: [
    'Exploration',
    'TELESCOPE,ASTRONAUT,SATELLITE,LABORATORY,MICROSCOPE,INVENTION,ENERGY,SCIENCE',
  ],
};
export const EXTRA_PUZZLES: PuzzleChoice[] = rows.map(
  ([id, name, , size, words], i) => ({
    id,
    name,
    size,
    seed: 22001 + i,
    words: words.split(','),
  }),
);
const english = {
  ...originalEnglish,
  ...Object.fromEntries(
    rows.map(([id, , name, , , words]) => [id, [name, words]]),
  ),
};
export function localizePuzzle<T extends PuzzleChoice>(
  p: T,
  language: Language,
): T {
  if (language !== 'es' && language !== 'en') {
    const item = WORLD_CONTENT[language]?.[p.id];
    if (!item) throw Error(`Missing puzzle translation: ${language}/${p.id}`);
    const legacy =
      language === 'ca'
        ? undefined
        : LEGACY_WORLD_CONTENT[language]?.[
            p.id as keyof typeof LEGACY_WORLD_CONTENT.fr
          ];
    return {
      ...p,
      ...item,
      language,
      ...(legacy
        ? {
            legacyWords: legacy.words,
            legacySize: [3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 8, 10][
              LEGACY_IDS.indexOf(p.id)
            ],
          }
        : {}),
    };
  }
  if (language === 'es') {
    const words = p.words.map(spanishSpelling);
    return words.some((word, i) => word !== p.words[i])
      ? { ...p, words, legacyWords: p.words }
      : p;
  }
  if (!english[p.id]) return p;
  const [name, words] = english[p.id];
  return { ...p, name, words: words.split(','), language: 'en' };
}
export const CHAPTERS = [
  'Primeras palabras',
  'Entre árboles',
  'Más allá',
  'Grandes descubrimientos',
  'Pequeñas cosas',
  'A la mesa',
  'Vida cercana',
  'Nuestro mundo',
  'Tiempo libre',
  'Al aire libre',
  'Mundos salvajes',
  'Lo que somos',
  'Ciencia en acción',
  'Ideas que viajan',
  'El gran desafío',
];
