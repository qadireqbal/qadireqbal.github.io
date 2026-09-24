// Core Setup
const canvas = document.getElementById('ship-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// UI Element References
const hudLayer = document.getElementById('hud-layer');
const startOverlay = document.getElementById('ship-overlay');
const winOverlay = document.getElementById('ship-win-overlay');
const lossOverlay = document.getElementById('ship-loss-overlay');
const playerHpBar = document.getElementById('player-hp-bar');
const enemyHpBar = document.getElementById('enemy-hp-bar');
const playerHpText = document.getElementById('player-hp-text');
const enemyHpText = document.getElementById('enemy-hp-text');

// Internal Game Resolution for High-Density Pixel Art
const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;

// Virtual Screen Offscreen Canvas for crisp pixel scaling
const vCanvas = document.createElement('canvas');
vCanvas.width = GAME_WIDTH;
vCanvas.height = GAME_HEIGHT;
const vCtx = vCanvas.getContext('2d');
vCtx.imageSmoothingEnabled = false;

// Game State Variables
let gameState = 'START'; // 'START', 'PLAYING', 'WIN', 'GAMEOVER'
let keys = {};
let touchPos = null;
let screenShakeTime = 0;
let screenShakeIntensity = 0;

// Entities Arrays
let particles = [];
let playerLasers = [];
let enemyLasers = [];
let stars = [];
let nebulaBlobs = [];

// Offscreen Pixel Art Sprite Generators
// Player Shuttle Matrix (32 x 18 pixels) - Detailed Shuttle with White Hull, Cockpit, Delta Wings, Flag Accent
const PLAYER_SPRITE_CANVAS = document.createElement('canvas');
PLAYER_SPRITE_CANVAS.width = 32;
PLAYER_SPRITE_CANVAS.height = 18;
const pCtx = PLAYER_SPRITE_CANVAS.getContext('2d');

function generatePlayerSprite() {
    pCtx.clearRect(0, 0, 32, 18);
    const p = pCtx;

    // Colors
    const WHITE_HIGH = '#FFFFFF';
    const WHITE_MAIN = '#E2E8F0';
    const WHITE_SHADOW = '#94A3B8';
    const DARK_HEAT = '#1E293B';
    const COCKPIT = '#38BDF8';
    const COCKPIT_GLOW = '#7DD3FC';
    const ACCENT_RED = '#EF4444';
    const ACCENT_BLUE = '#3B82F6';
    const NOZZLE = '#475569';

    // Draw Dark Heat Shield Belly
    p.fillStyle = DARK_HEAT;
    p.fillRect(4, 12, 22, 3);
    p.fillRect(10, 15, 12, 2);

    // Lower Delta Wing
    p.fillStyle = WHITE_SHADOW;
    p.fillRect(6, 11, 18, 2);
    p.fillRect(10, 13, 12, 2);

    // Main White Body Hull
    p.fillStyle = WHITE_MAIN;
    p.fillRect(2, 7, 26, 4);
    p.fillRect(6, 5, 20, 2);

    // Upper Nose & Top Curve
    p.fillStyle = WHITE_HIGH;
    p.fillRect(12, 4, 14, 2);
    p.fillRect(22, 6, 6, 2);
    p.fillRect(28, 8, 3, 2); // Nose Tip

    // Dark Nose Cone Tip
    p.fillStyle = DARK_HEAT;
    p.fillRect(30, 8, 2, 2);

    // Vertical Tail Fin / Stabilizer
    p.fillStyle = WHITE_SHADOW;
    p.fillRect(2, 3, 6, 4);
    p.fillStyle = WHITE_HIGH;
    p.fillRect(1, 1, 4, 3);
    p.fillRect(0, 0, 3, 2);

    // Cockpit Canopy (Blue Specular Tint)
    p.fillStyle = COCKPIT;
    p.fillRect(22, 5, 5, 2);
    p.fillRect(25, 6, 3, 1);
    p.fillStyle = COCKPIT_GLOW;
    p.fillRect(23, 5, 2, 1);

    // Wing Markings / Flag Accent
    p.fillStyle = ACCENT_RED;
    p.fillRect(14, 8, 3, 1);
    p.fillStyle = ACCENT_BLUE;
    p.fillRect(17, 8, 3, 1);

    // Engine Nozzles at Rear
    p.fillStyle = NOZZLE;
    p.fillRect(0, 6, 2, 3);
    p.fillRect(0, 10, 2, 3);
}
generatePlayerSprite();

// Enemy Dreadnought Shuttle Matrix (32 x 20 pixels) - Dark Crimson Sleek Stealth Ship
const ENEMY_SPRITE_CANVAS = document.createElement('canvas');
ENEMY_SPRITE_CANVAS.width = 32;
ENEMY_SPRITE_CANVAS.height = 20;
const eCtx = ENEMY_SPRITE_CANVAS.getContext('2d');

function generateEnemySprite() {
    eCtx.clearRect(0, 0, 32, 20);
    const e = eCtx;

    const METAL_HIGH = '#64748B';
    const METAL_MAIN = '#334155';
    const METAL_DARK = '#0F172A';
    const CRIMSON = '#E11D48';
    const CRIMSON_GLOW = '#FB7185';
    const EYE_RED = '#FF0055';

    // Swept Forward Stealth Delta Wings
    e.fillStyle = METAL_DARK;
    e.fillRect(12, 1, 18, 3);
    e.fillRect(12, 16, 18, 3);

    // Main Armor Plates
    e.fillStyle = METAL_MAIN;
    e.fillRect(6, 4, 22, 12);
    e.fillRect(2, 6, 26, 8);

    // Top Highlights
    e.fillStyle = METAL_HIGH;
    e.fillRect(10, 5, 14, 2);
    e.fillRect(8, 13, 14, 2);

    // Crimson Weapon Strips
    e.fillStyle = CRIMSON;
    e.fillRect(14, 3, 12, 1);
    e.fillRect(14, 16, 12, 1);
    e.fillRect(4, 8, 10, 4);

    // Ominous Front Sensor / Red Canopy (Facing Left)
    e.fillStyle = EYE_RED;
    e.fillRect(2, 8, 4, 4);
    e.fillStyle = CRIMSON_GLOW;
    e.fillRect(3, 9, 2, 2);

    // Engine Thruster Outlets
    e.fillStyle = METAL_DARK;
    e.fillRect(29, 6, 3, 3);
    e.fillRect(29, 11, 3, 3);
}
generateEnemySprite();

// Player Object
let player = {
    x: 80,
    y: GAME_HEIGHT / 2 - 10,
    w: 32,
    h: 18,
    vx: 0,
    vy: 0,
    speed: 3.5,
    friction: 0.88,
    rotation: 0,
    hp: 100,
    maxHp: 100,
    fireTimer: 0,
    fireRate: 8 // Frames per shot
};

// Enemy AI Object
let enemy = {
    x: GAME_WIDTH - 120,
    y: GAME_HEIGHT / 2 - 10,
    w: 32,
    h: 20,
    vx: 0,
    vy: 0,
    speed: 3.65,
    friction: 0.90,
    rotation: 0,
    hp: 100,
    maxHp: 100,
    fireTimer: 0,
    fireRate: 13,
    // AI State Machine
    aiState: 'ENGAGE', // 'ENGAGE', 'STRAFE', 'EVADE', 'FLANK'
    aiTimer: 0,
    aiDuration: 74,
    targetY: GAME_HEIGHT / 2,
    strafeDir: 1,
    maneuverTimer: 0,
    maneuverX: 0,
    maneuverY: 0,
};

// Initialize Parallax Starfield & Nebulae
function initBackground() {
    stars = [];
    for (let i = 0; i < 90; i++) {
        stars.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            size: Math.random() > 0.8 ? 2 : 1,
            speed: Math.random() * 1.5 + 0.3,
            color: Math.random() > 0.5 ? '#ffffff' : (Math.random() > 0.5 ? '#38bdf8' : '#cbd5e1')
        });
    }

    nebulaBlobs = [
        { x: 100, y: 80, r: 120, color: 'rgba(14, 165, 233, 0.05)' },
        { x: 500, y: 280, r: 150, color: 'rgba(225, 29, 72, 0.04)' },
        { x: 320, y: 180, r: 100, color: 'rgba(168, 85, 247, 0.04)' }
    ];
}

