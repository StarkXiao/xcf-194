import Phaser from 'phaser';
import { PetalColor, PETAL_COLOR_MAP } from '../types';

export class AnimationManager {
  private static instance: AnimationManager;
  private scene!: Phaser.Scene;

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

  playCollectEffect(x: number, y: number, color: PetalColor): void {
    const particleCount = 10;
    const glowColor = PETAL_COLOR_MAP[color] ?? 0xffffff;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(glowColor, 1);
      const size = 3 + Math.random() * 5;
      particle.fillCircle(0, 0, size);
      particle.x = x;
      particle.y = y;

      const angle = (i / particleCount) * Math.PI * 2;
      const dist = 40 + Math.random() * 60;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 30;

      this.scene.tweens.add({
        targets: particle,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        scale: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    const text = this.scene.add.text(x, y - 40, '+收集!', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 90,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
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
}
