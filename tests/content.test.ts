import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  levelsFor,
  saveKeyFor,
  emptySave,
  saveGame,
  readSave,
  restore,
} from '../lib/player.ts';
import { CHAPTERS } from '../lib/content.ts';
import {
  startPuzzle,
  selectCell,
  selectDie,
  dieLetters,
  isWon,
} from '../lib/game.ts';
import { translate } from '../lib/i18n.ts';

void test('all 60 English puzzles have authored translations, valid depth paths and playable dice', () => {
  const es = levelsFor('es'),
    en = levelsFor('en');
  assert.equal(en.length, 60);
  assert.equal(CHAPTERS.length, 15);
  assert.equal(new Set(en.map((p) => p.id)).size, 60);
  const legacyIds = [
    'cielo',
    'agua',
    'hogar',
    'naturaleza',
    'huerto',
    'animales',
    'bosque',
    'viaje',
    'musica',
    'universo',
    'oceano',
    'aventura',
    'planeta',
    'exploracion',
  ];
  assert.deepEqual(
    es.filter((p) => legacyIds.includes(p.id)).map((p) => p.id),
    legacyIds,
  );
  for (const p of en) {
    assert.equal(p.language, 'en');
    assert.notEqual(p.name, es.find((e) => e.id === p.id)!.name);
    assert.equal(new Set(p.words).size, p.words.length);
    assert(p.words.every((w) => /^[A-Z]{3,11}$/.test(w)));
    let game = startPuzzle(p.id, 'en');
    let dice = startPuzzle(p.id, 'en');
    assert.deepEqual(game, startPuzzle(p.id, 'en'));
    for (const cell of game.puzzle.cells)
      assert(
        dieLetters(cell, game.puzzle.seed).every((letter) =>
          /^[A-Z]$/.test(letter),
        ),
      );
    for (const [i, word] of game.puzzle.words.entries()) {
      assert.equal(
        word.path.map((id) => game.puzzle.cells[id].letter).join(''),
        word.text,
      );
      assert(
        word.path
          .slice(1)
          .every((id, j) => game.puzzle.neighbors[word.path[j]].includes(id)),
      );
      if (i < 3)
        assert(
          new Set(word.path.map((id) => game.puzzle.cells[id].position[2]))
            .size > 1,
        );
      for (const id of i % 2 ? [...word.path].reverse() : word.path) {
        game = selectCell(game, id);
        dice = selectDie(dice, id, 0);
      }
    }
    assert(isWon(game), p.id);
    assert(isWon(dice), p.id);
  }
});
void test('language progress uses independent keys and restores each translated solution', () => {
  assert.equal(saveKeyFor('es'), 'sopa-player-v1');
  assert.notEqual(saveKeyFor('es'), saveKeyFor('en'));
  const saves = new Map();
  for (const lang of ['es', 'en'] as const) {
    let game = startPuzzle('cielo', lang);
    for (const id of game.puzzle.words[0].path) game = selectCell(game, id);
    const saved = saveGame(emptySave(), 'cielo', game);
    saves.set(saveKeyFor(lang), JSON.stringify(saved));
  }
  for (const lang of ['es', 'en'] as const) {
    const restored = restore(
      levelsFor(lang)[0],
      readSave(saves.get(saveKeyFor(lang))).progress.cielo,
    );
    assert.deepEqual(restored.found, [lang === 'es' ? 'SOL' : 'SUN']);
  }
});
void test('English dynamic messages preserve actual words, counts and custom names', () => {
  assert.equal(
    translate('en', 'Página 60 · Grand expedition'),
    'Page 60 · Grand expedition',
  );
  assert.equal(translate('en', '¡SUN encontrada!'), 'SUN found!');
  assert.equal(
    translate('en', 'Bloqueado nivel 3: Home'),
    'Locked level 3: Home',
  );
  assert.equal(translate('en', 'Eliminar Mi universo'), 'Delete Mi universo');
  assert.equal(translate('es', 'Jugar'), 'Jugar');
});
