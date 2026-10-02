import { collectGraphemes } from 'unicode-segmenter/grapheme';
import type { Language } from './preferences.ts';

// Pinned Unicode segmentation makes a shared board identical on iOS and desktop.
export const lettersOf = (text: string): string[] =>
  // Keep the Catalan geminated L together as a readable, selectable tile.
  text
    .normalize('NFC')
    .split(/([Ll]·[Ll])/u)
    .flatMap((part) =>
      /^[Ll]·[Ll]$/u.test(part) ? [part] : collectGraphemes(part),
    );
export const normalizeWord = (text: string, language?: Language): string =>
  text
    .trim()
    .normalize('NFC')
    .replace(/ß/g, 'ẞ')
    .toLocaleUpperCase(language === 'tr' ? 'tr' : 'und')
    .normalize('NFC');
export const validWord = (text: string): boolean =>
  text.length <= 160 &&
  text === text.normalize('NFC') &&
  /^[\p{L}][\p{L}\p{M}]*$/u.test(text.replace(/[Ll]·[Ll]/gu, 'LL')) &&
  lettersOf(text).length >= 1 &&
  lettersOf(text).length <= 16;
export const reverseWord = (text: string): string =>
  lettersOf(text).reverse().join('');

const alphabets: [RegExp, string][] = [
  [/\p{Script=Cyrillic}/u, 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЫЭЮЯ'],
  [/\p{Script=Arabic}/u, 'ابتثجحخدذرزسشصضطظعغفقكلمنهويپچژگٹڈڑںھہے'],
  [/\p{Script=Devanagari}/u, 'अआइईउऊएकखगचजटडतनपबमयरलवसह'],
  [/\p{Script=Bengali}/u, 'অআইউএকখগচজটডতদনপবমযরলশসহ'],
  [/\p{Script=Telugu}/u, 'అఆఇఈఉఊఎకఖగచజటడతదనపబమయరలవసహ'],
  [/\p{Script=Tamil}/u, 'அஆஇஈஉஊஎஏஐஒஓகஙசஞடணதநபமயரலவழளறன'],
  [/\p{Script=Hangul}/u, '하늘바다나무구름별꽃산강달빛봄물새눈'],
  [
    /[\p{Script=Hiragana}\p{Script=Katakana}]/u,
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
  ],
  [/\p{Script=Han}/u, '天地日月山水火木金土云风雨星海花鸟树林'],
];
const latinDice: Partial<Record<Language, string>> = {
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  fr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÀÂÆÇÉÈÊËÎÏÔŒÙÛÜŸ',
  pt: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÂÃÀÇÉÊÍÓÔÕÚ',
  de: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜẞ',
  it: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÓÙ',
  ca: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÀÇÉÈÍÏÓÒÚÜ',
  tr: 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ',
};
export function alphabetFor(
  text: string,
  dice = false,
  language?: Language,
): string[] {
  const script = alphabets.find(([pattern]) => pattern.test(text));
  if (script)
    return [...new Set([...lettersOf(text), ...lettersOf(script[1])])];
  if (dice && language && latinDice[language])
    return [
      ...new Set([...lettersOf(text), ...lettersOf(latinDice[language]!)]),
    ];
  const base = dice
    ? 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'
    : 'AAAABCDEEEEFGIIIJLMNNOOOPRRSSSTUUV';
  // Keep the original filler distribution byte-for-byte for legacy ASCII boards.
  return [
    ...lettersOf(base),
    ...lettersOf(text).filter((c) => !/^[A-ZÑ]$/.test(c)),
  ];
}
