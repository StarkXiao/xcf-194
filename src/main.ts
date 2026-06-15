import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { AssetGenerator } from './utils/AssetGenerator';

window.addEventListener('DOMContentLoaded', () => {
  AssetGenerator.generateAll();
  new Phaser.Game(gameConfig);
});
