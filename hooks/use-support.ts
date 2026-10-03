import { useSyncExternalStore } from 'react';
import {
  subscribeSupport,
  supportSnapshot,
  supportServerSnapshot,
} from '@/lib/support';
export function useSupport() {
  return useSyncExternalStore(
    subscribeSupport,
    supportSnapshot,
    supportServerSnapshot,
  );
}
