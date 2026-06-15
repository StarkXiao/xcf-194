import Phaser from 'phaser';
import { GameScene } from '../scenes/GameScene';

export class PlayerController {
  private scene: GameScene;
  private container!: Phaser.GameObjects.Container;
  private targetX: number;
  private targetY: number;
  private isMoving: boolean = false;
  private speed: number = 320;
  private playerGraphics!: Phaser.GameObjects.Graphics;
  private aura!: Phaser.GameObjects.Graphics;
  private trailParticles: Phaser.GameObjects.Graphics[] = [];
  private facing: number = 1;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.targetX = 0;
    this.targetY = 0;
  }

  create(x: number, y: number): void {
    this.container = this.scene.add.container(x, y);
    this.targetX = x;
    this.targetY = y;

    this.aura = this.scene.add.graphics();
    this.aura.fillStyle(0x7dd3fc, 0.15);
    this.aura.fillCircle(0, 0, 60);
    this.aura.fillStyle(0xa78bfa, 0.25);
    this.aura.fillCircle(0, 0, 40);
    this.container.add(this.aura);

    this.playerGraphics = this.scene.add.graphics();
    this.drawPlayer();
    this.container.add(this.playerGraphics);

    this.setupInput();
    this.createTrailEffect();
    this.startIdleAnimation();
  }

  private drawPlayer(): void {
    const g = this.playerGraphics;
    g.clear();

    g.fillStyle(0x1e3a5f, 1);
    g.fillRoundedRect(-18, -5, 36, 50, 8);

    g.fillStyle(0x60a5fa, 0.85);
    g.beginPath();
    g.moveTo(-22, -2);
    g.lineTo(-32, 5);
    g.lineTo(-28, 40);
    g.lineTo(-26, 40);
    g.lineTo(-18, 35);
    g.lineTo(-16, 0);
    g.closePath();
    g.fillPath();

    g.beginPath();
    g.moveTo(22, -2);
    g.lineTo(32, 5);
    g.lineTo(28, 40);
    g.lineTo(26, 40);
    g.lineTo(18, 35);
    g.lineTo(16, 0);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xfef3c7, 1);
    g.fillCircle(0, -22, 20);

    g.fillStyle(0x1e3a5f, 1);
    g.beginPath();
    g.arc(0, -30, 22, Math.PI, 0, false);
    g.lineTo(22, -15);
    g.lineTo(10, -10);
    g.lineTo(0, -9);
    g.lineTo(-10, -10);
    g.lineTo(-22, -15);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x3b82f6, 1);
    g.fillEllipse(0, -44, 26, 10);
    g.fillCircle(0, -52, 6);

    g.fillStyle(0x1e293b, 1);
    g.beginPath();
    g.arc(this.facing * -6, -22, 3, 0, Math.PI * 2);
    g.fillPath();
    g.beginPath();
    g.arc(this.facing * 6, -22, 3, 0, Math.PI * 2);
    g.fillPath();

    g.fillStyle(0xfca5a5, 0.5);
    g.fillCircle(this.facing * -10, -16, 3);
    g.fillCircle(this.facing * 10, -16, 3);

    g.lineStyle(2, 0xf472b6, 1);
    g.beginPath();
    g.arc(0, -18, 3, 0, Math.PI, false);
    g.strokePath();

    g.fillStyle(0xfde68a, 1);
    const starPositions = [
      [-14, 10, 2],
      [14, 10, 2],
      [0, 20, 2.5]
    ];
    starPositions.forEach(([sx, sy, ss]) => {
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? ss * 2 : ss;
        const px = sx + Math.cos(a) * r;
        const py = sy + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
    });
  }

  private setupInput(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.setTarget(pointer.x, pointer.y);
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.setTarget(pointer.x, pointer.y);
      }
    });

    const keys = this.scene.input.keyboard!.createCursorKeys();
    const wasd = this.scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };

    this.scene.events.on('update', () => {
      let dx = 0;
      let dy = 0;

      if (keys.left.isDown || wasd.left.isDown) dx -= 1;
      if (keys.right.isDown || wasd.right.isDown) dx += 1;
      if (keys.up.isDown || wasd.up.isDown) dy -= 1;
      if (keys.down.isDown || wasd.down.isDown) dy += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        this.setTarget(
          this.container.x + (dx / len) * 60,
          this.container.y + (dy / len) * 60
        );
      }
    });
  }

  private setTarget(x: number, y: number): void {
    const bounds = this.scene.getGameBounds();
    this.targetX = Phaser.Math.Clamp(x, bounds.x + 30, bounds.x + bounds.width - 30);
    this.targetY = Phaser.Math.Clamp(y, bounds.y + 30, bounds.y + bounds.height - 30);
    this.isMoving = true;

    if (this.targetX < this.container.x - 2) this.facing = -1;
    else if (this.targetX > this.container.x + 2) this.facing = 1;
  }

  private createTrailEffect(): void {
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(0xa78bfa, 0);
      particle.fillCircle(0, 0, 4);
      this.trailParticles.push(particle);
    }
  }

  private startIdleAnimation(): void {
    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y + 4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: this.aura,
      alpha: 0.5,
      scale: 1.15,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update(delta: number): void {
    if (!this.container) return;

    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 4) {
      const moveSpeed = this.speed * (delta / 1000);
      const moveAmount = Math.min(moveSpeed, dist);
      this.container.x += (dx / dist) * moveAmount;
      this.container.y += (dy / dist) * moveAmount;
      this.drawPlayer();
      this.updateTrail();
    } else {
      this.isMoving = false;
    }
  }

  private updateTrail(): void {
    for (let i = this.trailParticles.length - 1; i > 0; i--) {
      this.trailParticles[i].x = this.trailParticles[i - 1].x;
      this.trailParticles[i].y = this.trailParticles[i - 1].y;
      this.trailParticles[i].alpha = this.trailParticles[i - 1].alpha * 0.85;
    }

    this.trailParticles[0].x = this.container.x;
    this.trailParticles[0].y = this.container.y + 20;
    this.trailParticles[0].alpha = 0.6;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  destroy(): void {
    this.trailParticles.forEach(p => p.destroy());
    this.container?.destroy();
  }
}
