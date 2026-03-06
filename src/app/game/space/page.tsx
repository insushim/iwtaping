'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { soundManager } from '@/lib/sound/sound-manager';
import { pickRandom, randomBetween } from '@/lib/utils/helpers';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface Enemy {
  id: number;
  text: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  color: string;
  typed: string;
}

export default function SpaceGamePage() {
  const { settings } = useSettingsStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'menu' | 'countdown' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [shield, setShield] = useState(8);
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const animRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const comboRef = useRef(0);
  const shieldRef = useRef(8);
  const killCountRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        if (settings.language === 'ko') {
          const mod = await import('@/data/korean/words-beginner');
          const mod2 = await import('@/data/korean/words-intermediate');
          setWordPool([...mod.koreanWordsBeginner, ...mod2.koreanWordsIntermediate].filter(w => w.length >= 2));
        } else {
          const mod = await import('@/data/english/words-common200');
          setWordPool(mod.englishCommon200.filter(w => w.length >= 3));
        }
      } catch {
        setWordPool(settings.language === 'ko'
          ? ['공격', '방어', '실드', '레이저', '파워', '스피드', '콤보', '블래스트', '포스', '별']
          : ['attack', 'defend', 'shield', 'laser', 'power', 'speed', 'combo', 'blast', 'force', 'star']);
      }
    })();
  }, [settings.language]);

  const startGame = () => {
    setStatus('countdown');
    setScore(0);
    setLevel(1);
    setCombo(0);
    setMaxCombo(0);
    setShield(8);
    setInput('');
    enemiesRef.current = [];
    nextIdRef.current = 0;
    lastSpawnRef.current = 0;
    targetRef.current = null;
    scoreRef.current = 0;
    levelRef.current = 1;
    comboRef.current = 0;
    shieldRef.current = 8;
    killCountRef.current = 0;
    setCountdown(3);
  };

  useEffect(() => {
    if (status !== 'countdown') return;
    if (countdown <= 0) { setStatus('playing'); inputRef.current?.focus(); return; }
    soundManager?.play('countdown');
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);

  useEffect(() => {
    if (status !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const cx = W / 2, cy = H - 60;

    const loop = (time: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0A0A1A';
      ctx.fillRect(0, 0, W, H);

      const currentLevel = levelRef.current;
      const currentShield = shieldRef.current;

      // Stars
      for (let i = 0; i < 50; i++) {
        const sx = (i * 73 + time * 0.01) % W;
        const sy = (i * 137 + time * 0.005) % H;
        ctx.fillStyle = `rgba(232,232,255,${0.3 + Math.sin(time * 0.002 + i) * 0.2})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Player ship
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = '#6C5CE7';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(-15, 15);
      ctx.lineTo(0, 8);
      ctx.lineTo(15, 15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#A29BFE';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Spawn enemies
      if (time - lastSpawnRef.current > Math.max(2500 - currentLevel * 80, 800)) {
        lastSpawnRef.current = time;
        if (enemiesRef.current.length < 3 + currentLevel) {
          const angle = randomBetween(0, Math.PI * 2);
          const dist = Math.max(W, H) * 0.65;
          const enemy: Enemy = {
            id: nextIdRef.current++,
            text: pickRandom(wordPool) || '적',
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist - H * 0.3,
            angle: 0,
            speed: 0.2 + currentLevel * 0.03,
            color: pickRandom(['#FF6B6B', '#00D2D3', '#FECA57', '#FD79A8']),
            typed: '',
          };
          enemy.angle = Math.atan2(cy - enemy.y, cx - enemy.x);
          enemiesRef.current.push(enemy);
        }
      }

      // Update & draw enemies
      const alive: Enemy[] = [];
      for (const e of enemiesRef.current) {
        e.x += Math.cos(e.angle) * e.speed;
        e.y += Math.sin(e.angle) * e.speed;

        const dist = Math.hypot(e.x - cx, e.y - cy);
        if (dist < 30) {
          shieldRef.current--;
          setShield(shieldRef.current);
          soundManager?.play('keyError');
          if (shieldRef.current <= 0) {
            setStatus('gameover');
            cancelAnimationFrame(animRef.current);
            soundManager?.play('gameOver');
            return;
          }
          continue;
        }

        // Draw enemy
        ctx.save();
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        const metrics = ctx.measureText(e.text);
        const bw = metrics.width + 16;
        ctx.fillStyle = 'rgba(30,30,74,0.9)';
        ctx.beginPath();
        ctx.roundRect(e.x - bw / 2, e.y - 14, bw, 28, 6);
        ctx.fill();
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = e.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.text, e.x, e.y);

        // Draw laser if targeted
        if (targetRef.current === e.id && e.typed.length > 0) {
          ctx.strokeStyle = '#00D2D3';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 20);
          ctx.lineTo(e.x, e.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.restore();

        alive.push(e);
      }
      enemiesRef.current = alive;

      // HUD
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#E8E8FF';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${scoreRef.current}  Level: ${levelRef.current}  Shield: ${'■'.repeat(Math.max(0, shieldRef.current))}${'□'.repeat(Math.max(0, 8 - shieldRef.current))}`, 20, 30);

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [status, wordPool]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const idx = enemiesRef.current.findIndex(e => e.text === input.trim());
    if (idx >= 0) {
      enemiesRef.current.splice(idx, 1);
      scoreRef.current += input.length * 15;
      setScore(scoreRef.current);
      comboRef.current += 1;
      setCombo(comboRef.current);
      setMaxCombo(m => Math.max(m, comboRef.current));
      killCountRef.current += 1;
      // Level up every 10 kills
      if (killCountRef.current % 10 === 0) {
        levelRef.current += 1;
        setLevel(levelRef.current);
      }
      soundManager?.play('explosion');
    } else {
      comboRef.current = 0;
      setCombo(0);
    }
    setInput('');
    targetRef.current = null;
  };

  if (status === 'menu') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">🚀</div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>우주 방어</h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>적 우주선의 단어를 입력해서 격파하세요!</p>
        <Button size="lg" onClick={startGame}>게임 시작</Button>
      </div>
    );
  }

  if (status === 'countdown') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-8xl font-bold neon-text" style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--color-primary)' }}>{countdown}</div>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-error)' }}>게임 오버</h1>
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
          <Card className="p-4"><div className="text-xs" style={{ color: 'var(--text-muted)' }}>점수</div><div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{score}</div></Card>
          <Card className="p-4"><div className="text-xs" style={{ color: 'var(--text-muted)' }}>레벨</div><div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-secondary)' }}>{level}</div></Card>
          <Card className="p-4"><div className="text-xs" style={{ color: 'var(--text-muted)' }}>콤보</div><div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-combo)' }}>{maxCombo}</div></Card>
        </div>
        <Button size="lg" onClick={startGame}>다시 시작</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4">
      <div className="relative rounded-xl overflow-hidden border border-[var(--key-border)]" style={{ height: '500px' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-[var(--key-border)] text-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono'" }} placeholder="단어를 입력하세요..." autoComplete="off" autoFocus />
        <Button type="submit" size="lg">발사</Button>
      </form>
    </div>
  );
}
