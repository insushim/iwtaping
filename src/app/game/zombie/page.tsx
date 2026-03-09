'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { soundManager } from '@/lib/sound/sound-manager';
import { pickRandom } from '@/lib/utils/helpers';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { wordGenerator } from '@/lib/content/word-generator';
import {
  ParticleSystem, ScreenShake,
  drawZombie, drawWordBubble, drawShieldBar,
} from '@/lib/game/renderer';

interface Zombie {
  id: number;
  text: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  color: string;
  type: number;
  spawnTime: number;
}

export default function ZombieGamePage() {
  const { settings } = useSettingsStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'menu' | 'countdown' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [hp, setHp] = useState(10);
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [killCount, setKillCount] = useState(0);

  const zombiesRef = useRef<Zombie[]>([]);
  const animRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const hpRef = useRef(10);
  const killCountRef = useRef(0);
  const particlesRef = useRef(new ParticleSystem());
  const shakeRef = useRef(new ScreenShake());
  const isKorean = settings.language === 'ko';

  useEffect(() => {
    wordGenerator.reset();
    const words = wordGenerator.getWords({
      language: settings.language, theme: 'horror', difficulty: 1, count: 500,
      minLength: settings.language === 'ko' ? 2 : 3,
      maxLength: settings.language === 'ko' ? 5 : 8,
    });
    (async () => {
      try {
        if (settings.language === 'ko') {
          const mod = await import('@/data/korean/words-beginner');
          const mod2 = await import('@/data/korean/words-intermediate');
          setWordPool([...new Set([...mod.koreanWordsBeginner, ...mod2.koreanWordsIntermediate, ...words].filter(w => w.length >= 2 && w.length <= 5))]);
        } else {
          const m = await import('@/data/english/words-common200');
          const m2 = await import('@/data/english/words-common1000');
          setWordPool([...new Set([...m.englishCommon200, ...m2.englishCommon1000, ...words].filter(w => w.length >= 3 && w.length <= 8))]);
        }
      } catch {
        setWordPool(words);
      }
    })();
  }, [settings.language]);

  useEffect(() => {
    if (wave > 1) {
      const newWords = wordGenerator.getWords({
        language: settings.language, theme: 'horror', difficulty: Math.min(10, wave), count: 100,
      });
      setWordPool(prev => [...new Set([...prev, ...newWords])]);
    }
  }, [wave, settings.language]);

  const startGame = () => {
    setStatus('countdown'); setScore(0); setWave(1); setHp(10); setInput('');
    setKillCount(0);
    zombiesRef.current = []; nextIdRef.current = 0; lastSpawnRef.current = 0;
    scoreRef.current = 0; waveRef.current = 1; hpRef.current = 10; killCountRef.current = 0;
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
    const cx = W / 2, cy = H / 2;
    const particles = particlesRef.current;
    const shake = shakeRef.current;

    const loop = (time: number) => {
      const currentWave = waveRef.current;
      const shakeOffset = shake.update();

      ctx.save();
      ctx.translate(shakeOffset.x, shakeOffset.y);

      // Background - dark apocalyptic
      const grad = ctx.createRadialGradient(cx, cy, 50, cx, cy, Math.max(W, H) * 0.7);
      grad.addColorStop(0, '#12122A');
      grad.addColorStop(0.5, '#0A0A1A');
      grad.addColorStop(1, '#050510');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Ground cracks
      ctx.strokeStyle = 'rgba(100,80,60,0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const gx = (i * 97) % W;
        const gy = (i * 53 + 200) % H;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 30, gy + 15);
        ctx.lineTo(gx + 20, gy + 30);
        ctx.stroke();
      }

      // Fog/mist at edges
      const fogGrad = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.max(W, H) * 0.6);
      fogGrad.addColorStop(0, 'transparent');
      fogGrad.addColorStop(1, 'rgba(0,180,148,0.04)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, W, H);

      // Player character - survivor
      ctx.save();
      ctx.translate(cx, cy);
      // Flashlight cone
      ctx.fillStyle = 'rgba(254,202,87,0.03)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 150, -0.5, 0.5);
      ctx.closePath();
      ctx.fill();

      // Body
      ctx.fillStyle = '#6C5CE7';
      ctx.beginPath();
      ctx.arc(0, -8, 8, 0, Math.PI * 2);
      ctx.fill();
      // Torso
      ctx.fillRect(-6, 0, 12, 14);
      // Gun
      ctx.strokeStyle = '#AAA';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 4);
      ctx.lineTo(18, 0);
      ctx.stroke();
      // Legs
      ctx.fillStyle = '#4A3FAF';
      ctx.fillRect(-5, 14, 4, 8);
      ctx.fillRect(1, 14, 4, 8);

      // Safe zone indicator
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(108,92,231,${0.2 + Math.sin(time * 0.003) * 0.1})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      // HP indicator ring
      const hpRatio = hpRef.current / 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpRatio);
      ctx.strokeStyle = hpRatio > 0.5 ? '#00B894' : hpRatio > 0.25 ? '#FECA57' : '#FF6B6B';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Spawn zombies
      if (time - lastSpawnRef.current > Math.max(2200 - currentWave * 80, 500)) {
        lastSpawnRef.current = time;
        if (zombiesRef.current.length < 4 + currentWave) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.max(W, H) * 0.55;
          const word = wordGenerator.getUniqueWord(wordPool) || (isKorean ? '좀비' : 'zombie');
          zombiesRef.current.push({
            id: nextIdRef.current++,
            text: word,
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            angle: 0,
            speed: 0.3 + currentWave * 0.04,
            color: pickRandom(['#00B894', '#FF6B6B', '#FDCB6E', '#55E6C1', '#B33939']),
            type: Math.floor(Math.random() * 3),
            spawnTime: time,
          });
        }
      }

      // Update & draw zombies
      const alive: Zombie[] = [];
      for (const z of zombiesRef.current) {
        const a = Math.atan2(cy - z.y, cx - z.x);
        z.x += Math.cos(a) * z.speed;
        z.y += Math.sin(a) * z.speed;
        const dist = Math.hypot(z.x - cx, z.y - cy);

        if (dist < 28) {
          hpRef.current--;
          setHp(hpRef.current);
          shake.shake(6);
          particles.emit(z.x, z.y, 6, {
            speed: 2, life: 15, size: 3,
            colors: ['#B33939', '#FF6B6B'],
          });
          soundManager?.play('keyError');
          if (hpRef.current <= 0) {
            particles.explode(cx, cy, 2);
            setStatus('gameover');
            cancelAnimationFrame(animRef.current);
            soundManager?.play('gameOver');
            ctx.restore();
            return;
          }
          continue;
        }

        // Draw zombie sprite
        const fadeIn = Math.min(1, (time - z.spawnTime) / 500);
        ctx.globalAlpha = fadeIn;
        drawZombie(ctx, z.x, z.y, time, z.color);

        // Blood trail
        if (z.type === 1) {
          ctx.fillStyle = 'rgba(179,57,57,0.15)';
          ctx.beginPath();
          ctx.arc(z.x - Math.cos(a) * 10, z.y - Math.sin(a) * 10, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Word bubble
        drawWordBubble(ctx, z.x, z.y - 22, z.text, z.color, { fontSize: 13 });
        ctx.globalAlpha = 1;
        alive.push(z);
      }
      zombiesRef.current = alive;

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
      ctx.fillStyle = '#00B894';
      ctx.textAlign = 'center';
      ctx.fillText(`WAVE ${waveRef.current}`, W / 2, 25);

      // HP display
      drawShieldBar(ctx, W - 130, 12, hpRef.current, 10, 110);
      ctx.font = "9px 'Noto Sans KR', sans-serif";
      ctx.fillStyle = 'rgba(232,232,255,0.4)';
      ctx.textAlign = 'right';
      ctx.fillText('HP', W - 135, 20);

      ctx.restore();
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [status, wordPool, isKorean]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const idx = zombiesRef.current.findIndex(z => z.text === input.trim());
    if (idx >= 0) {
      const z = zombiesRef.current[idx];

      // Gunfire line
      const canvas = canvasRef.current;
      if (canvas) {
        const cx = canvas.offsetWidth / 2, cy = canvas.offsetHeight / 2;
        particlesRef.current.emit(cx + 18, cy, 3, {
          speed: 5, life: 5, size: 2,
          colors: ['#FECA57', '#FFF'],
          angle: Math.atan2(z.y - cy, z.x - cx),
          spread: 0.2,
        });
      }

      particlesRef.current.explode(z.x, z.y, 0.8);
      shakeRef.current.shake(4);
      zombiesRef.current.splice(idx, 1);
      scoreRef.current += input.length * 12;
      setScore(scoreRef.current);
      killCountRef.current += 1;
      setKillCount(killCountRef.current);
      if (killCountRef.current % 10 === 0) {
        waveRef.current += 1;
        setWave(waveRef.current);
        soundManager?.play('levelUp');
        // Heal 1 HP on wave up
        if (hpRef.current < 10) {
          hpRef.current = Math.min(10, hpRef.current + 1);
          setHp(hpRef.current);
        }
      }
      soundManager?.play('explosion');
    } else {
      soundManager?.play('keyError');
    }
    setInput('');
  };

  if (status === 'menu') return (
    <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
      <div className="text-6xl mb-4">
        <svg viewBox="0 0 80 80" width="80" height="80" className="mx-auto">
          <rect width="80" height="80" rx="16" fill="#0A0A1A"/>
          <g transform="translate(40,40)">
            <circle cx="0" cy="-10" r="12" fill="#00B894" opacity="0.8"/>
            <rect x="-8" y="2" width="16" height="16" fill="#00B894" opacity="0.7"/>
            <circle cx="-4" cy="-12" r="2.5" fill="#FF0000"/>
            <circle cx="4" cy="-12" r="2.5" fill="#FF0000"/>
            <line x1="-10" y1="6" x2="-20" y2="10" stroke="#00B894" strokeWidth="3" opacity="0.6"/>
            <line x1="10" y1="6" x2="20" y2="8" stroke="#00B894" strokeWidth="3" opacity="0.6"/>
          </g>
          <text x="40" y="70" textAnchor="middle" fill="#FF6B6B" fontSize="8" fontFamily="monospace" fontWeight="bold">SURVIVAL</text>
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit'" }}>
        {isKorean ? '좀비 서바이벌' : 'Zombie Survival'}
      </h1>
      <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
        {isKorean ? '좀비를 물리치며 생존하세요!' : 'Survive the zombie horde!'}
      </p>
      <Button size="lg" onClick={startGame}>{isKorean ? '게임 시작' : 'Start Game'}</Button>
    </div>
  );

  if (status === 'countdown') return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="text-8xl font-bold neon-text">{countdown}</div></div>;

  if (status === 'gameover') return (
    <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-error)', fontFamily: "'Outfit'" }}>
        {isKorean ? '게임 오버' : 'Game Over'}
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {isKorean ? '좀비에게 잡혔습니다...' : 'The zombies got you...'}
      </p>
      <div className="grid grid-cols-3 gap-3 mb-8 max-w-md mx-auto">
        <Card className="p-3">
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '점수' : 'SCORE'}</div>
          <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{score}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '웨이브' : 'WAVE'}</div>
          <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: '#00B894' }}>{wave}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '격파' : 'KILLS'}</div>
          <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: '#FF6B6B' }}>{killCount}</div>
        </Card>
      </div>
      <Button size="lg" onClick={startGame}>{isKorean ? '다시 시작' : 'Retry'}</Button>
    </div>
  );

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4">
      <div className="rounded-xl overflow-hidden border border-[var(--key-border)]" style={{ height: '450px' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-[var(--key-border)] text-lg"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono'" }}
          placeholder={isKorean ? '단어를 입력하세요...' : 'Type the word...'} autoComplete="off" autoFocus />
        <Button type="submit" size="lg">{isKorean ? '사격' : 'Shoot'}</Button>
      </form>
    </div>
  );
}
