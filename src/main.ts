import { Game, Types, Scene } from "phaser";

let startState: string = "unstarted";

class GameScene extends Scene {
    score: Number;
    scoreText: Phaser.GameObjects.Text;
    platformXOffset: number;
    platformYIncrement: number;
    platforms: Phaser.Physics.Arcade.StaticGroup;
    gameOver: boolean;
    gameOverState: string;
    centerText: Phaser.GameObjects.Text;
    lineGraphics: Phaser.GameObjects.Graphics;
    line: Phaser.Geom.Line;
    player: Types.Physics.Arcade.SpriteWithDynamicBody;
    space: Phaser.Input.Keyboard.Key;
    shootState = "unshot";
    spike: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    isShootDown() {
        return this.input.activePointer.isDown /* click or tap */ || this.space.isDown /* spacebar */;
    }

    create() {
        // Create a sprite for a square.
        {
            var graphics = this.add.graphics();
            graphics.fillStyle(0);
            graphics.fillRect(0, 0, 10, 10);
            graphics.generateTexture('square', 10, 10);
            graphics.destroy();
        }

        // Create a sprite for the spike.
        {
            var graphics = this.add.graphics();
            graphics.fillStyle(0);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('circle', 8, 8);
            graphics.destroy();
        }

        // Create a sprite for the spike.
        {
            var graphics = this.add.graphics();
            graphics.fillStyle(0);
            graphics.fillCircle(20, 20, 20);
            graphics.generateTexture('circle_large', 40, 40);
            graphics.destroy();
        }

        this.platforms = this.physics.add.staticGroup();
        this.player = this.physics.add.sprite(0, 200, 'circle_large');
        this.player.setOrigin(.5, .5);
        this.player.setCircle(20);
        this.player.refreshBody();
        this.player.setBounce(.1);
        this.player.setCollideWorldBounds(false);
        this.player.body.setGravityY(300); // Q: why does this appear to be more than the gravity applied in the config? A:
        // let that = this;
        this.physics.add.collider(this.player, this.platforms, (_o1: Phaser.Tilemaps.Tile | Types.Physics.Arcade.GameObjectWithBody, _o2: Phaser.Tilemaps.Tile | Types.Physics.Arcade.GameObjectWithBody) => {
            // if (that.isShootDown()) {
            //     this.gameOverState = "need_release";
            // } else {
            //     this.gameOverState = "need_press";
            // }

            // that.gameOver = true;
        });

        if (this.input.keyboard) {
            this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        }

        // this.physics.world.setBounds(0, 0, 1600, 600); // 1600x1200 size
        // this.cameras.main.setBounds(0, 0, 1600, 600);
        this.cameras.main.startFollow(this.player, false, 1 /* follow X */, 0 /* do not follow Y */, 0 /* offset X */, -100 /* offset Y */);

        this.centerText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, "").setOrigin(.5).setColor("#FF0000").setFont("Monospace").setFontSize("20px");
        this.centerText.setScrollFactor(0);
        this.centerText.depth = 1;

        if (startState == "unstarted") {
            this.physics.pause();
        }

        this.scoreText = this.add.text(5, 5, "").setColor("#FF0000").setFont("Monospace").setFontSize("20px");
        this.scoreText.setScrollFactor(0); // Stick to camera view.
        this.scoreText.depth = 1;

        this.shootState = "unshot";
        this.gameOver = false;

        // Platforms are every 100 pixels.
        this.platformXOffset = -500;
        this.platformYIncrement = 0;

