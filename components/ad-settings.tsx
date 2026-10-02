'use client';
import { useEffect, useState } from 'react';
import { AD_COPY } from '@/lib/ad-copy';
import type { Language } from '@/lib/preferences';
import { prepareAds, showAdPrivacy } from '@/lib/ads';

export default function AdSettings({ language }: { language: Language }) {
  const copy = AD_COPY[language];
  const [required, setRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    void prepareAds().then((s) => {
      setRequired(s.privacyRequired);
    });
  }, []);
  if (!required && !error) return null;
  return (
    <section className="settings-group ad-settings">
      {required && (
        <button
          className="menu-row"
          disabled={busy}
          data-sound="none"
          onClick={async () => {
            setBusy(true);
            setError(false);
            try {
              const s = await showAdPrivacy();
              setRequired(s.privacyRequired);
            } catch {
              setError(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          {copy.privacy}
        </button>
      )}
      {error && <output aria-live="polite">{copy.unavailable}</output>}
    </section>
  );
}
