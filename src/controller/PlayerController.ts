import Phaser from 'phaser';
import { GameScene } from '../scenes/GameScene';
import { RegionId, REGION_CONFIGS } from '../types';

export interface TerrainSprintConfig {
  speedMultiplier: number;
  distanceMultiplier: number;
  cooldownMultiplier: number;
  trailColor: number;
  trailAlpha: number;
  acceleration: number;
}

export interface SprintState {
  isSprinting: boolean;
  sprintStartTime: number;
  sprintDuration: number;
  sprintCooldown: number;
  lastSprintTime: number;
  sprintDirectionX: number;
  sprintDirectionY: number;
  canSprint: boolean;
}

export const TERRAIN_SPRINT_CONFIGS: Record<RegionId, TerrainSprintConfig> = {
  initial: {
    speedMultiplier: 1.8,
    distanceMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    trailColor: 0x7dd3fc,
    trailAlpha: 0.6,
    acceleration: 0.95
  },
  starlight: {
    speedMultiplier: 2.0,
    distanceMultiplier: 1.1,
    cooldownMultiplier: 0.9,
    trailColor: 0xfcd34d,
    trailAlpha: 0.65,
    acceleration: 0.93
  },
  moonshadow: {
    speedMultiplier: 2.2,
    distanceMultiplier: 1.2,
    cooldownMultiplier: 0.85,
    trailColor: 0xc084fc,
    trailAlpha: 0.7,
    acceleration: 0.9
  },
  dawn: {
    speedMultiplier: 2.4,
    distanceMultiplier: 1.3,
    cooldownMultiplier: 0.8,
    trailColor: 0xfb923c,
    trailAlpha: 0.75,
    acceleration: 0.88
  },
  eternal: {
    speedMultiplier: 2.8,
    distanceMultiplier: 1.5,
    cooldownMultiplier: 0.7,
    trailColor: 0xf472b6,
    trailAlpha: 0.85,
    acceleration: 0.85
  }
};

export class PlayerController {
  private scene: GameScene;
  private container!: Phaser.GameObjects.Container;
  private targetX: number;
  private targetY: number;
  private isMoving: boolean = false;
  private baseSpeed: number = 320;
  private speed: number = 320;
  private playerGraphics!: Phaser.GameObjects.Graphics;
  private aura!: Phaser.GameObjects.Graphics;
  private auraInner!: Phaser.GameObjects.Graphics;
  private trailParticles: Phaser.GameObjects.Graphics[] = [];
  private sprintTrailParticles: Phaser.GameObjects.Graphics[] = [];
  private facing: number = 1;

  private sprintState: SprintState = {
    isSprinting: false,
    sprintStartTime: 0,
    sprintDuration: 280,
    sprintCooldown: 800,
    lastSprintTime: -9999,
    sprintDirectionX: 0,
    sprintDirectionY: 0,
    canSprint: true
  };

  private currentTerrain: RegionId = 'initial';
  private lastMoveDirectionX: number = 0;
  private lastMoveDirectionY: number = 0;
  private sprintCooldownIndicator!: Phaser.GameObjects.Graphics;
  private collectRadiusVisual!: Phaser.GameObjects.Graphics;
  private currentCollectRadius: number = 70;
  private absorbStrength: number = 1.0;
  private nearbyPetalCount: number = 0;

