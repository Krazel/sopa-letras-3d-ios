import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPuzzle,
  initialState,
  isWon,
  areNeighbors,
  pointAt,
  selectCell,
  selectionText,
  WORDS,
  PUZZLES,
  startPuzzle,
  idAt,
} from '../lib/game.ts';
void test('all 14 collection puzzles are deterministic, valid, solvable both ways and restartable', () => {
  assert.equal(PUZZLES.length, 14);
  for (const choice of PUZZLES) {
    let s = startPuzzle(choice.id);
    const original = structuredClone(s);
    assert.equal(s.puzzle.cells.length, choice.size ** 3);
    assert.deepEqual(s, startPuzzle(choice.id));
    assert.equal(
      PUZZLES.filter((p) => p.size === choice.size).length,
      choice.size <= 6 ? 3 : 1,
    );
    for (const cell of s.puzzle.cells)
      assert.equal(idAt(pointAt(cell.id, choice.size), choice.size), cell.id);
    for (const [index, w] of s.puzzle.words.entries()) {
      assert.equal(new Set(w.path).size, w.text.length);
      assert.equal(
        w.path.map((id) => s.puzzle.cells[id].letter).join(''),
        w.text,
      );
      assert(
        w.path
          .slice(1)
          .every((id, i) => areNeighbors(w.path[i], id, choice.size)),
      );
      if (index < 3)
        assert(
          new Set(w.path.map((id) => pointAt(id, choice.size)[2])).size > 1,
        );
      for (const id of index % 2 ? [...w.path].reverse() : w.path)
        s = selectCell(s, id);
      assert(s.found.includes(w.text), `${choice.id}: ${w.text}`);
    }
    assert(isWon(s));
    assert.deepEqual(startPuzzle(choice.id), original);
    let restarted = startPuzzle(choice.id);
    restarted = selectCell(restarted, 0);
    restarted = selectCell(restarted, choice.size ** 3 - 1);
    assert.deepEqual(restarted.selection, []);
    assert(!areNeighbors(choice.size - 1, choice.size, choice.size));
  }
});
void test('300 cubes contain six contiguous paths without repeated cells and with depth', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const p = createPuzzle(seed);
    assert.equal(p.cells.length, 64);
    assert.deepEqual(
      p.words.map((w) => w.text),
      WORDS,
    );
    for (const [i, w] of p.words.entries()) {
      assert.equal(new Set(w.path).size, w.text.length);
      assert(w.path.slice(1).every((id, j) => areNeighbors(w.path[j], id)));
      assert.equal(w.path.map((id) => p.cells[id].letter).join(''), w.text);
      if (i < 3) assert(new Set(w.path.map((id) => pointAt(id)[2])).size > 1);
    }
  }
});
void test('neighbors include touching diagonals but never wrap a row or layer', () => {
  assert.equal(
    Array.from({ length: 64 }, (_, id) => id).filter((id) =>
      areNeighbors(21, id),
    ).length,
    26,
  );
  assert.equal(
    Array.from({ length: 64 }, (_, id) => id).filter((id) =>
      areNeighbors(0, id),
    ).length,
    7,
  );
  assert(areNeighbors(0, 21));
  for (const [a, b] of [
    [0, 3],
    [0, 32],
    [3, 4],
    [15, 16],
    [0, 0],
    [-1, 0],
    [0, 64],
    [0, 1.5],
    [NaN, 0],
  ])
    assert(!areNeighbors(a, b));
});
void test('a word is selected one letter at a time along a bending path', () => {
  let s = initialState();
  const path = [0, 1, 17, 22];
  s = {
    ...s,
    puzzle: {
      ...s.puzzle,
      cells: s.puzzle.cells.map((c) => ({
        ...c,
        letter: path.includes(c.id) ? 'LUNA'[path.indexOf(c.id)] : c.letter,
      })),
      words: s.puzzle.words.map((w) =>
        w.text === 'LUNA' ? { ...w, path } : w,
      ),
    },
  };
  s = selectCell(s, 0);
  s = selectCell(s, 22);
  assert.deepEqual(s.selection, []);
  assert.equal(s.found.length, 0);
  s = selectCell(s, 0);
  s = selectCell(s, 1);
  s = selectCell(s, 17);
  assert.equal(selectionText(s), 'LUN');
  assert.equal(s.found.length, 0);
  s = selectCell(s, 22);
  assert.deepEqual(s.found, ['LUNA']);
  assert.deepEqual(s.selection, []);
  assert.deepEqual(s.puzzle.words[0].path, path);
  for (const id of [...path].reverse()) s = selectCell(s, id);
  assert.equal(s.found.length, 1);
});
void test('invalid jumps clear the whole path without selecting the invalid target; backtracking still works', () => {
  let s = initialState();
  s = selectCell(s, 0);
  s = selectCell(s, 1);
  s = selectCell(s, 17);
  assert.deepEqual(s.selection, [0, 1, 17]);
  s = selectCell(s, 63);
  assert.deepEqual(s.selection, []);
  s = selectCell(s, 0);
  s = selectCell(s, 1);
  s = selectCell(s, 17);
  s = selectCell(s, 1);
  assert.deepEqual(s.selection, [0, 1]);
  s = selectCell(s, 1);
  assert.deepEqual(s.selection, [0]);
  s = selectCell(s, 0);
  assert.deepEqual(s.selection, []);
  for (const id of [-1, 99, 0.5, NaN]) assert.equal(selectCell(s, id), s);
});
void test('a non-neighbor cancels after the first letter without losing found words or the puzzle', () => {
  let s = initialState();
  for (const id of s.puzzle.words[0].path) s = selectCell(s, id);
  const puzzle = s.puzzle,
    found = [...s.found];
  s = selectCell(s, 0);
  s = selectCell(s, 63);
  assert.deepEqual(s.selection, []);
  assert.deepEqual(s.found, found);
  assert.equal(s.puzzle, puzzle);
  s = selectCell(s, 63);
  assert.deepEqual(s.selection, [63]);
});
void test('all words work in both directions and victory/restart behave correctly', () => {
  let s = initialState();
  for (const [i, w] of s.puzzle.words.entries())
    for (const id of i % 2 ? [...w.path].reverse() : w.path)
      s = selectCell(s, id);
  assert(isWon(s));
  assert.equal(s.found.length, 6);
  assert.equal(selectCell(s, 0), s);
  const reset = initialState(s.puzzle.seed);
  assert.deepEqual(reset.selection, []);
  assert.equal(reset.found.length, 0);
  assert.deepEqual(reset.puzzle.cells, s.puzzle.cells);
  assert.notDeepEqual(
    initialState(s.puzzle.seed + 7919).puzzle.cells,
    s.puzzle.cells,
  );
});
