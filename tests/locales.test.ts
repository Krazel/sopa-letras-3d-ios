import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LANGUAGES,
  directionFor,
  initialLanguage,
} from '../lib/preferences.ts';
import { LEGACY_IDS, LEGACY_WORLD_CONTENT } from '../lib/locale-content.ts';
import { CHAPTERS } from '../lib/content.ts';
import { lettersOf, normalizeWord, validWord } from '../lib/letters.ts';
import { EN, translate } from '../lib/i18n.ts';
import { WORLD_UI, WORLD_ALIASES } from '../lib/locale-ui.ts';
import {
  PUZZLES,
  initialStateForChoice,
  selectCell,
  selectDie,
  dieLetters,
  isWon,
} from '../lib/game.ts';
import {
  levelsFor,
  customChoice,
  generateCustom,
  saveKeyFor,
  emptySave,
  saveGame,
  restore,
  readSave,
  snapshot,
  isUnlocked,
  CAMPAIGN_IDS,
} from '../lib/player.ts';
import { encodePuzzle, decodePuzzle } from '../lib/sharing.ts';

void test('Unicode retains marks, segments whole characters and rejects non-letter input', () => {
  assert.equal(normalizeWord(' a\u0301rbol '), 'ÁRBOL');
  assert.equal(normalizeWord('pingüino'), 'PINGÜINO');
  assert.equal(normalizeWord('niño'), 'NIÑO');
  assert.equal(normalizeWord('straße'), 'STRAẞE');
  assert.equal(normalizeWord('ışık, iz', 'tr'), 'IŞIK, İZ');
  for (const [text, n] of [
    ['ÁRBOL', 5],
    ['क्षि', 1],
    ['மீ', 1],
    ['कक्षा', 2],
    ['눈', 1],
    ['𠮷', 1],
    ['é', 1],
    ['L·L', 1],
    ['COL·LECCIÓ', 8],
  ] as const)
    assert.equal(lettersOf(text).length, n, text);
  for (const text of [
    '\u0301',
    'A1',
    'A·B',
    '·LL',
    'LL·',
    'A B',
    '<b>',
    '☀️',
    '\u202EABC',
    'क\u200Dष',
    'A'.repeat(17),
  ])
    assert(!validWord(text), text);
  assert.throws(
    () =>
      customChoice(
        'Duplicates',
        'ÁRBOL,A\u0301RBOL',
        'cube',
        4,
        1,
        'custom-test',
      ),
    /repetidas/,
  );
});

void test('11 complete interface catalogues and independent storage namespaces', () => {
  assert.equal(initialLanguage(null, ['fr-FR'], false), 'fr');
  assert.equal(initialLanguage(null, ['xx', 'ca-ES'], false), 'ca');
  assert.equal(initialLanguage(null, ['zh-Hans-CN'], false), 'en');
  assert.equal(initialLanguage(null, ['fr-FR'], true), 'es');
  assert.equal(initialLanguage('ja', ['fr-FR'], true), 'ja');
  assert.equal(LANGUAGES.length, 11);
  assert.deepEqual(LANGUAGES.map((l) => l.code).sort(), [
    'ar',
    'ca',
    'de',
    'en',
    'es',
    'fr',
    'it',
    'ja',
    'ko',
    'pt',
    'tr',
  ]);
  assert.equal(new Set(LANGUAGES.map((l) => saveKeyFor(l.code))).size, 11);
  for (const { code } of LANGUAGES) {
    if (code === 'es' || code === 'en') continue;
    assert(WORLD_UI[code]);
    assert(Object.values(WORLD_UI[code]!).every((s) => s.trim().length > 0));
    for (const key of Object.keys(EN)) {
      const id = WORLD_ALIASES[key];
      if (id)
        assert.equal(
          translate(code, key),
          WORLD_UI[code]![id],
          `${code}: ${key}`,
        );
      else assert.notEqual(translate(code, key), key, `${code}: ${key}`);
    }
    assert(translate(code, 'Página 12 · 自作').includes('12'));
    assert(translate(code, 'Página 12 · 自作').includes('自作'));
    assert(translate(code, '¡É encontrada!').includes('É'));
    assert.notEqual(translate(code, 'Nivel 2 de 12'), 'Nivel 2 de 12');
  }
  assert.equal(directionFor('ar'), 'rtl');
  assert.equal(initialLanguage('zh', ['ca-ES'], true), 'es');
  assert.equal(directionFor('ca'), 'ltr');
});

