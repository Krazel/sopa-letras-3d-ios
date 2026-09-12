export type Point = [number, number, number];
export type Cell = { id: number; position: Point; letter: string };
export type Word = { text: string; path: number[]; faces?: number[] };
export type Puzzle = {
  seed: number;
  size: number;
  cells: Cell[];
  words: Word[];
  shape: 'cube' | 'star';
  neighbors: number[][];
  edges: [number, number][];
  outline?: [Point, Point][];
};
export type GameState = {
  puzzle: Puzzle;
  found: string[];
  selection: number[];
  selectionLetters?: string[];
  selectionFaces?: number[];
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
  (
    s.selectionLetters ?? s.selection.map((id) => s.puzzle.cells[id].letter)
  ).join('');

// Face zero preserves every authored solution. The other five faces are stable,
// distinct alternatives; rotating the camera never rerolls a die.
const dieCache = new WeakMap<Cell, { seed: number; letters: string[] }>();
export function dieLetters(cell: Cell, seed: number): string[] {
  const cached = dieCache.get(cell);
  if (cached?.seed === seed) return cached.letters;
  const letters = [cell.letter];
  const alphabet = shuffle(
    Array.from('ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'),
    random(seed ^ Math.imul(cell.id + 1, 2654435761)),
  );
  for (const letter of alphabet) {
    if (!letters.includes(letter)) letters.push(letter);
    if (letters.length === 6) break;
  }
  dieCache.set(cell, { seed, letters });
  return letters;
}
export function selectDie(
  state: GameState,
  id: number,
  face: number,
): GameState {
  const cell = state.puzzle.cells[id];
  if (
    !cell ||
    !Number.isInteger(id) ||
    !Number.isInteger(face) ||
    face < 0 ||
    face > 5
  )
    return state;
  return selectCell(state, id, dieLetters(cell, state.puzzle.seed)[face], face);
}
// Opposite faces are paired: front/back, right/left, top/bottom.
export const adjacentDieFaces = (a: number, b: number) =>
  a !== b && Math.floor(a / 2) !== Math.floor(b / 2);
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
  shape?: 'cube' | 'star';
};
export const PUZZLES: PuzzleChoice[] = [
  {
    id: 'estrella',
    name: 'Estrella 3D',
    size: 13,
    shape: 'star' as const,
    seed: 1381,
    words: [
      'ESTRELLA',
      'DESTELLO',
      'BRILLO',
      'ORBITA',
      'COMETA',
      'COSMOS',
      'NOCHE',
      'LUZ',
    ],
  },
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
export function starOutline(size: number, z: number): Point[] {
  const center = (size - 1) / 2;
  const taper = 1;
  return Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5,
      radius = center * (i % 2 ? 0.46 : 1) * taper;
    return [
      center + Math.cos(angle) * radius,
      center + Math.sin(angle) * radius,
      z,
    ];
  });
}
export function inPolygon(x: number, y: number, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function createPuzzle(
  seed = 1609,
  size = SIZE,
  terms = WORDS,
  shape: 'cube' | 'star' = 'cube',
): Puzzle {
  if (
    !(shape === 'star' ? size === 13 : [3, 4, 5, 6, 8, 10].includes(size)) ||
    terms.length === 0 ||
    terms.length > 12 ||
    new Set(terms).size !== terms.length ||
    terms.some((w) => !/^[A-ZÑ]{3,11}$/.test(w))
  )
    throw new Error('Configuración de sopa no válida');
  const rng = random(seed);
  const cells: Cell[] = Array.from({ length: size ** 3 }, (_, id) => ({
    id,
    position: pointAt(id, size),
    letter: '',
  }))
    .filter((c) => shape === 'cube' || starContains(c.position, size))
    .map((c, id) => ({ ...c, id }));
  const lookup = new Map(cells.map((c) => [c.position.join(','), c.id]));
  const neighbors = cells.map((c) => {
    const ids: number[] = [];
    for (let z = -1; z <= 1; z++)
      for (let y = -1; y <= 1; y++)
        for (let x = -1; x <= 1; x++) {
          const id = lookup.get(
            [c.position[0] + x, c.position[1] + y, c.position[2] + z].join(','),
          );
          if (id !== undefined && id !== c.id) ids.push(id);
        }
    return ids.sort((a, b) => a - b);
  });
  const edges: [number, number][] = [];
  if (shape === 'cube') {
    const far = size * size - 1,
      row = size * (size - 1);
    for (let z = 0; z < size; z++) {
      const base = z * size * size;
      edges.push(
        [base, base + size - 1],
        [base + size - 1, base + far],
        [base + far, base + row],
        [base + row, base],
      );
    }
    for (const c of [0, size - 1, row, far])
      edges.push([c, c + size * size * (size - 1)]);
  }
  const outline: [Point, Point][] = [];
  if (shape === 'star') {
    const center = (size - 1) / 2;
    for (let z = center - 2; z <= center + 2; z++) {
      const ring = starOutline(size, z);
      for (let i = 0; i < 10; i++) outline.push([ring[i], ring[(i + 1) % 10]]);
    }
    const front = starOutline(size, center - 2),
      back = starOutline(size, center + 2);
    for (let i = 0; i < 10; i++) outline.push([front[i], back[i]]);
  }
  const words: Word[] = [];
  for (const [index, text] of terms.entries()) {
    let budget = 20000;
    function grow(path: number[]): number[] | null {
      if (--budget < 0) return null;
      if (path.length === text.length)
        return index < 3 &&
          new Set(path.map((id) => cells[id].position[2])).size === 1
          ? null
          : path;
      const candidates = shuffle(
        (path.length
          ? neighbors[path.at(-1)!].map((id) => cells[id])
          : cells
        ).filter(
          (c) =>
            !path.includes(c.id) &&
            (!c.letter || c.letter === text[path.length]),
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
  return { seed, size, cells, words, shape, neighbors, edges, outline };
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
  return { ...initialStateForChoice(p) };
}
export function initialStateForChoice(p: PuzzleChoice): GameState {
  return {
    puzzle: createPuzzle(p.seed, p.size, p.words, p.shape),
    found: [],
    selection: [],
    message:
      'Toca las letras una a una. Cada letra debe estar junto a la anterior.',
  };
}
export const isWon = (s: GameState) => s.found.length === s.puzzle.words.length;
export function selectCell(
  state: GameState,
  id: number,
  faceLetter?: string,
  face?: number,
): GameState {
  if (isWon(state) || !state.puzzle.cells[id]) return state;
  if (!Number.isInteger(id)) return state;
  const previousIndex = state.selection.findIndex(
    (selected, i) =>
      selected === id &&
      (face === undefined || state.selectionFaces?.[i] === face),
  );
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
      ...(state.selectionFaces
        ? { selectionFaces: state.selectionFaces.slice(0, selection.length) }
        : {}),
      ...(state.selectionLetters
        ? {
            selectionLetters: state.selectionLetters.slice(0, selection.length),
          }
        : {}),
      message: selection.length
        ? 'Has retrocedido. Sigue por una letra vecina.'
        : 'Selección cancelada. Elige una letra.',
    };
  }
  const last = state.selection.at(-1);
  const connected =
    last === id && face !== undefined
      ? adjacentDieFaces(state.selectionFaces?.at(-1) ?? face, face)
      : last === undefined || state.puzzle.neighbors[last].includes(id);
  if (!connected)
    return {
      ...state,
      selection: [],
      ...(state.selectionFaces ? { selectionFaces: [] } : {}),
      ...(state.selectionLetters ? { selectionLetters: [] } : {}),
      message:
        'Esa letra no es vecina. Selección borrada; elige una letra para empezar.',
    };
  const path = [...state.selection, id];
  const faces =
    face === undefined ? undefined : [...(state.selectionFaces ?? []), face];
  const letters = [
    ...(state.selectionLetters ??
      state.selection.map((i) => state.puzzle.cells[i].letter)),
    faceLetter ?? state.puzzle.cells[id].letter,
  ];
  const extra =
    faceLetter !== undefined || state.selectionLetters
      ? {
          selectionLetters: letters,
          ...(faces ? { selectionFaces: faces } : {}),
        }
      : {};
  const cleared =
    faceLetter !== undefined || state.selectionLetters
      ? { selectionLetters: [], ...(faces ? { selectionFaces: [] } : {}) }
      : {};
  const text = letters.join('');
  const word = state.puzzle.words.find(
    (w) => w.text === text || w.text === text.split('').reverse().join(''),
  );
  if (!word)
    return {
      ...state,
      selection: path,
      ...extra,
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
      ...cleared,
    };
  const puzzle = {
    ...state.puzzle,
    words: state.puzzle.words.map((w) =>
      w.text === word.text ? { ...w, path, ...(faces ? { faces } : {}) } : w,
    ),
  };
  return {
    ...state,
    puzzle,
    selection: [],
    ...cleared,
    found: [...state.found, word.text],
    message: `¡${word.text} encontrada!`,
  };
}

// A consistent cross-section and margin keep every letter within the true outline.
export function starContains([x, y, z]: Point, size = 13) {
  const c = (size - 1) / 2;
  if (Math.abs(z - c) > 2) return false;
  const ring = starOutline(size, z);
  return [-0.2, 0.2].every((dx) =>
    [-0.2, 0.2].every((dy) => inPolygon(x + dx, y + dy, ring)),
  );
}
