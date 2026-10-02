import type { GameState } from './game.ts';
export const SOUND_FILES = {
  letter: '/audio/letter.wav',
  undo: '/audio/undo.wav',
  word: '/audio/word.wav',
  win: '/audio/win.wav',
  ui: '/audio/ui.wav',
  page: '/audio/page.wav',
} as const;
export type SoundCue = keyof typeof SOUND_FILES;
/** Deliberate selections only; never restores, renders or camera movements. */
export function selectionSound(
  previous: GameState,
  next: GameState,
  id: number,
  face?: number,
): SoundCue | null {
  if (previous === next) return null;
  if (next.found.length > previous.found.length)
    return next.found.length === next.puzzle.words.length ? 'win' : 'word';
  if (next.selection.length > previous.selection.length) return 'letter';
  if (
    next.selection.length < previous.selection.length &&
    previous.selection.some(
      (cell, i) =>
        cell === id &&
        (face === undefined || previous.selectionFaces?.[i] === face),
    )
  )
    return 'undo';
  return null;
}
