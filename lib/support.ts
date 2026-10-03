import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from '@capacitor/core';
export type SupportStatus = {
  ready: boolean;
  available: boolean;
  active: boolean;
  productID: string;
};
export type SupportProduct = { id: string; name: string; price: string };
interface NativeSupport {
  status(): Promise<SupportStatus>;
  products(): Promise<{ products: SupportProduct[] }>;
  purchase(options: {
    id: string;
  }): Promise<{
    result: 'purchased' | 'pending' | 'cancelled';
    status?: SupportStatus;
  }>;
  restore(): Promise<SupportStatus>;
  manage(): Promise<SupportStatus>;
  addListener(
    event: 'statusChanged',
    callback: (status: SupportStatus) => void,
  ): Promise<PluginListenerHandle>;
}
const native = registerPlugin<NativeSupport>('SopaSupport');
const initial: SupportStatus = {
  ready: false,
  available: false,
  active: false,
  productID: '',
};
let status = initial;
const listeners = new Set<() => void>();
let observing: Promise<void> | undefined;
export const supportAvailable = () =>
  Capacitor.getPlatform() === 'ios' &&
  Capacitor.isPluginAvailable('SopaSupport');
export const supportSnapshot = () => status;
export const supportServerSnapshot = () => initial;
export function subscribeSupport(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function update(next: SupportStatus) {
  status = next;
  for (const listener of listeners) listener();
  return status;
}
async function observe() {
  if (!observing)
    observing = native
      .addListener('statusChanged', update)
      .then(() => {})
      .catch(() => {
        observing = undefined;
      });
  await observing;
}
export async function refreshSupport() {
  if (!supportAvailable())
    return update({ ...initial, ready: Capacitor.getPlatform() !== 'ios' });
  await observe();
  try {
    return update(await native.status());
  } catch {
    return update({ ...status, ready: false });
  } // do not start ads while status is uncertain
}
export async function supportProducts() {
  return (await native.products()).products;
}
export async function purchaseSupport(id: string) {
  const result = await native.purchase({ id });
  if (result.status) update(result.status);
  return result.result;
}
export async function restoreSupport() {
  return update(await native.restore());
}
export async function manageSupport() {
  return update(await native.manage());
}
