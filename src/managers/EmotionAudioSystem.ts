import Phaser from 'phaser';
import {
  EmotionState,
  LayerType,
  LayerConfig,
  EmotionAudioConfig,
  EMOTION_AUDIO_CONFIGS,
  EmotionMetrics,
  ActiveLayer,
  CrossFadeTask
} from '../types';

class EmotionStateTracker {
  private currentState: EmotionState = EmotionState.COLLECTING;
  private collectTimestamps: number[] = [];
  private synthesisTimestamps: number[] = [];
  private readonly COLLECT_WINDOW_MS = 10000;
  private readonly SYNTHESIS_WINDOW_MS = 15000;
  private readonly SYNTHESIS_THRESHOLD = 3;
  private readonly COLLECT_RATE_SYNTH_THRESHOLD = 0.6;
  private readonly NEAR_AWAKENING_THRESHOLD = 75;
  private readonly MIN_STATE_DURATION_MS = 4000;
  private lastStateChangeTime: number = 0;

  getCurrentState(): EmotionState {
    return this.currentState;
  }

  recordCollect(): void {
    const now = Date.now();
    this.collectTimestamps.push(now);
    this.pruneOldTimestamps();
    this.reevaluateState();
  }

  recordSynthesis(): void {
    const now = Date.now();
    this.synthesisTimestamps.push(now);
    this.pruneOldTimestamps();
    this.reevaluateState();
  }

  updateAwakeProgress(progress: number): void {
    if (progress >= this.NEAR_AWAKENING_THRESHOLD) {
      this.tryTransitionTo(EmotionState.NEAR_AWAKENING);
    }
  }

  private pruneOldTimestamps(): void {
    const now = Date.now();
    this.collectTimestamps = this.collectTimestamps.filter(
      t => now - t <= this.COLLECT_WINDOW_MS
    );
    this.synthesisTimestamps = this.synthesisTimestamps.filter(
      t => now - t <= this.SYNTHESIS_WINDOW_MS
    );
  }

  private reevaluateState(): void {
    this.pruneOldTimestamps();
    const now = Date.now();

    const synthesisCount = this.synthesisTimestamps.length;
    const collectCount = this.collectTimestamps.length;
    const totalActivity = synthesisCount + collectCount;
    const synthesisRatio = totalActivity > 0 ? synthesisCount / totalActivity : 0;

    if (synthesisCount >= this.SYNTHESIS_THRESHOLD || synthesisRatio >= this.COLLECT_RATE_SYNTH_THRESHOLD) {
      this.tryTransitionTo(EmotionState.SYNTHESIZING);
    } else if (this.currentState !== EmotionState.NEAR_AWAKENING) {
      this.tryTransitionTo(EmotionState.COLLECTING);
    }

    this.lastStateChangeTime;
  }

  private tryTransitionTo(newState: EmotionState): void {
    const now = Date.now();
    if (newState === this.currentState) return;
    if (now - this.lastStateChangeTime < this.MIN_STATE_DURATION_MS) return;

    if (newState === EmotionState.NEAR_AWAKENING) {
      this.currentState = newState;
      this.lastStateChangeTime = now;
    } else if (this.currentState !== EmotionState.NEAR_AWAKENING) {
      this.currentState = newState;
      this.lastStateChangeTime = now;
    }
  }

  getMetrics(awakeProgress: number, elapsedSeconds: number): EmotionMetrics {
    this.pruneOldTimestamps();
    return {
      awakeProgress,
      recentCollectCount: this.collectTimestamps.length,
      recentSynthesisCount: this.synthesisTimestamps.length,
      synthesisRate: elapsedSeconds > 0 ? this.synthesisTimestamps.length / Math.max(1, elapsedSeconds / 60) : 0,
      collectRate: elapsedSeconds > 0 ? this.collectTimestamps.length / Math.max(1, elapsedSeconds / 60) : 0,
      elapsedSeconds
    };
  }
}

