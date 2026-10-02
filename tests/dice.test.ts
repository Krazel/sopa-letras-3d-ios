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
import {
  projectDice,
  pickDie,
  pointInFace,
  dieGlyphTransform,
  diceLayers,
  pickDiceLabels,
} from '../lib/dice.ts';
import { homeView, turn, dolly } from '../lib/camera.ts';
const frame = {
  size: 390,
  width: 390,
  height: 540,
  tile: 30,
  radius: 7,
  font: 18,
};
void test('viewer-facing glyphs stay upright and readable through tumbling and interior zoom', () => {
  const game = startPuzzle('cielo');
  let view = homeView(3);
  let checked = 0;
  for (let i = 0; i < 100; i++) {
    view = turn(view, 47, 29);
    if (i > 60) view = dolly(view, -0.15);
    for (const f of projectDice(game, view, frame)) {
      const [a, b, c, d, x, y] = dieGlyphTransform(f, true);
      assert([a, b, c, d, x, y].every(Number.isFinite));
      assert(a >= 0);
      assert.equal(a, d);
      assert.equal(b, 0);
      assert.equal(c, 0);
      assert.equal(x, f.center.x);
      assert.equal(y, f.center.y);
      if (a > 0) {
        assert(a * 48 >= 10 && a * 48 <= 80);
        checked++;
      }
      assert.deepEqual(dieGlyphTransform(f, false), [
        (f.u.x - x) / 48,
        (f.u.y - y) / 48,
        (f.v.x - x) / 48,
        (f.v.y - y) / 48,
        x,
        y,
      ]);
    }
  }
  assert(checked > 100);
});
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
  game = selectDie(game, second, 4);
  assert.equal(selectionText(game), a);
  game = selectDie(game, 26, 0);
  assert.equal(selectionText(game), '');
  assert.deepEqual(game.selection, []);
  assert.deepEqual(game.selectionFaces, []);
  assert.equal(selectDie(game, 0, 6), game);
  assert.equal(selectDie(game, -1, 0), game);
});
void test('same die connects adjacent faces, tracks each face, and never repeats a face', () => {
  let game = startPuzzle('cielo');
  const labels = dieLetters(game.puzzle.cells[0], game.puzzle.seed);
  game = selectDie(game, 0, 0);
  game = selectDie(game, 0, 2);
  assert.deepEqual(game.selection, [0, 0]);
  assert.deepEqual(game.selectionFaces, [0, 2]);
  assert.equal(selectionText(game), labels[0] + labels[2]);
  game = selectDie(game, 1, 4);
  assert.deepEqual(game.selection, [0, 0, 1]);
  game = selectDie(game, 0, 2);
  assert.deepEqual(game.selectionFaces, [0, 2]);
  game = selectDie(game, 0, 2);
  assert.deepEqual(game.selectionFaces, [0]);
  game = selectDie(game, 0, 1);
  assert.deepEqual(game.selection, []);
  assert.deepEqual(game.selectionFaces, []);
  assert.equal(selectionText(game), '');
});
void test('a word can use several adjacent faces of one die and preserves found face identity', () => {
  let game = startPuzzle('cielo');
  const faces = [0, 2, 4];
  const text = faces
    .map((f) => dieLetters(game.puzzle.cells[0], game.puzzle.seed)[f])
    .join('');
  game = {
    ...game,
    puzzle: { ...game.puzzle, words: [{ text, path: [0, 1, 2] }] },
  };
  for (const face of faces) game = selectDie(game, 0, face);
  assert(isWon(game));
  assert.deepEqual(game.puzzle.words[0].path, [0, 0, 0]);
  assert.deepEqual(game.puzzle.words[0].faces, faces);
  assert.deepEqual(game.selectionFaces, []);
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

void test('thin faces retain readable letters and tapping their overflow selects the same face', () => {
  const f = {
    id: 1,
    face: 0,
    letter: 'A',
    depth: 2,
    center: { x: 50, y: 50 },
    u: { x: 50.2, y: 50 },
    v: { x: 50, y: 62 },
    polygon: [
      { x: 49, y: 30 },
      { x: 51, y: 30 },
      { x: 51, y: 70 },
      { x: 49, y: 70 },
    ],
  };
  assert(dieGlyphTransform(f, true)[0] * 48 >= 12);
  assert.equal(pickDie([f], 55, 50), null);
  assert.equal(pickDiceLabels(diceLayers([f]), 55, 50), f);
  const front = {
    ...f,
    id: 2,
    depth: 1,
    center: { x: 70, y: 70 },
    polygon: [
      { x: 52, y: 45 },
      { x: 80, y: 45 },
      { x: 80, y: 80 },
      { x: 52, y: 80 },
    ],
  };
  assert.equal(pickDiceLabels(diceLayers([f, front]), 55, 50), front);
});
