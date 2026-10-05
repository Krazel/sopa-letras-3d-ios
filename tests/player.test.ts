import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialStateForChoice,
  selectCell,
  isWon,
  createPuzzle,
  replayCampaignState,
} from '../lib/game.ts';
import { LANGUAGES, supportedLanguage } from '../lib/preferences.ts';
import {
  LEVELS,
  SAVE_KEY,
  emptySave,
  readSave,
  saveGame,
  saveFreeCompletion,
  restore,
  isUnlocked,
  recommendedLevel,
  campaignFor,
  CAMPAIGN_IDS,
  campaignPosition,
  levelsFor,
  customChoice,
  generateCustom,
  completedWordCount,
} from '../lib/player.ts';
void test('word statistics recover old wins without paths in every language, counting each board once', () => {
  for (const { code } of LANGUAGES) {
    const [first, second] = levelsFor(code);
    const data = readSave(
      JSON.stringify({
        ...emptySave(),
        completed: [first.id],
        freeCompleted: [first.id, second.id],
      }),
    );
    assert.equal(
      completedWordCount(data, code),
      first.words.length + second.words.length,
    );
    const replay = saveGame(data, first.id, initialStateForChoice(first));
    assert.equal(
      completedWordCount(readSave(JSON.stringify(replay)), code),
      first.words.length + second.words.length,
    );
  }
});
void test('partial free-play and custom words survive restarts without duplicate replay credit', () => {
  for (const choice of [
    levelsFor('es')[0],
    customChoice('Personal', 'SOL,LUNA', 'cube', 4, 73, 'custom-stats'),
  ]) {
    let game = initialStateForChoice(choice);
    for (const id of game.puzzle.words[0].path)
      game = selectCell(game, id);
    const fresh = {
      ...emptySave(),
      customs: choice.id.startsWith('custom-') ? [choice] : [],
    };
    const save = choice.id.startsWith('custom-')
      ? saveGame
      : saveFreeCompletion;
    let data = readSave(JSON.stringify(save(fresh, choice.id, game)));
    assert.equal(completedWordCount(data, 'es'), 1);
    data = save(data, choice.id, initialStateForChoice(choice));
    data = save(data, choice.id, game);
    assert.equal(
      completedWordCount(readSave(JSON.stringify(data)), 'es'),
      1,
    );
    assert.deepEqual(data.completed, []);
    assert.deepEqual(data.freeCompleted, []);
  }
});
void test('word statistics ignore unknown boards and words in imported history', () => {
  const choice = levelsFor('es')[0];
  const data = readSave(
    JSON.stringify({
      ...emptySave(),
      foundWords: {
        unknown: ['SOL'],
        [choice.id]: [
          choice.words[0],
          choice.words[0],
          'INEXISTENTE',
          null,
          42,
        ],
      },
    }),
  );
  assert.equal(completedWordCount(data, 'es'), 1);
  assert.equal(data.foundWords?.unknown, undefined);
});
void test('replaying a completed campaign board resets only its attempt, retaining unlocks', () => {
  const campaign = campaignFor('es');
  let game = initialStateForChoice(campaign[0]);
  for (const word of game.puzzle.words)
    for (const id of word.path) game = selectCell(game, id);
  assert.equal(isWon(game), true);
  const completed = saveGame(emptySave(), campaign[0].id, game);
  const replay = replayCampaignState({
    ...game,
    hintPath: [0, 1],
    selection: [0],
  });
  assert.equal(isWon(replay), false);
  assert.deepEqual(replay.found, []);
  assert.deepEqual(replay.selection, []);
  assert.equal(replay.hintPath, undefined);
  assert.equal(replay.puzzle, game.puzzle);
  assert.equal(isWon(game), true);
  const saved = readSave(
    JSON.stringify(saveGame(completed, campaign[0].id, replay)),
  );
  assert.deepEqual(saved.completed, completed.completed);
  assert.equal(isUnlocked(saved, 1), true);
  assert.equal(
    isWon(restore(campaign[0], saved.progress[campaign[0].id])),
    false,
  );
});
void test('free-play wins persist a separate tick without unlocking campaign levels', () => {
  const choice = LEVELS.find((p) => p.size === 6)!;
  let game = initialStateForChoice(choice);
  const fresh = emptySave();
  assert.equal(saveFreeCompletion(fresh, choice.id, game), fresh);
  for (const word of game.puzzle.words)
    for (const id of word.path) game = selectCell(game, id);
  const save = readSave(
    JSON.stringify(saveFreeCompletion(fresh, choice.id, game)),
  );
  assert.deepEqual(save.freeCompleted, [choice.id]);
  assert.deepEqual(save.completed, []);
  assert.equal(campaignPosition(save), 0);
  assert.equal(isUnlocked(save, 1), false);
  assert.deepEqual(
    saveFreeCompletion(save, choice.id, game).freeCompleted,
    [choice.id],
  );
  assert.deepEqual(
    readSave(JSON.stringify({ version: 1, completed: ['cielo'] }))
      .freeCompleted,
    [],
  );
  assert.deepEqual(
    readSave(
      JSON.stringify({
        ...save,
        freeCompleted: [choice.id, choice.id, 'invalid'],
      }),
    ).freeCompleted,
    [choice.id],
  );
});
void test('the campaign has four boards per size and advances exactly one by one', () => {
  for (const { code } of LANGUAGES) {
    const campaign = campaignFor(code);
    assert.equal(campaign.length, 24);
    assert.deepEqual(
      campaign.map((p) => p.size),
      [3, 4, 5, 6, 8, 10].flatMap((size) => Array(4).fill(size)),
    );
    assert.equal(levelsFor(code).length, 60);
  }
  let save = emptySave();
  const campaign = campaignFor('es');
  for (const [index, choice] of campaign.entries()) {
    assert(isUnlocked(save, index));
    assert(!isUnlocked(save, index + 1));
    assert.equal(recommendedLevel(save)!.id, choice.id);
    let game = initialStateForChoice(choice);
    for (const word of game.puzzle.words)
      for (const id of word.path) game = selectCell(game, id);
    save = readSave(JSON.stringify(saveGame(save, choice.id, game)));
    assert.equal(campaignPosition(save), index + 1);
    assert.equal(save.completed.length, index + 1);
    assert(isWon(restore(choice, save.progress[choice.id])));
    assert.equal(
      saveGame(save, choice.id, game).completed.length,
      index + 1,
    );
  }
  assert.equal(recommendedLevel(save), undefined);
  assert(!isUnlocked(save, -1));
  assert(!isUnlocked(save, campaign.length));
  assert(SAVE_KEY);
});
void test('legacy wins and saved puzzles retain identity without restarting at easy boards', () => {
  const choice = LEVELS.find((p) => p.id === 'universo')!;
  let game = initialStateForChoice(choice);
  for (const word of game.puzzle.words)
    for (const id of word.path) game = selectCell(game, id);
  const loaded = readSave(
    JSON.stringify(saveGame(emptySave(), choice.id, game)),
  );
  assert(isWon(restore(choice, loaded.progress[choice.id])));
  assert.equal(recommendedLevel(loaded)!.id, 'oceano');
  const extra = LEVELS.find((p) => !CAMPAIGN_IDS.includes(p.id))!;
  loaded.completed.push(extra.id);
  const reloaded = readSave(JSON.stringify(loaded));
  assert(reloaded.completed.includes(extra.id));
  assert.equal(recommendedLevel(reloaded)!.id, 'oceano');
  loaded.completed.push('exploracion', 'arqueologia', 'prehistoria');
  assert.equal(recommendedLevel(loaded)!.id, 'ecologia');
  const before = campaignPosition(loaded);
  loaded.completed.push(CAMPAIGN_IDS[0]);
  assert.equal(campaignPosition(loaded), before);
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
void test('creator preserves accents and Ñ, rejects duplicates and validates capacity', () => {
  const p = customChoice(
    'Mi sopa',
    'niño\nárbol, LUNA',
    'cube',
    4,
    73,
    'custom-test',
  );
  assert.deepEqual(p.words, ['NIÑO', 'ÁRBOL', 'LUNA']);
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
    'árbol,A\u0301RBOL',
    'dos palabras',
    '12A',
    '\u0301',
    'ABCDEFGHIJKLMNOPQ',
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
  assert.throws(() =>
    customChoice('', 'SOL', 'cube', 4, 1, 'custom-test'),
  );
});
void test('retired stars cannot return through creator or saves; cube progress survives', () => {
  const cube = customChoice(
    'Mi cubo',
    'SOL,LUNA',
    'cube',
    4,
    73,
    'custom-cube',
  );
  const raw = {
    ...emptySave(),
    completed: ['cielo', 'estrella'],
    customs: [
      cube,
      { ...cube, id: 'custom-retired', shape: 'star', size: 13 },
    ],
    progress: {
      cielo: { paths: {} },
      'custom-cube': { paths: {} },
      'custom-retired': { paths: {} },
      estrella: { paths: {} },
    },
  };
  const saved = readSave(JSON.stringify(raw));
  assert.equal(LEVELS.length, 60);
  assert(!LEVELS.some((p) => p.id === 'estrella'));
  assert.deepEqual(saved.customs, [cube]);
  assert.deepEqual(saved.completed, ['cielo']);
  assert.deepEqual(Object.keys(saved.progress), ['cielo', 'custom-cube']);
  assert(isUnlocked({ ...saved, completed: CAMPAIGN_IDS.slice(0, 9) }, 9));
  assert(LEVELS.some((p) => p.id === 'universo'));
  assert.throws(() =>
    customChoice(
      'Retirada',
      'SOL',
      'star' as 'cube',
      13,
      1,
      'custom-retired',
    ),
  );
  assert.throws(() => createPuzzle(1, 13, ['SOL'], 'star' as 'cube'));
});
void test('language choices contain only available translations and safely fall back', () => {
  assert.equal(LANGUAGES.length, 11);
  assert.deepEqual(LANGUAGES.slice(0, 2), [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
  ]);
  assert.equal(supportedLanguage('en'), 'en');
  assert.equal(supportedLanguage(null), 'es');
  assert.equal(supportedLanguage('es'), 'es');
});
