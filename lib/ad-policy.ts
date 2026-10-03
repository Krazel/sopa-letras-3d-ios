export class TransitionAds {
  private consumed = new Set<string>();
  take(completion: string, fresh: boolean): boolean {
    if (!fresh || this.consumed.has(completion)) return false;
    this.consumed.add(completion);
    return true;
  }
}
