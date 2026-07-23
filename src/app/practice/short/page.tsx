'use client';

import { useState, useEffect, useCallback } from 'react';
import { MultiSentenceRunner } from '@/components/typing/MultiSentenceRunner';
import { Button } from '@/components/ui/Button';
import { shuffleArray } from '@/lib/utils/helpers';

const SENTENCES_PER_SET = 10;

type Category = 'all' | 'proverb' | 'quote' | 'news' | 'daily';
type Lang = 'ko' | 'en';

export default function ShortPracticePage() {
  const [category, setCategory] = useState<Category>('all');
  const [lang, setLang] = useState<Lang>('ko');
  const [allSentences, setAllSentences] = useState<{ text: string; category: string }[]>([]);
  const [sentenceSet, setSentenceSet] = useState<string[]>([]);

  const buildSet = useCallback((data: { text: string; category: string }[], cat: Category) => {
    const filtered = cat === 'all' ? data : data.filter((s) => s.category === cat);
    const pool = filtered.length ? filtered : data;
    return shuffleArray(pool).slice(0, SENTENCES_PER_SET).map((s) => s.text);
  }, []);

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
    setAllSentences(data);
    setSentenceSet(buildSet(data, category));
  }, [category, lang, buildSet]);

  useEffect(() => {
    loadSentences();
  }, [loadSentences]);

  const handleRetry = () => {
    setSentenceSet(buildSet(allSentences, category));
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

      {sentenceSet.length > 0 && (
        <MultiSentenceRunner
          key={`${lang}-${category}`}
          sentences={sentenceSet}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
