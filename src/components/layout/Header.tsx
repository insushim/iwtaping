'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '../common/ThemeToggle';
import { XPBar } from '../common/XPBar';
import { useProgressStore, xpToNextLevel } from '@/stores/useProgressStore';

const navItems = [
  { href: '/practice', label: '연습', icon: '⌨️' },
  { href: '/test', label: '테스트', icon: '⏱️' },
  { href: '/game', label: '게임', icon: '🎮' },
  { href: '/challenge', label: '챌린지', icon: '🏆' },
  { href: '/stats', label: '통계', icon: '📊' },
  { href: '/settings', label: '설정', icon: '⚙️' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { progress, loadProgress, checkStreak } = useProgressStore();

  useEffect(() => {
    loadProgress();
    checkStreak();
  }, [loadProgress, checkStreak]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--key-border)]" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-[1400px] mx-auto h-[var(--header-height)] flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="text-xl font-extrabold neon-text" style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--color-primary)' }}>
            TypingVerse
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 no-underline ${
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                style={isActive ? { background: 'rgba(108,92,231,0.15)' } : {}}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {/* Streak */}
          {progress.streakDays > 0 && (
            <div className="hidden sm:flex items-center gap-1 streak-fire" title={`${progress.streakDays}일 연속!`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1C8 1 3 6 3 9.5C3 12.5 5.2 14.5 8 14.5C10.8 14.5 13 12.5 13 9.5C13 6 8 1 8 1Z" fill="#FF6B6B"/>
                <path d="M8 5C8 5 5.5 8 5.5 10C5.5 11.7 6.6 12.5 8 12.5C9.4 12.5 10.5 11.7 10.5 10C10.5 8 8 5 8 5Z" fill="#FECA57"/>
              </svg>
              <span className="text-xs font-bold" style={{ color: '#FECA57', fontFamily: "'JetBrains Mono'" }}>
                {progress.streakDays}
              </span>
            </div>
          )}

          {/* Level badge */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              Lv.{progress.level}
            </span>
          </div>

          {/* Coins */}
          <div className="hidden sm:flex items-center gap-1" title="코인">
            <span className="text-xs">🪙</span>
            <span className="text-xs font-bold" style={{ color: 'var(--color-accent-warm)', fontFamily: "'JetBrains Mono'" }}>
              {progress.coins}
            </span>
          </div>

          <ThemeToggle />

          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* XP Bar */}
      <XPBar />

      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--key-border)]" style={{ background: 'var(--bg-secondary)' }}>
          {/* Mobile stats row */}
          <div className="flex items-center justify-around py-2 border-b border-[var(--key-border)]">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--color-primary)', color: 'white' }}>
                Lv.{progress.level}
              </span>
            </div>
            {progress.streakDays > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs">🔥</span>
                <span className="text-xs font-bold" style={{ color: '#FECA57' }}>{progress.streakDays}일</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-xs">🪙</span>
              <span className="text-xs font-bold" style={{ color: 'var(--color-accent-warm)' }}>{progress.coins}</span>
            </div>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-3 text-sm no-underline transition-colors"
              style={{ color: pathname?.startsWith(item.href) ? 'var(--color-primary)' : 'var(--text-secondary)' }}
              onClick={() => setMobileOpen(false)}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
