import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePuzzle, decodePuzzle, addCustom } from '../lib/sharing.ts';
import {
  customChoice,
  generateCustom,
  emptySave,
  readSave,
  restore,
  snapshot,
} from '../lib/player.ts';

void test('shared Unicode puzzle reproduces the exact cube and paths, without progress', () => {
  const { choice, game } = generateCustom(
    customChoice(
      'Mi jardín 🌿',
      'NIÑO, LUNA, MAR',
      'cube',
      4,
      9876,
      'custom-original',
    ),
  );
  game.found = [game.puzzle.words[0].text];
  const imported = decodePuzzle(encodePuzzle(choice), 'custom-imported');
  assert.equal(imported.name, choice.name);
  assert.deepEqual(restore(imported).puzzle.cells, game.puzzle.cells);
  assert.deepEqual(restore(imported).puzzle.words, game.puzzle.words);
  assert.deepEqual(restore(imported).found, []);
  assert(!encodePuzzle(choice).includes('custom-original'));
});
void test('reimport is idempotent and preserves saved progress even when the shelf is full', () => {
  const { choice, game } = generateCustom(
    customChoice('Luna', 'LUNA', 'cube', 3, 9, 'custom-original'),
  );
  game.found = ['LUNA'];
  const data = {
    ...emptySave(),
    customs: [choice],
    progress: { [choice.id]: snapshot(game) },
  };
  for (let i = 0; i < 19; i++)
    data.customs.push({ ...choice, id: `custom-${i}`, name: `Otro ${i}` });
  const imported = decodePuzzle(encodePuzzle(choice), 'custom-new');
  assert.equal(addCustom(data, imported), data);
  assert.deepEqual(readSave(JSON.stringify(data)), data);
  assert.throws(() => addCustom(data, { ...choice, name: 'Extra' }), /20/);
});
void test('reject unsupported, truncated, oversized and malicious definitions', () => {
  const pack = (value: unknown) =>
    'SOPA1-' + Buffer.from(JSON.stringify(value)).toString('base64url');
  for (const code of [
    '',
    'SOPA2-abc',
    'SOPA1-abc',
    'SOPA1-' + 'a'.repeat(2048),
    pack(null),
    pack(['X', 3, 1, ['SOL'], 'extra']),
    pack(['X', 100, 1, ['SOL']]),
    pack(['X', 3, -1, ['SOL']]),
    pack(['X', 3, 0x100000000, ['SOL']]),
    pack(['X', 3, 1, ['SOL\nMAR']]),
    pack(['X', 3, 1, ['SOL', 'SOL']]),
    pack(['X', 3, 1, [{ word: 'SOL' }]]),
  ]) {
    assert.throws(() => decodePuzzle(code, 'custom-test'), /código/);
  }
});