// Input Event Listeners
window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;
    if (gameState !== 'PLAYING' && ['Enter', ' '].includes(e.key)) triggerInteraction();
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
});

// Touch & Click Event Handlers
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('pointerdown', (e) => { if (gameState !== 'PLAYING') triggerInteraction(); else updateTouchPos(e); });
canvas.addEventListener('pointermove', (e) => { if (gameState === 'PLAYING' && e.buttons) updateTouchPos(e); });
canvas.addEventListener('pointerup', () => { touchPos = null; });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', () => { touchPos = null; });

function handleTouchStart(e) {
    e.preventDefault();
    if (gameState !== 'PLAYING') {
        triggerInteraction();
        return;
    }
    updateTouchPos(e.touches[0]);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (gameState === 'PLAYING' && e.touches.length > 0) {
        updateTouchPos(e.touches[0]);
    }
}

function updateTouchPos(touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    touchPos = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
    };
}

// Global Click Trigger for Overlay Buttons
[startOverlay, winOverlay, lossOverlay].forEach(el => {
    el.addEventListener('click', event => {
        if (event.target.closest('.flight-start')) triggerInteraction();
    });
});

document.getElementById('ship-reset').addEventListener('click', () => {
    resetGame();
    gameState = 'PLAYING';
    touchPos = null;

    startOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    lossOverlay.classList.add('hidden');
    hudLayer.classList.remove('hidden');
});

