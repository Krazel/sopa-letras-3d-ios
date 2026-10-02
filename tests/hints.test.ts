import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startPuzzle, selectCell } from '../lib/game.ts';
import {
  hintKey,
  nextHint,
  hintedPath,
  readHints,
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
void test('transition caps first two minutes, duplicate transitions, restored wins and recent rewarded ads', () => {
  const p = new TransitionAds(0);
  assert.equal(p.take('a', true, 119999), false);
  assert.equal(p.take('a', true, 130000), false);
  assert.equal(p.take('restored', false, 130000), false);
  assert.equal(p.take('b', true, 130000), true);
  assert.equal(p.take('b', true, 500000), false);
  p.rewardShown(510000);
  assert.equal(p.take('c', true, 520000), false);
  assert.equal(p.take('d', true, 631000), true);
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
