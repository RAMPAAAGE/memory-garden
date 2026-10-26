import { music } from './config';

type Track = { el: HTMLAudioElement; base: number; ok: boolean; volume: number; gain: GainNode | null };

// On iPhone/iPad an <audio> element's volume is read-only, so fades go through Web Audio gain nodes there.
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function makeTrack(src: string, base: number): Track {
  const el = new Audio(src);
  el.preload = 'auto';
  el.volume = 0;
  const track: Track = { el, base, ok: true, volume: 0, gain: null };
  el.addEventListener('error', () => { track.ok = false; });
  return track;
}

function setVolume(track: Track, v: number): void {
  track.volume = v;
  if (track.gain) track.gain.gain.value = v;
  else track.el.volume = v;
}

/** Two looping tracks with crossfades and ducking (for videos with sound). */
export class Music {
  private main = makeTrack(music.main.src, music.main.volume);
  private finale = makeTrack(music.finale.src, music.finale.volume);
  private active: Track | null = null;
  private duck = 1;
  private fades = new Map<Track, number>();
  private unlocked = false;
  private ctx: AudioContext | null = null;

  constructor() {
    this.main.el.loop = true;
    this.finale.el.addEventListener('timeupdate', () => {
      const { start, end } = music.finale;
      if (end > 0 && this.finale.el.currentTime >= end) this.finale.el.currentTime = start;
    });
    this.finale.el.addEventListener('ended', () => {
      this.finale.el.currentTime = music.finale.start;
      void this.finale.el.play().catch(() => {});
    });
    // Browsers (iPad) only allow audio after a tap; Electron allows it right away.
    const unlock = () => {
      if (isIOS && !this.ctx) {
        this.ctx = new AudioContext();
        for (const track of [this.main, this.finale]) {
          const gain = this.ctx.createGain();
          gain.gain.value = track.volume;
          this.ctx.createMediaElementSource(track.el).connect(gain).connect(this.ctx.destination);
          track.el.volume = 1;
          track.gain = gain;
        }
      }
      void this.ctx?.resume();
      if (this.unlocked) return;
      this.unlocked = true;
      if (this.active && this.active.el.paused) void this.active.el.play().catch(() => {});
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  playMain(fromStart = false): void { this.switchTo(this.main, fromStart ? 0 : null); }
  playFinale(): void { this.switchTo(this.finale, music.finale.start); }

  setDuck(value: number): void {
    this.duck = value;
    if (this.active) this.fade(this.active, this.active.base * this.duck, 600);
  }

  private switchTo(next: Track, seek: number | null): void {
    if (this.active === next) {
      if (seek !== null) next.el.currentTime = seek;
      return;
    }
    const prev = this.active;
    this.active = next;
    // overlapping crossfade so one song melts into the other
    if (prev) this.fade(prev, 0, 1600, () => prev.el.pause());
    if (!next.ok) return;
    if (seek !== null) next.el.currentTime = seek;
    void next.el.play().catch(() => {});
    this.fade(next, next.base * this.duck, 1900);
  }

  private fade(track: Track, to: number, ms: number, done?: () => void): void {
    cancelAnimationFrame(this.fades.get(track) ?? 0);
    const from = track.volume;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setVolume(track, from + (to - from) * t * t * (3 - 2 * t));
      if (t < 1) this.fades.set(track, requestAnimationFrame(step));
      else done?.();
    };
    this.fades.set(track, requestAnimationFrame(step));
  }
}
