import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startPuzzle,
  dieLetters,
  selectDie,
  selectionText,
  isWon,
  PUZZLES,
} from '../lib/game.ts';
import { projectDice, pickDie, pointInFace } from '../lib/dice.ts';
import { homeView, turn, dolly } from '../lib/camera.ts';
const frame = {
  size: 390,
  width: 390,
  height: 540,
  tile: 30,
  radius: 7,
  font: 18,
};
void test('dice preserve the volume and every authored solution, with six different stable faces', () => {
  for (const choice of PUZZLES) {
    let game = startPuzzle(choice.id);
    const before = game.puzzle;
    for (const c of before.cells) {
      const letters = dieLetters(c, before.seed);
      assert.equal(new Set(letters).size, 6);
      assert.equal(letters[0], c.letter);
      assert.deepEqual(letters, dieLetters(c, before.seed));
    }
    for (const word of before.words)
      for (const id of word.path) game = selectDie(game, id, 0);
    assert(isWon(game));
    assert.equal(game.puzzle.cells, before.cells);
    assert.equal(game.puzzle.neighbors, before.neighbors);
  }
});
void test('selection spells the tapped faces, backtracks and clears an invalid jump', () => {
  let game = startPuzzle('cielo');
  const first = 0,
    second = game.puzzle.neighbors[first][0];
  const a = dieLetters(game.puzzle.cells[first], game.puzzle.seed)[2];
  const b = dieLetters(game.puzzle.cells[second], game.puzzle.seed)[4];
  game = selectDie(game, first, 2);
  game = selectDie(game, second, 4);
  assert.equal(selectionText(game), a + b);
  game = selectDie(game, second, 1);
  assert.equal(selectionText(game), a);
  game = selectDie(game, 26, 0);
  assert.equal(selectionText(game), '');
  assert.deepEqual(game.selection, []);
  assert.equal(selectDie(game, 0, 6), game);
  assert.equal(selectDie(game, -1, 0), game);
});
void test('an alternative face sequence can complete a target, independent of canonical letters', () => {
  let g = startPuzzle('cielo');
  const path = [0, 1, 2];
  const text = path
    .map((id) => dieLetters(g.puzzle.cells[id], g.puzzle.seed)[3])
    .join('');
  g = { ...g, puzzle: { ...g.puzzle, words: [{ text, path }] } };
  for (const id of path) g = selectDie(g, id, 3);
  assert(isWon(g));
  assert.equal(selectionText(g), '');
});
void test('face picking follows projected polygons and reveals all six faces under free rotation', () => {
  const game = startPuzzle('cielo');
  let view = homeView(3);
  const seen = new Set<number>();
  for (let i = 0; i < 80; i++) {
    const faces = projectDice(game, view, frame);
    assert(faces.length);
    for (const f of faces) {
      seen.add(f.face);
      assert(
        f.polygon.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      );
    }
    const front = faces.at(-1)!;
    const p = {
      x: front.polygon.reduce((s, p) => s + p.x, 0) / front.polygon.length,
      y: front.polygon.reduce((s, p) => s + p.y, 0) / front.polygon.length,
    };
    assert(pointInFace(p, front.polygon));
    assert.equal(pickDie(faces, p.x, p.y), front);
    assert.equal(
      front.letter,
      dieLetters(game.puzzle.cells[front.id], game.puzzle.seed)[front.face],
    );
    view = turn(view, 47, 29);
  }
  assert.equal(seen.size, 6);
  for (let i = 0; i < 30; i++) {
    view = dolly(view, -0.23);
    const faces = projectDice(game, view, frame);
    for (const f of faces)
      assert(
        f.polygon.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      );
  }
});
