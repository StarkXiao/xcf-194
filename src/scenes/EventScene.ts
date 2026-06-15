import Phaser from 'phaser';
import { EventManager } from '../managers/EventManager';
import { AudioManager } from '../managers/AudioManager';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  EventTask,
  EventStageReward,
  EventTaskProgress,
  EventStageProgress
} from '../types';

export class EventScene extends Phaser.Scene {
  private eventManager!: EventManager;
  private audioManager!: AudioManager;
  private countdownText!: Phaser.GameObjects.Text;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private scrollContainer!: Phaser.GameObjects.Container;
  private contentHeight: number = 0;
  private scrollY: number = 0;
  private maxScroll: number = 0;
  private taskContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private stageContainers: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super('EventScene');
  }

  create(): void {
    this.eventManager = EventManager.getInstance();
    this.audioManager = AudioManager.getInstance(this);

    this.createBackground();
    this.createHeader();
    this.createScrollableContent();
    this.createBottomBar();
    this.setupScrollInput();
    this.startCountdown();
  }

  private createBackground(): void {
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(0x1a0a2e, 0x2d1b4e, 0x4c1d95, 0x5b21b6, 1);
    gradient.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);
      this.add.circle(x, y, size, 0xfef08a, alpha);
    }

    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const color = [0xff9ec4, 0x7dd3fc, 0xc084fc, 0xfcd34d];
      this.tweens.add({
        targets: this.add.circle(x, y, 4, Phaser.Utils.Array.GetRandom(color), 0.6),
        y: y - 200,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createHeader(): void {
    const event = this.eventManager.getCurrentEvent();
    if (!event) return;

    const bannerBg = this.add.graphics();
    bannerBg.fillStyle(0x1e1b4b, 0.9);
    bannerBg.fillRoundedRect(20, 30, GAME_WIDTH - 40, 200, 24);
    bannerBg.lineStyle(3, 0xfbbf24, 0.8);
    bannerBg.strokeRoundedRect(20, 30, GAME_WIDTH - 40, 200, 24);

    this.add.text(GAME_WIDTH / 2, 70, `${event.banner} ${event.name}`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '36px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 115, event.description, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#c4b5fd'
    }).setOrigin(0.5);

    const countdownBg = this.add.graphics();
    countdownBg.fillStyle(0x059669, 0.3);
    countdownBg.fillRoundedRect(GAME_WIDTH / 2 - 180, 145, 360, 60, 30);
    countdownBg.lineStyle(2, 0x34d399, 0.8);
    countdownBg.strokeRoundedRect(GAME_WIDTH / 2 - 180, 145, 360, 60, 30);

    this.add.text(GAME_WIDTH / 2 - 150, 175, '⏰ 距结束', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#86efac',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.countdownText = this.add.text(GAME_WIDTH / 2 + 150, 175, '', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    this.updateCountdown();
  }

  private startCountdown(): void {
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.updateCountdown();
      }
    });
  }

  private updateCountdown(): void {
    const remaining = this.eventManager.getTimeRemaining();
    this.countdownText.setText(this.eventManager.formatTimeRemaining(remaining));

    if (remaining <= 0) {
      this.countdownTimer?.destroy();
    }
  }

  private createScrollableContent(): void {
    this.scrollContainer = this.add.container(0, 0);

    let y = 250;

    y = this.createStageRewardsSection(y);
    y = this.createTasksSection(y);

    this.contentHeight = y + 40;
    this.maxScroll = Math.max(0, this.contentHeight - (GAME_HEIGHT - 200));
  }

  private createStageRewardsSection(startY: number): number {
    const event = this.eventManager.getCurrentEvent();
    const progress = this.eventManager.getEventProgress();
    if (!event || !progress) return startY;

    const panelX = 20;
    const panelW = GAME_WIDTH - 40;
    const panelH = 280;

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.92);
    panel.fillRoundedRect(panelX, startY, panelW, panelH, 20);
    panel.lineStyle(2, 0xfbbf24, 0.6);
    panel.strokeRoundedRect(panelX, startY, panelW, panelH, 20);
    this.scrollContainer.add(panel);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, startY + 30, '🏆 阶段奖励', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const currentValue = this.eventManager.getStageProgressValue();
    const totalStages = event.stageRewards.length;
    const currentStage = this.eventManager.getCurrentStage();

    const progressLabel = this.add.text(GAME_WIDTH / 2, startY + 65, `进度: ${currentValue} / ${event.stageRewards[totalStages - 1].requirement} 花瓣`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#c4b5fd'
    }).setOrigin(0.5);
    this.scrollContainer.add(progressLabel);

    const barX = panelX + 40;
    const barY = startY + 100;
    const barW = panelW - 80;
    const barH = 24;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x312e81, 0.8);
    barBg.fillRoundedRect(barX, barY, barW, barH, 12);
    this.scrollContainer.add(barBg);

    const maxReq = event.stageRewards[totalStages - 1].requirement;
    const progressPct = Math.min(currentValue / maxReq, 1);
    const barFill = this.add.graphics();
    barFill.fillGradientStyle(0xfbbf24, 0xf59e0b, 0xfbbf24, 0xf59e0b, 1);
    barFill.fillRoundedRect(barX, barY, Math.max(barW * progressPct, 4), barH, 12);
    this.scrollContainer.add(barFill);

    const nodeY = barY + barH + 20;
    const nodeSpacing = barW / (totalStages - 1);

    event.stageRewards.forEach((stage, i) => {
      const nodeX = barX + i * nodeSpacing;
      const stageProg = progress.stageProgress.find(s => s.stageId === stage.id);
      const isCompleted = stageProg?.completed ?? false;
      const isClaimed = stageProg?.claimed ?? false;

      const node = this.add.graphics();
      if (isCompleted) {
        node.fillStyle(isClaimed ? 0x34d399 : 0xfbbf24, 1);
      } else {
        node.fillStyle(0x4b5563, 1);
      }
      node.fillCircle(nodeX, nodeY + 15, 12);
      const strokeColor = isCompleted ? (isClaimed ? 0x86efac : 0xfde68a) : 0x6b7280;
      node.lineStyle(2, strokeColor, 1);
      node.strokeCircle(nodeX, nodeY + 15, 12);
      this.scrollContainer.add(node);

      const stageName = this.add.text(nodeX, nodeY + 45, `第${stage.stage}阶`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: isCompleted ? '#fde68a' : '#6b7280',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.scrollContainer.add(stageName);

      const rewardText = this.add.text(nodeX, nodeY + 65, stage.rewardDetail || '', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: isCompleted ? '#86efac' : '#6b7280'
      }).setOrigin(0.5);
      this.scrollContainer.add(rewardText);

      if (isCompleted && !isClaimed) {
        const claimBtn = this.createMiniButton(
          nodeX,
          nodeY + 90,
          '领取',
          0x059669,
          () => this.onClaimStageReward(stage.id)
        );
        claimBtn.setScale(0.7);
        this.scrollContainer.add(claimBtn);
        this.stageContainers.set(stage.id, claimBtn);
      } else if (isClaimed) {
        const claimedText = this.add.text(nodeX, nodeY + 90, '已领取', {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '14px',
          color: '#86efac',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        this.scrollContainer.add(claimedText);
      }
    });

    return startY + panelH + 20;
  }

  private createTasksSection(startY: number): number {
    const event = this.eventManager.getCurrentEvent();
    const progress = this.eventManager.getEventProgress();
    if (!event || !progress) return startY;

    const panelX = 20;
    const panelW = GAME_WIDTH - 40;
    const taskCount = event.tasks.length;
    const panelH = 100 + taskCount * 110;

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.92);
    panel.fillRoundedRect(panelX, startY, panelW, panelH, 20);
    panel.lineStyle(2, 0xa78bfa, 0.6);
    panel.strokeRoundedRect(panelX, startY, panelW, panelH, 20);
    this.scrollContainer.add(panel);

    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, startY + 30, '📋 活动任务', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    const completedCount = this.eventManager.getCompletedTaskCount();
    const totalCount = this.eventManager.getTotalTaskCount();
    this.scrollContainer.add(
      this.add.text(GAME_WIDTH / 2, startY + 60, `已完成 ${completedCount} / ${totalCount}`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#c4b5fd'
      }).setOrigin(0.5)
    );

    event.tasks.forEach((task, i) => {
      const taskY = startY + 90 + i * 110;
      const taskProg = progress.taskProgress.find(t => t.taskId === task.id);
      this.createTaskItem(taskY, task, taskProg);
    });

    return startY + panelH + 20;
  }

  private createTaskItem(
    y: number,
    task: EventTask,
    taskProg?: EventTaskProgress
  ): void {
    const panelW = GAME_WIDTH - 80;
    const panelX = 40;

    const isCompleted = taskProg?.completed ?? false;
    const isClaimed = taskProg?.claimed ?? false;
    const current = taskProg?.current ?? 0;
    const progressPct = Math.min(current / task.target, 1);

    const taskBg = this.add.graphics();
    if (isClaimed) {
      taskBg.fillStyle(0x065f46, 0.4);
    } else if (isCompleted) {
      taskBg.fillStyle(0x7c3aed, 0.4);
    } else {
      taskBg.fillStyle(0x312e81, 0.6);
    }
    taskBg.fillRoundedRect(panelX, y, panelW, 95, 16);
    const strokeColor = isClaimed ? 0x34d399 : (isCompleted ? 0xfbbf24 : 0x6366f1);
    const strokeAlpha = isClaimed ? 0.6 : 0.4;
    taskBg.lineStyle(2, strokeColor, strokeAlpha);
    taskBg.strokeRoundedRect(panelX, y, panelW, 95, 16);
    this.scrollContainer.add(taskBg);

    const iconText = this.add.text(panelX + 25, y + 28, task.icon, {
      fontSize: '32px'
    }).setOrigin(0, 0.5);
    this.scrollContainer.add(iconText);

    const nameText = this.add.text(panelX + 70, y + 22, task.name, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: isClaimed ? '#86efac' : '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.scrollContainer.add(nameText);

    const descText = this.add.text(panelX + 70, y + 48, task.description, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#c4b5fd'
    }).setOrigin(0, 0.5);
    this.scrollContainer.add(descText);

    const rewardLabel = this.add.text(panelX + 70, y + 72, `奖励: ${task.rewardDetail || ''}`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#fbbf24'
    }).setOrigin(0, 0.5);
    this.scrollContainer.add(rewardLabel);

    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x1e1b4b, 0.8);
    progressBarBg.fillRoundedRect(panelX + panelW - 180, y + 20, 140, 16, 8);
    this.scrollContainer.add(progressBarBg);

    const progressBarFill = this.add.graphics();
    progressBarFill.fillStyle(isCompleted ? 0x34d399 : 0x818cf8, 1);
    progressBarFill.fillRoundedRect(panelX + panelW - 180, y + 20, Math.max(140 * progressPct, 4), 16, 8);
    this.scrollContainer.add(progressBarFill);

    const progressText = this.add.text(panelX + panelW - 110, y + 50, `${Math.floor(current)} / ${task.target}`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#a78bfa'
    }).setOrigin(0.5);
    this.scrollContainer.add(progressText);

    if (isCompleted && !isClaimed) {
      const claimBtn = this.createMiniButton(
        panelX + panelW - 50,
        y + 55,
        '领取',
        0x059669,
        () => this.onClaimTaskReward(task.id)
      );
      claimBtn.setScale(0.75);
      this.scrollContainer.add(claimBtn);
      this.taskContainers.set(task.id, claimBtn);
    } else if (isClaimed) {
      const claimedText = this.add.text(panelX + panelW - 50, y + 55, '✓ 已领', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#86efac',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.scrollContainer.add(claimedText);
    }
  }

  private createMiniButton(
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(color, 0.9);
    btnBg.fillRoundedRect(-40, -20, 80, 40, 20);
    btnBg.lineStyle(2, 0xc4b5fd, 0.8);
    btnBg.strokeRoundedRect(-40, -20, 80, 40, 20);
    container.add(btnBg);

    const btnText = this.add.text(0, 0, text, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(btnText);

    container.setSize(80, 40);
    container.setInteractive();

    container.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(color, 1);
      btnBg.fillRoundedRect(-42, -22, 84, 44, 22);
      btnBg.lineStyle(2, 0xfde68a, 1);
      btnBg.strokeRoundedRect(-42, -22, 84, 44, 22);
      btnText.setScale(1.05);
    });

    container.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(color, 0.9);
      btnBg.fillRoundedRect(-40, -20, 80, 40, 20);
      btnBg.lineStyle(2, 0xc4b5fd, 0.8);
      btnBg.strokeRoundedRect(-40, -20, 80, 40, 20);
      btnText.setScale(1);
    });

    container.on('pointerdown', () => {
      btnText.setScale(0.95);
      container.setScale(container.scaleX * 0.97, container.scaleY * 0.97);
    });

    container.on('pointerup', () => {
      btnText.setScale(1);
      container.setScale(container.scaleX / 0.97, container.scaleY / 0.97);
      onClick();
    });

    return container;
  }

  private onClaimTaskReward(taskId: string): void {
    const result = this.eventManager.claimTaskReward(taskId);
    if (result.success && result.reward) {
      this.audioManager.playClick();
      this.showRewardToast(result.reward.detail || '奖励已领取');
      this.refreshContent();
    }
  }

  private onClaimStageReward(stageId: string): void {
    const result = this.eventManager.claimStageReward(stageId);
    if (result.success && result.reward) {
      this.audioManager.playClick();
      this.showRewardToast(result.reward.detail || '奖励已领取');
      this.refreshContent();
    }
  }

  private showRewardToast(text: string): void {
    const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `🎉 ${text}`, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '28px',
      color: '#fde68a',
      fontStyle: 'bold',
      backgroundColor: '#1e1b4bee',
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setAlpha(0).setDepth(1000).setScale(0.5);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: toast,
          alpha: 0,
          y: toast.y - 50,
          duration: 500,
          delay: 1500,
          ease: 'Sine.easeIn',
          onComplete: () => toast.destroy()
        });
      }
    });
  }

  private refreshContent(): void {
    this.scrollContainer.destroy(true);
    this.taskContainers.clear();
    this.stageContainers.clear();
    this.createScrollableContent();
  }

  private createBottomBar(): void {
    const barY = GAME_HEIGHT - 120;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x0a0514, 0.95);
    barBg.fillRect(0, barY - 10, GAME_WIDTH, 130);
    barBg.lineStyle(1, 0x312e81, 0.8);
    barBg.lineBetween(0, barY - 10, GAME_WIDTH, barY - 10);

    this.createButton(GAME_WIDTH / 2 - 170, GAME_HEIGHT - 70, '开始游戏', 0x059669, () => {
      this.audioManager.playClick();
      this.scene.start('GameScene');
    });

    this.createButton(GAME_WIDTH / 2 + 170, GAME_HEIGHT - 70, '返回菜单', 0x4c1d95, () => {
      this.audioManager.playClick();
      this.scene.start('MenuScene');
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
      btnBg.clear();
      btnBg.fillStyle(color, 1);
      btnBg.fillRoundedRect(x - 145, y - 32, 290, 64, 32);
      btnBg.lineStyle(2, 0xfde68a, 1);
      btnBg.strokeRoundedRect(x - 145, y - 32, 290, 64, 32);
      btnText.setScale(1.05);
    });

    btnBg.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(color, 0.9);
      btnBg.fillRoundedRect(x - 140, y - 28, 280, 56, 28);
      btnBg.lineStyle(2, 0xc4b5fd, 0.8);
      btnBg.strokeRoundedRect(x - 140, y - 28, 280, 56, 28);
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
}
