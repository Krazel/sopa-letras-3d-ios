import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
export function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#f4eedf' : '#202a2b');
  if (Capacitor.isNativePlatform())
    void StatusBar.setStyle({
      style: theme === 'light' ? Style.Light : Style.Dark,
    });
}
