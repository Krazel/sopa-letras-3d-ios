import {
  PUZZLES,
  initialStateForChoice,
  isWon,
  type GameState,
  type PuzzleChoice,
} from './game.ts';

export const LEVEL_IDS = [
  'cielo',
  'agua',
  'hogar',
  'naturaleza',
  'huerto',
  'animales',
  'bosque',
  'viaje',
  'musica',
  'estrella',
  'universo',
  'oceano',
  'aventura',
  'planeta',
  'exploracion',
];
export const LEVELS = LEVEL_IDS.map((id, index) => ({
  ...PUZZLES.find((p) => p.id === id)!,
  number: index + 1,
  difficulty:
    index < 3
      ? 'Fácil'
      : index < 6
        ? 'Suave'
        : index < 10
          ? 'Intermedio'
          : index < 13
            ? 'Difícil'
            : 'Experto',
}));
export type Snapshot = { paths: Record<string, number[]> };
export type SaveData = {
  version: 1;
  completed: string[];
  progress: Record<string, Snapshot>;
  customs: PuzzleChoice[];
};
export const SAVE_KEY = 'sopa-player-v1';
export const emptySave = (): SaveData => ({
  version: 1,
  completed: [],
  progress: {},
  customs: [],
});
export const normalizeWord = (word: string) =>
  Array.from(word.trim().toUpperCase())
    .map((c) =>
      c === 'Ñ' ? c : c.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    )
    .join('');
export function customChoice(
  name: string,
  text: string,
  shape: 'cube' | 'star',
  size: number,
  seed: number,
  id: string,
): PuzzleChoice {
  const words = text
    .split(/[,;\n]+/)
    .map(normalizeWord)
    .filter(Boolean);
  if (!name.trim() || name.trim().length > 40)
    throw Error('Pon un nombre de entre 1 y 40 caracteres.');
  if (words.length < 1 || words.length > 12)
    throw Error('Escribe entre 1 y 12 palabras.');
  if (words.some((w) => !/^[A-ZÑ]{3,11}$/.test(w)))
    throw Error(
      'Cada palabra debe tener de 3 a 11 letras, sin espacios ni números.',
    );
  if (new Set(words).size !== words.length)
    throw Error('Hay palabras repetidas. Deja cada palabra una sola vez.');
  if (shape === 'cube' && ![3, 4, 5, 6, 8, 10].includes(size))
    throw Error('Elige un tamaño disponible.');
  if (shape !== 'cube' && shape !== 'star')
    throw Error('Elige una forma disponible.');
  if (shape === 'cube' && words.join('').length > size ** 3 * 0.75)
    throw Error('Elige un tamaño mayor para que quepan todas las palabras.');
  return {
    id,
    name: name.trim(),
    shape,
    size: shape === 'star' ? 13 : size,
    seed,
    words,
  };
}
export function generateCustom(choice: PuzzleChoice): {
  choice: PuzzleChoice;
  game: GameState;
} {
  for (let attempt = 0; attempt < 6; attempt++) {
    const next = { ...choice, seed: (choice.seed + attempt) >>> 0 };
    try {
      return { choice: next, game: initialStateForChoice(next) };
    } catch {
      /* Try another deterministic arrangement. */
    }
  }
  throw Error(
    'No he podido encajar estas palabras. Prueba un tamaño mayor o menos palabras.',
  );
}
export const snapshot = (game: GameState): Snapshot => ({
  paths: Object.fromEntries(
    game.puzzle.words
      .filter((w) => game.found.includes(w.text))
      .map((w) => [w.text, w.path]),
  ),
});
export function restore(choice: PuzzleChoice, saved?: Snapshot): GameState {
  const game = initialStateForChoice(choice);
  if (!saved?.paths || typeof saved.paths !== 'object') return game;
  for (const word of game.puzzle.words) {
    const path = saved.paths[word.text];
    if (
      !Array.isArray(path) ||
      path.length !== word.text.length ||
      new Set(path).size !== path.length
    )
      continue;
    if (!path.every((id) => Number.isInteger(id) && !!game.puzzle.cells[id]))
      continue;
    if (
      !path
        .slice(1)
        .every((id, i) => game.puzzle.neighbors[path[i]].includes(id))
    )
      continue;
    const text = path.map((id) => game.puzzle.cells[id].letter).join('');
    if (text !== word.text && text.split('').reverse().join('') !== word.text)
      continue;
    word.path = [...path];
    game.found.push(word.text);
  }
  return game;
}
export function saveGame(
  data: SaveData,
  id: string,
  game: GameState,
): SaveData {
  return {
    ...data,
    progress: { ...data.progress, [id]: snapshot(game) },
    completed:
      LEVEL_IDS.includes(id) && isWon(game)
        ? [...new Set([...data.completed, id])]
        : data.completed,
  };
}
export function isUnlocked(data: SaveData, index: number) {
  return (
    index === 0 ||
    LEVEL_IDS.slice(0, index).every((id) => data.completed.includes(id))
  );
}
export function readSave(raw: string | null): SaveData {
  const clean = emptySave();
  if (!raw || raw.length > 256000) return clean;
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1) return clean;
    if (Array.isArray(data.completed))
      clean.completed = LEVEL_IDS.filter((id) => data.completed.includes(id));
    if (
      data.progress &&
      typeof data.progress === 'object' &&
      !Array.isArray(data.progress)
    ) {
      for (const [key, val] of Object.entries(data.progress).slice(0, 100))
        if (
          (LEVEL_IDS.includes(key) || /^custom-[a-zA-Z0-9-]+$/.test(key)) &&
          val &&
          typeof val === 'object' &&
          'paths' in val
        )
          clean.progress[key] = val as Snapshot;
    }
    if (Array.isArray(data.customs))
      for (const p of data.customs.slice(0, 20)) {
        try {
          if (
            typeof p.id !== 'string' ||
            !/^custom-[a-zA-Z0-9-]+$/.test(p.id) ||
            !Number.isInteger(p.seed) ||
            !Array.isArray(p.words)
          )
            continue;
          const next = customChoice(
            p.name,
            p.words.join('\n'),
            p.shape,
            p.size,
            p.seed,
            p.id,
          );
          if (!clean.customs.some((c) => c.id === next.id))
            clean.customs.push(next);
        } catch {
          /* Ignore malformed drafts without losing valid saved games. */
        }
      }
    return clean;
  } catch {
    return clean;
  }
}