function triggerInteraction() {
    if (gameState === 'START' || gameState === 'WIN' || gameState === 'GAMEOVER') {
        resetGame();
        gameState = 'PLAYING';
        startOverlay.classList.add('hidden');
        winOverlay.classList.add('hidden');
        lossOverlay.classList.add('hidden');
        hudLayer.classList.remove('hidden');
    }
}

function resetGame() {
    player.x = 80;
    player.y = GAME_HEIGHT / 2 - 9;
    player.vx = 0;
    player.vy = 0;
    player.hp = 100;
    player.rotation = 0;

    enemy.x = GAME_WIDTH - 120;
    enemy.y = GAME_HEIGHT / 2 - 10;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.hp = 100;
    enemy.rotation = 0;
    enemy.aiState = 'ENGAGE';
    enemy.aiTimer = 0;
    enemy.aiDuration = 50 + Math.floor(Math.random() * 45);
    enemy.strafeDir = Math.random() > 0.5 ? 1 : -1;
    enemy.maneuverTimer = 0;
    enemy.maneuverX = 0;
    enemy.maneuverY = 0;

    playerLasers = [];
    enemyLasers = [];
    particles = [];
    updateHUD();
}

function updateHUD() {
    playerHpBar.style.width = `${Math.max(0, player.hp)}%`;
    enemyHpBar.style.width = `${Math.max(0, enemy.hp)}%`;
    playerHpText.textContent = `${Math.ceil(player.hp)}%`;
    enemyHpText.textContent = `${Math.ceil(enemy.hp)}%`;
}

function addScreenShake(intensity, duration) {
    screenShakeIntensity = intensity;
    screenShakeTime = duration;
}

// Spawn Dynamic Pixel Particle
function spawnParticle(x, y, vx, vy, color, size, life) {
    particles.push({
        x, y, vx, vy, color, size, life, maxLife: life
    });
}

// Thruster Particle Emitter
function createThrusterFlame(ship, isEnemy = false) {
    const angle = ship.rotation;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Offset to engine nozzles
    const offsetX = isEnemy ? ship.w / 2 : -ship.w / 2;
    const startX = ship.x + ship.w / 2 + offsetX * cos;
    const startY = ship.y + ship.h / 2 + offsetX * sin;

    const spread = (Math.random() - 0.5) * 1.2;
    const speed = (Math.random() * 2 + 2) * (isEnemy ? 1 : -1);

    const color = isEnemy ? 
        (Math.random() > 0.4 ? '#ff0055' : '#ffaa00') : 
        (Math.random() > 0.4 ? '#00f0ff' : '#38bdf8');

    spawnParticle(
        startX, 
        startY + (Math.random() - 0.5) * 6, 
        -cos * speed + (isEnemy ? spread : -spread), 
        sin + spread, 
        color, 
        Math.random() > 0.5 ? 2 : 3, 
        Math.floor(Math.random() * 10 + 8)
    );
}

// Explosion Particle Cluster
function createExplosion(x, y, count = 30) {
    addScreenShake(6, 18);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        const colors = ['#ffffff', '#00f0ff', '#ff0055', '#ffcc00', '#94a3b8'];
        spawnParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            colors[Math.floor(Math.random() * colors.length)],
            Math.floor(Math.random() * 3 + 2),
            Math.floor(Math.random() * 25 + 15)
        );
    }
}

