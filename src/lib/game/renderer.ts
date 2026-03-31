/**
 * Shared game rendering utilities - particle systems, backgrounds, effects
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'circle' | 'spark' | 'ring' | 'star' | 'smoke';
  rotation?: number;
  rotationSpeed?: number;
}

export interface Star {
  x: number;
  y: number;
  z: number; // for parallax depth
  brightness: number;
  size: number;
  twinkleSpeed: number;
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
  life: number;
}

// ===== PARTICLE SYSTEM =====
export class ParticleSystem {
  particles: Particle[] = [];
  debris: Debris[] = [];

  emit(x: number, y: number, count: number, config: Partial<{
    speed: number;
    life: number;
    size: number;
    colors: string[];
    type: Particle['type'];
    spread: number;
    angle: number;
    gravity: number;
  }> = {}) {
    const {
      speed = 3,
      life = 40,
      size = 3,
      colors = ['#FF6B6B', '#FECA57', '#FD79A8', '#00D2D3'],
      type = 'circle',
      spread = Math.PI * 2,
      angle = 0,
    } = config;

    for (let i = 0; i < count; i++) {
      const a = angle - spread / 2 + Math.random() * spread;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        maxLife: life,
        size: size * (0.5 + Math.random() * 0.5),
        color: colors[Math.floor(Math.random() * colors.length)],
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  explode(x: number, y: number, intensity: number = 1) {
    // Main explosion particles
    this.emit(x, y, Math.floor(20 * intensity), {
      speed: 5 * intensity,
      life: 35,
      size: 4,
      colors: ['#FF6B6B', '#FF9F43', '#FECA57', '#FFF'],
      type: 'circle',
    });
    // Sparks
    this.emit(x, y, Math.floor(12 * intensity), {
      speed: 7 * intensity,
      life: 25,
      size: 2,
      colors: ['#FECA57', '#FFF', '#FF6B6B'],
      type: 'spark',
    });
    // Ring
    this.emit(x, y, 1, {
      speed: 0,
      life: 20,
      size: 30 * intensity,
      colors: ['rgba(255,107,107,0.6)'],
      type: 'ring',
    });
    // Debris
    for (let i = 0; i < Math.floor(6 * intensity); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 4;
      this.debris.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        size: 2 + Math.random() * 4,
        color: ['#6C5CE7', '#A29BFE', '#DDD'][Math.floor(Math.random() * 3)],
        life: 30 + Math.random() * 20,
      });
    }
  }

  laserHit(x: number, y: number) {
    this.emit(x, y, 8, {
      speed: 3,
      life: 15,
      size: 2,
      colors: ['#00D2D3', '#48DBFB', '#FFF'],
      type: 'spark',
      spread: Math.PI,
    });
  }

  update() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life--;
      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed;
      }
      return p.life > 0;
    });

    this.debris = this.debris.filter(d => {
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.05; // gravity
      d.rotation += d.rotationSpeed;
      d.life--;
      return d.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 2, -0.5, p.size * 4, 1);
        ctx.fillRect(-0.5, -p.size * 2, 1, p.size * 4);
      } else if (p.type === 'ring') {
        const ringSize = p.size * (1 - alpha) * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, ringSize, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 * alpha;
        ctx.stroke();
      } else if (p.type === 'star') {
        drawStar(ctx, p.x, p.y, 5, p.size * alpha, p.size * alpha * 0.4, p.color);
      } else if (p.type === 'smoke') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.5 - alpha * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.3;
        ctx.fill();
      }

      ctx.restore();
    }

    // Draw debris
    for (const d of this.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.globalAlpha = Math.min(1, d.life / 15);
      ctx.fillStyle = d.color;
      ctx.fillRect(-d.size / 2, -d.size / 4, d.size, d.size / 2);
      ctx.restore();
    }
  }
}

// ===== STARFIELD =====
export function createStarfield(count: number, W: number, H: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      z: Math.random() * 3 + 0.5,
      brightness: 0.3 + Math.random() * 0.7,
      size: 0.5 + Math.random() * 2,
      twinkleSpeed: 0.001 + Math.random() * 0.003,
    });
  }
  return stars;
}

export function drawStarfield(ctx: CanvasRenderingContext2D, stars: Star[], time: number, scrollSpeed: number = 0.02) {
  for (const star of stars) {
    const y = (star.y + time * scrollSpeed * star.z) % ctx.canvas.height;
    const twinkle = 0.5 + Math.sin(time * star.twinkleSpeed + star.x) * 0.5;
    const alpha = star.brightness * twinkle;
    const size = star.size * (0.8 + twinkle * 0.4);

    ctx.beginPath();
    ctx.arc(star.x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,220,255,${alpha})`;
    ctx.fill();

    // Bright stars get a glow
    if (star.size > 1.5 && twinkle > 0.7) {
      ctx.beginPath();
      ctx.arc(star.x, y, size * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,180,255,${alpha * 0.15})`;
      ctx.fill();
    }
  }
}

// ===== NEBULA =====
export function drawNebula(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  ctx.save();
  ctx.globalAlpha = 0.06;
  const gradient1 = ctx.createRadialGradient(
    W * 0.3 + Math.sin(time * 0.0003) * 50, H * 0.4, 0,
    W * 0.3 + Math.sin(time * 0.0003) * 50, H * 0.4, 200
  );
  gradient1.addColorStop(0, '#6C5CE7');
  gradient1.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient1;
  ctx.fillRect(0, 0, W, H);

  const gradient2 = ctx.createRadialGradient(
    W * 0.7 + Math.cos(time * 0.0002) * 30, H * 0.6, 0,
    W * 0.7 + Math.cos(time * 0.0002) * 30, H * 0.6, 180
  );
  gradient2.addColorStop(0, '#00D2D3');
  gradient2.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient2;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ===== DRAW HELPERS =====
export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, points: number, outer: number, inner: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// ===== PLAYER SHIP DRAWING =====
export function drawPlayerShip(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, shieldActive: boolean = false) {
  ctx.save();
  ctx.translate(x, y);

  // Engine flame
  const flameLength = 15 + Math.sin(time * 0.02) * 5;
  const flameGrad = ctx.createLinearGradient(0, 10, 0, 10 + flameLength);
  flameGrad.addColorStop(0, '#FFF');
  flameGrad.addColorStop(0.3, '#48DBFB');
  flameGrad.addColorStop(0.6, '#6C5CE7');
  flameGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-8, 12);
  ctx.quadraticCurveTo(-4, 12 + flameLength * 0.6, 0, 12 + flameLength);
  ctx.quadraticCurveTo(4, 12 + flameLength * 0.6, 8, 12);
  ctx.closePath();
  ctx.fill();

  // Side flames
  const sideFlame = 8 + Math.sin(time * 0.03 + 1) * 3;
  ctx.fillStyle = 'rgba(108,92,231,0.5)';
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.quadraticCurveTo(-16, 8 + sideFlame * 0.5, -12, 8 + sideFlame);
  ctx.quadraticCurveTo(-11, 8 + sideFlame * 0.3, -10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.quadraticCurveTo(16, 8 + sideFlame * 0.5, 12, 8 + sideFlame);
  ctx.quadraticCurveTo(11, 8 + sideFlame * 0.3, 10, 8);
  ctx.closePath();
  ctx.fill();

  // Ship body
  ctx.fillStyle = '#4A3FAF';
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(-18, 14);
  ctx.lineTo(-12, 12);
  ctx.lineTo(0, 16);
  ctx.lineTo(12, 12);
  ctx.lineTo(18, 14);
  ctx.closePath();
  ctx.fill();

  // Ship detail overlay
  ctx.fillStyle = '#6C5CE7';
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(-10, 8);
  ctx.lineTo(0, 12);
  ctx.lineTo(10, 8);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  const cockpitGrad = ctx.createLinearGradient(0, -16, 0, -4);
  cockpitGrad.addColorStop(0, '#48DBFB');
  cockpitGrad.addColorStop(1, '#00B894');
  ctx.fillStyle = cockpitGrad;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-5, -6);
  ctx.lineTo(0, -3);
  ctx.lineTo(5, -6);
  ctx.closePath();
  ctx.fill();

  // Wing accents
  ctx.strokeStyle = '#A29BFE';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-18, 14);
  ctx.lineTo(-10, 4);
  ctx.moveTo(18, 14);
  ctx.lineTo(10, 4);
  ctx.stroke();

  // Glow
  ctx.beginPath();
  ctx.arc(0, -5, 30, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(108,92,231,0.08)';
  ctx.fill();

  // Shield effect
  if (shieldActive) {
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,210,211,${0.3 + Math.sin(time * 0.01) * 0.15})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,210,211,${0.1 + Math.sin(time * 0.015) * 0.05})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}

// ===== ENEMY SHIP TYPES =====
export function drawEnemyShip(ctx: CanvasRenderingContext2D, x: number, y: number, type: number, time: number, color: string) {
  ctx.save();
  ctx.translate(x, y);

  switch (type % 4) {
    case 0: // Scout - small fast ship
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-4, -4);
      ctx.lineTo(0, -14);
      ctx.lineTo(4, -4);
      ctx.lineTo(12, -8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Engine glow
      ctx.beginPath();
      ctx.arc(0, -16, 3 + Math.sin(time * 0.02) * 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,107,107,${0.5 + Math.sin(time * 0.03) * 0.2})`;
      ctx.fill();
      break;

    case 1: // Cruiser - medium ship
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(-16, 4);
      ctx.lineTo(-20, -8);
      ctx.lineTo(-6, -12);
      ctx.lineTo(0, -16);
      ctx.lineTo(6, -12);
      ctx.lineTo(20, -8);
      ctx.lineTo(16, 4);
      ctx.closePath();
      ctx.fill();
      // Window
      ctx.fillStyle = 'rgba(254,202,87,0.6)';
      ctx.beginPath();
      ctx.arc(0, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      // Wings detail
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-20, -8);
      ctx.lineTo(-8, 0);
      ctx.moveTo(20, -8);
      ctx.lineTo(8, 0);
      ctx.stroke();
      break;

    case 2: // Bomber - heavy ship
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-22, 2);
      ctx.lineTo(-18, -10);
      ctx.lineTo(-8, -14);
      ctx.lineTo(0, -12);
      ctx.lineTo(8, -14);
      ctx.lineTo(18, -10);
      ctx.lineTo(22, 2);
      ctx.lineTo(10, 8);
      ctx.closePath();
      ctx.fill();
      // Armor plates
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, 8);
      ctx.lineTo(-8, -4);
      ctx.lineTo(8, -4);
      ctx.lineTo(10, 8);
      ctx.stroke();
      // Engines
      ctx.fillStyle = `rgba(255,50,50,${0.4 + Math.sin(time * 0.025) * 0.2})`;
      ctx.beginPath();
      ctx.arc(-14, -12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(14, -12, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 3: // Interceptor - sleek ship
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(-6, 6);
      ctx.lineTo(-24, 0);
      ctx.lineTo(-8, -6);
      ctx.lineTo(0, -18);
      ctx.lineTo(8, -6);
      ctx.lineTo(24, 0);
      ctx.lineTo(6, 6);
      ctx.closePath();
      ctx.fill();
      // Center detail
      ctx.fillStyle = 'rgba(0,210,211,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, -2, 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wing tips
      ctx.fillStyle = `rgba(253,121,168,${0.3 + Math.sin(time * 0.02) * 0.15})`;
      ctx.beginPath();
      ctx.arc(-24, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(24, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

// ===== LASER BEAM =====
export function drawLaser(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, time: number, color: string = '#00D2D3') {
  ctx.save();
  // Outer glow
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.2 + Math.sin(time * 0.05) * 0.1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Core beam
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Hit point glow
  ctx.beginPath();
  ctx.arc(x2, y2, 6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,210,211,${0.3 + Math.sin(time * 0.04) * 0.15})`;
  ctx.fill();

  ctx.restore();
}

// ===== MISSILE =====
export function drawMissile(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, time: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Trail
  const trailGrad = ctx.createLinearGradient(0, 0, 20, 0);
  trailGrad.addColorStop(0, 'rgba(255,107,107,0.5)');
  trailGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = trailGrad;
  ctx.fillRect(0, -2, 20 + Math.sin(time * 0.03) * 5, 4);

  // Body
  ctx.fillStyle = '#CCC';
  ctx.fillRect(-8, -2, 12, 4);
  // Warhead
  ctx.fillStyle = '#FF6B6B';
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-8, -3);
  ctx.lineTo(-8, 3);
  ctx.closePath();
  ctx.fill();
  // Fins
  ctx.fillStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(2, -2);
  ctx.lineTo(6, -5);
  ctx.lineTo(4, -2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.lineTo(6, 5);
  ctx.lineTo(4, 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ===== SHIELD BAR =====
export function drawShieldBar(ctx: CanvasRenderingContext2D, x: number, y: number, current: number, max: number, width: number = 200) {
  const h = 12;
  const ratio = Math.max(0, current / max);
  const barColor = ratio > 0.6 ? '#00D2D3' : ratio > 0.3 ? '#FECA57' : '#FF6B6B';

  // Background
  ctx.fillStyle = 'rgba(30,30,74,0.8)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, h, 4);
  ctx.fill();

  // Fill
  if (ratio > 0) {
    const fillGrad = ctx.createLinearGradient(x, y, x + width * ratio, y);
    fillGrad.addColorStop(0, barColor);
    fillGrad.addColorStop(1, barColor + '80');
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, width * ratio, h, 4);
    ctx.fill();
  }

  // Segments
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let i = 1; i < max; i++) {
    const sx = x + (width / max) * i;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx, y + h);
    ctx.stroke();
  }

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, h, 4);
  ctx.stroke();
}

// ===== HUD =====
export function drawHUD(ctx: CanvasRenderingContext2D, stats: {
  score: number;
  level: number;
  combo: number;
  label: string;
}, W: number) {
  ctx.save();

  // Score
  ctx.font = "bold 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = '#E8E8FF';
  ctx.textAlign = 'left';
  ctx.fillText(`${stats.score}`, 20, 30);
  ctx.font = "10px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = 'rgba(232,232,255,0.5)';
  ctx.fillText('SCORE', 20, 14);

  // Level
  ctx.font = "bold 18px 'JetBrains Mono', monospace";
  ctx.fillStyle = '#A29BFE';
  ctx.textAlign = 'center';
  ctx.fillText(`${stats.label} ${stats.level}`, W / 2, 28);

  // Combo
  if (stats.combo > 1) {
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.fillStyle = '#FD79A8';
    ctx.textAlign = 'right';
    ctx.fillText(`${stats.combo}x COMBO`, W - 20, 28);
  }

  ctx.restore();
}

// ===== SCREEN SHAKE =====
export class ScreenShake {
  private intensity = 0;
  private offsetX = 0;
  private offsetY = 0;

  shake(intensity: number = 5) {
    this.intensity = intensity;
  }

  update(): { x: number; y: number } {
    if (this.intensity > 0.1) {
      this.offsetX = (Math.random() - 0.5) * this.intensity;
      this.offsetY = (Math.random() - 0.5) * this.intensity;
      this.intensity *= 0.9;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
      this.intensity = 0;
    }
    return { x: this.offsetX, y: this.offsetY };
  }
}

// ===== SPACE BACKGROUND =====
export function drawSpaceBackground(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  // Deep space gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#05051A');
  grad.addColorStop(0.5, '#0A0A2A');
  grad.addColorStop(1, '#0D0D35');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// ===== CASTLE DRAWING (for defense game) =====
export function drawCastle(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number, time: number) {
  ctx.save();
  ctx.translate(x, y);

  const hpRatio = hp / maxHp;

  // Castle base
  ctx.fillStyle = '#4A3FAF';
  ctx.fillRect(-25, -30, 50, 60);

  // Tower left
  ctx.fillRect(-35, -50, 16, 80);
  // Tower right
  ctx.fillRect(19, -50, 16, 80);

  // Battlements
  const bw = 8;
  for (let i = -35; i < 35; i += bw * 2) {
    ctx.fillStyle = '#5B4FCF';
    ctx.fillRect(i, -55, bw, 8);
  }

  // Tower tops
  ctx.fillStyle = '#6C5CE7';
  ctx.beginPath();
  ctx.moveTo(-35, -50);
  ctx.lineTo(-27, -65);
  ctx.lineTo(-19, -50);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(19, -50);
  ctx.lineTo(27, -65);
  ctx.lineTo(35, -50);
  ctx.fill();

  // Gate
  ctx.fillStyle = '#1A1A3E';
  ctx.beginPath();
  ctx.arc(0, 30, 12, Math.PI, 0);
  ctx.lineTo(12, 30);
  ctx.lineTo(-12, 30);
  ctx.fill();
  ctx.fillRect(-12, 18, 24, 12);

  // Windows
  ctx.fillStyle = hpRatio > 0.3 ? `rgba(254,202,87,${0.4 + Math.sin(time * 0.003) * 0.2})` : 'rgba(255,0,0,0.3)';
  ctx.fillRect(-8, -20, 6, 8);
  ctx.fillRect(2, -20, 6, 8);
  ctx.fillRect(-8, -5, 6, 8);
  ctx.fillRect(2, -5, 6, 8);

  // Flag
  ctx.strokeStyle = '#A29BFE';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -55);
  ctx.lineTo(0, -75);
  ctx.stroke();
  ctx.fillStyle = '#6C5CE7';
  ctx.beginPath();
  ctx.moveTo(0, -75);
  ctx.lineTo(14, -68 + Math.sin(time * 0.005) * 2);
  ctx.lineTo(0, -61);
  ctx.fill();

  // HP bar
  drawShieldBar(ctx, -30, 35, hp, maxHp, 60);

  // Damage cracks (when HP low)
  if (hpRatio < 0.5) {
    ctx.strokeStyle = 'rgba(255,107,107,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-15, -10);
    ctx.lineTo(-8, 5);
    ctx.lineTo(-12, 15);
    ctx.stroke();
    if (hpRatio < 0.25) {
      ctx.beginPath();
      ctx.moveTo(10, -25);
      ctx.lineTo(5, -10);
      ctx.lineTo(12, 0);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ===== ZOMBIE DRAWING =====
export function drawZombie(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, color: string) {
  ctx.save();
  ctx.translate(x, y);

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -6, 8, 0, Math.PI * 2);
  ctx.fill();

  // Arms (shambling)
  const armAngle = Math.sin(time * 0.005 + x) * 0.3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-14 + Math.cos(armAngle) * 4, 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(14 + Math.cos(armAngle + 1) * 4, 4);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(-3, -8, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3, -8, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ===== NEW ZOMBIE GAME VISUALS =====
export function drawZombieSprite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, variant: number, walkPhase: number, time: number) {
  ctx.save();
  ctx.translate(x, y);

  // Walking animation
  const bobY = Math.sin(walkPhase * 8) * 2;
  const armSwing = Math.sin(walkPhase * 8) * 0.4;

  ctx.translate(0, bobY);

  if (variant === 0) {
    // Standard zombie - greenish, tall
    const scale = size / 12;
    ctx.scale(scale, scale);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#2D5A27';
    ctx.fillRect(-6, 4, 12, 16);

    // Head
    ctx.fillStyle = '#3D6B32';
    ctx.beginPath();
    ctx.arc(0, -4, 8, 0, Math.PI * 2);
    ctx.fill();

    // Arms (shambling)
    ctx.strokeStyle = '#3D6B32';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(-12 + Math.cos(armSwing) * 6, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(12 + Math.cos(armSwing + Math.PI) * 6, 14);
    ctx.stroke();

    // Legs
    ctx.fillStyle = '#1A3D1A';
    const legOffset = Math.sin(walkPhase * 8) * 3;
    ctx.fillRect(-3 + legOffset, 20, 3, 8);
    ctx.fillRect(0 - legOffset, 20, 3, 8);

    // Eyes (glowing red)
    ctx.fillStyle = '#FF0000';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-3, -6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  } else if (variant === 1) {
    // Fat zombie - slower, bigger
    const scale = size / 10;
    ctx.scale(scale, scale);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (wider)
    ctx.fillStyle = '#4A2C2A';
    ctx.fillRect(-10, 4, 20, 18);

    // Head
    ctx.fillStyle = '#5A3C3A';
    ctx.beginPath();
    ctx.arc(0, -2, 10, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.strokeStyle = '#5A3C3A';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-10, 12);
    ctx.lineTo(-16 + Math.cos(armSwing * 0.7) * 4, 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 12);
    ctx.lineTo(16 + Math.cos(armSwing * 0.7 + Math.PI) * 4, 18);
    ctx.stroke();

    // Legs (stumpy)
    ctx.fillStyle = '#2A1A1A';
    const legOffset = Math.sin(walkPhase * 6) * 2;
    ctx.fillRect(-5 + legOffset, 22, 4, 6);
    ctx.fillRect(1 - legOffset, 22, 4, 6);

    // Eyes
    ctx.fillStyle = '#FF4444';
    ctx.shadowColor = '#FF4444';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(-4, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  } else {
    // Fast crawler - smaller, lower to ground
    const scale = size / 14;
    ctx.scale(scale, scale);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (elongated)
    ctx.fillStyle = '#3A2A4A';
    ctx.fillRect(-5, 6, 10, 8);

    // Head
    ctx.fillStyle = '#4A3A5A';
    ctx.beginPath();
    ctx.arc(0, 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Arms (crawling motion)
    ctx.strokeStyle = '#4A3A5A';
    ctx.lineWidth = 3;
    const crawlSwing = armSwing * 2;
    ctx.beginPath();
    ctx.moveTo(-5, 10);
    ctx.lineTo(-10 + Math.cos(crawlSwing) * 8, 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, 10);
    ctx.lineTo(10 + Math.cos(crawlSwing + Math.PI) * 8, 16);
    ctx.stroke();

    // No visible legs (crawling)

    // Eyes (yellow)
    ctx.fillStyle = '#FFFF00';
    ctx.shadowColor = '#FFFF00';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(-2.5, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2.5, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

export function drawPlayerCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, time: number, muzzleFlash: boolean = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (military green)
  ctx.fillStyle = '#4A6741';
  ctx.fillRect(-6, -2, 12, 16);

  // Head
  ctx.fillStyle = '#D4A574'; // skin tone
  ctx.beginPath();
  ctx.arc(0, -12, 6, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = '#2A3A2A';
  ctx.beginPath();
  ctx.arc(0, -14, 7, 0, Math.PI);
  ctx.fill();

  // Vest details
  ctx.fillStyle = '#3A5A3A';
  ctx.fillRect(-5, 0, 10, 2);
  ctx.fillRect(-5, 4, 10, 2);
  ctx.fillRect(-5, 8, 10, 2);

  // Arms
  ctx.fillStyle = '#4A6741';
  ctx.fillRect(-8, 2, 4, 8);
  ctx.fillRect(4, 2, 4, 8);

  // Weapon (assault rifle)
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(8, 0, 16, 3);
  ctx.fillRect(20, -1, 4, 5);

  // Weapon details
  ctx.fillStyle = '#333';
  ctx.fillRect(10, 1, 12, 1);
  ctx.fillStyle = '#666';
  ctx.fillRect(8, 0, 2, 3);

  // Muzzle flash
  if (muzzleFlash) {
    ctx.fillStyle = '#FFFF88';
    ctx.shadowColor = '#FFAA00';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(26, 1.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFAA00';
    ctx.fillRect(24, 0, 8, 3);
    ctx.shadowBlur = 0;
  }

  // Legs
  ctx.fillStyle = '#3A5A3A';
  const breathing = Math.sin(time * 0.003) * 0.5;
  ctx.fillRect(-4, 14 + breathing, 3, 10);
  ctx.fillRect(1, 14 + breathing, 3, 10);

  // Boots
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(-5, 24 + breathing, 4, 3);
  ctx.fillRect(1, 24 + breathing, 4, 3);

  ctx.restore();
}

export function drawMoonlight(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  ctx.save();

  // Night sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#0A0A2A');
  skyGrad.addColorStop(0.3, '#1A1A3A');
  skyGrad.addColorStop(1, '#2A2A4A');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 50; i++) {
    const starX = (i * 47) % W;
    const starY = (i * 73) % (H * 0.6);
    const twinkle = Math.sin(time * 0.001 + i) * 0.5 + 0.5;
    ctx.globalAlpha = twinkle * 0.8;
    ctx.beginPath();
    ctx.arc(starX, starY, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Moon
  const moonX = W * 0.8;
  const moonY = H * 0.2;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 20, moonX, moonY, 60);
  moonGlow.addColorStop(0, 'rgba(255,255,200,0.3)');
  moonGlow.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFCC';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 25, 0, Math.PI * 2);
  ctx.fill();

  // Moon craters
  ctx.fillStyle = 'rgba(200,200,180,0.3)';
  ctx.beginPath();
  ctx.arc(moonX - 8, moonY - 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(moonX + 6, moonY + 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(moonX - 3, moonY + 10, 2, 0, Math.PI * 2);
  ctx.fill();

  // Drifting clouds
  const cloudOffset = (time * 0.0005) % 1;
  ctx.fillStyle = 'rgba(40,40,80,0.4)';

  for (let i = 0; i < 3; i++) {
    const cloudX = (W * cloudOffset + i * W * 0.4) % (W + 100) - 50;
    const cloudY = H * 0.3 + Math.sin(i * 2 + time * 0.0003) * 20;

    ctx.beginPath();
    ctx.arc(cloudX, cloudY, 30, 0, Math.PI * 2);
    ctx.arc(cloudX + 25, cloudY, 35, 0, Math.PI * 2);
    ctx.arc(cloudX + 50, cloudY, 30, 0, Math.PI * 2);
    ctx.arc(cloudX + 30, cloudY - 20, 25, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawCityscape(ctx: CanvasRenderingContext2D, W: number, H: number, groundY: number) {
  ctx.save();

  // Building silhouettes
  ctx.fillStyle = '#0A0A0A';

  const buildings = [
    { x: 0, w: W * 0.15, h: 80 },
    { x: W * 0.12, w: W * 0.08, h: 120 },
    { x: W * 0.18, w: W * 0.12, h: 60 },
    { x: W * 0.28, w: W * 0.1, h: 140 },
    { x: W * 0.36, w: W * 0.14, h: 90 },
    { x: W * 0.48, w: W * 0.08, h: 110 },
    { x: W * 0.54, w: W * 0.12, h: 70 },
    { x: W * 0.64, w: W * 0.1, h: 100 },
    { x: W * 0.72, w: W * 0.13, h: 130 },
    { x: W * 0.83, w: W * 0.17, h: 85 },
  ];

  buildings.forEach(building => {
    const buildingH = Math.min(building.h, groundY * 0.8);
    ctx.fillRect(building.x, groundY - buildingH, building.w, buildingH);

    // Broken/damaged tops
    ctx.fillStyle = '#1A1A1A';
    const damage = Math.sin(building.x * 0.01) * 10;
    ctx.fillRect(building.x, groundY - buildingH, building.w, Math.max(0, damage));

    // Occasional lit windows
    ctx.fillStyle = '#FF6B6B';
    for (let i = 0; i < 3; i++) {
      if (Math.sin(building.x + i * 100) > 0.7) {
        const windowX = building.x + (i + 0.5) * building.w / 4;
        const windowY = groundY - buildingH + 20 + i * 25;
        ctx.fillRect(windowX - 2, windowY, 4, 6);
      }
    }

    ctx.fillStyle = '#0A0A0A';
  });

  // Foreground ruins/debris
  ctx.fillStyle = '#1A1A1A';
  for (let i = 0; i < 8; i++) {
    const debrisX = (i * 97 + 30) % W;
    const debrisW = 10 + (i * 13) % 20;
    const debrisH = 5 + (i * 7) % 15;
    ctx.fillRect(debrisX, groundY - debrisH, debrisW, debrisH);
  }

  ctx.restore();
}

// ===== RAIN EFFECT =====
export function drawRainEffect(ctx: CanvasRenderingContext2D, W: number, H: number, time: number, intensity: number = 1) {
  ctx.save();
  ctx.strokeStyle = 'rgba(108,92,231,0.15)';
  ctx.lineWidth = 1;
  const count = Math.floor(30 * intensity);
  for (let i = 0; i < count; i++) {
    const x = (i * 73 + time * 0.15) % W;
    const y = (i * 137 + time * 0.4) % H;
    const len = 8 + Math.sin(i) * 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y + len);
    ctx.stroke();
  }
  ctx.restore();
}

// ===== WORD BUBBLE =====
export function drawWordBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, options: {
  targeted?: boolean;
  progress?: number;
  fontSize?: number;
} = {}) {
  const { targeted = false, progress = 0, fontSize = 14 } = options;
  ctx.save();
  ctx.font = `bold ${fontSize}px 'JetBrains Mono', 'Noto Sans KR', monospace`;
  const metrics = ctx.measureText(text);
  const bw = metrics.width + 20;
  const bh = fontSize + 14;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.roundRect(x - bw / 2 + 2, y - bh / 2 + 2, bw, bh, 6);
  ctx.fill();

  // Background
  ctx.fillStyle = targeted ? 'rgba(0,210,211,0.2)' : 'rgba(20,20,60,0.9)';
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 6);
  ctx.fill();

  // Progress fill
  if (progress > 0) {
    ctx.fillStyle = 'rgba(0,210,211,0.15)';
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y - bh / 2, bw * progress, bh, 6);
    ctx.fill();
  }

  // Border
  ctx.strokeStyle = targeted ? '#00D2D3' : color;
  ctx.lineWidth = targeted ? 2 : 1.5;
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 6);
  ctx.stroke();

  // Targeted glow
  if (targeted) {
    ctx.shadowColor = '#00D2D3';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Text
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);

  ctx.restore();
}

// ===== DETAILED CASTLE DRAWING =====
export function drawCastleDetailed(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number, time: number) {
  ctx.save();
  ctx.translate(x, y);

  const hpRatio = hp / maxHp;
  const scaleFactor = 1.5; // Make castle larger

  // Main castle wall (stone texture effect)
  const wallGrad = ctx.createLinearGradient(-30 * scaleFactor, -40 * scaleFactor, 30 * scaleFactor, 40 * scaleFactor);
  wallGrad.addColorStop(0, '#5A4FCF');
  wallGrad.addColorStop(0.3, '#4A3FAF');
  wallGrad.addColorStop(0.7, '#3A2F8F');
  wallGrad.addColorStop(1, '#2A1F6F');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(-30 * scaleFactor, -40 * scaleFactor, 60 * scaleFactor, 80 * scaleFactor);

  // Stone blocks texture
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let row = -40 * scaleFactor; row < 40 * scaleFactor; row += 12) {
    for (let col = -30 * scaleFactor; col < 30 * scaleFactor; col += 18) {
      const offset = (Math.floor(row / 12) % 2) * 9;
      ctx.strokeRect(col + offset, row, 18, 12);
    }
  }

  // Left tower (round)
  ctx.fillStyle = wallGrad;
  ctx.beginPath();
  ctx.arc(-25 * scaleFactor, -10 * scaleFactor, 18 * scaleFactor, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-43 * scaleFactor, -70 * scaleFactor, 36 * scaleFactor, 60 * scaleFactor);

  // Right tower (round)
  ctx.beginPath();
  ctx.arc(25 * scaleFactor, -10 * scaleFactor, 18 * scaleFactor, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(7 * scaleFactor, -70 * scaleFactor, 36 * scaleFactor, 60 * scaleFactor);

  // Tower roofs (cone shaped)
  const roofGrad = ctx.createRadialGradient(0, -80 * scaleFactor, 0, 0, -80 * scaleFactor, 25 * scaleFactor);
  roofGrad.addColorStop(0, '#8B7ED8');
  roofGrad.addColorStop(1, '#6C5CE7');
  ctx.fillStyle = roofGrad;
  ctx.beginPath();
  ctx.moveTo(-43 * scaleFactor, -70 * scaleFactor);
  ctx.lineTo(-25 * scaleFactor, -95 * scaleFactor);
  ctx.lineTo(-7 * scaleFactor, -70 * scaleFactor);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7 * scaleFactor, -70 * scaleFactor);
  ctx.lineTo(25 * scaleFactor, -95 * scaleFactor);
  ctx.lineTo(43 * scaleFactor, -70 * scaleFactor);
  ctx.fill();

  // Battlements on main wall
  ctx.fillStyle = '#6C5CE7';
  for (let i = -25 * scaleFactor; i < 25 * scaleFactor; i += 12 * scaleFactor) {
    ctx.fillRect(i, -75 * scaleFactor, 8 * scaleFactor, 12 * scaleFactor);
  }

  // Main gate (arched)
  ctx.fillStyle = '#1A1A3E';
  ctx.beginPath();
  ctx.arc(0, 30 * scaleFactor, 18 * scaleFactor, Math.PI, 0);
  ctx.lineTo(18 * scaleFactor, 40 * scaleFactor);
  ctx.lineTo(-18 * scaleFactor, 40 * scaleFactor);
  ctx.fill();

  // Gate details (wooden planks)
  ctx.strokeStyle = '#2A1F4F';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-15 * scaleFactor, 15 * scaleFactor + i * 5);
    ctx.lineTo(15 * scaleFactor, 15 * scaleFactor + i * 5);
    ctx.stroke();
  }

  // Windows with glow
  const windowGlow = hpRatio > 0.3 ?
    `rgba(254,202,87,${0.6 + Math.sin(time * 0.003) * 0.3})` :
    'rgba(255,50,50,0.5)';

  // Main wall windows
  ctx.fillStyle = windowGlow;
  ctx.fillRect(-12 * scaleFactor, -25 * scaleFactor, 8 * scaleFactor, 10 * scaleFactor);
  ctx.fillRect(4 * scaleFactor, -25 * scaleFactor, 8 * scaleFactor, 10 * scaleFactor);
  ctx.fillRect(-12 * scaleFactor, -5 * scaleFactor, 8 * scaleFactor, 10 * scaleFactor);
  ctx.fillRect(4 * scaleFactor, -5 * scaleFactor, 8 * scaleFactor, 10 * scaleFactor);

  // Tower windows
  ctx.fillRect(-30 * scaleFactor, -30 * scaleFactor, 6 * scaleFactor, 8 * scaleFactor);
  ctx.fillRect(24 * scaleFactor, -30 * scaleFactor, 6 * scaleFactor, 8 * scaleFactor);

  // Banner/flag
  ctx.strokeStyle = '#A29BFE';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -75 * scaleFactor);
  ctx.lineTo(0, -110 * scaleFactor);
  ctx.stroke();

  // Animated flag
  ctx.fillStyle = '#8B7ED8';
  ctx.beginPath();
  ctx.moveTo(0, -110 * scaleFactor);
  const flagWave = Math.sin(time * 0.008) * 3;
  ctx.lineTo(20 * scaleFactor + flagWave, -100 * scaleFactor);
  ctx.lineTo(18 * scaleFactor + flagWave * 0.7, -90 * scaleFactor);
  ctx.lineTo(0, -95 * scaleFactor);
  ctx.fill();

  // HP bar (enhanced)
  drawShieldBar(ctx, -40 * scaleFactor, 50 * scaleFactor, hp, maxHp, 80 * scaleFactor);

  // Damage effects
  if (hpRatio < 0.6) {
    ctx.strokeStyle = 'rgba(255,107,107,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20 * scaleFactor, -15 * scaleFactor);
    ctx.lineTo(-10 * scaleFactor, 5 * scaleFactor);
    ctx.lineTo(-15 * scaleFactor, 20 * scaleFactor);
    ctx.stroke();
  }
  if (hpRatio < 0.3) {
    ctx.beginPath();
    ctx.moveTo(15 * scaleFactor, -30 * scaleFactor);
    ctx.lineTo(8 * scaleFactor, -15 * scaleFactor);
    ctx.lineTo(18 * scaleFactor, 0);
    ctx.stroke();
  }

  ctx.restore();
}

// ===== DETAILED SOLDIER ENEMY DRAWING =====
export function drawSoldierEnemy(ctx: CanvasRenderingContext2D, x: number, y: number, type: number, walkPhase: number, time: number) {
  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 15, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Walking bob animation
  const bobOffset = Math.sin(walkPhase) * 1.5;
  ctx.translate(0, bobOffset);

  // Body color based on type
  let bodyColor, armorColor, weaponColor;
  let scale = 1;

  switch (type) {
    case 0: // Swordsman
      bodyColor = '#8B4513';
      armorColor = '#A0A0A0';
      weaponColor = '#C0C0C0';
      break;
    case 1: // Spearman
      bodyColor = '#228B22';
      armorColor = '#808080';
      weaponColor = '#8B4513';
      break;
    case 2: // Knight
      bodyColor = '#4B0082';
      armorColor = '#E5E5E5';
      weaponColor = '#FFD700';
      scale = 1.3; // Bigger
      break;
    default:
      bodyColor = '#654321';
      armorColor = '#696969';
      weaponColor = '#A0A0A0';
  }

  ctx.scale(scale, scale);

  // Head (helmet)
  ctx.fillStyle = armorColor;
  ctx.beginPath();
  ctx.arc(0, -14, 7, 0, Math.PI * 2);
  ctx.fill();

  // Helmet details
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -14, 7, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  // Eye slit
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(-4, -16, 8, 2);

  // Body armor
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-6, -8, 12, 16);

  // Armor plates
  ctx.fillStyle = armorColor;
  ctx.fillRect(-7, -9, 14, 3); // Chest plate
  ctx.fillRect(-6, -3, 12, 2); // Belt

  // Walking leg animation
  const legAngle = Math.sin(walkPhase) * 0.4;

  // Left leg
  ctx.save();
  ctx.translate(-3, 8);
  ctx.rotate(legAngle);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-2, 0, 4, 10);
  // Boot
  ctx.fillStyle = armorColor;
  ctx.fillRect(-3, 8, 6, 3);
  ctx.restore();

  // Right leg
  ctx.save();
  ctx.translate(3, 8);
  ctx.rotate(-legAngle);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-2, 0, 4, 10);
  // Boot
  ctx.fillStyle = armorColor;
  ctx.fillRect(-3, 8, 6, 3);
  ctx.restore();

  // Arms and weapons
  const armSwing = Math.sin(walkPhase + Math.PI) * 0.2;

  if (type === 1) { // Spearman - long spear
    ctx.save();
    ctx.translate(6, -2);
    ctx.rotate(armSwing);
    // Spear shaft
    ctx.strokeStyle = weaponColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(20, -8);
    ctx.stroke();
    // Spear head
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.moveTo(20, -8);
    ctx.lineTo(26, -10);
    ctx.lineTo(24, -8);
    ctx.lineTo(26, -6);
    ctx.fill();
    ctx.restore();

    // Shield
    ctx.fillStyle = 'rgba(139,69,19,0.8)';
    ctx.beginPath();
    ctx.ellipse(-7, -2, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = armorColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (type === 2) { // Knight - sword and large shield
    // Large shield
    ctx.fillStyle = weaponColor;
    ctx.beginPath();
    ctx.ellipse(-9, 0, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sword
    ctx.save();
    ctx.translate(8, -2);
    ctx.rotate(armSwing);
    // Blade
    ctx.fillStyle = '#E5E5E5';
    ctx.fillRect(-1, -12, 2, 15);
    // Hilt
    ctx.fillStyle = weaponColor;
    ctx.fillRect(-3, 3, 6, 2);
    ctx.fillRect(-0.5, -2, 1, 5);
    ctx.restore();
  } else { // Swordsman - sword
    ctx.save();
    ctx.translate(7, -2);
    ctx.rotate(armSwing);
    // Blade
    ctx.fillStyle = weaponColor;
    ctx.fillRect(-0.5, -8, 1, 10);
    // Hilt
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-2, 2, 4, 1);
    ctx.fillRect(-0.5, -1, 1, 3);
    ctx.restore();

    // Small shield
    ctx.fillStyle = 'rgba(160,160,160,0.8)';
    ctx.fillRect(-8, -4, 3, 8);
  }

  // Left arm
  ctx.save();
  ctx.translate(-5, -2);
  ctx.rotate(-armSwing * 0.5);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-1, 0, 2, 8);
  ctx.restore();

  ctx.restore();
}

// ===== HIGH-QUALITY CHARACTER RENDERING =====

export function drawZombieSprite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, variant: number, walkPhase: number, time: number) {
  ctx.save();

  const scale = size / 60; // Base size 60px
  const bodyHeight = 45 * scale;
  const bodyWidth = 25 * scale;

  // Walking animation offset
  const walkOffset = Math.sin(walkPhase) * 3 * scale;
  const armSwing = Math.sin(walkPhase) * 0.3;

  // Ground shadow
  ctx.fillStyle = 'rgba(139, 69, 138, 0.3)'; // Neon purple shadow
  ctx.beginPath();
  ctx.ellipse(x, y + bodyHeight/2 + 5*scale, bodyWidth*0.8, 5*scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Variant-specific adjustments
  let bodyScale = 1;
  let legOffset = 0;
  if (variant === 1) { // Fat zombie
    bodyScale = 1.4;
  } else if (variant === 2) { // Crawler
    legOffset = 15;
    ctx.scale(1, 0.7); // Squash vertically
  }

  // Body gradient (cute neon green)
  const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyWidth);
  bodyGradient.addColorStop(0, '#7FFF7F'); // Bright neon green
  bodyGradient.addColorStop(0.7, '#50C878'); // Emerald
  bodyGradient.addColorStop(1, '#2E8B57'); // Sea green

  // Main body
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyWidth * bodyScale, bodyHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cute torn clothes (neon accents)
  ctx.fillStyle = '#E6E6FA'; // Lavender
  ctx.beginPath();
  ctx.rect(-bodyWidth/2, -5, bodyWidth, 15);
  ctx.fill();

  // Torn edges (darker overlay)
  ctx.fillStyle = '#9370DB'; // Medium slate blue
  for (let i = 0; i < 3; i++) {
    const tearX = -bodyWidth/2 + i * 8;
    ctx.beginPath();
    ctx.moveTo(tearX, -5);
    ctx.lineTo(tearX + 3, 5);
    ctx.lineTo(tearX + 6, -2);
    ctx.fill();
  }

  // Legs (with walking animation)
  const legY = bodyHeight/2 + legOffset;
  ctx.fillStyle = '#32CD32'; // Lime green

  // Left leg
  ctx.save();
  ctx.translate(-8, legY);
  ctx.rotate(Math.sin(walkPhase) * 0.2);
  ctx.beginPath();
  ctx.ellipse(0, 5, 4, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right leg
  ctx.save();
  ctx.translate(8, legY);
  ctx.rotate(-Math.sin(walkPhase) * 0.2);
  ctx.beginPath();
  ctx.ellipse(0, 5, 4, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Arms (swinging)
  ctx.fillStyle = '#32CD32';

  // Left arm
  ctx.save();
  ctx.translate(-bodyWidth/2 - 5, -5);
  ctx.rotate(armSwing);
  ctx.beginPath();
  ctx.ellipse(0, 8, 3, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right arm
  ctx.save();
  ctx.translate(bodyWidth/2 + 5, -5);
  ctx.rotate(-armSwing);
  ctx.beginPath();
  ctx.ellipse(0, 8, 3, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Head
  const headGradient = ctx.createRadialGradient(0, -bodyHeight/2 - 8, 0, 0, -bodyHeight/2 - 8, 12);
  headGradient.addColorStop(0, '#98FB98'); // Pale green
  headGradient.addColorStop(1, '#228B22'); // Forest green

  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.ellipse(0, -bodyHeight/2 - 8, 12, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cute glowing eyes (neon cyan)
  ctx.shadowColor = '#00FFFF';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#FF1493'; // Deep pink for cute factor
  ctx.beginPath();
  ctx.ellipse(-4, -bodyHeight/2 - 10, 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, -bodyHeight/2 - 10, 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Cute mouth (small smile)
  ctx.strokeStyle = '#8B008B'; // Dark magenta
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -bodyHeight/2 - 5, 3, 0, Math.PI);
  ctx.stroke();

  // Hair patches (messy but cute)
  ctx.fillStyle = '#4B0082'; // Indigo
  ctx.beginPath();
  ctx.ellipse(-6, -bodyHeight/2 - 15, 3, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, -bodyHeight/2 - 16, 2, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Small gore details (pink splashes for cuteness)
  ctx.fillStyle = '#FF69B4'; // Hot pink
  ctx.beginPath();
  ctx.ellipse(-5, 8, 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(7, -3, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawPlayerCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, time: number, muzzleFlash: boolean) {
  ctx.save();

  const scale = 1;
  const bodyHeight = 40;
  const bodyWidth = 20;

  // Ground shadow
  ctx.fillStyle = 'rgba(138, 43, 226, 0.3)'; // Blue violet shadow
  ctx.beginPath();
  ctx.ellipse(x, y + bodyHeight/2 + 3, bodyWidth*0.7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y);

  // Breathing animation
  const breathe = Math.sin(time * 0.003) * 0.5 + 1;
  ctx.scale(1, breathe);

  // Body (dark jacket with neon trim)
  const bodyGradient = ctx.createLinearGradient(0, -bodyHeight/2, 0, bodyHeight/2);
  bodyGradient.addColorStop(0, '#2E2E2E'); // Dark gray
  bodyGradient.addColorStop(0.3, '#4169E1'); // Royal blue
  bodyGradient.addColorStop(1, '#191970'); // Midnight blue

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  // Neon trim on jacket
  ctx.strokeStyle = '#00FFFF'; // Cyan
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyWidth-2, bodyHeight-2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arms
  ctx.fillStyle = '#4169E1';
  ctx.beginPath();
  ctx.ellipse(-bodyWidth/2 - 6, -5, 4, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bodyWidth/2 + 6, -5, 4, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#2F4F4F'; // Dark slate gray
  ctx.beginPath();
  ctx.ellipse(-6, bodyHeight/2 + 8, 5, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6, bodyHeight/2 + 8, 5, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head with helmet
  const headGradient = ctx.createRadialGradient(0, -bodyHeight/2 - 10, 0, 0, -bodyHeight/2 - 10, 12);
  headGradient.addColorStop(0, '#FDBCB4'); // Peach
  headGradient.addColorStop(1, '#F4A460'); // Sandy brown

  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.ellipse(0, -bodyHeight/2 - 10, 10, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = '#708090'; // Slate gray
  ctx.beginPath();
  ctx.ellipse(0, -bodyHeight/2 - 12, 12, 8, 0, 0, Math.PI);
  ctx.fill();

  // Helmet visor glow
  ctx.fillStyle = '#00FFFF';
  ctx.beginPath();
  ctx.rect(-8, -bodyHeight/2 - 15, 16, 3);
  ctx.fill();

  // Gun based on facing direction
  ctx.save();
  ctx.rotate(facing);

  // Gun barrel (metallic gradient)
  const gunGradient = ctx.createLinearGradient(0, -2, 0, 2);
  gunGradient.addColorStop(0, '#C0C0C0'); // Silver
  gunGradient.addColorStop(0.5, '#A9A9A9'); // Dark gray
  gunGradient.addColorStop(1, '#696969'); // Dim gray

  ctx.fillStyle = gunGradient;
  ctx.beginPath();
  ctx.rect(bodyWidth/2, -2, 25, 4);
  ctx.fill();

  // Gun stock
  ctx.fillStyle = '#8B4513'; // Saddle brown
  ctx.beginPath();
  ctx.rect(bodyWidth/2 - 8, -4, 12, 8);
  ctx.fill();

  // Gun grip
  ctx.fillStyle = '#2F4F4F';
  ctx.beginPath();
  ctx.rect(bodyWidth/2 - 3, 2, 6, 10);
  ctx.fill();

  // Muzzle flash effect
  if (muzzleFlash) {
    const flashGradient = ctx.createRadialGradient(bodyWidth/2 + 25, 0, 0, bodyWidth/2 + 25, 0, 15);
    flashGradient.addColorStop(0, '#FFFF00'); // Yellow
    flashGradient.addColorStop(0.5, '#FFA500'); // Orange
    flashGradient.addColorStop(1, 'rgba(255, 69, 0, 0)'); // Red orange to transparent

    ctx.fillStyle = flashGradient;
    ctx.beginPath();
    ctx.ellipse(bodyWidth/2 + 30, 0, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bright center flash
    ctx.shadowColor = '#FFFF00';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(bodyWidth/2 + 25, 0, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore(); // End gun rotation

  ctx.restore();
}

export function drawMoonlight(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  ctx.save();

  // Dark sky gradient (cyberpunk night)
  const skyGradient = ctx.createLinearGradient(0, 0, 0, H);
  skyGradient.addColorStop(0, '#0B0B2F'); // Very dark blue
  skyGradient.addColorStop(0.3, '#1A1A3A'); // Dark purple
  skyGradient.addColorStop(0.7, '#2D1B69'); // Medium purple
  skyGradient.addColorStop(1, '#4B0082'); // Indigo

  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, W, H);

  // Stars (twinkling)
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 100; i++) {
    const starX = (i * 127 + 50) % W;
    const starY = (i * 89 + 30) % (H * 0.6);
    const twinkle = Math.sin(time * 0.002 + i) * 0.5 + 0.5;
    const size = (0.5 + twinkle) * (1 + Math.sin(i) * 0.5);

    ctx.globalAlpha = twinkle;
    ctx.beginPath();
    ctx.ellipse(starX, starY, size, size, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Large detailed moon
  const moonX = W * 0.8;
  const moonY = H * 0.2;
  const moonRadius = 40;

  // Moon glow
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 3);
  moonGlow.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  moonGlow.addColorStop(0.5, 'rgba(173, 216, 230, 0.1)'); // Light blue
  moonGlow.addColorStop(1, 'rgba(173, 216, 230, 0)');

  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.ellipse(moonX, moonY, moonRadius * 3, moonRadius * 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Moon surface
  const moonGradient = ctx.createRadialGradient(moonX - 10, moonY - 10, 0, moonX, moonY, moonRadius);
  moonGradient.addColorStop(0, '#F5F5DC'); // Beige
  moonGradient.addColorStop(0.7, '#E6E6FA'); // Lavender
  moonGradient.addColorStop(1, '#D3D3D3'); // Light gray

  ctx.fillStyle = moonGradient;
  ctx.beginPath();
  ctx.ellipse(moonX, moonY, moonRadius, moonRadius, 0, 0, Math.PI * 2);
  ctx.fill();

  // Moon craters (cute spots)
  ctx.fillStyle = '#C0C0C0';
  const craters = [[10, -5, 4], [-8, 8, 3], [5, 12, 5], [-15, -10, 2]];
  craters.forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.ellipse(moonX + cx, moonY + cy, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Drifting clouds (semi-transparent, moving)
  const cloudOffset = (time * 0.0001) % 1;

  for (let i = 0; i < 3; i++) {
    const cloudX = ((i * 0.4 + cloudOffset) % 1.2 - 0.1) * W;
    const cloudY = H * 0.4 + i * 40;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';

    // Cloud puffs
    for (let j = 0; j < 5; j++) {
      const puffX = cloudX + j * 15 - 30;
      const puffY = cloudY + Math.sin(j) * 5;
      const puffSize = 20 + Math.sin(j) * 8;

      ctx.beginPath();
      ctx.ellipse(puffX, puffY, puffSize, puffSize * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Eerie ambient light near horizon (cyberpunk glow)
  const horizonGradient = ctx.createLinearGradient(0, H * 0.8, 0, H);
  horizonGradient.addColorStop(0, 'rgba(0, 255, 127, 0.1)'); // Spring green
  horizonGradient.addColorStop(0.5, 'rgba(138, 43, 226, 0.15)'); // Blue violet
  horizonGradient.addColorStop(1, 'rgba(75, 0, 130, 0.2)'); // Indigo

  ctx.fillStyle = horizonGradient;
  ctx.fillRect(0, H * 0.8, W, H * 0.2);

  // Fog/mist layer
  const fogGradient = ctx.createLinearGradient(0, H * 0.9, 0, H);
  fogGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  fogGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');

  ctx.fillStyle = fogGradient;
  ctx.fillRect(0, H * 0.9, W, H * 0.1);

  ctx.restore();
}

export function drawCityscape(ctx: CanvasRenderingContext2D, W: number, H: number, groundY: number) {
  ctx.save();

  // Distant layer (smaller, more faded)
  ctx.fillStyle = 'rgba(25, 25, 112, 0.6)'; // Midnight blue with transparency
  const distantBuildings = [
    [0.1, 0.3, 0.4], [0.15, 0.25, 0.35], [0.25, 0.4, 0.5], [0.35, 0.2, 0.3],
    [0.45, 0.35, 0.45], [0.55, 0.3, 0.4], [0.7, 0.25, 0.35], [0.8, 0.4, 0.5]
  ];

  distantBuildings.forEach(([xRatio, heightRatio, widthRatio]) => {
    const x = W * xRatio;
    const width = W * widthRatio * 0.1;
    const height = H * heightRatio;

    ctx.fillRect(x, groundY - height, width, height);

    // Small distant windows
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'; // Dim yellow
    for (let row = 0; row < Math.floor(height / 15); row++) {
      for (let col = 0; col < Math.floor(width / 8); col++) {
        if (Math.random() > 0.7) {
          ctx.fillRect(x + col * 8 + 2, groundY - height + row * 15 + 3, 4, 8);
        }
      }
    }
    ctx.fillStyle = 'rgba(25, 25, 112, 0.6)';
  });

  // Near layer (bigger, darker)
  ctx.fillStyle = '#1C1C1C'; // Very dark gray
  const nearBuildings = [
    [0.05, 0.6, 0.15, false], [0.25, 0.5, 0.12, true], [0.4, 0.7, 0.18, false],
    [0.65, 0.45, 0.14, true], [0.85, 0.65, 0.16, false]
  ];

  nearBuildings.forEach(([xRatio, heightRatio, widthRatio, leaning]) => {
    const x = W * xRatio;
    const width = W * widthRatio;
    const height = H * heightRatio;

    ctx.save();
    if (leaning) {
      ctx.translate(x + width/2, groundY);
      ctx.rotate(0.1); // Slight lean
      ctx.translate(-width/2, -height);
    }

    // Main building
    const buildingGradient = ctx.createLinearGradient(0, 0, width, 0);
    buildingGradient.addColorStop(0, '#1C1C1C');
    buildingGradient.addColorStop(0.5, '#2F2F2F');
    buildingGradient.addColorStop(1, '#1C1C1C');

    ctx.fillStyle = buildingGradient;
    ctx.fillRect(leaning ? 0 : x, leaning ? 0 : groundY - height, width, height);

    // Broken windows (bright neon spots)
    const windowColors = ['#00FFFF', '#FF1493', '#7FFF00', '#FF6347']; // Cyberpunk colors

    for (let row = 0; row < Math.floor(height / 20); row++) {
      for (let col = 0; col < Math.floor(width / 15); col++) {
        if (Math.random() > 0.6) {
          const windowColor = windowColors[Math.floor(Math.random() * windowColors.length)];
          ctx.fillStyle = windowColor;

          const wx = (leaning ? 0 : x) + col * 15 + 3;
          const wy = (leaning ? 0 : groundY - height) + row * 20 + 5;

          ctx.fillRect(wx, wy, 8, 12);

          // Window glow
          ctx.shadowColor = windowColor;
          ctx.shadowBlur = 5;
          ctx.fillRect(wx, wy, 8, 12);
          ctx.shadowBlur = 0;
        }
      }
    }

    // Building damage (missing chunks for low buildings)
    if (heightRatio < 0.6) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.clearRect(
        (leaning ? 0 : x) + width * 0.7,
        (leaning ? 0 : groundY - height) + height * 0.3,
        width * 0.2,
        height * 0.4
      );
    }

    ctx.restore();
  });

  // Ground line with cyberpunk glow
  ctx.strokeStyle = '#FF1493'; // Deep pink
  ctx.lineWidth = 2;
  ctx.shadowColor = '#FF1493';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(W, groundY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

export function drawSoldierEnemy(ctx: CanvasRenderingContext2D, x: number, y: number, type: number, walkPhase: number, time: number) {
  ctx.save();

  const scale = 1;
  const bodyHeight = 35;
  const bodyWidth = 18;

  // Walking animation
  const legOffset = Math.sin(walkPhase) * 4;
  const armSwing = Math.sin(walkPhase + Math.PI) * 0.2;

  // Ground shadow (neon purple)
  ctx.fillStyle = 'rgba(147, 112, 219, 0.4)'; // Medium slate blue
  ctx.beginPath();
  ctx.ellipse(x, y + bodyHeight/2 + 3, bodyWidth*0.6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y);

  // Type-specific colors and sizes
  let armorColor, weaponColor, helmetStyle;
  let sizeMultiplier = 1;

  if (type === 0) { // Swordsman
    armorColor = '#4169E1'; // Royal blue
    weaponColor = '#C0C0C0'; // Silver
    helmetStyle = 'basic';
  } else if (type === 1) { // Spearman
    armorColor = '#32CD32'; // Lime green
    weaponColor = '#8B4513'; // Saddle brown
    helmetStyle = 'pointed';
  } else { // Knight (type === 2)
    armorColor = '#FFD700'; // Gold
    weaponColor = '#C0C0C0'; // Silver
    helmetStyle = 'full';
    sizeMultiplier = 1.3;
  }

  ctx.scale(sizeMultiplier, sizeMultiplier);

  // Legs with walking animation
  ctx.fillStyle = armorColor;

  // Left leg
  ctx.save();
  ctx.translate(-6, bodyHeight/2 + 5);
  ctx.rotate(Math.sin(walkPhase) * 0.3);
  ctx.beginPath();
  ctx.ellipse(0, 5, 4, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right leg
  ctx.save();
  ctx.translate(6, bodyHeight/2 + 5);
  ctx.rotate(-Math.sin(walkPhase) * 0.3);
  ctx.beginPath();
  ctx.ellipse(0, 5, 4, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Main body with gradient shading
  const bodyGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, bodyWidth);
  bodyGradient.addColorStop(0, armorColor);
  bodyGradient.addColorStop(0.7, armorColor);
  bodyGradient.addColorStop(1, '#2F4F4F'); // Dark slate gray

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  // Armor details (neon trim)
  ctx.strokeStyle = '#00FFFF'; // Cyan trim
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -5, bodyWidth - 3, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 5, bodyWidth - 3, 0, Math.PI);
  ctx.stroke();

  // Arms
  ctx.fillStyle = armorColor;

  // Left arm (swinging)
  ctx.save();
  ctx.translate(-bodyWidth/2 - 4, -3);
  ctx.rotate(armSwing);
  ctx.beginPath();
  ctx.ellipse(0, 6, 3, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right arm (holding weapon)
  ctx.save();
  ctx.translate(bodyWidth/2 + 4, -3);
  ctx.rotate(-armSwing * 0.5);
  ctx.beginPath();
  ctx.ellipse(0, 6, 3, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Weapon based on type
  ctx.save();
  ctx.translate(bodyWidth/2 + 8, 2);
  ctx.rotate(-armSwing * 0.5);

  if (type === 0) { // Sword + Shield
    // Sword
    const swordGradient = ctx.createLinearGradient(0, -15, 0, -5);
    swordGradient.addColorStop(0, '#E6E6FA'); // Lavender
    swordGradient.addColorStop(1, weaponColor);

    ctx.fillStyle = swordGradient;
    ctx.beginPath();
    ctx.rect(-1, -15, 2, 20);
    ctx.fill();

    // Sword hilt
    ctx.fillStyle = '#8B4513'; // Saddle brown
    ctx.beginPath();
    ctx.rect(-3, 5, 6, 3);
    ctx.fill();

    // Small shield on other arm
    ctx.save();
    ctx.translate(-bodyWidth - 6, -2);
    ctx.fillStyle = armorColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFD700'; // Gold trim
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

  } else if (type === 1) { // Spear
    // Long spear shaft
    ctx.fillStyle = weaponColor;
    ctx.beginPath();
    ctx.rect(-1, -25, 2, 35);
    ctx.fill();

    // Spear tip
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(-2, -20);
    ctx.lineTo(2, -20);
    ctx.closePath();
    ctx.fill();

  } else { // Knight weapon (large sword)
    // Large sword
    const largeSwordGradient = ctx.createLinearGradient(0, -20, 0, -5);
    largeSwordGradient.addColorStop(0, '#E6E6FA');
    largeSwordGradient.addColorStop(1, weaponColor);

    ctx.fillStyle = largeSwordGradient;
    ctx.beginPath();
    ctx.rect(-2, -20, 4, 25);
    ctx.fill();

    // Large hilt
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.rect(-4, 5, 8, 4);
    ctx.fill();
  }

  ctx.restore(); // End weapon drawing

  // Head based on helmet style
  ctx.fillStyle = '#FDBCB4'; // Peach skin tone
  ctx.beginPath();
  ctx.ellipse(0, -bodyHeight/2 - 8, 8, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  if (helmetStyle === 'basic') {
    ctx.fillStyle = '#696969'; // Dim gray
    ctx.beginPath();
    ctx.ellipse(0, -bodyHeight/2 - 10, 9, 6, 0, 0, Math.PI);
    ctx.fill();
  } else if (helmetStyle === 'pointed') {
    ctx.fillStyle = '#556B2F'; // Dark olive green
    ctx.beginPath();
    ctx.ellipse(0, -bodyHeight/2 - 10, 9, 6, 0, 0, Math.PI);
    ctx.fill();
    // Point on top
    ctx.beginPath();
    ctx.moveTo(0, -bodyHeight/2 - 16);
    ctx.lineTo(-3, -bodyHeight/2 - 12);
    ctx.lineTo(3, -bodyHeight/2 - 12);
    ctx.closePath();
    ctx.fill();
  } else { // Full helmet
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(0, -bodyHeight/2 - 8, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet visor
    ctx.fillStyle = '#2F4F4F';
    ctx.beginPath();
    ctx.rect(-6, -bodyHeight/2 - 10, 12, 4);
    ctx.fill();
  }

  // Eyes (if visible)
  if (helmetStyle !== 'full') {
    ctx.fillStyle = '#FF1493'; // Deep pink for cute factor
    ctx.beginPath();
    ctx.ellipse(-2, -bodyHeight/2 - 9, 1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2, -bodyHeight/2 - 9, 1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawCastleDetailed(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number, time: number) {
  ctx.save();

  const castleWidth = 120;
  const castleHeight = 80;
  const hpRatio = hp / maxHp;

  // Ground shadow
  ctx.fillStyle = 'rgba(75, 0, 130, 0.3)'; // Indigo shadow
  ctx.beginPath();
  ctx.ellipse(x, y + castleHeight/2 + 5, castleWidth*0.8, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y);

  // Defensive wall (front)
  const wallGradient = ctx.createLinearGradient(0, 0, 0, castleHeight/4);
  wallGradient.addColorStop(0, '#708090'); // Slate gray
  wallGradient.addColorStop(1, '#2F4F4F'); // Dark slate gray

  ctx.fillStyle = wallGradient;
  ctx.beginPath();
  ctx.rect(-castleWidth/2 - 10, castleHeight/3, castleWidth + 20, castleHeight/4);
  ctx.fill();

  // Main castle body with stone brick texture
  const mainGradient = ctx.createLinearGradient(-castleWidth/2, 0, castleWidth/2, 0);
  mainGradient.addColorStop(0, '#A9A9A9'); // Dark gray
  mainGradient.addColorStop(0.5, '#D3D3D3'); // Light gray
  mainGradient.addColorStop(1, '#A9A9A9'); // Dark gray

  ctx.fillStyle = mainGradient;
  ctx.beginPath();
  ctx.rect(-castleWidth/2, -castleHeight/2, castleWidth, castleHeight);
  ctx.fill();

  // Stone brick texture pattern
  ctx.strokeStyle = 'rgba(105, 105, 105, 0.5)'; // Dim gray
  ctx.lineWidth = 0.5;

  // Horizontal lines
  for (let i = 0; i < castleHeight; i += 10) {
    ctx.beginPath();
    ctx.moveTo(-castleWidth/2, -castleHeight/2 + i);
    ctx.lineTo(castleWidth/2, -castleHeight/2 + i);
    ctx.stroke();
  }

  // Vertical lines (staggered for brick pattern)
  for (let i = 0; i < castleWidth; i += 15) {
    for (let j = 0; j < castleHeight; j += 20) {
      const offset = (Math.floor(j/10) % 2) * 7.5; // Stagger alternate rows
      ctx.beginPath();
      ctx.moveTo(-castleWidth/2 + i + offset, -castleHeight/2 + j);
      ctx.lineTo(-castleWidth/2 + i + offset, -castleHeight/2 + j + 10);
      ctx.stroke();
    }
  }

  // Towers with conical roofs
  const towerPositions = [-40, -10, 10, 40];
  towerPositions.forEach((towerX, index) => {
    const towerHeight = 30 + (index % 2) * 10;

    // Tower body
    const towerGradient = ctx.createRadialGradient(towerX - 5, -castleHeight/2 - towerHeight/2, 0, towerX, -castleHeight/2 - towerHeight/2, 10);
    towerGradient.addColorStop(0, '#B0C4DE'); // Light steel blue
    towerGradient.addColorStop(1, '#778899'); // Light slate gray

    ctx.fillStyle = towerGradient;
    ctx.beginPath();
    ctx.rect(towerX - 8, -castleHeight/2 - towerHeight, 16, towerHeight);
    ctx.fill();

    // Conical roof
    const roofGradient = ctx.createLinearGradient(towerX - 12, -castleHeight/2 - towerHeight - 15, towerX + 12, -castleHeight/2 - towerHeight - 15);
    roofGradient.addColorStop(0, '#8B0000'); // Dark red
    roofGradient.addColorStop(0.5, '#DC143C'); // Crimson
    roofGradient.addColorStop(1, '#8B0000'); // Dark red

    ctx.fillStyle = roofGradient;
    ctx.beginPath();
    ctx.moveTo(towerX, -castleHeight/2 - towerHeight - 20);
    ctx.lineTo(towerX - 12, -castleHeight/2 - towerHeight);
    ctx.lineTo(towerX + 12, -castleHeight/2 - towerHeight);
    ctx.closePath();
    ctx.fill();

    // Tower torch (animated)
    const flameFlicker = Math.sin(time * 0.01 + index) * 2 + 8;

    // Torch base
    ctx.fillStyle = '#8B4513'; // Saddle brown
    ctx.beginPath();
    ctx.rect(towerX + 6, -castleHeight/2 - towerHeight + 10, 2, 15);
    ctx.fill();

    // Flame
    const flameGradient = ctx.createRadialGradient(towerX + 7, -castleHeight/2 - towerHeight + 10, 0, towerX + 7, -castleHeight/2 - towerHeight + 10, flameFlicker);
    flameGradient.addColorStop(0, '#FFFF00'); // Yellow
    flameGradient.addColorStop(0.5, '#FFA500'); // Orange
    flameGradient.addColorStop(1, '#FF4500'); // Red orange

    ctx.fillStyle = flameGradient;
    ctx.beginPath();
    ctx.ellipse(towerX + 7, -castleHeight/2 - towerHeight + 5, 3, flameFlicker, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flame glow
    ctx.shadowColor = '#FFA500';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(towerX + 7, -castleHeight/2 - towerHeight + 5, 2, flameFlicker * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Beautiful stained glass windows (glowing)
  const windowPositions = [[-25, -10], [0, -15], [25, -10]];
  windowPositions.forEach(([wx, wy], index) => {
    const colors = ['#FF1493', '#00FFFF', '#7FFF00']; // Deep pink, cyan, chartreuse
    const windowColor = colors[index];

    // Window glow
    ctx.shadowColor = windowColor;
    ctx.shadowBlur = 15;

    // Window frame
    ctx.fillStyle = '#2F4F4F'; // Dark slate gray
    ctx.beginPath();
    ctx.rect(wx - 6, wy - 8, 12, 16);
    ctx.fill();

    // Colored glass
    ctx.fillStyle = windowColor;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.rect(wx - 4, wy - 6, 8, 12);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Glass cross pattern
    ctx.strokeStyle = '#2F4F4F';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wx, wy - 6);
    ctx.lineTo(wx, wy + 6);
    ctx.moveTo(wx - 4, wy);
    ctx.lineTo(wx + 4, wy);
    ctx.stroke();

    ctx.shadowBlur = 0;
  });

  // Waving flag with cloth physics
  const flagPole = 35;
  const flagX = flagPole;
  const flagY = -castleHeight/2 - 35;

  // Flag pole
  ctx.fillStyle = '#8B4513'; // Saddle brown
  ctx.beginPath();
  ctx.rect(flagX, flagY, 2, 30);
  ctx.fill();

  // Flag cloth (multiple points for wave effect)
  const flagPoints = [];
  const flagWidth = 20;
  const flagHeight = 12;

  for (let i = 0; i <= 8; i++) {
    const waveX = flagX + 2 + (i / 8) * flagWidth;
    const waveY = flagY + Math.sin(time * 0.008 + i * 0.5) * 2;
    flagPoints.push([waveX, waveY]);
  }

  // Flag fabric
  ctx.fillStyle = '#FFD700'; // Gold
  ctx.beginPath();
  ctx.moveTo(flagX + 2, flagY);
  flagPoints.forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.lineTo(flagX + 2 + flagWidth, flagY + flagHeight);
  ctx.lineTo(flagX + 2, flagY + flagHeight);
  ctx.closePath();
  ctx.fill();

  // Flag emblem
  ctx.fillStyle = '#8B0000'; // Dark red
  ctx.beginPath();
  ctx.ellipse(flagX + 12, flagY + 6, 3, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Portcullis gate detail
  ctx.fillStyle = '#2F4F4F'; // Dark slate gray
  ctx.beginPath();
  ctx.rect(-8, castleHeight/3, 16, castleHeight/4);
  ctx.fill();

  // Iron grid pattern
  ctx.strokeStyle = '#696969'; // Dim gray
  ctx.lineWidth = 2;

  // Vertical bars
  for (let i = -6; i <= 6; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, castleHeight/3 + 2);
    ctx.lineTo(i, castleHeight/3 + castleHeight/4 - 2);
    ctx.stroke();
  }

  // Horizontal bars
  for (let i = 3; i < castleHeight/4 - 2; i += 4) {
    ctx.beginPath();
    ctx.moveTo(-6, castleHeight/3 + i);
    ctx.lineTo(6, castleHeight/3 + i);
    ctx.stroke();
  }

  // HP-based damage
  if (hpRatio < 0.7) {
    // Cracks on walls
    ctx.strokeStyle = '#2F4F4F';
    ctx.lineWidth = 2;

    const cracks = [
      [[-30, -20], [-25, -10], [-20, -5]],
      [[15, -25], [20, -15], [25, -8]],
      [[-10, 10], [-5, 20], [0, 25]]
    ];

    cracks.forEach(crack => {
      ctx.beginPath();
      crack.forEach(([cx, cy], index) => {
        if (index === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    });
  }

  if (hpRatio < 0.4) {
    // Missing bricks (dark patches)
    ctx.fillStyle = '#1C1C1C';
    ctx.beginPath();
    ctx.rect(-45, -10, 8, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(20, 5, 6, 8);
    ctx.fill();
  }

  if (hpRatio < 0.2) {
    // Smoke from damage
    ctx.fillStyle = 'rgba(105, 105, 105, 0.6)'; // Dim gray smoke

    for (let i = 0; i < 3; i++) {
      const smokeX = -30 + i * 20;
      const smokeY = -castleHeight/2 - 10 + Math.sin(time * 0.003 + i) * 5;
      const smokeSize = 8 + Math.sin(time * 0.005 + i) * 3;

      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(smokeX, smokeY, smokeSize, smokeSize * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