        this.lineGraphics = this.add.graphics({ lineStyle: { width: 4, color: 0x000000 } });
        this.line = new Phaser.Geom.Line(100, 300, 400, 300);
    }

    // Returns the new offset.
    maybeGeneratePlatforms() {
        // Clean up off-screen platforms.
        for (let i = 0; i < this.platforms.children.entries.length; i++) {
            let p = this.platforms.children.entries[i];
            if (!p.body) continue;
            if (p.body?.position.x < this.player.body.x - 1600) {
                this.platforms.children.delete(p);
                p.destroy();
            }
        }

        // Check if close enough to generate next batch of platforms.
        if (this.player.body.position.x < this.platformXOffset - 1000) {
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
        let hasExtraPlatform = false, hasAnotherExtraPlatform = false;
        if (this.platformXOffset > 2000) {
            yExtra = 10;
        }
        if (this.platformXOffset > 4000) {
            yExtra = 20;
        }
        if (this.platformXOffset > 6000) {
            yExtra = 30;
        }
        if (this.platformXOffset > 10000) {
            hasExtraPlatform = true;
        }
        if (this.platformXOffset > 14000) {
            yExtra = 40;
        }
        if (this.platformXOffset > 20000) {
            yExtra = 50;
        }
        if (this.platformXOffset > 24000) {
            hasAnotherExtraPlatform = true;
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

            if (i == 20 || i == 39 || (i == 29 && hasExtraPlatform) || (i == 9 && hasAnotherExtraPlatform)) {
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
        this.scoreText.setText("SCORE: " + this.score);
        this.score = Math.max(0, Math.floor(this.player.body.x / 300));
        this.maybeGeneratePlatforms();

        if (startState == "unstarted") {
            this.centerText.setText("PRESS SPACE OR CLICK TO START");
            if (this.isShootDown()) {
                startState = "unstarted_need_release";
            }
            return;
        } else if (startState == "unstarted_need_release") {
            if (!this.isShootDown()) {
                startState = "started";
                this.centerText.setText("");
                this.physics.resume();
            }
            return;
        }

        if (this.gameOver) {
            this.centerText.setText("PRESS SPACE OR CLICK TO RESTART");
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

        if (this.player.body.y > 1600) {
            this.cameras.main.stopFollow();
        }

        this.player.body.setFrictionX(.01);

        if (this.player.body.velocity.x > 200) {

            this.player.body.setVelocityX(this.player.body.velocity.x * .99);
        }



        this.lineGraphics.clear();

        if (!this.isShootDown()) {
            // Detach if shot or reeling.
            if (this.shootState == "reeling" || this.shootState == "shot") {
                // Detach.
                this.spike.destroy();
                this.shootState = "unshot";
            }
            if (this.shootState == "ready") {
                this.shootState = "unshot";
            }
        }


        if (this.shootState == "reeling") {
            this.line.x1 = this.player.body.center.x;
            this.line.y1 = this.player.body.center.y;
            this.line.x2 = this.spike.body.center.x;
            this.line.y2 = this.spike.body.center.y - this.spike.body.halfHeight;
            this.lineGraphics.lineStyle(4, 0x000000, 1);
            this.lineGraphics.strokeLineShape(this.line);
            // Move player towards spike.
            var xdiff = this.spike.body.position.x - this.player.body.x;
            if (xdiff < -50) {
                this.shootState = "ready";
                this.spike.destroy();
            } else {

                // Move towards target velocity.
                const kTargetVelocity = 300;
                const kVelStep = 5 * game.loop.delta;
                // Inch towards target velocity.
                {
                    var xVelCurr = this.player.body.velocity.x;
                    var xVelDiff = kTargetVelocity - xVelCurr;
                    var newXVel = xVelCurr + kVelStep * Math.sign(xVelDiff);
                    if (Math.abs(xVelDiff) < kVelStep) {
                        newXVel = kTargetVelocity;
                    }
                    this.player.body.setVelocityX(newXVel);
                }
                {
                    var yVelCurr = this.player.body.velocity.y;
                    var yVelDiff = -1 * kTargetVelocity - yVelCurr;
                    var newYVel = yVelCurr + kVelStep * Math.sign(yVelDiff);
                    if (Math.abs(yVelDiff) < kVelStep) {
                        newXVel = kTargetVelocity;
                    }
                    this.player.body.setVelocityY(newYVel);
                }
            }
        }

        if (this.shootState == "shot") {
            this.line.x1 = this.player.body.center.x;
            this.line.y1 = this.player.body.center.y;
            this.line.x2 = this.spike.body.center.x;
            this.line.y2 = this.spike.body.center.y - this.spike.body.halfHeight;
            this.lineGraphics.lineStyle(4, 0x000000, 1);
            this.lineGraphics.strokeLineShape(this.line);
            // Check for collision.
            if (this.physics.collide(this.spike, this.platforms)) {
                this.spike.setVelocity(0, 0);
                this.spike.body.allowGravity = false;
                this.shootState = "reeling";
            }

            else if (this.spike.y < this.cameras.main.worldView.top - 300 || this.spike.y > 3200) {
                console.log("off camera");
                this.spike.destroy();
                this.shootState = "ready";
            }
        }

        if (this.isShootDown()) {
            if (this.shootState == "unshot") {
                this.shootState = "shot";
                this.spike = this.physics.add.sprite(this.player.body.center.x, this.player.body.center.y, 'circle')
                this.spike.visible = false;
                this.spike.body.setCircle(4);
                this.spike.setVelocityX(1000);
                this.spike.setVelocityY(-1000);
            }
        }
    }
}

const config: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 904,
    height: 675,
    parent: 'game-container',
    backgroundColor: '#CCCCCC',
    scale: {
        mode: Phaser.Scale.ScaleModes.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 400 },
            // debug: true
        }
    },
    scene: [GameScene]

};




let game = new Game(config);

export default game;

declare global {
    interface Window { game: any; recording: any; }
}

window.game = game;
