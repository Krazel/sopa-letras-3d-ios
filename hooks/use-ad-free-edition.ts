import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';

const subscribe = () => () => {};
const read = () =>
  Capacitor.getPlatform() === 'android';

// Only the explicitly requested Android edition is ad-free. Desktop keeps
// the standard ad flow, reporting unavailable inventory without fake rewards.
export function useAdFreeEdition() {
  return useSyncExternalStore(subscribe, read, () => false);
}
