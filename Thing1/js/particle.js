import * as utils from './utils.js';

const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
const numParticles = 15;
const images = [];
const imagePaths = [
    './Assets/gato.jpg',          
    './Assets/Drinking\ Cat.jpg', 
    './Assets/Zen\ Cat.jpg'        
];

// Add these variables at the top with other declarations
let mouseX = 0;
let mouseY = 0;

// Add mouse move event listener after resizeCanvas()
canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

let currentImageIndex = 0;
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function loadImages() {
    let loadedCount = 0;
    console.log('Starting to load images...');
    imagePaths.forEach((path, index) => {
        const img = new Image();
        console.log(`Attempting to load: ${path}`);
        img.src = path;
        img.onload = () => {
            console.log(`Successfully loaded: ${path}`);
            images[index] = img;
            loadedCount++;
            if (loadedCount === imagePaths.length) {
                console.log('All images loaded, initializing particles');
                initParticles();
                tick();
            }
        };
        img.onerror = (err) => {
            console.error(`Failed to load image: ${path}`, err);
        };
    });
}

function initParticles() {
    particles = [];
    for (let i = 0; i < numParticles; i++) {
        particles.push(createParticle());
    }
}

// Modify the createParticle function
function createParticle() {
    return {
        x: mouseX,
        y: mouseY,
        vx: (Math.random() - 0.5) * 3, // Increased speed a bit
        vy: (Math.random() - 0.5) * 3,
        opacity: Math.random() * 0.5 + 0.5, // Random opacity between 0.5 and 1
        size: Math.random() * 20 + 25, // Random size between 25 and 45
        img: images[currentImageIndex % images.length]
    };
}


let frameCount = 0;

function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update particle positions
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        p.opacity = Math.max(0, Math.min(1, p.opacity - 0.03)); // Fade out over time
        p.size = Math.max(10, p.size - 0.1); // Gradually reduce size

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.drawImage(p.img, p.x, p.y, p.size, p.size);
        ctx.restore();
    });

    frameCount++;
    if (frameCount % 3 === 0) {
        // Add a new particle
        particles.push(createParticle());
        // Remove the oldest particle if there are more than 0
        if (particles.length > 0) {
            particles.shift();
        }
        // Cycle image index
        currentImageIndex = (currentImageIndex + 1) % images.length;
    }

    requestAnimationFrame(tick);
}

loadImages();