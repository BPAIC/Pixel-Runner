import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true, true, true, false);
    this.setSize(20, 28);
    this.setOffset(6, 4);

    this.moveSpeed = 300;
    this.jumpSpeed = 760;
    this.lastDirection = 1;
  }

  update(cursors, keys) {
    const left = cursors.left.isDown || keys.A.isDown;
    const right = cursors.right.isDown || keys.D.isDown;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(cursors.up) ||
      Phaser.Input.Keyboard.JustDown(keys.W) ||
      Phaser.Input.Keyboard.JustDown(keys.SPACE);

    if (left) {
      this.setVelocityX(-this.moveSpeed);
      this.setFlipX(true);
      this.lastDirection = -1;
    } else if (right) {
      this.setVelocityX(this.moveSpeed);
      this.setFlipX(false);
      this.lastDirection = 1;
    } else {
      this.setVelocityX(0);
    }

    if (jumpPressed && this.body.blocked.down) {
      this.setVelocityY(-this.jumpSpeed);
    }

    if (!this.body.blocked.down) {
      this.anims.play('player-jump', true);
    } else if (this.body.velocity.x !== 0) {
      this.anims.play('player-run', true);
    } else {
      this.anims.play('player-idle', true);
    }
  }
}
