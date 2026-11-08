
// ==================================
// 1. SELECT CANVAS
// ==================================

let canvas = document.querySelector("#canvas");
let ctx = canvas.getContext("2d");

let width = canvas.width;
let height = canvas.height;


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

let score = 0;
let lives = 3;

let gameOver = false;
let gameWon = false; // FIXED: flase -> false

let isPaused = false;

let ballSpeed = 5;


// ==================================
// 3. BALL SETTINGS
// ==================================

let ballPosition;
let xSpeed;
let ySpeed;

function initBall() {

    ballPosition = {
        x: width / 2,
        y: height - 50
    };

    // CHANGED: Speed controlled by slider
    xSpeed = ballSpeed * 0.6;
    ySpeed = -ballSpeed * 0.8;
}


// ==================================
// 4. PADDLE SETTINGS
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
// 5. CREATE BRICKS
// ==================================

let bricks = [];

function createBricks() {

    bricks = [];

    for (let row = 0; row < BRICK_ROWS; row++) {

        for (let col = 0; col < BRICK_COLUMNS; col++) {

            bricks.push({
                x: 15 + col * (BRICK_WIDTH + BRICK_GAP),
                y: 40 + row * (BRICK_HEIGHT + BRICK_GAP),
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                color: [
                    "#ff5252",
                    "#ff9800",
                    "#ffeb3b",
                    "#4caf50",
                    "#2196f3"
                ][row],
                destroyed: false
            });

        }
    }
}


// ==================================
// 6. DRAW BALL
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
// 7. DRAW PADDLE
// ==================================

function drawPaddle() {

    ctx.fillStyle = "#00e5ff";

    ctx.fillRect(
        paddle.x,
        paddle.y,
        paddle.width,
        paddle.height
    );
}


// ==================================
// 8. DRAW BRICKS
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
// 9. DRAW SCORE AND LIVES
// ==================================

function drawScore() {

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.textAlign = "left";

    ctx.fillText("Score: " + score, 15, 25);

    ctx.textAlign = "right";

    ctx.fillText("Lives: " + lives, width - 15, 25);

}


// ==================================
// 10. DRAW EVERYTHING
// ==================================

function draw() {

    ctx.clearRect(0, 0, width, height);

    drawBall();
    drawPaddle();
    drawBricks();
    drawScore();

}


// ==================================
// 11. MOVE PADDLE
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
// 12. MOVE BALL
// ==================================

function updateBall() {

    ballPosition.x += xSpeed;
    ballPosition.y += ySpeed;

    if (
        ballPosition.x - BALL_SIZE / 2 < 0 ||
        ballPosition.x + BALL_SIZE / 2 > width
    ) {
        xSpeed = -xSpeed;
    }

    if (ballPosition.y - BALL_SIZE / 2 < 0) {
        ySpeed = -ySpeed;
    }

    if (ballPosition.y - BALL_SIZE / 2 > height) {

        lives--;

        if (lives <= 0) {
            gameOver = true;
        } else {
            initBall();
        }

    }

}


// ==================================
// 13. PADDLE COLLISION
// ==================================

function checkPaddleCollision() {

    let ballBottom =
        ballPosition.y + BALL_SIZE / 2;

    let ballLeft =
        ballPosition.x - BALL_SIZE / 2;

    let ballRight =
        ballPosition.x + BALL_SIZE / 2;

    if (
        ySpeed > 0 &&
        ballBottom >= paddle.y &&
        ballBottom <= paddle.y + paddle.height &&
        ballRight >= paddle.x &&
        ballLeft <= paddle.x + paddle.width
    ) {

        ySpeed = -Math.abs(ySpeed);

        let hitPosition =
            (ballPosition.x - (paddle.x + paddle.width / 2))
            / (paddle.width / 2);

        xSpeed = hitPosition * ballSpeed;

        ballPosition.y =
            paddle.y - BALL_SIZE / 2;

    }

}


// ==================================
// 14. BRICK COLLISION
// ==================================

