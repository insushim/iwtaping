'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { soundManager } from '@/lib/sound/sound-manager';
import { pickRandom, randomBetween } from '@/lib/utils/helpers';

interface Enemy { id: number; text: string; x: number; y: number; speed: number; hp: number; color: string; }

export default function DefenseGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'menu' | 'countdown' | 'playing' | 'gameover' | 'victory'>('menu');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [gold, setGold] = useState(0);
  const [castleHp, setCastleHp] = useState(15);
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const animRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const lastSpawnRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const mod = await import('@/data/korean/words-beginner');
        const mod2 = await import('@/data/korean/words-intermediate');
        setWordPool([...mod.koreanWordsBeginner.slice(0, 50), ...mod2.koreanWordsIntermediate.slice(0, 50)]);
      } catch {
        setWordPool(['고블린', '오크', '트롤', '마법사', '드래곤', '기사', '전사', '궁수', '마법', '공격']);
      }
    })();
  }, []);

  const startGame = () => {
    setStatus('countdown');
    setScore(0); setWave(1); setGold(0); setCastleHp(15);
    setInput(''); enemiesRef.current = []; nextIdRef.current = 0;
    setCountdown(3);
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
    let hpVal = 15;

    const loop = (time: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#12122A';
      ctx.fillRect(0, 0, W, H);

      // Castle
      ctx.fillStyle = '#6C5CE7';
      ctx.fillRect(10, H / 2 - 40, 40, 80);
      ctx.fillStyle = '#A29BFE';
      ctx.beginPath();
      ctx.moveTo(10, H / 2 - 40);
      ctx.lineTo(30, H / 2 - 60);
      ctx.lineTo(50, H / 2 - 40);
      ctx.fill();

      // HP bar
      ctx.fillStyle = '#1A1A3E';
      ctx.fillRect(10, H / 2 + 50, 40, 6);
      ctx.fillStyle = hpVal > 8 ? '#00B894' : hpVal > 4 ? '#FDCB6E' : '#FF6B6B';
      ctx.fillRect(10, H / 2 + 50, 40 * (hpVal / 15), 6);

      // Spawn
      if (time - lastSpawnRef.current > Math.max(3000 - wave * 80, 1000) && enemiesRef.current.length < 2 + wave) {
        lastSpawnRef.current = time;
        const e: Enemy = {
          id: nextIdRef.current++,
          text: pickRandom(wordPool) || '적',
          x: W + 20,
          y: randomBetween(60, H - 60),
          speed: 0.2 + wave * 0.03,
          hp: 1,
          color: pickRandom(['#FF6B6B', '#FECA57', '#FD79A8']),
        };
        enemiesRef.current.push(e);
      }

      // Update enemies
      const alive: Enemy[] = [];
      for (const e of enemiesRef.current) {
        e.x -= e.speed;
        if (e.x < 60) {
          hpVal--;
          setCastleHp(hpVal);
          if (hpVal <= 0) { setStatus('gameover'); cancelAnimationFrame(animRef.current); soundManager?.play('gameOver'); return; }
          continue;
        }

        ctx.font = "bold 14px 'JetBrains Mono', 'Noto Sans KR', monospace";
        const tw = ctx.measureText(e.text).width + 16;
        ctx.fillStyle = 'rgba(30,30,74,0.9)';
        ctx.beginPath();
        ctx.roundRect(e.x - tw / 2, e.y - 14, tw, 28, 6);
        ctx.fill();
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = e.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.text, e.x, e.y);

        alive.push(e);
      }
      enemiesRef.current = alive;

      // HUD
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#E8E8FF';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}  Wave: ${wave}  Gold: ${gold}`, 20, 30);

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [status, wordPool, wave, score, gold]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const idx = enemiesRef.current.findIndex(e => e.text === input.trim());
    if (idx >= 0) {
      enemiesRef.current.splice(idx, 1);
      setScore(s => s + input.length * 10);
      setGold(g => g + 5);
      soundManager?.play('explosion');
    }
    setInput('');
  };

  if (status === 'menu') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">🏰</div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit'" }}>킹덤 디펜스</h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>성을 지키며 타이핑하세요!</p>
        <Button size="lg" onClick={startGame}>게임 시작</Button>
      </div>
    );
  }
  if (status === 'countdown') return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="text-8xl font-bold neon-text">{countdown}</div></div>;
  if (status === 'gameover') return (
    <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-error)' }}>성이 함락되었습니다!</h1>
      <Card className="p-4 max-w-xs mx-auto mb-6"><div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{score}점</div></Card>
      <Button size="lg" onClick={startGame}>다시 시작</Button>
    </div>
  );

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4">
      <div className="relative rounded-xl overflow-hidden border border-[var(--key-border)]" style={{ height: '400px' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-[var(--key-border)] text-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono'" }} placeholder="단어를 입력하세요..." autoComplete="off" autoFocus />
        <Button type="submit" size="lg">공격</Button>
      </form>
    </div>
  );
}
