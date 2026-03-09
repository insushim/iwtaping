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
