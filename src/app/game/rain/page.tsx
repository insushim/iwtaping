'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGameStore } from '@/stores/useGameStore';
import { soundManager } from '@/lib/sound/sound-manager';
import { pickRandom, randomBetween } from '@/lib/utils/helpers';

interface FallingWord {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  color: string;
}

const COLORS = ['#6C5CE7', '#00D2D3', '#FF6B6B', '#FECA57', '#00B894', '#FD79A8'];

export default function RainGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'menu' | 'countdown' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [ph, setPh] = useState(10.0);
  const [input, setInput] = useState('');
  const [words, setWords] = useState<FallingWord[]>([]);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(3);
  const wordsRef = useRef<FallingWord[]>([]);
  const animFrameRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const lastSpawnRef = useRef(0);

  // Load word pool
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('@/data/korean/words-beginner');
        const mod2 = await import('@/data/korean/words-intermediate');
        setWordPool([...mod.koreanWordsBeginner, ...mod2.koreanWordsIntermediate]);
      } catch {
        setWordPool(['사과', '바다', '하늘', '나무', '구름', '별빛', '노을', '달빛', '마음', '사랑', '희망', '음악', '여행', '자동차', '컴퓨터', '프로그램']);
      }
    })();
  }, []);

  const startGame = () => {
    setStatus('countdown');
    setScore(0);
    setLevel(1);
    setCombo(0);
    setMaxCombo(0);
    setPh(7.0);
    setInput('');
    wordsRef.current = [];
    setWords([]);
    nextIdRef.current = 0;
    lastSpawnRef.current = 0;
    setCountdown(3);
  };

  // Countdown
  useEffect(() => {
    if (status !== 'countdown') return;
    if (countdown <= 0) {
      setStatus('playing');
      inputRef.current?.focus();
      return;
    }
    soundManager?.play('countdown');
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);

  // Game loop
  useEffect(() => {
    if (status !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    let phVal = 10.0;
    let scoreVal = 0;
    let levelVal = 1;
    let comboVal = 0;

    const spawnWord = (now: number) => {
      if (now - lastSpawnRef.current < Math.max(1200 - levelVal * 40, 500)) return;
      lastSpawnRef.current = now;
      if (wordsRef.current.length >= 2 + levelVal) return;

      const text = pickRandom(wordPool) || '단어';
      const word: FallingWord = {
        id: nextIdRef.current++,
        text,
        x: randomBetween(50, W - 100),
        y: -30,
        speed: 0.2 + levelVal * 0.05 + Math.random() * 0.15,
        color: pickRandom(COLORS),
      };
      wordsRef.current.push(word);
    };

    const loop = (time: number) => {
      ctx.clearRect(0, 0, W, H);

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0A0A1A');
      grad.addColorStop(1, '#12122A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Rain particles
      for (let i = 0; i < 3; i++) {
        const rx = Math.random() * W;
        const ry = (time * 0.1 + i * 200) % H;
        ctx.fillStyle = 'rgba(108,92,231,0.1)';
        ctx.fillRect(rx, ry, 1, 10);
      }

      spawnWord(time);

      // Update words
      const alive: FallingWord[] = [];
      for (const word of wordsRef.current) {
        word.y += word.speed;

        // Check if hit ground
        if (word.y > H - 40) {
          phVal -= 0.3;
          setPh(phVal);
          soundManager?.play('keyError');
          if (phVal <= 0) {
            setStatus('gameover');
            cancelAnimationFrame(animFrameRef.current);
            soundManager?.play('gameOver');
            return;
          }
          continue;
        }

        // Draw word bubble
        ctx.save();
        const metrics = ctx.measureText(word.text);
        const padding = 12;
        const bubbleW = metrics.width + padding * 2;

        ctx.fillStyle = 'rgba(30,30,74,0.9)';
        ctx.beginPath();
        ctx.roundRect(word.x - bubbleW / 2, word.y - 16, bubbleW, 32, 8);
        ctx.fill();
        ctx.strokeStyle = word.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = "bold 16px 'JetBrains Mono', 'Noto Sans KR', monospace";
        ctx.fillStyle = word.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(word.text, word.x, word.y);
        ctx.restore();

        alive.push(word);
      }
      wordsRef.current = alive;
      setWords([...alive]);

      // pH bar
      ctx.fillStyle = 'rgba(30,30,74,0.8)';
      ctx.fillRect(20, H - 30, W - 40, 16);
      const phRatio = Math.max(0, phVal / 10);
      const phColor = phRatio > 0.5 ? '#00B894' : phRatio > 0.25 ? '#FDCB6E' : '#FF6B6B';
      ctx.fillStyle = phColor;
      ctx.fillRect(20, H - 30, (W - 40) * phRatio, 16);
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#E8E8FF';
      ctx.textAlign = 'center';
      ctx.fillText(`pH ${phVal.toFixed(1)}`, W / 2, H - 22);

      // HUD
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#E8E8FF';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${scoreVal}`, 20, 30);
      ctx.fillText(`Level: ${levelVal}`, 20, 50);
      if (comboVal > 1) {
        ctx.fillStyle = '#FD79A8';
        ctx.fillText(`${comboVal}x Combo!`, 20, 70);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [status, wordPool]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const idx = wordsRef.current.findIndex((w) => w.text === input.trim());
    if (idx >= 0) {
      wordsRef.current.splice(idx, 1);
      const points = input.length * 10;
      setScore((s) => s + points);
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        if (next % 15 === 0) setLevel((l) => l + 1);
        return next;
      });
      soundManager?.play('explosion');
    } else {
      setCombo(0);
    }
    setInput('');
  };

  if (status === 'menu') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">🌧️</div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>산성비</h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>떨어지는 단어를 입력해서 제거하세요!</p>
        <Button size="lg" onClick={startGame}>게임 시작</Button>
      </div>
    );
  }

  if (status === 'countdown') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-8xl font-bold neon-text" style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--color-primary)' }}>
          {countdown}
        </div>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--color-error)' }}>게임 오버</h1>
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
          <Card className="p-4">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>점수</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>{score}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>레벨</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-secondary)' }}>{level}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>최대 콤보</div>
            <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-combo)' }}>{maxCombo}</div>
          </Card>
        </div>
        <Button size="lg" onClick={startGame}>다시 시작</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4">
      <div className="relative rounded-xl overflow-hidden border border-[var(--key-border)]" style={{ background: 'var(--bg-card)', height: '500px' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-[var(--key-border)] text-lg"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}
          placeholder="단어를 입력하세요..."
          autoComplete="off"
          autoFocus
        />
        <Button type="submit" size="lg">입력</Button>
      </form>
    </div>
  );
}
