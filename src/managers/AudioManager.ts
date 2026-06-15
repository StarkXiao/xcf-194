import Phaser from 'phaser';
import { PetalTier, AudioCue, EmotionState } from '../types';
import { EmotionAudioSystem } from './EmotionAudioSystem';

export class AudioManager {
  private static instance: AudioManager;
  private scene!: Phaser.Scene;
  private audioContext: AudioContext | null = null;
  private initialized: boolean = false;
  private enabled: boolean = true;
  private activeTimeouts: NodeJS.Timeout[] = [];
  private sfxVolume: number = 0.15;
  private musicVolume: number = 0.1;

  private emotionSystem: EmotionAudioSystem;

  private constructor() {
    this.emotionSystem = new EmotionAudioSystem();
  }

  static getInstance(scene?: Phaser.Scene): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    if (scene) {
      AudioManager.instance.setScene(scene);
    }
    return AudioManager.instance;
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.emotionSystem.setGlobalVolume(this.musicVolume);
  }

  getMusicVolume(): number {
    return this.musicVolume;
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
        this.emotionSystem.init(this.scene, this.audioContext);
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

  protected playTone(
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
    this.emotionSystem.recordCollect();
  }

  playSynthesis(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.12, 'triangle', 0.13), i * 70);
    });
    this.emotionSystem.recordSynthesis();
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
    this.emotionSystem.setEnabled(enabled);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  playSynthesisTiered(tier: PetalTier): void {
    const baseFreq = 440 + (tier - 1) * 80;
    const notes = [
      baseFreq,
      baseFreq * 1.25,
      baseFreq * 1.5,
      baseFreq * 2
    ];
    const volume = Math.min(0.2, this.sfxVolume + tier * 0.015);

    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.1 + tier * 0.01, 'triangle', volume), i * (70 - tier * 5));
    });
    this.emotionSystem.recordSynthesis();
  }

  playSynthesisChain(chainIndex: number, totalChain: number, tier?: PetalTier): void {
    if (!this.ensureContext() || !this.audioContext) return;

    const baseFreq = 523 + (tier ? (tier - 1) * 60 : 0);
    const interval = Math.max(40, 80 - chainIndex * 5);
    const volume = Math.min(0.25, this.sfxVolume + chainIndex * 0.01);

    const chord = chainIndex === 0 ?
      [baseFreq, baseFreq * 1.25, baseFreq * 1.5] :
      [baseFreq * (1 + chainIndex * 0.1)];

    chord.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.08, 'sine', volume), i * 30);
    });

    if (chainIndex === totalChain - 1 && totalChain > 1) {
      setTimeout(() => this.playChainCompletion(totalChain), totalChain * 50);
    }

    if (chainIndex === 0) {
      this.emotionSystem.recordSynthesis();
    }
  }

  private playChainCompletion(totalChain: number): void {
    if (!this.ensureContext() || !this.audioContext) return;

    const arpeggio = [523, 659, 784, 1047, 1319];
    const volume = Math.min(0.25, this.sfxVolume + totalChain * 0.01);

    arpeggio.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.12, 'triangle', volume), i * 60);
    });

    setTimeout(() => {
      this.playTone(1047, 0.3, 'sine', volume * 0.8);
      this.playTone(1319, 0.3, 'sine', volume * 0.6);
    }, arpeggio.length * 60 + 100);
  }

  playSynthesisFail(): void {
    this.playTone(220, 0.1, 'sawtooth', this.sfxVolume * 0.5);
    setTimeout(() => this.playTone(180, 0.12, 'sawtooth', this.sfxVolume * 0.4), 60);
  }

  playAutoFeed(count: number): void {
    if (!this.ensureContext() || !this.audioContext) return;

    const baseFreq = 660;
    for (let i = 0; i < Math.min(count, 5); i++) {
      setTimeout(() => {
        this.playTone(baseFreq + i * 40, 0.06, 'sine', this.sfxVolume * 0.6);
      }, i * 50);
    }
  }

  playTierUp(fromTier: PetalTier, toTier: PetalTier): void {
    if (!this.ensureContext() || !this.audioContext) return;

    const freqStep = 80;
    const startFreq = 440 + (fromTier - 1) * freqStep;
    const endFreq = 440 + (toTier - 1) * freqStep;
    const steps = (toTier - fromTier) * 3;

    for (let i = 0; i <= steps; i++) {
      const freq = startFreq + (endFreq - startFreq) * (i / steps);
      setTimeout(() => {
        this.playTone(freq, 0.08, 'triangle', this.sfxVolume * 0.7);
      }, i * 40);
    }

    setTimeout(() => {
      this.playTone(endFreq, 0.15, 'sine', this.sfxVolume);
      this.playTone(endFreq * 1.25, 0.15, 'sine', this.sfxVolume * 0.8);
    }, steps * 40 + 50);
  }

  playCue(cue: AudioCue): void {
    switch (cue.type) {
      case 'collect':
        this.playCollect();
        break;
      case 'synthesis':
        if (cue.tier) {
          this.playSynthesisTiered(cue.tier);
        } else {
          this.playSynthesis();
        }
        break;
      case 'synthesis_chain':
        this.playSynthesisChain(
          cue.chainIndex ?? 0,
          cue.totalChain ?? 1,
          cue.tier
        );
        break;
      case 'synthesis_fail':
        this.playSynthesisFail();
        break;
      case 'click':
        this.playClick();
        break;
      case 'victory':
        this.playVictory();
        break;
      case 'auto_feed':
        this.playAutoFeed(cue.tier ?? 1);
        break;
    }
  }

  updateAwakeProgress(progress: number): void {
    this.emotionSystem.updateAwakeProgress(progress);
  }

  getEmotionState(): EmotionState {
    return this.emotionSystem.getCurrentState();
  }

  getEmotionStateDescription(): string {
    return this.emotionSystem.getStateDescription();
  }

  forceEmotionState(state: EmotionState): void {
    this.emotionSystem.forceState(state);
  }

  getEmotionMetrics(awakeProgress: number): {
    state: EmotionState;
    description: string;
    metrics: any;
  } {
    return this.emotionSystem.getMetrics(awakeProgress);
  }

  stopAll(): void {
    this.activeTimeouts.forEach(t => clearTimeout(t));
    this.activeTimeouts = [];
  }

  destroy(): void {
    this.stopAll();
    this.emotionSystem.destroy();
  }
}
