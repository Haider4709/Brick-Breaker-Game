
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

const MAX_LIVES = 3;
const MAX_STAGES = 5;

let score = 0;
let lives = MAX_LIVES;

let gameOver = false;
let gameWon = false;
let isPaused = false;

let ballSpeed = 5;
let currentStage = 1;


// ==================================
// 3. BOMB ANIMATION SETTINGS
// ==================================

let bombAnimation = false;
let bombBricks = [];
let bombFrame = 0;

const BOMB_DURATION = 30;


// ==================================
// 4. BALL SETTINGS
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
// 5. PADDLE SETTINGS
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
// 6. CREATE BRICKS
// ==================================

let bricks = [];

function createBricks() {
    bricks = [];

    const stageColors = [
        ["#ff5252", "#ff9800", "#ffeb3b", "#4caf50", "#2196f3"],
        ["#e040fb", "#ab47bc", "#7e57c2", "#5c6bc0", "#3949ab"],
        ["#b2ff59", "#76ff03", "#64dd17", "#00c853", "#009688"],
        ["#ff80ab", "#ff4081", "#f50057", "#c51162", "#880e4f"],
        ["#80d8ff", "#40c4ff", "#00b0ff", "#0091ea", "#01579b"]
    ];

    const colors = stageColors[currentStage - 1];

    const totalRows = Math.min(
        BRICK_ROWS + currentStage - 1,
        12
    );

    for (let row = 0; row < totalRows; row++) {
        for (let col = 0; col < BRICK_COLUMNS; col++) {
            bricks.push({
                x: 15 + col * (BRICK_WIDTH + BRICK_GAP),
                y: 40 + row * (BRICK_HEIGHT + BRICK_GAP),
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                color: colors[row % colors.length],
                destroyed: false
            });
        }
    }
}


// ==================================
// 7. DRAW BALL
// ==================================

function drawBall() {
    ctx.beginPath();

    ctx.arc(
        ballPosition.x,
        ballPosition.y,
        BALL_SIZE / 2,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.closePath();
}


// ==================================
// 8. DRAW PADDLE
// ==================================

function drawPaddle() {
    ctx.fillStyle = 'dodgerblue';
    
    ctx.beginPath();

    ctx.roundRect(
        paddle.x,
        paddle.y,
        paddle.width,
        paddle.height,
        paddle.height/2
    );

    ctx.fill();
}

   


// ==================================
// 9. DRAW BRICKS
// ==================================

function drawBricks() {
    bricks.forEach(brick => {
        if (!brick.destroyed) {
            ctx.fillStyle = brick.color;

            ctx.fillRect(
                brick.x,
                brick.y,
                brick.width,
                brick.height
            );
        }
    });
}


// ==================================
// 10. BOMB ANIMATION
// ==================================

function drawBombAnimation() {
    if (!bombAnimation) return;

    bombBricks.forEach(brick => {
        if (!brick.destroyed && bombFrame % 8 < 4) {
            ctx.font = "22px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillText(
                "💣",
                brick.x + brick.width / 2,
                brick.y + brick.height / 2
            );
        }
    });
}


function updateBombAnimation() {
    if (!bombAnimation) return;

    bombFrame++;

    if (bombFrame >= BOMB_DURATION) {
        bombBricks.forEach(brick => {
            if (!brick.destroyed) {
                brick.destroyed = true;
                score += 10;
            }
        });

        bombAnimation = false;
        bombBricks = [];
        bombFrame = 0;

        checkWin();
    }
}


function startBomb() {
    if (
        isPaused ||
        gameOver ||
        gameWon ||
        bombAnimation
    ) {
        return;
    }

    bombBricks = bricks.filter(
        brick => !brick.destroyed
    );

    if (bombBricks.length === 0) return;

    bombFrame = 0;
    bombAnimation = true;
}


// ==================================
// 11. DRAW SCORE, LIVES AND STAGE
// ==================================

function drawScore() {
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";

    ctx.textAlign = "left";
    ctx.fillText("Score: " + score, 15, 25);

    ctx.textAlign = "right";
    ctx.fillText("Lives: " + lives, width - 15, 25);

    ctx.textAlign = "center";
    ctx.fillText(
        "Stage: " + currentStage + "/" + MAX_STAGES,
        width / 2,
        25
    );
}


// ==================================
// 12. DRAW EVERYTHING
// ==================================

function draw() {
    ctx.clearRect(0, 0, width, height);

    drawBall();
    drawPaddle();
    drawBricks();
    drawScore();
}


// ==================================
// 13. MOVE PADDLE
// ==================================

