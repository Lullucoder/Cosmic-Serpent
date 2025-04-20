document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameContainer = document.querySelector('.game-container'); // For screen ease
    const backgroundCanvas = document.getElementById('backgroundCanvas');
    const bgCtx = backgroundCanvas.getContext('2d');
    const gameCanvas = document.getElementById('gameCanvas');
    const ctx = gameCanvas.getContext('2d');
    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('highScore');
    const finalScoreDisplay = document.getElementById('finalScore');
    const newHighScoreMsg = document.getElementById('newHighScoreMsg');
    const comboIndicator = document.getElementById('comboIndicator');
    const comboMultiplierSpan = document.getElementById('comboMultiplier');
    const warningOverlay = document.getElementById('warningOverlay');
    const warningText = document.getElementById('warningText');
    const startScreen = document.getElementById('startScreen');
    const pauseScreen = document.getElementById('pauseScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const resumeButton = document.getElementById('resumeButton');
    const powerupIndicator = document.getElementById('powerupIndicator');
    const powerupIconSpan = document.getElementById('powerupIcon');
    const powerupNameSpan = document.getElementById('powerupName');
    const powerupTimerSpan = document.getElementById('powerupTimer');

    // Audio Elements (Get references, assuming files exist locally)
    const eatSound = document.getElementById('eatSound');
    const bonusSound = document.getElementById('bonusSound');
    const powerupSound = document.getElementById('powerupSound');
    const phaseSound = document.getElementById('phaseSound'); // New
    const warningSound = document.getElementById('warningSound'); // New
    const gameOverSound = document.getElementById('gameOverSound');
    const backgroundMusic = document.getElementById('backgroundMusic');
    if (backgroundMusic) backgroundMusic.volume = 0.25; // Lower volume

    // --- Game Constants ---
    const GRID_SIZE = 20;
    const CANVAS_WIDTH = 600;
    const CANVAS_HEIGHT = 400;
    const GRID_WIDTH = CANVAS_WIDTH / GRID_SIZE;
    const GRID_HEIGHT = CANVAS_HEIGHT / GRID_SIZE;

    // Colors & Style
    const SNAKE_HEAD_COLOR = '#ffffff';
    const SNAKE_BODY_START = '#00ffff'; // Cyan
    const SNAKE_BODY_MID = '#00aaaa';
    const SNAKE_BODY_END = '#006666'; // Darker cyan
    const FOOD_COLOR = '#ff80ff'; // Pinkish orb
    const FOOD_GLOW = '#ffc0ff';
    const BONUS_FOOD_COLOR = '#ffffaa'; // Pale Yellow
    const BONUS_FOOD_GLOW = '#ffffdd';
    const POWERUP_PHASE_COLOR = '#a0a0ff'; // Light Blue/Purple crystal
    const POWERUP_PHASE_GLOW = '#c0c0ff';
    const POWERUP_MULTI_COLOR = '#ffaa00'; // Orange crystal
    const POWERUP_MULTI_GLOW = '#ffcc66';
    const ASTEROID_COLOR = '#606070';
    const ASTEROID_GLOW = '#888899';
    const PARTICLE_COLORS = ['#ffffff', '#00ffff', '#ff80ff', '#ffffaa', '#a0a0ff', '#ffaa00'];
    const PHASE_SNAKE_COLOR = '#a0a0ff'; // Snake color during phase powerup

    // Game Settings
    const BASE_SPEED = 130; // Slightly slower start
    const SPEED_INCREMENT_FACTOR = 0.985; // Less aggressive speed increase
    const MIN_SPEED = 60;
    const BONUS_FOOD_CHANCE = 0.15;
    const BONUS_FOOD_SCORE = 5;
    const POWERUP_SPAWN_CHANCE = 0.12; // Chance to spawn *any* powerup
    const POWERUP_DURATION = 8000; // 8 seconds
    const SCORE_MULTIPLIER_VALUE = 2;
    const ASTEROID_SPAWN_SCORE_THRESHOLD = 15; // Asteroids appear after score 15
    const ASTEROID_SPAWN_INTERVAL = 10000; // Check to spawn every 10s
    const ASTEROID_MAX_COUNT = 5;
    const ASTEROID_WARNING_DURATION = 1500; // 1.5s warning
    const COMBO_TIMEOUT = 2000; // 2 seconds to continue combo
    const MAX_COMBO_MULTIPLIER = 5;

    // Directions
    const UP = { x: 0, y: -1 }; DOWN = { x: 0, y: 1 }; LEFT = { x: -1, y: 0 }; RIGHT = { x: 1, y: 0 };

    // --- Game State Variables ---
    let snake, food, bonusFood = null, powerUp = null, asteroids = [];
    let activePowerUp = null; // { type: 'phase'/'multi', endTime }
    let isPhasing = false; // Specific state for phase powerup effects
    let direction, nextDirection;
    let score, highScore;
    let currentSpeed, gameLoopTimeout = null, lastFrameTime = 0, timeAccumulator = 0;
    let isPaused = false, isGameOver = true; // Start stopped
    let particles = [];
    let stars = []; // For background
    let asteroidSpawnTimer = 0;
    let nextAsteroidPos = null; // Store upcoming asteroid position during warning
    let warningTimer = 0;
    let comboCounter = 0; // How many items eaten quickly
    let comboMultiplier = 1;
    let lastEatTime = 0;

    // --- Setup Canvases ---
    [backgroundCanvas, gameCanvas].forEach(c => {
        if (c) { c.width = CANVAS_WIDTH; c.height = CANVAS_HEIGHT; }
        else { console.error("FATAL: Canvas element missing!"); isGameOver = true; } // Stop if canvas missing
    });

    // --- Background Starfield ---
    function createStars(count) {
        stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                radius: Math.random() * 1.5 + 0.5, // Vary size
                alpha: Math.random() * 0.5 + 0.3,  // Vary brightness
                parallax: Math.random() * 0.4 + 0.1 // Depth factor (0.1=far, 0.5=near)
            });
        }
    }

    function moveAndDrawStars(deltaTime) {
        if (!bgCtx) return;
        // Clear background canvas
        bgCtx.fillStyle = '#050510'; // Base background color
        bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Subtle Nebula gradient (optional, can be intensive)
        const nebulaGrad = bgCtx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.8);
        nebulaGrad.addColorStop(0, 'rgba(40, 0, 80, 0.4)');
        nebulaGrad.addColorStop(0.5, 'rgba(0, 40, 80, 0.3)');
        nebulaGrad.addColorStop(1, 'rgba(5, 5, 16, 0)');
        bgCtx.fillStyle = nebulaGrad;
        bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);


        // Move and draw stars
        const speedFactor = isPaused ? 0 : (deltaTime || 1/60) * 15; // Slow drift speed, paused = 0
        stars.forEach(star => {
            // Move stars based on parallax depth (closer stars move faster)
            // Simple downward drift effect
            star.y += star.parallax * speedFactor;
            if (star.y > CANVAS_HEIGHT + star.radius) { // Reset star if it goes off bottom
                star.y = -star.radius;
                star.x = Math.random() * CANVAS_WIDTH;
            }

            // Draw star
            bgCtx.beginPath();
            bgCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            bgCtx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            bgCtx.fill();
        });
    }

    // --- Audio & High Score (same as before) ---
    function playSound(soundElement) { /* ... (same robust version) ... */
        if (soundElement && typeof soundElement.play === 'function') {
            if (soundElement.readyState >= 2) {
                 soundElement.currentTime = 0;
                 soundElement.play().catch(e => { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') { console.warn("Audio play failed:", e); }});
            } else { /* console.log("Audio not ready:", soundElement.src); */ } // Less verbose logging
        }
    }
    function loadHighScore() { /* ... (same robust version) ... */
        try {
             const storedScore = localStorage.getItem('cosmicSerpentHighScore'); // Use new key
             highScore = storedScore ? parseInt(storedScore, 10) : 0;
             if (isNaN(highScore)) highScore = 0;
             if(highScoreDisplay) highScoreDisplay.textContent = highScore;
        } catch (e) { console.error("LS Error:", e); highScore = 0; if(highScoreDisplay) highScoreDisplay.textContent = highScore; }
    }
    function saveHighScore() { /* ... (same robust version, use new key) ... */
         if (score > highScore) {
             highScore = score;
             try { localStorage.setItem('cosmicSerpentHighScore', highScore.toString()); } catch (e) { console.error("LS Error:", e); }
             if(highScoreDisplay) highScoreDisplay.textContent = highScore;
             if (newHighScoreMsg) newHighScoreMsg.style.display = 'block';
         } else { if (newHighScoreMsg) newHighScoreMsg.style.display = 'none'; }
    }

    // --- Helper Functions (interpolateColor, hexToRgb, getRandomGridPosition) ---
    // Same as before

    function hexToRgb(hex) { /* ... */
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) { return r + r + g + g + b + b; });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)} : null;
    }
    function interpolateColor(color1, color2, factor) { /* ... */
        const rgb1 = hexToRgb(color1); const rgb2 = hexToRgb(color2);
        if (!rgb1 || !rgb2) return color1; // Fallback
        factor = Math.max(0, Math.min(1, factor)); // Clamp factor
        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
        return `rgb(${r},${g},${b})`;
    }
     function interpolateColors(color1, color2, color3, factor) { // 3-color interpolation
        const f = Math.max(0, Math.min(1, factor));
        if (f < 0.5) { return interpolateColor(color1, color2, f * 2); }
        else { return interpolateColor(color2, color3, (f - 0.5) * 2); }
    }

    function getRandomGridPosition() { /* ... (same robust version, checks asteroids too) ... */
        let pos; let overlap; let attempts = 0; const MAX_ATTEMPTS = GRID_WIDTH * GRID_HEIGHT;
        do {
            attempts++; overlap = false;
            pos = { x: Math.floor(Math.random() * GRID_WIDTH), y: Math.floor(Math.random() * GRID_HEIGHT) };
            if (snake) { for (const segment of snake) { if (segment.x === pos.x && segment.y === pos.y) { overlap = true; break; } } }
            if (!overlap && food && food.x === pos.x && food.y === pos.y) overlap = true;
            if (!overlap && bonusFood && bonusFood.x === pos.x && bonusFood.y === pos.y) overlap = true;
            if (!overlap && powerUp && powerUp.x === pos.x && powerUp.y === pos.y) overlap = true;
            if (!overlap && asteroids) { for (const ast of asteroids) { if (ast.x === pos.x && ast.y === pos.y) { overlap = true; break; } } }
            // Also check upcoming asteroid position
            if (!overlap && nextAsteroidPos && nextAsteroidPos.x === pos.x && nextAsteroidPos.y === pos.y) overlap = true;
             if (attempts > MAX_ATTEMPTS) { console.warn("Could not find empty spot for item."); break; }
        } while (overlap);
        return pos;
    }


     // --- Particle System (Same as before) ---
    function createParticles(x, y, count = 15, baseColor = FOOD_COLOR) { /* ... */
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x * GRID_SIZE + GRID_SIZE / 2, y: y * GRID_SIZE + GRID_SIZE / 2,
                vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, // Slightly faster particles
                life: Math.random() * 0.6 + 0.4, size: Math.random() * 3 + 1.5,
                color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)] // Use palette
            });
        }
     }
    function updateParticles(deltaTime) { /* ... (same robust version) ... */
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            const dtFactor = (typeof deltaTime === 'number' && deltaTime > 0) ? deltaTime * 60 : 1;
            p.x += p.vx * dtFactor; p.y += p.vy * dtFactor;
            p.life -= (typeof deltaTime === 'number' && deltaTime > 0) ? deltaTime : (1/60);
            p.vx *= 0.97; p.vy *= 0.97; // Slightly less damping
            if (p.life <= 0) { particles.splice(i, 1); }
        }
     }
    function drawParticles() { /* ... (same robust version) ... */
        particles.forEach(p => {
            ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life * 1.8); // Brighter fade
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1.0;
     }

     // --- Drawing Functions ---

    function drawSnake() {
        if (!snake || snake.length === 0) return;
        const baseGlow = isPhasing ? PHASE_SNAKE_COLOR : SNAKE_BODY_START;

        snake.forEach((segment, index) => {
            if (typeof segment?.x !== 'number' || typeof segment?.y !== 'number') return;

            let segmentColor;
            let segmentSize = GRID_SIZE;
            let segmentAlpha = isPhasing ? 0.7 : 1.0; // Base alpha

            if (index === 0) {
                segmentColor = isPhasing ? PHASE_SNAKE_COLOR : SNAKE_HEAD_COLOR; // Head color
                segmentSize = GRID_SIZE * 1.05; // Slightly larger head
            } else {
                // Gradient along the body using 3 colors
                const ratio = snake.length > 1 ? Math.min(1, index / (snake.length - 1)) : 0;
                segmentColor = interpolateColors(SNAKE_BODY_START, SNAKE_BODY_MID, SNAKE_BODY_END, ratio);
                // Body segments shrink slightly towards the tail
                segmentSize = GRID_SIZE * (0.95 - ratio * 0.15);
                segmentAlpha *= (1.0 - ratio * 0.3); // Fade towards tail
            }

             const offset = (GRID_SIZE - segmentSize) / 2;

             ctx.globalAlpha = segmentAlpha;
             ctx.shadowColor = baseGlow;
             ctx.shadowBlur = isPhasing ? 15 : 10; // More glow when phasing
             ctx.fillStyle = segmentColor;
             // Draw rounded rects for smoother look
             ctx.beginPath();
             ctx.roundRect(segment.x * GRID_SIZE + offset, segment.y * GRID_SIZE + offset, segmentSize, segmentSize, 3); // Add rounding
             ctx.fill();
             ctx.shadowBlur = 0; // Reset shadow

             // Draw simple eye on head
             if (index === 0) {
                  ctx.globalAlpha = 1.0; // Eye is fully opaque
                  const eyeRadius = GRID_SIZE / 7;
                  const headCenterX = segment.x * GRID_SIZE + GRID_SIZE / 2;
                  const headCenterY = segment.y * GRID_SIZE + GRID_SIZE / 2;
                  ctx.fillStyle = isPhasing ? '#ddddff' : '#000000'; // Eye color changes when phasing
                  ctx.beginPath();
                  ctx.arc(headCenterX, headCenterY, eyeRadius, 0, Math.PI * 2);
                  ctx.fill();
             }
        });
        ctx.globalAlpha = 1.0; // Reset global alpha
    }

    function drawFood(item, color, glowColor, shape = 'circle') {
        if (!item || typeof item.x !== 'number' || typeof item.y !== 'number') return;

        const pulse = (Math.sin(Date.now() / 250) + 1) / 2; // Standard pulse
        const radius = GRID_SIZE / 2.5 + pulse * 2;
        const blur = 8 + pulse * 4;

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = blur;
        ctx.fillStyle = color;
        ctx.beginPath();
        if (shape === 'circle') {
             ctx.arc(item.x * GRID_SIZE + GRID_SIZE / 2, item.y * GRID_SIZE + GRID_SIZE / 2, radius, 0, Math.PI * 2);
        } else if (shape === 'crystal') { // Draw a simple diamond/crystal shape
             const centerX = item.x * GRID_SIZE + GRID_SIZE / 2;
             const centerY = item.y * GRID_SIZE + GRID_SIZE / 2;
             const size = radius * 1.4; // Make crystal slightly larger
             ctx.moveTo(centerX, centerY - size / 2); // Top point
             ctx.lineTo(centerX + size / 2, centerY); // Right point
             ctx.lineTo(centerX, centerY + size / 2); // Bottom point
             ctx.lineTo(centerX - size / 2, centerY); // Left point
             ctx.closePath();
        }
        ctx.fill();

        // Add inner highlight/glint
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(item.x * GRID_SIZE + GRID_SIZE * 0.65, item.y * GRID_SIZE + GRID_SIZE * 0.35, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }

    function drawAsteroids() {
         asteroids.forEach(ast => {
             if (typeof ast?.x !== 'number' || typeof ast?.y !== 'number') return;
             const size = GRID_SIZE * 0.9;
             const offset = (GRID_SIZE - size) / 2;

             ctx.shadowColor = ASTEROID_GLOW;
             ctx.shadowBlur = 5;
             ctx.fillStyle = ASTEROID_COLOR;
             ctx.beginPath();
             // Jagged asteroid shape approximation
             const centerX = ast.x * GRID_SIZE + GRID_SIZE / 2;
             const centerY = ast.y * GRID_SIZE + GRID_SIZE / 2;
             const points = 7; // Number of points
             const baseRadius = size / 2.2;
             ctx.moveTo(centerX + baseRadius, centerY);
             for(let i = 1; i <= points; i++) {
                 const angle = (i * 2 * Math.PI) / points;
                 const radius = baseRadius * (0.8 + Math.random() * 0.4); // Randomize radius slightly
                 ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
             }
             ctx.closePath();
             ctx.fill();
             ctx.shadowBlur = 0;
         });
    }

    // --- Spawning Functions ---
    function spawnFoodItem() { // Renamed from spawnFood
        food = getRandomGridPosition();
        bonusFood = null; // Clear old items first
        powerUp = null;
        if (Math.random() < BONUS_FOOD_CHANCE) { bonusFood = getRandomGridPosition(); }
        if (Math.random() < POWERUP_SPAWN_CHANCE) { spawnPowerUp(); }
    }

     function spawnPowerUp() {
        // Give phase powerup slightly higher chance if useful (not near edge?)
        const type = Math.random() < 0.5 ? 'phase' : 'multi';
        powerUp = { ...getRandomGridPosition(), type: type };
    }

    function spawnAsteroid() {
        if (asteroids.length < ASTEROID_MAX_COUNT) {
             nextAsteroidPos = getRandomGridPosition(); // Store position
             warningTimer = ASTEROID_WARNING_DURATION; // Start warning timer
             if(warningText) warningText.textContent = "Asteroid Incoming!";
             if(warningOverlay) warningOverlay.style.display = 'block';
             playSound(warningSound);
        }
    }

    function confirmSpawnAsteroid() {
        if (nextAsteroidPos) {
             // Check if spot is STILL free (snake might have moved there)
             let overlap = false;
             if (snake) { for (const segment of snake) { if (segment.x === nextAsteroidPos.x && segment.y === nextAsteroidPos.y) { overlap = true; break; } } }
             if (!overlap) {
                  asteroids.push(nextAsteroidPos);
             } else {
                  console.log("Asteroid spawn cancelled, snake occupied spot.");
             }
             nextAsteroidPos = null; // Clear upcoming position
        }
        if(warningOverlay) warningOverlay.style.display = 'none'; // Hide warning
    }

    // --- Game Logic Update ---
    function updateGame(deltaTime) {
        if (isPaused || isGameOver || !snake || snake.length === 0) return;

        // --- Asteroid Spawning Logic ---
        asteroidSpawnTimer -= deltaTime * 1000; // Decrement timer in ms
        if (score >= ASTEROID_SPAWN_SCORE_THRESHOLD && asteroidSpawnTimer <= 0 && !nextAsteroidPos) {
             spawnAsteroid();
             asteroidSpawnTimer = ASTEROID_SPAWN_INTERVAL; // Reset timer
        }
        // Handle warning timer
        if (warningTimer > 0) {
             warningTimer -= deltaTime * 1000;
             if (warningTimer <= 0) {
                  confirmSpawnAsteroid(); // Spawn asteroid after warning
             }
        }

        // --- Combo Logic ---
        const timeSinceLastEat = Date.now() - lastEatTime;
        if (timeSinceLastEat > COMBO_TIMEOUT && comboCounter > 0) {
             // Combo ended
             comboCounter = 0;
             comboMultiplier = 1;
             if(comboIndicator) comboIndicator.classList.remove('active');
        }

        // --- Movement Logic ---
        direction = nextDirection;
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

        // --- Collision Detection ---
        let collisionType = null; // null, 'wall', 'self', 'asteroid'
        // Wall Collision (ignored if phasing)
        if (!isPhasing && (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT)) {
             collisionType = 'wall';
        }
        // Self Collision (ignored if phasing)
        if (!isPhasing) {
            for (let i = 1; i < snake.length; i++) { if (head.x === snake[i].x && head.y === snake[i].y) { collisionType = 'self'; break; } }
        }
        // Asteroid Collision (ignored if phasing)
        if (!isPhasing && asteroids.length > 0) {
            for (const ast of asteroids) { if (head.x === ast.x && head.y === ast.y) { collisionType = 'asteroid'; break; } }
        }

        // Handle Game Over
        if (collisionType) {
            triggerGameOver(`Hit ${collisionType}`);
            return;
        }

        // --- Move Snake ---
        snake.unshift(head);

        // --- Item Collision & Effects ---
        let ateSomething = false; let pointsToAdd = 0; let speedMultiplier = 1.0;
        let effect = null; // For screen ease

        // Food
        if (food && head.x === food.x && head.y === food.y) {
            ateSomething = true; pointsToAdd = 1; speedMultiplier = SPEED_INCREMENT_FACTOR;
            playSound(eatSound); createParticles(food.x, food.y, 15, FOOD_COLOR);
            spawnFoodItem();
        }
        // Bonus Food
        else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
            ateSomething = true; pointsToAdd = BONUS_FOOD_SCORE;
            playSound(bonusSound); createParticles(bonusFood.x, bonusFood.y, 25, BONUS_FOOD_COLOR);
            bonusFood = null; effect = 'ease';
        }
        // PowerUp
         else if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
            ateSomething = true; activatePowerUp(powerUp.type);
            playSound(powerUp.type === 'phase' ? phaseSound : powerupSound); // Different sound for phase
            createParticles(powerUp.x, powerUp.y, 20, powerUp.type === 'phase' ? POWERUP_PHASE_COLOR : POWERUP_MULTI_COLOR);
            powerUp = null; effect = 'ease';
        }

        // Apply Combo and Score Multiplier
        if (ateSomething) {
            lastEatTime = Date.now();
            comboCounter++;
            comboMultiplier = Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.floor(comboCounter / 3)); // Increase multi every 3 combo items
            if(comboMultiplier > 1 && comboIndicator && comboMultiplierSpan) {
                 comboMultiplierSpan.textContent = comboMultiplier;
                 comboIndicator.classList.add('active');
                 comboIndicator.style.opacity = '1'; // Ensure visible
            }

            pointsToAdd *= comboMultiplier; // Apply combo multiplier
            if (activePowerUp?.type === 'multi') { // Apply powerup multiplier AFTER combo
                 pointsToAdd *= SCORE_MULTIPLIER_VALUE;
            }
        }

        // Update Score & Speed
        if (pointsToAdd > 0) {
            score += pointsToAdd;
            if(scoreDisplay) {
                 scoreDisplay.textContent = score;
                 // Add pulse effect to score
                 scoreDisplay.classList.add('pulse');
                 setTimeout(() => scoreDisplay.classList.remove('pulse'), 200);
            }
        }
        if(ateSomething && speedMultiplier !== 1.0) {
            currentSpeed = Math.max(MIN_SPEED, currentSpeed * speedMultiplier);
        }

        // Apply Effects
        if (effect === 'ease' && gameContainer) {
             gameContainer.style.animation = 'easeWobble 0.3s ease-in-out';
             setTimeout(() => { if(gameContainer) gameContainer.style.animation = ''; }, 300);
        }

        // Remove tail segment if nothing was eaten
        if (!ateSomething) {
            snake.pop();
        }
    }


    // --- Powerup Handling ---
    function activatePowerUp(type) {
        activePowerUp = { type: type, endTime: Date.now() + POWERUP_DURATION };
        if(powerupIndicator && powerupIconSpan && powerupNameSpan) {
             powerupIconSpan.textContent = type === 'phase' ? '👻' : '✨'; // Emoji icons
             powerupNameSpan.textContent = type === 'phase' ? 'Phasing' : `Score x${SCORE_MULTIPLIER_VALUE}`;
             powerupIndicator.classList.add('active'); // Use class for transition
             powerupIndicator.style.opacity = '1'; // Ensure visible
        }
        if(type === 'phase') { isPhasing = true; } // Set phase state
    }

    function updatePowerUpStatus() {
        if (!activePowerUp) return;
        const timeRemaining = Math.max(0, activePowerUp.endTime - Date.now());
        if (timeRemaining === 0) {
            if(activePowerUp.type === 'phase') { isPhasing = false; } // Reset phase state
            activePowerUp = null;
            if(powerupIndicator) powerupIndicator.classList.remove('active');
        } else {
            if(powerupTimerSpan) powerupTimerSpan.textContent = (timeRemaining / 1000).toFixed(1);
        }
    }

    // --- Input Handling ---
    function handleInput(event) { /* ... (Same robust version as before) ... */
        if (isGameOver && event.key !== 'Enter' && event.key !== ' ') return;
        if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') { event.preventDefault(); togglePause(); return; }
        if (isPaused) return;
        const keyPressed = event.key; let requestedDirection = null;
        const currentDirectionX = nextDirection.x; const currentDirectionY = nextDirection.y;
        if ((keyPressed === 'ArrowLeft' || keyPressed.toLowerCase() === 'a') && currentDirectionX === 0) { requestedDirection = LEFT; }
        else if ((keyPressed === 'ArrowRight' || keyPressed.toLowerCase() === 'd') && currentDirectionX === 0) { requestedDirection = RIGHT; }
        else if ((keyPressed === 'ArrowUp' || keyPressed.toLowerCase() === 'w') && currentDirectionY === 0) { requestedDirection = UP; }
        else if ((keyPressed === 'ArrowDown' || keyPressed.toLowerCase() === 's') && currentDirectionY === 0) { requestedDirection = DOWN; }
        if (requestedDirection) { nextDirection = requestedDirection; }
    }


    // --- Rendering & Game Loop ---
     function clearGameCanvas() { // Clear only the game canvas
         ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
     function renderGame() {
         clearGameCanvas(); // Clear only game layer
         // Draw elements on game layer
         drawAsteroids();
         drawFood(food, FOOD_COLOR, FOOD_GLOW);
         drawFood(bonusFood, BONUS_FOOD_COLOR, BONUS_FOOD_GLOW); // Bonus is also circle
         // Draw powerups based on type
         if(powerUp?.type === 'phase') drawFood(powerUp, POWERUP_PHASE_COLOR, POWERUP_PHASE_GLOW, 'crystal');
         else if (powerUp?.type === 'multi') drawFood(powerUp, POWERUP_MULTI_COLOR, POWERUP_MULTI_GLOW, 'crystal');
         drawSnake();
         drawParticles();
    }

    function gameLoop(timestamp) {
        try {
            if (isGameOver) return;
            gameLoopTimeout = requestAnimationFrame(gameLoop);

            if (!lastFrameTime) { lastFrameTime = timestamp; }
            const deltaTime = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
            lastFrameTime = timestamp;

            // Always update background and particles
            moveAndDrawStars(deltaTime); // Update background canvas
            updateParticles(deltaTime); // Update particles on game canvas

            if (isPaused) { renderGame(); return; } // Render paused state

            timeAccumulator += deltaTime;
            let effectiveSpeedMs = currentSpeed;
            if (isPhasing) { effectiveSpeedMs *= 1.1; } // Slightly faster when phasing (optional)
            const updateIntervalSeconds = effectiveSpeedMs / 1000;

            let updatesProcessed = 0; const MAX_UPDATES_PER_FRAME = 10;
            while (timeAccumulator >= updateIntervalSeconds && updatesProcessed < MAX_UPDATES_PER_FRAME) {
                if(!isGameOver) { updateGame(updateIntervalSeconds); } else { break; } // Pass interval to update if needed
                timeAccumulator -= updateIntervalSeconds; updatesProcessed++;
                 if (isGameOver) break;
            }
            if (timeAccumulator >= updateIntervalSeconds) { timeAccumulator = updateIntervalSeconds * 0.9; }

            updatePowerUpStatus(); // Update timers continuously
            if (!isGameOver) { renderGame(); }

        } catch (error) {
            console.error("------- ERROR IN GAME LOOP -------", error);
             triggerGameOver(`Runtime Error: ${error.message}`);
        }
    }


    // --- Game State Management ---
    function displayErrorOverlay(message) { /* ... (same robust version) ... */
         console.error("Displaying Error Overlay:", message);
        if (gameOverScreen && finalScoreDisplay && newHighScoreMsg) {
             gameOverScreen.classList.add('active');
             const h2 = gameOverScreen.querySelector('h2'); if (h2) h2.textContent = "Error!";
             finalScoreDisplay.textContent = score ?? '?';
             newHighScoreMsg.textContent = message; newHighScoreMsg.style.display = 'block'; newHighScoreMsg.style.color = '#ff4d4d';
        } else { console.error("Could not display error overlay, elements missing."); alert("Critical error: " + message); }
    }
    function triggerGameOver(reason = "Collision") { /* ... (same robust version) ... */
         if (isGameOver) return; console.log(`Game Over Triggered: ${reason}`); isGameOver = true;
         if (gameLoopTimeout) cancelAnimationFrame(gameLoopTimeout); gameLoopTimeout = null;
         playSound(gameOverSound); if (backgroundMusic) backgroundMusic.pause();
         saveHighScore();
         if (finalScoreDisplay) finalScoreDisplay.textContent = score;
         if (gameOverScreen) gameOverScreen.classList.add('active');
         if (document.body) { document.body.style.animation = 'shake 0.5s ease-in-out'; setTimeout(() => { if (document.body) document.body.style.animation = ''; }, 500); }
         // Reset combo indicator immediately
         if(comboIndicator) comboIndicator.classList.remove('active'); comboCounter = 0; comboMultiplier = 1;
         if(warningOverlay) warningOverlay.style.display = 'none'; warningTimer = 0; nextAsteroidPos = null; // Clear warnings
    }
    function togglePause() { /* ... (same robust version) ... */
         if (isGameOver) return; isPaused = !isPaused;
         if (isPaused) { if (pauseScreen) pauseScreen.classList.add('active'); if (backgroundMusic) backgroundMusic.pause(); renderGame(); } // Render last frame on pause
         else { if (pauseScreen) pauseScreen.classList.remove('active'); lastFrameTime = performance.now(); timeAccumulator = 0;
             if (!gameLoopTimeout) { gameLoopTimeout = requestAnimationFrame(gameLoop); } // Restart loop if needed
             if (backgroundMusic && backgroundMusic.readyState >= 2) { backgroundMusic.play().catch(e=>console.warn("BG Music resume failed:", e)); } }
    }

    function initGame() {
        console.log("--- Initializing Cosmic Serpent ---");
        try {
            isGameOver = false; isPaused = false;
            snake = [ { x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) }, { x: Math.floor(GRID_WIDTH / 2) - 1, y: Math.floor(GRID_HEIGHT / 2) }, { x: Math.floor(GRID_WIDTH / 2) - 2, y: Math.floor(GRID_HEIGHT / 2) } ];
            direction = RIGHT; nextDirection = RIGHT; score = 0; currentSpeed = BASE_SPEED;
            bonusFood = null; powerUp = null; activePowerUp = null; isPhasing = false;
            asteroids = []; particles = []; // Clear game objects
            asteroidSpawnTimer = ASTEROID_SPAWN_INTERVAL / 2; // Start timer partway
            warningTimer = 0; nextAsteroidPos = null; // Reset asteroid state
            comboCounter = 0; comboMultiplier = 1; lastEatTime = 0; // Reset combo

            // Safely update UI
            if(scoreDisplay) scoreDisplay.textContent = score;
            if(comboIndicator) comboIndicator.classList.remove('active');
            loadHighScore();

            if(startScreen) startScreen.classList.remove('active');
            if(gameOverScreen) gameOverScreen.classList.remove('active');
            if(pauseScreen) pauseScreen.classList.remove('active');
            if(warningOverlay) warningOverlay.style.display = 'none';
            if(powerupIndicator) powerupIndicator.classList.remove('active');

             // Reset game over text/styles
             if (newHighScoreMsg) { newHighScoreMsg.style.display = 'none'; newHighScoreMsg.style.color = 'var(--glow-color-bonus)'; newHighScoreMsg.textContent = "New Cosmic Record!"; }
             const gameOverH2 = gameOverScreen ? gameOverScreen.querySelector('h2') : null; if(gameOverH2) gameOverH2.textContent = "Drift Ended";
             if(finalScoreDisplay) finalScoreDisplay.textContent = '0';

            createStars(150); // Initialize background stars
            spawnFoodItem(); // Spawn initial food

            if (gameLoopTimeout) cancelAnimationFrame(gameLoopTimeout);
            lastFrameTime = performance.now(); timeAccumulator = 0;
            gameLoopTimeout = requestAnimationFrame(gameLoop); // Start the main loop

            if (backgroundMusic && typeof backgroundMusic.play === 'function') { backgroundMusic.currentTime = 0; backgroundMusic.play().catch(e=>console.warn("BG Music start failed:", e)); }
             console.log("--- Init Complete ---");

        } catch (error) { console.error("------- ERROR DURING INIT -------", error); displayErrorOverlay(`Initialization Error: ${error.message}`); isGameOver = true; }
    }

    // --- Event Listeners ---
    if(startButton) startButton.addEventListener('click', initGame); else console.error("Start Button not found");
    if(restartButton) restartButton.addEventListener('click', initGame); else console.error("Restart Button not found");
    if(resumeButton) resumeButton.addEventListener('click', togglePause); else console.error("Resume Button not found");
    document.addEventListener('keydown', handleInput);


    // --- Initial Load ---
    loadHighScore();
    createStars(150); // Draw initial stars immediately
    moveAndDrawStars(0); // Draw one frame of stars
    if (startScreen) { startScreen.classList.add('active'); }
    else { console.warn("Start screen not found!"); initGame(); } // Fallback

});