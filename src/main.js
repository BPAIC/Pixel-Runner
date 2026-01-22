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
  backgroundColor: '#6bb4ff',
  resolution: Math.min(window.devicePixelRatio || 1, 1.5),
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  fps: {
    target: 45,
    min: 20,
    forceSetTimeOut: false
  },
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
  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.textContent = '';
  }
  const game = new Phaser.Game(config);
  window.__game = game;
}, 0);
