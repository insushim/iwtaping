'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from '../common/ThemeToggle';

const navItems = [
  { href: '/practice', label: '연습', icon: '⌨️' },
  { href: '/test', label: '테스트', icon: '⏱️' },
  { href: '/game', label: '게임', icon: '🎮' },
  { href: '/stats', label: '통계', icon: '📊' },
  { href: '/ranking', label: '랭킹', icon: '🏆' },
  { href: '/settings', label: '설정', icon: '⚙️' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[var(--header-height)] border-b border-[var(--key-border)]" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="text-2xl font-extrabold neon-text" style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--color-primary)' }}>
            TypingVerse
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                style={isActive ? { background: 'rgba(108,92,231,0.1)' } : {}}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
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

      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--key-border)]" style={{ background: 'var(--bg-secondary)' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-3 text-sm no-underline"
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
