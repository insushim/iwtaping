'use client';

import { useState, useEffect, useCallback } from 'react';
import { TypingArea } from '@/components/typing/TypingArea';
import { Button } from '@/components/ui/Button';
import { useStatsStore } from '@/stores/useStatsStore';
import { TypingResult } from '@/types/typing';
import { pickRandom } from '@/lib/utils/helpers';

type Category = 'all' | 'proverb' | 'quote' | 'news' | 'daily';
type Lang = 'ko' | 'en';

export default function ShortPracticePage() {
  const [category, setCategory] = useState<Category>('all');
  const [lang, setLang] = useState<Lang>('ko');
  const [sentences, setSentences] = useState<{ text: string; category: string }[]>([]);
  const [text, setText] = useState('');
  const recordSession = useStatsStore((s) => s.recordSession);

  const loadSentences = useCallback(async () => {
    let data: { text: string; category: string }[] = [];
    try {
      if (lang === 'ko') {
        data = (await import('@/data/korean/sentences-short')).koreanSentencesShort;
      } else {
        data = (await import('@/data/english/sentences-short')).englishSentencesShort;
      }
    } catch {
      data = [{ text: '문장 로딩에 실패했습니다.', category: 'error' }];
    }
    setSentences(data);
    const filtered = category === 'all' ? data : data.filter((s) => s.category === category);
    setText(pickRandom(filtered)?.text || data[0]?.text || '');
  }, [category, lang]);

  useEffect(() => {
    loadSentences();
  }, [loadSentences]);

  const handleComplete = (result: TypingResult) => {
    recordSession(result);
  };

  const handleRestart = () => {
    const filtered = category === 'all' ? sentences : sentences.filter((s) => s.category === category);
    setText(pickRandom(filtered)?.text || '');
  };

  const categories: [Category, string][] = [
    ['all', '전체'], ['proverb', '속담'], ['quote', '명언'], ['news', '뉴스'], ['daily', '일상'],
  ];

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>짧은 글 연습</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        <div className="flex gap-1">
          {(['ko', 'en'] as Lang[]).map((l) => (
            <Button key={l} variant={lang === l ? 'primary' : 'secondary'} size="sm" onClick={() => setLang(l)}>
              {l === 'ko' ? '한국어' : 'English'}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {categories.map(([c, label]) => (
            <Button key={c} variant={category === c ? 'primary' : 'secondary'} size="sm" onClick={() => setCategory(c)}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      {text && (
        <TypingArea
          text={text}
          onComplete={handleComplete}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
