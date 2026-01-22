import Phaser from 'phaser';
import generateLevel from '../levels/level1.js';
import Player from '../objects/Player.js';
import { getSafeInsets } from '../utils/safeArea.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.level = null;
  }

  create() {
    this.isWin = false;
    this.isRespawning = false;
    this.collected = 0;
    this.controlsLocked = true;
    this.designSize = { width: 1280, height: 720 };
    const storedLives = this.registry.get('lives');
    this.lives = typeof storedLives === 'number' ? storedLives : 3;
    this.level = generateLevel();

    const { width, height } = this.level;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);

    this.platforms = this.physics.add.staticGroup();

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    } else if (this.scene.isSleeping('UIScene')) {
      this.scene.wake('UIScene');
    }
    this.scene.bringToTop('UIScene');

    this.level.ground.forEach((segment) => {
      this.placeTiles(this.platforms, segment.x, segment.y, segment.tiles, 'tile', 64, 64);
    });

    this.level.platforms.forEach((segment) => {
      this.placeTiles(this.platforms, segment.x, segment.y, segment.tiles, 'platform', 64, 32);
    });

    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    this.level.coins.forEach((coin, index) => {
      const sprite = this.coins.create(coin.x, coin.y, 'coin');
      sprite.setOrigin(0.5, 0.5);
      this.tweens.add({
        targets: sprite,
        y: coin.y - 8,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: index * 60
      });
    });

    this.spikes = this.physics.add.staticGroup();
    this.level.spikes.forEach((spike) => {
      this.spikes.create(spike.x, spike.y, 'spike').setOrigin(0.5, 1);
    });

    this.checkpointSprite = this.physics.add.staticImage(
      this.level.checkpoint.x,
      this.level.checkpoint.y,
      'checkpoint'
    );
    this.checkpointSprite.setOrigin(0.5, 1);
    this.snapCheckpointToGround();

    this.finishSprite = this.physics.add.staticImage(
      this.level.finish.x,
      this.level.finish.y,
      'flag'
    );
    this.finishSprite.setOrigin(0.5, 1);
    this.snapFinishToGround();

    this.player = new Player(this, this.level.start.x, this.level.start.y);
    this.gapZones = [];
    this.createGapZones();

    this.currentCheckpoint = { x: this.level.start.x, y: this.level.start.y };

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.scale.on('resize', this.handleResize, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,SPACE');
    this.setupTouchControls();

    this.createAnimations();

    this.physics.add.collider(this.player, this.platforms);
    this.gapZones.forEach((zone) => {
      this.physics.add.overlap(this.player, zone, () => {
        if (this.player.y > this.level.ground[0].y + 10) {
          this.triggerFallDeath();
        }
      }, null, this);
    });
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.spikes, this.hitSpike, null, this);
    this.physics.add.overlap(this.player, this.checkpointSprite, this.setCheckpoint, null, this);
    this.physics.add.overlap(this.player, this.finishSprite, this.tryFinish, null, this);
    this.isFallingOut = false;

    this.totalCoins = this.level.coins.length;
    this.registry.set('totalCoins', this.totalCoins);
    if (typeof this.registry.get('runCoins') !== 'number') {
      this.registry.set('runCoins', 0);
    }
    this.game.events.emit('lives-changed', this.lives);
    if (this.registry.get('startRequested')) {
      this.controlsLocked = false;
      this.registry.set('startRequested', false);
    }
    this.time.delayedCall(0, () => {
      this.game.events.emit('score-changed', this.collected, this.totalCoins);
      this.game.events.emit('game-ready', {
        totalCoins: this.totalCoins,
        requiredCoins: this.level.requiredCoins,
        lives: this.lives
      });
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  update() {
    if (this.isWin) {
      return;
    }
    if (this.isFallingOut) {
      return;
    }
    if (this.registry.get('portraitBlocked')) {
      this.player.setVelocity(0, 0);
      return;
    }
    if (this.controlsLocked) {
      return;
    }
    const touchState = this.consumeTouchState();
    this.player.update(this.cursors, this.keys, touchState);

    if (this.player.y >= this.level.height) {
      this.triggerFallDeath();
    }
  }

  placeTiles(group, x, y, tiles, key, tileW, tileH) {
    for (let i = 0; i < tiles; i += 1) {
      group.create(x + i * tileW, y, key).setOrigin(0, 0);
    }
    group.refresh();
  }

  createAnimations() {
    if (this.anims.exists('player-run')) {
      return;
    }

    this.anims.create({
      key: 'player-idle',
      frames: [{ key: 'player-idle' }],
      frameRate: 1
    });

    this.anims.create({
      key: 'player-run',
      frames: [{ key: 'player-run1' }, { key: 'player-run2' }],
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'player-jump',
      frames: [{ key: 'player-jump' }],
      frameRate: 1
    });
  }

  collectCoin(player, coin) {
    if (!coin.active || this.isWin) {
      return;
    }
    coin.disableBody(true, true);
    this.collected += 1;
    const runCoins = this.registry.get('runCoins') + 1;
    this.registry.set('runCoins', runCoins);
    if (runCoins % 100 === 0) {
      this.lives += 1;
      this.registry.set('lives', this.lives);
      this.game.events.emit('lives-changed', this.lives);
    }
    this.sound.play('pickup', { volume: 0.4 });
    this.game.events.emit('score-changed', this.collected, this.totalCoins);

    if (this.collected >= this.totalCoins) {
      this.winGame();
    }
  }

  hitSpike() {
    if (this.isWin || this.isRespawning) {
      return;
    }
    this.isRespawning = true;
    this.loseLife();
  }

  setCheckpoint(player, checkpoint) {
    if (checkpoint.getData('active')) {
      return;
    }
    checkpoint.setData('active', true);
    checkpoint.setTint(0x88ff88);
    this.currentCheckpoint = { x: checkpoint.x, y: checkpoint.y - 16 };
    this.game.events.emit('checkpoint', this.currentCheckpoint);
  }

  respawnPlayer() {
    this.player.setVelocity(0, 0);
    this.player.setPosition(this.currentCheckpoint.x, this.currentCheckpoint.y);
  }

  triggerFallDeath() {
    if (this.isFallingOut) {
      return;
    }
    this.isFallingOut = true;
    this.player.body.checkCollision.none = true;
    this.player.setVelocity(0, 900);
    this.player.body.setAllowGravity(true);
    this.time.delayedCall(500, () => {
      this.player.body.checkCollision.none = false;
      this.isFallingOut = false;
      this.loseLife();
    });
  }

  loseLife() {
    this.lives -= 1;
    this.registry.set('lives', this.lives);
    this.game.events.emit('lives-changed', this.lives);
    if (this.lives <= 0) {
      this.game.events.emit('game-over', {
        collected: this.collected,
        total: this.totalCoins
      });
      this.scene.pause();
      return;
    }
    this.player.setTint(0xff4444);
    this.time.delayedCall(200, () => {
      this.respawnPlayer();
      this.player.clearTint();
      this.isRespawning = false;
    });
  }

  createGapZones() {
    const groundY = this.level.ground[0].y;
    const sorted = [...this.level.ground].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const currentEnd = current.x + current.tiles * 64;
      const gapWidth = next.x - currentEnd;
      if (gapWidth <= 0) {
        continue;
      }
      const zone = this.add.zone(currentEnd + gapWidth / 2, groundY + 80, gapWidth, 180);
      zone.setOrigin(0.5, 0.5);
      this.physics.add.existing(zone, true);
      zone.body.setSize(gapWidth, 180);
      zone.body.updateFromGameObject();
      this.gapZones.push(zone);
    }
  }

  handleResize() {
    this.updateTouchControlsLayout();
  }

  snapFinishToGround() {
    const groundY = this.level.ground[0].y;
    const onGround = this.level.ground.some((segment) => {
      const start = segment.x;
      const end = segment.x + segment.tiles * 64;
      return this.finishSprite.x >= start && this.finishSprite.x <= end;
    });
    if (onGround && !this.isSpikeNear(this.finishSprite.x)) {
      this.finishSprite.y = groundY;
      this.finishSprite.refreshBody();
      return;
    }
    const closest = [...this.level.ground]
      .map((segment) => segment.x + segment.tiles * 64 / 2)
      .reduce((best, x) => {
        const dist = Math.abs(this.finishSprite.x - x);
        if (!best || dist < best.dist) {
          return { x, dist };
        }
        return best;
      }, null);
    if (closest) {
      this.finishSprite.x = closest.x;
      this.finishSprite.y = groundY;
      this.finishSprite.refreshBody();
    }
  }

  isSpikeNear(x) {
    return this.level.spikes.some((spike) => Math.abs(spike.x - x) <= 48);
  }

  snapCheckpointToGround() {
    const groundY = this.level.ground[0].y;
    const onGround = this.level.ground.some((segment) => {
      const start = segment.x;
      const end = segment.x + segment.tiles * 64;
      return this.checkpointSprite.x >= start && this.checkpointSprite.x <= end;
    });
    if (onGround) {
      this.checkpointSprite.y = groundY;
      this.checkpointSprite.refreshBody();
      return;
    }
    const closest = [...this.level.ground]
      .map((segment) => segment.x + segment.tiles * 64 / 2)
      .reduce((best, x) => {
        const dist = Math.abs(this.checkpointSprite.x - x);
        if (!best || dist < best.dist) {
          return { x, dist };
        }
        return best;
      }, null);
    if (closest) {
      this.checkpointSprite.x = closest.x;
      this.checkpointSprite.y = groundY;
      this.checkpointSprite.refreshBody();
    }
  }

  tryFinish() {
    if (this.isWin) {
      return;
    }
    if (this.collected >= this.level.requiredCoins) {
      this.winGame();
    } else {
      this.game.events.emit('need-coins', this.level.requiredCoins);
    }
  }

  winGame() {
    this.isWin = true;
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    this.game.events.emit('win', {
      collected: this.registry.get('runCoins'),
      total: this.totalCoins
    });
    this.scene.pause();
  }

  setupTouchControls() {
    const shouldShow = this.shouldShowTouchControls();
    this.touchState = {
      left: false,
      right: false,
      jumpQueued: false,
      leftPointerId: null,
      rightPointerId: null,
      enabled: shouldShow
    };
    if (!shouldShow) {
      return;
    }

    this.input.addPointer(2);

    this.touchButtons = {
      left: this.createTouchButton('◀', () => {
        this.touchState.left = true;
      }, () => {
        this.touchState.left = false;
      }),
      right: this.createTouchButton('▶', () => {
        this.touchState.right = true;
      }, () => {
        this.touchState.right = false;
      }),
      jump: this.createTouchButton('JUMP', () => {
        this.touchState.jumpQueued = true;
      })
    };

    this.setupTouchZones();
    this.updateTouchControlsLayout();
    this.scale.on('resize', this.updateTouchControlsLayout, this);
  }

  shouldShowTouchControls() {
    const device = this.sys.game.device;
    return device.input.touch || device.os.android || device.os.iOS;
  }

  updateTouchControlsLayout() {
    if (!this.touchState || !this.touchState.enabled || !this.touchButtons) {
      return;
    }
    const safe = this.getSafeRect();
    const base = Math.min(safe.width, safe.height);
    const isPortrait = safe.height > safe.width;
    const scale = isPortrait ? 0.85 : 1;
    const buttonSize = Phaser.Math.Clamp(Math.round(base * 0.16 * scale), 56, 120);
    const jumpSize = Phaser.Math.Clamp(Math.round(base * 0.22 * scale), 72, 160);
    const margin = Phaser.Math.Clamp(Math.round(base * 0.05), 16, 48);

    const leftX = safe.left + margin + buttonSize / 2;
    const leftY = safe.bottom - margin - buttonSize / 2;
    const rightX = leftX + buttonSize + margin;
    const rightY = leftY;
    const jumpX = safe.right - margin - jumpSize / 2;
    const jumpY = safe.bottom - margin - jumpSize / 2;

    this.touchButtons.left.setLayout(leftX, leftY, buttonSize, buttonSize);
    this.touchButtons.right.setLayout(rightX, rightY, buttonSize, buttonSize);
    this.touchButtons.jump.setLayout(jumpX, jumpY, jumpSize, jumpSize);

    if (this.touchZones) {
      const zoneHeight = Phaser.Math.Clamp(Math.round(safe.height * 0.35), 120, 260);
      const zoneY = safe.bottom - zoneHeight / 2;
      this.touchZones.left.setPosition(safe.left + safe.width * 0.25, zoneY);
      this.touchZones.left.setSize(safe.width * 0.5, zoneHeight);
      this.touchZones.right.setPosition(safe.left + safe.width * 0.75, zoneY);
      this.touchZones.right.setSize(safe.width * 0.5, zoneHeight);
    }
  }

  createTouchButton(label, onDown, onUp) {
    const bg = this.add.rectangle(0, 0, 100, 100, 0x0b1220, 0.4)
      .setScrollFactor(0)
      .setDepth(2000);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(2001);

    const hitArea = new Phaser.Geom.Rectangle(0, 0, 1, 1);
    bg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    bg.on('pointerdown', (pointer) => {
      if (pointer && pointer.event && pointer.event.preventDefault) {
        pointer.event.preventDefault();
      }
      if (onDown) {
        onDown();
      }
    });
    const handleUp = () => {
      if (onUp) {
        onUp();
      }
    };
    bg.on('pointerup', handleUp);
    bg.on('pointerout', handleUp);

    return {
      setLayout: (x, y, width, height) => {
        bg.setPosition(x, y);
        bg.setSize(width, height);
        text.setPosition(x, y);
        const fontSize = Math.round(Math.min(width, height) * 0.35);
        text.setFontSize(`${fontSize}px`);
        if (bg.input && bg.input.hitArea) {
          const pad = Math.round(Math.min(width, height) * 0.35);
          bg.input.hitArea.setTo(-pad, -pad, width + pad * 2, height + pad * 2);
        }
      }
    };
  }

  consumeTouchState() {
    if (!this.touchState || !this.touchState.enabled) {
      return { left: false, right: false, jump: false };
    }
    const jump = this.touchState.jumpQueued;
    this.touchState.jumpQueued = false;
    return {
      left: this.touchState.left,
      right: this.touchState.right,
      jump
    };
  }

  setupTouchZones() {
    const leftZone = this.add.rectangle(0, 0, 100, 100, 0x000000, 0.001)
      .setScrollFactor(0)
      .setDepth(1990);
    const rightZone = this.add.rectangle(0, 0, 100, 100, 0x000000, 0.001)
      .setScrollFactor(0)
      .setDepth(1990);

    leftZone.setInteractive();
    rightZone.setInteractive();

    leftZone.on('pointerdown', (pointer) => {
      if (this.touchState.leftPointerId === null) {
        this.touchState.leftPointerId = pointer.id;
        this.touchState.left = true;
      }
    });
    leftZone.on('pointerup', (pointer) => {
      if (pointer.id === this.touchState.leftPointerId) {
        this.touchState.leftPointerId = null;
        this.touchState.left = false;
      }
    });
    leftZone.on('pointerout', (pointer) => {
      if (pointer.id === this.touchState.leftPointerId) {
        this.touchState.leftPointerId = null;
        this.touchState.left = false;
      }
    });

    rightZone.on('pointerdown', (pointer) => {
      if (this.touchState.rightPointerId === null) {
        this.touchState.rightPointerId = pointer.id;
        this.touchState.right = true;
      }
    });
    rightZone.on('pointerup', (pointer) => {
      if (pointer.id === this.touchState.rightPointerId) {
        this.touchState.rightPointerId = null;
        this.touchState.right = false;
      }
    });
    rightZone.on('pointerout', (pointer) => {
      if (pointer.id === this.touchState.rightPointerId) {
        this.touchState.rightPointerId = null;
        this.touchState.right = false;
      }
    });

    this.touchZones = { left: leftZone, right: rightZone };
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
