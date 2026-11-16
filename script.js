// ==================================
// 1. SELECT CANVAS
// ==================================

const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;


// ==================================
// 2. GAME SETTINGS
// ==================================

const BALL_SIZE = 12;

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 12;

const BRICK_ROWS = 5;
const BRICK_COLUMNS = 8;

const BRICK_WIDTH = 65;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 8;
const BRICK_SKEW = 8;      // how far the top edge slants (0 = plain rectangle)

const MAX_LIVES = 3;
const MAX_STAGES = 5;

const START_SPEED = 5;     // ball speed on stage 1
const MAX_SPEED = 10;
const MAX_BOUNCE_ANGLE = Math.PI / 3;   // 60 degrees

let score = 0;
let lives = MAX_LIVES;

let gameOver = false;
let gameWon = false;
let isPaused = false;

let ballSpeed = START_SPEED;
let currentStage = 1;

let frame = 0;             // drives the animated brick colors

const rand = (min, max) => min + Math.random() * (max - min);

// Maps any number to a hue between 65 and 345 that sweeps back and forth.
// This skips the red-orange-amber band (about 346 to 64), so no orange ever appears.
const HUE_MIN = 65;
const HUE_SPAN = 280;

function safeHue(raw) {
    const t = ((raw % (HUE_SPAN * 2)) + HUE_SPAN * 2) % (HUE_SPAN * 2);
    return HUE_MIN + (t < HUE_SPAN ? t : HUE_SPAN * 2 - t);
}

// roundRect is missing in older browsers, so fall back to a plain rectangle
function roundedRect(x, y, w, h, r) {
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.rect(x, y, w, h);
    }
}


// ==================================
// 3. PAGE ELEMENTS
// These are looked up once. The game still runs if one of the optional
// ones (best score text, buttons) is missing from the HTML.
// ==================================

const highScoreText = document.querySelector("#highScore");
const pauseButton = document.querySelector("#pause");
const restartButton = document.querySelector("#restart");
const resetBestButton = document.querySelector("#resetBest");


// ==================================
// 4. HIGH SCORE (saved in the browser)
// ==================================

const STORAGE_KEY = "brickBreakerHighScore";

function loadHighScore() {
    try {
        return Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch (error) {
        return 0;
    }
}

function saveHighScore() {
    try {
        localStorage.setItem(STORAGE_KEY, highScore);
    } catch (error) {}
}

function showHighScore() {
    if (highScoreText) {
        highScoreText.textContent = highScore;
    }
}

function resetHighScore() {
    highScore = 0;
    showHighScore();
    saveHighScore();
}

let highScore = loadHighScore();
showHighScore();


// ==================================
// 5. BOMB ANIMATION SETTINGS
// ==================================

let bombAnimation = false;
let bombBricks = [];
let bombFrame = 0;

const BOMB_DURATION = 30;


// ==================================
// 6. PARTICLES (FIRE + SPARKS)
// ==================================

let particles = [];

// h0 = hue at birth, h1 = hue at death. ay < 0 rises (fire), ay > 0 falls (sparks)
function addParticle(x, y, vx, vy, ay, size, life, h0, h1) {
    particles.push({ x, y, vx, vy, ay, size, life, max: life, h0, h1 });
}

function emitBallFire() {
    for (let i = 0; i < 4; i++) {
        addParticle(
            ballPosition.x + rand(-2, 2),
            ballPosition.y + rand(-2, 2),
            -xSpeed * 0.12 + rand(-0.6, 0.6),
            -ySpeed * 0.12 + rand(-0.6, 0.6),
            -0.03,
            rand(4, 8),
            rand(14, 26),
            320, 270            // hot pink -> violet
        );
    }
}

function emitPaddleFire() {
    for (let i = 0; i < 3; i++) {
        addParticle(
            rand(paddle.x + 4, paddle.x + paddle.width - 4),
            paddle.y + 2,
            rand(-0.3, 0.3),
            rand(-2.2, -0.8),
            -0.02,
            rand(3, 6),
            rand(18, 30),
            185, 250            // cyan -> blue
        );
    }
}

function burstBrick(brick) {
    const hue = safeHue(brick.hue + frame * 0.6);

    for (let i = 0; i < 12; i++) {
        addParticle(
            brick.x + brick.width / 2 + rand(-15, 15),
            brick.y + brick.height / 2,
            rand(-3, 3),
            rand(-3, 2),
            0.1,
            rand(2, 4),
            rand(20, 32),
            hue, hue
        );
    }
}

function updateParticles() {
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.ay;
        p.life--;
    });

    particles = particles.filter(p => p.life > 0);

    if (particles.length > 700) {
        particles.splice(0, particles.length - 700);
    }
}

