import Phaser from 'phaser';
import { getSafeInsets } from '../utils/safeArea.js';

const LEADERBOARD_KEY = 'pixel_runner_leaderboard';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
    this.currentCollected = 0;
    this.totalCoins = 0;
  }

  create() {
    const { width, height } = this.scale;

    this.scoreText = this.add.text(16, 16, 'Collected: 0 / 0', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setScrollFactor(0);

    this.noticeText = this.add.text(width / 2, 60, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#ffe38a',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5, 0.5).setScrollFactor(0);

    this.livesText = this.add.text(width - 16, 16, 'Lives: 3', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(1, 0).setScrollFactor(0);

    this.overlay = this.add.rectangle(0, 0, width, height, 0x0b1220, 0.85)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setVisible(false);

    this.overlayTitle = this.add.text(width / 2, height / 2 - 80, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '36px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setVisible(false);

    this.overlayBody = this.add.text(width / 2, height / 2 - 20, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#cfe8ff',
      align: 'center'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setVisible(false);

    this.overlayAction = this.add.text(width / 2, height / 2 + 70, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#1d3c6a',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setVisible(false);

    this.orientationText = this.add.text(width / 2, height - 40, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#ffe38a',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5, 0.5).setScrollFactor(0);

    this.rotateOverlay = this.add.rectangle(0, 0, width, height, 0x0b1220, 0.88)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setVisible(false)
      .setDepth(5000);
    this.rotateText = this.add.text(width / 2, height / 2, 'Поверни телефон\nв альбомную ориентацию', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setVisible(false).setDepth(5001);
    this.rotateHint = this.add.text(width / 2, height / 2 + 70, 'Игра работает только в ландшафте', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#cfe8ff',
      align: 'center'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setVisible(false).setDepth(5001);

    this.overlayAction.setInteractive({ useHandCursor: true });

    this.keyRestart = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyNextEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyNextSpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.onScoreChanged = (collected, total) => {
      this.currentCollected = collected;
      this.totalCoins = total;
      this.scoreText.setText(`Collected: ${collected} / ${total}`);
    };
    this.onNeedCoins = (required) => {
      this.showNotice(`Need ${required} coins to finish!`);
    };
    this.onLivesChanged = (lives) => {
      this.livesText.setText(`Lives: ${lives}`);
    };
    this.onWin = (payload) => {
      this.saveScore(payload && typeof payload.collected === 'number' ? payload.collected : this.currentCollected);
      this.showWin();
    };
    this.onGameOver = (payload) => {
      this.saveScore(payload && typeof payload.collected === 'number' ? payload.collected : this.currentCollected);
      this.showGameOver();
    };
    this.onGameReady = (payload) => {
      this.syncScore(payload);
      if (payload && typeof payload.lives === 'number') {
        this.livesText.setText(`Lives: ${payload.lives}`);
      }
    };

    if (this.handlersAttached) {
      return;
    }

    this.game.events.on('score-changed', this.onScoreChanged);
    this.game.events.on('need-coins', this.onNeedCoins);
    this.game.events.on('lives-changed', this.onLivesChanged);
    this.game.events.on('win', this.onWin);
    this.game.events.on('game-over', this.onGameOver);
    this.game.events.on('game-ready', this.onGameReady);
    this.handlersAttached = true;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('score-changed', this.onScoreChanged);
      this.game.events.off('need-coins', this.onNeedCoins);
      this.game.events.off('lives-changed', this.onLivesChanged);
      this.game.events.off('win', this.onWin);
      this.game.events.off('game-over', this.onGameOver);
      this.game.events.off('game-ready', this.onGameReady);
      this.scale.off('resize', this.layoutUI, this);
      this.onScoreChanged = null;
      this.onNeedCoins = null;
      this.onLivesChanged = null;
      this.onWin = null;
      this.onGameOver = null;
      this.onGameReady = null;
      this.handlersAttached = false;
    });

    this.overlayAction.on('pointerdown', () => {
      this.game.sound.unlock();
      if (this.overlayAction.getData('action') === 'restart') {
        this.restartLevel();
      }
      if (this.overlayAction.getData('action') === 'next') {
        this.nextLevel();
      }
      if (this.overlayAction.getData('action') === 'menu') {
        this.returnToMenu();
      }
    });

    this.overlayAction.setData('action', '');
    this.syncScore({ totalCoins: this.registry.get('totalCoins') });

    this.layoutUI();
    this.scale.on('resize', this.layoutUI, this);
  }

  update() {
    if (this.registry.get('portraitBlocked')) {
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.returnToMenu();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyRestart)) {
      if (this.overlayAction.getData('action') === 'menu') {
        this.returnToMenu();
      } else {
        this.restartLevel();
      }
    }
    if (this.overlayAction.getData('action') === 'next') {
      if (Phaser.Input.Keyboard.JustDown(this.keyNextEnter) ||
          Phaser.Input.Keyboard.JustDown(this.keyNextSpace)) {
        this.nextLevel();
      }
    }
    if (this.overlayAction.getData('action') === 'menu') {
      if (Phaser.Input.Keyboard.JustDown(this.keyNextEnter) ||
          Phaser.Input.Keyboard.JustDown(this.keyNextSpace)) {
        this.returnToMenu();
      }
    }
  }

  showNotice(message) {
    this.noticeText.setText(message);
    this.time.delayedCall(1400, () => {
      this.noticeText.setText('');
    });
  }

  showWin() {
    this.overlay.setVisible(true);
    this.overlayTitle.setText('You Win!').setVisible(true);
    this.overlayBody.setText('Great run! Ready for the next level?').setVisible(true);
    this.overlayAction.setText('Next Level (Enter)').setData('action', 'next').setVisible(true);
  }

  showGameOver() {
    this.overlay.setVisible(true);
    this.overlayTitle.setText('Game Over').setVisible(true);
    this.overlayBody.setText('Out of lives. Back to menu?').setVisible(true);
    this.overlayAction.setText('Menu (Enter)').setData('action', 'menu').setVisible(true);
  }

  hideOverlay() {
    this.overlay.setVisible(false);
    this.overlayTitle.setVisible(false);
    this.overlayBody.setVisible(false);
    this.overlayAction.setVisible(false);
  }

  restartLevel() {
    this.hideOverlay();
    this.noticeText.setText('');
    this.overlayAction.setData('action', '');
    this.registry.set('startRequested', true);
    this.scene.stop('GameScene');
    this.scene.start('GameScene');
    this.scene.bringToTop('UIScene');
  }

  returnToMenu() {
    this.hideOverlay();
    this.noticeText.setText('');
    this.overlayAction.setData('action', '');
    this.scene.stop('GameScene');
    this.scene.stop();
    this.scene.start('MenuScene');
  }

  nextLevel() {
    this.hideOverlay();
    this.noticeText.setText('');
    this.overlayAction.setData('action', '');
    this.registry.set('startRequested', true);
    this.scene.stop('GameScene');
    this.scene.start('GameScene');
    this.scene.bringToTop('UIScene');
  }

  syncScore(payload) {
    if (payload && typeof payload.totalCoins === 'number') {
      this.currentCollected = 0;
      this.totalCoins = payload.totalCoins;
      this.scoreText.setText(`Collected: 0 / ${payload.totalCoins}`);
    }
  }

  saveScore(collected) {
    const name = this.registry.get('playerName') || 'Player';
    const entry = {
      name,
      coins: collected,
      date: new Date().toISOString()
    };
    let board = [];
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      board = raw ? JSON.parse(raw) : [];
    } catch (error) {
      board = [];
    }
    board.push(entry);
    board.sort((a, b) => b.coins - a.coins);
    board = board.slice(0, 10);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
    } catch (error) {
      // ignore storage errors
    }
  }

  layoutUI() {
    const { width, height } = this.scale;
    const safe = this.getSafeRect();
    const minDim = Math.min(safe.width, safe.height);
    const isPortrait = safe.height > safe.width;
    const scaleBase = isPortrait ? safe.height : minDim;
    const scale = Phaser.Math.Clamp(scaleBase / 720, 0.85, 1.4);

    const scoreSize = Math.round(20 * scale);
    const infoSize = Math.round(18 * scale);
    const titleSize = Math.round(36 * scale);
    const bodySize = Math.round(20 * scale);

    this.scoreText.setFontSize(`${scoreSize}px`).setPosition(safe.left + 16, safe.top + 16);
    this.livesText.setFontSize(`${infoSize}px`).setPosition(safe.right - 16, safe.top + 16);
    const noticeY = safe.top + (minDim < 540 ? 80 : 60);
    this.noticeText.setFontSize(`${infoSize}px`).setPosition(safe.left + safe.width / 2, noticeY);

    this.overlay.setSize(width, height).setPosition(0, 0);
    this.overlayTitle.setFontSize(`${titleSize}px`).setPosition(safe.left + safe.width / 2, safe.top + safe.height / 2 - 80);
    this.overlayBody.setFontSize(`${bodySize}px`).setPosition(safe.left + safe.width / 2, safe.top + safe.height / 2 - 20);
    this.overlayAction.setFontSize(`${bodySize}px`).setPosition(safe.left + safe.width / 2, safe.top + safe.height / 2 + 70);

    if (isPortrait) {
      this.orientationText.setText('Лучше играть в альбомной ориентации');
    } else {
      this.orientationText.setText('');
    }
    this.orientationText.setPosition(safe.left + safe.width / 2, safe.bottom - 40);

    this.rotateOverlay.setSize(width, height).setPosition(0, 0);
    this.rotateText.setFontSize(`${Math.round(28 * scale)}px`).setPosition(safe.left + safe.width / 2, safe.top + safe.height / 2);
    this.rotateHint.setFontSize(`${Math.round(18 * scale)}px`).setPosition(safe.left + safe.width / 2, safe.top + safe.height / 2 + 70);

    const portraitBlocked = isPortrait && this.sys.game.device.input.touch;
    this.rotateOverlay.setVisible(portraitBlocked);
    this.rotateText.setVisible(portraitBlocked);
    this.rotateHint.setVisible(portraitBlocked);
    this.registry.set('portraitBlocked', portraitBlocked);
  }

  getSafeRect() {
    const gameW = this.scale.width;
    const gameH = this.scale.height;
    const display = this.scale.displaySize || { width: gameW, height: gameH };
    const scale = Math.max(display.width / gameW, display.height / gameH) || 1;
    const visibleW = display.width / scale;
    const visibleH = display.height / scale;
    const insetX = (gameW - visibleW) / 2;
    const insetY = (gameH - visibleH) / 2;
    const insets = getSafeInsets();
    return {
      left: insetX + insets.left,
      right: gameW - insetX - insets.right,
      top: insetY + insets.top,
      bottom: gameH - insetY - insets.bottom,
      width: visibleW - insets.left - insets.right,
      height: visibleH - insets.top - insets.bottom
    };
  }
}
