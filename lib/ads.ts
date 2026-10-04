import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  readHints,
  redeemHint,
  verifyHintStorage,
  type HintOffer,
  type RewardReceipt,
  HINT_PREFIX,
} from './hints';
import { TransitionAds } from './ad-policy';
import { setAudioSuspended } from './audio';
import { audioBackend } from './native-audio';
import { refreshSupport } from './support';

type AdStatus = { available: boolean; privacyRequired: boolean };
interface NativeAds {
  prepare(options: {rewardedOnly: boolean}): Promise<AdStatus>;
  showRewarded(options: {
    id: string;
    context: string;
  }): Promise<{ status: 'rewarded' | 'cancelled' | 'unavailable' }>;
  showInterstitial(): Promise<{ status: string }>;
  claimSupportHint(options: {
    id: string;
    context: string;
  }): Promise<{ status: 'rewarded' | 'unavailable' }>;
  rewards(): Promise<{ receipts: RewardReceipt[] }>;
  acknowledge(options: { id: string }): Promise<void>;
  privacy(): Promise<AdStatus>;
}
const native = registerPlugin<NativeAds>('SopaAds');
export const nativeAdsAvailable = () =>
  Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('SopaAds');
let busy = false;
let prepared: Promise<AdStatus> | undefined;
let policy: TransitionAds | undefined;
const hintSessions = new Set<string>();
export function beginHintSession(key: string) {
  hintSessions.add(key);
  try {
    // Also discard ledgers left by an app termination or an older build.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const saved = localStorage.key(i);
      if (
        saved?.startsWith(HINT_PREFIX) &&
        ![...hintSessions].some(
          (active) => saved === active || saved === active + ':paths',
        )
      )
        localStorage.removeItem(saved);
    }
  } catch {
    /* Storage availability is checked before requesting an ad. */
  }
  return () => {
    hintSessions.delete(key);
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(key + ':paths');
    } catch {
      /* Session keys are never reused. */
    }
  };
}
export function beginAdSession() {
  policy ??= new TransitionAds();
}
function adBreak(active: boolean, token: string) {
  window.dispatchEvent(
    new CustomEvent('sopa-ad-break', { detail: { active, token } }),
  );
}
async function withAdBreak<T>(action: () => Promise<T>): Promise<T> {
  const token = `ad:${crypto.randomUUID()}`;
  try {
    if (audioBackend() !== 'native') throw Error('Native audio unavailable');
    await setAudioSuspended(token, true); // wait for native ACK before presenting
    adBreak(true, token);
    return await action();
  } finally {
    // Clear this presentation only, after dismissal/failure and reward storage.
    // A failed recovery must not leave gameplay controls locked.
    await setAudioSuspended(token, false).catch(() => {});
    adBreak(false, token);
  }
}
export async function prepareAds(rewardedOnly = false): Promise<AdStatus> {
  beginAdSession();
  if (!nativeAdsAvailable())
    return { available: false, privacyRequired: false };
  const support = await refreshSupport();
  if (!support.ready || (support.active && !rewardedOnly))
    return { available: false, privacyRequired: false };
  if (!prepared)
    prepared = (async () => {
      try {
        return await withAdBreak(() => native.prepare({rewardedOnly}));
      } catch {
        prepared = undefined;
        return { available: false, privacyRequired: false };
      }
    })();
  const result = await prepared;
  if (!result.available) prepared = undefined; // permit a later retry after offline/consent failure
  return result;
}
export async function recoverRewards() {
  if (!nativeAdsAvailable()) return;
  const { receipts } = await native.rewards();
  for (const receipt of receipts) {
    const key = JSON.parse(receipt.context)?.key;
    if (!hintSessions.has(key)) {
      // Leaving/reloading ends the hint session, including delayed SDK receipts.
      await native.acknowledge({ id: receipt.id });
      continue;
    }
    redeemHint(localStorage, receipt);
    await native.acknowledge({ id: receipt.id }); // only after verified durable write
  }
}
export async function requestHint(
  offer: HintOffer,
  mode: 'included' | 'rewarded' = 'rewarded',
): Promise<'rewarded' | 'cancelled' | 'unavailable' | 'storage'> {
  if (busy || !hintSessions.has(offer.key) || !nativeAdsAvailable())
    return 'unavailable';
  busy = true;
  try {
    try {
      await recoverRewards();
      verifyHintStorage(localStorage, offer.key);
    } catch {
      return 'storage';
    }
    if ((readHints(localStorage, offer.key)[offer.word] ?? 0) > offer.before)
      return 'rewarded';
    const support = await refreshSupport();
    if (!support.ready) return 'unavailable';
    if (mode === 'included' && support.active && support.hintsRemaining > 0) {
      const result = await native.claimSupportHint({
        id: crypto.randomUUID(),
        context: JSON.stringify(offer),
      });
      try {
        await recoverRewards();
      } catch {
        return 'storage';
      }
      return result.status;
    }
    // Never replace a promised subscriber hint with an unexpected rewarded ad
    // when the entitlement expires between opening and accepting the offer.
    if (mode === 'included') return 'unavailable';
    if (!navigator.onLine) return 'unavailable';
    if (!(await prepareAds(true)).available) return 'unavailable';
    return await withAdBreak(async () => {
      const result = await native.showRewarded({
        id: crypto.randomUUID(),
        context: JSON.stringify(offer),
      });
      try {
        await recoverRewards();
      } catch {
        return 'storage';
      }
      return result.status;
    });
  } catch {
    return 'unavailable';
  } finally {
    busy = false;
  }
}
export async function transitionAd(completion: string, fresh: boolean) {
  beginAdSession();
  if (
    !policy!.take(completion, fresh) ||
    busy ||
    !nativeAdsAvailable() ||
    !navigator.onLine
  )
    return;
  busy = true;
  try {
    const support = await refreshSupport();
    if (!support.ready || support.active) return;
    if (!(await prepareAds()).available) return;
    // Preparation was started when the level opened; presentation never waits
    // for inventory to load and remains unavailable when consent is missing.
    await withAdBreak(() => native.showInterstitial());
  } catch {
    // preloaded only; never delay navigation to load an ad
    /* Missing SDK/inventory never blocks the next level. */
  } finally {
    busy = false;
  }
}
export async function showAdPrivacy(): Promise<AdStatus> {
  if (busy || !nativeAdsAvailable())
    return { available: false, privacyRequired: false };
  busy = true;
  try {
    const result = await withAdBreak(() => native.privacy());
    prepared = Promise.resolve(result);
    return result;
  } finally {
    busy = false;
  }
}