// AI Behavior Update Engine
function updateEnemyAI() {
    enemy.aiTimer++;

    // Change combat patterns at uneven intervals so the enemy is less predictable.
    if (enemy.aiTimer >= enemy.aiDuration) {
        enemy.aiTimer = 0;
        const states = ['ENGAGE', 'STRAFE', 'EVADE', 'FLANK'];
        enemy.aiState = states[Math.floor(Math.random() * states.length)];
        enemy.strafeDir = Math.random() > 0.5 ? 1 : -1;
        enemy.aiDuration = 42 + Math.floor(Math.random() * 48);
    }

    // Make small course corrections instead of following perfectly straight paths.
    enemy.maneuverTimer--;
    if (enemy.maneuverTimer <= 0) {
        enemy.maneuverTimer = 18 + Math.floor(Math.random() * 31);
        enemy.maneuverX = (Math.random() - 0.5) * 34;
        enemy.maneuverY = (Math.random() - 0.5) * 56;
    }

    let targetX = enemy.x;
    let targetY = enemy.y;

    // Behavior Logic Matrix
    if (enemy.aiState === 'ENGAGE') {
        // Keep optimal combat range (~220px horizontal distance)
        targetX = player.x + 220;
        targetY = player.y + player.vy * 2;
    } else if (enemy.aiState === 'STRAFE') {
        targetX = player.x + 180;
        targetY = enemy.y + enemy.strafeDir * 80;
        if (targetY < 30 || targetY > GAME_HEIGHT - 50) {
            enemy.strafeDir *= -1;
        }
    } else if (enemy.aiState === 'EVADE') {
        // Move away vertically and pull back horizontally
        targetX = GAME_WIDTH - 80;
        targetY = player.y > GAME_HEIGHT / 2 ? 50 : GAME_HEIGHT - 70;
    } else if (enemy.aiState === 'FLANK') {
        // Swoop from top or bottom
        targetX = player.x + 120;
        targetY = player.y + (enemy.strafeDir * 110);
    }

    targetX += enemy.maneuverX;
    targetY += enemy.maneuverY;

    // Dodge player shots that are close and on a collision course.
    const incomingShot = playerLasers.some(laser =>
        laser.x < enemy.x + 140 &&
        laser.x > enemy.x - 12 &&
        laser.y < enemy.y + enemy.h + 10 &&
        laser.y + laser.h > enemy.y - 10
    );
    if (incomingShot) {
        targetY += enemy.y < GAME_HEIGHT / 2 ? 72 : -72;
    }

    // Smooth Acceleration toward Target Point
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;

    if (Math.abs(dx) > 5) enemy.vx += Math.sign(dx) * 0.28;
    if (Math.abs(dy) > 5) enemy.vy += Math.sign(dy) * 0.28;

    // Apply Velocity & Friction
    enemy.vx = Math.max(-enemy.speed, Math.min(enemy.speed, enemy.vx * enemy.friction));
    enemy.vy = Math.max(-enemy.speed, Math.min(enemy.speed, enemy.vy * enemy.friction));

    enemy.x += enemy.vx;
    enemy.y += enemy.vy;

    // Keep within arena bounds
    enemy.x = Math.max(GAME_WIDTH / 2, Math.min(GAME_WIDTH - 40, enemy.x));
    enemy.y = Math.max(20, Math.min(GAME_HEIGHT - 40, enemy.y));

    // Smooth Pitch Rotation based on vertical movement
    enemy.rotation = enemy.vy * 0.08;

    // Thruster particle trails
    if (Math.random() > 0.2) createThrusterFlame(enemy, true);

    // Aim ahead of the player's current position when firing paired shots.
    enemy.fireTimer++;
    if (enemy.fireTimer >= enemy.fireRate) {
        enemy.fireTimer = 0;
        const shotSpeedX = -7.5;
        const muzzlePositions = [enemy.y + 3, enemy.y + enemy.h - 5];
        const travelFrames = Math.max(1, (enemy.x - player.x) / Math.abs(shotSpeedX));
        const predictionFrames = Math.min(18, travelFrames * 0.72);
        const aimY = Math.max(
            22,
            Math.min(
                GAME_HEIGHT - 22,
                player.y + player.h / 2 + player.vy * predictionFrames
            )
        );

        muzzlePositions.forEach((muzzleY, index) => {
            const spread = index === 0 ? -5 : 5;
            const shotSpeedY = Math.max(
                -4.2,
                Math.min(4.2, (aimY + spread - muzzleY) / travelFrames)
            );

            enemyLasers.push({
                x: enemy.x - 4,
                y: muzzleY,
                vx: shotSpeedX,
                vy: shotSpeedY,
                w: 10,
                h: 3
            });
        });
    }
}

