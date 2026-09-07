import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPuzzle,
  initialState,
  isWon,
  lineBetween,
  pointAt,
  selectCell,
  WORDS,
} from '../lib/game.ts';

void test('300 generated cubes contain all six straight words, with depth guaranteed', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const p = createPuzzle(seed);
    assert.equal(p.cells.length, 64);
    assert.deepEqual(
      p.words.map((w) => w.text),
      WORDS,
    );
    for (const [i, w] of p.words.entries()) {
      assert.deepEqual(lineBetween(w.path[0], w.path.at(-1)!), w.path);
      assert.equal(w.path.map((id) => p.cells[id].letter).join(''), w.text);
      if (i < 3)
        assert.notEqual(pointAt(w.path[0])[2], pointAt(w.path.at(-1)!)[2]);
    }
  }
});
void test('selection supports cancellation, invalid geometry, reverse words and no double scoring', () => {
  let s = initialState();
  s = selectCell(s, 0);
  assert.equal(s.start, 0);
  s = selectCell(s, 0);
  assert.equal(s.start, null);
  assert.equal(lineBetween(0, 6), null);
  s = selectCell(selectCell(s, 0), 6);
  assert.equal(s.found.length, 0);
  assert.equal(s.start, null);
  const w = s.puzzle.words[0];
  s = selectCell(selectCell(s, w.path.at(-1)!), w.path[0]);
  assert.deepEqual(s.found, [w.text]);
  s = selectCell(selectCell(s, w.path[0]), w.path.at(-1)!);
  assert.equal(s.found.length, 1);
});
void test('complete game reaches victory, rejects further selection, and restart/new reset state', () => {
  let s = initialState();
  for (const w of s.puzzle.words)
    s = selectCell(selectCell(s, w.path[0]), w.path.at(-1)!);
  assert.ok(isWon(s));
  assert.equal(s.found.length, 6);
  assert.equal(selectCell(s, 0), s);
  const reset = initialState(s.puzzle.seed);
  assert.equal(reset.found.length, 0);
  assert.equal(reset.start, null);
  assert.ok(!isWon(reset));
  assert.deepEqual(reset.puzzle.cells, s.puzzle.cells);
  assert.notDeepEqual(
    initialState(s.puzzle.seed + 7919).puzzle.cells,
    s.puzzle.cells,
  );
});
void test('incorrect letter lines and out-of-bounds endpoints cannot score', () => {
  const s = initialState();
  const wrong = s.puzzle.cells
    .flatMap((c) => s.puzzle.cells.map((d) => [c.id, d.id]))
    .find(([a, b]) => {
      const path = lineBetween(a, b);
      if (!path) return false;
      const text = path.map((id) => s.puzzle.cells[id].letter).join('');
      return (
        !WORDS.includes(text) && !WORDS.includes(text.split('').reverse().join(''))
      );
    })!;
  assert.equal(selectCell(selectCell(s, wrong[0]), wrong[1]).found.length, 0);
  assert.equal(lineBetween(-1, 0), null);
  assert.equal(lineBetween(0, 64), null);
  assert.equal(selectCell(s, 99), s);
});

