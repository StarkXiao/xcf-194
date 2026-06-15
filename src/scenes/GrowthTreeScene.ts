import Phaser from 'phaser';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { GrowthTreeManager } from '../managers/GrowthTreeManager';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GrowthNode,
  GrowthNodeId,
  GROWTH_BRANCH_INFO,
  GROWTH_TREE_NODES,
  PermanentBonuses
} from '../types';

type BranchType = 'collector' | 'synthesizer' | 'explorer';

export class GrowthTreeScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;
  private growthManager!: GrowthTreeManager;

  private scrollContainer!: Phaser.GameObjects.Container;
  private scrollY: number = 0;
  private maxScroll: number = 0;
  private contentHeight: number = 0;

  private selectedBranch: BranchType = 'collector';
  private branchTabs: Map<BranchType, Phaser.GameObjects.Container> = new Map();

  private nodeContainers: Map<GrowthNodeId, Phaser.GameObjects.Container> = new Map();
  private detailPanel!: Phaser.GameObjects.Container;
  private selectedNode: GrowthNode | null = null;

  constructor() {
    super('GrowthTreeScene');
  }

  create(): void {
    this.saveManager = SaveManager.getInstance();
    this.audioManager = AudioManager.getInstance(this);
    this.growthManager = GrowthTreeManager.getInstance();

    this.saveManager.clearGrowthNewUnlocks();

    this.createBackground();
    this.createHeader();
    this.createBranchTabs();
    this.createScrollContainer();
    this.createDetailPanel();
    this.createBackButton();
    this.createBonusSummary();

    this.renderBranch(this.selectedBranch);
    this.setupScrollInput();

    this.saveManager.checkGrowthTreeUnlocks();
  }

  private createBackground(): void {
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x2d1b4e, 0x2d1b4e, 1);
    gradient.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);
      this.add.circle(x, y, size, 0xc4b5fd, alpha);
    }

    const treeDecor = this.add.graphics();
    treeDecor.fillStyle(0x7c3aed, 0.08);
    treeDecor.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT - 200, 300);
    treeDecor.fillStyle(0x7c3aed, 0.05);
    treeDecor.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT - 300, 400);
  }

  private createHeader(): void {
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1e1b4b, 0.9);
    headerBg.fillRoundedRect(20, 20, GAME_WIDTH - 40, 120, 20);
    headerBg.lineStyle(2, 0xa78bfa, 0.6);
    headerBg.strokeRoundedRect(20, 20, GAME_WIDTH - 40, 120, 20);

    this.add.text(GAME_WIDTH / 2, 50, '🌳 成长之树', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '32px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const saveData = this.saveManager.getCurrentSave();
    const unlockedCount = saveData.growthTree.unlockedNodes.length;
    const totalCount = GROWTH_TREE_NODES.length;

    this.add.text(GAME_WIDTH / 2, 85, `已解锁 ${unlockedCount} / ${totalCount} 个节点`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#c4b5fd'
    }).setOrigin(0.5);

    const progressPercent = Math.floor((unlockedCount / totalCount) * 100);
    const barBg = this.add.graphics();
    barBg.fillStyle(0x312e81, 0.8);
    barBg.fillRoundedRect(GAME_WIDTH / 2 - 150, 105, 300, 10, 5);

    const barFill = this.add.graphics();
    barFill.fillStyle(0xfbbf24, 0.9);
    barFill.fillRoundedRect(GAME_WIDTH / 2 - 150, 105, 300 * (unlockedCount / totalCount), 10, 5);
  }

  private createBranchTabs(): void {
    const tabsY = 170;
    const branches: BranchType[] = ['collector', 'synthesizer', 'explorer'];
    const tabWidth = (GAME_WIDTH - 60) / 3;

    branches.forEach((branch, i) => {
      const x = 30 + i * tabWidth + tabWidth / 2;
      const info = GROWTH_BRANCH_INFO[branch];

      const tab = this.add.container(x, tabsY);
      const tabBg = this.add.graphics();

      const isSelected = branch === this.selectedBranch;
      const colorNum = parseInt(info.color.replace('#', ''), 16);

      tabBg.fillStyle(isSelected ? 0x7c3aed : 0x312e81, isSelected ? 0.95 : 0.8);
      tabBg.fillRoundedRect(-tabWidth / 2 + 5, -22, tabWidth - 10, 44, 16);
      tabBg.lineStyle(2, isSelected ? colorNum : 0x6366f1, isSelected ? 1 : 0.5);
      tabBg.strokeRoundedRect(-tabWidth / 2 + 5, -22, tabWidth - 10, 44, 16);

      tab.add(tabBg);
      tab.setData('bg', tabBg);

      const label = this.add.text(0, 0, `${info.icon} ${info.name}`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: isSelected ? '#fef3c7' : '#a78bfa',
        fontStyle: isSelected ? 'bold' : 'normal'
      }).setOrigin(0.5);
      tab.add(label);
      tab.setData('label', label);

      tab.setSize(tabWidth - 10, 44);
      tab.setInteractive();
      tab.on('pointerup', () => {
        if (this.selectedBranch !== branch) {
          this.audioManager.playClick();
          this.selectedBranch = branch;
          this.updateBranchTabs();
          this.renderBranch(branch);
        }
      });

      this.branchTabs.set(branch, tab);
    });
  }

  private updateBranchTabs(): void {
    const branches: BranchType[] = ['collector', 'synthesizer', 'explorer'];
    branches.forEach(branch => {
      const tab = this.branchTabs.get(branch);
      if (!tab) return;

      const info = GROWTH_BRANCH_INFO[branch];
      const isSelected = branch === this.selectedBranch;
      const colorNum = parseInt(info.color.replace('#', ''), 16);
      const tabBg = tab.getData('bg') as Phaser.GameObjects.Graphics;
      const label = tab.getData('label') as Phaser.GameObjects.Text;
      const tabWidth = (GAME_WIDTH - 60) / 3;

      tabBg.clear();
      tabBg.fillStyle(isSelected ? 0x7c3aed : 0x312e81, isSelected ? 0.95 : 0.8);
      tabBg.fillRoundedRect(-tabWidth / 2 + 5, -22, tabWidth - 10, 44, 16);
      tabBg.lineStyle(2, isSelected ? colorNum : 0x6366f1, isSelected ? 1 : 0.5);
      tabBg.strokeRoundedRect(-tabWidth / 2 + 5, -22, tabWidth - 10, 44, 16);

      label.setText(`${info.icon} ${info.name}`);
      label.setColor(isSelected ? '#fef3c7' : '#a78bfa');
      label.setFontStyle(isSelected ? 'bold' : 'normal');
    });
  }

  private createScrollContainer(): void {
    const viewportHeight = GAME_HEIGHT - 420;
    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0x000000, 1);
    maskGfx.fillRect(20, 230, GAME_WIDTH - 40, viewportHeight);

    this.scrollContainer = this.add.container(0, 0);
    const mask = maskGfx.createGeometryMask();
    this.scrollContainer.setMask(mask);
  }

  private createDetailPanel(): void {
    this.detailPanel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 180);
    this.detailPanel.setVisible(false);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1e1b4b, 0.97);
    panelBg.fillRoundedRect(-320, -70, 640, 140, 20);
    panelBg.lineStyle(2, 0xfbbf24, 0.8);
    panelBg.strokeRoundedRect(-320, -70, 640, 140, 20);
    this.detailPanel.add(panelBg);
  }

  private updateDetailPanel(node: GrowthNode): void {
    this.detailPanel.removeAll(true);
    this.selectedNode = node;

    const saveData = this.saveManager.getCurrentSave();
    const isUnlocked = saveData.growthTree.unlockedNodes.includes(node.id);
    const progress = this.growthManager.getNodeProgress(node, saveData);
    const prereqsMet = node.prerequisites.every(
      prereqId => saveData.growthTree.unlockedNodes.includes(prereqId)
    );

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1e1b4b, 0.97);
    panelBg.fillRoundedRect(-320, -70, 640, 140, 20);
    panelBg.lineStyle(2, isUnlocked ? 0x34d399 : 0xfbbf24, 0.8);
    panelBg.strokeRoundedRect(-320, -70, 640, 140, 20);
    this.detailPanel.add(panelBg);

    const iconText = this.add.text(-280, -40, node.icon, {
      fontSize: '36px'
    }).setOrigin(0, 0.5);
    this.detailPanel.add(iconText);

    const nameText = this.add.text(-230, -45, node.name, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: isUnlocked ? '#86efac' : '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.detailPanel.add(nameText);

    const tierText = this.add.text(280, -45, `Tier ${node.tier}`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#a78bfa'
    }).setOrigin(1, 0.5);
    this.detailPanel.add(tierText);

    const descText = this.add.text(-280, -10, node.description, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#c4b5fd'
    }).setOrigin(0, 0.5);
    this.detailPanel.add(descText);

    const rewardLabel = this.add.text(-280, 15, '🎁 奖励:', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#fbbf24',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.detailPanel.add(rewardLabel);

    const rewardText = this.add.text(-220, 15, node.rewardDescription, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#86efac'
    }).setOrigin(0, 0.5);
    this.detailPanel.add(rewardText);

    if (!isUnlocked) {
      const barWidth = 200;
      const barX = 280 - barWidth;

      const barBg = this.add.graphics();
      barBg.fillStyle(0x312e81, 0.8);
      barBg.fillRoundedRect(barX, 35, barWidth, 16, 8);
      this.detailPanel.add(barBg);

      const barFill = this.add.graphics();
      barFill.fillStyle(prereqsMet ? 0xfbbf24 : 0x6b7280, 0.9);
      barFill.fillRoundedRect(barX, 35, barWidth * (progress.percent / 100), 16, 8);
      this.detailPanel.add(barFill);

      const progressText = this.add.text(280, 30, `${progress.current} / ${progress.required}`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: prereqsMet ? '#fde68a' : '#6b7280'
      }).setOrigin(1, 0.5);
      this.detailPanel.add(progressText);

      if (!prereqsMet && node.prerequisites.length > 0) {
        const prereqText = this.add.text(-280, 42, '🔒 需要先解锁前置节点', {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '14px',
          color: '#6b7280'
        }).setOrigin(0, 0.5);
        this.detailPanel.add(prereqText);
      }
    } else {
      const unlockedText = this.add.text(280, 35, '✓ 已解锁', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#86efac',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      this.detailPanel.add(unlockedText);
    }

    this.detailPanel.setVisible(true);
  }

  private renderBranch(branch: BranchType): void {
    this.scrollContainer.removeAll(true);
    this.nodeContainers.clear();
    this.scrollY = 0;
    this.scrollContainer.setY(0);
    this.detailPanel.setVisible(false);
    this.selectedNode = null;

    const nodes = this.growthManager.getNodesByBranch(branch);
    const saveData = this.saveManager.getCurrentSave();
    const info = GROWTH_BRANCH_INFO[branch];
    const colorNum = parseInt(info.color.replace('#', ''), 16);

    const startY = 260;
    const nodeSpacing = 110;
    const centerX = GAME_WIDTH / 2;

    const treeLine = this.add.graphics();
    treeLine.lineStyle(4, colorNum, 0.3);
    treeLine.beginPath();
    treeLine.moveTo(centerX, startY - 30);
    treeLine.lineTo(centerX, startY + nodes.length * nodeSpacing + 30);
    treeLine.strokePath();
    this.scrollContainer.add(treeLine);

    nodes.forEach((node, index) => {
      const y = startY + index * nodeSpacing;
      const isUnlocked = saveData.growthTree.unlockedNodes.includes(node.id);
      const isNew = saveData.growthTree.newUnlockedNodes.includes(node.id);
      const progress = this.growthManager.getNodeProgress(node, saveData);
      const prereqsMet = node.prerequisites.every(
        prereqId => saveData.growthTree.unlockedNodes.includes(prereqId)
      );

      const nodeContainer = this.add.container(centerX, y);

      const nodeBg = this.add.graphics();
      const size = isUnlocked ? 60 : 50;

      if (isUnlocked) {
        nodeBg.fillStyle(colorNum, 0.2);
        nodeBg.fillCircle(0, 0, size + 10);
        nodeBg.fillStyle(colorNum, 0.4);
        nodeBg.fillCircle(0, 0, size + 5);
      }

      nodeBg.fillStyle(isUnlocked ? colorNum : 0x374151, isUnlocked ? 0.9 : 0.8);
      nodeBg.fillCircle(0, 0, size);
      nodeBg.lineStyle(3, isUnlocked ? 0xfef08a : 0x6b7280, isUnlocked ? 1 : 0.5);
      nodeBg.strokeCircle(0, 0, size);

      nodeContainer.add(nodeBg);
      nodeContainer.setData('bg', nodeBg);

      const iconText = this.add.text(0, 0, node.icon, {
        fontSize: isUnlocked ? '28px' : '22px'
      }).setOrigin(0.5);
      nodeContainer.add(iconText);

      const nameText = this.add.text(0, size + 15, node.name, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: isUnlocked ? '#fef3c7' : '#6b7280',
        fontStyle: isUnlocked ? 'bold' : 'normal'
      }).setOrigin(0.5);
      nodeContainer.add(nameText);

      if (!isUnlocked && prereqsMet) {
        const progressBg = this.add.graphics();
        progressBg.fillStyle(0x312e81, 0.8);
        progressBg.fillRoundedRect(-50, size + 32, 100, 8, 4);
        nodeContainer.add(progressBg);

        const progressFill = this.add.graphics();
        progressFill.fillStyle(0xfbbf24, 0.9);
        progressFill.fillRoundedRect(-50, size + 32, 100 * (progress.percent / 100), 8, 4);
        nodeContainer.add(progressFill);
      }

      if (isNew) {
        const newBadge = this.add.graphics();
        newBadge.fillStyle(0xef4444, 1);
        newBadge.fillCircle(size - 10, -size + 10, 12);
        nodeContainer.add(newBadge);

        const newText = this.add.text(size - 10, -size + 10, '!', {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        nodeContainer.add(newText);

        this.tweens.add({
          targets: [newBadge, newText],
          scale: { from: 1, to: 1.3 },
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      nodeContainer.setSize(size * 2, size * 2 + 50);
      nodeContainer.setInteractive(new Phaser.Geom.Circle(0, 0, size), Phaser.Geom.Circle.Contains);

      nodeContainer.on('pointerover', () => {
        if (!isUnlocked && !prereqsMet) return;
        this.tweens.add({
          targets: nodeContainer,
          scale: 1.1,
          duration: 150,
          ease: 'Sine.easeOut'
        });
      });

      nodeContainer.on('pointerout', () => {
        this.tweens.add({
          targets: nodeContainer,
          scale: 1,
          duration: 150,
          ease: 'Sine.easeOut'
        });
      });

      nodeContainer.on('pointerup', () => {
        if (!isUnlocked && !prereqsMet) return;
        this.audioManager.playClick();
        this.updateDetailPanel(node);
      });

      this.scrollContainer.add(nodeContainer);
      this.nodeContainers.set(node.id, nodeContainer);
    });

    this.contentHeight = startY + nodes.length * nodeSpacing + 100;
    const viewportHeight = GAME_HEIGHT - 420;
    this.maxScroll = Math.max(0, this.contentHeight - viewportHeight + 50);
  }

  private createBackButton(): void {
    const btn = this.add.graphics();
    btn.fillStyle(0x4c1d95, 0.9);
    btn.fillRoundedRect(30, GAME_HEIGHT - 60, 90, 40, 20);
    btn.setInteractive(
      new Phaser.Geom.Rectangle(30, GAME_HEIGHT - 60, 90, 40),
      Phaser.Geom.Rectangle.Contains
    );

    this.add.text(75, GAME_HEIGHT - 40, '← 返回', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#fef3c7'
    }).setOrigin(0.5);

    btn.on('pointerup', () => {
      this.audioManager.playClick();
      this.scene.start('MenuScene');
    });
  }

  private createBonusSummary(): void {
    const bonuses = this.saveManager.getPermanentBonuses();
    const summaryY = GAME_HEIGHT - 100;

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.9);
    panel.fillRoundedRect(140, summaryY - 25, GAME_WIDTH - 280, 50, 16);
    panel.lineStyle(2, 0x34d399, 0.5);
    panel.strokeRoundedRect(140, summaryY - 25, GAME_WIDTH - 280, 50, 16);

    const summary = this.formatBonusSummary(bonuses);
    this.add.text(GAME_WIDTH / 2, summaryY, `当前增益: ${summary}`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#86efac',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private formatBonusSummary(bonuses: PermanentBonuses): string {
    const parts: string[] = [];
    if (bonuses.scoreMultiplier > 1) parts.push(`分数×${bonuses.scoreMultiplier.toFixed(2)}`);
    if (bonuses.petalValueBonus > 0) parts.push(`花瓣+${bonuses.petalValueBonus}`);
    if (bonuses.rareChanceBonus > 0) parts.push(`稀有+${Math.floor(bonuses.rareChanceBonus * 100)}%`);
    if (bonuses.synthesisScoreBonus > 0) parts.push(`合成+${bonuses.synthesisScoreBonus}`);
    if (bonuses.startPetals > 0) parts.push(`起始×${bonuses.startPetals}`);
    if (bonuses.progressBonus > 0) parts.push(`进度+${Math.floor(bonuses.progressBonus * 100)}%`);
    if (bonuses.collectRadiusBonus > 0) parts.push(`范围+${bonuses.collectRadiusBonus}`);
    if (bonuses.spawnRateBonus > 0) parts.push(`生成+${Math.floor(bonuses.spawnRateBonus * 100)}%`);
    if (bonuses.maxPetalsBonus > 0) parts.push(`上限+${bonuses.maxPetalsBonus}`);
    if (bonuses.autoFeedStartEnabled) parts.push(`自动补料`);
    return parts.length > 0 ? parts.join(' | ') : '暂无';
  }

  private setupScrollInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      if (pointer.y < 230 || pointer.y > GAME_HEIGHT - 190) return;

      const dy = pointer.prevPosition.y - pointer.y;
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScroll);
      this.scrollContainer.setY(-this.scrollY);
    });

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
      this.scrollContainer.setY(-this.scrollY);
    });
  }
}