  private idleTween: Phaser.Tweens.Tween | null = null;
  private auraTween: Phaser.Tweens.Tween | null = null;
  private bodySquash: number = 1;
  private bodyStretch: number = 1;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.targetX = 0;
    this.targetY = 0;
  }

  create(x: number, y: number): void {
    this.container = this.scene.add.container(x, y);
    this.targetX = x;
    this.targetY = y;

    this.collectRadiusVisual = this.scene.add.graphics();
    this.collectRadiusVisual.lineStyle(2, 0x7dd3fc, 0.2);
    this.collectRadiusVisual.strokeCircle(0, 0, this.currentCollectRadius);
    this.collectRadiusVisual.setDepth(-1);
    this.container.add(this.collectRadiusVisual);

    this.aura = this.scene.add.graphics();
    this.aura.fillStyle(0x7dd3fc, 0.15);
    this.aura.fillCircle(0, 0, 60);
    this.aura.fillStyle(0xa78bfa, 0.25);
    this.aura.fillCircle(0, 0, 40);
    this.container.add(this.aura);

    this.auraInner = this.scene.add.graphics();
    this.auraInner.fillStyle(0xfef3c7, 0.1);
    this.auraInner.fillCircle(0, 0, 25);
    this.container.add(this.auraInner);

    this.playerGraphics = this.scene.add.graphics();
    this.drawPlayer();
    this.container.add(this.playerGraphics);

    this.sprintCooldownIndicator = this.scene.add.graphics();
    this.sprintCooldownIndicator.setDepth(1);
    this.container.add(this.sprintCooldownIndicator);

    this.setupInput();
    this.createTrailEffect();
    this.createSprintTrailEffect();
    this.startIdleAnimation();
  }

  private drawPlayer(): void {
    const g = this.playerGraphics;
    g.clear();

    const sx = this.bodyStretch;
    const sy = this.bodySquash;
    g.save();
    g.setScale(sx, sy);

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

    g.restore();
  }

  private setupInput(): void {
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const now = Date.now();
      const tapDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, lastTapX, lastTapY);

      if (now - lastTapTime < 300 && tapDist < 80) {
        const dx = pointer.x - this.container.x;
        const dy = pointer.y - this.container.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
          this.trySprint(dx / dist, dy / dist);
        }
      }
      lastTapTime = now;
      lastTapX = pointer.x;
      lastTapY = pointer.y;

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

    const sprintKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    const spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    Phaser.Input.Keyboard.JustDown(sprintKey);
    Phaser.Input.Keyboard.JustDown(spaceKey);

    this.scene.events.on('update', () => {
      let dx = 0;
      let dy = 0;

      if (keys.left.isDown || wasd.left.isDown) dx -= 1;
      if (keys.right.isDown || wasd.right.isDown) dx += 1;
      if (keys.up.isDown || wasd.up.isDown) dy -= 1;
      if (keys.down.isDown || wasd.down.isDown) dy += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / len;
        const ny = dy / len;
        this.lastMoveDirectionX = nx;
        this.lastMoveDirectionY = ny;
        this.setTarget(
          this.container.x + nx * 60,
          this.container.y + ny * 60
        );

        if (Phaser.Input.Keyboard.JustDown(sprintKey) || Phaser.Input.Keyboard.JustDown(spaceKey)) {
          this.trySprint(nx, ny);
        }
      } else {
        if (Phaser.Input.Keyboard.JustDown(sprintKey) || Phaser.Input.Keyboard.JustDown(spaceKey)) {
          if (Math.abs(this.lastMoveDirectionX) > 0.01 || Math.abs(this.lastMoveDirectionY) > 0.01) {
            this.trySprint(this.lastMoveDirectionX, this.lastMoveDirectionY);
          } else {
            this.trySprint(this.facing, 0);
          }
        }
      }
    });
  }

  private trySprint(dirX: number, dirY: number): void {
    const now = Date.now();
    const terrainConfig = TERRAIN_SPRINT_CONFIGS[this.currentTerrain];
    const effectiveCooldown = this.sprintState.sprintCooldown * terrainConfig.cooldownMultiplier;

    if (now - this.sprintState.lastSprintTime < effectiveCooldown) {
      return;
    }

    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len < 0.01) return;

    this.sprintState.isSprinting = true;
    this.sprintState.sprintStartTime = now;
    this.sprintState.lastSprintTime = now;
    this.sprintState.sprintDirectionX = dirX / len;
    this.sprintState.sprintDirectionY = dirY / len;
    this.sprintState.canSprint = false;

    const sprintDistance = 120 * terrainConfig.distanceMultiplier;
    this.setTarget(
      this.container.x + this.sprintState.sprintDirectionX * sprintDistance,
      this.container.y + this.sprintState.sprintDirectionY * sprintDistance
    );

    this.scene.tweens.add({
      targets: this,
      bodySquash: 0.7,
      bodyStretch: 1.3,
      duration: 100,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: this.sprintState.sprintDuration - 100,
      onUpdate: () => this.drawPlayer()
    });

    this.scene.cameras.main.shake(120, 0.004);

    this.scene.time.delayedCall(this.sprintState.sprintDuration, () => {
      this.sprintState.isSprinting = false;
    });

    this.scene.time.delayedCall(effectiveCooldown, () => {
      this.sprintState.canSprint = true;
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

  private createSprintTrailEffect(): void {
    for (let i = 0; i < 16; i++) {
      const particle = this.scene.add.graphics();
      particle.fillCircle(0, 0, 5 + Math.random() * 4);
      particle.setDepth(-1);
      this.sprintTrailParticles.push(particle);
    }
  }

  private startIdleAnimation(): void {
    this.idleTween = this.scene.tweens.add({
      targets: this.container,
      y: this.container.y + 4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.auraTween = this.scene.tweens.add({
      targets: this.aura,
      alpha: 0.5,
      scale: 1.15,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: this.auraInner,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.05, to: 0.15 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update(delta: number): void {
    if (!this.container) return;

    const now = Date.now();
    const terrainConfig = TERRAIN_SPRINT_CONFIGS[this.currentTerrain];

    let effectiveSpeed = this.baseSpeed;
    if (this.sprintState.isSprinting) {
      const sprintProgress = (now - this.sprintState.sprintStartTime) / this.sprintState.sprintDuration;
      const sprintFactor = 1 + (terrainConfig.speedMultiplier - 1) * (1 - sprintProgress * 0.5);
      effectiveSpeed *= sprintFactor;
    }
    this.speed = effectiveSpeed;

    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 4) {
      let nx = dx / dist;
      let ny = dy / dist;

      if (this.sprintState.isSprinting) {
        const blendFactor = terrainConfig.acceleration;
        nx = nx * (1 - blendFactor) + this.sprintState.sprintDirectionX * blendFactor;
        ny = ny * (1 - blendFactor) + this.sprintState.sprintDirectionY * blendFactor;
        const nlen = Math.sqrt(nx * nx + ny * ny);
        if (nlen > 0.001) {
          nx /= nlen;
          ny /= nlen;
        }
      }

      const moveSpeed = this.speed * (delta / 1000);
      const moveAmount = Math.min(moveSpeed, dist);
      this.container.x += nx * moveAmount;
      this.container.y += ny * moveAmount;
      this.isMoving = true;

      this.drawPlayer();
      this.updateTrail();
      if (this.sprintState.isSprinting) {
        this.updateSprintTrail();
      }
    } else {
      this.isMoving = false;
    }

    this.updateSprintCooldownIndicator();
    this.updateCollectRadiusVisual();
  }

  private updateTrail(): void {
    for (let i = this.trailParticles.length - 1; i > 0; i--) {
      this.trailParticles[i].x = this.trailParticles[i - 1].x;
      this.trailParticles[i].y = this.trailParticles[i - 1].y;
      this.trailParticles[i].alpha = this.trailParticles[i - 1].alpha * 0.85;
    }

    this.trailParticles[0].x = this.container.x;
    this.trailParticles[0].y = this.container.y + 20;
    this.trailParticles[0].alpha = this.sprintState.isSprinting ? 0.3 : 0.6;
  }

  private updateSprintTrail(): void {
    const terrainConfig = TERRAIN_SPRINT_CONFIGS[this.currentTerrain];

    for (let i = this.sprintTrailParticles.length - 1; i > 0; i--) {
      this.sprintTrailParticles[i].x = this.sprintTrailParticles[i - 1].x;
      this.sprintTrailParticles[i].y = this.sprintTrailParticles[i - 1].y;
      this.sprintTrailParticles[i].alpha = this.sprintTrailParticles[i - 1].alpha * 0.82;
      this.sprintTrailParticles[i].scaleX = this.sprintTrailParticles[i - 1].scaleX * 0.95;
      this.sprintTrailParticles[i].scaleY = this.sprintTrailParticles[i - 1].scaleY * 0.95;
    }

    const offsetBack = -25;
    const sx = this.container.x - this.sprintState.sprintDirectionX * offsetBack;
    const sy = this.container.y + 20 - this.sprintState.sprintDirectionY * offsetBack;

    this.sprintTrailParticles[0].clear();
    this.sprintTrailParticles[0].fillStyle(terrainConfig.trailColor, terrainConfig.trailAlpha);
    this.sprintTrailParticles[0].fillCircle(0, 0, 6 + Math.random() * 4);
    this.sprintTrailParticles[0].x = sx + (Math.random() - 0.5) * 12;
    this.sprintTrailParticles[0].y = sy + (Math.random() - 0.5) * 12;
    this.sprintTrailParticles[0].alpha = terrainConfig.trailAlpha;
    this.sprintTrailParticles[0].setScale(1.2);
  }

  private updateSprintCooldownIndicator(): void {
    const g = this.sprintCooldownIndicator;
    g.clear();

    const now = Date.now();
    const terrainConfig = TERRAIN_SPRINT_CONFIGS[this.currentTerrain];
    const effectiveCooldown = this.sprintState.sprintCooldown * terrainConfig.cooldownMultiplier;
    const timeSinceLastSprint = now - this.sprintState.lastSprintTime;

    if (this.sprintState.isSprinting) {
      g.lineStyle(4, terrainConfig.trailColor, 0.9);
      g.strokeCircle(0, 35, 28);
    } else if (timeSinceLastSprint < effectiveCooldown) {
      const progress = Math.min(1, timeSinceLastSprint / effectiveCooldown);
      g.lineStyle(3, 0x64748b, 0.5);
      g.strokeCircle(0, 35, 28);

      g.lineStyle(4, terrainConfig.trailColor, 0.7);
      g.beginPath();
      g.arc(0, 35, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      g.strokePath();
    } else if (this.sprintState.canSprint) {
      g.lineStyle(3, 0x86efac, 0.6);
      g.strokeCircle(0, 35, 28);
    }
  }

  private updateCollectRadiusVisual(): void {
    const g = this.collectRadiusVisual;
    g.clear();

    const pulse = 1 + Math.sin(Date.now() / 500) * 0.03;
    const densityBoost = Math.min(1.5, 1 + this.nearbyPetalCount * 0.05);
    const effectiveRadius = this.currentCollectRadius * densityBoost * pulse;

    const terrainConfig = TERRAIN_SPRINT_CONFIGS[this.currentTerrain];
    g.lineStyle(2, terrainConfig.trailColor, 0.25);
    g.strokeCircle(0, 0, effectiveRadius);

    if (this.nearbyPetalCount > 3) {
      g.lineStyle(1, 0xfcd34d, 0.15 + Math.min(0.2, this.nearbyPetalCount * 0.02));
      g.strokeCircle(0, 0, effectiveRadius * 0.85);
    }
  }

  setTerrain(terrain: RegionId): void {
    if (this.currentTerrain === terrain) return;

    const oldTerrain = this.currentTerrain;
    this.currentTerrain = terrain;

    const newConfig = TERRAIN_SPRINT_CONFIGS[terrain];
    const oldConfig = TERRAIN_SPRINT_CONFIGS[oldTerrain];

    if (this.auraTween) {
      this.auraTween.stop();
    }
    this.aura.clear();
    this.aura.fillStyle(newConfig.trailColor, 0.15);
    this.aura.fillCircle(0, 0, 60);
    this.aura.fillStyle(0xa78bfa, 0.25);
    this.aura.fillCircle(0, 0, 40);

    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.05,
      scaleY: 0.95,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeOut'
    });

    this.auraTween = this.scene.tweens.add({
      targets: this.aura,
      alpha: 0.6,
      scale: 1.2,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  setCollectRadius(radius: number): void {
    this.currentCollectRadius = radius;
  }

  getAbsorbStrength(): number {
    const terrainBoost = TERRAIN_SPRINT_CONFIGS[this.currentTerrain].speedMultiplier * 0.5;
    const densityBoost = 1 + Math.min(1, this.nearbyPetalCount * 0.08);
    const sprintBoost = this.sprintState.isSprinting ? 1.5 : 1;
    return this.absorbStrength * terrainBoost * densityBoost * sprintBoost;
  }

  getAbsorbRange(): number {
    const baseRange = this.currentCollectRadius * 1.6;
    const terrainBoost = TERRAIN_SPRINT_CONFIGS[this.currentTerrain].distanceMultiplier;
    const densityBoost = 1 + Math.min(0.5, this.nearbyPetalCount * 0.03);
    return baseRange * terrainBoost * densityBoost;
  }

  updateNearbyPetalCount(count: number): void {
    this.nearbyPetalCount = count;
    const densityFactor = Math.min(1.5, 1 + count * 0.05);
    this.absorbStrength = densityFactor;
  }

  isSprinting(): boolean {
    return this.sprintState.isSprinting;
  }

  getCurrentTerrain(): RegionId {
    return this.currentTerrain;
  }

  getSprintCollisionRadius(): number {
    return this.sprintState.isSprinting ? 35 : 25;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  destroy(): void {
    if (this.idleTween) this.idleTween.stop();
    if (this.auraTween) this.auraTween.stop();
    this.trailParticles.forEach(p => p.destroy());
    this.sprintTrailParticles.forEach(p => p.destroy());
    this.container?.destroy();
  }
}