void test('all 660 localized boards solve forward/reverse, across layers, with dice and persisted progress', () => {
  let total = 0;
  for (const { code } of LANGUAGES) {
    const levels = levelsFor(code);
    assert.equal(levels.length, 60);
    assert.deepEqual(
      levels.map((p) => [p.id, p.number, p.size, p.words.length]),
      levelsFor('en').map((p) => [p.id, p.number, p.size, p.words.length]),
      code,
    );
    assert.equal(
      new Set(CHAPTERS.map((title) => translate(code, title))).size,
      15,
    );
    let save = emptySave();
    for (const p of levels) {
      const campaignIndex = CAMPAIGN_IDS.indexOf(p.id);
      if (campaignIndex >= 0) assert(isUnlocked(save, campaignIndex));
      assert.equal(new Set(p.words).size, p.words.length);
      for (const reverse of [false, true]) {
        let game = initialStateForChoice(p),
          dice = initialStateForChoice(p);
        assert.deepEqual(game, initialStateForChoice(p));
        for (const cell of game.puzzle.cells) {
          assert.equal(lettersOf(cell.letter).length, 1);
          const faces = dieLetters(cell, p.seed);
          assert.equal(new Set(faces).size, 6);
          assert(faces.every((f) => lettersOf(f).length === 1));
        }
        for (const [i, word] of game.puzzle.words.entries()) {
          assert.equal(word.path.length, lettersOf(word.text).length);
          assert.equal(
            word.path.map((id) => game.puzzle.cells[id].letter).join(''),
            word.text,
          );
          if (i < 3 && word.path.length > 1)
            assert(
              new Set(word.path.map((id) => game.puzzle.cells[id].position[2]))
                .size > 1,
            );
          for (const id of reverse ? [...word.path].reverse() : word.path) {
            game = selectCell(game, id);
            dice = selectDie(dice, id, 0);
          }
        }
        assert(isWon(game), `${code}/${p.id}/${reverse}`);
        assert(isWon(dice), `${code}/${p.id}/dice`);
        save = readSave(JSON.stringify(saveGame(save, p.id, game)));
        assert(
          isWon(restore(p, save.progress[p.id])),
          `${code}/${p.id}/restore`,
        );
      }
      total++;
    }
  }
  assert.equal(total, 660);
});

void test('accented and complex-script custom games survive sharing, solving and reload exactly', () => {
  for (const { code } of LANGUAGES) {
    const words =
      code === 'es'
        ? 'ÁRBOL,PINGÜINO,NIÑO,CAFÉ'
        : levelsFor(code)[0].words.join(',');
    const { choice, game } = generateCustom(
      customChoice(
        `Test ${code}`,
        words,
        'cube',
        4,
        739,
        'custom-unicode',
        code,
      ),
    );
    const imported = decodePuzzle(encodePuzzle(choice), 'custom-imported');
    assert.deepEqual(initialStateForChoice(imported).puzzle, game.puzzle);
    let solved = game;
    for (const word of solved.puzzle.words)
      for (const id of [...word.path].reverse())
        solved = selectCell(solved, id);
    assert(isWon(solved));
    const data = readSave(
      JSON.stringify(
        saveGame({ ...emptySave(), customs: [choice] }, choice.id, solved),
      ),
    );
    assert(isWon(restore(data.customs[0], data.progress[choice.id])));
  }
});

void test('Spanish spelling migration validates original paths before preserving found words', () => {
  const current = levelsFor('es');
  for (const legacy of PUZZLES) {
    let game = initialStateForChoice(legacy);
    for (const word of game.puzzle.words)
      for (const id of word.path) game = selectCell(game, id);
    assert(isWon(game));
    const p = current.find((p) => p.id === legacy.id)!;
    const recovered = restore(p, snapshot(game));
    assert(isWon(recovered), legacy.id);
    assert(isWon(restore(p, snapshot(recovered))), `${legacy.id}/new snapshot`);
    const invalid = {
      paths: Object.fromEntries(legacy.words.map((w) => [w, [9999]])),
    };
    assert.equal(restore(p, invalid).found.length, 0);
  }
  assert(current.find((p) => p.id === 'agua')!.words.includes('RÍO'));
  assert(current.find((p) => p.id === 'aventura')!.words.includes('MONTAÑA'));
});

void test('expanded catalogues restore real 0.13.0 paths and keep all completed IDs', () => {
  for (const language of [
    'fr',
    'pt',
    'de',
    'it',
    'tr',
    'ar',
    'ko',
    'ja',
  ] as const) {
    const levels = levelsFor(language);
    for (const [i, id] of LEGACY_IDS.entries()) {
      const p = levels.find((p) => p.id === id)!;
      const previous = {
        ...p,
        ...LEGACY_WORLD_CONTENT[language][
          id as keyof typeof LEGACY_WORLD_CONTENT.fr
        ],
        size: [3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 8, 10][i],
        legacyWords: undefined,
        legacySize: undefined,
      };
      let old = initialStateForChoice(previous);
      for (const word of old.puzzle.words)
        for (const cell of word.path) old = selectCell(old, cell);
      assert(isWon(old));
      const save = readSave(JSON.stringify(saveGame(emptySave(), id, old)));
      const restored = restore(p, save.progress[id]);
      assert.deepEqual(
        new Set(restored.found),
        new Set(previous.words),
        language + '/' + id,
      );
      assert(save.completed.includes(id));
      assert.deepEqual(
        new Set(restore(p, snapshot(restored)).found),
        new Set(previous.words),
      );
    }
  }
});

void test('Catalan geminated L survives both directions, dice, sharing and save', () => {
  const { choice, game } = generateCustom(
    customChoice(
      'Català',
      'col·lecció,il·lusió,novel·la,plaça',
      'cube',
      4,
      153,
      'custom-cat',
      'ca',
    ),
  );
  assert.deepEqual(
    decodePuzzle(encodePuzzle(choice), 'custom-cat').words,
    choice.words,
  );
  for (const reverse of [false, true]) {
    let playing = initialStateForChoice(choice),
      dice = initialStateForChoice(choice);
    for (const word of game.puzzle.words)
      for (const id of reverse ? [...word.path].reverse() : word.path) {
        playing = selectCell(playing, id);
        dice = selectDie(dice, id, 0);
      }
    assert(isWon(playing));
    assert(isWon(dice));
    assert(isWon(restore(choice, snapshot(playing))));
  }
});
