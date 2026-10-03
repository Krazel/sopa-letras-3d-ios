import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startPuzzle, selectCell } from '../lib/game.ts';
import {
  hintKey,
  nextHint,
  hintedPath,
  readHints,
  readHintPaths,
  redeemHint,
  verifyHintStorage,
} from '../lib/hints.ts';
import { TransitionAds } from '../lib/ad-policy.ts';
import { AD_COPY } from '../lib/ad-copy.ts';
import { LANGUAGES } from '../lib/preferences.ts';
const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
};
void test('correct selected prefixes reveal their next letter; invalid prefixes start at the first', () => {
  const original = startPuzzle('cielo'),
    word = original.puzzle.words.find((w) => w.text === 'LUZ')!;
  const game = selectCell(original, word.path[0]);
  const offer = nextHint(game, {}, 'test')!;
  assert.equal(offer.word, 'LUZ');
  assert.equal(offer.before, 1);
  assert.equal(offer.path![0], word.path[0]);
  assert.equal(original.puzzle.cells[offer.path![1]].letter, 'U');
  const invalid = original.puzzle.cells.find(
    (c) =>
      !original.puzzle.words.some(
        (w) => w.text.startsWith(c.letter) || w.text.endsWith(c.letter),
      ),
  );
  assert.ok(invalid);
  assert.equal(
    nextHint(selectCell(original, invalid.id), {}, 'test')!.before,
    0,
  );
});
void test('an alternative valid prefix retains its actual route and reversed prefixes also continue', () => {
  const base = startPuzzle('cielo'),
    word = base.puzzle.words[0];
  const alternateId = base.puzzle.neighbors[word.path[1]].find(
    (id) => !word.path.includes(id),
  )!;
  const original = {
    ...base,
    puzzle: {
      ...base.puzzle,
      words: [word],
      cells: base.puzzle.cells.map((cell) =>
        cell.id === alternateId ? { ...cell, letter: word.text[0] } : cell,
      ),
    },
  };
  const alternate = original.puzzle.cells[alternateId];
  const game = selectCell(original, alternate.id),
    s = storage(),
    key = hintKey(game, 'es', false, 'session-a');
  const offer = nextHint(game, {}, key)!;
  assert.equal(offer.path![0], alternate.id);
  redeemHint(s, { id: 'a', context: JSON.stringify(offer) });
  assert.deepEqual(
    hintedPath(original, readHints(s, key), readHintPaths(s, key)),
    offer.path!.slice(0, 2),
  );
  const reverse = selectCell(original, word.path.at(-1)!);
  const backward = nextHint(reverse, {}, key)!;
  assert.equal(backward.path![0], word.path.at(-1));
  assert.equal(backward.before, 1);
  const freshKey = hintKey(game, 'es', false, 'session-b');
  assert.deepEqual(readHints(s, freshKey), {});
  assert.deepEqual(readHintPaths(s, freshKey), {});
});
void test('one earned receipt reveals exactly one letter; duplicates and crash replay are idempotent', () => {
  const s = storage(),
    game = startPuzzle('cielo'),
    key = hintKey(game, 'es');
  const offer = nextHint(game, {}, key)!;
  const receipt = { id: 'native-1', context: JSON.stringify(offer) };
  redeemHint(s, receipt);
  redeemHint(s, receipt);
  assert.equal(readHints(s, key)[offer.word], 1);
  assert.deepEqual(
    hintedPath(game, readHints(s, key)),
    game.puzzle.words[0].path.slice(0, 1),
  );
  const next = nextHint(game, readHints(s, key), key)!;
  assert.equal(next.word, offer.word);
  assert.equal(next.before, 1);
  redeemHint(s, { id: 'native-2', context: JSON.stringify(next) });
  redeemHint(s, receipt);
  assert.equal(readHints(s, key)[offer.word], 2);
  assert.equal(game.found.length, 0);
  assert.deepEqual(game.selection, []);
});
void test('switching to a correctly selected word shows that new hint instead of an older word', () => {
  const original = startPuzzle('cielo'),
    s = storage(),
    key = hintKey(original, 'es', false, 'session');
  const first = nextHint(original, {}, key)!;
  redeemHint(s, { id: 'first', context: JSON.stringify(first) });
  const light = original.puzzle.words.find((w) => w.text === 'LUZ')!;
  const selected = selectCell(original, light.path[0]);
  const offer = nextHint(
    selected,
    readHints(s, key),
    key,
    readHintPaths(s, key),
  )!;
  assert.equal(offer.word, 'LUZ');
  redeemHint(s, { id: 'light', context: JSON.stringify(offer) });
  assert.deepEqual(
    hintedPath(original, readHints(s, key), readHintPaths(s, key)),
    offer.path!.slice(0, 2),
  );
  assert.equal(
    nextHint(original, readHints(s, key), key, readHintPaths(s, key))!.word,
    'LUZ',
  );
  redeemHint(s, { id: 'first', context: JSON.stringify(first) });
  assert.equal(
    nextHint(original, readHints(s, key), key, readHintPaths(s, key))!.word,
    'LUZ',
  );
});
void test('full reveal requires manual solving; solved word advances to another target', () => {
  const s = storage();
  let game = startPuzzle('cielo');
  const key = hintKey(game, 'es');
  const word = game.puzzle.words[0];
  for (let n = 0; n < word.path.length; n++) {
    const offer = nextHint(game, readHints(s, key), key)!;
    assert.equal(offer.before, n);
    redeemHint(s, { id: `r${n}`, context: JSON.stringify(offer) });
  }
  assert.equal(nextHint(game, readHints(s, key), key), null);
  for (const id of word.path) game = selectCell(game, id);
  assert.ok(game.found.includes(word.text));
  assert.equal(
    hintKey(game, 'es'),
    key,
    'solving a word must not change its clue ledger',
  );
  assert.notEqual(nextHint(game, readHints(s, key), key)!.word, word.text);
  assert.deepEqual(hintedPath(game, readHints(s, key)), []);
});
void test('manually solving a partially hinted word moves to first remaining word', () => {
  let game = startPuzzle('cielo');
  const s = storage(),
    key = hintKey(game, 'es');
  const offer = nextHint(game, {}, key)!;
  redeemHint(s, { id: 'r', context: JSON.stringify(offer) });
  for (const id of game.puzzle.words[0].path) game = selectCell(game, id);
  assert.equal(nextHint(game, readHints(s, key), key)!.before, 0);
});
void test('locale, geometry, dice and changed custom puzzles cannot inherit another clue', () => {
  const game = startPuzzle('cielo');
  assert.notEqual(hintKey(game, 'es'), hintKey(game, 'en'));
  assert.notEqual(hintKey(game, 'es'), hintKey(game, 'es', true));
  assert.notEqual(
    hintKey(game, 'es'),
    hintKey({ ...game, puzzle: { ...game.puzzle, seed: 999 } }, 'es'),
  );
  const solved = {
    ...game,
    puzzle: {
      ...game.puzzle,
      words: game.puzzle.words.map((w) => ({
        ...w,
        path: [...w.path].reverse(),
      })),
    },
  };
  assert.equal(hintKey(game, 'es'), hintKey(solved, 'es'));
});
void test('storage rejection prevents starting and leaves earned receipt retryable', () => {
  const game = startPuzzle('cielo'),
    key = hintKey(game, 'es');
  const receipt = { id: 'r', context: JSON.stringify(nextHint(game, {}, key)) };
  const denied = {
    getItem: () => null,
    setItem: () => {
      throw Error('quota');
    },
  };
  assert.throws(() => verifyHintStorage(denied, key));
  assert.throws(() => redeemHint(denied, receipt));
  const s = storage();
  redeemHint(s, receipt);
  assert.equal(Object.values(readHints(s, key))[0], 1);
  assert.throws(() => redeemHint(s, { id: 'r', context: '{}' }));
});
void test('each fresh completion is eligible once, including the first and replayed levels', () => {
  const p = new TransitionAds();
  assert.equal(p.take('first', true), true);
  assert.equal(p.take('first', true), false);
  assert.equal(p.take('restored', false), false);
  assert.equal(p.take('second', true), true);
  assert.equal(p.take('second', true), false);
  assert.equal(p.take('first-replayed', true), true);
});
void test('all eleven locales have complete hint, ad and privacy instructions', () => {
  for (const { code } of LANGUAGES) {
    assert.deepEqual(Object.keys(AD_COPY[code]), Object.keys(AD_COPY.es));
    assert.ok(
      Object.values(AD_COPY[code]).every(
        (v) => typeof v === 'string' && v.length > 0,
      ),
    );
  }
});
