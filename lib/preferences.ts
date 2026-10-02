// Add a language only once its interface and puzzle collection are translated.
export const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'ca', label: 'Català' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ko', label: '한국어' },
  { code: 'it', label: 'Italiano' },
] as const;
export type Language = (typeof LANGUAGES)[number]['code'];
export const directionFor = (language: Language) =>
  language === 'ar' ? 'rtl' : 'ltr';
export function supportedLanguage(value: string | null): Language {
  return LANGUAGES.find((language) => language.code === value)?.code ?? 'es';
}

export function initialLanguage(
  saved: string | null,
  preferred: readonly string[],
  hasLegacySave: boolean,
): Language {
  if (saved) return supportedLanguage(saved);
  // Existing Spanish players keep their progress and language after upgrading.
  if (hasLegacySave) return 'es';
  for (const locale of preferred) {
    const base = locale.toLowerCase().split(/[-_]/)[0];
    const language = LANGUAGES.find((l) => l.code === base);
    if (language) return language.code;
  }
  return 'en';
}
