import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';

const subscribe = () => () => {};
const read = () =>
  Capacitor.getPlatform() === 'android' || location.protocol === 'sopa:';

// The downloadable Android and PC editions contain no advertising provider.
export function useAdFreeEdition() {
  return useSyncExternalStore(subscribe, read, () => false);
}
