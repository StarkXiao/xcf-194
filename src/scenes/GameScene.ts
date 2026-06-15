import Phaser from 'phaser';
import { PlayerController } from '../controller/PlayerController';
import { SynthesisSystem } from '../systems/SynthesisSystem';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { AnimationManager } from '../managers/AnimationManager';
import { GAME_WIDTH, GAME_HEIGHT, AWAKEN_GOAL, Petal, PetalTier, PetalColor, PETAL_COLORS } from '../types';

export class GameScene extends Phaser.Scene {
  private playerController!: PlayerController;
  private synthesisSystem!: SynthesisSystem;
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;
  private animationManager!: AnimationManager;

  private petals: Phaser.GameObjects.Container[] = [];
  private petalData: Map<Phaser.GameObjects.Container, Petal> = new Map();
  private awakeProgress: number = 0;
  private score: number = 0;
  private totalPetalsCollected: number = 0;
  private synthesisCount: number = 0;
  private startTime: number = 0;

  private progressBar!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private inventoryPanel!: Phaser.GameObjects.Container;
  private inventorySlots: Map<string, Phaser.GameObjects.Container> = new Map();
  private lover!: Phaser.GameObjects.Container;
  private isCompleted: boolean = false;
  private spawnTimer!: Phaser.Time.TimerEvent;

  private bgParticles: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.saveManager = SaveManager.getInstance();
    this.audioManager = AudioManager.getInstance(this);
    this.animationManager = AnimationManager.getInstance(this);
    this.synthesisSystem = new SynthesisSystem();
    this.playerController = new PlayerController(this);
    this.startTime = Date.now();

    this.createBackground();
    this.createLover();
    this.createHUD();
    this.createInventory();
    this.createBackButton();
    this.playerController.create(this.cameras.main.width / 2, this.cameras.main.height - 450);

