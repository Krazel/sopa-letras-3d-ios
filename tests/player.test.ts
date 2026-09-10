import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialStateForChoice,
  selectCell,
  isWon,
  starOutline,
  inPolygon,
  startPuzzle,
} from '../lib/game.ts';
import {
  LEVELS,
  SAVE_KEY,
  emptySave,
  readSave,
  saveGame,
  restore,
  isUnlocked,
  customChoice,
  generateCustom,
} from '../lib/player.ts';
void test('progression starts easy, unlocks only the next level and survives a saved reload', () => {
  let save = emptySave();
  assert(isUnlocked(save, 0));
  assert(!isUnlocked(save, 1));
  for (let i = 0; i < LEVELS.length; i++) {
    assert(isUnlocked(save, i));
    let game = initialStateForChoice(LEVELS[i]);
    for (const word of game.puzzle.words)
      for (const id of word.path) game = selectCell(game, id);
    assert(isWon(game));
    save = readSave(JSON.stringify(saveGame(save, LEVELS[i].id, game)));
    assert.equal(save.completed.length, i + 1);
    assert(isWon(restore(LEVELS[i], save.progress[LEVELS[i].id])));
    if (i + 2 < LEVELS.length) assert(!isUnlocked(save, i + 2));
  }
  assert.equal(LEVELS[0].size, 3);
  assert.equal(LEVELS.at(-1)!.size, 10);
  assert(SAVE_KEY);
});
void test('partial found paths survive reload and malformed paths are ignored', () => {
  const choice = LEVELS[0];
  let game = initialStateForChoice(choice);
  for (const id of game.puzzle.words[0].path) game = selectCell(game, id);
  const save = saveGame(emptySave(), choice.id, game);
  assert.equal(save.completed.length, 0);
  const loaded = restore(
    choice,
    readSave(JSON.stringify(save)).progress[choice.id],
  );
  assert.deepEqual(loaded.found, game.found);
  assert.equal(
    restore(choice, { paths: { SOL: [0, 999, 1] } }).found.length,
    0,
  );
  assert.deepEqual(readSave('{broken'), emptySave());
});
void test('creator normalizes accents, preserves Ñ, rejects duplicates and validates capacity', () => {
  const p = customChoice(
    'Mi sopa',
    'niño\nárbol, LUNA',
    'cube',
    4,
    73,
    'custom-test',
  );
  assert.deepEqual(p.words, ['NIÑO', 'ARBOL', 'LUNA']);
  const { choice, game } = generateCustom(p);
  let playing = game;
  for (const word of playing.puzzle.words)
    for (const id of word.path) playing = selectCell(playing, id);
  assert(isWon(playing));
  const save = saveGame(
    { ...emptySave(), customs: [choice] },
    choice.id,
    playing,
  );
  const loaded = readSave(JSON.stringify(save));
  assert.equal(loaded.customs.length, 1);
  assert.equal(loaded.completed.length, 0);
  assert(isWon(restore(loaded.customs[0], loaded.progress[choice.id])));
  for (const words of [
    'sol,SÓL',
    'dos palabras',
    '12A',
    'AB',
    'ABCDEFGHIJKL',
    Array(13).fill('SOL').join(','),
  ])
    assert.throws(() =>
      customChoice('Sopa', words, 'cube', 4, 1, 'custom-test'),
    );
  assert.throws(() =>
    customChoice(
      'Sopa',
      'ELEFANTE,MARIPOSA,TELESCOPIO',
      'cube',
      3,
      1,
      'custom-test',
    ),
  );
  assert.throws(() => customChoice('', 'SOL', 'cube', 4, 1, 'custom-test'));
});
void test('star layers align, letters sit inside the real outline, and all outline segments use geometric vertices', () => {
  const p = startPuzzle('estrella').puzzle;
  const layers = [...new Set(p.cells.map((c) => c.position[2]))];
  assert.equal(layers.length, 5);
  assert.equal(p.cells.length, 200);
  const xy = (z: number) =>
    p.cells
      .filter((c) => c.position[2] === z)
      .map((c) => c.position.slice(0, 2).join(','));
  for (const z of layers) assert.deepEqual(xy(z), xy(layers[0]));
  for (const c of p.cells)
    for (const dx of [-0.2, 0.2])
      for (const dy of [-0.2, 0.2])
        assert(
          inPolygon(
            c.position[0] + dx,
            c.position[1] + dy,
            starOutline(p.size, c.position[2]),
          ),
        );
  assert.equal(p.outline!.length, 60);
  assert.equal(p.edges.length, 0);
  for (const z of layers) {
    const outline = starOutline(p.size, z);
    for (let i = 0; i < 10; i++)
      assert(
        p.outline!.some(
          ([a, b]) =>
            JSON.stringify([a, b]) ===
            JSON.stringify([outline[i], outline[(i + 1) % 10]]),
        ),
      );
  }
});