// Main Update Loop
function update() {
    // Update Background Parallax Stars
    stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = GAME_WIDTH;
            star.y = Math.random() * GAME_HEIGHT;
        }
    });

    if (gameState !== 'PLAYING') return;

    // Player Controller Input
    let moveX = 0;
    let moveY = 0;

    if (keys['w'] || keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
    if (keys['s'] || keys['KeyS'] || keys['ArrowDown']) moveY += 1;
    if (keys['a'] || keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['d'] || keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    // Touch Screen Control Override
    if (touchPos) {
        const pdx = touchPos.x - (player.x + player.w / 2);
        const pdy = touchPos.y - (player.y + player.h / 2);
        if (Math.abs(pdx) > 10) moveX = Math.sign(pdx);
        if (Math.abs(pdy) > 10) moveY = Math.sign(pdy);
    }

    // Normalize diagonal movement speed
    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
    }

    player.vx += moveX * player.speed * 0.3;
    player.vy += moveY * player.speed * 0.3;

    // Apply Friction
    player.vx *= player.friction;
    player.vy *= player.friction;

    // Update Position
    player.x += player.vx;
    player.y += player.vy;

    // Clamp Player to Screen Bounds
    player.x = Math.max(10, Math.min(GAME_WIDTH - 50, player.x));
    player.y = Math.max(15, Math.min(GAME_HEIGHT - 35, player.y));

    // Smooth Pitch Rotation
    player.rotation = player.vy * 0.08;

    // Spawn Thruster Flame Trails
    if (Math.abs(player.vx) > 0.2 || Math.abs(player.vy) > 0.2 || Math.random() > 0.4) {
        createThrusterFlame(player, false);
    }

    // Player Auto Firing
    player.fireTimer++;
    if (player.fireTimer >= player.fireRate) {
        player.fireTimer = 0;
        // Dual Pulse Laser Cannon
        playerLasers.push({
            x: player.x + player.w,
            y: player.y + 4,
            vx: 9,
            vy: player.vy * 0.15,
            w: 12,
            h: 3
        });
        playerLasers.push({
            x: player.x + player.w,
            y: player.y + player.h - 6,
            vx: 9,
            vy: player.vy * 0.15,
            w: 12,
            h: 3
        });
    }

    // Update Enemy AI Logic
    updateEnemyAI();

    // Process Player Lasers
    for (let i = playerLasers.length - 1; i >= 0; i--) {
        const l = playerLasers[i];
        l.x += l.vx;
        l.y += l.vy;

        // Collision with Enemy Shuttle
        if (l.x < enemy.x + enemy.w &&
            l.x + l.w > enemy.x &&
            l.y < enemy.y + enemy.h &&
            l.y + l.h > enemy.y) {
            
            enemy.hp -= 3.5;
            addScreenShake(2, 6);
            
            // Spark Particles
            for (let p = 0; p < 4; p++) {
                spawnParticle(l.x, l.y, Math.random() * 3, (Math.random() - 0.5) * 4, '#00f0ff', 2, 10);
            }

            playerLasers.splice(i, 1);
            updateHUD();

            if (enemy.hp <= 0) {
                enemy.hp = 0;
                createExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 60);
                gameState = 'WIN';
                setTimeout(() => {
                    hudLayer.classList.add('hidden');
                    winOverlay.classList.remove('hidden');
                }, 600);
            }
            continue;
        }

        // Remove out of bounds
        if (l.x > GAME_WIDTH + 20) {
            playerLasers.splice(i, 1);
        }
    }

    // Process Enemy Lasers
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        const l = enemyLasers[i];
        l.x += l.vx;
        l.y += l.vy;

        // Collision with Player Shuttle
        if (l.x < player.x + player.w &&
            l.x + l.w > player.x &&
            l.y < player.y + player.h &&
            l.y + l.h > player.y) {
            
            player.hp -= 5;
            addScreenShake(4, 10);

            // Impact Sparks
            for (let p = 0; p < 5; p++) {
                spawnParticle(l.x, l.y, -Math.random() * 3, (Math.random() - 0.5) * 4, '#ff0055', 2, 10);
            }

            enemyLasers.splice(i, 1);
            updateHUD();

            if (player.hp <= 0) {
                player.hp = 0;
                createExplosion(player.x + player.w / 2, player.y + player.h / 2, 60);
                gameState = 'GAMEOVER';
                setTimeout(() => {
                    hudLayer.classList.add('hidden');
                    lossOverlay.classList.remove('hidden');
                }, 600);
            }
            continue;
        }

        // Remove out of bounds
        if (l.x < -20) {
            enemyLasers.splice(i, 1);
        }
    }

    // Update Particle FX
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Screen Shake Decay
    if (screenShakeTime > 0) {
        screenShakeTime--;
    }
}

