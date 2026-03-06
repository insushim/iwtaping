'use client';

import { useState } from 'react';
import { TypingArea } from '@/components/typing/TypingArea';
import { Button } from '@/components/ui/Button';
import { useStatsStore } from '@/stores/useStatsStore';

export default function CustomTestPage() {
  const [customText, setCustomText] = useState('');
  const [text, setText] = useState('');
  const recordSession = useStatsStore((s) => s.recordSession);

  const startTest = () => {
    if (customText.trim()) setText(customText.trim());
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>커스텀 테스트</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        원하는 텍스트를 직접 입력하여 테스트하세요
      </p>

      {!text ? (
        <div>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="테스트할 텍스트를 입력하세요..."
            className="w-full h-40 p-4 rounded-xl border border-[var(--key-border)] resize-none text-sm"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}
          />
          <div className="mt-4">
            <Button onClick={startTest} disabled={!customText.trim()}>
              테스트 시작
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setText('')}>
            &larr; 텍스트 변경
          </Button>
          <TypingArea text={text} onComplete={(r) => recordSession(r)} onRestart={() => {}} />
        </div>
      )}
    </div>
  );
}
