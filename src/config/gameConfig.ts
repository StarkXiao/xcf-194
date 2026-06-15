import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { GameScene } from '../scenes/GameScene';
import { ResultScene } from '../scenes/ResultScene';
import { EventScene } from '../scenes/EventScene';
import { GrowthTreeScene } from '../scenes/GrowthTreeScene';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  backgroundColor: '#0a0514',
  scene: [BootScene, MenuScene, EventScene, GameScene, ResultScene, GrowthTreeScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
};
