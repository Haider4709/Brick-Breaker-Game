
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
let gameWon = false;


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

    xSpeed = 3;
    ySpeed = -4;
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

    // Keep paddle inside canvas

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

    // Left and right wall collision

    if (
        ballPosition.x - BALL_SIZE / 2 < 0 ||
        ballPosition.x + BALL_SIZE / 2 > width
    ) {
        xSpeed = -xSpeed;
    }

    // Top wall collision

    if (ballPosition.y - BALL_SIZE / 2 < 0) {
        ySpeed = -ySpeed;
    }

    // Bottom wall collision

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

        // Reverse vertical direction

        ySpeed = -Math.abs(ySpeed);

        // Change horizontal direction
        // depending on where ball hits paddle

        let hitPosition =
            (ballPosition.x - (paddle.x + paddle.width / 2))
            / (paddle.width / 2);

        xSpeed = hitPosition * 5;

        // Prevent ball from sticking to paddle

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

            // Bounce ball

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

document.addEventListener("keydown", event => {

    if (event.key === "ArrowLeft") {
        moveLeft = true;
    }

    if (event.key === "ArrowRight") {
        moveRight = true;
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
// 17. GAME OVER SCREEN
// ==================================

function drawGameOver() {

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";

    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "red";

    ctx.font = "40px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        "GAME OVER",
        width / 2,
        height / 2
    );

    ctx.font = "20px Arial";

    ctx.fillStyle = "white";

    ctx.fillText(
        "Final Score: " + score,
        width / 2,
        height / 2 + 40
    );

}


// ==================================
// 18. WIN SCREEN
// ==================================

function drawWinScreen() {

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";

    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#00ff00";

    ctx.font = "40px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        "YOU WIN!",
        width / 2,
        height / 2
    );

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";

    ctx.fillText(
        "Final Score: " + score,
        width / 2,
        height / 2 + 40
    );

}


// ==================================
// 19. MAIN GAME LOOP
// ==================================

function gameLoop() {

    draw();

    if (gameOver) {
        drawGameOver();
        return;
    }

    if (gameWon) {
        drawWinScreen();
        return;
    }

    updatePaddle();

    updateBall();

    checkPaddleCollision();

    checkBrickCollision();

    checkWin();

    requestAnimationFrame(gameLoop);

}


// ==================================
// 20. RESTART GAME
// ==================================

function restartGame() {

    score = 0;
    lives = 3;

    gameOver = false;
    gameWon = false;

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
// 21. START GAME
// ==================================

createBricks();

initBall();

gameLoop();
