import type { GameState } from './game.ts';
import type { Language } from './preferences.ts';
import { lettersOf } from './letters.ts';

export type HintCounts = Record<string, number>;
export type HintPaths = Record<string, number[]>;
export type HintOffer = {
  key: string;
  word: string;
  before: number;
  length: number;
  path?: number[];
};
export type RewardReceipt = { id: string; context: string };
export interface HintStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const HINT_PREFIX = 'sopa-hints-v1:';
// Include actual geometry, not a display name or a short hash: locales, custom
// puzzles and later content revisions must never share a paid hint accidentally.
export function hintKey(
  game: GameState,
  language: Language,
  dice = false,
  session?: string,
) {
  return (
    HINT_PREFIX +
    JSON.stringify([
      language,
      dice,
      game.puzzle.seed,
      game.puzzle.size,
      game.puzzle.cells.map((c) => c.letter),
      game.puzzle.words.map((w) => w.text),
      ...(session ? [session] : []),
    ])
  );
}
export function readHints(storage: HintStorage, key: string): HintCounts {
  const raw = storage.getItem(key);
  if (!raw) return {};
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('storage');
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, n]) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 16,
    ),
  ) as HintCounts;
}
export function nextHint(
  game: GameState,
  counts: HintCounts,
  key: string,
  paths: HintPaths = {},
): HintOffer | null {
  const remaining = game.puzzle.words.filter(
    (w) => !game.found.includes(w.text),
  );
  // Keep revealing the started word. A fully revealed path remains visible until
  // the player actually selects it; do not charge for another clue to that word.
  // Accept any playable route (also backwards), not just the generated route.
  let continuation: number[] | null = null;
  const text = (
    game.selectionLetters ??
    game.selection.map((id) => game.puzzle.cells[id]?.letter)
  ).join('');
  const candidates = [...remaining].sort(
    (a, b) => Number(b.text.startsWith(text)) - Number(a.text.startsWith(text)),
  );
  const selectedWord = candidates.find((w) => {
    continuation = continueSelection(game, w.text, w.path);
    return continuation !== null;
  });
  const word =
    selectedWord ?? activeHintWord(game, counts, paths) ?? remaining[0];
  if (!word) return null;
  const path = selectedWord ? continuation! : (paths[word.text] ?? word.path);
  const before = Math.max(
    counts[word.text] ?? 0,
    selectedWord ? game.selection.length : 0,
  );
  if (before >= word.path.length) return null;
  return {
    key,
    word: word.text,
    before,
    length: word.path.length,
    path,
  };
}
function continueSelection(
  game: GameState,
  word: string,
  authored: number[],
): number[] | null {
  const selected = game.selection;
  if (
    !selected.length ||
    new Set(selected).size !== selected.length ||
    game.selectionFaces?.some((face) => face !== 0)
  )
    return null;
  const letters =
    game.selectionLetters ??
    selected.map((id) => game.puzzle.cells[id]?.letter);
  const forward = lettersOf(word);
  for (const target of [forward, [...forward].reverse()]) {
    if (
      selected.length >= target.length ||
      !letters.every((letter, i) => letter === target[i])
    )
      continue;
    const path = [...selected],
      used = new Set(path);
    let budget = 10000;
    const search = (): boolean => {
      if (path.length === target.length) return true;
      if (--budget < 0) return false;
      const candidates = [...game.puzzle.neighbors[path.at(-1)!]];
      const preferred = authored[path.length];
      candidates.sort(
        (a, b) => Number(b === preferred) - Number(a === preferred),
      );
      for (const id of candidates) {
        if (
          used.has(id) ||
          game.puzzle.cells[id].letter !== target[path.length]
        )
          continue;
        path.push(id);
        used.add(id);
        if (search()) return true;
        path.pop();
        used.delete(id);
      }
      return false;
    };
    if (search()) return path;
  }
  return null;
}
export function readHintPaths(storage: HintStorage, key: string): HintPaths {
  const raw = storage.getItem(key + ':paths');
  if (!raw) return {};
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('storage');
  return Object.fromEntries(
    Object.entries(value).filter(([, path]) => validPath(path)),
  ) as HintPaths;
}
function validPath(path: unknown): path is number[] {
  return (
    Array.isArray(path) &&
    path.length > 0 &&
    path.length <= 16 &&
    path.every((id) => Number.isInteger(id) && id >= 0) &&
    new Set(path).size === path.length
  );
}
export function hintedPath(
  game: GameState,
  counts: HintCounts,
  paths: HintPaths = {},
) {
  const word = activeHintWord(game, counts, paths);
  return word
    ? (paths[word.text] ?? word.path).slice(0, counts[word.text])
    : [];
}
function activeHintWord(game: GameState, counts: HintCounts, paths: HintPaths) {
  const latest = Object.keys(paths)
    .reverse()
    .find((text) => !game.found.includes(text) && (counts[text] ?? 0) > 0);
  return (
    game.puzzle.words.find((w) => w.text === latest) ??
    game.puzzle.words.find(
      (w) => !game.found.includes(w.text) && (counts[w.text] ?? 0) > 0,
    )
  );
}
export function verifyHintStorage(storage: HintStorage, key: string) {
  const raw = JSON.stringify(readHints(storage, key));
  storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw Error('storage');
}
export function redeemHint(
  storage: HintStorage,
  receipt: RewardReceipt,
): HintOffer {
  const offer: HintOffer = JSON.parse(receipt.context);
  if (
    !receipt.id ||
    typeof offer.key !== 'string' ||
    !offer.key.startsWith(HINT_PREFIX) ||
    typeof offer.word !== 'string' ||
    !Number.isInteger(offer.before) ||
    !Number.isInteger(offer.length) ||
    offer.before < 0 ||
    offer.length > 16 ||
    offer.before >= offer.length ||
    (offer.path !== undefined &&
      (!validPath(offer.path) || offer.path.length !== offer.length))
  )
    throw Error('receipt');
  const counts = readHints(storage, offer.key);
  if (offer.path && (counts[offer.word] ?? 0) <= offer.before) {
    const paths = { ...readHintPaths(storage, offer.key) };
    delete paths[offer.word];
    paths[offer.word] = offer.path;
    const raw = JSON.stringify(paths);
    storage.setItem(offer.key + ':paths', raw);
    if (storage.getItem(offer.key + ':paths') !== raw) throw Error('storage');
  }
  // Compare against the offered ordinal, so duplicate/reordered callbacks,
  // replay after a crash, and a failed native acknowledgement are harmless.
  counts[offer.word] = Math.max(counts[offer.word] ?? 0, offer.before + 1);
  const raw = JSON.stringify(counts);
  storage.setItem(offer.key, raw);
  if (storage.getItem(offer.key) !== raw) throw Error('storage');
  return offer;
}
