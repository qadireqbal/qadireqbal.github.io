(() => {
  const canvas = document.getElementById('space-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let stars = [];
  let asteroids = [];
  let elapsed = 0;
  let previousFrame = 0;
  let scrollOffset = window.scrollY || 0;
  let spawnClock = 0;

  const pointer = {
    x: -1000,
    y: -1000,
    vx: 0,
    vy: 0,
    active: false,
    until: 0,
  };

  const randomBetween = (min, max) => min + Math.random() * (max - min);

  function resizeCanvas() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const starCount = Math.min(155, Math.floor((width * height) / 8200));
    stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.15 + 0.2,
      opacity: Math.random() * 0.48 + 0.12,
      phase: Math.random() * 7,
      depth: randomBetween(0.025, 0.19),
      hue: Math.random() < 0.22 ? 177 : 205,
    }));
  }

  function rememberPointerPosition(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    pointer.until = performance.now() + 1200;
  }

  function handlePointerMove(event) {
    const now = performance.now();
    const deltaTime = Math.max(0.016, (now - (pointer.time || now)) / 1000);
    const nextX = event.clientX;
    const nextY = event.clientY;

    pointer.vx = (nextX - pointer.x) / deltaTime;
    pointer.vy = (nextY - pointer.y) / deltaTime;
    pointer.time = now;
    rememberPointerPosition(event);
  }

  function spawnAsteroid(
    x = width + randomBetween(25, 80),
    y = randomBetween(10, Math.max(20, height - 10)),
  ) {
    const radius = randomBetween(5, 13);

    asteroids.push({
      x,
      y,
      radius,
      vx: -randomBetween(17, 39),
      vy: randomBetween(-5, 9),
      rotation: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-0.6, 0.6),
      points: Array.from({ length: 8 }, () => randomBetween(0.73, 1.24)),
      glow: Math.random() < 0.65 ? '#9edbce' : '#d7a7dc',
      cooldown: 0,
      trail: [],
    });
  }

  function drawNebula(centerX, centerY, radius, color) {
    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius,
    );

    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(8,11,18,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawStar(star) {
    const y = ((star.y - scrollOffset * star.depth + height * 20) % (height + 2)) - 1;
    const pulse = prefersReducedMotion.matches
      ? 1
      : 0.76 + 0.24 * Math.sin(elapsed * 1.2 + star.phase);

    ctx.fillStyle = `hsla(${star.hue}, 48%, 83%, ${star.opacity * pulse})`;
    ctx.beginPath();
    ctx.arc(star.x, y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function deflectAsteroid(asteroid, now) {
    if (!pointer.active || now >= pointer.until || asteroid.cooldown > 0) return;

    const dx = asteroid.x - pointer.x;
    const dy = asteroid.y - pointer.y;
    const distance = Math.hypot(dx, dy);
    const reach = asteroid.radius + 17;

    if (distance >= reach) return;

    const normalX = dx / (distance || 1);
    const normalY = dy / (distance || 1);
    const tangentX = -normalY;
    const tangentY = normalX;
    const tangentForce = (pointer.vx * tangentX + pointer.vy * tangentY) * 0.0022;
    const normalForce = Math.max(0, 1 - distance / reach) * 75;

    asteroid.vx += normalX * normalForce + tangentX * tangentForce;
    asteroid.vy += normalY * normalForce + tangentY * tangentForce;
    asteroid.vx = Math.max(-105, Math.min(105, asteroid.vx));
    asteroid.vy = Math.max(-90, Math.min(90, asteroid.vy));
    asteroid.cooldown = 0.42;
    asteroid.trail = [{ x: asteroid.x, y: asteroid.y }];
  }

  function drawAsteroid(asteroid) {
    ctx.save();

    if (asteroid.trail.length > 1) {
      ctx.beginPath();
      asteroid.trail.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = `${asteroid.glow}55`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation);
    ctx.shadowColor = asteroid.glow;
    ctx.shadowBlur = asteroid.cooldown ? 16 : 7;
    ctx.beginPath();
    asteroid.points.forEach((pointScale, index) => {
      const angle = (index * Math.PI * 2) / asteroid.points.length;
      const x = Math.cos(angle) * asteroid.radius * pointScale;
      const y = Math.sin(angle) * asteroid.radius * pointScale;

      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(17,29,37,.78)';
    ctx.fill();
    ctx.strokeStyle = `${asteroid.glow}ba`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function updateAsteroids(deltaTime, now) {
    spawnClock += deltaTime;
    if (spawnClock > 2.8 && asteroids.length < 8) {
      spawnClock = 0;
      spawnAsteroid();
    }

    for (const asteroid of asteroids) {
      asteroid.cooldown = Math.max(0, asteroid.cooldown - deltaTime);
      asteroid.x += asteroid.vx * deltaTime;
      asteroid.y += asteroid.vy * deltaTime;
      asteroid.rotation += asteroid.spin * deltaTime;

      // Glancing touches add sideways momentum; direct touches push asteroids away.
      deflectAsteroid(asteroid, now);

      asteroid.vx += (-32 - asteroid.vx) * deltaTime * 0.13;
      asteroid.vy += -asteroid.vy * deltaTime * 0.08;

      if (asteroid.trail.length) {
        asteroid.trail.push({ x: asteroid.x, y: asteroid.y });
        if (asteroid.trail.length > 13) asteroid.trail.shift();
      }

      drawAsteroid(asteroid);
    }

    asteroids = asteroids.filter(
      asteroid => asteroid.x > -35 && asteroid.y > -40 && asteroid.y < height + 40,
    );
  }

  function frame(now) {
    const deltaTime = Math.min(0.04, (now - previousFrame) / 1000 || 0.016);
    const motionScale = prefersReducedMotion.matches ? 0.12 : 1;
    previousFrame = now;
    elapsed += deltaTime * motionScale;

    ctx.clearRect(0, 0, width, height);
    const drift = prefersReducedMotion.matches ? 0 : scrollOffset * 0.1;

    drawNebula(
      width * (0.2 + 0.055 * Math.sin(elapsed * 0.21)) + Math.sin(drift * 0.002) * 32,
      height * 0.34 - (drift % (height * 1.4)),
      Math.max(width, height) * 0.66,
      'rgba(39,111,125,.17)',
    );
    drawNebula(
      width * (0.79 + 0.05 * Math.sin(elapsed * 0.17 + 2)),
      height * 0.69 + ((drift * 0.48) % (height * 1.5)),
      Math.max(width, height) * 0.62,
      'rgba(111,62,126,.14)',
    );
    drawNebula(
      width * (0.5 + 0.12 * Math.sin(elapsed * 0.13 + 4)),
      height * 0.13 - ((drift * 0.27) % (height * 1.7)),
      Math.max(width, height) * 0.47,
      'rgba(157,89,87,.075)',
    );

    for (const star of stars) drawStar(star);
    if (!prefersReducedMotion.matches) updateAsteroids(deltaTime, now);

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', () => {
    scrollOffset = window.scrollY || 0;
  }, { passive: true });
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerdown', event => {
    rememberPointerPosition(event);
    pointer.vx = event.movementX || 0;
    pointer.vy = event.movementY || 0;
  }, { passive: true });

  resizeCanvas();
  for (let index = 0; index < 4; index++) {
    spawnAsteroid(randomBetween(0, width), randomBetween(0, height));
  }
  requestAnimationFrame(frame);
})();
