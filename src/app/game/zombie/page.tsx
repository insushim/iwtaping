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
  drawWordBubble, drawShieldBar, drawHUD,
  drawZombieSprite, drawPlayerCharacter, drawMoonlight, drawCityscape,
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
  variant: number;
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
  const [muzzleFlash, setMuzzleFlash] = useState(false);

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
      language: settings.language, theme: 'adventure', difficulty: 1, count: 500,
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
        language: settings.language, theme: 'adventure', difficulty: Math.min(10, wave), count: 100,
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
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const cx = W / 2, cy = H / 2;
    const particles = particlesRef.current;
    const shake = shakeRef.current;

    const loop = (time: number) => {
      const currentWave = waveRef.current;
      const shakeOffset = shake.update();

      ctx.save();
      ctx.translate(shakeOffset.x, shakeOffset.y);

      // Background - Night sky with moon and city
      const groundY = H - 60;
      drawMoonlight(ctx, W, H, time);
      drawCityscape(ctx, W, H, groundY);

      // Ground area with cracked pavement texture
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
      groundGrad.addColorStop(0, '#2A2A2A');
      groundGrad.addColorStop(0.5, '#1A1A1A');
      groundGrad.addColorStop(1, '#0A0A0A');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, W, H - groundY);

      // Pavement cracks
      ctx.strokeStyle = 'rgba(100,80,60,0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 15; i++) {
        const gx = (i * 97) % W;
        const gy = groundY + (i * 13) % (H - groundY);
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 25, gy + 10);
        ctx.lineTo(gx + 35, gy + 25);
        ctx.stroke();
      }

      // Fog/mist between ground and city
      const mistGrad = ctx.createLinearGradient(0, groundY - 30, 0, groundY);
      mistGrad.addColorStop(0, 'rgba(40,40,80,0.2)');
      mistGrad.addColorStop(1, 'rgba(40,40,80,0)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, groundY - 30, W, 30);

      // Calculate player facing direction (toward nearest zombie or mouse)
      let facingAngle = 0;
      if (zombiesRef.current.length > 0) {
        const nearest = zombiesRef.current.reduce((closest, z) => {
          const dist = Math.hypot(z.x - cx, z.y - cy);
          const closestDist = Math.hypot(closest.x - cx, closest.y - cy);
          return dist < closestDist ? z : closest;
        });
        facingAngle = Math.atan2(nearest.y - cy, nearest.x - cx);
      }

      // Player character - position at center-bottom
      const playerY = groundY - 25;
      drawPlayerCharacter(ctx, cx, playerY, facingAngle, time, muzzleFlash);

      // Enhanced flashlight effect
      ctx.save();
      ctx.translate(cx, playerY);
      ctx.rotate(facingAngle);

      // Main flashlight cone - wider and more dramatic
      const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
      flashGrad.addColorStop(0, 'rgba(255,255,200,0.15)');
      flashGrad.addColorStop(0.3, 'rgba(254,202,87,0.08)');
      flashGrad.addColorStop(1, 'rgba(254,202,87,0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 200, -0.7, 0.7);
      ctx.closePath();
      ctx.fill();

      // Volumetric light effect
      ctx.fillStyle = 'rgba(254,202,87,0.02)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 300, -0.5, 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Dark vignette around edges
      const vignetteGrad = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.max(W, H) * 0.7);
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, W, H);

      // Glowing perimeter fence/barrier (safe zone)
      ctx.save();
      ctx.translate(cx, playerY);
      const barrierPulse = 0.3 + Math.sin(time * 0.005) * 0.15;

      // Energy barrier effect
      ctx.strokeStyle = `rgba(108,92,231,${barrierPulse})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#6C5CE7';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glow
      ctx.strokeStyle = `rgba(108,92,231,${barrierPulse * 0.5})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 33, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();

      // HP indicator ring around player
      const hpRatio = hpRef.current / 10;
      ctx.beginPath();
      ctx.arc(cx, playerY, 45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpRatio);
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
          const baseSpeed = 0.3 + currentWave * 0.04;
          const speedVariant = Math.random();
          let variant, speed;

          if (speedVariant < 0.6) {
            variant = 0; // Standard zombie
            speed = baseSpeed;
          } else if (speedVariant < 0.8) {
            variant = 1; // Fat zombie (slower)
            speed = baseSpeed * 0.7;
          } else {
            variant = 2; // Fast crawler
            speed = baseSpeed * 1.4;
          }

          zombiesRef.current.push({
            id: nextIdRef.current++,
            text: word,
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            angle: 0,
            speed,
            color: pickRandom(['#00B894', '#FF6B6B', '#FDCB6E', '#55E6C1', '#B33939']),
            type: Math.floor(Math.random() * 3),
            variant,
            spawnTime: time,
          });
        }
      }

      // Update & draw zombies
      const alive: Zombie[] = [];
      for (const z of zombiesRef.current) {
        const a = Math.atan2(playerY - z.y, cx - z.x);
        z.x += Math.cos(a) * z.speed;
        z.y += Math.sin(a) * z.speed;
        const dist = Math.hypot(z.x - cx, z.y - playerY);

        if (dist < 38) {
          hpRef.current--;
          setHp(hpRef.current);
          shake.shake(6);
          particles.emit(z.x, z.y, 6, {
            speed: 2, life: 15, size: 3,
            colors: ['#B33939', '#FF6B6B'],
          });
          soundManager?.play('keyError');
          if (hpRef.current <= 0) {
            particles.explode(cx, playerY, 2);
            setStatus('gameover');
            cancelAnimationFrame(animRef.current);
            soundManager?.play('gameOver');
            ctx.restore();
            return;
          }
          continue;
        }

        // Draw zombie sprite with new function
        const fadeIn = Math.min(1, (time - z.spawnTime) / 500);
        ctx.globalAlpha = fadeIn;

        // Calculate size based on variant
        let size = 12;
        if (z.variant === 1) size = 16; // Fat zombie bigger
        if (z.variant === 2) size = 10; // Crawler smaller

        const walkPhase = time * 0.005 + z.id;
        drawZombieSprite(ctx, z.x, z.y, size, z.variant, walkPhase, time);

        // Slime trail for fat zombies
        if (z.variant === 1) {
          ctx.fillStyle = 'rgba(0,184,148,0.15)';
          ctx.beginPath();
          ctx.arc(z.x - Math.cos(a) * 12, z.y - Math.sin(a) * 12, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Word bubble with connection line
        const bubbleY = z.y - (size + 15);

        // Thin line connecting bubble to zombie
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(z.x, z.y - size/2);
        ctx.lineTo(z.x, bubbleY + 8);
        ctx.stroke();

        // Enhanced word bubble for targeted zombie
        const isTargeted = input.trim().length > 0 && z.text.startsWith(input.trim());
        if (isTargeted) {
          ctx.shadowColor = z.color;
          ctx.shadowBlur = 10;
        }

        drawWordBubble(ctx, z.x, bubbleY, z.text, z.color, { fontSize: 13 });
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        alive.push(z);
      }
      zombiesRef.current = alive;

      // Particles
      particles.update();
      particles.draw(ctx);

      // Enhanced HUD
      drawHUD(ctx, {
        score: scoreRef.current,
        level: waveRef.current,
        combo: 0,
        label: 'WAVE',
      }, W);

      // Additional game-specific HUD elements
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#FF6B6B';
      ctx.textAlign = 'right';
      ctx.fillText(`KILLS: ${killCountRef.current}`, W - 20, 50);

      // Ammo/weapon indicator
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#FECA57';
      ctx.textAlign = 'left';
      ctx.fillText('WEAPON: ASSAULT RIFLE', 20, H - 20);

      // Active zombies count
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`HOSTILES: ${zombiesRef.current.length}`, 20, H - 40);

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

      // Muzzle flash effect
      setMuzzleFlash(true);
      setTimeout(() => setMuzzleFlash(false), 100);

      // Gunfire line and particles
      const canvas = canvasRef.current;
      if (canvas) {
        const cx = canvas.offsetWidth / 2;
        const playerY = (canvas.offsetHeight - 60) - 25; // Ground level player position
        const angle = Math.atan2(z.y - playerY, z.x - cx);

        // Muzzle flash particles
        particlesRef.current.emit(cx + Math.cos(angle) * 26, playerY + Math.sin(angle) * 26, 5, {
          speed: 8, life: 8, size: 3,
          colors: ['#FECA57', '#FFF', '#FFAA00'],
          angle: angle,
          spread: 0.3,
        });

        // Bullet trail
        particlesRef.current.emit(cx + Math.cos(angle) * 30, playerY + Math.sin(angle) * 30, 2, {
          speed: 15, life: 3, size: 1,
          colors: ['#FFF', '#FECA57'],
          angle: angle,
          spread: 0.1,
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