function updatePaddle() {
    if (moveLeft) {
        paddle.x -= paddle.speed;
    }

    if (moveRight) {
        paddle.x += paddle.speed;
    }

    paddle.x = Math.max(
        0,
        Math.min(width - paddle.width, paddle.x)
    );
}


// ==================================
// 14. MOVE BALL
// ==================================

function updateBall() {
    ballPosition.x += xSpeed;
    ballPosition.y += ySpeed;

    // Left and right walls
    if (
        ballPosition.x - BALL_SIZE / 2 < 0 ||
        ballPosition.x + BALL_SIZE / 2 > width
    ) {
        xSpeed = -xSpeed;
    }

    // Top wall
    if (ballPosition.y - BALL_SIZE / 2 < 0) {
        ySpeed = -ySpeed;
    }

    // Bottom wall: lose one life
    if (ballPosition.y - BALL_SIZE / 2 > height) {
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


// ==================================
// 15. PADDLE COLLISION
// ==================================

function checkPaddleCollision() {
    const ballBottom =
        ballPosition.y + BALL_SIZE / 2;

    const ballLeft =
        ballPosition.x - BALL_SIZE / 2;

    const ballRight =
        ballPosition.x + BALL_SIZE / 2;

    if (
        ySpeed > 0 &&
        ballBottom >= paddle.y &&
        ballBottom <= paddle.y + paddle.height &&
        ballRight >= paddle.x &&
        ballLeft <= paddle.x + paddle.width
    ) {
        ySpeed = -Math.abs(ySpeed);

        const hitPosition =
            (ballPosition.x - (paddle.x + paddle.width / 2))
            / (paddle.width / 2);

        xSpeed = hitPosition * ballSpeed;

        ballPosition.y = paddle.y - BALL_SIZE / 2;
    }
}


// ==================================
// 16. BRICK COLLISION
// ==================================

function checkBrickCollision() {
    bricks.forEach(brick => {
        if (brick.destroyed) return;

        const ballLeft =
            ballPosition.x - BALL_SIZE / 2;

        const ballRight =
            ballPosition.x + BALL_SIZE / 2;

        const ballTop =
            ballPosition.y - BALL_SIZE / 2;

        const ballBottom =
            ballPosition.y + BALL_SIZE / 2;

        if (
            ballRight > brick.x &&
            ballLeft < brick.x + brick.width &&
            ballBottom > brick.y &&
            ballTop < brick.y + brick.height
        ) {
            brick.destroyed = true;

            score += 10;
            ySpeed = -ySpeed;
        }
    });
}


// ==================================
// 17. CHECK WIN AND NEXT STAGE
// ==================================

function checkWin() {
    const remainingBricks = bricks.filter(
        brick => !brick.destroyed
    );

    if (remainingBricks.length === 0) {
        // Final stage completed
        if (currentStage >= MAX_STAGES) {
            gameWon = true;
            return;
        }

        // Move to the next stage
        currentStage++;

        lives = MAX_LIVES;

        // Increase ball speed
        ballSpeed = Math.min(ballSpeed + 1, 10);

        speedSlider.value = ballSpeed;
        speedValue.textContent = ballSpeed;

        // Create next stage
        createBricks();

        // Reset ball and paddle
        initBall();
        paddle.x = width / 2 - PADDLE_WIDTH / 2;
    }
}


// ==================================
// 18. KEYBOARD CONTROLS
// ==================================

document.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") {
        moveLeft = true;
    }

    if (event.key === "ArrowRight") {
        moveRight = true;
    }

    // SPACEBAR: Pause / Play
    if (event.code === "Space") {
        event.preventDefault();

        if (!event.repeat) {
            pauseButton.click();
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
    if (
        event.shiftKey &&
        event.code === "KeyS" &&
        !event.repeat
    ) {
        event.preventDefault();
        startBomb();
    }
});


document.addEventListener("keyup", event => {
    if (event.key === "ArrowLeft") {
        moveLeft = false;
    }

    if (event.key === "ArrowRight") {
        moveRight = false;
    }
});


// ==================================
// 19. BALL SPEED SLIDER
// ==================================

const speedSlider = document.querySelector("#ballSpeed");
const speedValue = document.querySelector("#speedValue");

speedSlider.addEventListener("input", () => {
    ballSpeed = Number(speedSlider.value);

    speedValue.textContent = ballSpeed;

    const currentSpeed = Math.hypot(xSpeed, ySpeed);

    if (currentSpeed > 0) {
        const directionX = xSpeed / currentSpeed;
        const directionY = ySpeed / currentSpeed;

        xSpeed = directionX * ballSpeed;
        ySpeed = directionY * ballSpeed;
    }
});


// ==================================
// 20. GAME OVER SCREEN
// ==================================

function drawGameOver() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.90)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#ff3333";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        "GAME OVER!",
        width / 2,
        height / 2 - 85
    );

    ctx.font = "55px Arial";
    ctx.fillText(
        "💥",
        width / 2,
        height / 2 - 15
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "24px Arial";

    ctx.fillText(
        "Final Score: " + score,
        width / 2,
        height / 2 + 45
    );

    ctx.fillStyle = "#00e5ff";
    ctx.font = "20px Arial";

    ctx.fillText(
        "Stage Reached: " + currentStage,
        width / 2,
        height / 2 + 85
    );

    ctx.fillStyle = "#ffcc00";
    ctx.font = "18px Arial";

    ctx.fillText(
        "Better luck next time!",
        width / 2,
        height / 2 + 125
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";

    ctx.fillText(
        "Click RESTART GAME to play again",
        width / 2,
        height / 2 + 165
    );
}


// ==================================
// 21. WIN SCREEN
// ==================================

function drawWinScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, width, height);

    ctx.font = "65px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        "🏆",
        width / 2,
        height / 2 - 90
    );

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 42px Arial";

    ctx.fillText(
        "YOU WIN!",
        width / 2,
        height / 2 - 25
    );

    ctx.fillStyle = "#00ffcc";
    ctx.font = "22px Arial";

    ctx.fillText(
        "🎉 Congratulations! 🎉",
        width / 2,
        height / 2 + 20
    );

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";

    ctx.fillText(
        "Final Score: " + score,
        width / 2,
        height / 2 + 65
    );

    ctx.font = "17px Arial";

    ctx.fillText(
        "You are a Brick Breaker Champion! 👑",
        width / 2,
        height / 2 + 105
    );
}


