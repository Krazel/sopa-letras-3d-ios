import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startPuzzle,
  selectCell,
  selectDie,
  adjacentDieFaces,
} from '../lib/game.ts';
import { selectionSound } from '../lib/sound-events.ts';

void test('selection and undo sound, invalid neighbours and no-op actions stay silent', () => {
  const empty = startPuzzle('cielo');
  const selected = selectCell(empty, 0);
  assert.equal(selectionSound(empty, selected, 0), 'letter');
  const undone = selectCell(selected, 0);
  assert.equal(selectionSound(selected, undone, 0), 'undo');
  const far = empty.puzzle.cells.find(
    (c) => c.id !== 0 && !empty.puzzle.neighbors[0].includes(c.id),
  )!.id;
  assert.equal(selectionSound(selected, selectCell(selected, far), far), null);
  assert.equal(selectionSound(empty, selectCell(empty, -1), -1), null);
  assert.equal(selectionSound(selected, selected, 0), null);
});
void test('word reward replaces letter feedback and final victory replaces word reward', () => {
  let state = startPuzzle('cielo');
  const words = state.puzzle.words;
  for (let index = 0; index < words.length; index++) {
    for (let step = 0; step < words[index].path.length; step++) {
      const id = words[index].path[step];
      const next = selectCell(state, id);
      assert.equal(
        selectionSound(state, next, id),
        step < words[index].path.length - 1
          ? 'letter'
          : index === words.length - 1
            ? 'win'
            : 'word',
      );
      state = next;
    }
  }
  assert.equal(selectionSound(state, selectCell(state, 0), 0), null);
});
void test('dice use face identity for undo; opposite-face rejection is silent', () => {
  const state = startPuzzle('cielo');
  const first = selectDie(state, 0, 0);
  assert.equal(selectionSound(state, first, 0, 0), 'letter');
  const neighbor = [1, 2, 3, 4, 5].find((f) => adjacentDieFaces(0, f))!;
  const opposite = [1, 2, 3, 4, 5].find((f) => !adjacentDieFaces(0, f))!;
  const next = selectDie(first, 0, neighbor);
  assert.equal(selectionSound(first, next, 0, neighbor), 'letter');
  assert.equal(
    selectionSound(next, selectDie(next, 0, neighbor), 0, neighbor),
    'undo',
  );
  assert.equal(
    selectionSound(first, selectDie(first, 0, opposite), 0, opposite),
    null,
  );
});
