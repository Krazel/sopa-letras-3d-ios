export const INTERSTITIAL_INTERVAL_MS = 120_000;
export class TransitionAds {
  private lastAd: number;
  private consumed = new Set<string>();
  constructor(startedAt: number) {
    this.lastAd = startedAt;
  }
  rewardShown(now: number) {
    this.lastAd = now;
  }
  take(completion: string, fresh: boolean, now: number): boolean {
    if (!fresh || this.consumed.has(completion)) return false;
    this.consumed.add(completion);
    if (now - this.lastAd < INTERSTITIAL_INTERVAL_MS) return false;
    this.lastAd = now;
    return true;
  }
}