class CrossFadeManager {
  private audioContext: AudioContext;
  private tasks: CrossFadeTask[] = [];
  private rafId: number | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  fade(
    layer: ActiveLayer,
    toVolume: number,
    durationMs: number,
    onComplete?: () => void
  ): void {
    const fromVolume = layer.currentVolume;
    const now = this.audioContext.currentTime;
    const duration = durationMs / 1000;

    layer.gainNode.gain.cancelScheduledValues(now);
    layer.gainNode.gain.setValueAtTime(fromVolume, now);
    layer.gainNode.gain.linearRampToValueAtTime(Math.max(0, toVolume), now + duration);

    const task: CrossFadeTask = {
      layer,
      fromVolume,
      toVolume,
      startTime: now,
      duration,
      onComplete
    };
    this.tasks.push(task);
    layer.targetVolume = toVolume;

    this.startLoop();
  }

  private startLoop(): void {
    if (this.rafId !== null) return;

    const tick = () => {
      const now = this.audioContext.currentTime;
      const completed: number[] = [];

      this.tasks.forEach((task, i) => {
        const elapsed = now - task.startTime;
        if (elapsed >= task.duration) {
          task.layer.currentVolume = task.toVolume;
          completed.push(i);
          if (task.onComplete) task.onComplete();
        }
      });

      for (let i = completed.length - 1; i >= 0; i--) {
        this.tasks.splice(completed[i], 1);
      }

      if (this.tasks.length === 0) {
        this.rafId = null;
      } else {
        this.rafId = requestAnimationFrame(tick);
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }

  stopAll(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.tasks = [];
  }

  destroy(): void {
    this.stopAll();
  }
}

class AmbientLayer {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private state: EmotionState;
  private active: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;
  private layer: ActiveLayer | null = null;
  private readonly NOISE_DURATION = 2;

  constructor(audioContext: AudioContext, masterGain: GainNode, initialState: EmotionState) {
    this.audioContext = audioContext;
    this.masterGain = masterGain;
    this.state = initialState;
    this.generateNoiseBuffer();
  }

  private generateNoiseBuffer(): void {
    const length = this.audioContext.sampleRate * this.NOISE_DURATION;
    this.noiseBuffer = this.audioContext.createBuffer(1, length, this.audioContext.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
  }

  start(baseVolume: number): void {
    if (this.active) return;
    this.active = true;
    this.buildLayer(baseVolume);
  }

  stop(durationMs: number, crossFade: CrossFadeManager, onComplete?: () => void): void {
    if (!this.active || !this.layer) {
      this.active = false;
      if (onComplete) onComplete();
      return;
    }
    crossFade.fade(this.layer, 0, durationMs, () => {
      this.disposeLayer();
      this.active = false;
      if (onComplete) onComplete();
    });
  }

  getLayer(): ActiveLayer | null {
    return this.layer;
  }

  isActive(): boolean {
    return this.active;
  }

  changeState(newState: EmotionState, baseVolume: number, crossFade: CrossFadeManager): void {
    const oldState = this.state;
    this.state = newState;

    if (!this.active) return;

    const oldLayer = this.layer;
    this.buildLayer(0);

    const config = EMOTION_AUDIO_CONFIGS[newState].ambient;
    const fadeDur = Math.min(config.fadeDuration, EMOTION_AUDIO_CONFIGS[oldState].ambient.fadeDuration);

    if (this.layer) {
      crossFade.fade(this.layer, baseVolume * config.baseVolume, fadeDur);
    }
    if (oldLayer) {
      crossFade.fade(oldLayer, 0, fadeDur, () => {
        this.disposeSpecificLayer(oldLayer);
      });
    }
  }

  private buildLayer(startVolume: number): void {
    if (!this.noiseBuffer) return;

    const config = EMOTION_AUDIO_CONFIGS[this.state].ambient;
    const now = this.audioContext.currentTime;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(Math.max(0, startVolume), now);
    gainNode.connect(this.masterGain);

    const oscillators: OscillatorNode[] = [];
    const lfos: OscillatorNode[] = [];
    const lfoGains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const noiseSources: AudioBufferSourceNode[] = [];
    const noiseGains: GainNode[] = [];

    const oscTypes = config.oscillatorTypes ?? ['sine'];
    const freqRange = config.frequencyRange ?? [100, 300];

    const droneCount = 3;
    for (let i = 0; i < droneCount; i++) {
      const osc = this.audioContext.createOscillator();
      osc.type = oscTypes[i % oscTypes.length];
      const baseFreq = freqRange[0] + ((freqRange[1] - freqRange[0]) * i / droneCount);
      osc.frequency.setValueAtTime(baseFreq, now);

      const oscGain = this.audioContext.createGain();
      oscGain.gain.setValueAtTime(0.3 / droneCount, now);

      if (config.lfoRate && config.lfoDepth) {
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(config.lfoRate * (0.8 + i * 0.2), now);
        lfoGain.gain.setValueAtTime(config.lfoDepth, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfos.push(lfo);
        lfoGains.push(lfoGain);
      }

      osc.connect(oscGain);
      oscGain.connect(gainNode);
      oscillators.push(osc);
    }

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(config.filterFrequency ?? 800, now);
    filter.Q.setValueAtTime(config.filterQ ?? 1, now);

    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);

    noiseSource.connect(noiseGain);
    noiseGain.connect(filter);
    filter.connect(gainNode);
    filters.push(filter);
    noiseSources.push(noiseSource);
    noiseGains.push(noiseGain);

    oscillators.forEach(o => o.start(now));
    lfos.forEach(l => l.start(now));
    noiseSources.forEach(n => n.start(now));

    this.layer = {
      state: this.state,
      type: 'ambient',
      gainNode,
      oscillators,
      lfos,
      lfoGains,
      filters,
      noiseSources,
      noiseGains,
      currentVolume: Math.max(0, startVolume),
      targetVolume: Math.max(0, startVolume)
    };
  }

  private disposeSpecificLayer(layer: ActiveLayer): void {
    const now = this.audioContext.currentTime;
    try {
      layer.oscillators.forEach(o => {
        try { o.stop(now + 0.05); } catch {}
        try { o.disconnect(); } catch {}
      });
      layer.lfos.forEach(l => {
        try { l.stop(now + 0.05); } catch {}
        try { l.disconnect(); } catch {}
      });
      layer.lfoGains.forEach(g => { try { g.disconnect(); } catch {} });
      layer.filters?.forEach(f => { try { f.disconnect(); } catch {} });
      layer.noiseSources?.forEach(n => {
        try { n.stop(now + 0.05); } catch {}
        try { n.disconnect(); } catch {}
      });
      layer.noiseGains?.forEach(g => { try { g.disconnect(); } catch {} });
      try { layer.gainNode.disconnect(); } catch {}
    } catch (e) {}
  }

  private disposeLayer(): void {
    if (this.layer) {
      this.disposeSpecificLayer(this.layer);
      this.layer = null;
    }
  }

  destroy(): void {
    this.disposeLayer();
    this.noiseBuffer = null;
  }
}

class BGMLayer {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private state: EmotionState;
  private active: boolean = false;
  private layer: ActiveLayer | null = null;
  private melodyTimer: number | null = null;
  private melodyIndex: number = 0;
  private chordTimer: number | null = null;
  private chordIndex: number = 0;

  private readonly SCALES: Record<EmotionState, number[]> = {
    [EmotionState.COLLECTING]: [0, 2, 4, 7, 9],
    [EmotionState.SYNTHESIZING]: [0, 2, 3, 5, 7, 9, 10],
    [EmotionState.NEAR_AWAKENING]: [0, 1, 3, 5, 7, 8, 11]
  };

  private readonly CHORD_PROGRESSIONS: Record<EmotionState, number[][]> = {
    [EmotionState.COLLECTING]: [[0, 4, 7], [5, 9, 0], [3, 7, 10], [7, 11, 2]],
    [EmotionState.SYNTHESIZING]: [[0, 4, 7, 10], [5, 8, 0], [2, 5, 9], [7, 10, 2, 5]],
    [EmotionState.NEAR_AWAKENING]: [[0, 4, 7, 11], [1, 5, 8], [3, 7, 10, 2], [8, 11, 3, 6]]
  };

  private readonly TEMPOS: Record<EmotionState, number> = {
    [EmotionState.COLLECTING]: 520,
    [EmotionState.SYNTHESIZING]: 380,
    [EmotionState.NEAR_AWAKENING]: 290
  };

  private readonly BASE_NOTES: Record<EmotionState, number> = {
    [EmotionState.COLLECTING]: 261.63,
    [EmotionState.SYNTHESIZING]: 329.63,
    [EmotionState.NEAR_AWAKENING]: 392.00
  };

  constructor(audioContext: AudioContext, masterGain: GainNode, initialState: EmotionState) {
    this.audioContext = audioContext;
    this.masterGain = masterGain;
    this.state = initialState;
  }

  start(baseVolume: number): void {
    if (this.active) return;
    this.active = true;
    this.buildLayer(baseVolume);
    this.startMelodyLoop(baseVolume);
    this.startChordLoop(baseVolume);
  }

  stop(durationMs: number, crossFade: CrossFadeManager, onComplete?: () => void): void {
    if (!this.active || !this.layer) {
      this.active = false;
      this.stopLoops();
      if (onComplete) onComplete();
      return;
    }
    crossFade.fade(this.layer, 0, durationMs, () => {
      this.stopLoops();
      this.disposeLayer();
      this.active = false;
      if (onComplete) onComplete();
    });
  }

  getLayer(): ActiveLayer | null {
    return this.layer;
  }

  isActive(): boolean {
    return this.active;
  }

  changeState(newState: EmotionState, baseVolume: number, crossFade: CrossFadeManager): void {
    const oldState = this.state;
    this.state = newState;

    if (!this.active) return;

    this.stopLoops();
    const oldLayer = this.layer;
    this.buildLayer(0);
    this.startMelodyLoop(0);
    this.startChordLoop(0);

    const config = EMOTION_AUDIO_CONFIGS[newState].bgm;
    const fadeDur = Math.min(config.fadeDuration, EMOTION_AUDIO_CONFIGS[oldState].bgm.fadeDuration);

    if (this.layer) {
      crossFade.fade(this.layer, baseVolume * config.baseVolume, fadeDur);
    }
    if (oldLayer) {
      crossFade.fade(oldLayer, 0, fadeDur, () => {
        this.disposeSpecificLayer(oldLayer);
      });
    }
  }

  private buildLayer(startVolume: number): void {
    const now = this.audioContext.currentTime;
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(Math.max(0, startVolume), now);
    gainNode.connect(this.masterGain);

    this.layer = {
      state: this.state,
      type: 'bgm',
      gainNode,
      oscillators: [],
      lfos: [],
      lfoGains: [],
      currentVolume: Math.max(0, startVolume),
      targetVolume: Math.max(0, startVolume)
    };
  }

  private startMelodyLoop(baseVolume: number): void {
    if (!this.active || !this.layer) return;
    const tempo = this.TEMPOS[this.state];
    const scale = this.SCALES[this.state];
    const baseNote = this.BASE_NOTES[this.state];
    this.melodyIndex = 0;

    const tick = () => {
      if (!this.active || !this.layer) return;

      const scaleIdx = scale[Math.floor(Math.random() * scale.length)];
      const octave = Math.random() > 0.6 ? 2 : 1;
      const noteFreq = baseNote * Math.pow(2, (scaleIdx + 12 * (octave - 1)) / 12);

      const config = EMOTION_AUDIO_CONFIGS[this.state].bgm;
      const oscTypes = config.oscillatorTypes ?? ['sine'];
      const oscType = oscTypes[this.melodyIndex % oscTypes.length];

      this.playNote(
        noteFreq,
        oscType,
        tempo * 0.45,
        config.baseVolume * baseVolume * 0.55
      );

      this.melodyIndex++;
      const jitter = 0.8 + Math.random() * 0.4;
      this.melodyTimer = window.setTimeout(tick, tempo * jitter);
    };

    this.melodyTimer = window.setTimeout(tick, tempo * 0.5);
  }

  private startChordLoop(baseVolume: number): void {
    if (!this.active || !this.layer) return;
    const tempo = this.TEMPOS[this.state] * 2;
    const progression = this.CHORD_PROGRESSIONS[this.state];
    const baseNote = this.BASE_NOTES[this.state] / 2;
    this.chordIndex = 0;

    const tick = () => {
      if (!this.active || !this.layer) return;
      const chord = progression[this.chordIndex % progression.length];
      const config = EMOTION_AUDIO_CONFIGS[this.state].bgm;
      const oscTypes = config.oscillatorTypes ?? ['sine'];
      const chordVolume = config.baseVolume * baseVolume * 0.35;

      chord.forEach((interval, i) => {
        const noteFreq = baseNote * Math.pow(2, interval / 12);
        setTimeout(() => {
          if (!this.active || !this.layer) return;
          this.playNote(
            noteFreq,
            oscTypes[i % oscTypes.length],
            tempo * 0.9,
            chordVolume / chord.length
          );
        }, i * 40);
      });

      this.chordIndex++;
      this.chordTimer = window.setTimeout(tick, tempo);
    };

    this.chordTimer = window.setTimeout(tick, 100);
  }

  private playNote(
    frequency: number,
    type: OscillatorType,
    durationMs: number,
    volume: number
  ): void {
    if (!this.layer || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const duration = durationMs / 1000;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);

    const noteGain = ctx.createGain();
    const attack = 0.02;
    const release = duration * 0.35;
    const sustain = Math.max(0.0001, volume * 0.6);

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(volume, now + attack);
    noteGain.gain.setValueAtTime(sustain, now + duration - release);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const config = EMOTION_AUDIO_CONFIGS[this.state].bgm;
    if (config.lfoRate && config.lfoDepth) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(config.lfoRate, now);
      lfoGain.gain.setValueAtTime(config.lfoDepth, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration + 0.05);
      this.layer.lfos.push(lfo);
      this.layer.lfoGains.push(lfoGain);
    }

    osc.connect(noteGain);
    noteGain.connect(this.layer.gainNode);
    osc.start(now);
    osc.stop(now + duration + 0.05);

    this.layer.oscillators.push(osc);

    if (this.layer.oscillators.length > 60) {
      this.layer.oscillators.splice(0, 30);
      if (this.layer.lfos.length > 30) {
        this.layer.lfos.splice(0, 15);
        this.layer.lfoGains.splice(0, 15);
      }
    }
  }

  private stopLoops(): void {
    if (this.melodyTimer !== null) {
      clearTimeout(this.melodyTimer);
      this.melodyTimer = null;
    }
    if (this.chordTimer !== null) {
      clearTimeout(this.chordTimer);
      this.chordTimer = null;
    }
  }

  private disposeSpecificLayer(layer: ActiveLayer): void {
    const now = this.audioContext.currentTime;
    try {
      layer.oscillators.forEach(o => {
        try { o.stop(now + 0.05); } catch {}
        try { o.disconnect(); } catch {}
      });
      layer.lfos.forEach(l => {
        try { l.stop(now + 0.05); } catch {}
        try { l.disconnect(); } catch {}
      });
      layer.lfoGains.forEach(g => { try { g.disconnect(); } catch {} });
      try { layer.gainNode.disconnect(); } catch {}
    } catch (e) {}
  }

  private disposeLayer(): void {
    if (this.layer) {
      this.disposeSpecificLayer(this.layer);
      this.layer = null;
    }
  }

  destroy(): void {
    this.stopLoops();
    this.disposeLayer();
  }
}

export class EmotionAudioSystem {
  private audioContext: AudioContext | null = null;
  private scene: Phaser.Scene | null = null;
  private masterGain: GainNode | null = null;
  private stateTracker: EmotionStateTracker;
  private crossFade: CrossFadeManager | null = null;
  private ambientLayer: AmbientLayer | null = null;
  private bgmLayer: BGMLayer | null = null;
  private currentEmotionState: EmotionState = EmotionState.COLLECTING;
  private initialized: boolean = false;
  private enabled: boolean = true;
  private globalVolume: number = 1;
  private updateTimer: number | null = null;
  private startTime: number = 0;

  constructor() {
    this.stateTracker = new EmotionStateTracker();
  }

  init(scene: Phaser.Scene, audioContext: AudioContext): void {
    if (this.initialized) return;
    this.scene = scene;
    this.audioContext = audioContext;
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.setValueAtTime(this.globalVolume, audioContext.currentTime);
    this.masterGain.connect(audioContext.destination);
    this.crossFade = new CrossFadeManager(audioContext);
    this.ambientLayer = new AmbientLayer(audioContext, this.masterGain, this.currentEmotionState);
    this.bgmLayer = new BGMLayer(audioContext, this.masterGain, this.currentEmotionState);
    this.startTime = Date.now();
    this.initialized = true;
    this.startAll();
    this.startUpdateLoop();
  }

  private startUpdateLoop(): void {
    this.updateTimer = window.setInterval(() => {
      if (!this.enabled || !this.audioContext) return;
      const newState = this.stateTracker.getCurrentState();
      if (newState !== this.currentEmotionState) {
        this.transitionToState(newState);
      }
    }, 2000);
  }

  private startAll(): void {
    if (!this.enabled) return;
    const config = EMOTION_AUDIO_CONFIGS[this.currentEmotionState];
    this.ambientLayer?.start(this.globalVolume);
    setTimeout(() => {
      this.bgmLayer?.start(this.globalVolume);
    }, 800);
  }

  private transitionToState(newState: EmotionState): void {
    if (newState === this.currentEmotionState) return;
    const oldState = this.currentEmotionState;
    this.currentEmotionState = newState;
    if (!this.enabled) return;

    const config = EMOTION_AUDIO_CONFIGS[newState];
    this.ambientLayer?.changeState(newState, this.globalVolume, this.crossFade!);
    setTimeout(() => {
      this.bgmLayer?.changeState(newState, this.globalVolume, this.crossFade!);
    }, 400);
  }

  recordCollect(): void {
    this.stateTracker.recordCollect();
  }

  recordSynthesis(): void {
    this.stateTracker.recordSynthesis();
  }

  updateAwakeProgress(progress: number): void {
    this.stateTracker.updateAwakeProgress(progress);
  }

  getCurrentState(): EmotionState {
    return this.currentEmotionState;
  }

  getStateDescription(): string {
    return EMOTION_AUDIO_CONFIGS[this.currentEmotionState].description;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!this.initialized) return;
    if (enabled) {
      this.masterGain?.gain.linearRampToValueAtTime(
        this.globalVolume,
        (this.audioContext?.currentTime ?? 0) + 0.5
      );
    } else {
      this.masterGain?.gain.linearRampToValueAtTime(
        0,
        (this.audioContext?.currentTime ?? 0) + 0.5
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.linearRampToValueAtTime(
        this.globalVolume,
        this.audioContext.currentTime + 0.3
      );
    }
  }

  getGlobalVolume(): number {
    return this.globalVolume;
  }

  forceState(state: EmotionState): void {
    if (state === this.currentEmotionState) return;
    this.currentEmotionState = state;
    if (!this.enabled || !this.initialized) return;
    const config = EMOTION_AUDIO_CONFIGS[state];
    this.ambientLayer?.changeState(state, this.globalVolume, this.crossFade!);
    setTimeout(() => {
      this.bgmLayer?.changeState(state, this.globalVolume, this.crossFade!);
    }, 400);
  }

  getMetrics(awakeProgress: number): {
    state: EmotionState;
    description: string;
    metrics: any;
  } {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return {
      state: this.currentEmotionState,
      description: EMOTION_AUDIO_CONFIGS[this.currentEmotionState].description,
      metrics: this.stateTracker.getMetrics(awakeProgress, elapsed)
    };
  }

  destroy(): void {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.crossFade?.stopAll();
    const dur = 1200;
    this.bgmLayer?.stop(dur, this.crossFade!, () => {
      this.bgmLayer?.destroy();
    });
    setTimeout(() => {
      this.ambientLayer?.stop(dur * 0.7, this.crossFade!, () => {
        this.ambientLayer?.destroy();
        setTimeout(() => {
          this.crossFade?.destroy();
          try { this.masterGain?.disconnect(); } catch {}
          this.masterGain = null;
          this.initialized = false;
        }, 300);
      });
    }, 400);
  }
}
