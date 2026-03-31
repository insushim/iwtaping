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
  drawCastle, drawCastleDetailed, drawSoldierEnemy, drawWordBubble, drawShieldBar,
} from '@/lib/game/renderer';

interface Enemy {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  hp: number;
  color: string;
  type: number; // 0=swordsman, 1=spearman, 2=knight
  spawnTime: number;
  dying?: boolean;
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
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const particles = particlesRef.current;
    const shake = shakeRef.current;

    const loop = (time: number) => {
      const currentWave = waveRef.current;
      const hpVal = castleHpRef.current;
      const shakeOffset = shake.update();

      ctx.save();
      ctx.translate(shakeOffset.x, shakeOffset.y);

      // Background - scenic sunset landscape
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.7);
      skyGrad.addColorStop(0, '#FF6B35'); // Orange sunset
      skyGrad.addColorStop(0.3, '#F7931E'); // Warm orange
      skyGrad.addColorStop(0.6, '#FFB347'); // Peach
      skyGrad.addColorStop(0.8, '#4A154B'); // Deep purple
      skyGrad.addColorStop(1, '#0D1B2A'); // Dark blue-purple
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.7);

      // Mountain silhouettes (3 layers with parallax)
      // Distant mountains
      ctx.fillStyle = 'rgba(26,26,62,0.8)';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.5);
      for (let x = 0; x <= W; x += 60) {
        ctx.lineTo(x, H * 0.35 + Math.sin(x * 0.005 + time * 0.0001) * 40 + Math.sin(x * 0.012) * 20);
      }
      ctx.lineTo(W, H * 0.7);
      ctx.lineTo(0, H * 0.7);
      ctx.fill();

      // Middle mountains
      ctx.fillStyle = 'rgba(36,36,72,0.9)';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.6);
      for (let x = 0; x <= W; x += 45) {
        ctx.lineTo(x, H * 0.45 + Math.sin(x * 0.008 + time * 0.0001) * 35 + Math.sin(x * 0.018) * 15);
      }
      ctx.lineTo(W, H * 0.7);
      ctx.lineTo(0, H * 0.7);
      ctx.fill();

      // Near mountains
      ctx.fillStyle = 'rgba(46,46,82,1)';
      ctx.beginPath();
      ctx.moveTo(0, H * 0.65);
      for (let x = 0; x <= W; x += 30) {
        ctx.lineTo(x, H * 0.55 + Math.sin(x * 0.015 + time * 0.0002) * 25 + Math.sin(x * 0.03) * 10);
      }
      ctx.lineTo(W, H * 0.7);
      ctx.lineTo(0, H * 0.7);
      ctx.fill();

      // Grassy plain/field
      const groundGrad = ctx.createLinearGradient(0, H * 0.7, 0, H);
      groundGrad.addColorStop(0, '#2D5016'); // Dark green
      groundGrad.addColorStop(0.5, '#355E1D'); // Medium green
      groundGrad.addColorStop(1, '#1A3A0B'); // Very dark green
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, H * 0.7, W, H * 0.3);

      // Animated grass (sin-wave green lines)
      ctx.strokeStyle = 'rgba(52,154,32,0.6)';
      ctx.lineWidth = 1;
      for (let i = 0; i < W; i += 8) {
        const grassHeight = 3 + Math.sin(time * 0.002 + i * 0.05) * 2;
        ctx.beginPath();
        ctx.moveTo(i, H * 0.75);
        ctx.lineTo(i + Math.sin(time * 0.003 + i * 0.02) * 1, H * 0.75 - grassHeight);
        ctx.stroke();
      }

      // Dirt road/path from left to castle
      const pathGrad = ctx.createLinearGradient(0, H * 0.72, 0, H * 0.78);
      pathGrad.addColorStop(0, '#8B7355');
      pathGrad.addColorStop(0.5, '#A0865C');
      pathGrad.addColorStop(1, '#6B5B47');
      ctx.fillStyle = pathGrad;
      ctx.fillRect(0, H * 0.74, W * 0.7, 25);

      // Cobblestones near castle
      ctx.fillStyle = '#707070';
      for (let x = W * 0.6; x < W * 0.7; x += 12) {
        for (let y = H * 0.74; y < H * 0.77; y += 8) {
          ctx.fillRect(x + Math.sin(y) * 2, y, 8, 6);
        }
      }

      // Footprints/tracks on the road
      ctx.fillStyle = 'rgba(107,91,71,0.5)';
      for (let x = 50; x < W * 0.6; x += 40) {
        const trackY = H * 0.75;
        // Left foot
        ctx.beginPath();
        ctx.ellipse(x, trackY, 3, 6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Right foot
        ctx.beginPath();
        ctx.ellipse(x + 15, trackY + 5, 3, 6, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Castle (detailed version, positioned on the right)
      drawCastleDetailed(ctx, W - 100, H * 0.75 - 20, hpVal, 20, time);

      // Spawn enemies
      if (time - lastSpawnRef.current > Math.max(2800 - currentWave * 100, 800) && enemiesRef.current.length < 3 + currentWave) {
        lastSpawnRef.current = time;
        const word = wordGenerator.getUniqueWord(wordPool) || (isKorean ? '적군' : 'enemy');

        // Enemy type distribution: 50% swordsman, 30% spearman, 20% knight (higher HP)
        const typeRoll = Math.random();
        let enemyType, enemyHp;
        if (typeRoll < 0.5) {
          enemyType = 0; // Swordsman
          enemyHp = 1;
        } else if (typeRoll < 0.8) {
          enemyType = 1; // Spearman
          enemyHp = 1;
        } else {
          enemyType = 2; // Knight (rare, high HP)
          enemyHp = 2;
        }

        enemiesRef.current.push({
          id: nextIdRef.current++,
          text: word,
          x: W + 20,
          y: H * 0.75 + randomBetween(-25, 15), // Keep on the path
          speed: 0.25 + currentWave * 0.04,
          hp: enemyHp,
          color: pickRandom(['#FF6B6B', '#FECA57', '#FD79A8', '#00D2D3']),
          type: enemyType,
          spawnTime: time,
        });
      }

      // Update & draw enemies
      const alive: Enemy[] = [];
      for (const e of enemiesRef.current) {
        if (!e.dying) {
          e.x -= e.speed;

          // Hit castle (updated position)
          if (e.x > W - 150) {
            castleHpRef.current--;
            setCastleHp(castleHpRef.current);
            shake.shake(5);
            particles.emit(W - 120, e.y, 8, {
              speed: 2, life: 20, size: 3,
              colors: ['#FF6B6B', '#FF9F43'],
            });
            if (castleHpRef.current <= 0) {
              particles.explode(W - 100, H * 0.75, 2);
              setStatus('gameover');
              cancelAnimationFrame(animRef.current);
              soundManager?.play('gameOver');
              ctx.restore();
              return;
            }
            soundManager?.play('keyError');
            continue;
          }
        }

        // Draw detailed enemy soldier
        ctx.save();
        if (e.dying) ctx.globalAlpha = 0.4 + Math.sin(time * 0.02) * 0.3;

        // Calculate walking animation phase based on movement
        const walkPhase = time * 0.008 + e.id + e.x * 0.01;

        drawSoldierEnemy(ctx, e.x, e.y, e.type, walkPhase, time);

        ctx.restore();

        // Word bubble (hide for dying enemies)
        if (!e.dying) {
          drawWordBubble(ctx, e.x, e.y - 30, e.text, e.color, { fontSize: 13 });
        }
        alive.push(e);
      }
      enemiesRef.current = alive;

      // Update & draw arrows (arrows hit dying enemies)
      const aliveArrows: Arrow[] = [];
      for (const a of arrowsRef.current) {
        a.x += Math.cos(a.angle) * a.speed;
        a.y += Math.sin(a.angle) * a.speed;
        if (a.x > W + 20 || a.x < -20 || a.y < -20 || a.y > H + 20) continue;

        // Check if arrow hit its target
        const target = enemiesRef.current.find(e => e.id === a.targetId && e.dying);
        if (target) {
          const dx = a.x - target.x;
          const dy = a.y - target.y;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            // Arrow hit! Explode and remove enemy
            particles.explode(target.x, target.y, 0.7);
            shake.shake(3);
            soundManager?.play('explosion');
            enemiesRef.current = enemiesRef.current.filter(e => e.id !== target.id);
            continue; // Arrow consumed
          }
        }

        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.angle);

        // Arrow flight trail (fading line behind)
        ctx.strokeStyle = 'rgba(254,202,87,0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-8, 0);
        ctx.stroke();

        // Arrow shaft with gradient (wood color)
        const shaftGrad = ctx.createLinearGradient(-10, -1, 6, 1);
        shaftGrad.addColorStop(0, '#8B4513');
        shaftGrad.addColorStop(0.5, '#A0522D');
        shaftGrad.addColorStop(1, '#CD853F');
        ctx.strokeStyle = shaftGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();

        // Arrow head (metallic triangle)
        const headGrad = ctx.createLinearGradient(5, -3, 10, 3);
        headGrad.addColorStop(0, '#E5E5E5');
        headGrad.addColorStop(0.5, '#C0C0C0');
        headGrad.addColorStop(1, '#A0A0A0');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(5, -4);
        ctx.lineTo(5, 4);
        ctx.closePath();
        ctx.fill();

        // Arrow head highlight
        ctx.strokeStyle = '#F5F5F5';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(5, -2);
        ctx.stroke();

        // Fletching (feathers)
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-15, -4);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-15, 4);
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

      // Fancy wave banner
      ctx.save();
      ctx.translate(W / 2, 15);

      // Banner background
      const bannerGrad = ctx.createLinearGradient(-60, -8, 60, 8);
      bannerGrad.addColorStop(0, 'rgba(162,155,254,0.8)');
      bannerGrad.addColorStop(0.5, 'rgba(108,92,231,0.9)');
      bannerGrad.addColorStop(1, 'rgba(162,155,254,0.8)');
      ctx.fillStyle = bannerGrad;
      ctx.beginPath();
      ctx.moveTo(-60, -8);
      ctx.lineTo(60, -8);
      ctx.lineTo(70, 0);
      ctx.lineTo(60, 8);
      ctx.lineTo(-60, 8);
      ctx.lineTo(-70, 0);
      ctx.closePath();
      ctx.fill();

      // Banner border
      ctx.strokeStyle = '#8B7ED8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Wave text
      ctx.font = "bold 16px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`WAVE ${waveRef.current}`, 0, 0);

      ctx.restore();

      // Enemy count remaining
      const aliveEnemies = enemiesRef.current.filter(e => !e.dying).length;
      if (aliveEnemies > 0) {
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.fillStyle = 'rgba(255,107,107,0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(`${aliveEnemies} enemies`, W / 2, 45);
      }

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
    const idx = enemiesRef.current.findIndex(e => !e.dying && e.text === input.trim());
    if (idx >= 0) {
      const enemy = enemiesRef.current[idx];
      // Mark as dying (don't remove yet - arrow must hit first)
      enemy.dying = true;
      enemy.speed = 0;
      // Fire arrow toward enemy
      const canvas = canvasRef.current;
      if (canvas) {
        const castleX = canvas.offsetWidth - 100;
        const castleTop = canvas.offsetHeight * 0.75 - 55;
        const angle = Math.atan2(enemy.y - castleTop, enemy.x - castleX);
        arrowsRef.current.push({ x: castleX - 30, y: castleTop, targetId: enemy.id, speed: 12, angle });
      }
      // Score updates immediately (player gets feedback)
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
        if (castleHpRef.current < 20) {
          castleHpRef.current = Math.min(20, castleHpRef.current + 2);
          setCastleHp(castleHpRef.current);
        }
      }
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
