// Canvas-based confetti system
export interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  wind: number;
}

const CONFETTI_COLORS = [
  '#6C5CE7', '#A29BFE', '#00D2D3', '#48DBFB',
  '#FF6B6B', '#FECA57', '#00B894', '#FD79A8',
  '#FF9F43', '#55E6C1', '#F368E0', '#FFD93D',
];

export function createConfettiPiece(canvasWidth: number, canvasHeight: number): ConfettiPiece {
  return {
    x: Math.random() * canvasWidth,
    y: -10 - Math.random() * canvasHeight * 0.3,
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * 3 + 1,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    width: Math.random() * 8 + 4,
    height: Math.random() * 4 + 2,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    life: 0,
    maxLife: 120 + Math.random() * 60,
    gravity: 0.08 + Math.random() * 0.04,
    wind: (Math.random() - 0.5) * 0.3,
  };
}

export function updateConfettiPiece(piece: ConfettiPiece): boolean {
  piece.life++;
  if (piece.life > piece.maxLife) return false;

  piece.vy += piece.gravity;
  piece.vx += piece.wind;
  piece.x += piece.vx;
  piece.y += piece.vy;
  piece.rotation += piece.rotationSpeed;

  // Air resistance
  piece.vx *= 0.99;
  piece.rotationSpeed *= 0.998;

  return true;
}

export function drawConfettiPiece(ctx: CanvasRenderingContext2D, piece: ConfettiPiece) {
  const alpha = Math.max(0, 1 - piece.life / piece.maxLife);
  ctx.save();
  ctx.translate(piece.x, piece.y);
  ctx.rotate((piece.rotation * Math.PI) / 180);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = piece.color;
  ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
  ctx.restore();
}

export class ConfettiSystem {
  private pieces: ConfettiPiece[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrame: number = 0;
  private running = false;

  mount(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  unmount() {
    window.removeEventListener('resize', this.resize);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.canvas?.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.canvas = null;
    this.ctx = null;
    this.running = false;
  }

  private resize = () => {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    if (this.ctx) this.ctx.scale(dpr, dpr);
  };

  burst(count = 80) {
    if (!this.canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < count; i++) {
      const piece = createConfettiPiece(w, h);
      // Override for burst - start from center top
      piece.x = w / 2 + (Math.random() - 0.5) * w * 0.6;
      piece.y = h * 0.2 + (Math.random() - 0.5) * h * 0.2;
      piece.vx = (Math.random() - 0.5) * 12;
      piece.vy = -(Math.random() * 8 + 2);
      this.pieces.push(piece);
    }
    if (!this.running) this.loop();
  }

  rain(count = 60) {
    if (!this.canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < count; i++) {
      this.pieces.push(createConfettiPiece(w, h));
    }
    if (!this.running) this.loop();
  }

  private loop = () => {
    if (!this.ctx || !this.canvas) return;
    this.running = true;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.ctx.clearRect(0, 0, w, h);

    this.pieces = this.pieces.filter(piece => {
      const alive = updateConfettiPiece(piece);
      if (alive && piece.y < h + 20) {
        drawConfettiPiece(this.ctx!, piece);
        return true;
      }
      return false;
    });

    if (this.pieces.length > 0) {
      this.animFrame = requestAnimationFrame(this.loop);
    } else {
      this.running = false;
    }
  };
}

// Singleton
let instance: ConfettiSystem | null = null;

export function getConfetti(): ConfettiSystem {
  if (!instance) {
    instance = new ConfettiSystem();
    if (typeof document !== 'undefined') {
      instance.mount(document.body);
    }
  }
  return instance;
}
