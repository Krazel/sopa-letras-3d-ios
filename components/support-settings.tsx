'use client';
import { useEffect, useState } from 'react';
import { useSupport } from '@/hooks/use-support';
import { ENGAGEMENT_COPY } from '@/lib/engagement-copy';
import { SUPPORT_COPY } from '@/lib/support-copy';
import { SUPPORT_PLAN_COPY } from '@/lib/support-plan-copy';
import { CreditCard, ChevronRight } from 'lucide-react';
import type { Language } from '@/lib/preferences';
import {
  supportAvailable,
  refreshSupport,
  supportProducts,
  purchaseSupport,
  restoreSupport,
  manageSupport,
  type SupportProduct,
} from '@/lib/support';

export default function SupportSettings({
  language,
  upgradeOnly = false,
  collapsible = false,
}: {
  language: Language;
  upgradeOnly?: boolean;
  collapsible?: boolean;
}) {
  const planCopy = ENGAGEMENT_COPY[language];
  const menuCopy = SUPPORT_PLAN_COPY[language];
  const copy = SUPPORT_COPY[language],
    status = useSupport();
  const [available, setAvailable] = useState(false),
    [products, setProducts] = useState<SupportProduct[]>([]);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  async function load() {
    setBusy(true);
    setNotice('');
    try {
      await refreshSupport();
      setProducts(await supportProducts());
    } catch {
      setNotice('error');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const enabled = supportAvailable();
    setAvailable(enabled);
    if (enabled) void load();
  }, []);
  if (!available) return null;
  async function act(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      await action();
    } catch {
      setNotice('error');
    } finally {
      setBusy(false);
    }
  }
  const Container = collapsible ? 'details' : 'section';
  return (
    <Container
      className="settings-group support-settings"
      aria-label={menuCopy.title}
    >
      {collapsible ? (
        <summary className="support-summary">
          <CreditCard size={22} />
          <span>{menuCopy.title}</span>
          <ChevronRight size={18} />
        </summary>
      ) : (
        <h2>{menuCopy.title}</h2>
      )}
      <div className="support-body">
        {status.active && (
          <p className="support-active" role="status">
            {copy.active}{' '}
            {planCopy.remaining
              .replace('{n}', String(status.hintsRemaining))
              .replace('{total}', String(status.hintLimit))}
          </p>
        )}
        <div className="support-products">
          {products
            .filter(
              (product) => !upgradeOnly || product.hintLimit > status.hintLimit,
            )
            .map((product) => (
              <button
                key={product.id}
                className="menu-row"
                disabled={busy || product.id === status.productID}
                data-sound="none"
                onClick={() =>
                  void act(async () => {
                    const result = await purchaseSupport(product.id);
                    setNotice(result === 'purchased' ? '' : result);
                  })
                }
              >
                <span>
                  <strong className="support-price">
                    {product.price}
                    <span> / {copy.month}</span>
                  </strong>
                  <small>
                    {menuCopy.monthly.replace('{n}', String(product.hintLimit))}
                  </small>
                  <small>{menuCopy.noAds}</small>
                </span>
                <span>
                  {product.id === status.productID ? '✓' : copy.subscribe}
                </span>
              </button>
            ))}
        </div>
        {!products.length && !busy && (
          <p>
            {copy.unavailable}{' '}
            <button className="dialog-action" onClick={() => void load()}>
              {copy.retry}
            </button>
          </p>
        )}
        {busy && <p role="status">{copy.loading}</p>}
        <p>{copy.intro}</p>
        <p className="support-terms">{copy.renewal}</p>
        <div className="support-actions">
          <button
            className="dialog-action"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const s = await restoreSupport();
                setNotice(s.active ? '' : 'empty');
              })
            }
          >
            {copy.restore}
          </button>
          <button
            className="dialog-action"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await manageSupport();
              })
            }
          >
            {copy.manage}
          </button>
          <a
            href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
            target="_blank"
            rel="noreferrer"
          >
            {copy.terms}
          </a>
          <a
            href="https://krazel.github.io/sopa-letras-3d-ios/privacy/"
            target="_blank"
            rel="noreferrer"
          >
            {copy.privacy}
          </a>
        </div>
        <output aria-live="polite">
          {notice
            ? copy[notice as 'pending' | 'cancelled' | 'error' | 'empty']
            : ''}
        </output>
      </div>
    </Container>
  );
}