function drawParticles() {
    ctx.globalCompositeOperation = "lighter";

    particles.forEach(p => {
        const t = p.life / p.max;
        const hue = p.h1 + (p.h0 - p.h1) * t;

        ctx.fillStyle = `hsla(${hue}, 100%, ${45 + t * 25}%, ${t * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + t * 0.6), 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalCompositeOperation = "source-over";
}


// ==================================
// 7. BALL SETTINGS
// ==================================

let ballPosition;
let xSpeed;
let ySpeed;

function initBall() {
    ballPosition = {
        x: width / 2,
        y: height - 50
    };

    xSpeed = ballSpeed * 0.6;
    ySpeed = -ballSpeed * 0.8;
}


// ==================================
// 8. PADDLE SETTINGS
// ==================================

let paddle = {
    x: width / 2 - PADDLE_WIDTH / 2,
    y: height - 25,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 7
};

let moveLeft = false;
let moveRight = false;


// ==================================
// 9. CREATE / DESTROY BRICKS
// ==================================

let bricks = [];

function createBricks() {
    bricks = [];

    // Starting hue for each stage (all outside the orange range)
    const stageHues = [70, 280, 120, 330, 200];
    const baseHue = stageHues[currentStage - 1];

    const totalRows = Math.min(BRICK_ROWS + currentStage - 1, 12);

    for (let row = 0; row < totalRows; row++) {
        for (let col = 0; col < BRICK_COLUMNS; col++) {
            bricks.push({
                x: 15 + col * (BRICK_WIDTH + BRICK_GAP),
                y: 40 + row * (BRICK_HEIGHT + BRICK_GAP),
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                hue: baseHue + row * 28 + col * 6,
                destroyed: false
            });
        }
    }
}

function destroyBrick(brick) {
    brick.destroyed = true;
    score += 10;
    burstBrick(brick);

    if (score > highScore) {
        highScore = score;
        showHighScore();
        saveHighScore();
    }
}


// ==================================
// 10. DRAWING
// ==================================

function drawBall() {
    ctx.save();

    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 25;

    ctx.beginPath();
    ctx.arc(ballPosition.x, ballPosition.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.shadowColor = "#b388ff";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffb3f5";
    ctx.stroke();

    ctx.restore();
}

function drawPaddle() {
    ctx.save();

    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 22;

    ctx.fillStyle = "#00e5ff";
    ctx.beginPath();
    roundedRect(paddle.x, paddle.y, paddle.width, paddle.height, paddle.height / 2);
    ctx.fill();

    // Bright inner line gives the tube-light look
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e0ffff";
    ctx.beginPath();
    roundedRect(paddle.x + 8, paddle.y + 3, paddle.width - 16, paddle.height - 8, 2);
    ctx.fill();

    ctx.restore();
}

function drawBricks() {
    ctx.save();

    bricks.forEach(brick => {
        if (brick.destroyed) return;

        const hue = safeHue(brick.hue + frame * 0.6);
        const hue2 = safeHue(brick.hue + frame * 0.6 + 40);
        const { x, y, width: w, height: h } = brick;

        ctx.beginPath();
        ctx.moveTo(x + BRICK_SKEW, y);
        ctx.lineTo(x + w + BRICK_SKEW, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, y, 0, y + h);
        gradient.addColorStop(0, `hsl(${hue}, 100%, 65%)`);
        gradient.addColorStop(1, `hsl(${hue2}, 100%, 45%)`);

        ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
        ctx.shadowBlur = 10;
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `hsla(${hue}, 100%, 85%, 0.8)`;
        ctx.stroke();
    });

    ctx.restore();
}

function drawBombAnimation() {
    if (!bombAnimation) return;

    ctx.save();   // keeps the text settings below from leaking into later drawing

    ctx.font = "22px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    bombBricks.forEach(brick => {
        if (!brick.destroyed && bombFrame % 8 < 4) {
            ctx.fillText("💠", brick.x + brick.width / 2, brick.y + brick.height / 2);
        }
    });

    ctx.restore();
}

function drawScore() {
    ctx.save();

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 8;

    ctx.textAlign = "left";
    ctx.fillText("Score: " + score, 15, 25);

    ctx.textAlign = "right";
    ctx.fillText("Lives: " + lives, width - 15, 25);

    ctx.textAlign = "center";
    ctx.fillText("Stage: " + currentStage + "/" + MAX_STAGES, width / 2, 25);

    ctx.restore();
}

function drawPaused() {
    ctx.save();
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("PAUSED", width / 2, height / 2);
    ctx.restore();
}

function drawGameOver() {
    ctx.save();
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "rgba(0, 0, 0, 0.90)";
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = "center";

    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ff2bd6";
    ctx.font = "bold 48px Arial";
    ctx.fillText("GAME OVER!", width / 2, height / 2 - 85);
    ctx.shadowBlur = 0;

    ctx.font = "55px Arial";
    ctx.fillText("💀", width / 2, height / 2 - 15);

    ctx.fillStyle = "#ffffff";
    ctx.font = "24px Arial";
    ctx.fillText("Final Score: " + score, width / 2, height / 2 + 45);

    ctx.fillStyle = "#00e5ff";
    ctx.font = "20px Arial";
    ctx.fillText("Stage Reached: " + currentStage, width / 2, height / 2 + 85);

    ctx.fillStyle = "#b388ff";
    ctx.font = "18px Arial";
    ctx.fillText("Better luck next time!", width / 2, height / 2 + 125);

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.fillText("Press ENTER or click RESTART GAME to play again", width / 2, height / 2 + 165);

    ctx.restore();
}

function drawWinScreen() {
    ctx.save();
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = "center";

    ctx.font = "65px Arial";
    ctx.fillText("💎", width / 2, height / 2 - 90);

    ctx.shadowColor = "#39ff14";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#39ff14";
    ctx.font = "bold 42px Arial";
    ctx.fillText("YOU WIN!", width / 2, height / 2 - 25);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#00ffcc";
    ctx.font = "22px Arial";
    ctx.fillText("🎉 Congratulations! 🎉", width / 2, height / 2 + 20);

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Final Score: " + score, width / 2, height / 2 + 65);

    ctx.font = "17px Arial";
    ctx.fillText("You are a Brick Breaker Champion!", width / 2, height / 2 + 105);

    ctx.restore();
}

// Draws one complete picture of the game
function render() {
    ctx.clearRect(0, 0, width, height);

    drawBricks();
    drawParticles();
    drawPaddle();
    drawBall();
    drawScore();
    drawBombAnimation();

    if (gameOver) {
        drawGameOver();
    } else if (gameWon) {
        drawWinScreen();
    } else if (isPaused) {
        drawPaused();
    }
}


// ==================================
// 11. GAME LOGIC
// ==================================

function updatePaddle() {
    if (moveLeft) paddle.x -= paddle.speed;
    if (moveRight) paddle.x += paddle.speed;

    paddle.x = Math.max(0, Math.min(width - paddle.width, paddle.x));
}

function updateBall() {
    const r = BALL_SIZE / 2;

    ballPosition.x += xSpeed;
    ballPosition.y += ySpeed;

    // Walls: push the ball back inside AND point it away from the wall,
    // so it can never get stuck vibrating inside a wall
    if (ballPosition.x - r < 0) {
        ballPosition.x = r;
        xSpeed = Math.abs(xSpeed);
    } else if (ballPosition.x + r > width) {
        ballPosition.x = width - r;
        xSpeed = -Math.abs(xSpeed);
    }

    if (ballPosition.y - r < 0) {
        ballPosition.y = r;
        ySpeed = Math.abs(ySpeed);
    }

    // Bottom: lose one life
    if (ballPosition.y - r > height) {
        lives--;

        if (lives <= 0) {
            lives = 0;
            gameOver = true;
            return;
        }

        initBall();
        paddle.x = width / 2 - PADDLE_WIDTH / 2;
    }
}

function checkPaddleCollision() {
    const r = BALL_SIZE / 2;
    const ballBottom = ballPosition.y + r;

    if (
        ySpeed > 0 &&
        ballBottom >= paddle.y &&
        ballBottom <= paddle.y + paddle.height &&
        ballPosition.x + r >= paddle.x &&
        ballPosition.x - r <= paddle.x + paddle.width
    ) {
        // -1 = left edge, 0 = centre, +1 = right edge
        const hit = Math.max(-1, Math.min(1,
            (ballPosition.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2)
        ));

        // The hit position sets the bounce angle; the speed stays exactly ballSpeed
        const angle = hit * MAX_BOUNCE_ANGLE;
        xSpeed = ballSpeed * Math.sin(angle);
        ySpeed = -ballSpeed * Math.cos(angle);

        ballPosition.y = paddle.y - r;
    }
}

function checkBrickCollision() {
    const r = BALL_SIZE / 2;
    const ballLeft = ballPosition.x - r;
    const ballRight = ballPosition.x + r;
    const ballTop = ballPosition.y - r;
    const ballBottom = ballPosition.y + r;

    for (const brick of bricks) {
        if (brick.destroyed) continue;

        const brickRight = brick.x + brick.width + BRICK_SKEW;
        const brickBottom = brick.y + brick.height;

        if (
            ballRight > brick.x &&
            ballLeft < brickRight &&
            ballBottom > brick.y &&
            ballTop < brickBottom
        ) {
            destroyBrick(brick);

            // How deep the ball is inside the brick from each side
            const overlapX = Math.min(ballRight - brick.x, brickRight - ballLeft);
            const overlapY = Math.min(ballBottom - brick.y, brickBottom - ballTop);

            // Bounce off the side with the smaller overlap (the side that was really hit)
            if (overlapX < overlapY) {
                xSpeed = -xSpeed;
            } else {
                ySpeed = -ySpeed;
            }

            break;   // only one brick per step
        }
    }
}

function updateBombAnimation() {
    bombFrame++;

    if (bombFrame >= BOMB_DURATION) {
        bombBricks.forEach(brick => {
            if (!brick.destroyed) destroyBrick(brick);
        });

        bombAnimation = false;
        bombBricks = [];
        bombFrame = 0;

        checkWin();
    }
}

function startBomb() {
    if (isPaused || gameOver || gameWon || bombAnimation) return;

    bombBricks = bricks.filter(brick => !brick.destroyed);

    if (bombBricks.length === 0) return;

    bombFrame = 0;
    bombAnimation = true;
}

function checkWin() {
    const remainingBricks = bricks.filter(brick => !brick.destroyed);

    if (remainingBricks.length === 0) {
        if (currentStage >= MAX_STAGES) {
            gameWon = true;
            return;
        }

        currentStage++;
        lives = MAX_LIVES;
        ballSpeed = Math.min(ballSpeed + 1, MAX_SPEED);

        createBricks();
        initBall();
        paddle.x = width / 2 - PADDLE_WIDTH / 2;
    }
}

// One fixed step of the game (the loop below calls this 60 times per second)
function update() {
    if (isPaused || gameOver || gameWon) return;

    frame++;

    if (bombAnimation) {
        updateBombAnimation();
        updateParticles();
        return;
    }

    updatePaddle();
    updateBall();

    if (!gameOver) {
        emitBallFire();
        emitPaddleFire();
        checkPaddleCollision();
        checkBrickCollision();
        checkWin();
    }

    updateParticles();
}


// ==================================
// 12. PAUSE AND RESTART
// ==================================

function togglePause() {
    if (gameOver || gameWon) return;

    isPaused = !isPaused;

    if (pauseButton) {
        pauseButton.textContent = isPaused ? "Play" : "Pause";
    }

    if (isPaused) {
        render();            // draw the PAUSED text right away
    } else {
        gameLoop();
    }
}

function restartGame() {
    score = 0;
    lives = MAX_LIVES;

    gameOver = false;
    gameWon = false;
    isPaused = false;

    currentStage = 1;
    ballSpeed = START_SPEED;

    bombAnimation = false;
    bombBricks = [];
    bombFrame = 0;
    particles = [];

    if (pauseButton) {
        pauseButton.textContent = "Pause";
    }

    moveLeft = false;
    moveRight = false;

    endHandled = false;
    hideSubmitBox();

    paddle.x = width / 2 - PADDLE_WIDTH / 2;

    createBricks();
    initBall();
    gameLoop();
}


// ==================================
// 13. CONTROLS
// ==================================

document.addEventListener("keydown", event => {
    // While typing a name, Space/Enter/arrows must not control the game
    if (event.target.tagName === "INPUT") return;

    if (event.key === "ArrowLeft") {
        event.preventDefault();   // stops the page from scrolling sideways
        moveLeft = true;
    }

    if (event.key === "ArrowRight") {
        event.preventDefault();
        moveRight = true;
    }

    // SPACEBAR: Pause / Play
    if (event.code === "Space") {
        event.preventDefault();

        if (!event.repeat) {
            togglePause();
        }
    }

    // ENTER: Restart
    if (event.key === "Enter") {
        event.preventDefault();

        if (!event.repeat) {
            restartGame();
        }
    }

    // SECRET BOMB: SHIFT + S
    if (event.shiftKey && event.code === "KeyS" && !event.repeat) {
        event.preventDefault();
        startBomb();
    }
});

document.addEventListener("keyup", event => {
    if (event.target.tagName === "INPUT") return;

    if (event.key === "ArrowLeft") moveLeft = false;
    if (event.key === "ArrowRight") moveRight = false;

    // Stops a focused button from also "clicking" itself when SPACE is released
    if (event.code === "Space") event.preventDefault();
});

// If the window loses focus while a key is held, the keyup is never received
window.addEventListener("blur", () => {
    moveLeft = false;
    moveRight = false;
});

if (pauseButton) {
    pauseButton.addEventListener("click", () => {
        pauseButton.blur();
        togglePause();
    });
}

if (restartButton) {
    restartButton.addEventListener("click", () => {
        restartButton.blur();
        restartGame();
    });
}

if (resetBestButton) {
    resetBestButton.addEventListener("click", () => {
        resetBestButton.blur();

        if (confirm("Reset your best score to 0?")) {
            resetHighScore();
        }
    });
}


// ==================================
// 14. MAIN GAME LOOP (fixed time step)
// ==================================

const STEP = 1000 / 60;    // the game always runs at 60 updates per second

let animationId = null;
let lastTime = 0;
let accumulator = 0;

function gameLoop() {
    // Prevent duplicate animation loops
    if (animationId !== null) return;

    lastTime = 0;
    accumulator = 0;

    function animate(time) {
        animationId = null;

        if (lastTime === 0) lastTime = time;

        // Time since the last frame (capped, so a long pause can't cause a huge jump)
        accumulator += Math.min(time - lastTime, 100);
        lastTime = time;

        while (accumulator >= STEP) {
            update();
            accumulator -= STEP;
        }

        render();

        // The game just ended: offer to save the score (only once per game)
        if ((gameOver || gameWon) && !endHandled) {
            endHandled = true;
            onGameEnd();
        }

        // Keep looping only while the game is actually running
        if (!isPaused && !gameOver && !gameWon) {
            animationId = requestAnimationFrame(animate);
        }
    }

    animationId = requestAnimationFrame(animate);
}


// ==================================
// 15. ONLINE LEADERBOARD (talks to server.js)
// ==================================

const API_URL = "/api/scores";
const NAME_KEY = "brickBreakerPlayerName";

const submitBox = document.querySelector("#submitBox");
const nameInput = document.querySelector("#playerName");
const submitButton = document.querySelector("#submitScore");
const submitMessage = document.querySelector("#submitMessage");
const leaderboardList = document.querySelector("#leaderboard");
const leaderboardStatus = document.querySelector("#leaderboardStatus");

let endHandled = false;    // true once the end-of-game box has been shown

function setText(element, text) {
    if (element) element.textContent = text;
}

// GET the top 10 from the server and show them
async function loadLeaderboard() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) throw new Error("HTTP " + response.status);

        showLeaderboard(await response.json());
        setText(leaderboardStatus, "");
    } catch (error) {
        setText(leaderboardStatus, "Leaderboard offline. Open the game through the server (http://localhost:3000).");
    }
}

function showLeaderboard(rows) {
    if (!leaderboardList) return;

    leaderboardList.textContent = "";

    rows.forEach(row => {
        const item = document.createElement("li");

        // textContent (not innerHTML) so a name can never inject HTML or scripts
        item.textContent = row.name + ": " + row.score + " (stage " + row.stage + ")";
        leaderboardList.appendChild(item);
    });

    if (rows.length === 0) {
        setText(leaderboardStatus, "No scores yet. Be the first!");
    }
}

function hideSubmitBox() {
    if (submitBox) submitBox.hidden = true;
}

// Called once when a game ends
function onGameEnd() {
    if (!submitBox || score <= 0) return;

    submitBox.hidden = false;
    submitButton.disabled = false;
    setText(submitMessage, "");

    try {
        nameInput.value = localStorage.getItem(NAME_KEY) || "";
    } catch (error) {}

    nameInput.focus();
}

// POST the score to the server
async function submitScore() {
    if (submitButton.disabled) return;   // already saving or already saved

    const name = nameInput.value.trim();

    if (!name) {
        setText(submitMessage, "Please enter a name.");
        return;
    }

    submitButton.disabled = true;
    setText(submitMessage, "Saving...");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, score, stage: currentStage })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not save.");
        }

        try {
            localStorage.setItem(NAME_KEY, name);
        } catch (error) {}

        setText(submitMessage, "Saved! You are rank #" + result.rank + ".");
        loadLeaderboard();
    } catch (error) {
        setText(submitMessage, error.message);
        submitButton.disabled = false;    // let the player try again
    }
}

if (submitButton) {
    submitButton.addEventListener("click", submitScore);
}

if (nameInput) {
    nameInput.addEventListener("keydown", event => {
        if (event.key === "Enter") submitScore();
    });
}


// ==================================
// 16. START GAME
// ==================================

loadLeaderboard();
createBricks();
initBall();
gameLoop();