function checkBrickCollision() {

    bricks.forEach(brick => {

        if (brick.destroyed) {
            return;
        }

        let ballLeft =
            ballPosition.x - BALL_SIZE / 2;

        let ballRight =
            ballPosition.x + BALL_SIZE / 2;

        let ballTop =
            ballPosition.y - BALL_SIZE / 2;

        let ballBottom =
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
// 15. CHECK WIN CONDITION
// ==================================

function checkWin() {

    let remainingBricks = bricks.filter(
        brick => !brick.destroyed
    );

    if (remainingBricks.length === 0) {
        gameWon = true;
    }

}


// ==================================
// 16. KEYBOARD CONTROLS
// ==================================


// ==================================
// 16. KEYBOARD CONTROLS
// ==================================

document.addEventListener("keydown", event => {

    // LEFT ARROW: Move paddle left
    if (event.key === "ArrowLeft") {
        moveLeft = true;
    }

    // RIGHT ARROW: Move paddle right
    if (event.key === "ArrowRight") {
        moveRight = true;
    }

    // CHANGED: SPACEBAR - Pause / Play
    if (event.code === "Space") {

        event.preventDefault();

        // Prevent repeated toggles when holding space
        if (!event.repeat) {
            pauseButton.click();
        }
    }

    // CHANGED: ENTER / RETURN - Restart game
    if (event.key === "Enter") {

        event.preventDefault();

        // Restart the game
        restartGame();
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
// 17. BALL SPEED SLIDER
// ==================================

let speedSlider = document.querySelector("#ballSpeed");
let speedValue = document.querySelector("#speedValue");

// CHANGED: Keep the ball's direction while changing speed
speedSlider.addEventListener("input", () => {

    ballSpeed = Number(speedSlider.value);

    speedValue.textContent = ballSpeed;

    let currentSpeed = Math.hypot(xSpeed, ySpeed);

    if (currentSpeed > 0) {

        let directionX = xSpeed / currentSpeed;
        let directionY = ySpeed / currentSpeed;

        xSpeed = directionX * ballSpeed;
        ySpeed = directionY * ballSpeed;

    }

});


// ==================================
// 18. GAME OVER SCREEN
// ==================================

function drawGameOver() {

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "red";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";

    ctx.fillText("GAME OVER", width / 2, height / 2);

    ctx.font = "20px Arial";
    ctx.fillStyle = "white";

    ctx.fillText(
        "Final Score: " + score,
        width / 2,
        height / 2 + 40
    );

}


// ==================================
// 19. WIN SCREEN
// ==================================

function drawWinScreen() {

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#00ff00";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";

    ctx.fillText("YOU WIN!", width / 2, height / 2);

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";

    ctx.fillText(
        "Final Score: " + score,
        width / 2,
        height / 2 + 40
    );

}


// ==================================
// 20. PAUSE / PLAY BUTTON
// ==================================

let pauseButton = document.querySelector("#pause");

pauseButton.addEventListener("click", () => {

    if (gameOver || gameWon) return;

    isPaused = !isPaused;

    pauseButton.textContent =
        isPaused ? "Play" : "Pause";

    // CHANGED: Resume the animation loop
    if (!isPaused) {
        gameLoop();
    }

});


// ==================================
// 21. RESTART GAME
// ==================================

function restartGame() {

    score = 0;
    lives = 3;

    gameOver = false;
    gameWon = false;

    // CHANGED: Reset pause state
    isPaused = false;
    pauseButton.textContent = "Pause";

    paddle.x = width / 2 - PADDLE_WIDTH / 2;

    moveLeft = false;
    moveRight = false;

    createBricks();
    initBall();

    gameLoop();

}

document.querySelector("#restart").addEventListener(
    "click",
    restartGame
);


// ==================================
// 22. MAIN GAME LOOP
// ==================================

// CHANGED: Prevent multiple animation loops
let animationId = null;

function gameLoop() {

    if (animationId !== null) {
        return;
    }

    function animate() {

        animationId = null;

        draw();

        if (gameOver) {
            drawGameOver();
            return;
        }

        if (gameWon) {
            drawWinScreen();
            return;
        }

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

        updatePaddle();
        updateBall();

        checkPaddleCollision();
        checkBrickCollision();
        checkWin();

        if (!gameOver && !gameWon) {
            animationId = requestAnimationFrame(animate);
        } else {
            draw();

            if (gameOver) drawGameOver();
            if (gameWon) drawWinScreen();
        }

    }

    animationId = requestAnimationFrame(animate);

}


// ==================================
// 23. START GAME
// ==================================

createBricks();
initBall();
gameLoop();
