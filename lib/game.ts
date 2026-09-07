export type Point = [number, number, number];
export type Cell = { id: number; position: Point; letter: string };
export type Word = { text: string; path: number[] };
export type Puzzle = { seed: number; cells: Cell[]; words: Word[] };
export type GameState = {
  puzzle: Puzzle;
  found: string[];
  selection: number[];
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
export function areNeighbors(a: number, b: number): boolean {
  if (![a, b].every(id => Number.isInteger(id) && id >= 0 && id < SIZE ** 3) || a === b) return false;
  const p = pointAt(a), q = pointAt(b);
  return p.every((value, axis) => Math.abs(value - q[axis]) <= 1);
}
export const selectionText = (s: GameState) => s.selection.map(id => s.puzzle.cells[id].letter).join('');
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
  const words: Word[] = [];
  for (const [index, text] of WORDS.entries()) {
    function grow(path: number[]): number[] | null {
      if (path.length === text.length) return index < 3 && new Set(path.map(id => pointAt(id)[2])).size === 1 ? null : path;
      const candidates = shuffle(cells.filter(c =>
        !path.includes(c.id) && (!c.letter || c.letter === text[path.length]) &&
        (!path.length || areNeighbors(path.at(-1)!, c.id))), rng);
      for (const cell of candidates) {
        const result = grow([...path, cell.id]);
        if (result) return result;
      }
      return null;
    }
    const path = grow([]);
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
  selection: [],
  message: 'Toca las letras una a una. Cada letra debe estar junto a la anterior.',
});
export const isWon = (s: GameState) => s.found.length === s.puzzle.words.length;
export function selectCell(state: GameState, id: number): GameState {
  if (isWon(state) || !state.puzzle.cells[id]) return state;
  if (!Number.isInteger(id)) return state;
  const previousIndex = state.selection.indexOf(id);
  if (previousIndex >= 0) {
    const selection = state.selection.slice(0, previousIndex === state.selection.length - 1 ? previousIndex : previousIndex + 1);
    return { ...state, selection, message: selection.length ? 'Has retrocedido. Sigue por una letra vecina.' : 'Selección cancelada. Elige una letra.' };
  }
  const last = state.selection.at(-1);
  if (last !== undefined && !areNeighbors(last, id))
    return {
      ...state,
      message: 'Esa letra no es vecina. Sigue una conexión cercana; puedes cambiar de capa.',
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
      message: text.length >= Math.max(...WORDS.map(w => w.length))
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

