import { Game, Types, Scene } from "phaser";

declare var grecaptcha: any;

let startState: string = "unstarted";

// For recaptcha.
const site_key = "6LfmEAMqAAAAACawJpentJZMJQdat7JUVTm1VegP";

let lastScore = {
    set: false,
    score: 0,
    scoreid: "",
    date: 0,
    submitted: false,
    hidden: false // Only not hidden between restarts.
};

let highScore = {
    set: false,
    score: 0,
    scoreid: "",
    date: 0,
    submitted: false
};

function applyScores() {
    // Update UI.
    if (lastScore.submitted || lastScore.score == 0) {
        submit_last_score_el.classList.add("hidden");
    } else if (!lastScore.hidden) {
        submit_last_score_el.classList.remove("hidden");
    }

    if (highScore.submitted || highScore.score == 0) {
        submit_high_score_el.classList.add("hidden");
    } else {
        submit_high_score_el.classList.remove("hidden");
    }

    submit_last_score_el.innerHTML = "Submit score (" + lastScore.score + ") to leaderboard";
    document.querySelector("#high_score")!.innerHTML = "Local best: " + highScore.score;

    // Update local storage.
    if (highScore.set && highScore.score != 0) {
        localStorage.setItem("highScore", JSON.stringify(highScore));
    }
}

const submit_last_score_el = document.querySelector("#submit_last_score")!;
submit_last_score_el.addEventListener("click", function (e: any) {
    submitScore(lastScore, function () {
        lastScore.submitted = true;
        if (lastScore.scoreid == highScore.scoreid) {
            highScore.submitted = true;
        }
        applyScores();
    });
    e.preventDefault();
});

const submit_high_score_el = document.querySelector("#submit_high_score")!;
submit_high_score_el.addEventListener("click", function (e: any) {
    submitScore(highScore, function () {
        highScore.submitted = true;
        applyScores();
    });
    e.preventDefault();
});

function loadScore() {
    const highScore_json = localStorage.getItem("highScore");
    if (!highScore_json) {
        return;
    }
    highScore = JSON.parse(highScore_json);
    applyScores();
}
loadScore();

function getUUID() {
    if (window.isSecureContext) {
        return crypto.randomUUID();
    } else {
        return "" + Math.floor(Math.random() * 10000000);
    }
}


function setScore(score: number) {
    if (score == 0) {
        return;
    }

    lastScore.set = true;
    lastScore.score = score;
    lastScore.scoreid = getUUID();
    lastScore.date = Date.now();
    lastScore.submitted = false;

    if (!highScore.set || score > highScore.score) {
        highScore.set = lastScore.set;
        highScore.score = lastScore.score;
        highScore.scoreid = lastScore.scoreid;
        highScore.date = lastScore.date;
        highScore.submitted = lastScore.submitted;
    }

    applyScores();
}

function submitScore(scoreObj: any, on_success: CallableFunction) {
    const name = prompt("Enter name");
    if (name == null) {
        return;
    }
    if (name.trim() == "") {
        return;
    }
    // Get reCaptcha token.
    grecaptcha.ready(function () {
        grecaptcha.execute(site_key, { action: 'submit' }).then(function (token: string) {
            const fd = new FormData();
            fd.append("token", token);
            fd.append("name", name);
            fd.append("score", "" + scoreObj.score);
            fd.append("scoreid", scoreObj.scoreid);
            fd.append("date", "" + scoreObj.date);
            return fetch("leaderboard/submit.php", {
                method: "POST",
                body: fd
            });
        }).then(function (res: any) {
            return res.json()
        }).then(function (res: any) {
            if (!res["ok"]) {
                alert("Error submitting score: " + res["msg"]);
            } else {
                alert("Score saved");
                if (on_success) {
                    on_success();
                }
            }
        }).catch(function (res: any) {
            console.log("Unexpected error submitting score", res);
            alert("Unexpected error submitting score. See Developer Tools for more information.");
        });
    });
}

class GameScene extends Scene {
    score: number;
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
    canvas = document.querySelector("#game-container canvas");
    isShootDown() {
        if (this.input.activePointer.downElement == this.canvas && this.input.activePointer.isDown) {
            return true;
        }
        return this.space.isDown;
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
            graphics.fillCircle(2, 2, 2);
            graphics.generateTexture('circle', 4, 4);
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
        this.player.setCollideWorldBounds(false);
        this.player.body.setGravityY(300); // Q: why does this appear to be more than the gravity applied in the config? A:
        let that = this;
        this.physics.add.collider(this.player, this.platforms, (_o1: Phaser.Tilemaps.Tile | Types.Physics.Arcade.GameObjectWithBody, _o2: Phaser.Tilemaps.Tile | Types.Physics.Arcade.GameObjectWithBody) => {
            if (that.isShootDown()) {
                this.gameOverState = "need_release";
            } else {
                this.gameOverState = "need_press";
            }

            that.gameOver = true;
            setScore(this.score);
        });

        if (this.input.keyboard) {
            this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        }

        // this.physics.world.setBounds(0, 0, 1600, 600); // 1600x1200 size
        // this.cameras.main.setBounds(0, 0, 1600, 600);
        this.cameras.main.startFollow(this.player, false, 1 /* follow X */, 0 /* do not follow Y */, 0 /* offset X */, -100 /* offset Y */);

        this.centerText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, "").setOrigin(.5).setColor("#FFFFFF").setBackgroundColor("#000000").setFont("Varela, Monospace").setFontSize("20px").setPadding(5);
        this.centerText.setScrollFactor(0);
        this.centerText.depth = 1;
        this.centerText.setVisible(false);

        if (startState == "unstarted") {
            this.physics.pause();
        }

        this.scoreText = this.add.text(this.cameras.main.width / 2, 5, "").setOrigin(.5, 0).setColor("#FFFFFF").setBackgroundColor("#000000").setFont("Varela, Monospace").setFontSize("20px").setPadding(5);
        this.scoreText.setScrollFactor(0); // Stick to camera view.
        this.scoreText.depth = 1;

        this.shootState = "unshot";
        this.gameOver = false;
        submit_last_score_el.classList.add("hidden");

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
                p.scaleY *= 40;
                p.setDebugBodyColor(0xFF0000)
                p.refreshBody();
            }

            // Floor.
            {
                let p: Phaser.Types.Physics.Arcade.SpriteWithStaticBody = this.platforms.create(xOff + (i * 50), yOff + 550 - yExtra, 'square');
                p.setOrigin(0, 0);
                p.scaleX *= 5;
                p.scaleY *= 40;
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
            this.centerText.setText("CLICK TO START").setVisible(true);
            if (this.isShootDown()) {
                startState = "started";
                this.centerText.setVisible(false);
                this.physics.resume();
            }
            return;
        }

        if (this.gameOver) {
            this.centerText.setText("CLICK TO RESTART").setVisible(true);
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
        }

        if (this.player.body.y > 1600) {
            this.cameras.main.stopFollow();
        }

        if (this.player.body.velocity.x > 200) {

            this.player.body.setVelocityX(this.player.body.velocity.x * .99);
        }



        this.lineGraphics.clear();

        if (!this.gameOver && !this.isShootDown()) {
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
            this.line.x2 = this.spike.body.x + 2;
            this.line.y2 = this.spike.body.y + 2;
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
            this.line.x2 = this.spike.body.x + 2;
            this.line.y2 = this.spike.body.y + 2;
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
