export type Point = [number, number, number];
export type Cell = { id: number; position: Point; letter: string };
export type Word = { text: string; path: number[] };
export type Puzzle = {
  seed: number;
  size: number;
  cells: Cell[];
  words: Word[];
};
export type GameState = {
  puzzle: Puzzle;
  found: string[];
  selection: number[];
  message: string;
};
export const SIZE = 4;
export const WORDS = ['LUNA', 'NUBE', 'AIRE', 'SOL', 'MAR', 'RIO'];
export const idAt = ([x, y, z]: Point, size = SIZE) =>
  x + size * y + size * size * z;
export const pointAt = (id: number, size = SIZE): Point => [
  id % size,
  Math.floor(id / size) % size,
  Math.floor(id / (size * size)),
];
export function areNeighbors(a: number, b: number, size = SIZE): boolean {
  if (
    ![a, b].every((id) => Number.isInteger(id) && id >= 0 && id < size ** 3) ||
    a === b
  )
    return false;
  const p = pointAt(a, size),
    q = pointAt(b, size);
  return p.every((value, axis) => Math.abs(value - q[axis]) <= 1);
}
export const selectionText = (s: GameState) =>
  s.selection.map((id) => s.puzzle.cells[id].letter).join('');
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], rng: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
export type PuzzleChoice = {
  id: string;
  name: string;
  size: number;
  seed: number;
  words: string[];
};
export const PUZZLES: PuzzleChoice[] = [
  {
    id: 'planeta',
    name: 'Planeta',
    size: 8,
    seed: 81,
    words: [
      'CONTINENTE',
      'DESIERTO',
      'GLACIAR',
      'VOLCAN',
      'OCEANO',
      'ISLA',
      'LLANURA',
      'CORDILLERA',
    ],
  },
  {
    id: 'exploracion',
    name: 'Exploración',
    size: 10,
    seed: 101,
    words: [
      'TELESCOPIO',
      'ASTRONAUTA',
      'SATELITE',
      'LABORATORIO',
      'MICROSCOPIO',
      'INVENTO',
      'ENERGIA',
      'CIENCIA',
    ],
  },
  {
    id: 'cielo',
    name: 'Cielo',
    size: 3,
    seed: 31,
    words: ['SOL', 'LUZ', 'LUNA', 'NUBE'],
  },
  {
    id: 'agua',
    name: 'Agua',
    size: 3,
    seed: 32,
    words: ['MAR', 'RIO', 'OLA', 'PEZ'],
  },
  {
    id: 'hogar',
    name: 'Hogar',
    size: 3,
    seed: 33,
    words: ['CASA', 'MESA', 'TAZA', 'SOFA'],
  },
  { id: 'naturaleza', name: 'Naturaleza', size: 4, seed: 1609, words: WORDS },
  {
    id: 'huerto',
    name: 'Huerto',
    size: 4,
    seed: 42,
    words: ['PERA', 'UVA', 'KIWI', 'LIMA', 'COCO', 'HIGO'],
  },
  {
    id: 'animales',
    name: 'Animales',
    size: 4,
    seed: 43,
    words: ['GATO', 'OSO', 'PATO', 'LOBO', 'RANA', 'FOCA'],
  },
  {
    id: 'bosque',
    name: 'Bosque',
    size: 5,
    seed: 51,
    words: ['ARBOL', 'HOJA', 'MUSGO', 'PINO', 'ROBLE', 'SETAS', 'RAMA'],
  },
  {
    id: 'viaje',
    name: 'Viaje',
    size: 5,
    seed: 52,
    words: ['BARCO', 'TREN', 'AVION', 'MAPA', 'RUTA', 'PLAYA', 'HOTEL'],
  },
  {
    id: 'musica',
    name: 'Música',
    size: 5,
    seed: 53,
    words: ['PIANO', 'VIOLIN', 'RITMO', 'NOTA', 'CORO', 'FLAUTA', 'TAMBOR'],
  },
  {
    id: 'universo',
    name: 'Universo',
    size: 6,
    seed: 61,
    words: [
      'PLANETA',
      'ESTRELLA',
      'GALAXIA',
      'COMETA',
      'ORBITA',
      'SATURNO',
      'METEORO',
      'COSMOS',
    ],
  },
  {
    id: 'oceano',
    name: 'Océano',
    size: 6,
    seed: 62,
    words: [
      'BALLENA',
      'DELFIN',
      'TIBURON',
      'CORAL',
      'MEDUSA',
      'PULPO',
      'ESPONJA',
      'TORTUGA',
    ],
  },
  {
    id: 'aventura',
    name: 'Aventura',
    size: 6,
    seed: 63,
    words: [
      'CAMINO',
      'MONTANA',
      'BOSQUE',
      'CASCADA',
      'BRUJULA',
      'MOCHILA',
      'REFUGIO',
      'SENDERO',
    ],
  },
].sort((a, b) => a.size - b.size);
export const DEFAULT_PUZZLE = 'naturaleza';
export function createPuzzle(seed = 1609, size = SIZE, terms = WORDS): Puzzle {
  if (
    ![3, 4, 5, 6, 8, 10].includes(size) ||
    terms.length === 0 ||
    new Set(terms).size !== terms.length ||
    terms.some((w) => !/^[A-Z]{3,11}$/.test(w))
  )
    throw new Error('Configuración de sopa no válida');
  const rng = random(seed);
  const cells: Cell[] = Array.from({ length: size ** 3 }, (_, id) => ({
    id,
    position: pointAt(id, size),
    letter: '',
  }));
  const words: Word[] = [];
  for (const [index, text] of terms.entries()) {
    let budget = 20000;
    function grow(path: number[]): number[] | null {
      if (--budget < 0) return null;
      if (path.length === text.length)
        return index < 3 &&
          new Set(path.map((id) => pointAt(id, size)[2])).size === 1
          ? null
          : path;
      const candidates = shuffle(
        cells.filter(
          (c) =>
            !path.includes(c.id) &&
            (!c.letter || c.letter === text[path.length]) &&
            (!path.length || areNeighbors(path.at(-1)!, c.id, size)),
        ),
        rng,
      );
      for (const cell of candidates) {
        const result = grow([...path, cell.id]);
        if (result) return result;
      }
      return null;
    }
    const path = grow([]);
    if (!path) throw new Error(`No se pudo colocar ${text} en la sopa ${seed}`);
    path.forEach((id, i) => {
      cells[id].letter = text[i];
    });
    words.push({ text, path });
  }
  const alphabet = 'AAAABCDEEEEFGIIIJLMNNOOOPRRSSSTUUV';
  cells.forEach((cell) => {
    if (!cell.letter)
      cell.letter = alphabet[Math.floor(rng() * alphabet.length)];
  });
  return { seed, size, cells, words };
}
export function lineBetween(a: number, b: number): number[] | null {
  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    a < 0 ||
    b < 0 ||
    a >= 64 ||
    b >= 64 ||
    a === b
  )
    return null;
  const start = pointAt(a),
    end = pointAt(b),
    delta = end.map((v, i) => v - start[i]);
  const length = Math.max(...delta.map(Math.abs));
  if (delta.some((v) => v !== 0 && Math.abs(v) !== length)) return null;
  return Array.from({ length: length + 1 }, (_, i) =>
    idAt(start.map((v, axis) => v + Math.sign(delta[axis]) * i) as Point),
  );
}
export const initialState = (
  seed = 1609,
  size = SIZE,
  words = WORDS,
): GameState => ({
  puzzle: createPuzzle(seed, size, words),
  found: [],
  selection: [],
  message:
    'Toca las letras una a una. Cada letra debe estar junto a la anterior.',
});
export function startPuzzle(id: string): GameState {
  const p = PUZZLES.find((p) => p.id === id);
  if (!p) throw new Error('Sopa desconocida');
  return initialState(p.seed, p.size, p.words);
}
export const isWon = (s: GameState) => s.found.length === s.puzzle.words.length;
export function selectCell(state: GameState, id: number): GameState {
  if (isWon(state) || !state.puzzle.cells[id]) return state;
  if (!Number.isInteger(id)) return state;
  const previousIndex = state.selection.indexOf(id);
  if (previousIndex >= 0) {
    const selection = state.selection.slice(
      0,
      previousIndex === state.selection.length - 1
        ? previousIndex
        : previousIndex + 1,
    );
    return {
      ...state,
      selection,
      message: selection.length
        ? 'Has retrocedido. Sigue por una letra vecina.'
        : 'Selección cancelada. Elige una letra.',
    };
  }
  const last = state.selection.at(-1);
  if (last !== undefined && !areNeighbors(last, id, state.puzzle.size))
    return {
      ...state,
      selection: [],
      message:
        'Esa letra no es vecina. Selección borrada; elige una letra para empezar.',
    };
  const path = [...state.selection, id];
  const text = path.map((id) => state.puzzle.cells[id].letter).join('');
  const word = state.puzzle.words.find(
    (w) => w.text === text || w.text === text.split('').reverse().join(''),
  );
  if (!word)
    return {
      ...state,
      selection: path,
      message:
        text.length >= Math.max(...state.puzzle.words.map((w) => w.text.length))
          ? `${text} no está en la lista. Toca una letra seleccionada para retroceder o cancela.`
          : `${text} · Sigue por una letra vecina. Puedes girar, hacer zoom y cambiar de capa.`,
    };
  if (state.found.includes(word.text))
    return {
      ...state,
      selection: [],
      message: `${word.text} ya estaba encontrada.`,
    };
  const puzzle = {
    ...state.puzzle,
    words: state.puzzle.words.map((w) =>
      w.text === word.text ? { ...w, path } : w,
    ),
  };
  return {
    ...state,
    puzzle,
    selection: [],
    found: [...state.found, word.text],
    message: `¡${word.text} encontrada!`,
  };
}
