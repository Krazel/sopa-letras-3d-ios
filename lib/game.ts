export type Point = [number, number, number];
export type Cell = { id: number; position: Point; letter: string };
export type Word = { text: string; path: number[] };
export type Puzzle = { seed: number; cells: Cell[]; words: Word[] };
export type GameState = {
  puzzle: Puzzle;
  found: string[];
  start: number | null;
  message: string;
};
export const SIZE = 4;
export const WORDS = ['LUNA', 'NUBE', 'AIRE', 'SOL', 'MAR', 'RIO'];
export const idAt = ([x, y, z]: Point) => x + SIZE * y + SIZE * SIZE * z;
export const pointAt = (id: number): Point => [
  id % SIZE,
  Math.floor(id / SIZE) % SIZE,
  Math.floor(id / (SIZE * SIZE)),
];
const inside = (p: Point) => p.every((v) => v >= 0 && v < SIZE);
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
export function createPuzzle(seed = 1609): Puzzle {
  const rng = random(seed);
  const cells: Cell[] = Array.from({ length: 64 }, (_, id) => ({
    id,
    position: pointAt(id),
    letter: '',
  }));
  const directions: Point[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) if (x || y || z) directions.push([x, y, z]);
  const words: Word[] = [];
  for (const [index, text] of WORDS.entries()) {
    const candidates: number[][] = [];
    for (const cell of cells)
      for (const d of directions) {
        if (index < 3 && d[2] === 0) continue;
        const points = text.split('').map(
          (_, i) => cell.position.map((v, a) => v + d[a] * i) as Point,
        );
        if (points.every(inside)) candidates.push(points.map(idAt));
      }
    const path = shuffle(candidates, rng).find((path) =>
      path.every((id, i) => !cells[id].letter || cells[id].letter === text[i]),
    );
    if (!path) return createPuzzle(seed + 1);
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
  return { seed, cells, words };
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
export const initialState = (seed = 1609): GameState => ({
  puzzle: createPuzzle(seed),
  found: [],
  start: null,
  message: 'Elige la primera y la última letra de una palabra.',
});
export const isWon = (s: GameState) => s.found.length === s.puzzle.words.length;
export function selectCell(state: GameState, id: number): GameState {
  if (isWon(state) || !state.puzzle.cells[id]) return state;
  if (state.start === null)
    return {
      ...state,
      start: id,
      message: `${state.puzzle.cells[id].letter} seleccionada. Busca el otro extremo; puedes cambiar de capa.`,
    };
  if (state.start === id)
    return {
      ...state,
      start: null,
      message: 'Selección cancelada. Busca otra palabra.',
    };
  const path = lineBetween(state.start, id);
  if (!path)
    return {
      ...state,
      start: null,
      message:
        'Los extremos deben formar una línea recta, también en profundidad.',
    };
  const text = path.map((id) => state.puzzle.cells[id].letter).join('');
  const word = state.puzzle.words.find(
    (w) => w.text === text || w.text === text.split('').reverse().join(''),
  );
  if (!word)
    return {
      ...state,
      start: null,
      message: `${text}: no es una palabra de la lista. ¡Prueba otra vez!`,
    };
  if (state.found.includes(word.text))
    return {
      ...state,
      start: null,
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
    start: null,
    found: [...state.found, word.text],
    message: `¡${word.text} encontrada!`,
  };
}