// Canvas Rendering System
function render() {
    // Clear Virtual Context
    // Keep the fight canvas transparent so the site-wide nebula and stars show through.
    vCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw Nebula Background Glows
    nebulaBlobs.forEach(b => {
        const grad = vCtx.createRadialGradient(b.x, b.y, 5, b.x, b.y, b.r);
        grad.addColorStop(0, b.color);
        grad.addColorStop(1, 'transparent');
        vCtx.fillStyle = grad;
        vCtx.beginPath();
        vCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        vCtx.fill();
    });

    // Draw Background Starfield
    stars.forEach(s => {
        vCtx.fillStyle = s.color;
        vCtx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
    });

    // Draw Particles
    particles.forEach(p => {
        vCtx.fillStyle = p.color;
        const alpha = p.life / p.maxLife;
        vCtx.globalAlpha = alpha;
        vCtx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        vCtx.globalAlpha = 1.0;
    });

    if (gameState === 'START' || gameState === 'PLAYING' || gameState === 'WIN' || gameState === 'GAMEOVER') {
        // Draw Player Shuttle with Pitch Angle
        if (player.hp > 0) {
            vCtx.save();
            vCtx.translate(Math.floor(player.x + player.w / 2), Math.floor(player.y + player.h / 2));
            vCtx.rotate(player.rotation);
            vCtx.drawImage(PLAYER_SPRITE_CANVAS, -player.w / 2, -player.h / 2);
            vCtx.restore();
        }

        // Draw Enemy Shuttle with Pitch Angle
        if (enemy.hp > 0) {
            vCtx.save();
            vCtx.translate(Math.floor(enemy.x + enemy.w / 2), Math.floor(enemy.y + enemy.h / 2));
            vCtx.rotate(enemy.rotation);
            vCtx.drawImage(ENEMY_SPRITE_CANVAS, -enemy.w / 2, -enemy.h / 2);
            vCtx.restore();
        }

        // Draw Player Lasers (Bright Cyan Pulse)
        vCtx.fillStyle = '#00f0ff';
        playerLasers.forEach(l => {
            vCtx.fillRect(Math.floor(l.x), Math.floor(l.y), l.w, l.h);
            vCtx.fillStyle = '#ffffff';
            vCtx.fillRect(Math.floor(l.x + 2), Math.floor(l.y + 1), l.w - 4, 1);
            vCtx.fillStyle = '#00f0ff';
        });

        // Draw Enemy Lasers (Crimson Crimson Pulse)
        vCtx.fillStyle = '#ff0055';
        enemyLasers.forEach(l => {
            vCtx.fillRect(Math.floor(l.x), Math.floor(l.y), l.w, l.h);
            vCtx.fillStyle = '#ffcc00';
            vCtx.fillRect(Math.floor(l.x + 2), Math.floor(l.y + 1), l.w - 4, 1);
            vCtx.fillStyle = '#ff0055';
        });
    }

    // Copy Virtual Offscreen Canvas to Display Canvas with Screen Shake
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (screenShakeTime > 0) {
        const sx = (Math.random() - 0.5) * screenShakeIntensity * (canvas.width / GAME_WIDTH);
        const sy = (Math.random() - 0.5) * screenShakeIntensity * (canvas.height / GAME_HEIGHT);
        ctx.translate(sx, sy);
    }

    ctx.drawImage(vCanvas, 0, 0, GAME_WIDTH, GAME_HEIGHT, 0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// Master Animation Loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Initialize Background & Launch Loop
initBackground();
requestAnimationFrame(gameLoop);
