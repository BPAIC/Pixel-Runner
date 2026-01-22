import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

window.onerror = (message, source, lineno, colno, error) => {
  console.error('[main] window error', message, source, lineno, colno, error);
};

const config = {
  type: Phaser.CANVAS,
  parent: 'app',
  width: 1280,
  height: 720,
  backgroundColor: '#6bb4ff',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1400 },
      debug: false
    }
  },
  pixelArt: true,
  scene: [BootScene, MenuScene, GameScene, UIScene]
};

setTimeout(() => {
  const game = new Phaser.Game(config);
  window.__game = game;
}, 0);
