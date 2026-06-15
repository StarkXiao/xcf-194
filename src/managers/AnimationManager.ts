import Phaser from 'phaser';
import { PetalColor, PETAL_COLOR_MAP, AnimationTiming, DEFAULT_ANIMATION_TIMING, PetalTier, PETAL_TIER_NAMES } from '../types';

export class AnimationManager {
  private static instance: AnimationManager;
  private scene!: Phaser.Scene;
  private animationTiming: AnimationTiming = { ...DEFAULT_ANIMATION_TIMING };
  private activeChains: Map<string, { index: number; total: number }> = new Map();
  private isAnimating: boolean = false;

  private constructor() {}

  static getInstance(scene?: Phaser.Scene): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    if (scene) {
      AnimationManager.instance.scene = scene;
    }
    return AnimationManager.instance;
  }

  setAnimationTiming(timing: Partial<AnimationTiming>): void {
    this.animationTiming = { ...this.animationTiming, ...timing };
  }

  getAnimationTiming(): AnimationTiming {
    return { ...this.animationTiming };
  }

  calculateChainDelay(chainIndex: number, totalChain: number): number {
    const { synthesisDelay, chainSpeedMultiplier, minDelay, maxDelay } = this.animationTiming;
    const speedFactor = Math.pow(chainSpeedMultiplier, chainIndex);
    const delay = synthesisDelay * speedFactor;
    return Math.max(minDelay, Math.min(maxDelay, delay));
  }

  isPlaying(): boolean {
    return this.isAnimating;
  }

  playPetalFloat(target: Phaser.GameObjects.Container): void {
    const baseY = target.y;
    const phase = Math.random() * Math.PI * 2;

    this.scene.tweens.add({
      targets: target,
      y: {
        getStart: () => baseY,
        getEnd: () => baseY
      },
      props: {
        _floatOffset: { from: 0, to: 1 }
      },
      duration: 2500 + Math.random() * 1500,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const v = tween.getValue() ?? 0;
        target.y = baseY + Math.sin(v * Math.PI * 2 + phase) * 15;
        target.angle = Math.sin(v * Math.PI * 2 + phase * 1.5) * 8;
      }
    });
  }

  playCollectEffect(x: number, y: number, color: PetalColor, intensity: number = 1, isSprintCollect: boolean = false): void {
    const particleCount = Math.floor(10 * intensity);
    const glowColor = PETAL_COLOR_MAP[color] ?? 0xffffff;

    const burstScale = intensity;
    const durationMultiplier = 1 + (intensity - 1) * 0.3;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(glowColor, 1);
      const size = (3 + Math.random() * 5) * Math.sqrt(intensity);
      particle.fillCircle(0, 0, size);
      particle.x = x;
      particle.y = y;

      const angle = (i / particleCount) * Math.PI * 2 + (isSprintCollect ? Math.random() * 0.5 : 0);
      const dist = (40 + Math.random() * 60) * burstScale;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 30 * burstScale;

      this.scene.tweens.add({
        targets: particle,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        scale: 0,
        duration: (600 + Math.random() * 400) * durationMultiplier,
        ease: isSprintCollect ? 'Cubic.easeIn' : 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    if (intensity > 1.2) {
      const burstRings = this.scene.add.graphics();
      for (let r = 0; r < Math.min(3, Math.floor(intensity)); r++) {
        burstRings.lineStyle(3 - r, glowColor, 0.7 - r * 0.2);
        burstRings.strokeCircle(0, 0, 15 + r * 15);
      }
      burstRings.x = x;
      burstRings.y = y;
      burstRings.setScale(0);

      this.scene.tweens.add({
        targets: burstRings,
        scale: 2 * burstScale,
        alpha: 0,
        duration: 450 * durationMultiplier,
        ease: 'Cubic.easeOut',
        onComplete: () => burstRings.destroy()
      });
    }

    const textLabel = isSprintCollect ? '💨 冲刺!' : '+收集!';
    const fontSize = Math.floor(22 + (intensity - 1) * 6);
    const textColor = isSprintCollect ? '#fb923c' : '#fde68a';

    const text = this.scene.add.text(x, y - 40, textLabel, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: `${fontSize}px`,
      color: textColor,
      fontStyle: 'bold',
      stroke: isSprintCollect ? '#7c2d12' : 'transparent',
      strokeThickness: isSprintCollect ? 3 : 0
    }).setOrigin(0.5).setScale(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - (90 + (intensity - 1) * 20),
      alpha: 0,
      scale: 1 + (intensity - 1) * 0.3,
      duration: 700 * durationMultiplier,
      ease: isSprintCollect ? 'Back.easeIn' : 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });

    if (isSprintCollect) {
      this.scene.cameras.main.shake(60, 0.003);
    }
  }

  playAbsorbStartEffect(x: number, y: number, color: PetalColor): void {
    const glowColor = PETAL_COLOR_MAP[color] ?? 0xffffff;

    const spark = this.scene.add.graphics();
    spark.fillStyle(glowColor, 0.9);
    spark.fillCircle(0, 0, 2);
    spark.x = x;
    spark.y = y;

    this.scene.tweens.add({
      targets: spark,
      scale: 2.5,
      alpha: 0,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => spark.destroy()
    });

    const ripple = this.scene.add.graphics();
    ripple.lineStyle(2, glowColor, 0.5);
    ripple.strokeCircle(0, 0, 6);
    ripple.x = x;
    ripple.y = y;

    this.scene.tweens.add({
      targets: ripple,
      scale: 3,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => ripple.destroy()
    });
  }

  playSynthesisEffect(x: number, y: number, color: PetalColor): void {
    const glowColor = PETAL_COLOR_MAP[color] ?? 0xffffff;

    const rings = this.scene.add.graphics();
    rings.lineStyle(4, glowColor, 0.8);
    rings.strokeCircle(0, 0, 10);
    rings.x = x;
    rings.y = y;

    this.scene.tweens.add({
      targets: rings,
      scale: 5,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => rings.destroy()
    });

    const particleCount = 25;
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(glowColor, 1);
      const size = 2 + Math.random() * 6;
      particle.fillCircle(0, 0, size);
      particle.x = x;
      particle.y = y;

      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 80 + Math.random() * 120;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      this.scene.tweens.add({
        targets: particle,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        scale: 0,
        duration: 900 + Math.random() * 500,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    const sparkles = [0xfef08a, glowColor, 0xffffff];
    for (let i = 0; i < 15; i++) {
      const star = this.scene.add.graphics();
      star.fillStyle(sparkles[i % 3], 1);
      star.beginPath();
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
        const r = p % 2 === 0 ? 5 : 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (p === 0) star.moveTo(px, py);
        else star.lineTo(px, py);
      }
      star.closePath();
      star.fillPath();
      star.x = x + (Math.random() - 0.5) * 120;
      star.y = y + (Math.random() - 0.5) * 120;
      star.alpha = 0;
      star.setScale(0);

      this.scene.tweens.add({
        targets: star,
        alpha: 1,
        scale: 1,
        y: star.y - 60,
        duration: 300,
        delay: 100 + i * 20,
        ease: 'Back.easeOut',
        yoyo: true,
        hold: 200,
        onComplete: () => star.destroy()
      });
    }

    const successText = this.scene.add.text(x, y, '✦ 合成成功 ✦', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '32px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setScale(0);

    this.scene.tweens.add({
      targets: successText,
      alpha: 1,
      scale: 1,
      y: y - 80,
      duration: 500,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 500,
      onComplete: () => successText.destroy()
    });
  }

  playShake(target: Phaser.GameObjects.Container): void {
    const originalX = target.x;
    this.scene.tweens.add({
      targets: target,
      x: originalX - 6,
      duration: 60,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => { target.x = originalX; }
    });

    this.scene.cameras.main.flash(150, 255, 100, 100, false);
  }

  playSynthesisEffectChain(
    x: number,
    y: number,
    color: PetalColor,
    chainIndex: number,
    totalChain: number,
    outputTier?: PetalTier
  ): void {
    const delay = this.calculateChainDelay(chainIndex, totalChain);
    const intensity = Math.min(1, chainIndex / totalChain + 0.3);
    const scaleMultiplier = 1 + intensity * 0.5;

    this.scene.time.delayedCall(chainIndex * delay, () => {
      this.playSynthesisEffect(x, y, color);

      if (outputTier && chainIndex > 0) {
        const tierText = this.scene.add.text(x, y - 120, `→ ${PETAL_TIER_NAMES[outputTier]}`, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: `${20 + intensity * 8}px`,
          color: '#fde68a',
          fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0).setScale(0);

        this.scene.tweens.add({
          targets: tierText,
          alpha: 1,
          scale: 1 * scaleMultiplier,
          y: y - 160,
          duration: 400,
          ease: 'Back.easeOut',
          yoyo: true,
          hold: 300,
          onComplete: () => tierText.destroy()
        });
      }

      if (chainIndex === totalChain - 1 && totalChain > 1) {
        this.playChainCompletionEffect(x, y, color, totalChain);
      }
    });
  }

  private playChainCompletionEffect(
    x: number,
    y: number,
    color: PetalColor,
    totalChain: number
  ): void {
    const glowColor = PETAL_COLOR_MAP[color] ?? 0xffffff;

    const burstRings = this.scene.add.graphics();
    for (let i = 0; i < 3; i++) {
      burstRings.lineStyle(3, glowColor, 0.8 - i * 0.25);
      burstRings.strokeCircle(0, 0, 10 + i * 20);
    }
    burstRings.x = x;
    burstRings.y = y;
    burstRings.setScale(0);

    this.scene.tweens.add({
      targets: burstRings,
      scale: 6,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => burstRings.destroy()
    });

    const comboText = this.scene.add.text(x, y, `🔥 ${totalChain}连合成!`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '36px',
      color: '#fde68a',
      fontStyle: 'bold',
      stroke: '#7c3aed',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0).setScale(0.5);

    this.scene.tweens.add({
      targets: comboText,
      alpha: 1,
      scale: 1.2,
      y: y - 120,
      duration: 500,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 800,
      onComplete: () => comboText.destroy()
    });

    const particleCount = 40 + totalChain * 5;
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(glowColor, 1);
      const size = 3 + Math.random() * 5;
      particle.fillCircle(0, 0, size);
      particle.x = x;
      particle.y = y;

      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 100 + Math.random() * 150 + totalChain * 5;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      this.scene.tweens.add({
        targets: particle,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        scale: 0,
        duration: 1000 + Math.random() * 500,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  playAutoFeedEffect(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    color: PetalColor,
    count: number,
    onComplete?: () => void
  ): void {
    const glowColor = PETAL_COLOR_MAP[color] ?? 0xffffff;

    for (let i = 0; i < count; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(glowColor, 1);
      const size = 4 + Math.random() * 4;
      particle.fillCircle(0, 0, size);
      particle.x = sourceX + (Math.random() - 0.5) * 30;
      particle.y = sourceY + (Math.random() - 0.5) * 30;
      particle.setScale(0);

      const controlX = (sourceX + targetX) / 2 + (Math.random() - 0.5) * 80;
      const controlY = Math.min(sourceY, targetY) - 60 - Math.random() * 40;

      const delay = i * 80;

      this.scene.tweens.add({
        targets: particle,
        scale: 1,
        duration: 150,
        delay,
        ease: 'Back.easeOut'
      });

      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 500,
        delay: delay + 100,
        ease: 'Cubic.easeInOut',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          const t2 = t * t;
          const mt = 1 - t;
          const mt2 = mt * mt;

          particle.x = mt2 * sourceX + 2 * mt * t * controlX + t2 * targetX;
          particle.y = mt2 * sourceY + 2 * mt * t * controlY + t2 * targetY;
          particle.alpha = 1 - t * 0.3;
        },
        onComplete: () => {
          particle.destroy();
          if (i === count - 1 && onComplete) {
            onComplete();
          }
        }
      });
    }

    this.scene.time.delayedCall(count * 80 + 600, () => {
      const receiveText = this.scene.add.text(targetX, targetY - 30, `+${count} 自动补料`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#86efac',
        fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0);

      this.scene.tweens.add({
        targets: receiveText,
        alpha: 1,
        y: targetY - 60,
        duration: 300,
        ease: 'Back.easeOut',
        yoyo: true,
        hold: 400,
        onComplete: () => receiveText.destroy()
      });
    });
  }

  playInventoryUpdateEffect(
    slotX: number,
    slotY: number,
    color: PetalColor,
    isAdd: boolean = true
  ): void {
    const glowColor = PETAL_COLOR_MAP[color] ?? 0xffffff;

    for (let i = 0; i < 6; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(glowColor, 1);
      const size = isAdd ? 4 : 3;
      particle.fillCircle(0, 0, size);
      particle.x = slotX;
      particle.y = slotY;

      const angle = (i / 6) * Math.PI * 2;
      const dist = isAdd ? 40 : 25;
      const dx = Math.cos(angle) * dist;
      const dy = isAdd ? Math.sin(angle) * dist - 20 : Math.sin(angle) * dist + 20;

      this.scene.tweens.add({
        targets: particle,
        x: slotX + dx,
        y: slotY + dy,
        alpha: 0,
        scale: isAdd ? 1.5 : 0.5,
        duration: isAdd ? 400 : 300,
        ease: isAdd ? 'Back.easeOut' : 'Cubic.easeIn',
        onComplete: () => particle.destroy()
      });
    }
  }

  playSynthesisFailEffect(
    x: number,
    y: number,
    reason: string
  ): void {
    const failText = this.scene.add.text(x, y, `✗ ${reason}`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#fca5a5',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    this.scene.tweens.add({
      targets: failText,
      alpha: 1,
      y: y - 40,
      duration: 250,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 500,
      onComplete: () => failText.destroy()
    });

    this.scene.cameras.main.flash(100, 200, 50, 50, false);
  }

  playTierUpEffect(
    x: number,
    y: number,
    fromTier: PetalTier,
    toTier: PetalTier,
    color: PetalColor
  ): void {
    const glowColor = PETAL_COLOR_MAP[color] ?? 0xffffff;

    const beam = this.scene.add.graphics();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      beam.lineStyle(2, glowColor, 0.6);
      beam.beginPath();
      beam.moveTo(0, 0);
      beam.lineTo(Math.cos(angle) * 100, Math.sin(angle) * 100);
      beam.strokePath();
    }
    beam.x = x;
    beam.y = y;
    beam.setAlpha(0);

    this.scene.tweens.add({
      targets: beam,
      alpha: 1,
      scale: 2,
      rotation: Math.PI,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => beam.destroy()
    });

    const tierText = this.scene.add.text(
      x,
      y,
      `${PETAL_TIER_NAMES[fromTier]} → ${PETAL_TIER_NAMES[toTier]}`,
      {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold',
        stroke: '#7c3aed',
        strokeThickness: 3
      }
    ).setOrigin(0.5).setAlpha(0).setScale(0.5);

    this.scene.tweens.add({
      targets: tierText,
      alpha: 1,
      scale: 1.1,
      y: y - 80,
      duration: 500,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 600,
      onComplete: () => tierText.destroy()
    });
  }

  startChainAnimation(chainId: string, total: number): void {
    this.activeChains.set(chainId, { index: 0, total });
    this.isAnimating = true;
  }

  updateChainAnimation(chainId: string): number {
    const chain = this.activeChains.get(chainId);
    if (!chain) return -1;

    chain.index++;
    if (chain.index >= chain.total) {
      this.endChainAnimation(chainId);
    }
    return chain.index;
  }

  endChainAnimation(chainId: string): void {
    this.activeChains.delete(chainId);
    if (this.activeChains.size === 0) {
      this.isAnimating = false;
    }
  }

  cancelAllAnimations(): void {
    this.activeChains.clear();
    this.isAnimating = false;
  }
}
