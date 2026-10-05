import {
  PUZZLES,
  initialStateForChoice,
  isWon,
  type GameState,
  type PuzzleChoice,
} from './game.ts';

import { EXTRA_PUZZLES, localizePuzzle } from './content.ts';
import { lettersOf, normalizeWord, validWord } from './letters.ts';
import { spanishSpelling } from './spanish-spelling.ts';
export { normalizeWord } from './letters.ts';
import type { Language } from './preferences.ts';
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
  'universo',
  'oceano',
  'aventura',
  'planeta',
  'exploracion',
  ...EXTRA_PUZZLES.map((p) => p.id),
].sort(
  (a, b) =>
    PUZZLES.find((p) => p.id === a)!.size -
    PUZZLES.find((p) => p.id === b)!.size,
);
export const DIFFICULTIES = [
  'Fácil',
  'Suave',
  'Intermedio',
  'Difícil',
  'Experto',
] as const;
export const RETOS_PARA_AVANZAR = 4;
export const LEVELS = LEVEL_IDS.map((id, index) => ({
  ...PUZZLES.find((p) => p.id === id)!,
  number: index + 1,
  difficulty:
    PUZZLES.find((p) => p.id === id)!.size === 3
      ? 'Fácil'
      : PUZZLES.find((p) => p.id === id)!.size === 4
        ? 'Suave'
        : PUZZLES.find((p) => p.id === id)!.size === 5
          ? 'Intermedio'
          : PUZZLES.find((p) => p.id === id)!.size === 6
            ? 'Difícil'
            : 'Experto',
}));
export type Snapshot = { paths: Record<string, number[]> };
export const CAMPAIGN_SIZES = [3, 4, 5, 6, 8, 10] as const;
export const CAMPAIGN_IDS = CAMPAIGN_SIZES.flatMap((size) =>
  LEVELS.filter((p) => p.size === size)
    .slice(0, RETOS_PARA_AVANZAR)
    .map((p) => p.id),
);
export type SaveData = {
  version: 1;
  completed: string[];
  freeCompleted: string[];
  progress: Record<string, Snapshot>;
  customs: PuzzleChoice[];
  foundWords?: Record<string, string[]>;
};
export const SAVE_KEY = 'sopa-player-v1';
export const saveKeyFor = (language: Language) =>
  language === 'es' ? SAVE_KEY : `sopa-player-${language}-v1`;
export const levelsFor = (language: Language) =>
  LEVELS.map((p) => {
    const choice = localizePuzzle(p, language);
    return {
      ...choice,
      difficulty:
        choice.size === 3
          ? 'Fácil'
          : choice.size === 4
            ? 'Suave'
            : choice.size === 5
              ? 'Intermedio'
              : choice.size === 6
                ? 'Difícil'
                : 'Experto',
    };
  });
