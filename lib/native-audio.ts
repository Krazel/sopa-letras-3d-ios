import { Capacitor, registerPlugin } from '@capacitor/core';
import type { SoundCue } from './sound-events.ts';

export interface AudioSettings {
  enabled: boolean;
  effectsEnabled: boolean;
  musicEnabled: boolean;
  effectsVolume: number;
  musicVolume: number;
  suspended: boolean;
  track: string;
}
interface NativeAudio {
  configure(state: AudioSettings & { revision: number }): Promise<void>;
  playEffect(options: { cue: SoundCue; revision: number }): Promise<void>;
  stopEffects(): Promise<void>;
  resume(): Promise<void>;
  status(): Promise<Record<string, unknown>>;
}
const plugin = registerPlugin<NativeAudio>('SopaAudio');
let revision = 0;
let effectEpoch = 0;
let queue: Promise<unknown> = Promise.resolve();
let lastError = '';
// Never switch to web playback after a native failure: it could double a cue
// whose bridge response was lost, and would break the iOS silence policy.
export function audioBackend() {
  if (Capacitor.getPlatform() !== 'ios') return 'web';
  return Capacitor.isPluginAvailable('SopaAudio') ? 'native' : 'unavailable';
}
function enqueue(action: () => Promise<unknown>, strict = false) {
  const result = queue.then(action);
  queue = result.catch((error: unknown) => {
    lastError = error instanceof Error ? error.message : String(error);
  });
  return strict ? result : queue;
}
export function configureNative(state: AudioSettings, strict = false) {
  const current = ++revision;
  return enqueue(
    () => plugin.configure({ ...state, revision: current }),
    strict,
  );
}
export function playNative(cue: SoundCue) {
  const current = revision;
  const epoch = effectEpoch;
  const started = performance.now();
  return enqueue(async () => {
    if (
      epoch !== effectEpoch ||
      current !== revision ||
      performance.now() - started > 400
    )
      return;
    await plugin.playEffect({ cue, revision: current });
  });
}
export function stopNative() {
  effectEpoch++;
  return enqueue(() => plugin.stopEffects());
}
export function resumeNative() {
  return enqueue(() => plugin.resume());
}
export async function nativeAudioStatus() {
  await queue;
  return {
    backend: audioBackend(),
    lastError,
    ...(audioBackend() === 'native' ? await plugin.status() : {}),
  };
}
