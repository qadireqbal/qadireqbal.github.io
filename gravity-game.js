(() => {
  const canvas = document.getElementById('gravity-canvas');
  const ctx = canvas.getContext('2d');
  const hint = document.getElementById('gravity-hint');
  const hero = document.querySelector('.hero');
  const G = 2600;
  const TAU = Math.PI * 2;
  const MAX_BODIES = 24;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  let w = innerWidth;
  let h = innerHeight;
  let dpr = 1;
  let scrollY = window.scrollY || 0;
  let heroBottom = 0;
  let docHeight = 0;
  let particles = [];
  let drag = null;
  let pointer = null;
  let serial = 0;
  let last = 0;
  let hintTimer = 0;
  let hintUsed = false;

  function measure() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    scrollY = window.scrollY || 0;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    heroBottom = hero ? hero.getBoundingClientRect().bottom + scrollY : 0;
    docHeight = Math.max(document.documentElement.scrollHeight, heroBottom + h);
    for (const p of particles) {
      p.x = clamp(p.x, 8, w - 8);
      p.y = clamp(p.y, heroBottom + radius(p.mass), docHeight - radius(p.mass));
    }
  }
  function radius(mass) {
    return 5 + Math.sqrt(mass) * 1.2;
  }

  function measureOnScroll() {
    scrollY = window.scrollY || 0;
    heroBottom = hero ? hero.getBoundingClientRect().bottom + scrollY : 0;
    docHeight = Math.max(document.documentElement.scrollHeight, heroBottom + h);
    if (pointer && !hintUsed) {
      scheduleHint(pointer.x, pointer.clientY + scrollY,
        document.elementFromPoint(pointer.x, pointer.clientY));
    }
  }
  window.addEventListener('resize', () => {
    measure();
  }, { passive: true });
  window.addEventListener('scroll', measureOnScroll, { passive: true });
  measure();

  function isExcluded(target, documentY) {
    if (!target || documentY < heroBottom) return true;
    return !!target.closest('a,button,input,textarea,select,option,label,[contenteditable="true"],nav,.contact-form,.gravity-hud,.gravity-hint');
  }

  function addBody(x, y) {
    const body = {
      id: ++serial,
      x,
      y,
      mass: 5,
      vx: 0,
      vy: 0,
      trail: [],
      growing: true,
      phase: Math.random() * TAU,
      blackhole: false,
    };

    particles.push(body);
    return body;
  }

  function hideHint() {
    hint.classList.remove('is-visible');
  }

  function nearMass(x, y) {
    return particles.some(
      body => Math.hypot(body.x - x, body.y - y) < radius(body.mass) + 42,
    );
  }

  function scheduleHint(x, y, target) {
    clearTimeout(hintTimer);
    hideHint();
    if (hintUsed || !target || isExcluded(target, y) || nearMass(x, y)) return;

    hintTimer = setTimeout(() => {
      if (hintUsed || nearMass(x, y) || isExcluded(target, y)) return;
      hint.style.left = `${clamp(x + 18, 12, w - 150)}px`;
      hint.style.top = `${clamp(y - scrollY + 18, 12, h - 30)}px`;
      hint.classList.add('is-visible');
    }, 1250);
  }

  window.addEventListener('pointerdown', e => {
    if (e.button !== 0 || drag) return;

    const y = e.clientY + scrollY;
    clearTimeout(hintTimer);
    hideHint();
    if (isExcluded(e.target, y)) return;

    const press = {
      id: e.pointerId,
      target: e.target,
      startX: e.clientX,
      startY: y,
      x: e.clientX,
      y,
      previousX: e.clientX,
      previousY: y,
      previousAt: performance.now(),
      vx: 0,
      vy: 0,
      body: null,
      timer: 0,
    };

    press.timer = setTimeout(() => {
      if (drag !== press) return;
      if (particles.length >= MAX_BODIES) {
        drag = null;
        return;
      }

      press.body = addBody(press.x, press.y);
      hintUsed = true;
      clearTimeout(hintTimer);
      hideHint();
      try { press.target.setPointerCapture?.(press.id); } catch (_) { /* capture is optional for non-element targets */ }
    }, 300);
    drag = press;
  }, true);

  window.addEventListener('pointermove', e => {
    const y = e.clientY + scrollY;
    pointer = { x: e.clientX, y, clientY: e.clientY, time: performance.now() };
    if (!drag && !hintUsed) scheduleHint(e.clientX, y, e.target);
    if (!drag || drag.id !== e.pointerId) return;

    drag.x = e.clientX;
    drag.y = y;
    if (!drag.body && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 12) {
      clearTimeout(drag.timer);
      drag = null;
      scheduleHint(e.clientX, y, e.target);
      return;
    }
    if (drag.body) {
      const now = performance.now();
      const dt = Math.max(0.012, (now - drag.previousAt) / 1000);
      drag.vx = (drag.x - drag.previousX) / dt;
      drag.vy = (drag.y - drag.previousY) / dt;
      drag.body.x = clamp(drag.x, 8, w - 8);
      drag.body.y = clamp(drag.y, heroBottom + radius(drag.body.mass), docHeight - radius(drag.body.mass));
      drag.previousX = drag.x;
      drag.previousY = drag.y;
      drag.previousAt = now;
    }
  }, true);

  function release(e) {
    if (!drag || drag.id !== e.pointerId) return;

    clearTimeout(drag.timer);
    if (drag.body) {
      const body = drag.body;
      const rawX = clamp(drag.vx, -210, 210);
      const rawY = clamp(drag.vy, -210, 210);
      body.growing = false;
      const center = particles
        .filter(particle => particle !== body)
        .sort((a, b) => Math.hypot(a.x - body.x, a.y - body.y) - Math.hypot(b.x - body.x, b.y - body.y))[0];
      if (center) {
        const dx = body.x - center.x;
        const dy = body.y - center.y;
        const distance = Math.max(24, Math.hypot(dx, dy));
        const direction = dx * (drag.y - drag.startY) - dy * (drag.x - drag.startX) < 0 ? -1 : 1;
        const speed = clamp(Math.sqrt((G * center.mass) / distance) * 1.08, 24, 135);
        const tangentX = (-dy / distance) * direction;
        const tangentY = (dx / distance) * direction;

        body.vx = tangentX * speed + rawX * 0.23;
        body.vy = tangentY * speed + rawY * 0.23;
      } else {
        body.vx = rawX * 0.72;
        body.vy = rawY * 0.72;
      }
      body.trail = [];
    } else if (!hintUsed) {
      scheduleHint(e.clientX, e.clientY + scrollY, e.target);
    }
    drag = null;
  }
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
  window.addEventListener('contextmenu', e => {
    if (drag?.body) e.preventDefault();
  }, true);

  function acceleration(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const soft = Math.max(9, (radius(a.mass) + radius(b.mass)) * .72);
    const distanceSquared = dx * dx + dy * dy + soft * soft;
    const inverseDistanceCubed = 1 / (distanceSquared * Math.sqrt(distanceSquared));
    return [
      G * b.mass * dx * inverseDistanceCubed,
      G * b.mass * dy * inverseDistanceCubed,
    ];
  }

  function step(dt) {
    if (drag?.body) {
      drag.body.mass = Math.min(560, drag.body.mass + dt * 78);
    }

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      if (drag?.body === a) continue;
      let ax = 0, ay = 0;
      for (let j = 0; j < particles.length; j++) {
        if (i === j) continue;
        const force = acceleration(a, particles[j]);
        ax += force[0];
        ay += force[1];
      }
      const force = Math.hypot(ax, ay);
      if (force > 1400) {
        ax *= 1400 / force;
        ay *= 1400 / force;
      }
      a.vx += ax * dt;
      a.vy += ay * dt;
      const speed = Math.hypot(a.vx, a.vy);
      if (speed > 300) {
        a.vx *= 300 / speed;
        a.vy *= 300 / speed;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      const r = radius(a.mass);
      if (a.x < r || a.x > w - r) {
        a.x = clamp(a.x, r, w - r);
        a.vx *= -0.78;
      }
      if (a.y < heroBottom + r || a.y > docHeight - r) {
        a.y = clamp(a.y, heroBottom + r, docHeight - r);
        a.vy *= -0.78;
      }
      if (Math.hypot(a.vx, a.vy) > 11) {
        a.trail.push({ x: a.x, y: a.y });
        if (a.trail.length > 190) a.trail.shift();
      }
    }
    // Merge collisions while preserving the pair's center of mass and momentum.
    for (let i = particles.length - 1; i >= 0; i--) {
      for (let j = i - 1; j >= 0; j--) {
        const a = particles[i];
        const b = particles[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < (radius(a.mass) + radius(b.mass)) * .78) {
          const mass = a.mass + b.mass;
          const survivor = a === drag?.body ? a : b;
          survivor.x = (a.x * a.mass + b.x * b.mass) / mass;
          survivor.y = (a.y * a.mass + b.y * b.mass) / mass;
          survivor.vx = ((a.vx || 0) * a.mass + (b.vx || 0) * b.mass) / mass;
          survivor.vy = ((a.vy || 0) * a.mass + (b.vy || 0) * b.mass) / mass;
          survivor.mass = mass;
          survivor.blackhole = mass >= 310;
          survivor.trail = [...(b.trail || []), ...(a.trail || [])].slice(-190);
          particles.splice(survivor === a ? j : i, 1);
          if (drag?.body === a || drag?.body === b) drag.body = survivor;
          break;
        }
      }
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const clipTop = clamp(heroBottom - scrollY, 0, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, clipTop, w, h - clipTop);
    ctx.clip();
    for (const p of particles) {
      const sy = p.y - scrollY;
      const r = radius(p.mass);
      const bh = p.blackhole || p.mass >= 310;
      if (sy < -r * 5 || sy > h + r * 5) continue;
      ctx.save();
      ctx.translate(p.x, sy);
      if (p.trail.length > 1) {
        ctx.beginPath();
        p.trail.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x - p.x, point.y - p.y);
          else ctx.lineTo(point.x - p.x, point.y - p.y);
        });
        ctx.strokeStyle = bh ? 'rgba(245,173,111,.35)' : 'rgba(155,226,212,.42)';
        ctx.lineWidth = 1.15;
        ctx.stroke();
      }
      const halo = ctx.createRadialGradient(0, 0, r * .35, 0, 0, r * (bh ? 5 : 3.6));
      halo.addColorStop(0, bh ? 'rgba(244,174,111,.25)' : 'rgba(144,227,210,.22)');
      halo.addColorStop(1, 'rgba(124,218,218,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, r * (bh ? 5 : 3.6), 0, TAU);
      ctx.fill();
      if (bh) {
        ctx.strokeStyle = 'rgba(245,173,111,.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.9, r * .62, -.25, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = '#03060a';
        ctx.beginPath();
        ctx.arc(0, 0, r * .78, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,188,124,.92)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, r * .94, 0, TAU);
        ctx.stroke();
      } else {
        const g = ctx.createRadialGradient(-r * .35, -r * .4, 1, 0, 0, r);
        g.addColorStop(0, p === drag?.body ? '#eff2d3' : '#dbefca');
        g.addColorStop(.45, '#87c9bd');
        g.addColorStop(1, '#28505a');
        ctx.fillStyle = g;
        ctx.shadowColor = 'rgba(136,220,205,.75)';
        ctx.shadowBlur = Math.min(32, r * 1.7);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(204,235,210,.58)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, r + 3, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (pointer && pointer.y >= heroBottom && now - pointer.time < 900 && !drag) {
      const py = pointer.y - scrollY;
      ctx.strokeStyle = 'rgba(168,226,215,.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pointer.x, py, 11, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  function frame(now) {
    const dt = Math.min((now - last) / 1000 || .016, .025);
    last = now;
    step(dt);
    draw(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