export const emptySave = (): SaveData => ({
  version: 1,
  completed: [],
  freeCompleted: [],
  progress: {},
  customs: [],
});
export const campaignFor = (language: Language) => {
  const catalogue = levelsFor(language);
  return CAMPAIGN_IDS.map((id, index) => ({
    ...catalogue.find((p) => p.id === id)!,
    number: index + 1,
  }));
};
// Historical successes are independent of the current (possibly replayed) board.
// Old saves recorded free-play wins without paths; recover those from the catalogue.
export function completedWordCount(
  data: SaveData,
  language: Language,
): number {
  const completed = new Set([...data.completed, ...data.freeCompleted]);
  return [...levelsFor(language), ...data.customs].reduce(
    (total, choice) => {
      if (completed.has(choice.id))
        return total + new Set(choice.words).size;
      const found = new Set(
        [
          ...(data.foundWords?.[choice.id] ?? []),
          ...Object.keys(data.progress[choice.id]?.paths ?? {}),
        ].map((word) =>
          choice.legacyWords?.includes(word) && language === 'es'
            ? spanishSpelling(word)
            : word,
        ),
      );
      return total + choice.words.filter((word) => found.has(word)).length;
    },
    0,
  );
}
function rememberWords(
  data: SaveData,
  id: string,
  game: GameState,
): SaveData {
  const previous = data.foundWords?.[id] ?? [];
  const words = [
    ...new Set([
      ...previous,
      ...Object.keys(data.progress[id]?.paths ?? {}),
      ...game.found,
    ]),
  ];
  if (words.length === previous.length) return data;
  return { ...data, foundWords: { ...data.foundWords, [id]: words } };
}
export function customChoice(
  name: string,
  text: string,
  shape: 'cube',
  size: number,
  seed: number,
  id: string,
  language?: Language,
): PuzzleChoice {
  const words = text
    .split(/[,;，、؛،\n]+/)
    .map((word) => normalizeWord(word, language))
    .filter(Boolean);
  if (!name.trim() || name.trim().length > 40)
    throw Error('Pon un nombre de entre 1 y 40 caracteres.');
  if (words.length < 1 || words.length > 12)
    throw Error('Escribe entre 1 y 12 palabras.');
  if (words.some((w) => !validWord(w)))
    throw Error(
      'Cada palabra debe tener de 1 a 16 letras, sin espacios ni números.',
    );
  if (new Set(words).size !== words.length)
    throw Error('Hay palabras repetidas. Deja cada palabra una sola vez.');
  if (shape === 'cube' && ![3, 4, 5, 6, 8, 10].includes(size))
    throw Error('Elige un tamaño disponible.');
  if (shape !== 'cube') throw Error('Elige una forma disponible.');
  if (
    shape === 'cube' &&
    words.reduce((n, w) => n + lettersOf(w).length, 0) > size ** 3 * 0.75
  )
    throw Error(
      'Elige un tamaño mayor para que quepan todas las palabras.',
    );
  return {
    id,
    name: name.trim(),
    shape,
    size,
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
export function restore(
  choice: PuzzleChoice,
  saved?: Snapshot,
): GameState {
  const game = initialStateForChoice(choice);
  if (!saved?.paths || typeof saved.paths !== 'object') return game;
  for (const word of game.puzzle.words) {
    const path = saved.paths[word.text];
    if (
      !Array.isArray(path) ||
      path.length !== lettersOf(word.text).length ||
      new Set(path).size !== path.length
    )
      continue;
    if (
      !path.every((id) => Number.isInteger(id) && !!game.puzzle.cells[id])
    )
      continue;
    if (
      !path
        .slice(1)
        .every((id, i) => game.puzzle.neighbors[path[i]].includes(id))
    )
      continue;
    const letters = path.map((id) => game.puzzle.cells[id].letter);
    if (
      letters.join('') !== word.text &&
      letters.reverse().join('') !== word.text
    )
      continue;
    word.path = [...path];
    game.found.push(word.text);
  }
  if (choice.legacyWords) {
    // Only carry an old success after validating the actual old board and path.
    // Matching a stripped word alone would accept forged or stale progress.
    const legacy = restore(
      {
        ...choice,
        size: choice.legacySize ?? choice.size,
        words: choice.legacyWords,
        legacyWords: undefined,
        legacySize: undefined,
      },
      saved,
    );
    for (const text of legacy.found) {
      const current =
        !choice.language || choice.language === 'es'
          ? spanishSpelling(text)
          : text;
      if (
        game.puzzle.words.some((w) => w.text === current) &&
        !game.found.includes(current)
      )
        game.found.push(current);
    }
  }
  return game;
}
export function saveGame(
  data: SaveData,
  id: string,
  game: GameState,
): SaveData {
  return {
    ...rememberWords(data, id, game),
    progress: { ...data.progress, [id]: snapshot(game) },
    completed:
      LEVEL_IDS.includes(id) && isWon(game)
        ? [...new Set([...data.completed, id])]
        : data.completed,
  };
}
export function campaignPosition(data: SaveData): number {
  // Preserve the furthest level reached in older saves without inventing ticks
  // for unfinished boards. New players advance exactly one level per win.
  let position = 0;
  for (const [index, id] of CAMPAIGN_IDS.entries())
    if (data.completed.includes(id))
      position = Math.max(position, index + 1);
  return position;
}
export function saveFreeCompletion(
  data: SaveData,
  id: string,
  game: GameState,
): SaveData {
  data = rememberWords(data, id, game);
  return LEVEL_IDS.includes(id) &&
    isWon(game) &&
    !data.freeCompleted.includes(id)
    ? { ...data, freeCompleted: [...data.freeCompleted, id] }
    : data;
}
export function recommendedLevel(
  data: SaveData,
  language: Language = 'es',
) {
  return campaignFor(language)[campaignPosition(data)];
}
export function isUnlocked(data: SaveData, index: number) {
  return (
    index >= 0 &&
    index < CAMPAIGN_IDS.length &&
    index <= campaignPosition(data)
  );
}
export function readSave(raw: string | null): SaveData {
  const clean = emptySave();
  if (!raw) return clean;
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1) return clean;
    if (Array.isArray(data.completed))
      clean.completed = LEVEL_IDS.filter((id) =>
        data.completed.includes(id),
      );
    if (Array.isArray(data.freeCompleted))
      clean.freeCompleted = LEVEL_IDS.filter((id) =>
        data.freeCompleted.includes(id),
      );
    if (
      data.progress &&
      typeof data.progress === 'object' &&
      !Array.isArray(data.progress)
    ) {
      for (const [key, val] of Object.entries(data.progress))
        if (
          (LEVEL_IDS.includes(key) ||
            /^custom-[a-zA-Z0-9-]+$/.test(key)) &&
          val &&
          typeof val === 'object' &&
          'paths' in val
        )
          clean.progress[key] = val as Snapshot;
    }
    if (Array.isArray(data.customs))
      for (const p of data.customs) {
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
    clean.progress = Object.fromEntries(
      Object.entries(clean.progress).filter(
        ([id]) =>
          LEVEL_IDS.includes(id) ||
          clean.customs.some((choice) => choice.id === id),
      ),
    );
    if (
      data.foundWords &&
      typeof data.foundWords === 'object' &&
      !Array.isArray(data.foundWords)
    ) {
      clean.foundWords = Object.fromEntries(
        Object.entries(data.foundWords)
          .filter(
            ([id, words]) =>
              (LEVEL_IDS.includes(id) ||
                clean.customs.some((p) => p.id === id)) &&
              Array.isArray(words),
          )
          .map(([id, words]) => [
            id,
            [
              ...new Set(
                (words as unknown[]).filter(
                  (word): word is string =>
                    typeof word === 'string' && validWord(word),
                ),
              ),
            ],
          ]),
      );
    }
    return clean;
  } catch {
    return clean;
  }
}
