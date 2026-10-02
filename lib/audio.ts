import { SOUND_FILES, type SoundCue } from './sound-events.ts';
import {
  audioBackend,
  configureNative,
  playNative,
  stopNative,
  resumeNative,
} from './native-audio.ts';
export { nativeAudioStatus } from './native-audio.ts';
const VOLUME = 0.55;
let effectsOn = true;
let musicOn = true;
let effectsVolume = VOLUME;
let musicVolume = 0.3;
let preferencesRead = false;
let musicTrack = '';
let music: HTMLAudioElement | undefined;
const suspensions = new Set<string>();
function readPreferences() {
  if (preferencesRead) return;
  preferencesRead = true;
  try {
    const value = JSON.parse(localStorage.getItem('sopa-audio-v1') ?? '{}');
    effectsOn = value.effectsOn !== false;
    musicOn = value.musicOn !== false;
    effectsVolume = volume(value.effectsVolume, VOLUME);
    musicVolume = volume(value.musicVolume, 0.3);
  } catch {
    /* Use defaults if storage is unavailable or corrupt. */
  }
}
function volume(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}
export function audioPreferences() {
  readPreferences();
  return { effectsOn, musicOn, effectsVolume, musicVolume };
}
export function setAudioPreferences(
  value: Partial<ReturnType<typeof audioPreferences>>,
) {
  readPreferences();
  if (typeof value.effectsOn === 'boolean') effectsOn = value.effectsOn;
  if (typeof value.musicOn === 'boolean') musicOn = value.musicOn;
  effectsVolume = volume(value.effectsVolume, effectsVolume);
  musicVolume = volume(value.musicVolume, musicVolume);
  try {
    localStorage.setItem('sopa-audio-v1', JSON.stringify(audioPreferences()));
  } catch {
    /* Session preference. */
  }
  if (!effectsOn || effectsVolume === 0) stopAudio();
  if (output) output.gain.value = effectsVolume;
  if (activeMedia) activeMedia.volume = effectsVolume;
  void syncAudio();
}
function suspended() {
  return document.hidden || suspensions.size > 0;
}
function effectsAllowed() {
  readPreferences();
  return soundEnabled() && effectsOn && effectsVolume > 0 && !suspended();
}
async function syncAudio(strict = false) {
  readPreferences();
  if (audioBackend() === 'native') {
    await configureNative(
      {
        enabled: soundEnabled(),
        effectsEnabled: effectsOn,
        musicEnabled: musicOn,
        effectsVolume,
        musicVolume,
        suspended: suspended(),
        track: musicTrack,
      },
      strict,
    );
  } else if (audioBackend() === 'web') {
    if (!musicTrack) {
      music?.pause();
      music = undefined;
      return;
    }
    if (!music) {
      music = new Audio(musicTrack);
      music.loop = true;
    }
    music.volume = musicVolume;
    if (!soundEnabled() || !musicOn || musicVolume === 0 || suspended())
      music.pause();
    else if (music.paused)
      try {
        await music.play();
      } catch {
        /* Retry on gesture. */
      }
  }
}
/** No default song. Call only with a user-approved, bundled /audio/music file. */
export async function setMusicTrack(path: string | null) {
  const next = path ?? '';
  if (next && !/^\/audio\/music\/[A-Za-z0-9_-]+\.(mp3|m4a|wav)$/.test(next))
    throw Error('Music must be a bundled /audio/music file');
  if (next !== musicTrack) {
    music?.pause();
    music = undefined;
    musicTrack = next;
  }
  await syncAudio();
}
/** Idempotent named gates; await suspension before showing an ad. */
export async function setAudioSuspended(reason: string, value: boolean) {
  if (value) {
    suspensions.add(reason);
    stopAudio();
  } else suspensions.delete(reason);
  await syncAudio(true);
}
let enabled: boolean | undefined;
let context: AudioContext | undefined;
let output: GainNode | undefined;
let activeSource: AudioBufferSourceNode | undefined;
let activeMedia: HTMLAudioElement | undefined;
let ticket = 0;
const bytes = new Map<SoundCue, Promise<ArrayBuffer>>();
const buffers = new Map<SoundCue, Promise<AudioBuffer>>();
const media = new Map<SoundCue, HTMLAudioElement>();
export function soundEnabled() {
  if (enabled !== undefined) return enabled;
  try {
    enabled = localStorage.getItem('sopa-sound') !== 'off';
  } catch {
    enabled = true;
  }
  return enabled;
}
export function stopAudio() {
  ticket++;
  if (audioBackend() === 'native') void stopNative();
  if (activeSource) {
    try {
      activeSource.stop();
    } catch {
      /* It may already have ended. */
    }
    activeSource.disconnect();
    activeSource = undefined;
  }
  if (activeMedia) {
    activeMedia.pause();
    activeMedia.currentTime = 0;
    activeMedia = undefined;
  }
}
export function setSoundEnabled(value: boolean) {
  enabled = value;
  if (!value) stopAudio();
  try {
    localStorage.setItem('sopa-sound', value ? 'on' : 'off');
  } catch {
    /* Keep session preference. */
  }
  void syncAudio();
}
function loadBytes(cue: SoundCue) {
  if (!bytes.has(cue))
    bytes.set(
      cue,
      fetch(SOUND_FILES[cue])
        .then((response) => {
          if (!response.ok) throw Error('Audio unavailable');
          return response.arrayBuffer();
        })
        .catch((error) => {
          bytes.delete(cue);
          throw error;
        }),
    );
  return bytes.get(cue)!;
}
function loadBuffer(cue: SoundCue) {
  if (!buffers.has(cue))
    buffers.set(
      cue,
      loadBytes(cue)
        .then((data) => context!.decodeAudioData(data.slice(0)))
        .catch((error) => {
          buffers.delete(cue);
          throw error;
        }),
    );
  return buffers.get(cue)!;
}
function hasWebAudio() {
  return (
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}
export function prepareAudio() {
  readPreferences();
  if (audioBackend() !== 'web') {
    void syncAudio();
    return;
  }
  for (const cue of Object.keys(SOUND_FILES) as SoundCue[]) {
    if (hasWebAudio()) void loadBytes(cue).catch(() => {});
    else if (!media.has(cue)) {
      const element = new Audio(SOUND_FILES[cue]);
      element.preload = 'auto';
      media.set(cue, element);
      element.load();
    }
  }
}
export async function unlockAudio() {
  if (!soundEnabled() || suspended()) return;
  if (audioBackend() !== 'web') {
    if (audioBackend() === 'native') await resumeNative();
    return;
  }
  void syncAudio();
  if (!effectsAllowed()) return;
  try {
    const Audio = hasWebAudio();
    if (!Audio) return;
    if (!context) {
      context = new Audio();
      output = context.createGain();
      output.gain.value = effectsVolume;
      output.connect(context.destination);
      for (const cue of Object.keys(SOUND_FILES) as SoundCue[])
        void loadBuffer(cue).catch(() => {});
    }
    if (context.state !== 'running') await context.resume();
  } catch {
    /* Sound never blocks an interaction. */
  }
}
export async function playSound(cue: SoundCue) {
  if (!effectsAllowed()) return;
  if (audioBackend() !== 'web') {
    if (audioBackend() === 'native') await playNative(cue);
    return;
  }
  stopAudio();
  const request = ticket;
  const started = performance.now();
  try {
    if (!hasWebAudio()) {
      prepareAudio();
      const element = media.get(cue)!;
      element.volume = effectsVolume;
      element.currentTime = 0;
      activeMedia = element;
      // Direct play in the gesture stack for browsers without Web Audio.
      await element.play();
      if (request === ticket && !effectsAllowed()) element.pause();
      return;
    }
    await unlockAudio();
    if (!context || !output || context.state !== 'running') return;
    const buffer = await loadBuffer(cue);
    if (
      request !== ticket ||
      !effectsAllowed() ||
      performance.now() - started > 400
    )
      return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(output);
    source.onended = () => {
      source.disconnect();
      if (activeSource === source) activeSource = undefined;
    };
    activeSource = source;
    source.start();
  } catch {
    /* Missing assets or blocked playback must not interrupt the game. */
  }
}
/** One shared UI click, with explicit page/silent exceptions and no board clicks. */
export function installInterfaceAudio() {
  suspensions.delete('page');
  prepareAudio();
  const unlock = () => {
    void unlockAudio();
  };
  const click = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest('button, summary');
    if (
      !control ||
      !control.closest('.studio-menu, .game-shell, .game-dialog') ||
      control.matches(':disabled, [aria-disabled="true"]')
    )
      return;
    const cue = control.closest('[data-sound]')?.getAttribute('data-sound');
    if (
      cue === 'none' ||
      (!cue && control.closest('.cube-stage, .die-face-picker'))
    )
      return;
    void playSound(cue === 'page' ? 'page' : 'ui');
  };
  const change = (event: Event) => {
    if (
      event.target instanceof HTMLSelectElement &&
      event.target.closest('.studio-menu, .game-shell') &&
      !event.target.disabled
    )
      void playSound('ui');
  };
  const key = (event: KeyboardEvent) => {
    if (
      event.repeat &&
      ['Enter', ' '].includes(event.key) &&
      event.target instanceof Element &&
      event.target.closest('button')
    )
      event.preventDefault();
    else unlock();
  };
  const hide = () => {
    void setAudioSuspended('page', document.hidden).catch(() => {});
  };
  const pagehide = () => {
    void setAudioSuspended('page', true).catch(() => {});
  };
  const pageshow = () => {
    void setAudioSuspended('page', document.hidden).catch(() => {});
  };
  const storage = (event: StorageEvent) => {
    if (event.key === 'sopa-sound' || event.key === null) {
      enabled = undefined;
      if (!soundEnabled()) stopAudio();
    }
    if (event.key === 'sopa-audio-v1' || event.key === null)
      preferencesRead = false;
    readPreferences();
    if (!effectsAllowed()) stopAudio();
    if (output) output.gain.value = effectsVolume;
    if (activeMedia) activeMedia.volume = effectsVolume;
    void syncAudio();
  };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', key, true);
  document.addEventListener('click', click, true);
  document.addEventListener('change', change, true);
  document.addEventListener('visibilitychange', hide);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', pageshow);
  window.addEventListener('storage', storage);
  return () => {
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', key, true);
    document.removeEventListener('click', click, true);
    document.removeEventListener('change', change, true);
    document.removeEventListener('visibilitychange', hide);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', pageshow);
    window.removeEventListener('storage', storage);
    void setAudioSuspended('page', true).catch(() => {});
  };
}
