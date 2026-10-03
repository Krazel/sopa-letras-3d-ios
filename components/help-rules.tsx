import { AD_COPY } from '@/lib/ad-copy';
import { translator } from '@/lib/i18n';
import type { Language } from '@/lib/preferences';
import { useAdFreeEdition } from '@/hooks/use-ad-free-edition';

export default function HelpRules({ language }: { language: Language }) {
  const t = translator(language);
  const copy = AD_COPY[language];
  const adFree = useAdFreeEdition();
  return (
    <div className="help-rules">
      <p>
        <strong>{t('Toca')}</strong>{' '}
        {t(
          'letras vecinas, una a una, para formar las palabras. También se conectan entre capas.',
        )}
      </p>
      <p>
        <strong>{t('Arrastra')}</strong>{' '}
        {t(
          'para girar libremente. Pellizca o usa la rueda para acercarte, incluso al interior.',
        )}
      </p>
      <p>
        <strong>{t('Deshaz')}</strong>{' '}
        {t(
          'tocando una letra ya elegida. Si tocas una que no es vecina, se borra la selección.',
        )}
      </p>
      {!adFree && (
        <p className="hint-help">
          <strong>{copy.hint}.</strong> {copy.help}
        </p>
      )}
      <p>
        {t(
          'Las palabras pueden compartir casillas, aunque ya estén marcadas. En una misma palabra cada casilla se usa una sola vez.',
        )}
      </p>
    </div>
  );
}
