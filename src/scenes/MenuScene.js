import Phaser from 'phaser';

const CONTACT_LINK = 'https://t.me/bpaic';
const CONTACT_LABEL = 'Contact: t.me/bpaic';
const LEADERBOARD_KEY = 'pixel_runner_leaderboard';
const NAME_KEY = 'pixel_runner_name';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
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

    this.add.rectangle(0, 0, width, height, 0x0b1220, 0.9).setOrigin(0, 0);

    this.add.text(width / 2, 140, 'Pixel Runner', {
      fontFamily: 'Trebuchet MS',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    this.nameText = this.add.text(width / 2, 200, `Player: ${playerName}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#ffe38a'
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2, 230, 'How to play', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#cfe8ff'
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2, 290, 'Move: A/D or Arrow Keys\nJump: W, Space, or Up Arrow\nR: Restart level, Esc: Menu\nCollect coins and reach the flag.\nNeed at least 8 coins to finish.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5, 0.5);

    const startButton = this.add.text(width / 2, 380, 'Start Game (Enter)', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#1d3c6a',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    const renameButton = this.add.text(width / 2, 430, 'Change Name', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#2a2f3a',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    const contactButton = this.add.text(width / 2, 480, CONTACT_LABEL, {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#ffe38a',
      backgroundColor: '#2a2f3a',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    startButton.on('pointerdown', () => this.startGame());
    renameButton.on('pointerdown', () => this.promptName());
    contactButton.on('pointerdown', () => {
      window.open(CONTACT_LINK, '_blank');
    });

    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-ESC', () => this.attemptExit());

    this.exitNotice = this.add.text(width / 2, height - 40, 'Press Esc to exit', {
      fontFamily: 'Trebuchet MS',
      fontSize: '16px',
      color: '#8aa3c7'
    }).setOrigin(0.5, 0.5);

    this.renderLeaderboard(width, height);
  }

  startGame() {
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
    const title = this.add.text(width / 2, 540, 'Leaderboard', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#cfe8ff'
    }).setOrigin(0.5, 0.5);

    const lines = board.length === 0
      ? ['No runs yet.']
      : board.slice(0, 5).map((entry, index) => `${index + 1}. ${entry.name} - ${entry.coins} coins`);

    this.add.text(width / 2, 590, lines.join('\\n'), {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
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
}
