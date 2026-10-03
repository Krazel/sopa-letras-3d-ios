import { AD_COPY } from '@/lib/ad-copy';
import { translator } from '@/lib/i18n';
import type { Language } from '@/lib/preferences';
import { useAdFreeEdition } from '@/hooks/use-ad-free-edition';
import { useSupport } from '@/hooks/use-support';
import { SUPPORT_COPY } from '@/lib/support-copy';

export default function HelpRules({ language }: { language: Language }) {
  const t = translator(language);
  const copy = AD_COPY[language];
  const adFree = useAdFreeEdition();
  const supporter = useSupport().active;
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
          <strong>{copy.hint}.</strong>{' '}
          {supporter ? SUPPORT_COPY[language].intro : copy.help}
        </p>
      )}
      {!adFree && <p>{SUPPORT_COPY[language].transitions}</p>}
      <p>
        {t(
          'Las palabras pueden compartir casillas, aunque ya estén marcadas. En una misma palabra cada casilla se usa una sola vez.',
        )}
      </p>
    </div>
  );
}
