import Phaser from 'phaser';

export class AudioManager {
  private static instance: AudioManager;
  private scene!: Phaser.Scene;
  private audioContext: AudioContext | null = null;
  private initialized: boolean = false;
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(scene?: Phaser.Scene): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    if (scene) {
      AudioManager.instance.setScene(scene);
    }
    return AudioManager.instance;
  }

  setScene(scene: Phaser.Scene): void {
    this.scene = scene;
    if (!this.initialized) {
      this.initialize();
    }
  }

  private initialize(): void {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        this.audioContext = new AC();
      }
    } catch (e) {
      console.warn('[AudioManager] Web Audio 不可用，将使用静音模式', e);
      this.enabled = false;
    }
    this.initialized = true;
  }

  private ensureContext(): boolean {
    if (!this.enabled || !this.audioContext) return false;
    if (this.audioContext.state === 'suspended') {
      try {
        this.audioContext.resume();
      } catch {}
    }
    return true;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.15,
    attack: number = 0.01,
    release: number = 0.08
  ): void {
    if (!this.ensureContext() || !this.audioContext) return;

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.setValueAtTime(volume, now + duration - release);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + release);
  }

  playCollect(): void {
    this.playTone(880, 0.08, 'sine', 0.12);
    setTimeout(() => this.playTone(1320, 0.1, 'sine', 0.1), 40);
  }

  playSynthesis(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.12, 'triangle', 0.13), i * 70);
    });
  }

  playClick(): void {
    this.playTone(660, 0.05, 'square', 0.08);
  }

  playVictory(): void {
    const notes = [
      { f: 523, d: 0.15 },
      { f: 659, d: 0.15 },
      { f: 784, d: 0.15 },
      { f: 1047, d: 0.25 },
      { f: 784, d: 0.15 },
      { f: 1047, d: 0.4 }
    ];
    let delay = 0;
    notes.forEach(({ f, d }) => {
      setTimeout(() => this.playTone(f, d, 'triangle', 0.15), delay);
      delay += d * 1000;
    });
  }

  playFail(): void {
    this.playTone(300, 0.12, 'sawtooth', 0.06);
    setTimeout(() => this.playTone(200, 0.15, 'sawtooth', 0.06), 80);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
