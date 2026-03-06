'use client';

export function Footer() {
  return (
    <footer className="border-t border-[var(--key-border)] py-6 mt-12" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-[1400px] mx-auto px-4 text-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          TypingVerse v1.0.0 &middot; 손끝으로 여는 무한한 세계
        </p>
      </div>
    </footer>
  );
}
