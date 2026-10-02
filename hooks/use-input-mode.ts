import { useEffect } from 'react';

// Dialog focus restoration in WKWebView can mark a touch as focus-visible.
// Keep semantic focus and keyboard navigation, while touch/mouse never leaves
// a decorative ring behind on the game's controls.
export function useInputMode() {
  useEffect(() => {
    const root = document.documentElement;
    const pointer = () => {
      root.dataset.inputMode = 'pointer';
    };
    const keyboard = (event: KeyboardEvent) => {
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        [
          'Tab',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Enter',
          ' ',
        ].includes(event.key)
      ) {
        root.dataset.inputMode = 'keyboard';
      }
    };
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('keydown', keyboard, true);
      delete root.dataset.inputMode;
    };
  }, []);
}
