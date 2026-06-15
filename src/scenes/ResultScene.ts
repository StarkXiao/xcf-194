import Phaser from 'phaser';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { GAME_WIDTH, GAME_HEIGHT, AWAKEN_GOAL, RegionId, REGION_CONFIGS } from '../types';

interface ResultData {
  score: number;
  awakeProgress: number;
  totalPetalsCollected: number;
  synthesisCount: number;
  playTime: number;
  victory: boolean;
  unlockedRegions: RegionId[];
  rarePetalsCollected: number;
}

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultData;
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;

  constructor() {
    super('ResultScene');
  }

  init(data: ResultData): void {
    this.resultData = data;
  }

  create(): void {
    this.saveManager = SaveManager.getInstance();
    this.audioManager = AudioManager.getInstance(this);

    this.createBackground();
    this.createResultPanel();
    this.createButtons();

    if (this.resultData.victory) {
      this.playVictoryAnimation();
    }
  }

  private createBackground(): void {
    const gradient = this.add.graphics();
    if (this.resultData.victory) {
      gradient.fillGradientStyle(0x1a0a2e, 0x2d1b4e, 0x4c1d95, 0x5b21b6, 1);
    } else {
      gradient.fillGradientStyle(0x0a0514, 0x0f0a1e, 0x1a0a2e, 0x1e1b4b, 1);
    }
    gradient.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const count = this.resultData.victory ? 120 : 50;
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.Between(1, this.resultData.victory ? 5 : 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);
      this.add.circle(x, y, size, 0xfef08a, alpha);
    }

    if (this.resultData.victory) {
      const colors = [0xff9ec4, 0x7dd3fc, 0xc084fc, 0xfcd34d, 0x34d399];
      for (let i = 0; i < 30; i++) {
        const x = Phaser.Math.Between(0, GAME_WIDTH);
        const y = Phaser.Math.Between(0, GAME_HEIGHT);
        const color = colors[Phaser.Math.Between(0, colors.length - 1)];
        this.tweens.add({
          targets: this.add.circle(x, y, 6, color, 0.8),
          y: y + GAME_HEIGHT + 100,
          alpha: 0,
          duration: Phaser.Math.Between(3000, 6000),
          repeat: -1,
          delay: Phaser.Math.Between(0, 2000)
        });
      }
    }
  }

  private createResultPanel(): void {
    const panelY = GAME_HEIGHT / 2 - 100;

    const panelHeight = 780;
    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.95);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 320, panelY - 250, 640, panelHeight, 28);
    panel.lineStyle(3, this.resultData.victory ? 0xfde68a : 0xa78bfa, 0.8);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - 320, panelY - 250, 640, panelHeight, 28);

    const titleEmoji = this.resultData.victory ? '🌸' : '🌙';
    const titleText = this.resultData.victory ? '恋人已苏醒！' : '旅程暂告段落';
    const subtitleText = this.resultData.victory
      ? '花瓣之光驱散了沉睡的迷雾'
      : '森林的花瓣仍在等待收集';

    this.add.text(GAME_WIDTH / 2, panelY - 180, titleEmoji, {
      fontSize: '72px'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, panelY - 100, titleText, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '44px',
      color: this.resultData.victory ? '#fde68a' : '#c4b5fd',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, panelY - 50, subtitleText, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#a78bfa'
    }).setOrigin(0.5);

    const divider = this.add.graphics();
    divider.lineStyle(1, 0x6366f1, 0.5);
    divider.lineBetween(GAME_WIDTH / 2 - 250, panelY, GAME_WIDTH / 2 + 250, panelY);

    const stats = [
      { label: '✨ 最终分数', value: this.resultData.score.toString(), color: '#fde68a' },
      { label: '💖 唤醒进度', value: `${Math.floor(this.resultData.awakeProgress)}% / ${AWAKEN_GOAL}%`, color: '#f9a8d4' },
      { label: '🌸 收集花瓣', value: this.resultData.totalPetalsCollected.toString(), color: '#86efac' },
      { label: '⭐ 合成次数', value: this.resultData.synthesisCount.toString(), color: '#93c5fd' },
      { label: '💎 稀有花瓣', value: (this.resultData.rarePetalsCollected ?? 0).toString(), color: '#fbbf24' },
      { label: '⏱️ 游戏时长', value: this.formatTime(this.resultData.playTime), color: '#c4b5fd' }
    ];

    stats.forEach((stat, i) => {
      const y = panelY + 50 + i * 52;
      this.add.text(GAME_WIDTH / 2 - 200, y, stat.label, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '20px',
        color: stat.color
      }).setOrigin(0, 0.5);

      this.add.text(GAME_WIDTH / 2 + 200, y, stat.value, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '22px',
        color: '#fef3c7',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
    });

    const regionDivider = this.add.graphics();
    const regionSectionY = panelY + 50 + stats.length * 52 + 10;
    regionDivider.lineStyle(1, 0x6366f1, 0.5);
    regionDivider.lineBetween(GAME_WIDTH / 2 - 250, regionSectionY, GAME_WIDTH / 2 + 250, regionSectionY);

    this.add.text(GAME_WIDTH / 2, regionSectionY + 30, '🗺️ 探索区域', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const unlockedRegions = this.resultData.unlockedRegions ?? ['initial'];
    REGION_CONFIGS.forEach((region, i) => {
      const y = regionSectionY + 70 + i * 40;
      const isUnlocked = unlockedRegions.includes(region.id);

      const icon = this.add.text(GAME_WIDTH / 2 - 200, y, region.emoji, {
        fontSize: '20px'
      }).setOrigin(0, 0.5).setAlpha(isUnlocked ? 1 : 0.3);

      const name = this.add.text(GAME_WIDTH / 2 - 150, y, region.name, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: isUnlocked ? '#fef3c7' : '#4b5563',
        fontStyle: isUnlocked ? 'bold' : 'normal'
      }).setOrigin(0, 0.5);

      const status = this.add.text(GAME_WIDTH / 2 + 200, y, isUnlocked ? '✓ 已解锁' : `🔒 ${region.unlockThreshold}%`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: isUnlocked ? '#86efac' : '#6b7280'
      }).setOrigin(1, 0.5);
    });

    const saveData = this.saveManager.loadSave();
    if (this.resultData.score >= saveData.bestScore && this.resultData.score > 0) {
      const recordY = regionSectionY + 70 + REGION_CONFIGS.length * 40 + 20;
      this.add.text(GAME_WIDTH / 2, recordY, '🏆 新纪录！', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '28px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: this.children.list[this.children.list.length - 1],
        alpha: 1,
        scale: { from: 0.5, to: 1 },
        duration: 600,
        delay: 500,
        ease: 'Back.easeOut'
      });
    }
  }

  private createButtons(): void {
    this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 180, '再次进入森林', 0x7c3aed, () => {
      this.audioManager.playClick();
      this.scene.start('GameScene');
    });

    this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 90, '返回主菜单', 0x4c1d95, () => {
      this.audioManager.playClick();
      this.scene.start('MenuScene');
    });
  }

  private createButton(x: number, y: number, text: string, color: number, onClick: () => void): void {
    const btnBg = this.add.graphics();
    btnBg.fillStyle(color, 0.9);
    btnBg.fillRoundedRect(x - 160, y - 32, 320, 64, 32);
    btnBg.lineStyle(2, 0xc4b5fd, 0.8);
    btnBg.strokeRoundedRect(x - 160, y - 32, 320, 64, 32);
    btnBg.setInteractive(
      new Phaser.Geom.Rectangle(x - 160, y - 32, 320, 64),
      Phaser.Geom.Rectangle.Contains
    );

    const btnText = this.add.text(x, y, text, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => {
      btnText.setScale(1.05);
    });
    btnBg.on('pointerout', () => {
      btnText.setScale(1);
    });
    btnBg.on('pointerdown', () => {
      btnText.setScale(0.95);
    });
    btnBg.on('pointerup', () => {
      btnText.setScale(1);
      onClick();
    });
  }

  private playVictoryAnimation(): void {
    this.cameras.main.flash(1000, 255, 200, 255, false);

    const lover = this.add.container(GAME_WIDTH / 2, 280);

    const aura = this.add.graphics();
    aura.fillStyle(0xf0abfc, 0.3);
    aura.fillCircle(0, 0, 140);
    lover.add(aura);

    this.tweens.add({
      targets: aura,
      scale: { from: 0.5, to: 2 },
      alpha: { from: 0.6, to: 0 },
      duration: 1500,
      repeat: -1,
      ease: 'Sine.easeOut'
    });

    const body = this.add.graphics();
    body.fillStyle(0xfef3c7, 1);
    body.fillCircle(0, 0, 60);
    body.fillStyle(0xfce7f3, 1);
    body.fillCircle(0, 0, 48);
    body.lineStyle(3, 0xa78bfa, 1);
    body.beginPath();
    body.arc(-20, -8, 7, 0, Math.PI, false);
    body.strokePath();
    body.beginPath();
    body.arc(20, -8, 7, 0, Math.PI, false);
    body.strokePath();
    body.lineStyle(3, 0xf472b6, 1);
    body.beginPath();
    body.arc(0, 12, 12, 0, Math.PI, false);
    body.strokePath();

    body.fillStyle(0xef4444, 1);
    for (let i = 0; i < 3; i++) {
      const hx = -20 + i * 20;
      body.fillTriangle(hx, -75, hx - 8, -55, hx + 8, -55);
    }
    lover.add(body);

    lover.setScale(0);
    this.tweens.add({
      targets: lover,
      scale: 1,
      duration: 800,
      delay: 300,
      ease: 'Back.easeOut'
    });
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
