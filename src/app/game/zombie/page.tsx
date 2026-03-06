'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { soundManager } from '@/lib/sound/sound-manager';
import { pickRandom, randomBetween } from '@/lib/utils/helpers';

interface Zombie { id: number; text: string; x: number; y: number; angle: number; speed: number; color: string; }

export default function ZombieGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'menu' | 'countdown' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [hp, setHp] = useState(5);
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const zombiesRef = useRef<Zombie[]>([]);
  const animRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const lastSpawnRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const m = await import('@/data/english/words-common200');
        setWordPool(m.englishCommon200.filter(w => w.length >= 3 && w.length <= 8));
      } catch {
        setWordPool(['zombie', 'brain', 'attack', 'defend', 'survive', 'escape', 'fight', 'health', 'weapon', 'shield']);
      }
    })();
  }, []);

  const startGame = () => {
    setStatus('countdown'); setScore(0); setWave(1); setHp(5); setInput('');
    zombiesRef.current = []; nextIdRef.current = 0; setCountdown(3);
  };

  useEffect(() => {
    if (status !== 'countdown') return;
    if (countdown <= 0) { setStatus('playing'); inputRef.current?.focus(); return; }
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
    const cx = W / 2, cy = H / 2;
    let hpVal = 5;

    const loop = (time: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0A0A1A';
      ctx.fillRect(0, 0, W, H);

      // Player
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#6C5CE7';
      ctx.fill();
      ctx.strokeStyle = '#A29BFE';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Spawn
      if (time - lastSpawnRef.current > Math.max(2000 - wave * 80, 500)) {
        lastSpawnRef.current = time;
        if (zombiesRef.current.length < 4 + wave * 2) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.max(W, H) * 0.55;
          zombiesRef.current.push({
            id: nextIdRef.current++,
            text: pickRandom(wordPool) || 'zombie',
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            angle: Math.atan2(cy - (cy + Math.sin(angle) * dist), cx - (cx + Math.cos(angle) * dist)),
            speed: 0.4 + wave * 0.05,
            color: pickRandom(['#00B894', '#FF6B6B', '#FDCB6E']),
          });
        }
      }

      const alive: Zombie[] = [];
      for (const z of zombiesRef.current) {
        const a = Math.atan2(cy - z.y, cx - z.x);
        z.x += Math.cos(a) * z.speed;
        z.y += Math.sin(a) * z.speed;
        const dist = Math.hypot(z.x - cx, z.y - cy);
        if (dist < 25) {
          hpVal--; setHp(hpVal); soundManager?.play('keyError');
          if (hpVal <= 0) { setStatus('gameover'); cancelAnimationFrame(animRef.current); soundManager?.play('gameOver'); return; }
          continue;
        }

        // Draw zombie
        ctx.font = "bold 13px 'JetBrains Mono', monospace";
        const tw = ctx.measureText(z.text).width + 14;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(z.x - tw / 2, z.y - 12, tw, 24, 5);
        ctx.fill();
        ctx.strokeStyle = z.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = z.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(z.text, z.x, z.y);
        alive.push(z);
      }
      zombiesRef.current = alive;

      // HUD
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#E8E8FF';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}  Wave: ${wave}  HP: ${'❤️'.repeat(hpVal)}`, 20, 30);

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [status, wordPool, wave, score]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const idx = zombiesRef.current.findIndex(z => z.text === input.trim());
    if (idx >= 0) {
      zombiesRef.current.splice(idx, 1);
      setScore(s => s + input.length * 12);
      soundManager?.play('explosion');
    }
    setInput('');
  };

  if (status === 'menu') return (
    <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
      <div className="text-6xl mb-4">🧟</div>
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit'" }}>좀비 서바이벌</h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>좀비를 물리치며 생존하세요!</p>
      <Button size="lg" onClick={startGame}>게임 시작</Button>
    </div>
  );
  if (status === 'countdown') return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="text-8xl font-bold neon-text">{countdown}</div></div>;
  if (status === 'gameover') return (
    <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-error)' }}>게임 오버</h1>
      <Card className="p-4 max-w-xs mx-auto mb-6"><div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{score}점</div></Card>
      <Button size="lg" onClick={startGame}>다시 시작</Button>
    </div>
  );

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4">
      <div className="rounded-xl overflow-hidden border border-[var(--key-border)]" style={{ height: '450px' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-[var(--key-border)] text-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono'" }} placeholder="Type to shoot..." autoComplete="off" autoFocus />
        <Button type="submit" size="lg">Shoot</Button>
      </form>
    </div>
  );
}
