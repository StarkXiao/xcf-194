import Phaser from 'phaser';
import { PlayerController } from '../controller/PlayerController';
import { SynthesisSystem } from '../systems/SynthesisSystem';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { AnimationManager } from '../managers/AnimationManager';
import { EventManager } from '../managers/EventManager';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  AWAKEN_GOAL,
  Petal,
  PetalTier,
  PetalColor,
  PetalVariant,
  PETAL_COLORS,
  PETAL_VARIANTS,
  PETAL_VARIANT_NAMES,
  PETAL_VARIANT_COLOR_MAP,
  PETAL_VARIANT_EMOJI,
  GameState,
  Petal as PetalType,
  RegionId,
  RegionConfig,
  REGION_CONFIGS,
  CollectionPathPoint,
  SynthesisLogEntry,
  RewardSource,
  ReplayData,
  PermanentBonuses
} from '../types';

export class GameScene extends Phaser.Scene {
  private playerController!: PlayerController;
  private synthesisSystem!: SynthesisSystem;
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;
  private animationManager!: AnimationManager;
  private eventManager!: EventManager;

  private petals: Phaser.GameObjects.Container[] = [];
  private petalData: Map<Phaser.GameObjects.Container, Petal> = new Map();
  private awakeProgress: number = 0;
  private score: number = 0;
  private eventBonusScore: number = 0;
  private eventSynthesisBonus: number = 0;
  private eventRarePetalsGranted: number = 0;
  private eventInitialized: boolean = false;
  private loadedAppliedEventBonus: number = 0;
  private loadedAppliedEventRare: number = 0;
  private loadedAppliedEventSynth: number = 0;
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

  private mutationCount: number = 0;
  private mutationButton!: Phaser.GameObjects.Container;
  private mutationPanel!: Phaser.GameObjects.Container;
  private mutationPanelVisible: boolean = false;
  private variantSlots: Map<string, Phaser.GameObjects.Container> = new Map();

  private loadingGameState: boolean = false;

  private unlockedRegions: RegionId[] = ['initial'];
  private rarePetalsCollected: number = 0;
  private regionIndicator!: Phaser.GameObjects.Container;
  private regionBgGraphics!: Phaser.GameObjects.Graphics;
  private unlockNotificationContainer!: Phaser.GameObjects.Container;
  private guideText!: Phaser.GameObjects.Text;
  private currentBgRegion: RegionId = 'initial';
  private nextRegionHintText!: Phaser.GameObjects.Text;

  private collectionPath: CollectionPathPoint[] = [];
  private synthesisLog: SynthesisLogEntry[] = [];
  private rewardSources: RewardSource[] = [];
  private petalsByColor: Map<PetalColor, number> = new Map();
  private petalsByRegion: Map<RegionId, number> = new Map();
  private pathTrackingTimer!: Phaser.Time.TimerEvent;
  private highestSynthesisTier: PetalTier = 1;
  private permanentBonuses!: PermanentBonuses;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.saveManager = SaveManager.getInstance();
    this.audioManager = AudioManager.getInstance(this);
    this.animationManager = AnimationManager.getInstance(this);
    this.eventManager = EventManager.getInstance();
    this.synthesisSystem = new SynthesisSystem();
    this.playerController = new PlayerController(this);
    this.startTime = Date.now();

    this.permanentBonuses = this.saveManager.getPermanentBonuses();

    if (this.eventManager.isEventActive()) {
      this.eventBonusScore = this.saveManager.getCurrentSave().eventBonusScore;
      this.eventSynthesisBonus = this.saveManager.getEventSynthesisBonus();
    }

    this.createBackground();
    this.createLover();
    this.createHUD();
    this.createRegionIndicator();
    this.createGuideText();
    this.createInventory();
    this.createBackButton();
    this.createAutoFeedButton();
    this.createMutationButton();
    this.createMutationPanel();
    this.createSaveStatus();
    this.playerController.create(this.cameras.main.width / 2, this.cameras.main.height - 450);

    const initData = this.scene.settings.data as { loadSave?: boolean } | undefined;
    if (initData?.loadSave && this.saveManager.hasGameState()) {
      this.loadGameState();
      this.applyEventBonuses(false);
    } else {
      this.applyPermanentStartBonuses();
      this.applyEventBonuses(true);
      this.spawnInitialPetals();
    }

    this.startPetalSpawner();
    this.startAutoSave();
    this.startPathTracking();
    this.setupCollisions();

