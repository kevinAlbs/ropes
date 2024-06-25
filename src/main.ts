import { Game, Types, Scene } from "phaser";


class GameScene extends Scene {
    score: Number;
    scoreText: Phaser.GameObjects.Text;
    platformXOffset: number;
    platformYIncrement: number;
    platforms: Phaser.Physics.Arcade.StaticGroup;
    gameOver: boolean;
    gameOverState: string;

    preload(this: Scene) {
        this.load.image('sky', 'assets/sky.png');
        this.load.image('ground', 'assets/platform.png');
        this.load.spritesheet({ key: 'dude', frameConfig: { frameWidth: 32, frameHeight: 48 }, url: 'assets/dude.png' });
    }

    isShootDown() {
        return this.input.activePointer.isDown /* click or tap */ || space.isDown /* spacebar */;
    }

    create() {
        this.platforms = this.physics.add.staticGroup();

        player = this.physics.add.sprite(0, 200, 'dude');
        player.setBounce(.1);
        player.setCollideWorldBounds(false);
        player.body.setGravityY(300);
        let that = this;
        this.physics.add.collider(player, this.platforms, (_o1: Phaser.Tilemaps.Tile | Types.Physics.Arcade.GameObjectWithBody, _o2: Phaser.Tilemaps.Tile | Types.Physics.Arcade.GameObjectWithBody) => {
            // TODO: require a press then release.
            if (that.isShootDown()) {
                this.gameOverState = "need_release";
            } else {
                this.gameOverState = "need_press";
            }

            that.gameOver = true;
        });

        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 4 }],
            frameRate: 20,
            repeat: -1
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        if (this.input.keyboard) {
            space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        }

        // this.physics.world.setBounds(0, 0, 1600, 600); // 1600x1200 size
        // this.cameras.main.setBounds(0, 0, 1600, 600);
        this.cameras.main.startFollow(player, false, 1 /* follow X */, 0 /* do not follow Y */, 0 /* offset X */, -100 /* offset Y */);

        // Create a sprite for the spike.
        {
            var graphics = this.add.graphics();
            graphics.fillStyle(0);
            graphics.fillCircle(2, 2, 5);
            graphics.generateTexture('spike', 5, 5);
            graphics.destroy();
        }

        // Create a sprite for a square.
        {
            var graphics = this.add.graphics();
            graphics.fillStyle(0);
            graphics.fillRect(0, 0, 10, 10);
            graphics.generateTexture('square', 10, 10);
            graphics.destroy();
        }


        debugText = this.add.text(0, 0, "Debug:");
        gameOverText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, "").setOrigin(.5).setColor("#000000");
        gameOverText.setScrollFactor(0);

        this.scoreText = this.add.text(5, 5, "").setColor("#FF0000");
        this.scoreText.setScrollFactor(0); // Stick to camera view.
        this.scoreText.depth = 1;

        // Reset global state. Needed in case the scene is restarted due to death.
        {
            shootState = "unshot";
            this.gameOver = false;
        }

        // Platforms are every 100 pixels.
        this.platformXOffset = -500;
        this.platformYIncrement = 0;

        lineGraphics = this.add.graphics({ lineStyle: { width: 4, color: 0xaa00aa } });
        line = new Phaser.Geom.Line(100, 300, 400, 300);
    }

    // Returns the new offset.
    maybeGeneratePlatforms() {
        // Clean up off-screen platforms.
        for (let i = 0; i < this.platforms.children.entries.length; i++) {
            let p = this.platforms.children.entries[i];
            if (!p.body) continue;
            if (p.body?.position.x < player.body.x - 1600) {
                console.log("deleting platform " + i);
                this.platforms.children.delete(p);
                p.destroy();
            }
        }

        // Check if close enough to generate next batch of platforms.
        if (player.body.position.x < this.platformXOffset - 1000) {
            return;
        }

        let yOff = 0;
        let yInc = 0;

        if (this.platformXOffset > 0) {
            // Not first batch, apply increment.
            // Choose a random amount [2,10]
            yInc = (Math.floor(Math.random() * 10) + 2);
            if (Math.random() > .5) {
                // Flip sign.
                yInc *= -1;
            }
        }

        let yExtra = 0;
        if (this.platformXOffset > 2000) {
            // Make harder.
            yExtra = 10;
        }
        if (this.platformXOffset > 4000) {
            // Make harder.
            yExtra = 20;
        }
        if (this.platformXOffset > 6000) {
            // Make harder.
            yExtra = 30;
        }

        let xOff = this.platformXOffset;
        const count = 40;

        for (let i = 0; i < count; i++) {
            yOff += yInc;
            if (Math.abs(yOff) > 50) {
                let multiplier = 1;
                if (yInc > 0) {
                    // Flip the sign.
                    multiplier = -1;
                }
                // Choose a random amount [2,10]
                yInc = (Math.floor(Math.random() * 10) + 2) * multiplier;
                this.platformYIncrement = yInc;
            }

            if (i == 20 || i == 39) {
                console.log("creating at xOff", xOff);
                // Create a platform in the middle.
                let yMin = yOff + 50 + yExtra + 200;
                let yMax = yOff + 550 - yExtra;
                let p: Phaser.Types.Physics.Arcade.SpriteWithStaticBody = this.platforms.create(xOff + (i * 50), yMin + (yMax - yMin) * Math.random(), 'square');
                p.setOrigin(0, 1);
                p.scaleX *= 5;
                p.scaleY *= 10;
                p.setDebugBodyColor(0xFF0000)
                p.refreshBody();
            }

            // Ceiling.
            {
                let p: Phaser.Types.Physics.Arcade.SpriteWithStaticBody = this.platforms.create(xOff + (i * 50), yOff + 50 + yExtra, 'square');
                p.setOrigin(0, 1);
                p.scaleX *= 5;
                p.scaleY *= 20;
                p.setDebugBodyColor(0xFF0000)
                p.refreshBody();
            }

            // Floor.
            {
                let p: Phaser.Types.Physics.Arcade.SpriteWithStaticBody = this.platforms.create(xOff + (i * 50), yOff + 550 - yExtra, 'square');
                p.setOrigin(0, 0);
                p.scaleX *= 5;
                p.scaleY *= 20;
                p.setDebugBodyColor(0xFF0000)
                p.refreshBody();
            }
        }
        this.platformXOffset += count * 50;
    }

    update(_time: number, _delta: number) {
        this.scoreText.setText("Score: " + this.score);
        this.score = Math.max(0, Math.floor(player.body.x / 300));
        this.maybeGeneratePlatforms();

        if (this.gameOver) {
            gameOverText.setText("Shoot to restart");
            if (this.isShootDown()) {
                if (this.gameOverState == "need_press") {
                    this.scene.restart();
                }
            } else {
                if (this.gameOverState == "need_release") {
                    this.gameOverState = "need_press";
                }
            }
            this.physics.pause();
            return;
        }

        if (player.body.y > 1600) {
            this.cameras.main.stopFollow();
        }

        debugText.setX(this.cameras.main.worldView.x).setColor("#000000");
        debugText.setText("");
        player.body.setFrictionX(.01);


        player.anims.play('right', true);
        if (player.body.velocity.x > 200) {

            player.body.setVelocityX(player.body.velocity.x * .99);
        }



        lineGraphics.clear();

        if (!this.isShootDown()) {
            // Detach if shot or reeling.
            if (shootState == "reeling" || shootState == "shot") {
                // Detach.
                console.log("detaching");
                spike.destroy();
                shootState = "unshot";
            }
            if (shootState == "ready") {
                shootState = "unshot";
            }
        }

        if (shootState == "reeling") {
            line.x1 = player.body.x + player.body.width / 2;
            line.y1 = player.body.y + player.body.height / 2;
            line.x2 = spike.body.x;
            line.y2 = spike.body.y;

            lineGraphics.strokeLineShape(line);
            // Move player towards spike.
            var xdiff = spike.body.position.x - player.body.x;
            if (xdiff < -50) {
                shootState = "ready";
            } else {

                // Move towards target velocity.
                const kTargetVelocity = 300;
                const kVelStep = 5 * game.loop.delta;
                // Inch towards target velocity.
                {
                    var xVelCurr = player.body.velocity.x;
                    var xVelDiff = kTargetVelocity - xVelCurr;
                    var newXVel = xVelCurr + kVelStep * Math.sign(xVelDiff);
                    if (Math.abs(xVelDiff) < kVelStep) {
                        newXVel = kTargetVelocity;
                    }
                    player.body.setVelocityX(newXVel);
                }
                {
                    var yVelCurr = player.body.velocity.y;
                    var yVelDiff = -1 * kTargetVelocity - yVelCurr;
                    var newYVel = yVelCurr + kVelStep * Math.sign(yVelDiff);
                    if (Math.abs(yVelDiff) < kVelStep) {
                        newXVel = kTargetVelocity;
                    }
                    player.body.setVelocityY(newYVel);
                }
            }
        }

        if (shootState == "shot") {
            // Check for collision.
            console.assert(spike);
            if (this.physics.collide(spike, this.platforms)) {
                spike.setVelocity(0, 0);
                spike.body.allowGravity = false;
                shootState = "reeling";
            }

            else if (spike.y < this.cameras.main.worldView.top - 300 || spike.y > 3200) {
                console.log("off camera");
                spike.destroy();
                shootState = "ready";
            }
        }

        if (this.isShootDown()) {
            if (shootState == "unshot") {
                shootState = "shot";
                spike = this.physics.add.sprite(player.body.center.x, player.body.center.y, 'spike')
                spike.setVelocityX(1000);
                spike.setVelocityY(-1000);
            }
        }
    }
}

const config: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 904,
    height: 675,
    parent: 'game-container',
    backgroundColor: '#EEEEEE',
    scale: {
        mode: Phaser.Scale.ScaleModes.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 400 },
            debug: true
        }
    },
    scene: [GameScene]

};



var player: Types.Physics.Arcade.SpriteWithDynamicBody;
var debugText: Phaser.GameObjects.Text;
var gameOverText: Phaser.GameObjects.Text;
var lineGraphics: Phaser.GameObjects.Graphics;
var line: Phaser.Geom.Line;
var space: Phaser.Input.Keyboard.Key;
var shootState = "unshot";
var spike: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;



let game = new Game(config);

export default game;

declare global {
    interface Window { game: any; recording: any; }
}

window.game = game;
