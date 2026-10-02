import type { GameState } from './game.ts';
import type { Language } from './preferences.ts';

export type HintCounts = Record<string, number>;
export type HintOffer = {
  key: string;
  word: string;
  before: number;
  length: number;
};
export type RewardReceipt = { id: string; context: string };
export interface HintStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const HINT_PREFIX = 'sopa-hints-v1:';
// Include actual geometry, not a display name or a short hash: locales, custom
// puzzles and later content revisions must never share a paid hint accidentally.
export function hintKey(game: GameState, language: Language, dice = false) {
  return (
    HINT_PREFIX +
    JSON.stringify([
      language,
      dice,
      game.puzzle.seed,
      game.puzzle.size,
      game.puzzle.cells.map((c) => c.letter),
      game.puzzle.words.map((w) => w.text),
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
): HintOffer | null {
  const remaining = game.puzzle.words.filter(
    (w) => !game.found.includes(w.text),
  );
  // Keep revealing the started word. A fully revealed path remains visible until
  // the player actually selects it; do not charge for another clue to that word.
  const word = remaining.find((w) => (counts[w.text] ?? 0) > 0) ?? remaining[0];
  if (!word || (counts[word.text] ?? 0) >= word.path.length) return null;
  return {
    key,
    word: word.text,
    before: counts[word.text] ?? 0,
    length: word.path.length,
  };
}
export function hintedPath(game: GameState, counts: HintCounts) {
  const word = game.puzzle.words.find(
    (w) => !game.found.includes(w.text) && (counts[w.text] ?? 0) > 0,
  );
  return word ? word.path.slice(0, counts[word.text]) : [];
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
    offer.before >= offer.length
  )
    throw Error('receipt');
  const counts = readHints(storage, offer.key);
  // Compare against the offered ordinal, so duplicate/reordered callbacks,
  // replay after a crash, and a failed native acknowledgement are harmless.
  counts[offer.word] = Math.max(counts[offer.word] ?? 0, offer.before + 1);
  const raw = JSON.stringify(counts);
  storage.setItem(offer.key, raw);
  if (storage.getItem(offer.key) !== raw) throw Error('storage');
  return offer;
}
