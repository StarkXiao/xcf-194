import Phaser from 'phaser';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';

export class MenuScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;
  private fireflies: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.saveManager = SaveManager.getInstance();
    this.audioManager = AudioManager.getInstance(this);

    this.createBackground();
    this.createFireflies();
    this.createTitle();
    this.createButtons();
    this.createBestRecord();
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

    for (let i = 0; i < 8; i++) {
      const x = (GAME_WIDTH / 8) * i + Phaser.Math.Between(-20, 20);
      const tree = this.add.graphics();
      const treeHeight = Phaser.Math.Between(200, 400);
      const baseY = GAME_HEIGHT;
      tree.fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x0f0a1e, 0x0f0a1e, 0.6);
      tree.fillTriangle(x - 40, baseY, x + 40, baseY, x, baseY - treeHeight);
      tree.fillStyle(0x312e81, 0.3);
      tree.fillCircle(x, baseY - treeHeight + 20, 60);
    }

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 200, 'lover_sleeping').setScale(0.8).setAlpha(0.6);
  }

  private createFireflies(): void {
    for (let i = 0; i < 15; i++) {
      const firefly = this.add.graphics();
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(200, GAME_HEIGHT - 300);
      firefly.fillStyle(0xfef08a, 0.8);
      firefly.fillCircle(0, 0, 4);
      firefly.x = x;
      firefly.y = y;
      firefly.setData('baseX', x);
      firefly.setData('baseY', y);
      firefly.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2));
      this.fireflies.push(firefly);
    }

    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => this.animateFireflies()
    });
  }

  private animateFireflies(): void {
    const time = this.time.now / 1000;
    this.fireflies.forEach((f) => {
      const phase = f.getData('phase') as number;
      const baseX = f.getData('baseX') as number;
      const baseY = f.getData('baseY') as number;
      f.x = baseX + Math.sin(time * 0.5 + phase) * 40;
      f.y = baseY + Math.cos(time * 0.3 + phase * 1.3) * 25;
      f.alpha = 0.5 + Math.sin(time * 2 + phase) * 0.3;
    });
  }

  private createTitle(): void {
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x1e1b4b, 0.6);
    titleBg.fillRoundedRect(GAME_WIDTH / 2 - 280, 150, 560, 200, 24);
    titleBg.lineStyle(2, 0xa78bfa, 0.6);
    titleBg.strokeRoundedRect(GAME_WIDTH / 2 - 280, 150, 560, 200, 24);

    this.add.text(GAME_WIDTH / 2, 200, '梦境森林', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '64px',
      color: '#fef3c7',
      fontStyle: 'bold',
      shadow: {
        offsetX: 0,
        offsetY: 4,
        color: '#7c3aed',
        blur: 0,
        stroke: false,
        fill: true
      }
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 280, '✦ 花瓣之约 ✦', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '32px',
      color: '#c4b5fd'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 330, '收集发光花瓣，唤醒沉睡的恋人', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#a78bfa'
    }).setOrigin(0.5);
  }

  private createButtons(): void {
    const hasGameSave = this.saveManager.hasGameState();
    const saveInfo = this.saveManager.getGameStateInfo();

    let startY = 750;
    if (hasGameSave) {
      const saveDate = saveInfo ? new Date(saveInfo.savedAt).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      this.createButton(GAME_WIDTH / 2, startY, `继续游戏 (${saveDate})`, 0x059669, () => {
        this.audioManager.playClick();
        this.scene.start('GameScene', { loadSave: true });
      });
      startY += 110;
    }

    this.createButton(GAME_WIDTH / 2, startY, '开始新旅程', 0x7c3aed, () => {
      this.audioManager.playClick();
      this.scene.start('GameScene');
    });

    this.createButton(GAME_WIDTH / 2, startY + 110, '游戏说明', 0x4c1d95, () => {
      this.audioManager.playClick();
      this.showInstructions();
    });
  }

  private createButton(x: number, y: number, text: string, color: number, onClick: () => void): void {
    const btnBg = this.add.graphics();
    btnBg.fillStyle(color, 0.9);
    btnBg.fillRoundedRect(x - 180, y - 36, 360, 72, 36);
    btnBg.lineStyle(3, 0xc4b5fd, 0.8);
    btnBg.strokeRoundedRect(x - 180, y - 36, 360, 72, 36);
    btnBg.setInteractive(
      new Phaser.Geom.Rectangle(x - 180, y - 36, 360, 72),
      Phaser.Geom.Rectangle.Contains
    );

    const btnText = this.add.text(x, y, text, {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '28px',
      color: '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(color, 1);
      btnBg.fillRoundedRect(x - 185, y - 40, 370, 80, 36);
      btnBg.lineStyle(3, 0xfde68a, 1);
      btnBg.strokeRoundedRect(x - 185, y - 40, 370, 80, 36);
      btnText.setScale(1.05);
    });

    btnBg.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(color, 0.9);
      btnBg.fillRoundedRect(x - 180, y - 36, 360, 72, 36);
      btnBg.lineStyle(3, 0xc4b5fd, 0.8);
      btnBg.strokeRoundedRect(x - 180, y - 36, 360, 72, 36);
      btnText.setScale(1);
    });

    btnBg.on('pointerdown', () => {
      btnText.setScale(0.95);
      btnBg.setScale(0.97, 0.97);
    });

    btnBg.on('pointerup', () => {
      btnText.setScale(1);
      btnBg.setScale(1, 1);
      onClick();
    });
  }

  private showInstructions(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x0a0514, 0.85);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setInteractive();

    const panel = this.add.graphics();
    panel.fillStyle(0x1e1b4b, 0.95);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 300, 300, 600, 600, 24);
    panel.lineStyle(2, 0xa78bfa, 0.8);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - 300, 300, 600, 600, 24);

    this.add.text(GAME_WIDTH / 2, 350, '游戏说明', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '36px',
      color: '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const instructions = [
      '🌙 拖动/点击 控制角色在森林中移动',
      '✨ 靠近发光花瓣会自动收集',
      '🌸 3个同色花瓣→升级 | 彩虹2个→升级',
      '🔄 点击背包支持连续合成，自动升级',
      '⚡ 开启自动补料，低阶花瓣自动补全',
      '⭐ 合成更高等级花瓣获得更多分数',
      '💖 唤醒值满100即可唤醒恋人',
      '💾 游戏进度自动保存，支持继续游戏'
    ];

    instructions.forEach((text, i) => {
      this.add.text(GAME_WIDTH / 2, 420 + i * 65, text, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '22px',
        color: '#c4b5fd',
        align: 'center',
        wordWrap: { width: 520 }
      }).setOrigin(0.5);
    });

    const closeBtn = this.add.graphics();
    closeBtn.fillStyle(0x7c3aed, 0.9);
    closeBtn.fillRoundedRect(GAME_WIDTH / 2 - 100, 820, 200, 56, 28);
    closeBtn.setInteractive(
      new Phaser.Geom.Rectangle(GAME_WIDTH / 2 - 100, 820, 200, 56),
      Phaser.Geom.Rectangle.Contains
    );

    this.add.text(GAME_WIDTH / 2, 848, '知道了', {
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    closeBtn.on('pointerup', () => {
      this.audioManager.playClick();
      overlay.destroy();
      panel.destroy();
      closeBtn.destroy();
      this.children.each((c) => {
        if ((c as Phaser.GameObjects.Text).text === '游戏说明' ||
            instructions.includes((c as Phaser.GameObjects.Text).text || '') ||
            (c as Phaser.GameObjects.Text).text === '知道了') {
          c.destroy();
        }
      }, this);
    });
  }

  private createBestRecord(): void {
    const saveData = this.saveManager.loadSave();

    if (saveData.gamesPlayed > 0) {
      const recordBg = this.add.graphics();
      recordBg.fillStyle(0x1e1b4b, 0.6);
      recordBg.fillRoundedRect(GAME_WIDTH / 2 - 200, 1000, 400, 80, 16);

      this.add.text(GAME_WIDTH / 2, 1025, `最佳唤醒: ${saveData.bestProgress}%`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '20px',
        color: '#fde68a'
      }).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, 1055, `最高分数: ${saveData.bestScore}`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#a78bfa'
      }).setOrigin(0.5);
    }
  }
}
