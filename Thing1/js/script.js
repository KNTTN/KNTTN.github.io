import * as utils from './utils.js';

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');

const img = new Image();
img.src = '/Thing1/Assets/KFCat.png';

let angle = 0;
let spins = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function draw() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    ctx.fillStyle = 'black';
    ctx.font = '36px Times New Roman';
    ctx.textAlign = 'center';
    ctx.fillText(`L Bozo -`, -100, -250);

    ctx.restore();
    ctx.fillStyle = 'black';
    ctx.font = '36px Times New Roman';
    ctx.textAlign = 'center';
    ctx.fillText(`Kostya's Fried Cat has spun ${spins} times!`, canvas.width / 2, canvas.height / 2 - 400);
    
}

function tick() {
    // Update
    angle += 0.015;
    spins = Math.floor(angle / (2 * Math.PI)); // Calculate spins as a fraction of a full rotation
    
    // Render the frame
    draw();
    // Schedule next frame
    requestAnimationFrame(tick);
}

img.onload = function() {
    tick();
};