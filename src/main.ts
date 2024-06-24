import { Game, Types, Scene } from "phaser";


class GameScene extends Scene {
    score: Number = 0;
    scoreText: Phaser.GameObjects.Text;

    preload(this: Scene) {
        this.load.image('sky', 'assets/sky.png');
        this.load.image('ground', 'assets/platform.png');
        this.load.spritesheet({ key: 'dude', frameConfig: { frameWidth: 32, frameHeight: 48 }, url: 'assets/dude.png' });
    }

    create() {
        // this.add.image(0,0, 'sky').setOrigin(0,0).setScale(2, 1);

        platforms = this.physics.add.staticGroup();

        let p = platforms.create(0, 568, 'ground');
        p.setInteractive({ draggable: true });
        p.scaleX *= 10;
        p.refreshBody();
        player = this.physics.add.sprite(50, 450, 'dude');
        player.setBounce(.1);
        player.setCollideWorldBounds(false);
        player.body.checkCollision.up = false;
        player.body.checkCollision.right = false;
        player.body.checkCollision.left = false;
        player.body.checkCollision.down = false;
        player.body.setGravityY(300);
        this.physics.add.collider(player, platforms);

        this.input.on(Phaser.Input.Events.POINTER_UP, function (_pointer: Phaser.Input.Pointer, _currentlyOver: [Phaser.GameObjects.GameObject]) {
            console.log("pointer up");
            console.log(_currentlyOver);
            for (let i = 0; i < _currentlyOver.length; i++) {
                if (platforms.contains(_currentlyOver[i])) {
                    enableEditing(_currentlyOver[i] as Phaser.Physics.Arcade.Sprite);
                }
                // if (_currentlyOver[i])
            }
        });

        let that = this;
        document.addEventListener("keyup", function (evt: any) {
            // Add a draggable platform.
            if (evt.key == 'p') {
                let platform: Phaser.Physics.Arcade.Sprite = platforms.create(that.input.activePointer.worldX, that.input.activePointer.worldY, 'ground');
                platform.setInteractive({ draggable: true });
                enableEditing(platform);
                return;
            }

            if (evt.key == 'Escape') {
                disableEditing();
                return;
            }

            if (evt.key == '1') {
                if (editingPlatform != null) {
                    editingPlatform.scaleX += .05;
                    editingPlatform.refreshBody();
                }
                return;
            }

            if (evt.key == '2') {
                if (editingPlatform != null) {
                    editingPlatform.scaleX -= .05;
                    editingPlatform.refreshBody();
                }
                return;
            }

        })


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
            cursors = this.input.keyboard.createCursorKeys();
            shoot = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        }

        // this.physics.world.setBounds(0, 0, 1600, 600); // 1600x1200 size
        // this.cameras.main.setBounds(0, 0, 1600, 600);
        this.cameras.main.startFollow(player);

        // TODO: show shooting line and collide.

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
        gameOverText = this.add.text(0, 0, "").setOrigin(.5).setColor("#000000");

        this.scoreText = this.add.text(0, 0, "Score: 0").setColor("#000000");
        this.scoreText.setScrollFactor(0); // Stick to camera view.

        // Reset global state. Needed in case the scene is restarted due to death.
        {
            shootState = "unshot";
            gameOver = false;
            nextXToGenerate = 0;
        }

        // Top layer.
        {
            let p: Phaser.Types.Physics.Arcade.SpriteWithStaticBody = platforms.create(50, 300, 'square');
            p.setOrigin(0, 0);
            p.scaleX *= 160;
            p.scaleY *= 2;
            p.refreshBody();

        }

