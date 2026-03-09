'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { soundManager } from '@/lib/sound/sound-manager';
import { pickRandom, randomBetween } from '@/lib/utils/helpers';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { wordGenerator } from '@/lib/content/word-generator';
import {
  ParticleSystem, ScreenShake,
  drawCastle, drawWordBubble, drawShieldBar,
} from '@/lib/game/renderer';

interface Enemy {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  hp: number;
  color: string;
  type: number;
  spawnTime: number;
}

interface Arrow {
  x: number;
  y: number;
  targetId: number;
  speed: number;
  angle: number;
}

export default function DefenseGamePage() {
  const { settings } = useSettingsStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'menu' | 'countdown' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [gold, setGold] = useState(0);
  const [castleHp, setCastleHp] = useState(20);
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [killCount, setKillCount] = useState(0);

  const enemiesRef = useRef<Enemy[]>([]);
  const arrowsRef = useRef<Arrow[]>([]);
  const animRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const goldRef = useRef(0);
  const castleHpRef = useRef(20);
  const killCountRef = useRef(0);
  const particlesRef = useRef(new ParticleSystem());
  const shakeRef = useRef(new ScreenShake());
  const isKorean = settings.language === 'ko';

  useEffect(() => {
    wordGenerator.reset();
    const words = wordGenerator.getWords({
      language: settings.language, theme: 'fantasy', difficulty: 1, count: 500,
      minLength: settings.language === 'ko' ? 2 : 3,
      maxLength: settings.language === 'ko' ? 6 : 10,
    });
    (async () => {
      try {
        if (settings.language === 'ko') {
          const mod = await import('@/data/korean/words-beginner');
          const mod2 = await import('@/data/korean/words-intermediate');
          setWordPool([...new Set([...mod.koreanWordsBeginner, ...mod2.koreanWordsIntermediate, ...words])]);
        } else {
          const mod = await import('@/data/english/words-common200');
          const mod2 = await import('@/data/english/words-common1000');
          setWordPool([...new Set([...mod.englishCommon200, ...mod2.englishCommon1000, ...words].filter(w => w.length >= 3))]);
        }
      } catch {
        setWordPool(words);
      }
    })();
  }, [settings.language]);

  useEffect(() => {
    if (wave > 1) {
      const newWords = wordGenerator.getWords({
        language: settings.language, theme: 'fantasy', difficulty: Math.min(10, wave), count: 100,
      });
      setWordPool(prev => [...new Set([...prev, ...newWords])]);
    }
  }, [wave, settings.language]);

  const startGame = () => {
    setStatus('countdown');
    setScore(0); setWave(1); setGold(0); setCastleHp(20);
    setInput(''); setKillCount(0);
    enemiesRef.current = []; arrowsRef.current = [];
    nextIdRef.current = 0; lastSpawnRef.current = 0;
    scoreRef.current = 0; waveRef.current = 1; goldRef.current = 0;
    castleHpRef.current = 20; killCountRef.current = 0;
    particlesRef.current = new ParticleSystem();
    shakeRef.current = new ScreenShake();
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
    const particles = particlesRef.current;
    const shake = shakeRef.current;

    const loop = (time: number) => {
      const currentWave = waveRef.current;
      const hpVal = castleHpRef.current;
      const shakeOffset = shake.update();

      ctx.save();
      ctx.translate(shakeOffset.x, shakeOffset.y);

      // Background - fantasy landscape
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0D0D2A');
      grad.addColorStop(0.3, '#141430');
      grad.addColorStop(0.7, '#1A1A3A');
      grad.addColorStop(1, '#1E1E40');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (let i = 0; i < 40; i++) {
        const sx = (i * 73) % W;
        const sy = (i * 37) % (H * 0.4);
        ctx.fillStyle = `rgba(220,220,255,${0.2 + Math.sin(time * 0.002 + i) * 0.15})`;
        ctx.fillRect(sx, sy, 1, 1);
      }

      // Mountains background
      ctx.fillStyle = '#12122A';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.6);
      for (let x = 0; x <= W; x += 40) {
        ctx.lineTo(x, H * 0.5 + Math.sin(x * 0.01) * 30 + Math.sin(x * 0.025) * 15);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.fill();

      // Ground
      ctx.fillStyle = '#1A1A3E';
      ctx.fillRect(0, H * 0.75, W, H * 0.25);
      // Path/road
      ctx.fillStyle = '#15152E';
      ctx.fillRect(0, H * 0.75 - 5, W, 35);

      // Castle
      drawCastle(ctx, 55, H * 0.75 - 15, hpVal, 20, time);

      // Spawn enemies
      if (time - lastSpawnRef.current > Math.max(2800 - currentWave * 100, 800) && enemiesRef.current.length < 3 + currentWave) {
        lastSpawnRef.current = time;
        const word = wordGenerator.getUniqueWord(wordPool) || (isKorean ? '적군' : 'enemy');
        enemiesRef.current.push({
          id: nextIdRef.current++,
          text: word,
          x: W + 20,
          y: H * 0.75 - 15 + randomBetween(-30, 30),
          speed: 0.25 + currentWave * 0.04,
          hp: 1,
          color: pickRandom(['#FF6B6B', '#FECA57', '#FD79A8', '#00D2D3']),
          type: Math.floor(Math.random() * 4),
          spawnTime: time,
        });
      }

      // Update & draw enemies
      const alive: Enemy[] = [];
      for (const e of enemiesRef.current) {
        e.x -= e.speed;

        // Hit castle
        if (e.x < 90) {
          castleHpRef.current--;
          setCastleHp(castleHpRef.current);
          shake.shake(5);
          particles.emit(90, e.y, 8, {
            speed: 2, life: 20, size: 3,
            colors: ['#FF6B6B', '#FF9F43'],
          });
          if (castleHpRef.current <= 0) {
            particles.explode(55, H * 0.75, 2);
            setStatus('gameover');
            cancelAnimationFrame(animRef.current);
            soundManager?.play('gameOver');
            ctx.restore();
            return;
          }
          soundManager?.play('keyError');
          continue;
        }

        // Draw enemy soldier
        ctx.save();
        ctx.translate(e.x, e.y);

        // Body
        ctx.fillStyle = e.color;
        // Head
        ctx.beginPath();
        ctx.arc(0, -14, 6, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillRect(-5, -8, 10, 14);
        // Legs (walking animation)
        const legPhase = Math.sin(time * 0.008 + e.id);
        ctx.fillRect(-5, 6, 4, 8 + legPhase * 2);
        ctx.fillRect(1, 6, 4, 8 - legPhase * 2);
        // Weapon
        ctx.strokeStyle = '#AAA';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, -4);
        ctx.lineTo(14 + Math.sin(time * 0.005) * 2, -10);
        ctx.stroke();
        // Shield (some enemies)
        if (e.type % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(-8, -6, 4, 12);
        }

        ctx.restore();

        // Word bubble
        drawWordBubble(ctx, e.x, e.y - 30, e.text, e.color, { fontSize: 13 });
        alive.push(e);
      }
      enemiesRef.current = alive;

      // Update & draw arrows
      const aliveArrows: Arrow[] = [];
      for (const a of arrowsRef.current) {
        a.x += Math.cos(a.angle) * a.speed;
        a.y += Math.sin(a.angle) * a.speed;
        if (a.x > W + 20 || a.x < -20 || a.y < -20 || a.y > H + 20) continue;

        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.angle);
        // Arrow shaft
        ctx.strokeStyle = '#FECA57';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();
        // Arrow head
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(5, -3);
        ctx.lineTo(5, 3);
        ctx.closePath();
        ctx.fill();
        // Fletching
        ctx.fillStyle = '#A29BFE';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-14, -3);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-14, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        aliveArrows.push(a);
      }
      arrowsRef.current = aliveArrows;

      // Particles
      particles.update();
      particles.draw(ctx);

      // HUD
      ctx.font = "bold 18px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#E8E8FF';
      ctx.textAlign = 'left';
      ctx.fillText(`${scoreRef.current}`, 20, 25);
      ctx.font = "9px 'Noto Sans KR', sans-serif";
      ctx.fillStyle = 'rgba(232,232,255,0.4)';
      ctx.fillText('SCORE', 20, 12);

      ctx.font = "bold 16px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#A29BFE';
      ctx.textAlign = 'center';
      ctx.fillText(`WAVE ${waveRef.current}`, W / 2, 25);

      ctx.font = "13px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#FECA57';
      ctx.textAlign = 'right';
      ctx.fillText(`${goldRef.current}G`, W - 20, 25);

      ctx.restore();
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [status, wordPool, isKorean]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const idx = enemiesRef.current.findIndex(e => e.text === input.trim());
    if (idx >= 0) {
      const enemy = enemiesRef.current[idx];
      // Fire arrow
      const angle = Math.atan2(enemy.y - (canvasRef.current!.offsetHeight * 0.75 - 55), enemy.x - 55);
      arrowsRef.current.push({ x: 55, y: canvasRef.current!.offsetHeight * 0.75 - 55, targetId: enemy.id, speed: 10, angle });

      particlesRef.current.explode(enemy.x, enemy.y, 0.7);
      shakeRef.current.shake(3);
      enemiesRef.current.splice(idx, 1);
      scoreRef.current += input.length * 10;
      setScore(scoreRef.current);
      goldRef.current += 5 + Math.floor(input.length / 2);
      setGold(goldRef.current);
      killCountRef.current += 1;
      setKillCount(killCountRef.current);
      if (killCountRef.current % 8 === 0) {
        waveRef.current += 1;
        setWave(waveRef.current);
        soundManager?.play('levelUp');
        // Repair castle
        if (castleHpRef.current < 20) {
          castleHpRef.current = Math.min(20, castleHpRef.current + 2);
          setCastleHp(castleHpRef.current);
        }
      }
      soundManager?.play('explosion');
    } else {
      soundManager?.play('keyError');
    }
    setInput('');
  };

  if (status === 'menu') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">
          <svg viewBox="0 0 80 80" width="80" height="80" className="mx-auto">
            <rect width="80" height="80" rx="16" fill="#0A0A2E"/>
            <g transform="translate(40,42)">
              <rect x="-15" y="-18" width="30" height="36" fill="#4A3FAF"/>
              <rect x="-20" y="-28" width="10" height="46" fill="#4A3FAF"/>
              <rect x="10" y="-28" width="10" height="46" fill="#4A3FAF"/>
              <polygon points="-20,-28 -15,-38 -10,-28" fill="#6C5CE7"/>
              <polygon points="10,-28 15,-38 20,-28" fill="#6C5CE7"/>
              <rect x="-6" y="4" width="12" height="14" rx="6" fill="#1A1A3E"/>
              <rect x="-5" y="-12" width="4" height="5" fill="rgba(254,202,87,0.5)"/>
              <rect x="1" y="-12" width="4" height="5" fill="rgba(254,202,87,0.5)"/>
              <line x1="0" y1="-28" x2="0" y2="-42" stroke="#A29BFE" strokeWidth="2"/>
              <polygon points="0,-42 10,-36 0,-30" fill="#6C5CE7"/>
            </g>
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit'" }}>
          {isKorean ? '킹덤 디펜스' : 'Kingdom Defense'}
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          {isKorean ? '성을 지키며 타이핑하세요!' : 'Defend your castle by typing!'}
        </p>
        <Button size="lg" onClick={startGame}>{isKorean ? '게임 시작' : 'Start Game'}</Button>
      </div>
    );
  }

  if (status === 'countdown') return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="text-8xl font-bold neon-text">{countdown}</div></div>;

  if (status === 'gameover') return (
    <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-error)', fontFamily: "'Outfit'" }}>
        {isKorean ? '성이 함락되었습니다!' : 'Castle Fallen!'}
      </h1>
      <div className="grid grid-cols-3 gap-3 mb-8 max-w-md mx-auto">
        <Card className="p-3">
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '점수' : 'SCORE'}</div>
          <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{score}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '웨이브' : 'WAVE'}</div>
          <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-secondary)' }}>{wave}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '골드' : 'GOLD'}</div>
          <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: '#FECA57' }}>{gold}</div>
        </Card>
      </div>
      <Button size="lg" onClick={startGame}>{isKorean ? '다시 시작' : 'Retry'}</Button>
    </div>
  );

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4">
      <div className="relative rounded-xl overflow-hidden border border-[var(--key-border)]" style={{ height: '450px' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-[var(--key-border)] text-lg"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono'" }}
          placeholder={isKorean ? '단어를 입력하세요...' : 'Type the word...'} autoComplete="off" autoFocus />
        <Button type="submit" size="lg">{isKorean ? '공격' : 'Attack'}</Button>
      </form>
    </div>
  );
}
