import Phaser from 'phaser';
import { getSafeInsets } from '../utils/safeArea.js';

const CONTACT_LINK = 'https://t.me/bpaic';
const CONTACT_LABEL = 'Contact: t.me/bpaic';
const LEADERBOARD_KEY = 'pixel_runner_leaderboard';
const NAME_KEY = 'pixel_runner_name';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
    this.ui = {};
  }

  create() {
    const { width, height } = this.scale;
    if (!this.registry.get('playerName')) {
      const storedName = localStorage.getItem(NAME_KEY);
      if (storedName) {
        this.registry.set('playerName', storedName);
      }
    }
    const playerName = this.registry.get('playerName') || 'Player';

    this.ui.backdrop = this.add.rectangle(0, 0, width, height, 0x0b1220, 0.9).setOrigin(0, 0);

    this.ui.titleText = this.add.text(0, 0, 'Pixel Runner', {
      fontFamily: 'Trebuchet MS',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    this.nameText = this.add.text(0, 0, `Player: ${playerName}`, {
      fontFamily: 'Trebuchet MS',
      color: '#ffe38a'
    }).setOrigin(0.5, 0.5);

    this.ui.howTitle = this.add.text(0, 0, 'How to play', {
      fontFamily: 'Trebuchet MS',
      color: '#cfe8ff'
    }).setOrigin(0.5, 0.5);

    this.ui.howBody = this.add.text(0, 0, 'Move: A/D or Arrow Keys\nJump: W, Space, or Up Arrow\nTouch: on-screen buttons\nR: Restart level, Esc: Menu\nCollect coins and reach the flag.\nNeed at least 8 coins to finish.', {
      fontFamily: 'Trebuchet MS',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5, 0.5);

    this.ui.startButton = this.add.text(0, 0, 'Start Game (Enter)', {
      fontFamily: 'Trebuchet MS',
      color: '#ffffff',
      backgroundColor: '#1d3c6a',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    this.ui.renameButton = this.add.text(0, 0, 'Change Name', {
      fontFamily: 'Trebuchet MS',
      color: '#ffffff',
      backgroundColor: '#2a2f3a',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    this.ui.contactButton = this.add.text(0, 0, CONTACT_LABEL, {
      fontFamily: 'Trebuchet MS',
      color: '#ffe38a',
      backgroundColor: '#2a2f3a',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    this.ui.startButton.on('pointerdown', () => this.startGame());
    this.ui.renameButton.on('pointerdown', () => this.promptName());
    this.ui.contactButton.on('pointerdown', () => {
      window.open(CONTACT_LINK, '_blank');
    });

    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-ESC', () => this.attemptExit());

    this.exitNotice = this.add.text(0, 0, 'Press Esc to exit', {
      fontFamily: 'Trebuchet MS',
      color: '#8aa3c7'
    }).setOrigin(0.5, 0.5);

    this.renderLeaderboard(width, height);

    this.rotateOverlay = this.add.rectangle(0, 0, width, height, 0x0b1220, 0.9)
      .setOrigin(0, 0)
      .setVisible(false)
      .setDepth(5000);
    this.rotateText = this.add.text(width / 2, height / 2, 'Поверни телефон\nв альбомную ориентацию', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5, 0.5).setVisible(false).setDepth(5001);
    this.rotateHint = this.add.text(width / 2, height / 2 + 70, 'Меню доступно только в ландшафте', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#cfe8ff',
      align: 'center'
    }).setOrigin(0.5, 0.5).setVisible(false).setDepth(5001);

    this.layoutMenu();
    this.scale.on('resize', this.layoutMenu, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutMenu, this);
    });
  }

  startGame() {
    if (this.isPortrait()) {
      this.layoutMenu();
      return;
    }
    this.tryLockLandscape();
    this.scene.stop('UIScene');
    this.registry.set('startRequested', true);
    this.registry.set('runCoins', 0);
    this.registry.set('lives', 3);
    if (!this.registry.get('playerName')) {
      this.promptName();
    }
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }

  promptName() {
    const current = this.registry.get('playerName') || 'Player';
    const name = window.prompt('Your name:', current);
    if (name && name.trim()) {
      this.registry.set('playerName', name.trim().slice(0, 16));
      try {
        localStorage.setItem(NAME_KEY, this.registry.get('playerName'));
      } catch (error) {
        // ignore storage errors
      }
      if (this.nameText) {
        this.nameText.setText(`Player: ${this.registry.get('playerName')}`);
      }
    }
  }

  renderLeaderboard(width, height) {
    const board = this.loadLeaderboard();
    this.ui.boardTitle = this.add.text(0, 0, 'Leaderboard', {
      fontFamily: 'Trebuchet MS',
      color: '#cfe8ff'
    }).setOrigin(0.5, 0.5);

    const lines = board.length === 0
      ? ['No runs yet.']
      : board.slice(0, 5).map((entry, index) => `${index + 1}. ${entry.name} - ${entry.coins} coins`);

    this.ui.boardLines = this.add.text(0, 0, lines.join('\\n'), {
      fontFamily: 'Trebuchet MS',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5, 0);
  }

  loadLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  attemptExit() {
    const closed = window.close();
    if (!closed && this.exitNotice) {
      this.exitNotice.setText('Close the tab to exit.');
      this.time.delayedCall(2000, () => {
        if (this.exitNotice) {
          this.exitNotice.setText('Press Esc to exit');
        }
      });
    }
  }

  layoutMenu() {
    const { width, height } = this.scale;
    const safe = this.getSafeRect();
    const sizes = this.getUISizes(safe);
    const isPortrait = safe.height > safe.width;

    this.ui.backdrop.setSize(width, height).setPosition(0, 0);

    const centerX = safe.left + safe.width / 2;
    const top = safe.top;
    const heightSafe = safe.height;

    const y = {
      title: isPortrait ? 0.16 : 0.18,
      name: isPortrait ? 0.25 : 0.27,
      howTitle: isPortrait ? 0.31 : 0.32,
      howBody: isPortrait ? 0.42 : 0.42,
      start: isPortrait ? 0.56 : 0.54,
      rename: isPortrait ? 0.64 : 0.61,
      contact: isPortrait ? 0.71 : 0.68,
      boardTitle: isPortrait ? 0.79 : 0.76,
      boardLines: isPortrait ? 0.83 : 0.80
    };

    this.ui.titleText.setFontSize(`${sizes.title}px`).setPosition(centerX, top + heightSafe * y.title);
    this.nameText.setFontSize(`${sizes.body}px`).setPosition(centerX, top + heightSafe * y.name);
    this.ui.howTitle.setFontSize(`${sizes.subtitle}px`).setPosition(centerX, top + heightSafe * y.howTitle);
    this.ui.howBody.setFontSize(`${sizes.body}px`).setPosition(centerX, top + heightSafe * y.howBody);

    this.ui.startButton.setFontSize(`${sizes.button}px`).setPosition(centerX, top + heightSafe * y.start);
    this.ui.renameButton.setFontSize(`${sizes.small}px`).setPosition(centerX, top + heightSafe * y.rename);
    this.ui.contactButton.setFontSize(`${sizes.small}px`).setPosition(centerX, top + heightSafe * y.contact);

    this.ui.boardTitle.setFontSize(`${sizes.subtitle}px`).setPosition(centerX, top + heightSafe * y.boardTitle);
    this.ui.boardLines.setFontSize(`${sizes.small}px`).setPosition(centerX, top + heightSafe * y.boardLines);

    this.exitNotice.setFontSize(`${sizes.small}px`).setPosition(centerX, safe.bottom - 36);

    this.rotateOverlay.setSize(width, height).setPosition(0, 0);
    this.rotateText.setFontSize(`${Math.round(28 * (sizes.title / 48))}px`)
      .setPosition(centerX, safe.top + safe.height / 2);
    this.rotateHint.setFontSize(`${Math.round(18 * (sizes.title / 48))}px`)
      .setPosition(centerX, safe.top + safe.height / 2 + 70);

    const block = isPortrait && this.sys.game.device.input.touch;
    this.rotateOverlay.setVisible(block);
    this.rotateText.setVisible(block);
    this.rotateHint.setVisible(block);
    this.ui.startButton.setAlpha(block ? 0.4 : 1);
    this.ui.startButton.disableInteractive();
    if (!block) {
      this.ui.startButton.setInteractive({ useHandCursor: true });
    }
    this.registry.set('portraitBlocked', block);
  }

  getUISizes(safe = null) {
    const safeRect = safe || this.getSafeRect();
    const isPortrait = safeRect.height > safeRect.width;
    const base = isPortrait ? safeRect.height : Math.min(safeRect.width, safeRect.height);
    const scale = Phaser.Math.Clamp(base / 720, 0.85, 1.3);
    return {
      title: Math.round(48 * scale),
      subtitle: Math.round(22 * scale),
      body: Math.round(20 * scale),
      button: Math.round(22 * scale),
      small: Math.round(16 * scale)
    };
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

  isPortrait() {
    const display = this.scale.displaySize || { width: this.scale.width, height: this.scale.height };
    return display.height > display.width;
  }

  async tryLockLandscape() {
    try {
      if (screen && screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch (error) {
      // ignore lock errors
    }
  }
}