// ==================================
// 22. PAUSE / PLAY BUTTON
// ==================================

const pauseButton = document.querySelector("#pause");

pauseButton.addEventListener("click", () => {
    if (gameOver || gameWon) return;

    isPaused = !isPaused;

    pauseButton.textContent = isPaused ? "Play" : "Pause";

    if (!isPaused) {
        gameLoop();
    }
});


// ==================================
// 23. RESTART GAME
// ==================================

function restartGame() {
    score = 0;
    lives = MAX_LIVES;

    gameOver = false;
    gameWon = false;
    isPaused = false;

    currentStage = 1;
    ballSpeed = 5;

    speedSlider.value = 5;
    speedValue.textContent = 5;

    // Reset bomb animation
    bombAnimation = false;
    bombBricks = [];
    bombFrame = 0;

    // Reset controls
    pauseButton.textContent = "Pause";

    moveLeft = false;
    moveRight = false;

    // Reset paddle
    paddle.x = width / 2 - PADDLE_WIDTH / 2;

    // Create new bricks
    createBricks();

    // Reset ball
    initBall();

    // Start game
    gameLoop();
}


document.querySelector("#restart").addEventListener(
    "click",
    restartGame
);


// ==================================
// 24. MAIN GAME LOOP
// ==================================

let animationId = null;

function gameLoop() {
    // Prevent duplicate animation loops
    if (animationId !== null) return;

    function animate() {
        animationId = null;

        draw();

        // Game Over
        if (gameOver) {
            drawGameOver();
            return;
        }

        // Win screen
        if (gameWon) {
            drawWinScreen();
            return;
        }

        // Pause screen
        if (isPaused) {
            ctx.fillStyle = "white";
            ctx.font = "30px Arial";
            ctx.textAlign = "center";

            ctx.fillText(
                "PAUSED",
                width / 2,
                height / 2
            );

            return;
        }

        // Bomb animation
        if (bombAnimation) {
            drawBombAnimation();
            updateBombAnimation();

            animationId = requestAnimationFrame(animate);
            return;
        }

        // Normal game movement
        updatePaddle();
        updateBall();

        if (!gameOver) {
            checkPaddleCollision();
            checkBrickCollision();
            checkWin();
        }

        if (!gameOver && !gameWon) {
            animationId = requestAnimationFrame(animate);
        } else {
            draw();

            if (gameOver) {
                drawGameOver();
            }

            if (gameWon) {
                drawWinScreen();
            }
        }
    }

    animationId = requestAnimationFrame(animate);
}


// ==================================
// 25. START GAME
// ==================================

createBricks();
initBall();
gameLoop();
