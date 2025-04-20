document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameContainer = document.querySelector('.game-container');
    const backgroundCanvas = document.getElementById('backgroundCanvas');
    const bgCtx = backgroundCanvas?.getContext('2d');
    const gameCanvas = document.getElementById('gameCanvas');
    const ctx = gameCanvas?.getContext('2d');
    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('highScore');
    const currentLengthDisplay = document.getElementById('currentLength'); // Added
    const finalLengthDisplay = document.getElementById('finalLength');     // Added
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

    // --- Canvas Check ---
    if (!gameCanvas || !backgroundCanvas || !ctx || !bgCtx) {
        console.error("FATAL: Essential canvas elements or contexts not found! Aborting script.");
        document.body.innerHTML = '<div style="color: red; text-align: center; padding: 20px; font-family: sans-serif;">Error: Could not initialize game graphics. Please ensure the HTML structure is correct.</div>';
        return;
    }

    // Audio Elements
    const eatSound = document.getElementById('eatSound'); const bonusSound = document.getElementById('bonusSound'); const powerupSound = document.getElementById('powerupSound'); const phaseSound = document.getElementById('phaseSound'); const shieldSound = document.getElementById('shieldSound'); const shrinkSound = document.getElementById('shrinkSound'); const explodeSound = document.getElementById('explodeSound'); const warningSound = document.getElementById('warningSound'); const gameOverSound = document.getElementById('gameOverSound'); const backgroundMusic = document.getElementById('backgroundMusic');
    if (backgroundMusic) backgroundMusic.volume = 0.25;

    // --- Game Constants ---
    const GRID_SIZE = 20; const LOGICAL_WIDTH = 600; const LOGICAL_HEIGHT = 400; const GRID_WIDTH = LOGICAL_WIDTH / GRID_SIZE; const GRID_HEIGHT = LOGICAL_HEIGHT / GRID_SIZE;
    // Colors (remain the same)
    const SNAKE_HEAD_COLOR = '#ffffff'; const SNAKE_BODY_START = '#00ffff'; const SNAKE_BODY_MID = '#00aaaa'; const SNAKE_BODY_END = '#006666'; const FOOD_COLOR = '#ff80ff'; const FOOD_GLOW = '#ffc0ff'; const BONUS_FOOD_COLOR = '#ffffaa'; const BONUS_FOOD_GLOW = '#ffffdd'; const POWERUP_PHASE_COLOR = '#a0a0ff'; const POWERUP_PHASE_GLOW = '#c0c0ff'; const POWERUP_MULTI_COLOR = '#ffaa00'; const POWERUP_MULTI_GLOW = '#ffcc66'; const POWERUP_SHIELD_COLOR = '#aaffaa'; const POWERUP_SHIELD_GLOW = '#ccffcc'; const DARK_MATTER_COLOR = '#303040'; const DARK_MATTER_GLOW = '#505060'; const ASTEROID_COLOR = '#606070'; const ASTEROID_GLOW = '#888899'; const PARTICLE_COLORS = ['#ffffff', '#00ffff', '#ff80ff', '#ffffaa', '#a0a0ff', '#ffaa00', '#aaffaa']; const PHASE_SNAKE_COLOR = '#a0a0ff'; const SHIELD_SNAKE_GLOW = '#aaffaa';
    // Game Settings
     const BASE_SPEED = 130; const SPEED_INCREMENT_FACTOR = 0.985; const MIN_SPEED = 60; const BONUS_FOOD_CHANCE = 0.15; const BONUS_FOOD_SCORE = 5; const POWERUP_SPAWN_CHANCE = 0.13; const DARK_MATTER_CHANCE = 0.04; const POWERUP_DURATION = 8000; const SHIELD_DURATION = 10000; const SCORE_MULTIPLIER_VALUE = 2; const SNAKE_SHRINK_AMOUNT = 3; const ASTEROID_SPAWN_SCORE_THRESHOLD = 15; let ASTEROID_SPAWN_INTERVAL = 12000; const ASTEROID_MIN_INTERVAL = 5000; const ASTEROID_INTERVAL_DECREASE_PER_SCORE = 100; const ASTEROID_MAX_COUNT = 5; const ASTEROID_WARNING_DURATION = 1500; const COMBO_TIMEOUT = 2000; const MAX_COMBO_MULTIPLIER = 5;
    // Directions
    const UP = { x: 0, y: -1 }; const DOWN = { x: 0, y: 1 }; const LEFT = { x: -1, y: 0 }; const RIGHT = { x: 1, y: 0 };

    // --- Game State Variables ---
     let snake, food, bonusFood = null, powerUp = null, darkMatterItem = null, asteroids = [];
     let activePowerUp = null; let isPhasing = false; let shieldActive = false;
     let direction, nextDirection;
     let score, highScore, currentLength = 0, maxLengthSession = 0;
     let currentSpeed, gameLoopTimeout = null, lastFrameTime = 0, timeAccumulator = 0;
     let isPaused = false, isGameOver = true;
     let particles = []; let stars = [];
     let asteroidSpawnTimer = 0; let nextAsteroidPos = null; let warningTimer = 0;
     let comboCounter = 0; let comboMultiplier = 1; let lastEatTime = 0;
     let undulationOffset = 0;
    // Touch Control State Variables
    let touchStartX = 0; let touchStartY = 0; let touchEndX = 0; let touchEndY = 0;
    let minSwipeDistance = 30; // Adjust sensitivity if needed

    // --- Setup Canvases ---
    backgroundCanvas.width = LOGICAL_WIDTH; backgroundCanvas.height = LOGICAL_HEIGHT;
    gameCanvas.width = LOGICAL_WIDTH; gameCanvas.height = LOGICAL_HEIGHT;

    // --- Audio Functions ---
    function playSound(soundElement) { if (soundElement && typeof soundElement.play === 'function') { if (soundElement.readyState >= 2) { soundElement.currentTime = 0; soundElement.play().catch(e => { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') { console.warn("Audio play failed:", e); }}); } } }

    // --- **** High Score & Stats Handling (Restored) **** ---
    function loadHighScoreAndStats() { try { const storedScore = localStorage.getItem('cosmicSerpentHighScore_v2'); highScore = storedScore ? parseInt(storedScore, 10) : 0; if (isNaN(highScore)) highScore = 0; if(highScoreDisplay) highScoreDisplay.textContent = highScore; } catch (e) { console.error("LS HighScore Load Error:", e); highScore = 0; if(highScoreDisplay) highScoreDisplay.textContent = 0; } maxLengthSession = 0; if(currentLengthDisplay) currentLengthDisplay.textContent = 0; if(finalLengthDisplay) finalLengthDisplay.textContent = 0; }
    function saveHighScoreAndStats() { const currentScore = Number(score); const currentHighScore = Number(highScore); if (!isNaN(currentScore) && currentScore > currentHighScore) { highScore = currentScore; try { localStorage.setItem('cosmicSerpentHighScore_v2', highScore.toString()); } catch (e) { console.error("LS HighScore Save Error:", e); } if(highScoreDisplay) highScoreDisplay.textContent = highScore; if (newHighScoreMsg) newHighScoreMsg.style.display = 'block'; } else { if (newHighScoreMsg) newHighScoreMsg.style.display = 'none'; } if(finalLengthDisplay) finalLengthDisplay.textContent = maxLengthSession; }
    function updateLengthStats() { currentLength = snake ? snake.length : 0; if (currentLength > maxLengthSession) { maxLengthSession = currentLength; } if(currentLengthDisplay) currentLengthDisplay.textContent = currentLength; }
    // --- **** END Restored High Score Handling **** ---

    // --- Helper Functions (interpolateColor, hexToRgb, getRandomGridPosition, interpolateColors) ---
    // No changes needed
    function hexToRgb(hex) { var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i; hex = hex.replace(shorthandRegex, function(m, r, g, b) { return r + r + g + g + b + b; }); var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)} : null; }
    function interpolateColor(color1, color2, factor) { const rgb1 = hexToRgb(color1); const rgb2 = hexToRgb(color2); if (!rgb1 || !rgb2) return color1; factor = Math.max(0, Math.min(1, factor)); const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor); const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor); const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor); return `rgb(${r},${g},${b})`; }
    function interpolateColors(color1, color2, color3, factor) { const f = Math.max(0, Math.min(1, factor)); if (f < 0.5) { return interpolateColor(color1, color2, f * 2); } else { return interpolateColor(color2, color3, (f - 0.5) * 2); } }
    function getRandomGridPosition() { let pos; let overlap; let attempts = 0; const MAX_ATTEMPTS = GRID_WIDTH * GRID_HEIGHT; do { attempts++; overlap = false; pos = { x: Math.floor(Math.random() * GRID_WIDTH), y: Math.floor(Math.random() * GRID_HEIGHT) }; if (snake) { for (const segment of snake) { if (segment.x === pos.x && segment.y === pos.y) { overlap = true; break; } } } if (!overlap && food && food.x === pos.x && food.y === pos.y) overlap = true; if (!overlap && bonusFood && bonusFood.x === pos.x && bonusFood.y === pos.y) overlap = true; if (!overlap && powerUp && powerUp.x === pos.x && powerUp.y === pos.y) overlap = true; if (!overlap && darkMatterItem && darkMatterItem.x === pos.x && darkMatterItem.y === pos.y) overlap = true; if (!overlap && asteroids) { for (const ast of asteroids) { if (ast.x === pos.x && ast.y === pos.y) { overlap = true; break; } } } if (!overlap && nextAsteroidPos && nextAsteroidPos.x === pos.x && nextAsteroidPos.y === pos.y) overlap = true; if (attempts > MAX_ATTEMPTS) { console.warn("Could not find empty spot for item."); break; } } while (overlap); return pos; }

    // --- Background Starfield (createStars, moveAndDrawStars) ---
    // No changes needed
     function createStars(count) { stars = []; for (let i = 0; i < count; i++) { stars.push({ x: Math.random() * LOGICAL_WIDTH, y: Math.random() * LOGICAL_HEIGHT, radius: Math.random() * 1.5 + 0.5, alpha: Math.random() * 0.5 + 0.3, parallax: Math.random() * 0.4 + 0.1 }); } }
     function moveAndDrawStars(deltaTime) { if (!bgCtx) return; bgCtx.fillStyle = '#050510'; bgCtx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT); const nebulaGrad = bgCtx.createRadialGradient(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 50, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH * 0.8); nebulaGrad.addColorStop(0, 'rgba(40, 0, 80, 0.4)'); nebulaGrad.addColorStop(0.5, 'rgba(0, 40, 80, 0.3)'); nebulaGrad.addColorStop(1, 'rgba(5, 5, 16, 0)'); bgCtx.fillStyle = nebulaGrad; bgCtx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT); const speedFactor = isPaused ? 0 : (deltaTime || 1/60) * 15; stars.forEach(star => { star.y += star.parallax * speedFactor; if (star.y > LOGICAL_HEIGHT + star.radius) { star.y = -star.radius; star.x = Math.random() * LOGICAL_WIDTH; } bgCtx.beginPath(); bgCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); bgCtx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`; bgCtx.fill(); }); }

    // --- Particle System (createParticles, updateParticles, drawParticles) ---
    // No changes needed
     function createParticles(x, y, count = 15, baseColor = FOOD_COLOR) { for (let i = 0; i < count; i++) { particles.push({ x: x * GRID_SIZE + GRID_SIZE / 2, y: y * GRID_SIZE + GRID_SIZE / 2, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: Math.random() * 0.6 + 0.4, size: Math.random() * 3 + 1.5, color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)] }); } }
     function updateParticles(deltaTime) { for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; const dtFactor = (typeof deltaTime === 'number' && deltaTime > 0) ? deltaTime * 60 : 1; p.x += p.vx * dtFactor; p.y += p.vy * dtFactor; p.life -= (typeof deltaTime === 'number' && deltaTime > 0) ? deltaTime : (1/60); p.vx *= 0.97; p.vy *= 0.97; if (p.life <= 0) { particles.splice(i, 1); } } }
     function drawParticles() { particles.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life * 1.8); ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1.0; }

    // --- Drawing Functions (drawSnake, drawItemWithSpawnAnimation, drawFoodShape, drawAsteroids) ---
    // Includes undulation and spawn animations
    function drawSnake() { if (!snake || snake.length === 0) return; const baseGlow = shieldActive ? SHIELD_SNAKE_GLOW : (isPhasing ? PHASE_SNAKE_COLOR : SNAKE_BODY_START); const now = Date.now(); snake.forEach((segment, index) => { if (typeof segment?.x !== 'number' || typeof segment?.y !== 'number') return; const undulationFrequency = 0.005; const undulationAmplitude = GRID_SIZE * 0.06 * (1 - (index / snake.length)); const phaseShift = index * 0.5; let offsetX = 0, offsetY = 0; if (index > 0) { const prev = snake[index-1]; const dx = segment.x - prev.x; const dy = segment.y - prev.y; offsetX = -dy * Math.sin(now * undulationFrequency + phaseShift) * undulationAmplitude; offsetY = dx * Math.sin(now * undulationFrequency + phaseShift) * undulationAmplitude; } else { offsetX = -(direction?.y ?? 0) * Math.sin(now * undulationFrequency) * undulationAmplitude * 1.2; offsetY = (direction?.x ?? 1) * Math.sin(now * undulationFrequency) * undulationAmplitude * 1.2; } let segmentColor; let segmentSize = GRID_SIZE; let segmentAlpha = (isPhasing || shieldActive) ? 0.75 : 1.0; if (index === 0) { segmentColor = isPhasing ? PHASE_SNAKE_COLOR : SNAKE_HEAD_COLOR; segmentSize = GRID_SIZE * 1.05; } else { const ratio = snake.length > 1 ? Math.min(1, index / (snake.length - 1)) : 0; segmentColor = interpolateColors(SNAKE_BODY_START, SNAKE_BODY_MID, SNAKE_BODY_END, ratio); segmentSize = GRID_SIZE * (0.95 - ratio * 0.15); segmentAlpha *= (1.0 - ratio * 0.3); } const drawX = segment.x * GRID_SIZE + (GRID_SIZE - segmentSize) / 2 + offsetX; const drawY = segment.y * GRID_SIZE + (GRID_SIZE - segmentSize) / 2 + offsetY; ctx.globalAlpha = Math.max(0, segmentAlpha); ctx.shadowColor = baseGlow; ctx.shadowBlur = shieldActive ? 18 : (isPhasing ? 15 : 10); ctx.fillStyle = segmentColor; ctx.beginPath(); ctx.roundRect(drawX, drawY, segmentSize, segmentSize, segmentSize * 0.3); ctx.fill(); ctx.shadowBlur = 0; if (index === 0) { ctx.globalAlpha = 1.0; const eyeRadius = GRID_SIZE / 7; const headCenterX = segment.x * GRID_SIZE + GRID_SIZE / 2 + offsetX; const headCenterY = segment.y * GRID_SIZE + GRID_SIZE / 2 + offsetY; ctx.fillStyle = (isPhasing || shieldActive) ? '#ddddff' : '#000000'; ctx.beginPath(); ctx.arc(headCenterX, headCenterY, eyeRadius, 0, Math.PI * 2); ctx.fill(); } }); ctx.globalAlpha = 1.0; }
    function drawItemWithSpawnAnimation(item, drawFunc, ...args) { if (!item || typeof item.x !== 'number' || typeof item.y !== 'number') return; const timeSinceSpawn = Date.now() - item.spawnTime; const spawnDuration = 300; if (timeSinceSpawn < spawnDuration) { const progress = timeSinceSpawn / spawnDuration; const scale = 0.5 + progress * 0.5; const alpha = progress; ctx.save(); ctx.globalAlpha = alpha; const centerX = item.x * GRID_SIZE + GRID_SIZE / 2; const centerY = item.y * GRID_SIZE + GRID_SIZE / 2; ctx.translate(centerX, centerY); ctx.scale(scale, scale); ctx.translate(-centerX, -centerY); drawFunc(item, ...args); ctx.restore(); } else { drawFunc(item, ...args); } }
    function drawFoodShape(item, color, glowColor, shape = 'circle') { const pulse = (Math.sin(Date.now() / 250) + 1) / 2; const radius = GRID_SIZE / 2.5 + pulse * 2; const blur = 8 + pulse * 4; ctx.shadowColor = glowColor; ctx.shadowBlur = blur; ctx.fillStyle = color; ctx.beginPath(); if (shape === 'circle') { ctx.arc(item.x * GRID_SIZE + GRID_SIZE / 2, item.y * GRID_SIZE + GRID_SIZE / 2, radius, 0, Math.PI * 2); } else if (shape === 'crystal') { const centerX = item.x * GRID_SIZE + GRID_SIZE / 2; const centerY = item.y * GRID_SIZE + GRID_SIZE / 2; const size = radius * 1.4; ctx.moveTo(centerX, centerY - size / 2); ctx.lineTo(centerX + size / 2, centerY); ctx.lineTo(centerX, centerY + size / 2); ctx.lineTo(centerX - size / 2, centerY); ctx.closePath(); } else if (shape === 'dark_matter') { const centerX = item.x * GRID_SIZE + GRID_SIZE / 2; const centerY = item.y * GRID_SIZE + GRID_SIZE / 2; const points = 6; const baseRadius = radius * 0.9; ctx.moveTo(centerX + baseRadius, centerY); for(let i = 1; i <= points; i++) { const angle = (i * 2 * Math.PI) / points; const r = baseRadius * (0.7 + Math.random() * 0.6); ctx.lineTo(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r); } ctx.closePath(); } ctx.fill(); if (shape !== 'dark_matter') { ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + pulse * 0.3})`; ctx.beginPath(); ctx.arc(item.x * GRID_SIZE + GRID_SIZE * 0.65, item.y * GRID_SIZE + GRID_SIZE * 0.35, radius * 0.3, 0, Math.PI * 2); ctx.fill(); } ctx.shadowBlur = 0; }
    function drawAsteroids() { asteroids.forEach(ast => { if (typeof ast?.x !== 'number' || typeof ast?.y !== 'number') return; const size = GRID_SIZE * 0.9; const offset = (GRID_SIZE - size) / 2; ctx.shadowColor = ASTEROID_GLOW; ctx.shadowBlur = 5; ctx.fillStyle = ASTEROID_COLOR; ctx.beginPath(); const centerX = ast.x * GRID_SIZE + GRID_SIZE / 2; const centerY = ast.y * GRID_SIZE + GRID_SIZE / 2; const points = 7; const baseRadius = size / 2.2; ctx.moveTo(centerX + baseRadius, centerY); for(let i = 1; i <= points; i++) { const angle = (i * 2 * Math.PI) / points; const radius = baseRadius * (0.8 + Math.random() * 0.4); ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius); } ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; }); }


    // --- Spawning Functions ---
    function spawnFoodItem() { food = { ...getRandomGridPosition(), spawnTime: Date.now() }; bonusFood = null; powerUp = null; darkMatterItem = null; const rand = Math.random(); if (rand < DARK_MATTER_CHANCE) { darkMatterItem = { ...getRandomGridPosition(), spawnTime: Date.now() }; } else if (rand < DARK_MATTER_CHANCE + BONUS_FOOD_CHANCE) { bonusFood = { ...getRandomGridPosition(), spawnTime: Date.now() }; } else if (rand < DARK_MATTER_CHANCE + BONUS_FOOD_CHANCE + POWERUP_SPAWN_CHANCE) { spawnPowerUp(); } }
    function spawnPowerUp() { const powerupTypes = ['phase', 'multi', 'shield']; const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)]; powerUp = { ...getRandomGridPosition(), type: type, spawnTime: Date.now() }; }
    function spawnAsteroid() { if (asteroids.length < ASTEROID_MAX_COUNT) { nextAsteroidPos = getRandomGridPosition(); warningTimer = ASTEROID_WARNING_DURATION; if(warningText) warningText.textContent = "Asteroid Incoming!"; if(warningOverlay) warningOverlay.style.display = 'block'; playSound(warningSound); } }
    function confirmSpawnAsteroid() { if (nextAsteroidPos) { let overlap = false; if (snake) { for (const segment of snake) { if (segment.x === nextAsteroidPos.x && segment.y === nextAsteroidPos.y) { overlap = true; break; } } } if (!overlap) { asteroids.push({ ...nextAsteroidPos, spawnTime: Date.now() }); } else { console.log("Asteroid spawn cancelled."); } nextAsteroidPos = null; } if(warningOverlay) warningOverlay.style.display = 'none'; }


    // --- Game Logic Update ---
    function updateGame(deltaTime) { if (isPaused || isGameOver || !snake || snake.length === 0) return; const scoreOverThreshold = Math.max(0, score - ASTEROID_SPAWN_SCORE_THRESHOLD); ASTEROID_SPAWN_INTERVAL = Math.max(ASTEROID_MIN_INTERVAL, 12000 - scoreOverThreshold * ASTEROID_INTERVAL_DECREASE_PER_SCORE); asteroidSpawnTimer -= deltaTime * 1000; if (score >= ASTEROID_SPAWN_SCORE_THRESHOLD && asteroidSpawnTimer <= 0 && !nextAsteroidPos) { spawnAsteroid(); asteroidSpawnTimer = ASTEROID_SPAWN_INTERVAL; } if (warningTimer > 0) { warningTimer -= deltaTime * 1000; if (warningTimer <= 0) { confirmSpawnAsteroid(); } } const timeSinceLastEat = Date.now() - lastEatTime; if (timeSinceLastEat > COMBO_TIMEOUT && comboCounter > 0) { comboCounter = 0; comboMultiplier = 1; if(comboIndicator) comboIndicator.classList.remove('active'); } direction = nextDirection; const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y }; let collisionOccurred = false; let collisionReason = ""; let effect = null; if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) { if (!isPhasing) { if (shieldActive) { shieldActive = false; playSound(shieldSound); effect = 'ease'; activePowerUp = null; if(powerupIndicator) powerupIndicator.classList.remove('active'); } else { collisionOccurred = true; collisionReason = "Wall"; } } else { head.x = (head.x + GRID_WIDTH) % GRID_WIDTH; head.y = (head.y + GRID_HEIGHT) % GRID_HEIGHT; } } if (!collisionOccurred && !isPhasing) { for (let i = 1; i < snake.length; i++) { if (head.x === snake[i].x && head.y === snake[i].y) { if (shieldActive) { shieldActive = false; playSound(shieldSound); effect = 'ease'; activePowerUp = null; if(powerupIndicator) powerupIndicator.classList.remove('active'); } else { collisionOccurred = true; collisionReason = "Self"; } break; } } } if (!collisionOccurred && !isPhasing && asteroids.length > 0) { for (const ast of asteroids) { if (head.x === ast.x && head.y === ast.y) { if (shieldActive) { shieldActive = false; playSound(shieldSound); effect = 'ease'; activePowerUp = null; if(powerupIndicator) powerupIndicator.classList.remove('active'); } else { collisionOccurred = true; collisionReason = "Asteroid"; } break; } } } if (collisionOccurred) { triggerGameOver(`Hit ${collisionReason}`); return; } snake.unshift(head); updateLengthStats(); let ateSomething = false; let pointsToAdd = 0; let speedMultiplier = 1.0; if (powerUp && head.x === powerUp.x && head.y === powerUp.y) { ateSomething = true; activatePowerUp(powerUp.type); playSound(powerUp.type === 'phase' ? phaseSound : (powerUp.type === 'shield' ? shieldSound : powerupSound)); createParticles(powerUp.x, powerUp.y, 20, powerUp.type === 'phase' ? POWERUP_PHASE_COLOR : (powerUp.type === 'shield' ? POWERUP_SHIELD_COLOR : POWERUP_MULTI_COLOR)); powerUp = null; effect = 'ease'; } else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) { ateSomething = true; pointsToAdd = BONUS_FOOD_SCORE; playSound(bonusSound); createParticles(bonusFood.x, bonusFood.y, 25, BONUS_FOOD_COLOR); bonusFood = null; effect = 'ease'; } else if (food && head.x === food.x && head.y === food.y) { ateSomething = true; pointsToAdd = 1; speedMultiplier = SPEED_INCREMENT_FACTOR; playSound(eatSound); createParticles(food.x, food.y, 15, FOOD_COLOR); spawnFoodItem(); } else if (darkMatterItem && head.x === darkMatterItem.x && head.y === darkMatterItem.y) { playSound(shrinkSound); createParticles(darkMatterItem.x, darkMatterItem.y, 10, DARK_MATTER_COLOR); darkMatterItem = null; for(let i = 0; i < SNAKE_SHRINK_AMOUNT && snake.length > 1; i++) { snake.pop(); } updateLengthStats(); if (gameContainer) { gameContainer.style.animation = 'shake 0.2s ease-in-out'; setTimeout(() => { if(gameContainer) gameContainer.style.animation = ''; }, 200); } } if (ateSomething) { lastEatTime = Date.now(); comboCounter++; comboMultiplier = Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.floor(comboCounter / 3)); if(comboMultiplier > 1 && comboIndicator && comboMultiplierSpan) { comboMultiplierSpan.textContent = comboMultiplier; comboIndicator.classList.add('active'); comboIndicator.style.opacity = '1'; } pointsToAdd *= comboMultiplier; if (activePowerUp?.type === 'multi') { pointsToAdd *= SCORE_MULTIPLIER_VALUE; } } if (pointsToAdd > 0) { score += pointsToAdd; if(scoreDisplay) { scoreDisplay.textContent = score; scoreDisplay.classList.add('pulse'); setTimeout(() => scoreDisplay.classList.remove('pulse'), 200); } } if(ateSomething && speedMultiplier !== 1.0) { currentSpeed = Math.max(MIN_SPEED, currentSpeed * speedMultiplier); } if (effect === 'ease' && gameContainer) { gameContainer.style.animation = 'easeWobble 0.3s ease-in-out'; setTimeout(() => { if(gameContainer) gameContainer.style.animation = ''; }, 300); } if (!ateSomething && !darkMatterItem) { if (snake.length > 1) { snake.pop(); updateLengthStats(); } } }


    // --- Powerup Handling ---
    function activatePowerUp(type) { if(type === 'shield') { shieldActive = true; activePowerUp = null; if(powerupIndicator) powerupIndicator.classList.remove('active'); return; } const duration = (type === 'phase' || type === 'multi') ? POWERUP_DURATION : 0; if (duration > 0) { activePowerUp = { type: type, endTime: Date.now() + duration }; if(powerupIndicator && powerupIconSpan && powerupNameSpan) { powerupIconSpan.textContent = type === 'phase' ? '👻' : (type === 'multi' ? '✨' : ''); powerupNameSpan.textContent = type === 'phase' ? 'Phasing' : (type === 'multi' ? `Score x${SCORE_MULTIPLIER_VALUE}` : ''); powerupIndicator.classList.add('active'); powerupIndicator.style.opacity = '1'; } } if(type === 'phase') { isPhasing = true; shieldActive = false; } else { isPhasing = false; } }
    function updatePowerUpStatus() { if (!activePowerUp) return; const timeRemaining = Math.max(0, activePowerUp.endTime - Date.now()); if (timeRemaining === 0) { if(activePowerUp.type === 'phase') { isPhasing = false; } activePowerUp = null; if(powerupIndicator) powerupIndicator.classList.remove('active'); } else { if(powerupTimerSpan) powerupTimerSpan.textContent = (timeRemaining / 1000).toFixed(1); } }


    // --- Input Handling ---
    function handleKeyDown(event) { if (isGameOver || isPaused) { if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') { event.preventDefault(); togglePause(); } return; } const keyPressed = event.key; let requestedDirection = null; const currentDirectionX = nextDirection.x; const currentDirectionY = nextDirection.y; if ((keyPressed === 'ArrowLeft' || keyPressed.toLowerCase() === 'a') && currentDirectionX === 0) { requestedDirection = LEFT; } else if ((keyPressed === 'ArrowRight' || keyPressed.toLowerCase() === 'd') && currentDirectionX === 0) { requestedDirection = RIGHT; } else if ((keyPressed === 'ArrowUp' || keyPressed.toLowerCase() === 'w') && currentDirectionY === 0) { requestedDirection = UP; } else if ((keyPressed === 'ArrowDown' || keyPressed.toLowerCase() === 's') && currentDirectionY === 0) { requestedDirection = DOWN; } if (requestedDirection) { nextDirection = requestedDirection; } }
    function handleTouchStart(event) { if (event.target === gameCanvas) { event.preventDefault(); } const touch = event.touches[0]; touchStartX = touch.clientX; touchStartY = touch.clientY; touchEndX = touch.clientX; touchEndY = touch.clientY; }
    function handleTouchMove(event) { if (event.target === gameCanvas) { event.preventDefault(); } const touch = event.touches[0]; touchEndX = touch.clientX; touchEndY = touch.clientY; }
    // *** CORRECTED handleTouchEnd ***
    function handleTouchEnd(event) {
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy); // Corrected: Use absDy here

        // Check for TAP to unpause (only if touch ended on canvas)
        if (event.target === gameCanvas && isPaused && !isGameOver && absDx < 10 && absDy < 10) {
            // console.log("Tap detected, unpausing."); // DEBUG
            togglePause();
            resetTouchCoords();
            return;
        }

        // Don't process swipes if paused or game over
        if (isPaused || isGameOver) {
            resetTouchCoords();
            return;
        }

        let requestedDirection = null;
        // Check if swipe distance is sufficient
        if (Math.max(absDx, absDy) > minSwipeDistance) {
            if (absDx > absDy) { // Horizontal swipe
                if (dx > 0 && nextDirection !== LEFT) { requestedDirection = RIGHT; }
                else if (dx < 0 && nextDirection !== RIGHT) { requestedDirection = LEFT; }
            } else { // Vertical swipe
                if (dy > 0 && nextDirection !== UP) { requestedDirection = DOWN; }
                else if (dy < 0 && nextDirection !== DOWN) { requestedDirection = UP; }
            }
        }
        if (requestedDirection) { nextDirection = requestedDirection; }
        resetTouchCoords();
    }
    function resetTouchCoords() { touchStartX = 0; touchStartY = 0; touchEndX = 0; touchEndY = 0; }


    // --- Rendering & Game Loop ---
    function clearGameCanvas() { ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT); }
    function renderGame() { clearGameCanvas(); drawAsteroids(); drawItemWithSpawnAnimation(food, drawFoodShape, FOOD_COLOR, FOOD_GLOW, 'circle'); drawItemWithSpawnAnimation(bonusFood, drawFoodShape, BONUS_FOOD_COLOR, BONUS_FOOD_GLOW, 'circle'); drawItemWithSpawnAnimation(darkMatterItem, drawFoodShape, DARK_MATTER_COLOR, DARK_MATTER_GLOW, 'dark_matter'); if(powerUp?.type === 'phase') drawItemWithSpawnAnimation(powerUp, drawFoodShape, POWERUP_PHASE_COLOR, POWERUP_PHASE_GLOW, 'crystal'); else if (powerUp?.type === 'multi') drawItemWithSpawnAnimation(powerUp, drawFoodShape, POWERUP_MULTI_COLOR, POWERUP_MULTI_GLOW, 'crystal'); else if (powerUp?.type === 'shield') drawItemWithSpawnAnimation(powerUp, drawFoodShape, POWERUP_SHIELD_COLOR, POWERUP_SHIELD_GLOW, 'crystal'); drawSnake(); drawParticles(); }
    function gameLoop(timestamp) { try { if (isGameOver) return; gameLoopTimeout = requestAnimationFrame(gameLoop); if (!lastFrameTime) lastFrameTime = timestamp; const deltaTime = Math.min((timestamp - lastFrameTime) / 1000, 0.1); lastFrameTime = timestamp; undulationOffset += deltaTime; moveAndDrawStars(deltaTime); updateParticles(deltaTime); if (isPaused) { renderGame(); return; } timeAccumulator += deltaTime; let effectiveSpeedMs = currentSpeed; if (isPhasing) effectiveSpeedMs *= 1.1; const updateIntervalSeconds = effectiveSpeedMs / 1000; let updatesProcessed = 0; const MAX_UPDATES_PER_FRAME = 10; while (timeAccumulator >= updateIntervalSeconds && updatesProcessed < MAX_UPDATES_PER_FRAME) { if(!isGameOver) updateGame(updateIntervalSeconds); else break; timeAccumulator -= updateIntervalSeconds; updatesProcessed++; if (isGameOver) break; } if (timeAccumulator >= updateIntervalSeconds) timeAccumulator = updateIntervalSeconds * 0.9; updatePowerUpStatus(); if (!isGameOver) renderGame(); } catch (error) { console.error("LOOP ERROR", error); triggerGameOver(`Runtime Error: ${error.message}`); } }

    // --- Game State Management ---
    function displayErrorOverlay(message) { /* ... same ... */ console.error("Displaying Error Overlay:", message); if (gameOverScreen && finalScoreDisplay && newHighScoreMsg) { gameOverScreen.classList.add('active'); const h2 = gameOverScreen.querySelector('h2'); if (h2) h2.textContent = "Error!"; finalScoreDisplay.textContent = score ?? '?'; newHighScoreMsg.textContent = message; newHighScoreMsg.style.display = 'block'; newHighScoreMsg.style.color = '#ff4d4d'; } else { console.error("Could not display error overlay, elements missing."); alert("Critical error: " + message); } }
    function triggerGameOver(reason = "Collision") { if (isGameOver) return; console.log(`Game Over Triggered: ${reason}`); isGameOver = true; if (gameLoopTimeout) cancelAnimationFrame(gameLoopTimeout); gameLoopTimeout = null; if (snake && snake.length > 0) { playSound(explodeSound); createParticles(snake[0].x, snake[0].y, 50 + snake.length * 2); snake = []; renderGame(); } else { playSound(gameOverSound); } if (backgroundMusic) backgroundMusic.pause(); saveHighScoreAndStats(); if (finalScoreDisplay) finalScoreDisplay.textContent = score; if (gameOverScreen) gameOverScreen.classList.add('active'); if (document.body) { document.body.style.animation = 'shake 0.5s ease-in-out'; setTimeout(() => { if (document.body) document.body.style.animation = ''; }, 500); } if(comboIndicator) comboIndicator.classList.remove('active'); comboCounter = 0; comboMultiplier = 1; if(warningOverlay) warningOverlay.style.display = 'none'; warningTimer = 0; nextAsteroidPos = null; activePowerUp = null; isPhasing = false; shieldActive = false; if(powerupIndicator) powerupIndicator.classList.remove('active'); }
    function togglePause() { if (isGameOver) return; isPaused = !isPaused; if (isPaused) { if (pauseScreen) pauseScreen.classList.add('active'); if (backgroundMusic) backgroundMusic.pause(); renderGame(); } else { if (pauseScreen) pauseScreen.classList.remove('active'); lastFrameTime = performance.now(); timeAccumulator = 0; if (!gameLoopTimeout) gameLoopTimeout = requestAnimationFrame(gameLoop); if (backgroundMusic && backgroundMusic.readyState >= 2) { backgroundMusic.play().catch(e=>console.warn("BG Music resume failed:", e)); } } }
    function initGame() { console.log("--- Initializing Cosmic Serpent ---"); try { isGameOver = false; isPaused = false; snake = [ { x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) }, { x: Math.floor(GRID_WIDTH / 2) - 1, y: Math.floor(GRID_HEIGHT / 2) }, { x: Math.floor(GRID_WIDTH / 2) - 2, y: Math.floor(GRID_HEIGHT / 2) } ]; updateLengthStats(); maxLengthSession = snake.length; direction = RIGHT; nextDirection = RIGHT; score = 0; currentSpeed = BASE_SPEED; bonusFood = null; powerUp = null; darkMatterItem = null; activePowerUp = null; isPhasing = false; shieldActive = false; asteroids = []; particles = []; asteroidSpawnTimer = ASTEROID_SPAWN_INTERVAL / 2; warningTimer = 0; nextAsteroidPos = null; comboCounter = 0; comboMultiplier = 1; lastEatTime = 0; loadHighScoreAndStats(); if(scoreDisplay) scoreDisplay.textContent = score; if(currentLengthDisplay) currentLengthDisplay.textContent = currentLength; if(comboIndicator) comboIndicator.classList.remove('active'); if(startScreen) startScreen.classList.remove('active'); if(gameOverScreen) gameOverScreen.classList.remove('active'); if(pauseScreen) pauseScreen.classList.remove('active'); if(warningOverlay) warningOverlay.style.display = 'none'; if(powerupIndicator) powerupIndicator.classList.remove('active'); if (newHighScoreMsg) { newHighScoreMsg.style.display = 'none'; newHighScoreMsg.style.color = 'var(--glow-color-bonus)'; newHighScoreMsg.textContent = "New Cosmic Record!"; } const gameOverH2 = gameOverScreen ? gameOverScreen.querySelector('h2') : null; if(gameOverH2) gameOverH2.textContent = "Drift Ended"; if(finalScoreDisplay) finalScoreDisplay.textContent = '0'; if(finalLengthDisplay) finalLengthDisplay.textContent = '0'; createStars(150); spawnFoodItem(); if (gameLoopTimeout) cancelAnimationFrame(gameLoopTimeout); lastFrameTime = performance.now(); timeAccumulator = 0; gameLoopTimeout = requestAnimationFrame(gameLoop); if (backgroundMusic && typeof backgroundMusic.play === 'function') { backgroundMusic.currentTime = 0; backgroundMusic.play().catch(e=>console.warn("BG Music start failed:", e)); } console.log("--- Init Complete ---"); } catch (error) { console.error("INIT ERROR", error); displayErrorOverlay(`Initialization Error: ${error.message}`); isGameOver = true; } }

    // --- Event Listeners ---
    document.addEventListener('keydown', handleKeyDown);
    // Attach touch listeners ONLY to gameCanvas
    if (gameCanvas) { gameCanvas.addEventListener('touchstart', handleTouchStart, { passive: false }); gameCanvas.addEventListener('touchmove', handleTouchMove, { passive: false }); gameCanvas.addEventListener('touchend', handleTouchEnd, { passive: false }); } else { console.error("Cannot add touch listeners, gameCanvas not found!"); }
    // Button Listeners (Ensure buttons exist)
    if(startButton) startButton.addEventListener('click', initGame); else console.error("Start Button not found");
    if(restartButton) restartButton.addEventListener('click', initGame); else console.error("Restart Button not found");
    if(resumeButton) resumeButton.addEventListener('click', togglePause); else console.error("Resume Button not found");


    // --- Initial Load ---
    loadHighScoreAndStats(); // Load high score first
    createStars(150);
    moveAndDrawStars(0); // Initial background draw
    if (startScreen) { startScreen.classList.add('active'); }
    else { console.warn("Start screen not found!"); initGame(); }
    function triggerGameOver(reason = "Collision") {
        if (isGameOver) return;
        console.log(`Game Over Triggered: ${reason}`);
        isGameOver = true;
        if (gameLoopTimeout) cancelAnimationFrame(gameLoopTimeout);
        gameLoopTimeout = null;
    
        if (backgroundMusic) backgroundMusic.pause();
    
        // --- Decide which sound to play ---
        if (snake && snake.length > 0) {
            playSound(explodeSound); // Play explosion sound
            createParticles(snake[0].x, snake[0].y, 50 + snake.length * 2);
            snake = [];
            renderGame();
        } else {
            playSound(gameOverSound); // Play standard game over sound ONLY if no explosion
        }
        // --- End Sound Decision ---
    
        saveHighScoreAndStats();
        if (finalScoreDisplay) finalScoreDisplay.textContent = score;
        if (gameOverScreen) gameOverScreen.classList.add('active');
        // ... (screen shake) ...
        // ... (reset indicators) ...
    }
    function triggerGameOver(reason = "Collision") {
        if (isGameOver) return;
        console.log(`Game Over Triggered: ${reason}`);
        isGameOver = true;
        if (gameLoopTimeout) cancelAnimationFrame(gameLoopTimeout);
        gameLoopTimeout = null;
    
        // --- Add Delay for Testing ---
        setTimeout(() => {
            playSound(gameOverSound); // Play sound after a short delay
        }, 50); // 50 milliseconds delay
    
        if (backgroundMusic) backgroundMusic.pause();
        // ... rest of the function (saveHighScore, explosion, etc.)
         if (snake && snake.length > 0) {
             playSound(explodeSound); // Play explode sound immediately though
             createParticles(snake[0].x, snake[0].y, 50 + snake.length * 2);
             snake = [];
             renderGame();
         } /* else {
             // Don't play regular game over if explosion played? Or play both?
             // playSound(gameOverSound); // Moved to timeout
         } */
    
        saveHighScoreAndStats();
        if (finalScoreDisplay) finalScoreDisplay.textContent = score;
        if (gameOverScreen) gameOverScreen.classList.add('active');
        // ... (screen shake) ...
        // ... (reset indicators) ...
    }

});