import { test } from 'node:test';
import assert from 'node:assert/strict';

void test('web music preserves its position across mute, volume, track reuse and ad gates', async () => {
  const elements: FakeAudio[] = [];
  const saved = new Map<string, string>();
  class FakeAudio {
    paused = true;
    loop = false;
    volume = 1;
    currentTime = 0;
    src: string;
    constructor(src: string) {
      this.src = src;
      elements.push(this);
    }
    async play() {
      this.paused = false;
    }
    pause() {
      this.paused = true;
    }
  }
  Object.assign(globalThis, {
    window: {},
    document: { hidden: false },
    Audio: FakeAudio,
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  });
  const audio = await import('../lib/audio.ts');
  assert.equal(elements.length, 0, 'no default music');
  await audio.setMusicTrack('/audio/music/approved-fixture.mp3');
  assert.equal(elements.length, 1);
  const music = elements[0];
  assert.equal(music.paused, false);
  assert.equal(music.loop, true);
  music.currentTime = 42;
  await audio.setMusicTrack('/audio/music/approved-fixture.mp3');
  assert.equal(elements.length, 1);
  assert.equal(music.currentTime, 42);
  audio.setAudioPreferences({ effectsOn: false });
  assert.equal(music.paused, false, 'effects mute is independent');
  audio.setAudioPreferences({ musicOn: false });
  assert.equal(music.paused, true);
  audio.setAudioPreferences({ musicOn: true, musicVolume: 0 });
  assert.equal(music.paused, true);
  audio.setAudioPreferences({ musicVolume: 0.2 });
  assert.equal(music.paused, false);
  assert.equal(music.volume, 0.2);
  assert.equal(music.currentTime, 42);
  await audio.setAudioSuspended('ad:old', true);
  await audio.setAudioSuspended('ad:new', true);
  await audio.setAudioSuspended('ad:old', false);
  assert.equal(music.paused, true);
  await audio.setAudioSuspended('ad:new', false);
  assert.equal(music.paused, false);
  audio.setSoundEnabled(false);
  assert.equal(music.paused, true);
  audio.setAudioPreferences({ musicOn: true });
  assert.equal(music.paused, true, 'master mute prevails');
  audio.setSoundEnabled(true);
  await audio.setMusicTrack(null);
  assert.equal(music.paused, true);
  await audio.setAudioSuspended('ad:old', false);
  assert.equal(
    elements.length,
    1,
    'cleared track cannot restart on ad callback',
  );
});
