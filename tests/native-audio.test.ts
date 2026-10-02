import { test } from 'node:test';
import assert from 'node:assert/strict';

void test('native routing, persisted controls, nested ad gates, stale cues and failures', async () => {
  const calls: { method: string; options: Record<string, unknown> }[] = [];
  const saved = new Map([
    ['sopa-sound', 'off'],
    ['sopa-audio-v1', JSON.stringify({ musicOn: false, effectsVolume: 0.42 })],
  ]);
  let failed = false;
  const methods = [
    'configure',
    'playEffect',
    'stopEffects',
    'resume',
    'status',
  ];
  const cap = {
    PluginHeaders: [
      {
        name: 'SopaAudio',
        methods: methods.map((name) => ({ name, rtype: 'promise' })),
      },
    ],
    nativePromise: async (
      _plugin: string,
      method: string,
      options: Record<string, unknown>,
    ) => {
      calls.push({ method, options });
      if (failed) throw Error('Native fixture failure');
      return {};
    },
  };
  const win = {
    Capacitor: cap,
    webkit: { messageHandlers: { bridge: {} } },
    AudioContext: class {
      constructor() {
        throw Error('Native must never create Web Audio');
      }
    },
  };
  Object.assign(globalThis, {
    ...win,
    window: win,
    document: { hidden: false },
    Audio: class {
      constructor() {
        throw Error('Native must never create HTMLAudio');
      }
    },
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  });
  const audio = await import('../lib/audio.ts');
  const backend = await import('../lib/native-audio.ts');
  assert.equal(backend.audioBackend(), 'native');
  audio.prepareAudio();
  await audio.nativeAudioStatus();
  assert.equal(calls[0].method, 'configure');
  assert.equal(calls[0].options.enabled, false);
  assert.equal(calls[0].options.musicEnabled, false);
  assert.equal(calls[0].options.effectsVolume, 0.42);
  assert.equal(calls[0].options.track, '');
  await audio.playSound('letter');
  assert.equal(calls.filter((c) => c.method === 'playEffect').length, 0);
  audio.setSoundEnabled(true);
  await audio.playSound('letter');
  assert.equal(calls.filter((c) => c.method === 'playEffect').length, 1);
  await audio.setAudioSuspended('ad:1', true);
  await audio.setAudioSuspended('pause', true);
  await audio.setAudioSuspended('ad:1', false);
  await audio.setAudioSuspended('ad:1', false); // duplicate close must not clear pause
  await audio.playSound('win');
  assert.equal(calls.filter((c) => c.method === 'playEffect').length, 1);
  assert.equal(
    calls.filter((c) => c.method === 'configure').at(-1)?.options.suspended,
    true,
  );
  await audio.setMusicTrack('/audio/music/approved-fixture.mp3');
  assert.equal(
    calls.filter((c) => c.method === 'configure').at(-1)?.options.track,
    '/audio/music/approved-fixture.mp3',
  );
  await assert.rejects(audio.setMusicTrack('/audio/music/../../secret.wav'));
  await audio.setAudioSuspended('pause', false);
  const stale = audio.playSound('ui');
  audio.setSoundEnabled(false);
  await stale;
  await audio.nativeAudioStatus();
  assert.equal(
    calls.filter((c) => c.method === 'playEffect').length,
    1,
    'queued cue canceled by mute',
  );
  audio.setSoundEnabled(true);
  audio.setAudioPreferences({ effectsVolume: 0, musicOn: true });
  await audio.playSound('win');
  await audio.nativeAudioStatus();
  assert.equal(calls.filter((c) => c.method === 'playEffect').length, 1);
  audio.setAudioPreferences({ effectsVolume: 0.55 });
  failed = true;
  await audio.playSound('word'); // fail silent; never instantiate browser audio
  await assert.rejects(
    audio.setAudioSuspended('failed-ad', true),
    /Native fixture failure/,
  );
  failed = false;
  await audio.setAudioSuspended('failed-ad', false);
  assert.match(
    (await audio.nativeAudioStatus()).lastError,
    /Native fixture failure/,
  );
  const before = calls.length;
  const { Capacitor } = await import('@capacitor/core');
  Capacitor.isPluginAvailable = () => false;
  audio.prepareAudio();
  await audio.playSound('letter');
  await audio.unlockAudio();
  assert.equal(backend.audioBackend(), 'unavailable');
  assert.equal(
    calls.length,
    before,
    'missing native plugin cannot fall back to web',
  );
});
