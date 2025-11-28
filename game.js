console.log("Welcome to TheSky!");

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

function gameLoop() {
    // Clear the canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Draw a test rectangle
    ctx.fillStyle = 'white';
    ctx.fillRect(50, 50, 100, 100);

    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
