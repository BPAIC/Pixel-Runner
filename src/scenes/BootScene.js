import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.setBaseURL('/');
    this.load.setPath('assets/');

    this.load.image('tile', 'tile.png');
    this.load.image('platform', 'platform.png');
    this.load.image('coin', 'coin.png');
    this.load.image('spike', 'spike.png');
    this.load.image('flag', 'flag.png');
    this.load.image('checkpoint', 'checkpoint.png');

    this.load.image('player-idle', 'player_idle.png');
    this.load.image('player-run1', 'player_run1.png');
    this.load.image('player-run2', 'player_run2.png');
    this.load.image('player-jump', 'player_jump.png');

    this.load.audio('pickup', 'pickup.wav');
  }

  create() {
    this.scene.start('MenuScene');
  }
}
