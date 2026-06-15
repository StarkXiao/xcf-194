import Phaser from 'phaser';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { EventManager } from '../managers/EventManager';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  AWAKEN_GOAL,
  RegionId,
  REGION_CONFIGS,
  ReplayData,
  PetalColor,
  PETAL_COLOR_MAP,
  PETAL_TIER_NAMES
} from '../types';

interface ResultData {
  score: number;
  awakeProgress: number;
  totalPetalsCollected: number;
  synthesisCount: number;
  playTime: number;
  victory: boolean;
  unlockedRegions: RegionId[];
  rarePetalsCollected: number;
  replayData?: ReplayData;
}

const COLOR_HEX: Record<PetalColor, number> = {
  pink: 0xff9ec4,
  blue: 0x7dd3fc,
  purple: 0xc084fc,
  gold: 0xfcd34d,
  rainbow: 0xffffff
};

const COLOR_CSS: Record<PetalColor, string> = {
  pink: '#ff9ec4',
  blue: '#7dd3fc',
  purple: '#c084fc',
  gold: '#fcd34d',
  rainbow: '#ffffff'
};

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultData;
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;
  private eventManager!: EventManager;
  private scrollContainer!: Phaser.GameObjects.Container;
  private contentHeight: number = 0;
  private scrollY: number = 0;
  private maxScroll: number = 0;

  constructor() {
    super('ResultScene');
  }

  init(data: ResultData): void {
    this.resultData = data;
    this.scrollY = 0;
  }

  create(): void {
    this.saveManager = SaveManager.getInstance();
    this.audioManager = AudioManager.getInstance(this);
    this.eventManager = EventManager.getInstance();

    this.createBackground();
    this.createScrollableContent();
    this.createBottomBar();

    if (this.resultData.victory) {
      this.playVictoryAnimation();
    }

    this.setupScrollInput();
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

  private createScrollableContent(): void {
    this.scrollContainer = this.add.container(0, 0);

    let y = 30;

    y = this.createHeader(y);
    y = this.createStatsSection(y);
    y = this.createEfficiencySection(y);
    y = this.createCollectionPathSection(y);
    y = this.createSynthesisSection(y);
    y = this.createRewardSourceSection(y);
    y = this.createRegionSection(y);
    y = this.createEventProgressSection(y);
    y = this.createSaveStatsSection(y);

    this.contentHeight = y + 40;
    this.maxScroll = Math.max(0, this.contentHeight - (GAME_HEIGHT - 160));
  }

  private createHeader(startY: number): number {
    const y = startY;

    const titleEmoji = this.resultData.victory ? '🌸' : '🌙';
    const titleText = this.resultData.victory ? '恋人已苏醒！' : '旅程暂告段落';

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 40, '📋 局内复盘中心', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '32px',
        color: '#a78bfa',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 80, titleEmoji, {
        fontSize: '56px'
      }).setOrigin(0.5)
    );

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 130, titleText, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '40px',
        color: this.resultData.victory ? '#fde68a' : '#c4b5fd',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    return y + 170;
  }

  private createStatsSection(startY: number): number {
    const y = startY;
    const panelX = GAME_WIDTH / 2 - 320;
    const panelW = 640;

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.92);
    panel.fillRoundedRect(panelX, y, panelW, 310, 20);
    panel.lineStyle(2, 0x6366f1, 0.6);
    panel.strokeRoundedRect(panelX, y, panelW, 310, 20);
    this.scrollContainer.add(panel);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 30, '📊 本局总览', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const stats = [
      { label: '✨ 最终分数', value: this.resultData.score.toString(), color: '#fde68a' },
      { label: '💖 唤醒进度', value: `${Math.floor(this.resultData.awakeProgress)}% / ${AWAKEN_GOAL}%`, color: '#f9a8d4' },
      { label: '🌸 收集花瓣', value: this.resultData.totalPetalsCollected.toString(), color: '#86efac' },
      { label: '⭐ 合成次数', value: this.resultData.synthesisCount.toString(), color: '#93c5fd' },
      { label: '💎 稀有花瓣', value: (this.resultData.rarePetalsCollected ?? 0).toString(), color: '#fbbf24' },
      { label: '⏱️ 游戏时长', value: this.formatTime(this.resultData.playTime), color: '#c4b5fd' }
    ];

    stats.forEach((stat, i) => {
      const sy = y + 70 + i * 40;
      this.scrollContainer.add(
        this.add.text(panelX + 40, sy, stat.label, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '20px',
          color: stat.color
        }).setOrigin(0, 0.5)
      );
      this.scrollContainer.add(
        this.add.text(panelX + panelW - 40, sy, stat.value, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '22px',
          color: '#fef3c7',
          fontStyle: 'bold'
        }).setOrigin(1, 0.5)
      );
    });

    const saveData = this.saveManager.loadSave();
    if (this.resultData.score >= saveData.bestScore && this.resultData.score > 0) {
      const recordY = y + 70 + stats.length * 40 + 10;
      const recordText = this.add.text(GAME_WIDTH / 2, recordY, '🏆 新纪录！', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0);
      this.scrollContainer.add(recordText);

      this.tweens.add({
        targets: recordText,
        alpha: 1,
        scale: { from: 0.5, to: 1 },
        duration: 600,
        delay: 500,
        ease: 'Back.easeOut'
      });
    }

    return y + 325;
  }

  private createEfficiencySection(startY: number): number {
    const y = startY;
    const panelX = GAME_WIDTH / 2 - 320;
    const panelW = 640;
    const replay = this.resultData.replayData;

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.92);
    panel.fillRoundedRect(panelX, y, panelW, 200, 20);
    panel.lineStyle(2, 0xfbbf24, 0.5);
    panel.strokeRoundedRect(panelX, y, panelW, 200, 20);
    this.scrollContainer.add(panel);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 30, '⚡ 效率评分', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const effScore = replay?.efficiencyScore ?? 0;
    const effGrade = this.getEfficiencyGrade(effScore);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 80, `${effScore}`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '48px',
        color: effGrade.color,
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 120, effGrade.label, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '22px',
        color: effGrade.color,
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const rate = replay?.collectionRate ?? 0;
    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2 - 120, y + 160, `采集: ${rate.toFixed(1)}朵/分`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#86efac'
      }).setOrigin(0, 0.5)
    );

    const peakRegion = REGION_CONFIGS.find(r => r.id === (replay?.peakRegion ?? 'initial'));
    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2 + 60, y + 160, `峰值区: ${peakRegion?.emoji ?? '🌱'} ${peakRegion?.name ?? '初始林地'}`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#93c5fd'
      }).setOrigin(0, 0.5)
    );

    return y + 215;
  }

  private createCollectionPathSection(startY: number): number {
    const y = startY;
    const panelX = GAME_WIDTH / 2 - 320;
    const panelW = 640;
    const replay = this.resultData.replayData;

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.92);
    panel.fillRoundedRect(panelX, y, panelW, 340, 20);
    panel.lineStyle(2, 0xa78bfa, 0.5);
    panel.strokeRoundedRect(panelX, y, panelW, 340, 20);
    this.scrollContainer.add(panel);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 30, '🗺️ 采集路径', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const mapX = panelX + 40;
    const mapY = y + 60;
    const mapW = panelW - 80;
    const mapH = 200;

    const mapBg = this.add.graphics();
    mapBg.fillStyle(0x0f0a1e, 0.9);
    mapBg.fillRoundedRect(mapX, mapY, mapW, mapH, 12);
    mapBg.lineStyle(1, 0x312e81, 0.8);
    mapBg.strokeRoundedRect(mapX, mapY, mapW, mapH, 12);
    this.scrollContainer.add(mapBg);

    const scaleX = mapW / GAME_WIDTH;
    const scaleY = mapH / GAME_HEIGHT;

    if (replay?.collectionPath && replay.collectionPath.length > 1) {
      const step = Math.max(1, Math.floor(replay.collectionPath.length / 200));
      const pathGfx = this.add.graphics();

      for (let i = step; i < replay.collectionPath.length; i += step) {
        const p0 = replay.collectionPath[i - step];
        const p1 = replay.collectionPath[i];
        const alpha = 0.15 + (i / replay.collectionPath.length) * 0.6;
        pathGfx.lineStyle(2, 0xa78bfa, alpha);
        pathGfx.lineBetween(
          mapX + p0.x * scaleX,
          mapY + p0.y * scaleY,
          mapX + p1.x * scaleX,
          mapY + p1.y * scaleY
        );
      }

      const start = replay.collectionPath[0];
      pathGfx.fillStyle(0x86efac, 0.9);
      pathGfx.fillCircle(mapX + start.x * scaleX, mapY + start.y * scaleY, 4);

      const end = replay.collectionPath[replay.collectionPath.length - 1];
      pathGfx.fillStyle(0xf472b6, 0.9);
      pathGfx.fillCircle(mapX + end.x * scaleX, mapY + end.y * scaleY, 4);

      this.scrollContainer.add(pathGfx);
    }

    const legendY = mapY + mapH + 20;
    this.scrollContainer.add(
      this.add.text(mapX, legendY, '🟢 起点', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#86efac'
      })
    );
    this.scrollContainer.add(
      this.add.text(mapX + 100, legendY, '🔴 终点', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#f472b6'
      })
    );
    this.scrollContainer.add(
      this.add.text(mapX + 200, legendY, '━ 移动轨迹', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#a78bfa'
      })
    );

    const colorStatsY = legendY + 30;
    const petalsByColor = replay?.petalsByColor ?? [];
    const totalPetals = petalsByColor.reduce((s, p) => s + p.count, 0);

    this.scrollContainer.add(
      this.add.text(mapX, colorStatsY, '🎨 采集分布:', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#c4b5fd'
      })
    );

    let barX = mapX + 100;
    const barWidth = 360;
    const barHeight = 16;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x312e81, 0.8);
    barBg.fillRoundedRect(barX, colorStatsY - 8, barWidth, barHeight, 8);
    this.scrollContainer.add(barBg);

    if (totalPetals > 0) {
      const colorBar = this.add.graphics();
      let cx = barX;
      petalsByColor.forEach(p => {
        if (p.count <= 0) return;
        const segW = (p.count / totalPetals) * barWidth;
        colorBar.fillStyle(COLOR_HEX[p.color], 0.85);
        colorBar.fillRoundedRect(cx, colorStatsY - 8, Math.max(segW, 2), barHeight, 0);
        cx += segW;
      });
      this.scrollContainer.add(colorBar);

      let labelX = barX + barWidth + 10;
      petalsByColor.forEach(p => {
        if (p.count <= 0) return;
        this.scrollContainer.add(
          this.add.text(labelX, colorStatsY, `${p.count}`, {
            fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
            fontSize: '14px',
            color: COLOR_CSS[p.color],
            fontStyle: 'bold'
          }).setOrigin(0, 0.5)
        );
        labelX += 40;
      });
    }

    return y + 355;
  }

  private createSynthesisSection(startY: number): number {
    const y = startY;
    const replay = this.resultData.replayData;
    const synthLog = replay?.synthesisLog ?? [];

    const itemCount = Math.min(synthLog.length, 5);
    const panelH = 130 + itemCount * 44;
    const panelX = GAME_WIDTH / 2 - 320;
    const panelW = 640;

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.92);
    panel.fillRoundedRect(panelX, y, panelW, panelH, 20);
    panel.lineStyle(2, 0xc084fc, 0.5);
    panel.strokeRoundedRect(panelX, y, panelW, panelH, 20);
    this.scrollContainer.add(panel);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 30, '⭐ 关键合成', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const highestTier = replay?.highestSynthesisTier ?? 1;
    this.scrollContainer.add(
      this.add.text(panelX + 40, y + 65, `最高合成等级: Lv.${highestTier} ${PETAL_TIER_NAMES[highestTier]}`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#fbbf24',
        fontStyle: 'bold'
      })
    );

    if (synthLog.length === 0) {
      this.scrollContainer.add(
        this.add.text(GAME_WIDTH / 2, y + 105, '暂无合成记录', {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '18px',
          color: '#6b7280'
        }).setOrigin(0.5)
      );
    } else {
      const displayLog = synthLog.slice(-5).reverse();
      displayLog.forEach((entry, i) => {
        const ey = y + 95 + i * 44;

        const arrowGfx = this.add.graphics();
        const fromColor = COLOR_HEX[entry.color];
        const toColor = COLOR_HEX[entry.outputColor];
        arrowGfx.fillStyle(fromColor, 0.7);
        arrowGfx.fillCircle(panelX + 60, ey, 10);
        arrowGfx.fillStyle(toColor, 1);
        arrowGfx.fillCircle(panelX + 140, ey, 12);
        arrowGfx.lineStyle(2, 0xa78bfa, 0.6);
        arrowGfx.lineBetween(panelX + 72, ey, panelX + 126, ey);
        this.scrollContainer.add(arrowGfx);

        this.scrollContainer.add(
          this.add.text(panelX + 170, ey, `${PETAL_TIER_NAMES[entry.tier]} → ${PETAL_TIER_NAMES[entry.outputTier]}`, {
            fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
            fontSize: '18px',
            color: '#fef3c7'
          }).setOrigin(0, 0.5)
        );

        this.scrollContainer.add(
          this.add.text(panelX + panelW - 40, ey, `+${entry.outputTier * 100}`, {
            fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
            fontSize: '16px',
            color: '#86efac',
            fontStyle: 'bold'
          }).setOrigin(1, 0.5)
        );
      });
    }

    return y + panelH + 15;
  }

  private createRewardSourceSection(startY: number): number {
    const y = startY;
    const rewardSources = this.resultData.replayData?.rewardSources ?? [];

    const topRewards = this.aggregateRewardSources(rewardSources);
    const itemCount = Math.min(topRewards.length, 6);
    const panelH = 100 + itemCount * 40;
    const panelX = GAME_WIDTH / 2 - 320;
    const panelW = 640;

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.92);
    panel.fillRoundedRect(panelX, y, panelW, panelH, 20);
    panel.lineStyle(2, 0x34d399, 0.5);
    panel.strokeRoundedRect(panelX, y, panelW, panelH, 20);
    this.scrollContainer.add(panel);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 30, '🎁 奖励来源', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const totalScore = topRewards.reduce((s, r) => s + r.score, 0);

    if (topRewards.length === 0) {
      this.scrollContainer.add(
        this.add.text(GAME_WIDTH / 2, y + 70, '暂无奖励数据', {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '18px',
          color: '#6b7280'
        }).setOrigin(0.5)
      );
    } else {
      topRewards.slice(0, 6).forEach((reward, i) => {
        const ry = y + 70 + i * 40;
        const pct = totalScore > 0 ? (reward.score / totalScore * 100) : 0;

        this.scrollContainer.add(
          this.add.text(panelX + 40, ry, reward.label, {
            fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
            fontSize: '18px',
            color: '#c4b5fd'
          }).setOrigin(0, 0.5)
        );

        const barX = panelX + 300;
        const barMaxW = 180;
        const barH = 12;

        const barBg = this.add.graphics();
        barBg.fillStyle(0x312e81, 0.6);
        barBg.fillRoundedRect(barX, ry - 6, barMaxW, barH, 6);
        this.scrollContainer.add(barBg);

        const barFill = this.add.graphics();
        barFill.fillStyle(0x34d399, 0.85);
        barFill.fillRoundedRect(barX, ry - 6, Math.max(barMaxW * pct / 100, 4), barH, 6);
        this.scrollContainer.add(barFill);

        this.scrollContainer.add(
          this.add.text(panelX + panelW - 40, ry, `${reward.score} (${pct.toFixed(0)}%)`, {
            fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
            fontSize: '14px',
            color: '#86efac',
            fontStyle: 'bold'
          }).setOrigin(1, 0.5)
        );
      });
    }

    return y + panelH + 15;
  }

  private createRegionSection(startY: number): number {
    const y = startY;
    const panelX = GAME_WIDTH / 2 - 320;
    const panelW = 640;
    const regionH = 70 + REGION_CONFIGS.length * 42;
    const petalsByRegion = this.resultData.replayData?.petalsByRegion ?? [];

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.92);
    panel.fillRoundedRect(panelX, y, panelW, regionH, 20);
    panel.lineStyle(2, 0x6366f1, 0.5);
    panel.strokeRoundedRect(panelX, y, panelW, regionH, 20);
    this.scrollContainer.add(panel);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 30, '🗺️ 探索区域', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const unlockedRegions = this.resultData.unlockedRegions ?? ['initial'];
    REGION_CONFIGS.forEach((region, i) => {
      const ry = y + 65 + i * 42;
      const isUnlocked = unlockedRegions.includes(region.id);
      const regionPetals = petalsByRegion.find(p => p.regionId === region.id);
      const count = regionPetals?.count ?? 0;

      this.scrollContainer.add(
        this.add.text(panelX + 40, ry, region.emoji, {
          fontSize: '20px'
        }).setOrigin(0, 0.5).setAlpha(isUnlocked ? 1 : 0.3)
      );

      this.scrollContainer.add(
        this.add.text(panelX + 80, ry, region.name, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '18px',
          color: isUnlocked ? '#fef3c7' : '#4b5563',
          fontStyle: isUnlocked ? 'bold' : 'normal'
        }).setOrigin(0, 0.5)
      );

      if (isUnlocked && count > 0) {
        this.scrollContainer.add(
          this.add.text(panelX + panelW - 120, ry, `🌸 ×${count}`, {
            fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
            fontSize: '16px',
            color: '#86efac'
          }).setOrigin(0, 0.5)
        );
      }

      this.scrollContainer.add(
        this.add.text(panelX + panelW - 40, ry, isUnlocked ? '✓ 已解锁' : `🔒 ${region.unlockThreshold}%`, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '16px',
          color: isUnlocked ? '#86efac' : '#6b7280'
        }).setOrigin(1, 0.5)
      );
    });

    return y + regionH + 15;
  }

  private createEventProgressSection(startY: number): number {
    if (!this.eventManager.isEventActive()) return startY;

    const event = this.eventManager.getCurrentEvent();
    const progress = this.eventManager.getEventProgress();
    if (!event || !progress) return startY;

    const y = startY;
    const panelX = GAME_WIDTH / 2 - 320;
    const panelW = 640;
    const panelH = 260;

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.92);
    panel.fillRoundedRect(panelX, y, panelW, panelH, 20);
    panel.lineStyle(2, 0xfbbf24, 0.6);
    panel.strokeRoundedRect(panelX, y, panelW, panelH, 20);
    this.scrollContainer.add(panel);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 30, `${event.banner} 活动进度`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const stageProgress = this.eventManager.getStageProgressValue();
    const currentStage = this.eventManager.getCurrentStage();
    const totalStages = this.eventManager.getTotalStageCount();
    const completedTasks = this.eventManager.getCompletedTaskCount();
    const totalTasks = this.eventManager.getTotalTaskCount();
    const hasUnclaimed = this.eventManager.hasUnclaimedRewards();

    const timeRemaining = this.eventManager.getTimeRemaining();
    const timeStr = this.eventManager.formatTimeRemaining(timeRemaining);

    const stats = [
      { label: '⏰ 活动剩余', value: timeStr, color: '#86efac' },
      { label: '🏆 阶段进度', value: `${stageProgress} / 第${currentStage}/${totalStages}阶`, color: '#fbbf24' },
      { label: '📋 任务完成', value: `${completedTasks} / ${totalTasks}`, color: '#93c5fd' }
    ];

    stats.forEach((stat, i) => {
      const sy = y + 75 + i * 42;
      this.scrollContainer.add(
        this.add.text(panelX + 40, sy, stat.label, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '18px',
          color: stat.color
        }).setOrigin(0, 0.5)
      );
      this.scrollContainer.add(
        this.add.text(panelX + panelW - 40, sy, stat.value, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '20px',
          color: '#fef3c7',
          fontStyle: 'bold'
        }).setOrigin(1, 0.5)
      );
    });

    if (hasUnclaimed) {
      const btnBg = this.add.graphics();
      btnBg.fillStyle(0x059669, 0.9);
      btnBg.fillRoundedRect(GAME_WIDTH / 2 - 100, y + 205, 200, 44, 22);
      btnBg.lineStyle(2, 0x34d399, 0.8);
      btnBg.strokeRoundedRect(GAME_WIDTH / 2 - 100, y + 205, 200, 44, 22);
      btnBg.setInteractive(
        new Phaser.Geom.Rectangle(GAME_WIDTH / 2 - 100, y + 205, 200, 44),
        Phaser.Geom.Rectangle.Contains
      );
      this.scrollContainer.add(btnBg);

      const btnText = this.add.text(GAME_WIDTH / 2, y + 227, '🎁 领取奖励', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '20px',
        color: '#fef3c7',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.scrollContainer.add(btnText);

      btnBg.on('pointerover', () => {
        btnBg.clear();
        btnBg.fillStyle(0x059669, 1);
        btnBg.fillRoundedRect(GAME_WIDTH / 2 - 105, y + 200, 210, 54, 27);
        btnBg.lineStyle(2, 0x86efac, 1);
        btnBg.strokeRoundedRect(GAME_WIDTH / 2 - 105, y + 200, 210, 54, 27);
        btnText.setScale(1.05);
      });

      btnBg.on('pointerout', () => {
        btnBg.clear();
        btnBg.fillStyle(0x059669, 0.9);
        btnBg.fillRoundedRect(GAME_WIDTH / 2 - 100, y + 205, 200, 44, 22);
        btnBg.lineStyle(2, 0x34d399, 0.8);
        btnBg.strokeRoundedRect(GAME_WIDTH / 2 - 100, y + 205, 200, 44, 22);
        btnText.setScale(1);
      });

      btnBg.on('pointerdown', () => {
        btnText.setScale(0.95);
      });

      btnBg.on('pointerup', () => {
        btnText.setScale(1);
        this.audioManager.playClick();
        this.scene.start('EventScene');
      });
    }

    return y + panelH + 15;
  }

  private createSaveStatsSection(startY: number): number {
    const y = startY;
    const panelX = GAME_WIDTH / 2 - 320;
    const panelW = 640;
    const panelH = 200;

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.92);
    panel.fillRoundedRect(panelX, y, panelW, panelH, 20);
    panel.lineStyle(2, 0x7dd3fc, 0.5);
    panel.strokeRoundedRect(panelX, y, panelW, panelH, 20);
    this.scrollContainer.add(panel);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, y + 30, '📁 存档统计', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const saveData = this.saveManager.loadSave();

    const stats = [
      { label: '🎮 总局数', value: `${saveData.gamesPlayed}`, color: '#93c5fd' },
      { label: '✨ 最高分', value: `${saveData.bestScore}`, color: '#fde68a' },
      { label: '💖 最佳进度', value: `${saveData.bestProgress}%`, color: '#f9a8d4' },
      { label: '🌸 总采集花瓣', value: `${saveData.totalPetalsCollected ?? 0}`, color: '#86efac' },
      { label: '⭐ 总合成次数', value: `${saveData.totalSynthesisCount ?? 0}`, color: '#c4b5fd' }
    ];

    stats.forEach((stat, i) => {
      const sy = y + 65 + i * 28;
      this.scrollContainer.add(
        this.add.text(panelX + 50, sy, stat.label, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '18px',
          color: stat.color
        }).setOrigin(0, 0.5)
      );
      this.scrollContainer.add(
        this.add.text(panelX + panelW - 50, sy, stat.value, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '18px',
          color: '#fef3c7',
          fontStyle: 'bold'
        }).setOrigin(1, 0.5)
      );
    });

    return y + panelH + 15;
  }

  private createBottomBar(): void {
    const barY = GAME_HEIGHT - 160;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x0a0514, 0.95);
    barBg.fillRect(0, barY - 10, GAME_WIDTH, 170);
    barBg.lineStyle(1, 0x312e81, 0.8);
    barBg.lineBetween(0, barY - 10, GAME_WIDTH, barY - 10);

    this.createButton(GAME_WIDTH / 2 - 170, GAME_HEIGHT - 120, '再次进入森林', 0x7c3aed, () => {
      this.audioManager.playClick();
      this.scene.start('GameScene');
    });

    this.createButton(GAME_WIDTH / 2 + 170, GAME_HEIGHT - 120, '返回主菜单', 0x4c1d95, () => {
      this.audioManager.playClick();
      this.scene.start('MenuScene');
    });

    this.createShareButton(GAME_WIDTH / 2, GAME_HEIGHT - 45);
  }

  private createShareButton(x: number, y: number): void {
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x059669, 0.9);
    btnBg.fillRoundedRect(x - 120, y - 22, 240, 44, 22);
    btnBg.lineStyle(2, 0x34d399, 0.8);
    btnBg.strokeRoundedRect(x - 120, y - 22, 240, 44, 22);
    btnBg.setInteractive(
      new Phaser.Geom.Rectangle(x - 120, y - 22, 240, 44),
      Phaser.Geom.Rectangle.Contains
    );

    const btnText = this.add.text(x, y, '📋 分享复盘结果', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const self = this;

    btnBg.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x059669, 1);
      btnBg.fillRoundedRect(x - 125, y - 26, 250, 52, 26);
      btnBg.lineStyle(2, 0x86efac, 1);
      btnBg.strokeRoundedRect(x - 125, y - 26, 250, 52, 26);
      btnText.setScale(1.05);
    });

    btnBg.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x059669, 0.9);
      btnBg.fillRoundedRect(x - 120, y - 22, 240, 44, 22);
      btnBg.lineStyle(2, 0x34d399, 0.8);
      btnBg.strokeRoundedRect(x - 120, y - 22, 240, 44, 22);
      btnText.setScale(1);
    });

    btnBg.on('pointerdown', () => {
      btnText.setScale(0.95);
    });

    btnBg.on('pointerup', () => {
      btnText.setScale(1);
      self.audioManager.playClick();
      self.shareReplay();
    });
  }

  private shareReplay(): void {
    const replay = this.resultData.replayData ?? {
      collectionPath: [],
      synthesisLog: [],
      rewardSources: [],
      petalsByColor: [],
      petalsByRegion: [],
      efficiencyScore: 0,
      peakRegion: 'initial' as RegionId,
      highestSynthesisTier: 1 as any,
      collectionRate: 0
    };

    const shareText = this.saveManager.generateShareText(
      replay,
      this.resultData.score,
      this.resultData.awakeProgress,
      this.resultData.playTime,
      this.resultData.victory
    );

    const success = this.saveManager.copyToClipboard(shareText);

    const toastY = GAME_HEIGHT - 180;
    const toast = this.add.text(GAME_WIDTH / 2, toastY, success ? '✅ 复制成功！快去分享吧' : '❌ 复制失败，请重试', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: success ? '#86efac' : '#f87171',
      fontStyle: 'bold',
      backgroundColor: '#1e1b4bee',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setAlpha(0).setDepth(1000);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: toastY - 10,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: toast,
          alpha: 0,
          duration: 300,
          delay: 2000,
          ease: 'Sine.easeIn',
          onComplete: () => toast.destroy()
        });
      }
    });
  }

  private createButton(x: number, y: number, text: string, color: number, onClick: () => void): void {
    const btnBg = this.add.graphics();
    btnBg.fillStyle(color, 0.9);
    btnBg.fillRoundedRect(x - 140, y - 28, 280, 56, 28);
    btnBg.lineStyle(2, 0xc4b5fd, 0.8);
    btnBg.strokeRoundedRect(x - 140, y - 28, 280, 56, 28);
    btnBg.setInteractive(
      new Phaser.Geom.Rectangle(x - 140, y - 28, 280, 56),
      Phaser.Geom.Rectangle.Contains
    );

    const btnText = this.add.text(x, y, text, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
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

  private setupScrollInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const dy = pointer.prevPosition.y - pointer.y;
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScroll);
      this.scrollContainer.setY(-this.scrollY);
    });

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
      this.scrollContainer.setY(-this.scrollY);
    });
  }

  private playVictoryAnimation(): void {
    this.cameras.main.flash(1000, 255, 200, 255, false);
  }

  private aggregateRewardSources(sources: { label: string; score: number; color: string }[]): { label: string; score: number; color: string }[] {
    const merged = new Map<string, { label: string; score: number; color: string }>();
    sources.forEach(s => {
      const key = s.label;
      if (merged.has(key)) {
        merged.get(key)!.score += s.score;
      } else {
        merged.set(key, { ...s });
      }
    });
    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  private getEfficiencyGrade(score: number): { label: string; color: string } {
    if (score >= 800) return { label: 'SSS · 传说', color: '#fde68a' };
    if (score >= 600) return { label: 'SS · 极致', color: '#fbbf24' };
    if (score >= 400) return { label: 'S · 优秀', color: '#34d399' };
    if (score >= 250) return { label: 'A · 良好', color: '#7dd3fc' };
    if (score >= 120) return { label: 'B · 一般', color: '#c4b5fd' };
    return { label: 'C · 新手', color: '#9ca3af' };
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