    this.spawnInitialPetals();
    this.startPetalSpawner();
    this.setupCollisions();
  }

  private createBackground(): void {
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(0x0f0a1e, 0x1a0a2e, 0x1e1b4b, 0x2d1b4e, 1);
    gradient.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const ground = this.add.graphics();
    ground.fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x312e81, 0x312e81, 1);
    ground.fillRoundedRect(0, GAME_HEIGHT - 250, GAME_WIDTH, 250, { tl: 80, tr: 80, bl: 0, br: 0 });

    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT - 250);
      const size = Phaser.Math.Between(1, 3);
      this.add.circle(x, y, size, 0xc4b5fd, Phaser.Math.FloatBetween(0.3, 1));
    }

    const treePositions = [80, 220, 380, 540, 680];
    treePositions.forEach((x, i) => {
      const tree = this.add.graphics();
      const treeHeight = Phaser.Math.Between(350, 500);
      const baseY = GAME_HEIGHT - 250;
      tree.fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x0f0a1e, 0x0f0a1e, 0.9);
      tree.fillTriangle(x - 50, baseY, x + 50, baseY, x, baseY - treeHeight);
      tree.fillStyle(0x312e81, 0.5);
      const leafY = baseY - treeHeight + 30;
      tree.fillCircle(x, leafY, 80 + i * 5);
      tree.fillCircle(x - 35, leafY + 30, 55);
      tree.fillCircle(x + 35, leafY + 30, 55);
    });

    for (let i = 0; i < 12; i++) {
      const p = this.add.graphics();
      p.fillStyle(0xfef08a, 0.7);
      p.fillCircle(0, 0, 3);
      p.x = Phaser.Math.Between(0, GAME_WIDTH);
      p.y = Phaser.Math.Between(150, GAME_HEIGHT - 350);
      p.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2));
      this.bgParticles.push(p);
    }
  }

  private createLover(): void {
    this.lover = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 150);

    const aura = this.add.graphics();
    aura.fillStyle(0xf0abfc, 0.15);
    aura.fillCircle(0, 0, 120);
    this.lover.add(aura);

    const body = this.add.graphics();
    body.fillStyle(0xe9d5ff, 0.9);
    body.fillEllipse(0, 20, 140, 80);
    body.fillStyle(0xfef3c7, 1);
    body.fillCircle(0, -40, 45);
    body.fillStyle(0x7c3aed, 0.8);
    body.fillCircle(0, -60, 50);
    body.fillStyle(0xfce7f3, 0.8);
    body.fillCircle(0, -40, 35);
    body.lineStyle(2, 0xa78bfa, 1);
    body.beginPath();
    body.arc(-15, -40, 4, 0, Math.PI * 2);
    body.arc(15, -40, 4, 0, Math.PI * 2);
    body.strokePath();
    body.lineStyle(2, 0xf472b6, 1);
    body.beginPath();
    body.arc(0, -28, 8, 0, Math.PI, false);
    body.strokePath();
    this.lover.add(body);

    this.tweens.add({
      targets: aura,
      alpha: { from: 0.1, to: 0.3 },
      scale: { from: 0.9, to: 1.1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createHUD(): void {
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x1e1b4b, 0.85);
    hudBg.fillRoundedRect(20, 20, GAME_WIDTH - 40, 180, 20);
    hudBg.lineStyle(2, 0xa78bfa, 0.5);
    hudBg.strokeRoundedRect(20, 20, GAME_WIDTH - 40, 180, 20);

    this.scoreText = this.add.text(50, 55, '✨ 分数: 0', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '28px',
      color: '#fde68a',
      fontStyle: 'bold'
    });

    this.add.text(50, 105, '💖 唤醒进度', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#f9a8d4'
    });

    const barBg = this.add.graphics();
    barBg.fillStyle(0x312e81, 0.8);
    barBg.fillRoundedRect(50, 140, GAME_WIDTH - 180, 36, 18);

    this.progressBar = this.add.graphics();
    this.progressText = this.add.text(GAME_WIDTH / 2, 158, '0%', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.updateProgressBar();
  }

  private createInventory(): void {
    this.inventoryPanel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 750);

    const invBg = this.add.graphics();
    invBg.fillStyle(0x1e1b4b, 0.9);
    invBg.fillRoundedRect(-340, -60, 680, 120, 20);
    invBg.lineStyle(2, 0xa78bfa, 0.6);
    invBg.strokeRoundedRect(-340, -60, 680, 120, 20);
    this.inventoryPanel.add(invBg);

    const title = this.add.text(0, -40, '🌸 花瓣背包 (点击两个相同花瓣合成)', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#c4b5fd'
    }).setOrigin(0.5);
    this.inventoryPanel.add(title);

    const slotKeys = PETAL_COLORS.map(c => `${c}_1`);
    slotKeys.forEach((key, i) => {
      const slotX = -260 + i * 130;
      const slot = this.add.container(slotX, 15);

      const slotBg = this.add.graphics();
      slotBg.fillStyle(0x312e81, 0.6);
      slotBg.fillRoundedRect(-45, -40, 90, 80, 12);
      slotBg.lineStyle(2, 0x6366f1, 0.4);
      slotBg.strokeRoundedRect(-45, -40, 90, 80, 12);
      slot.add(slotBg);

      slot.setSize(90, 80);
      slot.setInteractive();
      slot.on('pointerdown', () => this.onInventorySlotClick(key));

      this.inventorySlots.set(key, slot);
      this.inventoryPanel.add(slot);
    });

    this.updateInventoryDisplay();
  }

  private createBackButton(): void {
    const btn = this.add.graphics();
    btn.fillStyle(0x4c1d95, 0.9);
    btn.fillRoundedRect(GAME_WIDTH - 110, 205, 90, 44, 22);
    btn.setInteractive(
      new Phaser.Geom.Rectangle(GAME_WIDTH - 110, 205, 90, 44),
      Phaser.Geom.Rectangle.Contains
    );

    this.add.text(GAME_WIDTH - 65, 227, '返回', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#fef3c7'
    }).setOrigin(0.5);

    btn.on('pointerup', () => {
      this.audioManager.playClick();
      this.endGame(false);
    });
  }

  private spawnInitialPetals(): void {
    for (let i = 0; i < 6; i++) {
      this.spawnPetal();
    }
  }

  private startPetalSpawner(): void {
    this.spawnTimer = this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => {
        if (this.petals.length < 12 && !this.isCompleted) {
          this.spawnPetal();
        }
      }
    });
  }

  private spawnPetal(): void {
    const x = Phaser.Math.Between(60, GAME_WIDTH - 60);
    const y = Phaser.Math.Between(450, GAME_HEIGHT - 500);

    const tier: PetalTier = 1;
    const color = PETAL_COLORS[Phaser.Math.Between(0, 3)];

    const petalData: Petal = {
      id: `petal_${Date.now()}_${Phaser.Math.Between(0, 10000)}`,
      tier,
      color,
      x,
      y,
      collected: false
    };

    const petalContainer = this.add.container(x, y);
    this.petalData.set(petalContainer, petalData);
    this.petals.push(petalContainer);

    this.createPetalVisual(petalContainer, color, tier);
    this.animationManager.playPetalFloat(petalContainer);

    if (this.physics.world) {
      this.physics.add.existing(petalContainer);
      const body = petalContainer.body as Phaser.Physics.Arcade.Body;
      body.setCircle(25);
      body.setAllowGravity(false);
    }
  }

  private createPetalVisual(container: Phaser.GameObjects.Container, color: PetalColor, tier: PetalTier): void {
    container.removeAll(true);

    const colorMap: Record<PetalColor, number> = {
      pink: 0xff9ec4,
      blue: 0x7dd3fc,
      purple: 0xc084fc,
      gold: 0xfcd34d,
      rainbow: 0xffffff
    };

    const glowColor = colorMap[color];
    const size = 18 + tier * 4;

    const glow = this.add.graphics();
    glow.fillStyle(glowColor, 0.25);
    glow.fillCircle(0, 0, size + 18);
    glow.fillStyle(glowColor, 0.4);
    glow.fillCircle(0, 0, size + 8);
    container.add(glow);

    const petal = this.add.graphics();
    petal.fillStyle(glowColor, 1);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      petal.slice(px, py, size * 0.65, 0, Math.PI * 2);
    }
    petal.fillPath();
    petal.fillStyle(0xffffff, 0.85);
    petal.fillCircle(0, 0, size * 0.35);
    container.add(petal);

    for (let t = 2; t <= tier; t++) {
      const star = this.add.graphics();
      star.fillStyle(0xfef08a, 1);
      const sa = ((t - 2) / 4) * Math.PI * 2;
      star.fillCircle(Math.cos(sa) * (size + 12), Math.sin(sa) * (size + 12), 3);
      container.add(star);
    }
  }

  private setupCollisions(): void {
    this.physics.world.on('worldstep', () => {
      if (this.isCompleted) return;
      this.checkPetalCollection();
    });
  }

  private checkPetalCollection(): void {
    const playerPos = this.playerController.getPosition();
    const collectRadius = 70;

    for (let i = this.petals.length - 1; i >= 0; i--) {
      const petal = this.petals[i];
      const data = this.petalData.get(petal);
      if (!data || data.collected) continue;

      const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, petal.x, petal.y);

      if (dist < collectRadius) {
        this.collectPetal(petal);
      }
    }
  }

  private collectPetal(petal: Phaser.GameObjects.Container): void {
    const data = this.petalData.get(petal);
    if (!data || data.collected) return;

    data.collected = true;
    this.audioManager.playCollect();
    this.animationManager.playCollectEffect(petal.x, petal.y, data.color);

    this.synthesisSystem.addToInventory(data.tier, data.color);
    this.totalPetalsCollected++;

    const scoreGain = data.tier * 10 + (data.color === 'gold' ? 20 : 0);
    this.score += scoreGain;
    this.updateScore();

    const progressGain = data.tier * 1.5;
    this.awakeProgress = Math.min(AWAKEN_GOAL, this.awakeProgress + progressGain);
    this.updateProgressBar();

    this.updateInventoryDisplay();

    this.tweens.add({
      targets: petal,
      scale: 0,
      alpha: 0,
      duration: 250,
      ease: 'Back.easeIn',
      onComplete: () => {
        const idx = this.petals.indexOf(petal);
        if (idx > -1) this.petals.splice(idx, 1);
        this.petalData.delete(petal);
        petal.destroy();
      }
    });

    if (this.awakeProgress >= AWAKEN_GOAL && !this.isCompleted) {
      this.isCompleted = true;
      this.time.delayedCall(800, () => this.endGame(true));
    }
  }

  private onInventorySlotClick(key: string): void {
    const [color, tierStr] = key.split('_');
    const tier = parseInt(tierStr) as PetalTier;

    const result = this.synthesisSystem.trySynthesize(tier, color as PetalColor);

    if (result.success) {
      this.audioManager.playSynthesis();
      this.synthesisCount++;

      if (result.output) {
        const outputScore = result.output.tier * 80;
        this.score += outputScore;
        this.awakeProgress = Math.min(AWAKEN_GOAL, this.awakeProgress + result.output.tier * 3);
        this.updateScore();
        this.updateProgressBar();

        this.animationManager.playSynthesisEffect(
          GAME_WIDTH / 2,
          GAME_HEIGHT - 750,
          result.output.color
        );
      }

      this.updateInventoryDisplay();
    } else {
      this.animationManager.playShake(this.inventorySlots.get(key)!);
    }
  }

  private updateScore(): void {
    this.scoreText.setText(`✨ 分数: ${this.score}`);
  }

  private updateProgressBar(): void {
    const progress = this.awakeProgress / AWAKEN_GOAL;
    this.progressBar.clear();

    const colors = [0xf472b6, 0xc084fc, 0xa78bfa, 0x818cf8, 0x60a5fa];
    const totalWidth = (GAME_WIDTH - 180) * progress;
    const segments = 20;
    for (let i = 0; i < segments; i++) {
      const segStart = (i / segments) * totalWidth;
      const segEnd = ((i + 1) / segments) * totalWidth;
      const t = i / (segments - 1);
      const colorIdx = Math.min(Math.floor(t * (colors.length - 1)), colors.length - 2);
      const colorT = (t * (colors.length - 1)) - colorIdx;
      const c1 = Phaser.Display.Color.IntegerToColor(colors[colorIdx]);
      const c2 = Phaser.Display.Color.IntegerToColor(colors[colorIdx + 1]);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, 100, Math.floor(colorT * 100));
      this.progressBar.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      this.progressBar.fillRoundedRect(50 + segStart, 140, segEnd - segStart + 2, 36, 18);
    }

    this.progressText.setText(`${Math.floor(this.awakeProgress)}%`);

    if (this.awakeProgress >= AWAKEN_GOAL * 0.5 && this.lover) {
      const loverBody = this.lover.list[1] as Phaser.GameObjects.Graphics;
      if (loverBody) {
        loverBody.alpha = 0.5 + (this.awakeProgress / AWAKEN_GOAL) * 0.5;
      }
    }
  }

  private updateInventoryDisplay(): void {
    const inventory = this.synthesisSystem.getInventory();

    PETAL_COLORS.forEach((color) => {
      const key = `${color}_1`;
      const slot = this.inventorySlots.get(key);
      if (!slot) return;

      const item = inventory.find(i => i.color === color);
      const count = item?.count || 0;

      slot.each((child: Phaser.GameObjects.GameObject) => {
        if (child !== slot.list[0]) child.destroy();
      });

      if (count > 0) {
        this.createPetalVisual(slot as Phaser.GameObjects.Container, color, 1);
        slot.setScale(0.65);

        const countText = this.add.text(28, 22, `x${count}`, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '18px',
          color: '#fef3c7',
          backgroundColor: '#7c3aed',
          padding: { x: 4, y: 1 }
        }).setOrigin(0.5);
        slot.add(countText);
      }
    });
  }

  private endGame(victory: boolean): void {
    this.spawnTimer?.destroy();
    this.playerController.destroy();

    const playTime = Math.floor((Date.now() - this.startTime) / 1000);

    this.saveManager.saveProgress({
      score: this.score,
      progress: this.awakeProgress,
      playTime,
      victory
    });

    this.scene.start('ResultScene', {
      score: this.score,
      awakeProgress: this.awakeProgress,
      totalPetalsCollected: this.totalPetalsCollected,
      synthesisCount: this.synthesisCount,
      playTime,
      victory
    });
  }

  update(_time: number, delta: number): void {
    this.playerController.update(delta);

    const t = Date.now() / 1000;
    this.bgParticles.forEach((p, i) => {
      const phase = p.getData('phase') as number;
      p.x += Math.sin(t * 0.5 + phase + i) * 0.3;
      p.y += Math.cos(t * 0.3 + phase * 1.2) * 0.2;
      p.alpha = 0.4 + Math.sin(t * 1.5 + phase) * 0.35;
    });
  }

  public getGameBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: 40,
      y: 420,
      width: GAME_WIDTH - 80,
      height: GAME_HEIGHT - 720
    };
  }
}