    const validation = this.synthesisSystem.validateInventory();
    if (!validation.valid) {
      console.warn('[GameScene] 背包校验发现问题:', validation.issues);
      this.updateInventoryDisplay();
    }
  }

  private applyEventBonuses(isNewGame: boolean): void {
    if (!this.eventManager.isEventActive()) return;
    if (this.eventInitialized) return;
    this.eventInitialized = true;

    const saveData = this.saveManager.getCurrentSave();

    let deltaScore = 0;
    let deltaRare = 0;
    let deltaSynth = 0;

    if (isNewGame) {
      deltaScore = saveData.eventBonusScore;
      deltaRare = saveData.eventRarePetals;
      deltaSynth = saveData.eventSynthesisBonus;
    } else {
      deltaScore = Math.max(0, saveData.eventBonusScore - this.loadedAppliedEventBonus);
      deltaRare = Math.max(0, saveData.eventRarePetals - this.loadedAppliedEventRare);
      deltaSynth = Math.max(0, saveData.eventSynthesisBonus - this.loadedAppliedEventSynth);
      console.log('[GameScene] 继续游戏 活动奖励差值:', {
        deltaScore, deltaRare, deltaSynth,
        saveBonus: saveData.eventBonusScore, loaded: this.loadedAppliedEventBonus
      });
    }

    if (deltaScore > 0) {
      this.score += deltaScore;
      this.eventBonusScore = saveData.eventBonusScore;
      this.updateScore();
      console.log('[GameScene] 活动奖励分数已应用: +', deltaScore, '当前总分:', this.score);
    } else {
      this.eventBonusScore = saveData.eventBonusScore;
    }

    if (deltaRare > 0) {
      for (let i = 0; i < deltaRare; i++) {
        this.synthesisSystem.addToInventory(2 as PetalTier, 'rainbow');
      }
      this.eventRarePetalsGranted = saveData.eventRarePetals;
      this.totalPetalsCollected += deltaRare;
      this.rarePetalsCollected += deltaRare;
      this.updateInventoryDisplay();
      console.log('[GameScene] 活动稀有花瓣已加入背包: +', deltaRare, '个彩虹L2花瓣');
    } else {
      this.eventRarePetalsGranted = saveData.eventRarePetals;
    }

    if (deltaSynth > 0) {
      this.eventSynthesisBonus = saveData.eventSynthesisBonus;
      console.log('[GameScene] 活动合成加成已更新: +', deltaSynth, '总加成:', saveData.eventSynthesisBonus);
    } else {
      this.eventSynthesisBonus = saveData.eventSynthesisBonus;
    }

    if (deltaScore > 0 || deltaRare > 0 || deltaSynth > 0) {
      this.time.delayedCall(1500, () => {
        const msgs: string[] = [];
        if (deltaScore > 0) msgs.push(`+${deltaScore}分`);
        if (deltaRare > 0) msgs.push(`💎×${deltaRare}`);
        if (deltaSynth > 0) msgs.push(`⚡+${deltaSynth}加成`);
        const prefix = isNewGame ? '🎉 活动奖励已生效:' : '🎁 新增活动奖励:';
        if (msgs.length > 0) {
          this.showGuideText(`${prefix} ${msgs.join(' ')}`, 4000);
        }
      });
    }
  }

  private applyPermanentStartBonuses(): void {
    const bonuses = this.permanentBonuses;

    if (bonuses.startPetals > 0) {
      const colors: PetalColor[] = ['pink', 'blue', 'purple'];
      for (let i = 0; i < bonuses.startPetals; i++) {
        const color = colors[Phaser.Math.Between(0, colors.length - 1)];
        this.synthesisSystem.addToInventory(1, color);
        this.totalPetalsCollected++;
      }
      console.log('[GameScene] 永久增益·起始花瓣已赠送:', bonuses.startPetals, '个');
    }

    if (bonuses.autoFeedStartEnabled) {
      this.synthesisSystem.setAutoFeedEnabled(true);
      console.log('[GameScene] 永久增益·自动补料已自动开启');
    }

    if (bonuses.progressBonus > 0) {
      const bonusProgress = AWAKEN_GOAL * bonuses.progressBonus;
      this.awakeProgress = Math.min(AWAKEN_GOAL, this.awakeProgress + bonusProgress);
      console.log('[GameScene] 永久增益·唤醒进度加成已应用: +', bonusProgress.toFixed(1), '%');
    }

    const bonusMsgs: string[] = [];
    if (bonuses.startPetals > 0) bonusMsgs.push(`🌸×${bonuses.startPetals}`);
    if (bonuses.autoFeedStartEnabled) bonusMsgs.push('⚡自动补料');
    if (bonuses.progressBonus > 0) bonusMsgs.push(`💖+${Math.floor(bonuses.progressBonus * 100)}%`);
    if (bonuses.scoreMultiplier > 1) bonusMsgs.push(`✨×${bonuses.scoreMultiplier.toFixed(2)}`);
    if (bonuses.petalValueBonus > 0) bonusMsgs.push(`💎+${bonuses.petalValueBonus}分`);
    if (bonuses.rareChanceBonus > 0) bonusMsgs.push(`🌟稀有+${Math.floor(bonuses.rareChanceBonus * 100)}%`);
    if (bonuses.collectRadiusBonus > 0) bonusMsgs.push(`🧲范围+${bonuses.collectRadiusBonus}`);
    if (bonuses.spawnRateBonus > 0) bonusMsgs.push(`🌱生成+${Math.floor(bonuses.spawnRateBonus * 100)}%`);
    if (bonuses.maxPetalsBonus > 0) bonusMsgs.push(`🌺上限+${bonuses.maxPetalsBonus}`);

    if (bonusMsgs.length > 0) {
      this.time.delayedCall(2500, () => {
        this.showGuideText(`🌳 成长祝福: ${bonusMsgs.join(' ')}`, 6000);
      });
    }
  }

  private createBackground(): void {
    const config = this.getActiveRegionConfig();

    this.regionBgGraphics = this.add.graphics();
    this.renderRegionBackground(config);

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
      tree.fillGradientStyle(config.bgColors.treeColor, config.bgColors.treeColor, 0x0f0a1e, 0x0f0a1e, 0.9);
      tree.fillTriangle(x - 50, baseY, x + 50, baseY, x, baseY - treeHeight);
      tree.fillStyle(config.bgColors.leafColor, 0.5);
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

  private renderRegionBackground(config: RegionConfig): void {
    this.regionBgGraphics.clear();
    this.regionBgGraphics.fillGradientStyle(
      config.bgColors.sky1, config.bgColors.sky2,
      config.bgColors.ground1, config.bgColors.ground2, 1
    );
    this.regionBgGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const ground = this.regionBgGraphics;
    ground.fillGradientStyle(
      config.bgColors.ground1, config.bgColors.ground1,
      config.bgColors.ground2, config.bgColors.ground2, 1
    );
    ground.fillRoundedRect(0, GAME_HEIGHT - 250, GAME_WIDTH, 250, { tl: 80, tr: 80, bl: 0, br: 0 });
  }

  private getActiveRegionConfig(): RegionConfig {
    let activeConfig = REGION_CONFIGS[0];
    for (const config of REGION_CONFIGS) {
      if (this.awakeProgress >= config.unlockThreshold) {
        activeConfig = config;
      }
    }
    return activeConfig;
  }

  private createRegionIndicator(): void {
    this.regionIndicator = this.add.container(GAME_WIDTH - 100, 280);

    const bg = this.add.graphics();
    bg.fillStyle(0x1e1b4b, 0.9);
    bg.fillRoundedRect(-90, -18, 180, 36, 18);
    bg.lineStyle(2, 0xa78bfa, 0.7);
    bg.strokeRoundedRect(-90, -18, 180, 36, 18);
    this.regionIndicator.add(bg);

    const config = this.getActiveRegionConfig();
    const label = this.add.text(0, 0, `${config.emoji} ${config.name}`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.regionIndicator.add(label);
    this.regionIndicator.setData('label', label);
    this.regionIndicator.setData('bg', bg);
  }

  private updateRegionIndicator(): void {
    const config = this.getActiveRegionConfig();
    const label = this.regionIndicator.getData('label') as Phaser.GameObjects.Text;
    if (label) {
      label.setText(`${config.emoji} ${config.name}`);
    }
  }

  private updateNextRegionHint(): void {
    if (!this.nextRegionHintText) return;
    const nextRegion = REGION_CONFIGS.find(r => r.unlockThreshold > this.awakeProgress);
    const nextHint = nextRegion ? ` → ${nextRegion.unlockThreshold}% 解锁${nextRegion.name}` : '';
    this.nextRegionHintText.setText(nextHint);
  }

  private createGuideText(): void {
    this.guideText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 480, '', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#fde68a',
      fontStyle: 'bold',
      backgroundColor: '#1e1b4bcc',
      padding: { x: 16, y: 8 },
      align: 'center'
    }).setOrigin(0.5).setAlpha(0).setDepth(100);
  }

  private showGuideText(text: string, duration: number = 4000): void {
    this.guideText.setText(text);
    this.guideText.setAlpha(1);
    this.tweens.add({
      targets: this.guideText,
      alpha: 0,
      duration: 800,
      delay: duration,
      ease: 'Sine.easeOut'
    });
  }

  private checkRegionUnlocks(): void {
    for (const config of REGION_CONFIGS) {
      if (this.awakeProgress >= config.unlockThreshold && !this.unlockedRegions.includes(config.id)) {
        this.unlockedRegions.push(config.id);
        this.onRegionUnlocked(config);
      }
    }

    const activeConfig = this.getActiveRegionConfig();
    if (activeConfig.id !== this.currentBgRegion) {
      this.currentBgRegion = activeConfig.id;
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 800,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.renderRegionBackground(activeConfig);
        }
      });
      this.updateRegionIndicator();
    }

    this.updateNextRegionHint();
  }

  private onRegionUnlocked(config: RegionConfig): void {
    this.showRegionUnlockNotification(config);
    this.showGuideText(config.unlockGuide, 5000);
    this.audioManager.playVictory();

    if (this.eventManager.isEventActive()) {
      this.eventManager.updateTaskProgress('region', this.unlockedRegions.length);
    }

    if (config.id !== 'initial' && config.id !== 'eternal') {
      this.spawnRarePetal(config);
    }
  }

  private showRegionUnlockNotification(config: RegionConfig): void {
    if (this.unlockNotificationContainer) {
      this.unlockNotificationContainer.destroy(true);
    }

    this.unlockNotificationContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);
    this.unlockNotificationContainer.setDepth(200);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x0a0514, 0.5);
    overlay.fillRect(-GAME_WIDTH / 2, -80, GAME_WIDTH, 160);
    this.unlockNotificationContainer.add(overlay);

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.97);
    panel.fillRoundedRect(-280, -65, 560, 130, 20);
    panel.lineStyle(3, 0xfde68a, 0.9);
    panel.strokeRoundedRect(-280, -65, 560, 130, 20);
    this.unlockNotificationContainer.add(panel);

    const title = this.add.text(0, -35, `${config.emoji} 新区域开放！`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '28px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.unlockNotificationContainer.add(title);

    const name = this.add.text(0, 5, config.name, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.unlockNotificationContainer.add(name);

    const desc = this.add.text(0, 40, config.description, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#c4b5fd'
    }).setOrigin(0.5);
    this.unlockNotificationContainer.add(desc);

    this.unlockNotificationContainer.setScale(0.5);
    this.unlockNotificationContainer.setAlpha(0);
    this.tweens.add({
      targets: this.unlockNotificationContainer,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });

    this.time.delayedCall(3500, () => {
      if (this.unlockNotificationContainer) {
        this.tweens.add({
          targets: this.unlockNotificationContainer,
          alpha: 0,
          scale: 0.8,
          duration: 400,
          ease: 'Sine.easeIn',
          onComplete: () => {
            this.unlockNotificationContainer?.destroy(true);
            this.unlockNotificationContainer = null as any;
          }
        });
      }
    });
  }

  private spawnRarePetal(config: RegionConfig): void {
    const rule = config.spawnRule;
    if (!rule.rareColor || !rule.rareTier) return;

    const x = Phaser.Math.Between(60, GAME_WIDTH - 60);
    const y = Phaser.Math.Between(450, GAME_HEIGHT - 500);

    const petalData: Petal = {
      id: `rare_${Date.now()}_${Phaser.Math.Between(0, 10000)}`,
      tier: rule.rareTier,
      color: rule.rareColor,
      x,
      y,
      collected: false
    };

    const petalContainer = this.add.container(x, y);
    this.petalData.set(petalContainer, petalData);
    this.petals.push(petalContainer);

    this.createPetalVisual(petalContainer, rule.rareColor, rule.rareTier);
    this.animationManager.playPetalFloat(petalContainer);

    petalContainer.setScale(0);
    this.tweens.add({
      targets: petalContainer,
      scale: 1.3,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: petalContainer,
          scale: 1,
          duration: 200
        });
      }
    });

    if (this.physics.world) {
      this.physics.add.existing(petalContainer);
      const body = petalContainer.body as Phaser.Physics.Arcade.Body;
      body.setCircle(25);
      body.setAllowGravity(false);
    }

    this.registerPetalPhysics(petalContainer);
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

    const nextRegion = REGION_CONFIGS.find(r => r.unlockThreshold > this.awakeProgress);
    const nextHint = nextRegion ? ` → ${nextRegion.unlockThreshold}% 解锁${nextRegion.name}` : '';
    this.nextRegionHintText = this.add.text(230, 108, nextHint, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#a78bfa'
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

    const subtitle = this.add.text(0, -40, '3同色→升级 | 彩虹2→升级 | 粉蓝紫→彩虹 | 异色对→异变', {
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

  private createMutationButton(): void {
    this.mutationButton = this.add.container(GAME_WIDTH / 2, 260);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x7c3aed, 0.9);
    btnBg.fillRoundedRect(-80, -18, 160, 36, 18);
    btnBg.lineStyle(2, 0xfbbf24, 0.8);
    btnBg.strokeRoundedRect(-80, -18, 160, 36, 18);
    this.mutationButton.add(btnBg);
    this.mutationButton.setData('bg', btnBg);

    const btnText = this.add.text(0, 0, '🧬 异变合成', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.mutationButton.add(btnText);
    this.mutationButton.setData('text', btnText);

    this.mutationButton.setSize(160, 36);
    this.mutationButton.setInteractive();
    this.mutationButton.on('pointerdown', () => this.toggleMutationPanel());

    this.startMutationButtonGlow();
  }

  private startMutationButtonGlow(): void {
    this.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        if (this.isCompleted) return;
        const canMutate = this.synthesisSystem.canMutate();
        const bg = this.mutationButton.getData('bg') as Phaser.GameObjects.Graphics;
        if (bg) {
          bg.clear();
          const time = this.time.now / 1000;
          if (canMutate) {
            const pulse = 0.5 + Math.sin(time * 4) * 0.3;
            bg.fillStyle(0x9333ea, 0.8 + pulse * 0.2);
            bg.fillRoundedRect(-80, -18, 160, 36, 18);
            bg.lineStyle(3, 0xfbbf24, 0.7 + pulse * 0.3);
            bg.strokeRoundedRect(-80, -18, 160, 36, 18);
          } else {
            bg.fillStyle(0x4c1d95, 0.7);
            bg.fillRoundedRect(-80, -18, 160, 36, 18);
            bg.lineStyle(2, 0x7c3aed, 0.5);
            bg.strokeRoundedRect(-80, -18, 160, 36, 18);
          }
        }
      }
    });
  }

  private createMutationPanel(): void {
    this.mutationPanel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 500);
    this.mutationPanel.setDepth(300);
    this.mutationPanel.setAlpha(0);
    this.mutationPanel.setVisible(false);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1e1b4b, 0.97);
    panelBg.fillRoundedRect(-350, -180, 700, 360, 22);
    panelBg.lineStyle(3, 0xfbbf24, 0.8);
    panelBg.strokeRoundedRect(-350, -180, 700, 360, 22);
    this.mutationPanel.add(panelBg);

    const title = this.add.text(0, -155, '🧬 异变配方 · 同阶异色融合', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.mutationPanel.add(title);

    const subtitle = this.add.text(0, -128, '异色对→品种固定 | 量多→主色(决定产出色) | 等量→配置顺序优先', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#a78bfa'
    }).setOrigin(0.5);
    this.mutationPanel.add(subtitle);

    const recipeContainer = this.add.container(0, -70);
    const recipes: { colorA: PetalColor; colorB: PetalColor; variant: PetalVariant; name: string }[] = [
      { colorA: 'pink', colorB: 'gold', variant: 'flame', name: '烈焰' },
      { colorA: 'blue', colorB: 'purple', variant: 'frost', name: '寒霜' },
      { colorA: 'pink', colorB: 'blue', variant: 'nature', name: '自然' },
      { colorA: 'gold', colorB: 'purple', variant: 'shadow', name: '暗影' },
    ];

    const colorHexMap: Record<PetalColor, number> = {
      pink: 0xff9ec4, blue: 0x7dd3fc, purple: 0xc084fc, gold: 0xfcd34d, rainbow: 0xffffff
    };

    recipes.forEach((recipe, i) => {
      const rowY = Math.floor(i / 2) * 55;
      const colX = (i % 2 === 0 ? -1 : 1) * 165;

      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x312e81, 0.5);
      rowBg.fillRoundedRect(colX - 140, rowY - 22, 280, 44, 10);
      rowBg.lineStyle(1, PETAL_VARIANT_COLOR_MAP[recipe.variant], 0.6);
      rowBg.strokeRoundedRect(colX - 140, rowY - 22, 280, 44, 10);
      recipeContainer.add(rowBg);

      const dotA = this.add.graphics();
      dotA.fillStyle(colorHexMap[recipe.colorA], 1);
      dotA.fillCircle(colX - 110, rowY, 12);
      recipeContainer.add(dotA);

      const plusText = this.add.text(colX - 80, rowY, '+', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#a78bfa'
      }).setOrigin(0.5);
      recipeContainer.add(plusText);

      const dotB = this.add.graphics();
      dotB.fillStyle(colorHexMap[recipe.colorB], 1);
      dotB.fillCircle(colX - 50, rowY, 12);
      recipeContainer.add(dotB);

      const arrowText = this.add.text(colX - 15, rowY, '→', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#a78bfa'
      }).setOrigin(0.5);
      recipeContainer.add(arrowText);

      const emojiText = this.add.text(colX + 20, rowY, PETAL_VARIANT_EMOJI[recipe.variant], {
        fontSize: '18px'
      }).setOrigin(0.5);
      recipeContainer.add(emojiText);

      const nameText = this.add.text(colX + 65, rowY, recipe.name, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: '#fef3c7',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      recipeContainer.add(nameText);

      const tipText = this.add.text(colX + 115, rowY, '←量多/量等优先', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '9px',
        color: '#86efac'
      }).setOrigin(0.5);
      recipeContainer.add(tipText);
    });
    this.mutationPanel.add(recipeContainer);

    const variants: PetalVariant[] = ['flame', 'frost', 'shadow', 'nature'];
    variants.forEach((variant, i) => {
      const slotX = -240 + i * 160;
      const slotY = 50;
      const slot = this.add.container(slotX, slotY);

      const slotBg = this.add.graphics();
      const variantColor = PETAL_VARIANT_COLOR_MAP[variant];
      slotBg.fillStyle(0x312e81, 0.7);
      slotBg.fillRoundedRect(-70, -40, 140, 80, 14);
      slotBg.lineStyle(2, variantColor, 0.6);
      slotBg.strokeRoundedRect(-70, -40, 140, 80, 14);
      slot.add(slotBg);
      slot.setData('bg', slotBg);

      const emoji = this.add.text(0, -15, PETAL_VARIANT_EMOJI[variant], {
        fontSize: '24px'
      }).setOrigin(0.5);
      slot.add(emoji);

      const nameText = this.add.text(0, 10, PETAL_VARIANT_NAMES[variant], {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#fef3c7',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      slot.add(nameText);

      const countText = this.add.text(0, 30, '×0', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#a78bfa'
      }).setOrigin(0.5);
      slot.add(countText);
      slot.setData('countText', countText);

      slot.setSize(140, 80);
      this.variantSlots.set(variant, slot);
      this.mutationPanel.add(slot);
    });

    const oneClickBtn = this.add.container(0, 140);
    const clickBg = this.add.graphics();
    clickBg.fillStyle(0x9333ea, 0.9);
    clickBg.fillRoundedRect(-100, -22, 200, 44, 22);
    clickBg.lineStyle(2, 0xfbbf24, 0.8);
    clickBg.strokeRoundedRect(-100, -22, 200, 44, 22);
    oneClickBtn.add(clickBg);

    const clickText = this.add.text(0, 0, '⚡ 一键异变', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    oneClickBtn.add(clickText);

    oneClickBtn.setSize(200, 44);
    oneClickBtn.setInteractive();
    oneClickBtn.on('pointerdown', () => this.onMutateAllClick());
    this.mutationPanel.add(oneClickBtn);

    const closeBtn = this.add.container(330, -160);
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0x4c1d95, 0.9);
    closeBg.fillCircle(0, 0, 18);
    closeBg.lineStyle(2, 0xfbbf24, 0.8);
    closeBg.strokeCircle(0, 0, 18);
    closeBtn.add(closeBg);

    const closeText = this.add.text(0, 0, '✕', {
      fontSize: '18px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    closeBtn.add(closeText);

    closeBtn.setSize(36, 36);
    closeBtn.setInteractive();
    closeBtn.on('pointerdown', () => this.toggleMutationPanel());
    this.mutationPanel.add(closeBtn);
  }

  private toggleMutationPanel(): void {
    this.audioManager.playClick();

    if (this.mutationPanelVisible) {
      this.tweens.add({
        targets: this.mutationPanel,
        alpha: 0,
        y: GAME_HEIGHT - 460,
        duration: 250,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.mutationPanel.setVisible(false);
        }
      });
      this.mutationPanelVisible = false;
    } else {
      this.mutationPanel.setVisible(true);
      this.mutationPanel.setAlpha(0);
      this.mutationPanel.setY(GAME_HEIGHT - 460);
      this.updateMutationPanelDisplay();
      this.tweens.add({
        targets: this.mutationPanel,
        alpha: 1,
        y: GAME_HEIGHT - 500,
        duration: 300,
        ease: 'Back.easeOut'
      });
      this.mutationPanelVisible = true;
    }
  }

  private updateMutationPanelDisplay(): void {
    PETAL_VARIANTS.forEach(variant => {
      const slot = this.variantSlots.get(variant);
      if (!slot) return;
      const countText = slot.getData('countText') as Phaser.GameObjects.Text;
      if (countText) {
        const count = this.synthesisSystem.getVariantItemCount(variant);
        countText.setText(`×${count}`);
        countText.setColor(count > 0 ? '#fde68a' : '#a78bfa');
      }
    });
  }

  private onMutateAllClick(): void {
    if (this.isSynthesizing || this.animationManager.isPlaying()) return;

    const availableMutations = this.synthesisSystem.getAvailableMutations();
    if (availableMutations.length === 0) {
      this.audioManager.playSynthesisFail();
      this.showGuideText('异变材料不足，需要同阶异色花瓣', 3000);
      return;
    }

    this.isSynthesizing = true;

    const results = this.synthesisSystem.tryMutateAll();
    const successCount = results.filter(r => r.success).length;

    if (successCount > 0) {
      this.mutationCount += successCount;
      this.synthesisCount += successCount;
      this.audioManager.playSynthesisChain(0, successCount, 3);

      let totalScore = 0;
      let totalProgress = 0;
      results.forEach(result => {
        if (result.success && result.output) {
          const baseScore = result.output.tier * 150 * result.output.count;
          const baseProgress = result.output.tier * 5 * result.output.count;
          totalScore += baseScore;
          totalProgress += baseProgress;
        }
      });

      totalScore += this.permanentBonuses.synthesisScoreBonus * successCount;
      totalScore = Math.floor(totalScore * this.permanentBonuses.scoreMultiplier);
      totalProgress = Math.floor(totalProgress * (1 + this.permanentBonuses.progressBonus));

      this.score += totalScore;
      this.awakeProgress = Math.min(AWAKEN_GOAL, this.awakeProgress + totalProgress);
      this.updateScore();
      this.updateProgressBar();
      this.checkRegionUnlocks();

      if (totalScore > 0) {
        this.rewardSources.push({
          label: `🧬 异变合成·x${successCount}`,
          score: totalScore,
          color: 'purple'
        });
      }

      this.updateInventoryDisplay();
      this.updateMutationPanelDisplay();

      this.showGuideText(`🧬 异变成功！${successCount} 次异变 +${totalScore}分`, 3000);

      this.animationManager.playSynthesisEffectChain(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 500,
        'purple',
        0,
        successCount,
        3
      );

      this.time.delayedCall(1500, () => {
        this.isSynthesizing = false;
        if (this.awakeProgress >= AWAKEN_GOAL && !this.isCompleted) {
          this.isCompleted = true;
          this.time.delayedCall(600, () => this.endGame(true));
        }
      });
    } else {
      this.isSynthesizing = false;
      this.audioManager.playSynthesisFail();
    }
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

  private startPathTracking(): void {
    this.pathTrackingTimer = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        if (this.isCompleted) return;
        const pos = this.playerController.getPosition();
        this.collectionPath.push({ x: pos.x, y: pos.y, t: Date.now() });
        if (this.collectionPath.length > 3000) {
          this.collectionPath = this.collectionPath.slice(-2000);
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
      isCompleted: this.isCompleted,
      unlockedRegions: [...this.unlockedRegions],
      rarePetalsCollected: this.rarePetalsCollected,
      appliedEventBonusScore: this.eventBonusScore,
      appliedEventRarePetals: this.eventRarePetalsGranted,
      appliedEventSynthesisBonus: this.eventSynthesisBonus,
      mutationCount: this.mutationCount
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

    const { gameState, petals, isLegacyEventSave } = saved;

    this.score = gameState.score;
    this.awakeProgress = gameState.awakeProgress;
    this.totalPetalsCollected = gameState.totalPetalsCollected;
    this.synthesisCount = gameState.synthesisCount;
    this.isCompleted = gameState.isCompleted;
    this.startTime = Date.now() - (gameState.playTime * 1000);
    this.unlockedRegions = gameState.unlockedRegions ?? ['initial'];
    this.rarePetalsCollected = gameState.rarePetalsCollected ?? 0;
    this.currentBgRegion = this.getActiveRegionConfig().id;

    const currentSave = this.saveManager.getCurrentSave();

    if (isLegacyEventSave) {
      this.loadedAppliedEventBonus = currentSave.eventBonusScore;
      this.loadedAppliedEventRare = currentSave.eventRarePetals;
      this.loadedAppliedEventSynth = currentSave.eventSynthesisBonus;
      console.log('[GameScene] 检测到旧存档，活动奖励已视为完全计入存档以避免重复叠加:', {
        loadedAppliedEventBonus: this.loadedAppliedEventBonus,
        loadedAppliedEventRare: this.loadedAppliedEventRare,
        loadedAppliedEventSynth: this.loadedAppliedEventSynth
      });
    } else {
      this.loadedAppliedEventBonus = gameState.appliedEventBonusScore ?? 0;
      this.loadedAppliedEventRare = gameState.appliedEventRarePetals ?? 0;
      this.loadedAppliedEventSynth = gameState.appliedEventSynthesisBonus ?? 0;
      console.log('[GameScene] 读档已应用活动奖励:', {
        bonusScore: this.loadedAppliedEventBonus,
        rare: this.loadedAppliedEventRare,
        synth: this.loadedAppliedEventSynth
      });
    }

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

      this.registerPetalPhysics(petalContainer);
    });

    this.updateScore();
    this.updateProgressBar();
    this.updateInventoryDisplay();

    const activeConfig = this.getActiveRegionConfig();
    this.currentBgRegion = activeConfig.id;
    this.renderRegionBackground(activeConfig);
    this.updateRegionIndicator();
    this.updateNextRegionHint();

    this.loadingGameState = false;
    console.log('[GameScene] 游戏状态已加载');
  }

  private spawnInitialPetals(): void {
    for (let i = 0; i < 6; i++) {
      this.spawnPetal();
    }
  }

  private startPetalSpawner(): void {
    const baseDelay = 1500;
    const adjustedDelay = Math.max(500, baseDelay * (1 - this.permanentBonuses.spawnRateBonus));
    const maxPetals = 15 + this.permanentBonuses.maxPetalsBonus;

    this.spawnTimer = this.time.addEvent({
      delay: adjustedDelay,
      loop: true,
      callback: () => {
        if (this.petals.length < maxPetals && !this.isCompleted) {
          this.spawnPetal();
        }
      }
    });
  }

  private spawnPetal(): void {
    const config = this.getActiveRegionConfig();
    const rule = config.spawnRule;

    const x = Phaser.Math.Between(60, GAME_WIDTH - 60);
    const y = Phaser.Math.Between(450, GAME_HEIGHT - 500);

    let tier: PetalTier = 1;
    let color: PetalColor;
    const rareChanceBonus = this.permanentBonuses.rareChanceBonus;
    const adjustedRareChance = Math.min(0.5, rule.rareChance + rareChanceBonus);

    if (rule.rareChance > 0 && rule.rareColor && rule.rareTier && Math.random() < adjustedRareChance) {
      tier = rule.rareTier;
      color = rule.rareColor;
    } else {
      color = rule.colors[Phaser.Math.Between(0, rule.colors.length - 1)];
      if (rule.maxTier > 1 && Math.random() < 0.2) {
        tier = Phaser.Math.Between(1, Math.min(rule.maxTier, 2)) as PetalTier;
      }
    }

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

    this.registerPetalPhysics(petalContainer);
  }

  private createPetalVisual(container: Phaser.GameObjects.Container, color: PetalColor, tier: PetalTier, variant?: PetalVariant): void {
    container.removeAll(true);

    const colorMap: Record<PetalColor, number> = {
      pink: 0xff9ec4,
      blue: 0x7dd3fc,
      purple: 0xc084fc,
      gold: 0xfcd34d,
      rainbow: 0xffffff
    };

    const glowColor = variant ? PETAL_VARIANT_COLOR_MAP[variant] : colorMap[color];
    const size = 18 + tier * 4;

    if (variant) {
      const outerGlow = this.add.graphics();
      outerGlow.fillStyle(colorMap[color], 0.15);
      outerGlow.fillCircle(0, 0, size + 26);
      outerGlow.fillStyle(glowColor, 0.3);
      outerGlow.fillCircle(0, 0, size + 18);
      outerGlow.fillStyle(glowColor, 0.45);
      outerGlow.fillCircle(0, 0, size + 8);
      container.add(outerGlow);
    } else {
      const glow = this.add.graphics();
      glow.fillStyle(glowColor, 0.25);
      glow.fillCircle(0, 0, size + 18);
      glow.fillStyle(glowColor, 0.4);
      glow.fillCircle(0, 0, size + 8);
      container.add(glow);
    }

    const petal = this.add.graphics();
    if (variant) {
      petal.fillStyle(colorMap[color], 0.7);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        petal.slice(px, py, size * 0.65, 0, Math.PI * 2);
      }
      petal.fillPath();
      petal.fillStyle(glowColor, 0.85);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * size * 0.7;
        const py = Math.sin(angle) * size * 0.7;
        petal.slice(px, py, size * 0.45, 0, Math.PI * 2);
      }
      petal.fillPath();
    } else {
      petal.fillStyle(glowColor, 1);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        petal.slice(px, py, size * 0.65, 0, Math.PI * 2);
      }
      petal.fillPath();
    }

    petal.fillStyle(0xffffff, variant ? 0.9 : 0.85);
    petal.fillCircle(0, 0, size * 0.35);
    container.add(petal);

    for (let t = 2; t <= tier; t++) {
      const star = this.add.graphics();
      star.fillStyle(variant ? glowColor : 0xfef08a, 1);
      const sa = ((t - 2) / 4) * Math.PI * 2;
      star.fillCircle(Math.cos(sa) * (size + 12), Math.sin(sa) * (size + 12), 3);
      container.add(star);
    }
  }

  private playerPhysicsBody: Phaser.Physics.Arcade.Body | null = null;
  private lastSprintState: boolean = false;
  private petalPhysicsGroup: Phaser.Physics.Arcade.Group | null = null;
  private collectedByPhysicsThisFrame: Set<Phaser.GameObjects.Container> = new Set();

  private setupCollisions(): void {
    if (!this.physics.world) return;

    this.petalPhysicsGroup = this.physics.add.group({
      allowGravity: false,
      immovable: false
    });

    this.petals.forEach(petal => {
      this.registerPetalPhysics(petal);
    });

    const playerContainer = this.playerController.getContainer();
    if (playerContainer) {
      this.physics.add.existing(playerContainer);
      this.playerPhysicsBody = playerContainer.body as Phaser.Physics.Arcade.Body;
      if (this.playerPhysicsBody) {
        const initialRadius = this.playerController.getSprintCollisionRadius();
        this.playerPhysicsBody.setCircle(initialRadius, -initialRadius, -initialRadius);
        this.playerPhysicsBody.setAllowGravity(false);
        this.playerPhysicsBody.setImmovable(true);
        this.playerPhysicsBody.enable = true;
        this.playerPhysicsBody.debugBodyColor = 0x00ff00;
      }
    }

    this.physics.add.overlap(
      playerContainer,
      this.petalPhysicsGroup,
      (playerObj, petalObj) => {
        const petal = petalObj as Phaser.GameObjects.Container;
        if (!this.collectedByPhysicsThisFrame.has(petal)) {
          this.collectedByPhysicsThisFrame.add(petal);
          const data = this.petalData.get(petal);
          if (data && !data.collected) {
            const playerPos = this.playerController.getPosition();
            const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, petal.x, petal.y);
            const baseCollectRadius = 70 + this.permanentBonuses.collectRadiusBonus;
            this.collectPetal(petal, dist / baseCollectRadius);
          }
        }
      },
      (playerObj, petalObj) => {
        const petal = petalObj as Phaser.GameObjects.Container;
        const data = this.petalData.get(petal);
        return data && !data.collected;
      }
    );

    this.physics.world.on('worldstep', () => {
      if (this.isCompleted) return;
      this.collectedByPhysicsThisFrame.clear();
      this.checkPetalCollection();
      this.syncPlayerCollisionBody();
    });
  }

  private registerPetalPhysics(petal: Phaser.GameObjects.Container): void {
    if (!this.petalPhysicsGroup) return;
    if (!petal.body) {
      this.physics.add.existing(petal);
    }
    this.petalPhysicsGroup.add(petal);
    const body = petal.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCircle(22, -22, -22);
      body.setAllowGravity(false);
      body.enable = true;
    }
  }

  private syncPlayerCollisionBody(): void {
    if (!this.playerPhysicsBody) return;

    const currentSprintState = this.playerController.isSprinting();
    if (currentSprintState !== this.lastSprintState) {
      const radius = this.playerController.getSprintCollisionRadius();
      this.playerPhysicsBody.setCircle(radius, -radius, -radius);
      this.lastSprintState = currentSprintState;
    }

    const pos = this.playerController.getPosition();
    this.playerPhysicsBody.position.x = pos.x - this.playerPhysicsBody.halfWidth;
    this.playerPhysicsBody.position.y = pos.y - this.playerPhysicsBody.halfHeight;
    this.playerPhysicsBody.updateCenter();
  }

  private checkPetalCollection(): void {
    const playerPos = this.playerController.getPosition();
    const baseCollectRadius = 70 + this.permanentBonuses.collectRadiusBonus;
    this.playerController.setCollectRadius(baseCollectRadius);

    const absorbRange = this.playerController.getAbsorbRange();
    const absorbStrength = this.playerController.getAbsorbStrength();

    let nearbyCount = 0;
    const absorbStartRadius = baseCollectRadius * 1.2;

    for (let i = this.petals.length - 1; i >= 0; i--) {
      const petal = this.petals[i];
      const data = this.petalData.get(petal);
      if (!data || data.collected) continue;

      const dx = playerPos.x - petal.x;
      const dy = playerPos.y - petal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < absorbStartRadius) {
        nearbyCount++;
      }

      if (dist < absorbRange && dist > baseCollectRadius) {
        const absorbFactor = Math.max(0, 1 - (dist - baseCollectRadius) / (absorbRange - baseCollectRadius));
        const pullStrength = absorbFactor * absorbStrength * 4.5;
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);

        petal.x += nx * pullStrength;
        petal.y += ny * pullStrength;

        if (petal.body) {
          const body = petal.body as Phaser.Physics.Arcade.Body;
          body.position.x = petal.x - body.halfWidth;
          body.position.y = petal.y - body.halfHeight;
          body.updateCenter();
        }

        const isAbsorbing = petal.getData('isAbsorbing');
        if (!isAbsorbing) {
          petal.setData('isAbsorbing', true);
          petal.setData('absorbStartScale', petal.scaleX || 1);
          this.animationManager.playAbsorbStartEffect(petal.x, petal.y, data.color);
        }

        const scalePulse = 1 + Math.sin(Date.now() / 100 + i) * 0.08;
        petal.setScale((petal.getData('absorbStartScale') || 1) * scalePulse * (1 + absorbFactor * 0.15));
      } else if (dist >= absorbRange) {
        if (petal.getData('isAbsorbing')) {
          petal.setData('isAbsorbing', false);
          const baseScale = petal.getData('absorbStartScale') || 1;
          this.tweens.add({
            targets: petal,
            scale: baseScale,
            duration: 200,
            ease: 'Sine.easeOut'
          });
        }
      }
    }

    this.playerController.updateNearbyPetalCount(nearbyCount);

    const activeRegion = this.getActiveRegionConfig().id;
    if (this.playerController.getCurrentTerrain() !== activeRegion) {
      this.playerController.setTerrain(activeRegion);
    }
  }

  private collectPetal(petal: Phaser.GameObjects.Container, distRatio: number = 1): void {
    const data = this.petalData.get(petal);
    if (!data || data.collected) return;

    data.collected = true;
    this.audioManager.playCollect();

    const isSprintCollect = this.playerController.isSprinting();
    const absorbIntensity = isSprintCollect ? 1.6 : (1 + (1 - Math.min(1, distRatio)) * 0.8);
    this.animationManager.playCollectEffect(petal.x, petal.y, data.color, absorbIntensity, isSprintCollect);

    if (this.petalPhysicsGroup && petal.body) {
      this.petalPhysicsGroup.remove(petal, false, true);
      const body = petal.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
    }

    this.synthesisSystem.addToInventory(data.tier, data.color);
    this.totalPetalsCollected++;

    const colorCount = this.petalsByColor.get(data.color) ?? 0;
    this.petalsByColor.set(data.color, colorCount + 1);

    const activeRegion = this.getActiveRegionConfig().id;
    const regionCount = this.petalsByRegion.get(activeRegion) ?? 0;
    this.petalsByRegion.set(activeRegion, regionCount + 1);

    const config = this.getActiveRegionConfig();
    const isRare = config.spawnRule.rareColor === data.color && config.spawnRule.rareTier === data.tier;
    if (isRare) {
      this.rarePetalsCollected++;
    }

    if (this.eventManager.isEventActive()) {
      this.eventManager.updateTaskProgress('collect', 1);
      if (isRare) {
        this.eventManager.updateTaskProgress('rare', 1);
      }
    }

    const baseScoreGain = data.tier * 15 + (data.color === 'gold' ? 30 : 0) + (isRare ? 50 : 0);
    let scoreGain = baseScoreGain + this.permanentBonuses.petalValueBonus;
    scoreGain = Math.floor(scoreGain * this.permanentBonuses.scoreMultiplier);
    this.score += scoreGain;
    this.updateScore();

    const sourceLabel = isRare ? `💎 稀有·${data.color}` : `🌸 采集·${data.color}·T${data.tier}`;
    this.rewardSources.push({ label: sourceLabel, score: scoreGain, color: data.color });

    const progressGain = data.tier * 2.5 + (isRare ? 5 : 0);
    this.awakeProgress = Math.min(AWAKEN_GOAL, this.awakeProgress + progressGain);
    this.updateProgressBar();

    this.checkRegionUnlocks();

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
        if (petal.body) {
          (petal.body as Phaser.Physics.Arcade.Body).destroy();
        }
        if (this.petalPhysicsGroup) {
          this.petalPhysicsGroup.remove(petal, false, false);
        }
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

      if (this.eventManager.isEventActive()) {
        this.eventManager.updateTaskProgress('synthesis', result.totalSynthesized);
      }

      let totalScore = 0;
      let totalProgress = 0;
      let bonusScore = 0;
      result.outputs.forEach((output) => {
        const baseScore = output.tier * 100 * output.count;
        const baseProgress = output.tier * 4 * output.count;
        totalScore += baseScore;
        totalProgress += baseProgress;
        if (this.eventSynthesisBonus > 0) {
          bonusScore += Math.floor(baseScore * 0.5 * this.eventSynthesisBonus);
          totalProgress += Math.floor(baseProgress * 0.3 * this.eventSynthesisBonus);
        }
        this.synthesisLog.push({
          tier: (output.tier - 1) as PetalTier,
          color: output.color,
          outputTier: output.tier,
          outputColor: output.color,
          t: Date.now()
        });
        if (output.tier > this.highestSynthesisTier) {
          this.highestSynthesisTier = output.tier;
        }
      });
      totalScore += this.permanentBonuses.synthesisScoreBonus * result.totalSynthesized;
      totalScore = Math.floor(totalScore * this.permanentBonuses.scoreMultiplier) + bonusScore;
      totalProgress = Math.floor(totalProgress * (1 + this.permanentBonuses.progressBonus));
      this.score += totalScore;
      this.awakeProgress = Math.min(AWAKEN_GOAL, this.awakeProgress + totalProgress);
      this.updateScore();
      this.updateProgressBar();
      this.checkRegionUnlocks();

      if (totalScore > 0) {
        const label = bonusScore > 0
          ? `⭐ 合成·${color}·x${result.totalSynthesized} (活动+${bonusScore})`
          : `⭐ 合成·${color}·x${result.totalSynthesized}`;
        this.rewardSources.push({
          label,
          score: totalScore,
          color
        });
      }

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

      if (this.eventManager.isEventActive()) {
        this.eventManager.updateTaskProgress('synthesis', result.totalSynthesized);
      }

      let totalScore = 0;
      let totalProgress = 0;
      let rainbowBonusScore = 0;
      result.outputs.forEach((output) => {
        const baseScore = output.tier * 100 * output.count;
        const baseProgress = output.tier * 4 * output.count;
        totalScore += baseScore;
        totalProgress += baseProgress;
        if (this.eventSynthesisBonus > 0) {
          rainbowBonusScore += Math.floor(baseScore * 0.5 * this.eventSynthesisBonus);
          totalProgress += Math.floor(baseProgress * 0.3 * this.eventSynthesisBonus);
        }
        this.synthesisLog.push({
          tier: (output.tier - 1) as PetalTier,
          color: 'rainbow',
          outputTier: output.tier,
          outputColor: output.color,
          t: Date.now()
        });
        if (output.tier > this.highestSynthesisTier) {
          this.highestSynthesisTier = output.tier;
        }
      });
      totalScore += this.permanentBonuses.synthesisScoreBonus * result.totalSynthesized;
      totalScore = Math.floor(totalScore * this.permanentBonuses.scoreMultiplier) + rainbowBonusScore;
      totalProgress = Math.floor(totalProgress * (1 + this.permanentBonuses.progressBonus));
      this.score += totalScore;
      this.awakeProgress = Math.min(AWAKEN_GOAL, this.awakeProgress + totalProgress);
      this.updateScore();
      this.updateProgressBar();
      this.checkRegionUnlocks();

      if (totalScore > 0) {
        const label = rainbowBonusScore > 0
          ? `🌈 彩虹合成·x${result.totalSynthesized} (活动+${rainbowBonusScore})`
          : `🌈 彩虹合成·x${result.totalSynthesized}`;
        this.rewardSources.push({
          label,
          score: totalScore,
          color: 'rainbow'
        });
      }

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
    this.audioManager.updateAwakeProgress(this.awakeProgress);
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
        const variantItems = this.synthesisSystem.getVariantItems().filter(i => i.color === color);
        const displayVariant = variantItems.length > 0 ? variantItems[0].variant : undefined;

        this.createPetalVisual(slot, color, highestTier, displayVariant);
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

        if (displayVariant) {
          const variantBadge = this.add.text(-45, -45, PETAL_VARIANT_EMOJI[displayVariant], {
            fontSize: '14px'
          }).setOrigin(0.5);
          slot.add(variantBadge);
        }
      } else {
        const emptyText = this.add.text(0, 10, '空', {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '20px',
          color: '#6366f1'
        }).setOrigin(0.5);
        slot.add(emptyText);
      }
    });

    this.updateMutationPanelDisplay();
  }

  private endGame(victory: boolean): void {
    this.spawnTimer?.destroy();
    this.autoSaveTimer?.destroy();
    this.pathTrackingTimer?.destroy();
    this.animationManager.cancelAllAnimations();
    this.audioManager.stopAll();
    this.audioManager.destroy();
    this.playerController.destroy();

    const playTime = Math.floor((Date.now() - this.startTime) / 1000);

    const petalsByColorArray = PETAL_COLORS.map(c => ({
      color: c,
      count: this.petalsByColor.get(c) ?? 0
    }));

    const petalsByRegionArray = REGION_CONFIGS.map(r => ({
      regionId: r.id,
      count: this.petalsByRegion.get(r.id) ?? 0
    }));

    const collectionRate = playTime > 0 ? (this.totalPetalsCollected / (playTime / 60)) : 0;
    const efficiencyScore = this.calculateEfficiencyScore(playTime);
    const peakRegion = this.getPeakRegion();

    const replayData: ReplayData = {
      collectionPath: [...this.collectionPath],
      synthesisLog: [...this.synthesisLog],
      rewardSources: [...this.rewardSources],
      petalsByColor: petalsByColorArray,
      petalsByRegion: petalsByRegionArray,
      efficiencyScore,
      peakRegion,
      highestSynthesisTier: this.highestSynthesisTier,
      collectionRate
    };

    const newlyUnlocked = this.saveManager.saveProgress({
      score: this.score,
      progress: this.awakeProgress,
      playTime,
      victory,
      petalsCollected: this.totalPetalsCollected,
      synthesisCount: this.synthesisCount,
      rareCollected: this.rarePetalsCollected,
      efficiencyScore
    });

    if (this.eventManager.isEventActive()) {
      this.eventManager.recordGameResult({
        score: this.score,
        petalsCollected: this.totalPetalsCollected,
        synthesisCount: this.synthesisCount,
        rareCollected: this.rarePetalsCollected,
        regionsUnlocked: this.unlockedRegions.length,
        playTime
      });
    }

    this.saveManager.clearGameState();

    const eventData = this.eventManager.isEventActive() ? {
      eventActive: true,
      eventBonusScore: this.eventBonusScore,
      eventSynthesisBonus: this.eventSynthesisBonus,
      scoreInEvent: this.score,
      petalsInEvent: this.totalPetalsCollected,
      synthesisInEvent: this.synthesisCount,
      rareInEvent: this.rarePetalsCollected
    } : {
      eventActive: false
    };

    this.scene.start('ResultScene', {
      score: this.score,
      awakeProgress: this.awakeProgress,
      totalPetalsCollected: this.totalPetalsCollected,
      synthesisCount: this.synthesisCount,
      playTime,
      victory,
      unlockedRegions: [...this.unlockedRegions],
      rarePetalsCollected: this.rarePetalsCollected,
      replayData,
      eventData,
      newlyUnlockedGrowth: newlyUnlocked
    });
  }

  private calculateEfficiencyScore(playTime: number): number {
    if (playTime <= 0) return 0;
    const scorePerMinute = this.score / (playTime / 60);
    const synthEfficiency = this.synthesisCount > 0 ? Math.min(this.synthesisCount * 8, 300) : 0;
    const rareBonus = this.rarePetalsCollected * 50;
    const tierBonus = (this.highestSynthesisTier - 1) * 80;
    return Math.round(scorePerMinute * 0.3 + synthEfficiency + rareBonus + tierBonus);
  }

  private getPeakRegion(): RegionId {
    let maxCount = 0;
    let peak: RegionId = 'initial';
    this.petalsByRegion.forEach((count, regionId) => {
      if (count > maxCount) {
        maxCount = count;
        peak = regionId;
      }
    });
    return peak;
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
