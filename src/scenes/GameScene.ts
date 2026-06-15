import Phaser from 'phaser';
import { PlayerController } from '../controller/PlayerController';
import { SynthesisSystem } from '../systems/SynthesisSystem';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { AnimationManager } from '../managers/AnimationManager';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  AWAKEN_GOAL,
  Petal,
  PetalTier,
  PetalColor,
  PETAL_COLORS,
  GameState,
  Petal as PetalType
} from '../types';

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
  private autoSaveTimer!: Phaser.Time.TimerEvent;

  private bgParticles: Phaser.GameObjects.Graphics[] = [];

  private isSynthesizing: boolean = false;
  private autoFeedButton!: Phaser.GameObjects.Container;
  private autoFeedStatusText!: Phaser.GameObjects.Text;
  private saveStatusText!: Phaser.GameObjects.Text;

  private loadingGameState: boolean = false;

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
    this.createAutoFeedButton();
    this.createSaveStatus();
    this.playerController.create(this.cameras.main.width / 2, this.cameras.main.height - 450);

    const initData = this.scene.settings.data as { loadSave?: boolean } | undefined;
    if (initData?.loadSave && this.saveManager.hasGameState()) {
      this.loadGameState();
    } else {
      this.spawnInitialPetals();
    }

    this.startPetalSpawner();
    this.startAutoSave();
    this.setupCollisions();

    const validation = this.synthesisSystem.validateInventory();
    if (!validation.valid) {
      console.warn('[GameScene] 背包校验发现问题:', validation.issues);
      this.updateInventoryDisplay();
    }
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
    this.inventoryPanel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 720);

    const invBg = this.add.graphics();
    invBg.fillStyle(0x1e1b4b, 0.92);
    invBg.fillRoundedRect(-350, -90, 700, 190, 22);
    invBg.lineStyle(2, 0xa78bfa, 0.6);
    invBg.strokeRoundedRect(-350, -90, 700, 190, 22);
    this.inventoryPanel.add(invBg);

    const title = this.add.text(0, -65, '🌸 花瓣背包 · 点击一键合成', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.inventoryPanel.add(title);

    const subtitle = this.add.text(0, -40, '3个同色→升级 | 彩虹2个→升级 | 粉蓝紫各1→彩虹', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#a78bfa'
    }).setOrigin(0.5);
    this.inventoryPanel.add(subtitle);

    const displayColors: PetalColor[] = ['pink', 'blue', 'purple', 'gold', 'rainbow'];
    displayColors.forEach((color, i) => {
      const slotX = -280 + i * 130;
      const slot = this.add.container(slotX, 35);

      const slotBg = this.add.graphics();
      slotBg.fillStyle(0x312e81, 0.6);
      slotBg.fillRoundedRect(-55, -50, 110, 100, 14);
      slotBg.lineStyle(2, 0x6366f1, 0.4);
      slotBg.strokeRoundedRect(-55, -50, 110, 100, 14);
      slot.add(slotBg);
      slot.setData('bg', slotBg);

      slot.setSize(110, 100);
      slot.setInteractive();
      slot.on('pointerdown', () => this.onColorSlotClick(color));

      this.inventorySlots.set(color, slot);
      this.inventoryPanel.add(slot);
    });

    const rainbowBtn = this.add.container(280, -25);
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xf59e0b, 0.2);
    btnBg.fillRoundedRect(-55, -20, 110, 40, 20);
    btnBg.lineStyle(2, 0xfbbf24, 0.8);
    btnBg.strokeRoundedRect(-55, -20, 110, 40, 20);
    rainbowBtn.add(btnBg);
    rainbowBtn.setData('bg', btnBg);

    const btnText = this.add.text(0, 0, '✨ 彩虹转化', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    rainbowBtn.add(btnText);

    rainbowBtn.setSize(110, 40);
    rainbowBtn.setInteractive();
    rainbowBtn.on('pointerdown', () => this.onRainbowConvertClick());
    this.inventoryPanel.add(rainbowBtn);
    this.inventorySlots.set('rainbow_btn', rainbowBtn);

    this.updateInventoryDisplay();
    this.startInventoryGlowAnimation();
  }

  private startInventoryGlowAnimation(): void {
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (this.isCompleted) return;
        const colors: PetalColor[] = ['pink', 'blue', 'purple', 'gold', 'rainbow'];
        const time = this.time.now / 1000;
        colors.forEach((color) => {
          const slot = this.inventorySlots.get(color);
          if (!slot) return;
          const canSynth = this.synthesisSystem.canSynthesize(color);
          const bg = slot.getData('bg') as Phaser.GameObjects.Graphics;
          if (bg && slot.list[0] === bg) {
            bg.clear();
            if (canSynth) {
              const pulse = 0.5 + Math.sin(time * 3) * 0.3;
              bg.fillStyle(0x7c3aed, 0.5 + pulse * 0.3);
              bg.fillRoundedRect(-55, -50, 110, 100, 14);
              bg.lineStyle(3, 0xfbbf24, 0.6 + pulse * 0.4);
              bg.strokeRoundedRect(-55, -50, 110, 100, 14);
            } else {
              bg.fillStyle(0x312e81, 0.6);
              bg.fillRoundedRect(-55, -50, 110, 100, 14);
              bg.lineStyle(2, 0x6366f1, 0.4);
              bg.strokeRoundedRect(-55, -50, 110, 100, 14);
            }
          }
        });

        const rainbowBtn = this.inventorySlots.get('rainbow_btn');
        if (rainbowBtn) {
          const canMake = this.synthesisSystem.canMakeRainbow();
          const btnBg = rainbowBtn.getData('bg') as Phaser.GameObjects.Graphics;
          if (btnBg) {
            btnBg.clear();
            if (canMake) {
              const pulse = 0.5 + Math.sin(time * 4) * 0.3;
              btnBg.fillStyle(0xf59e0b, 0.3 + pulse * 0.3);
              btnBg.fillRoundedRect(-55, -20, 110, 40, 20);
              btnBg.lineStyle(3, 0xfef08a, 0.7 + pulse * 0.3);
              btnBg.strokeRoundedRect(-55, -20, 110, 40, 20);
            } else {
              btnBg.fillStyle(0x374151, 0.4);
              btnBg.fillRoundedRect(-55, -20, 110, 40, 20);
              btnBg.lineStyle(2, 0x6b7280, 0.5);
              btnBg.strokeRoundedRect(-55, -20, 110, 40, 20);
            }
          }
        }
      }
    });
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

  private createAutoFeedButton(): void {
    this.autoFeedButton = this.add.container(100, 227);

    const btnBg = this.add.graphics();
    const isEnabled = this.synthesisSystem.isAutoFeedEnabled();
    btnBg.fillStyle(isEnabled ? 0x059669 : 0x374151, 0.9);
    btnBg.fillRoundedRect(-50, -22, 100, 44, 22);
    btnBg.lineStyle(2, isEnabled ? 0x34d399 : 0x6b7280, 0.8);
    btnBg.strokeRoundedRect(-50, -22, 100, 44, 22);
    this.autoFeedButton.add(btnBg);
    this.autoFeedButton.setData('bg', btnBg);

    const btnText = this.add.text(0, 0, isEnabled ? '✓ 自动补料' : '✗ 自动补料', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: isEnabled ? '#a7f3d0' : '#9ca3af',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.autoFeedButton.add(btnText);
    this.autoFeedButton.setData('text', btnText);

    this.autoFeedButton.setSize(100, 44);
    this.autoFeedButton.setInteractive();
    this.autoFeedButton.on('pointerdown', () => this.toggleAutoFeed());

    this.autoFeedStatusText = this.add.text(100, 260, '低阶花瓣自动升级补全', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#a78bfa'
    }).setOrigin(0.5);
  }

  private toggleAutoFeed(): void {
    const newState = !this.synthesisSystem.isAutoFeedEnabled();
    this.synthesisSystem.setAutoFeedEnabled(newState);
    this.audioManager.playClick();

    const btnBg = this.autoFeedButton.getData('bg') as Phaser.GameObjects.Graphics;
    const btnText = this.autoFeedButton.getData('text') as Phaser.GameObjects.Text;

    btnBg.clear();
    btnBg.fillStyle(newState ? 0x059669 : 0x374151, 0.9);
    btnBg.fillRoundedRect(-50, -22, 100, 44, 22);
    btnBg.lineStyle(2, newState ? 0x34d399 : 0x6b7280, 0.8);
    btnBg.strokeRoundedRect(-50, -22, 100, 44, 22);

    btnText.setText(newState ? '✓ 自动补料' : '✗ 自动补料');
    btnText.setColor(newState ? '#a7f3d0' : '#9ca3af');

    this.updateInventoryDisplay();
  }

  private createSaveStatus(): void {
    this.saveStatusText = this.add.text(GAME_WIDTH / 2, 227, '💾 自动保存中', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#86efac'
    }).setOrigin(0.5);
  }

  private startAutoSave(): void {
    this.autoSaveTimer = this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => {
        if (!this.isCompleted && !this.loadingGameState) {
          this.saveGameState();
        }
      }
    });
  }

  private saveGameState(): void {
    const gameState: GameState = {
      petals: [],
      inventory: this.synthesisSystem.getInventoryCopy(),
      score: this.score,
      awakeProgress: this.awakeProgress,
      totalPetalsCollected: this.totalPetalsCollected,
      synthesisCount: this.synthesisCount,
      playTime: Math.floor((Date.now() - this.startTime) / 1000),
      isCompleted: this.isCompleted
    };

    const petalDataArray: PetalType[] = [];
    this.petals.forEach((container) => {
      const data = this.petalData.get(container);
      if (data && !data.collected) {
        petalDataArray.push({ ...data, x: container.x, y: container.y });
      }
    });

    const success = this.saveManager.saveGameState(gameState, petalDataArray);
    if (success && this.saveStatusText) {
      this.saveStatusText.setText('💾 已保存 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
      this.saveStatusText.setColor('#86efac');

      this.time.delayedCall(2000, () => {
        if (this.saveStatusText) {
          this.saveStatusText.setText('💾 自动保存中');
          this.saveStatusText.setColor('#a78bfa');
        }
      });
    }
  }

  private loadGameState(): void {
    this.loadingGameState = true;
    const saved = this.saveManager.loadGameState();

    if (!saved) {
      this.loadingGameState = false;
      this.spawnInitialPetals();
      return;
    }

    const { gameState, petals } = saved;

    this.score = gameState.score;
    this.awakeProgress = gameState.awakeProgress;
    this.totalPetalsCollected = gameState.totalPetalsCollected;
    this.synthesisCount = gameState.synthesisCount;
    this.isCompleted = gameState.isCompleted;
    this.startTime = Date.now() - (gameState.playTime * 1000);

    this.synthesisSystem.setInventory(gameState.inventory);

    this.petals.forEach(p => p.destroy());
    this.petals = [];
    this.petalData.clear();

    petals.forEach(petalData => {
      const petalContainer = this.add.container(petalData.x, petalData.y);
      this.petalData.set(petalContainer, { ...petalData });
      this.petals.push(petalContainer);
      this.createPetalVisual(petalContainer, petalData.color, petalData.tier);
      this.animationManager.playPetalFloat(petalContainer);

      if (this.physics.world) {
        this.physics.add.existing(petalContainer);
        const body = petalContainer.body as Phaser.Physics.Arcade.Body;
        body.setCircle(25);
        body.setAllowGravity(false);
      }
    });

    this.updateScore();
    this.updateProgressBar();
    this.updateInventoryDisplay();

    this.loadingGameState = false;
    console.log('[GameScene] 游戏状态已加载');
  }

  private spawnInitialPetals(): void {
    for (let i = 0; i < 6; i++) {
      this.spawnPetal();
    }
  }

  private startPetalSpawner(): void {
    this.spawnTimer = this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        if (this.petals.length < 15 && !this.isCompleted) {
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

    const scoreGain = data.tier * 15 + (data.color === 'gold' ? 30 : 0);
    this.score += scoreGain;
    this.updateScore();

    const progressGain = data.tier * 2.5;
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

  private onColorSlotClick(color: PetalColor): void {
    if (this.isSynthesizing || this.animationManager.isPlaying()) {
      return;
    }

    const lowestTier = this.getLowestSynthesizableTier(color);
    const canAutoFeed = lowestTier === null && this.synthesisSystem.canAutoFeedFor(1, color);

    if (lowestTier === null && !canAutoFeed) {
      const slot = this.inventorySlots.get(color);
      if (slot) {
        this.animationManager.playShake(slot);
        this.audioManager.playSynthesisFail();
        this.animationManager.playSynthesisFailEffect(slot.x + GAME_WIDTH / 2, slot.y + GAME_HEIGHT - 720, '材料不足');
      }
      return;
    }

    const startTier = lowestTier ?? 1;
    this.isSynthesizing = true;

    const result = this.synthesisSystem.tryContinuousSynthesize(startTier, color, 20, true);

    if (result.success) {
      this.synthesisCount += result.totalSynthesized;

      let totalScore = 0;
      let totalProgress = 0;
      result.outputs.forEach((output) => {
        totalScore += output.tier * 100 * output.count;
        totalProgress += output.tier * 4 * output.count;
      });
      this.score += totalScore;
      this.awakeProgress = Math.min(AWAKEN_GOAL, this.awakeProgress + totalProgress);
      this.updateScore();
      this.updateProgressBar();

      if (result.autoFedCount > 0) {
        this.audioManager.playAutoFeed(result.autoFedCount);
        const slot = this.inventorySlots.get(color);
        if (slot) {
          this.animationManager.playAutoFeedEffect(
            slot.x + GAME_WIDTH / 2 - 100,
            slot.y + GAME_HEIGHT - 720,
            slot.x + GAME_WIDTH / 2,
            slot.y + GAME_HEIGHT - 720,
            color,
            result.autoFedCount
          );
        }
      }

      for (let i = 0; i < result.chainLength; i++) {
        const outputTier = result.outputs.find((o, idx) => {
          const countBefore = result.outputs.slice(0, idx).reduce((sum, o2) => sum + o2.count, 0);
          return i >= countBefore && i < countBefore + o.count;
        });

        this.audioManager.playSynthesisChain(i, result.chainLength, outputTier?.tier);

        this.animationManager.playSynthesisEffectChain(
          GAME_WIDTH / 2,
          GAME_HEIGHT - 720 + 35,
          color,
          i,
          result.chainLength,
          outputTier?.tier
        );
      }

      const slot = this.inventorySlots.get(color);
      if (slot) {
        this.animationManager.playInventoryUpdateEffect(
          slot.x + GAME_WIDTH / 2,
          slot.y + GAME_HEIGHT - 720,
          color,
          true
        );
      }

      this.updateInventoryDisplay();

      const totalDelay = this.animationManager.calculateChainDelay(0, result.chainLength) * result.chainLength + 1000;
      this.time.delayedCall(totalDelay, () => {
        this.isSynthesizing = false;
        if (this.awakeProgress >= AWAKEN_GOAL && !this.isCompleted) {
          this.isCompleted = true;
          this.time.delayedCall(600, () => this.endGame(true));
        }
      });
    } else {
      this.isSynthesizing = false;
      const slot = this.inventorySlots.get(color);
      if (slot) this.animationManager.playShake(slot);
      this.audioManager.playSynthesisFail();
    }
  }

  private onRainbowConvertClick(): void {
    if (this.isSynthesizing || this.animationManager.isPlaying()) {
      return;
    }

    if (!this.synthesisSystem.canMakeRainbow()) {
      const btn = this.inventorySlots.get('rainbow_btn');
      if (btn) {
        this.animationManager.playShake(btn);
        this.audioManager.playSynthesisFail();
        this.animationManager.playSynthesisFailEffect(btn.x + GAME_WIDTH / 2, btn.y + GAME_HEIGHT - 720, '材料不足');
      }
      return;
    }

    this.isSynthesizing = true;

    const result = this.synthesisSystem.tryRainbowContinuousSynthesize(20);

    if (result.success) {
      this.synthesisCount += result.totalSynthesized;

      let totalScore = 0;
      let totalProgress = 0;
      result.outputs.forEach((output) => {
        totalScore += output.tier * 100 * output.count;
        totalProgress += output.tier * 4 * output.count;
      });
      this.score += totalScore;
      this.awakeProgress = Math.min(AWAKEN_GOAL, this.awakeProgress + totalProgress);
      this.updateScore();
      this.updateProgressBar();

      for (let i = 0; i < result.chainLength; i++) {
        const outputTier = result.outputs.find((o, idx) => {
          const countBefore = result.outputs.slice(0, idx).reduce((sum, o2) => sum + o2.count, 0);
          return i >= countBefore && i < countBefore + o.count;
        });

        this.audioManager.playSynthesisChain(i, result.chainLength, outputTier?.tier);

        this.animationManager.playSynthesisEffectChain(
          GAME_WIDTH / 2 + 280,
          GAME_HEIGHT - 720 - 25,
          'rainbow',
          i,
          result.chainLength,
          outputTier?.tier
        );
      }

      const btn = this.inventorySlots.get('rainbow_btn');
      if (btn) {
        this.animationManager.playInventoryUpdateEffect(
          btn.x + GAME_WIDTH / 2,
          btn.y + GAME_HEIGHT - 720,
          'rainbow',
          true
        );
      }

      this.updateInventoryDisplay();

      const totalDelay = this.animationManager.calculateChainDelay(0, result.chainLength) * result.chainLength + 1000;
      this.time.delayedCall(totalDelay, () => {
        this.isSynthesizing = false;
        if (this.awakeProgress >= AWAKEN_GOAL && !this.isCompleted) {
          this.isCompleted = true;
          this.time.delayedCall(600, () => this.endGame(true));
        }
      });
    } else {
      this.isSynthesizing = false;
      const btn = this.inventorySlots.get('rainbow_btn');
      if (btn) this.animationManager.playShake(btn);
      this.audioManager.playSynthesisFail();
    }
  }

  private getLowestSynthesizableTier(color: PetalColor): PetalTier | null {
    const needCount = color === 'rainbow' ? 2 : 3;
    const startTier: PetalTier = color === 'rainbow' ? 2 : 1;
    for (let tier: PetalTier = startTier; tier <= 4; tier = (tier + 1) as PetalTier) {
      if (this.synthesisSystem.getItemCount(tier, color) >= needCount) {
        return tier;
      }
    }
    return null;
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
    const colors: PetalColor[] = ['pink', 'blue', 'purple', 'gold', 'rainbow'];

    colors.forEach((color) => {
      const slot = this.inventorySlots.get(color);
      if (!slot) return;

      const bg = slot.getData('bg') as Phaser.GameObjects.Graphics;
      slot.each((child: Phaser.GameObjects.GameObject) => {
        if (child !== bg) child.destroy();
      });

      const highestTier = this.synthesisSystem.getColorHighestTier(color);
      const totalCount = this.synthesisSystem.getColorTotalCount(color);

      if (highestTier && totalCount > 0) {
        this.createPetalVisual(slot, color, highestTier);
        slot.setScale(0.6);

        const countBg = this.add.graphics();
        countBg.fillStyle(0x7c3aed, 0.95);
        countBg.fillRoundedRect(25, 28, 48, 28, 14);
        slot.add(countBg);

        const countText = this.add.text(49, 42, `×${totalCount}`, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '18px',
          color: '#fef3c7',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        slot.add(countText);

        const tierText = this.add.text(0, -50, `Lv.${highestTier}`, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '16px',
          color: '#fde68a',
          fontStyle: 'bold',
          backgroundColor: '#1e1b4b',
          padding: { x: 8, y: 2 }
        }).setOrigin(0.5);
        slot.add(tierText);
      } else {
        const emptyText = this.add.text(0, 10, '空', {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '20px',
          color: '#6366f1'
        }).setOrigin(0.5);
        slot.add(emptyText);
      }
    });
  }

  private endGame(victory: boolean): void {
    this.spawnTimer?.destroy();
    this.autoSaveTimer?.destroy();
    this.animationManager.cancelAllAnimations();
    this.audioManager.stopAll();
    this.playerController.destroy();

    const playTime = Math.floor((Date.now() - this.startTime) / 1000);

    this.saveManager.saveProgress({
      score: this.score,
      progress: this.awakeProgress,
      playTime,
      victory
    });

    this.saveManager.clearGameState();

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