        lineGraphics = this.add.graphics({ lineStyle: { width: 4, color: 0xaa00aa } });
        line = new Phaser.Geom.Line(100, 300, 400, 300);
    }

    update(_time: number, _delta: number) {
        this.scoreText.setText("Score: " + this.score);
        this.score = Math.floor(player.body.x / 300);

        if (player.body.position.x > nextXToGenerate) {
            // Generate next batch of platforms
            console.log("generating for " + nextXToGenerate);

            generatePlatforms(nextXToGenerate + 1600, true);

            nextXToGenerate += 1600;
        }

        if (gameOver) {
            const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
            const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;
            gameOverText.setText("Press space to restart").setX(screenCenterX).setY(screenCenterY);
            if (cursors.space.isDown) {
                this.scene.restart();
            }
            player.setVelocity(0);
            return;
        }

        if (player.body.y > 1600) {
            this.cameras.main.stopFollow();
        }

        if (player.body.y > 1600 + 800) {
            gameOver = true;
            return;
        }

        debugText.setX(this.cameras.main.worldView.x).setColor("#000000");
        debugText.setText("");

        if (cursors.down.isDown) {
            this.scene.restart();
        }

        player.body.setFrictionX(.01);


        player.anims.play('right', true);
        if (player.body.velocity.x > 200) {

            player.body.setVelocityX(player.body.velocity.x * .99);
        }


        if (cursors.up.isDown && player.body.touching.down) {
            player.setVelocityY(-460);
        }

        lineGraphics.clear();

        if (!shoot.isDown) {
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
            if (this.physics.collide(spike, platforms, function (object1: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, object2: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
                var o1 = object1 as Phaser.Types.Physics.Arcade.GameObjectWithBody;
                var o2 = object2 as Phaser.Types.Physics.Arcade.GameObjectWithBody;
                o1.body.y = o2.body.y;
            })) {
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

        if (shoot.isDown) {
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
            debug: false
        }
    },
    scene: [GameScene]

};


var platforms: Phaser.Physics.Arcade.StaticGroup;
var player: Types.Physics.Arcade.SpriteWithDynamicBody;
var gameOver: boolean = false;
var debugText: Phaser.GameObjects.Text;
var gameOverText: Phaser.GameObjects.Text;

var lineGraphics: Phaser.GameObjects.Graphics;
var line: Phaser.Geom.Line;

var editingPlatform: Phaser.Physics.Arcade.Sprite | null = null;

function enableEditing(platform: Phaser.Physics.Arcade.Sprite) {
    if (editingPlatform != null) {
        disableEditing();
    }
    platform.on("drag", function (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) {
        platform.setX(dragX);
        platform.setY(dragY);
    });
    platform.on("dragend", function (_pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number) {
        platform.refreshBody();
    });
    platform.setTint(0xFF0000);
    editingPlatform = platform;
}

function disableEditing() {
    if (editingPlatform == null) {
        return;
    }
    editingPlatform.off("drag");
    editingPlatform.off("dragend");
    editingPlatform.clearTint();
    editingPlatform = null;
}



var cursors: Phaser.Types.Input.Keyboard.CursorKeys;
var shoot: Phaser.Input.Keyboard.Key;
var shootState = "unshot";
var spike: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

var nextXToGenerate = 0;

function generatePlatforms(offsetX: number, randomize: boolean) {

    for (let i = 0; i < platforms.children.entries.length; i++) {
        let p = platforms.children.entries[i];
        if (!p.body) continue;
        if (p.body?.position.x < player.body.x - 1600) {
            console.log("deleting platform " + i);
            platforms.children.delete(p);
            p.destroy();
        }
    }
    // Top layer.
    {
        let p: Phaser.Types.Physics.Arcade.SpriteWithStaticBody = platforms.create(offsetX, 300, 'square');
        p.setOrigin(0, 0);
        p.scaleX *= 20;
        p.scaleY *= 2;
        if (randomize) {
            p.y += Math.random() * 400 - 200;
        }
        p.refreshBody();

    }

    {
        let p = platforms.create(offsetX + 400, 300, 'square');
        p.setOrigin(0, 0);
        p.scaleX *= 20;
        p.scaleY *= 2;
        if (randomize) {
            p.y += Math.random() * 400 - 200;
        }
        p.refreshBody();
    }

    {
        let p = platforms.create(offsetX + 800, 300, 'square');
        p.setOrigin(0, 0);
        p.scaleX *= 20;
        p.scaleY *= 2;
        if (randomize) {
            p.y += Math.random() * 400 - 200;
        }
        p.refreshBody();
    }

    {
        let p = platforms.create(offsetX + 1200, 300, 'square');
        p.setOrigin(0, 0);
        p.scaleX *= 20;
        p.scaleY *= 2;
        if (randomize) {
            p.y += Math.random() * 400 - 200;
        }
        p.refreshBody();
    }

    // if (randomize) {
    // Top layer.
    {
        let p: Phaser.Types.Physics.Arcade.SpriteWithStaticBody = platforms.create(offsetX, 300 + 450, 'square');
        p.setOrigin(0, 0);
        p.scaleX *= 20;
        p.scaleY *= 2;
        if (randomize) {
            p.y += Math.random() * 400 - 200;
        }
        p.refreshBody();

    }

    {
        let p = platforms.create(offsetX + 400, 300 + 450, 'square');
        p.setOrigin(0, 0);
        p.scaleX *= 20;
        p.scaleY *= 2;
        if (randomize) {
            p.y += Math.random() * 400 - 200;
        }
        p.refreshBody();
    }

    {
        let p = platforms.create(offsetX + 800, 300 + 450, 'square');
        p.setOrigin(0, 0);
        p.scaleX *= 20;
        p.scaleY *= 2;
        if (randomize) {
            p.y += Math.random() * 400 - 200;
        }
        p.refreshBody();
    }

    {
        let p = platforms.create(offsetX + 1200, 300 + 450, 'square');
        p.setOrigin(0, 0);
        p.scaleX *= 20;
        p.scaleY *= 2;
        if (randomize) {
            p.y += Math.random() * 400 - 200;
        }
        p.refreshBody();
    }
    // }

}


let game = new Game(config);

export default game;

declare global {
    interface Window { game: any; recording: any; }
}

window.game = game;