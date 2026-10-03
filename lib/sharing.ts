import { customChoice, type SaveData } from './player.ts';
import { initialStateForChoice, type PuzzleChoice } from './game.ts';

import { validWord } from './letters.ts';

const PREFIX = 'SOPA1-';
const invalid = 'El código de sopa no es válido o pertenece a otra versión.';

/** Portable puzzle definition, without local identifiers or a player's progress. */
export function encodePuzzle(p: PuzzleChoice): string {
  const payload = JSON.stringify([p.name, p.size, p.seed >>> 0, p.words]);
  return (
    PREFIX +
    btoa(
      Array.from(new TextEncoder().encode(payload), (b) =>
        String.fromCharCode(b),
      ).join(''),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  );
}

export function decodePuzzle(code: string, id: string): PuzzleChoice {
  try {
    const token = code.trim();
    if (token.length > 8192 || !/^SOPA1-[A-Za-z0-9_-]+$/.test(token))
      throw Error(invalid);
    const bytes = Uint8Array.from(
      atob(token.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    const fields: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    );
    if (!Array.isArray(fields) || fields.length !== 4) throw Error(invalid);
    const [name, size, seed, words] = fields;
    if (
      typeof name !== 'string' ||
      !Number.isInteger(size) ||
      !Number.isInteger(seed) ||
      seed < 0 ||
      seed > 0xffffffff ||
      !Array.isArray(words) ||
      words.some((w) => typeof w !== 'string' || !validWord(w))
    )
      throw Error(invalid);
    const choice = customChoice(name, words.join('\n'), 'cube', size, seed, id);
    // Never change the seed when importing: the recipient must get the same cube.
    initialStateForChoice(choice);
    return choice;
  } catch {
    throw Error(invalid);
  }
}

export function addCustom(data: SaveData, choice: PuzzleChoice): SaveData {
  const code = encodePuzzle(choice);
  if (data.customs.some((p) => encodePuzzle(p) === code)) return data;
  return { ...data, customs: [choice, ...data.customs] };
}
