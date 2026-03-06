'use client';

import { useState, useEffect } from 'react';
import { TypingArea } from '@/components/typing/TypingArea';
import { Button } from '@/components/ui/Button';
import { useStatsStore } from '@/stores/useStatsStore';
import { pickRandom } from '@/lib/utils/helpers';

export default function AccuracyTestPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [text, setText] = useState('');
  const recordSession = useStatsStore((s) => s.recordSession);

  useEffect(() => {
    (async () => {
      try {
        if (lang === 'ko') {
          const mod = await import('@/data/korean/sentences-short');
          const items = mod.koreanSentencesShort;
          setText(items.slice(0, 5).map(s => s.text).join(' '));
        } else {
          const mod = await import('@/data/english/sentences-short');
          const items = mod.englishSentencesShort;
          setText(items.slice(0, 5).map(s => s.text).join(' '));
        }
      } catch {
        setText('정확도 테스트 텍스트');
      }
    })();
  }, [lang]);

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>정확도 모드</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        정확도에 집중하세요. 오타 없이 입력하는 것이 목표입니다.
      </p>

      <div className="flex gap-2 mb-6">
        {(['ko', 'en'] as const).map((l) => (
          <Button key={l} variant={lang === l ? 'primary' : 'secondary'} size="sm" onClick={() => setLang(l)}>
            {l === 'ko' ? '한국어' : 'English'}
          </Button>
        ))}
      </div>

      {text && <TypingArea text={text} onComplete={(r) => recordSession(r)} />}
    </div>
  );
}
